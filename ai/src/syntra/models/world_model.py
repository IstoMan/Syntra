from __future__ import annotations

import torch
from torch import nn

from syntra.data.schema import STATE_FEATURES
from syntra.taxonomy import ATTACK_FAMILIES, ATTACK_STAGES

_PPS = STATE_FEATURES.index("packets_per_second")
_DST_PORTS = STATE_FEATURES.index("unique_dst_ports")
_MEAN_IAT = STATE_FEATURES.index("mean_iat")
_STD_IAT = STATE_FEATURES.index("std_iat")
_IDLE = STATE_FEATURES.index("mean_idle")
ENCODER_EXTRA_DIM = 4


def _heads_for(embed_dim: int, n_heads: int) -> int:
    heads = max(1, min(n_heads, embed_dim))
    while heads > 1 and embed_dim % heads != 0:
        heads -= 1
    return heads


class ResidualBlock(nn.Module):
    def __init__(self, dim: int, dropout: float) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(dim, dim),
            nn.GELU(),
            nn.LayerNorm(dim),
            nn.Dropout(dropout),
            nn.Linear(dim, dim),
        )
        self.norm = nn.LayerNorm(dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.norm(x + self.net(x))


class NetworkWorldModel(nn.Module):
    """Residual encoder + Transformer history + stacked residual GRU dynamics.

    Attack/family/stage heads always read the predicted (non-teacher-forced) latent.
    Teacher forcing is used only on a parallel reconstruction path.
    Encoder input is the 40-d state plus first-differences and 4 derived channels.
    Reconstruction target remains the 40-d state.
    """

    def __init__(
        self,
        state_dim: int = 40,
        embed_dim: int = 64,
        hidden_dim: int = 64,
        num_layers: int = 1,
        dropout: float = 0.1,
        encoder_layers: int = 4,
        n_heads: int = 8,
        max_history: int = 128,
        n_families: int = len(ATTACK_FAMILIES),
        n_stages: int = len(ATTACK_STAGES),
    ) -> None:
        super().__init__()
        self.state_dim = state_dim
        self.embed_dim = embed_dim
        self.hidden_dim = hidden_dim
        self.num_layers = max(1, num_layers)
        self.encoder_layers = max(1, encoder_layers)
        self.n_heads = _heads_for(embed_dim, n_heads)
        self.input_dim = state_dim * 2 + ENCODER_EXTRA_DIM
        n_res = max(1, self.encoder_layers - 1)
        self.encoder = nn.Sequential(
            nn.Linear(self.input_dim, embed_dim),
            nn.GELU(),
            nn.LayerNorm(embed_dim),
            nn.Dropout(dropout),
            *[ResidualBlock(embed_dim, dropout) for _ in range(n_res)],
        )
        enc_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=self.n_heads,
            dim_feedforward=embed_dim * 4,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        try:
            self.history_encoder = nn.TransformerEncoder(
                enc_layer,
                num_layers=self.encoder_layers,
                enable_nested_tensor=False,
            )
        except TypeError:
            self.history_encoder = nn.TransformerEncoder(
                enc_layer, num_layers=self.encoder_layers
            )
        self.pos_embed = nn.Parameter(torch.zeros(1, max_history, embed_dim))
        nn.init.normal_(self.pos_embed, std=0.02)
        self.dynamics = nn.ModuleList(
            [
                nn.GRUCell(embed_dim if i == 0 else hidden_dim, hidden_dim)
                for i in range(self.num_layers)
            ]
        )
        self.dyn_norm = nn.ModuleList(
            [nn.LayerNorm(hidden_dim) for _ in range(self.num_layers)]
        )
        self.h0_proj = nn.ModuleList(
            [nn.Linear(embed_dim, hidden_dim) for _ in range(self.num_layers)]
        )
        self.decoder = nn.Sequential(
            nn.Linear(hidden_dim, embed_dim),
            nn.GELU(),
            nn.LayerNorm(embed_dim),
            nn.Linear(embed_dim, embed_dim),
            nn.GELU(),
            nn.Linear(embed_dim, state_dim),
        )
        self.attack_head = self._mlp_head(hidden_dim, 1, dropout)
        self.family_head = self._mlp_head(hidden_dim, n_families, dropout)
        self.stage_head = self._mlp_head(hidden_dim, n_stages, dropout)
        self.attn_proj = nn.Linear(embed_dim, 1)

    @staticmethod
    def _mlp_head(hidden_dim: int, out_dim: int, dropout: float) -> nn.Sequential:
        return nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.GELU(),
            nn.LayerNorm(hidden_dim),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, out_dim),
        )

    def _augment(self, states: torch.Tensor) -> torch.Tensor:
        squeeze = False
        if states.dim() == 2:
            states = states.unsqueeze(1)
            squeeze = True
        delta = torch.zeros_like(states)
        delta[:, 1:, :] = states[:, 1:, :] - states[:, :-1, :]
        pps_delta = delta[..., _PPS : _PPS + 1]
        dport_delta = delta[..., _DST_PORTS : _DST_PORTS + 1]
        mean_iat = states[..., _MEAN_IAT : _MEAN_IAT + 1]
        std_iat = states[..., _STD_IAT : _STD_IAT + 1]
        iat_cv = std_iat / mean_iat.clamp(min=1e-4)
        idle = states[..., _IDLE : _IDLE + 1]
        beacon = torch.exp(-((mean_iat - 0.25) ** 2) / 0.08) * torch.exp(
            -((idle - 2.0) ** 2) / 8.0
        )
        extras = torch.cat([pps_delta, dport_delta, iat_cv, beacon], dim=-1)
        out = torch.cat([states, delta, extras], dim=-1)
        if squeeze:
            return out.squeeze(1)
        return out

    def encode(self, states: torch.Tensor) -> torch.Tensor:
        return self.encoder(self._augment(states))

    def _init_hidden(
        self, history: torch.Tensor
    ) -> tuple[list[torch.Tensor], torch.Tensor, torch.Tensor, torch.Tensor]:
        hist_embed = self.encode(history)
        t = hist_embed.size(1)
        hist_embed = hist_embed + self.pos_embed[:, :t, :]
        packed = self.history_encoder(hist_embed)
        attn = torch.softmax(self.attn_proj(packed).squeeze(-1), dim=1)
        pooled = (packed * attn.unsqueeze(-1)).sum(dim=1)
        hiddens = [proj(pooled) for proj in self.h0_proj]
        prev_prev = (
            history[:, -2, :]
            if history.size(1) >= 2
            else torch.zeros_like(history[:, -1, :])
        )
        return hiddens, history[:, -1, :], attn, prev_prev

    def _step(
        self,
        prev_state: torch.Tensor,
        hiddens: list[torch.Tensor],
        prev_prev: torch.Tensor,
    ) -> tuple[list[torch.Tensor], torch.Tensor]:
        pair = torch.stack([prev_prev, prev_state], dim=1)
        x = self.encode(pair)[:, -1, :]
        new_hiddens: list[torch.Tensor] = []
        for i, cell in enumerate(self.dynamics):
            h_in = hiddens[i]
            h_out = cell(x, h_in)
            h_out = self.dyn_norm[i](h_out)
            if h_out.shape == h_in.shape:
                h_out = h_out + h_in
            x = h_out
            new_hiddens.append(h_out)
        recon = self.decoder(new_hiddens[-1])
        return new_hiddens, recon

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
        h_pred, prev_pred, attn, prev_prev_pred = self._init_hidden(history)
        h_rec = [h.clone() for h in h_pred]
        prev_rec = prev_pred
        prev_prev_rec = prev_prev_pred
        use_tf = self.training and future is not None and teacher_forcing > 0

        pred_states, rec_states = [], []
        attack_logits, family_logits, stage_logits = [], [], []
        for step in range(k):
            h_pred, recon_pred = self._step(prev_pred, h_pred, prev_prev_pred)
            pred_states.append(recon_pred)
            hidden = h_pred[-1]
            attack_logits.append(self.attack_head(hidden))
            family_logits.append(self.family_head(hidden))
            stage_logits.append(self.stage_head(hidden))
            prev_prev_pred = prev_pred
            prev_pred = recon_pred

            if use_tf:
                h_rec, recon_rec = self._step(prev_rec, h_rec, prev_prev_rec)
                rec_states.append(recon_rec)
                prev_prev_rec = prev_rec
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
