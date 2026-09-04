"""Load official CIC-IDS2017 CSVs when present; otherwise fail so caller can synthesize."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from syntra.data.schema import COLUMN_ALIASES, STATE_FEATURES
from syntra.taxonomy import family_from_cic_label, family_id, stage_from_family, stage_id

NA_VALUES = ["Infinity", "infinity", "NaN", "nan", "NaN", ""]
_WANTED_COLS = {alias.strip().lower() for aliases in COLUMN_ALIASES.values() for alias in aliases}


def _keep_column(name: object) -> bool:
    return str(name).strip().lower() in _WANTED_COLS


def _strip_columns(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame.columns = [str(c).strip() for c in frame.columns]
    return frame


def _pick(frame: pd.DataFrame, key: str) -> str | None:
    for alias in COLUMN_ALIASES[key]:
        if alias in frame.columns:
            return alias
    lower = {c.lower(): c for c in frame.columns}
    for alias in COLUMN_ALIASES[key]:
        if alias.lower() in lower:
            return lower[alias.lower()]
    return None


def discover_cic_csvs(raw_dir: Path) -> list[Path]:
    if not raw_dir.exists():
        return []
    return sorted(p for p in raw_dir.rglob("*.csv") if p.is_file())


def _day_from_name_or_time(path: Path, ts: pd.Series) -> pd.Series:
    name = path.stem.lower()
    for day in ("monday", "tuesday", "wednesday", "thursday", "friday"):
        if day in name:
            return pd.Series([day] * len(ts), index=ts.index)
    weekday = ts.dt.day_name().str.lower()
    return weekday


def canonicalize_flows(frame: pd.DataFrame) -> pd.DataFrame:
    frame = _strip_columns(frame)
    out = pd.DataFrame(index=frame.index)
    for key in COLUMN_ALIASES:
        col = _pick(frame, key)
        if col is None:
            continue
        out[key] = frame[col]
    if "label" not in out.columns:
        return out
    numeric_keys = [k for k in COLUMN_ALIASES if k not in ("timestamp", "src_ip", "dst_ip", "label")]
    for key in numeric_keys:
        if key not in out.columns:
            out[key] = 0.0
            continue
        out[key] = pd.to_numeric(out[key], errors="coerce")
    out[numeric_keys] = out[numeric_keys].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    # CIC dumps include overflowed rates and negative durations.
    clip_hi = {
        "duration": 1.2e8,
        "fwd_packets": 1e7,
        "bwd_packets": 1e7,
        "fwd_bytes": 1e12,
        "bwd_bytes": 1e12,
        "fwd_len_mean": 1e6,
        "bwd_len_mean": 1e6,
        "flow_iat_mean": 1.2e8,
        "flow_iat_std": 1.2e8,
        "syn": 1e7,
        "ack": 1e7,
        "rst": 1e7,
        "fin": 1e7,
        "psh": 1e7,
        "urg": 1e7,
        "down_up": 1e6,
        "avg_pkt": 1e6,
        "active_mean": 1.2e8,
        "idle_mean": 1.2e8,
        "init_win_fwd": 65535,
        "src_port": 65535,
        "dst_port": 65535,
        "protocol": 255,
    }
    for key, hi in clip_hi.items():
        if key in out.columns:
            out[key] = out[key].clip(lower=0.0, upper=hi)
    out["label"] = out["label"].astype(str)
    if "src_ip" not in out.columns:
        out["src_ip"] = "0.0.0.0"
    if "dst_ip" not in out.columns:
        out["dst_ip"] = "0.0.0.0"
    return out


def load_cicids2017_flows(raw_dir: Path) -> pd.DataFrame | None:
    files = discover_cic_csvs(raw_dir)
    if not files:
        return None
    chunks: list[pd.DataFrame] = []
    for path in files:
        piece = pd.read_csv(
            path,
            low_memory=False,
            encoding="latin-1",
            na_values=NA_VALUES,
            usecols=_keep_column,
        )
        piece = canonicalize_flows(piece)
        if "label" not in piece.columns:
            continue
        if "timestamp" not in piece.columns:
            piece["timestamp"] = pd.date_range("2017-07-03 09:00:00", periods=len(piece), freq="s")
        piece["timestamp"] = pd.to_datetime(
            piece["timestamp"], errors="coerce", dayfirst=True
        )
        piece = piece.dropna(subset=["timestamp", "label"])
        piece["day"] = _day_from_name_or_time(path, piece["timestamp"])
        piece["_source_file"] = path.name
        chunks.append(piece)
    if not chunks:
        return None
    return pd.concat(chunks, ignore_index=True)


def _entropy_from_nunique(nunique: pd.Series) -> pd.Series:
    return np.log1p(nunique.astype(np.float64))


def windows_from_flows(flows: pd.DataFrame, window_seconds: int) -> pd.DataFrame:
    """Vectorized 30s windows from canonical CIC flows."""
    df = flows.copy()
    df["_win"] = df["timestamp"].dt.floor(f"{window_seconds}s")
    df["family"] = df["label"].map(family_from_cic_label)
    flag_sum = (
        df["syn"] + df["ack"] + df["rst"] + df["fin"] + df["psh"] + df["urg"]
    ).clip(lower=1.0)
    df["syn_r"] = df["syn"] / flag_sum
    df["ack_r"] = df["ack"] / flag_sum
    df["rst_r"] = df["rst"] / flag_sum
    df["fin_r"] = df["fin"] / flag_sum
    df["psh_r"] = df["psh"] / flag_sum
    df["urg_r"] = df["urg"] / flag_sum
    df["failed"] = ((df["rst"] > 0) | ((df["fwd_bytes"] + df["bwd_bytes"]) <= 0)).astype(np.float64)
    dur_scale = 1_000_000.0 if df["duration"].max() > 10_000 else 1.0
    df["short"] = (df["duration"] < dur_scale).astype(np.float64)
    df["tcp"] = (df["protocol"] == 6).astype(np.float64)
    df["udp"] = (df["protocol"] == 17).astype(np.float64)

    grouped = df.groupby(["day", "_win"], sort=True)
    agg = grouped.agg(
        flow_count=("label", "size"),
        unique_src_ips=("src_ip", "nunique"),
        unique_dst_ips=("dst_ip", "nunique"),
        unique_src_ports=("src_port", "nunique"),
        unique_dst_ports=("dst_port", "nunique"),
        total_fwd_packets=("fwd_packets", "sum"),
        total_bwd_packets=("bwd_packets", "sum"),
        total_fwd_bytes=("fwd_bytes", "sum"),
        total_bwd_bytes=("bwd_bytes", "sum"),
        mean_duration=("duration", "mean"),
        std_duration=("duration", "std"),
        mean_iat=("flow_iat_mean", "mean"),
        std_iat=("flow_iat_std", "mean"),
        syn_ratio=("syn_r", "mean"),
        ack_ratio=("ack_r", "mean"),
        rst_ratio=("rst_r", "mean"),
        fin_ratio=("fin_r", "mean"),
        psh_ratio=("psh_r", "mean"),
        urg_ratio=("urg_r", "mean"),
        failed_conn_ratio=("failed", "mean"),
        short_flow_ratio=("short", "mean"),
        down_up_ratio=("down_up", "mean"),
        mean_fwd_pkt_len=("fwd_len_mean", "mean"),
        mean_bwd_pkt_len=("bwd_len_mean", "mean"),
        avg_packet_size=("avg_pkt", "mean"),
        tcp_ratio=("tcp", "mean"),
        udp_ratio=("udp", "mean"),
        mean_active=("active_mean", "mean"),
        mean_idle=("idle_mean", "mean"),
        init_win_fwd_mean=("init_win_fwd", "mean"),
    )
    agg["std_duration"] = agg["std_duration"].fillna(0.0)
    agg["bytes_per_second"] = (agg["total_fwd_bytes"] + agg["total_bwd_bytes"]) / window_seconds
    agg["packets_per_second"] = (agg["total_fwd_packets"] + agg["total_bwd_packets"]) / window_seconds
    agg["port_scan_score"] = agg["unique_dst_ports"] / agg["unique_dst_ips"].clip(lower=1.0)
    tot = agg["total_fwd_bytes"] + agg["total_bwd_bytes"] + 1.0
    agg["bytes_imbalance"] = (agg["total_fwd_bytes"] - agg["total_bwd_bytes"]) / tot
    agg["dst_port_entropy"] = _entropy_from_nunique(agg["unique_dst_ports"])
    agg["src_port_entropy"] = _entropy_from_nunique(agg["unique_src_ports"])
    agg["syn_ack_gap"] = (agg["syn_ratio"] - agg["ack_ratio"] * 0.2).clip(lower=0.0)
    win_size = grouped.size().clip(lower=1)
    port_counts = df.groupby(["day", "_win", "dst_port"], sort=False).size()
    agg["max_dst_port_share"] = port_counts.groupby(level=["day", "_win"]).max() / win_size
    talker_counts = df.groupby(["day", "_win", "src_ip"], sort=False).size()
    agg["top_talker_share"] = talker_counts.groupby(level=["day", "_win"]).max() / win_size

    def _majority(series: pd.Series) -> str:
        attacks = series[series != "benign"]
        if len(attacks) == 0:
            return "benign"
        return str(attacks.value_counts().index[0])

    agg["family"] = grouped["family"].agg(_majority)
    frame = agg.reset_index().rename(columns={"_win": "timestamp"})
    frame["timestamp"] = pd.to_datetime(frame["timestamp"])
    frame["day"] = frame["day"].astype(str).str.lower()
    frame["family_id"] = frame["family"].map(family_id)
    frame["stage"] = frame["family"].map(stage_from_family)
    frame["stage_id"] = frame["stage"].map(stage_id)
    frame["y_attack"] = (frame["family"] != "benign").astype(int)
    frame["source"] = "cicids2017"
    frame = frame.sort_values(["day", "timestamp"]).reset_index(drop=True)
    frame["window_idx"] = frame.groupby("day").cumcount()
    prev = frame.groupby("day")["unique_dst_ips"].shift(1)
    frame["new_dst_ip_rate"] = (
        (frame["unique_dst_ips"] - prev.fillna(frame["unique_dst_ips"])).abs()
        / prev.fillna(1.0).clip(lower=1.0)
    ).clip(upper=1.5)
    missing = [c for c in STATE_FEATURES if c not in frame.columns]
    if missing:
        raise RuntimeError(f"Window frame missing features: {missing}")
    return regrid_windows(frame, window_seconds)


def regrid_windows(frame: pd.DataFrame, window_seconds: int) -> pd.DataFrame:
    """Fill missing 30s bins with zero-traffic benign states so step k is wall-clock."""
    pieces: list[pd.DataFrame] = []
    for day, group in frame.groupby("day", sort=False):
        group = group.sort_values("timestamp").drop_duplicates("timestamp")
        if group.empty:
            continue
        start = pd.Timestamp(group["timestamp"].min())
        end = pd.Timestamp(group["timestamp"].max())
        calendar = pd.date_range(start, end, freq=f"{int(window_seconds)}s")
        group = group.set_index("timestamp").reindex(calendar)
        group.index.name = "timestamp"
        group["day"] = str(day).lower()
        source = group["source"].dropna()
        group["source"] = group["source"].fillna(
            source.iloc[0] if len(source) else "cicids2017"
        )
        group["family"] = group["family"].fillna("benign")
        for col in STATE_FEATURES:
            if col in group.columns:
                group[col] = group[col].fillna(0.0)
            else:
                group[col] = 0.0
        group["y_attack"] = (group["family"] != "benign").astype(int)
        group["family_id"] = group["family"].map(family_id)
        group["stage"] = group["family"].map(stage_from_family)
        group["stage_id"] = group["stage"].map(stage_id)
        group = group.reset_index()
        group["window_idx"] = np.arange(len(group), dtype=np.int64)
        prev = group["unique_dst_ips"].shift(1)
        group["new_dst_ip_rate"] = (
            (group["unique_dst_ips"] - prev.fillna(group["unique_dst_ips"])).abs()
            / prev.fillna(1.0).clip(lower=1.0)
        ).clip(upper=1.5)
        pieces.append(group)
    if not pieces:
        return frame
    return pd.concat(pieces, ignore_index=True)
