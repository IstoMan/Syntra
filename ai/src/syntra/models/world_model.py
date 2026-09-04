from __future__ import annotations

import torch
from torch import nn

from syntra.taxonomy import ATTACK_FAMILIES, ATTACK_STAGES


class NetworkWorldModel(nn.Module):
    """Encoder + GRU dynamics + reconstruction decoder + heads on predicted states.

    Attack/family/stage heads always read the predicted (non-teacher-forced) latent.
    Teacher forcing is used only on a parallel reconstruction path.
    """

    def __init__(
        self,
        state_dim: int = 40,
        embed_dim: int = 64,
        hidden_dim: int = 64,
        num_layers: int = 1,
        dropout: float = 0.1,
        n_families: int = len(ATTACK_FAMILIES),
        n_stages: int = len(ATTACK_STAGES),
    ) -> None:
        super().__init__()
        self.state_dim = state_dim
        self.embed_dim = embed_dim
        self.hidden_dim = hidden_dim
        self.encoder = nn.Sequential(
            nn.Linear(state_dim, embed_dim),
            nn.GELU(),
            nn.LayerNorm(embed_dim),
            nn.Dropout(dropout),
            nn.Linear(embed_dim, embed_dim),
        )
        self.history_gru = nn.GRU(
            embed_dim,
            hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.dynamics = nn.GRUCell(embed_dim, hidden_dim)
        self.decoder = nn.Sequential(
            nn.Linear(hidden_dim, embed_dim),
            nn.GELU(),
            nn.Linear(embed_dim, state_dim),
        )
        self.attack_head = nn.Linear(hidden_dim, 1)
        self.family_head = nn.Linear(hidden_dim, n_families)
        self.stage_head = nn.Linear(hidden_dim, n_stages)
        self.attn_proj = nn.Linear(hidden_dim, 1)

    def encode(self, states: torch.Tensor) -> torch.Tensor:
        return self.encoder(states)

    def _init_hidden(
        self, history: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        hist_embed = self.encode(history)
        packed, hidden = self.history_gru(hist_embed)
        attn = torch.softmax(self.attn_proj(packed).squeeze(-1), dim=1)
        return hidden[-1], history[:, -1, :], attn

    def _step(
        self, prev_state: torch.Tensor, hidden: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor]:
        hidden = self.dynamics(self.encode(prev_state), hidden)
        recon = self.decoder(hidden)
        return hidden, recon

    def rollout(
        self,
        history: torch.Tensor,
        future: torch.Tensor | None = None,
        teacher_forcing: float = 0.0,
        horizon: int | None = None,
    ) -> dict[str, torch.Tensor]:
        k = (
            horizon
            if horizon is not None
            else (future.size(1) if future is not None else 5)
        )
        h_pred, prev_pred, attn = self._init_hidden(history)
        h_rec = h_pred
        prev_rec = prev_pred
        use_tf = self.training and future is not None and teacher_forcing > 0

        pred_states, rec_states = [], []
        attack_logits, family_logits, stage_logits = [], [], []
        for step in range(k):
            h_pred, recon_pred = self._step(prev_pred, h_pred)
            pred_states.append(recon_pred)
            attack_logits.append(self.attack_head(h_pred))
            family_logits.append(self.family_head(h_pred))
            stage_logits.append(self.stage_head(h_pred))
            prev_pred = recon_pred

            if use_tf:
                h_rec, recon_rec = self._step(prev_rec, h_rec)
                rec_states.append(recon_rec)
                if torch.rand(1).item() < teacher_forcing:
                    prev_rec = future[:, step, :]
                else:
                    prev_rec = recon_rec
            else:
                rec_states.append(recon_pred)

        predicted = torch.stack(pred_states, dim=1)
        reconstructed = torch.stack(rec_states, dim=1)
        return {
            "future_states": predicted,
            "future_states_rec": reconstructed,
            "attack_logits": torch.stack(attack_logits, dim=1).squeeze(-1),
            "family_logits": torch.stack(family_logits, dim=1),
            "stage_logits": torch.stack(stage_logits, dim=1),
            "history_attn": attn,
        }

    def forward(
        self,
        history: torch.Tensor,
        future: torch.Tensor | None = None,
        teacher_forcing: float = 0.0,
    ) -> dict[str, torch.Tensor]:
        return self.rollout(history, future=future, teacher_forcing=teacher_forcing)
