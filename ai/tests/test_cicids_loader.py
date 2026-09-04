from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from syntra.data.cicids2017 import load_cicids2017_flows, regrid_windows, windows_from_flows
from syntra.data.prepare import downsample_benign_flows
from syntra.data.schema import STATE_FEATURES
from syntra.taxonomy import family_from_cic_label


def test_loader_handles_inf_nan_spaces_and_filename_day(tmp_path: Path):
    csv = tmp_path / "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv"
    csv.write_text(
        " Timestamp, Source IP, Destination IP, Source Port, Destination Port,"
        " Protocol, Flow Duration, Total Fwd Packets, Total Backward Packets,"
        " Total Length of Fwd Packets, Total Length of Bwd Packets,"
        " Fwd Packet Length Mean, Bwd Packet Length Mean, Flow IAT Mean, Flow IAT Std,"
        " SYN Flag Count, ACK Flag Count, RST Flag Count, FIN Flag Count,"
        " PSH Flag Count, URG Flag Count, Down/Up Ratio, Average Packet Size,"
        " Active Mean, Idle Mean, Init_Win_bytes_forward, Label\n"
        "7/7/2017 3:30,10.0.0.1,10.0.0.2,1234,80,6,1000,2,1,100,50,50,50,10,1,"
        "1,1,0,0,0,0,1,75,0,0,8192,BENIGN\n"
        "7/7/2017 3:30,10.0.0.1,10.0.0.2,1235,443,6,Infinity,2,1,NaN,50,50,50,10,1,"
        "1,0,0,0,0,0,1,75,0,0,8192,PortScan\n",
        encoding="latin-1",
    )
    flows = load_cicids2017_flows(tmp_path)
    assert flows is not None
    assert set(flows["day"]) == {"friday"}
    assert np.isfinite(flows["duration"]).all()
    assert np.isfinite(flows["fwd_bytes"]).all()
    assert family_from_cic_label(flows.loc[1, "label"]) == "portscan"
    windows = windows_from_flows(flows, 30)
    missing = [c for c in STATE_FEATURES if c not in windows.columns]
    assert missing == []
    assert windows["source"].eq("cicids2017").all()
    assert windows["family"].isin(["benign", "portscan"]).all()
    assert len(windows) >= 1
    gaps = windows["timestamp"].sort_values().diff().dropna()
    if len(gaps) > 0:
        assert (gaps.dt.total_seconds() == 30).all()


def test_downsample_keeps_every_attack_row():
    flows = pd.DataFrame(
        {
            "label": ["BENIGN"] * 100 + ["DoS Hulk"] * 7,
            "timestamp": pd.date_range("2017-07-05", periods=107, freq="s"),
        }
    )
    out = downsample_benign_flows(flows, frac=0.1, seed=0)
    assert (out["label"] == "DoS Hulk").sum() == 7
    assert (out["label"] == "BENIGN").sum() == 10


def test_regrid_inserts_regular_empty_bins():
    frame = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(["2017-07-07 09:00:00", "2017-07-07 09:01:00"]),
            "day": ["friday", "friday"],
            "family": ["benign", "portscan"],
            "source": ["cicids2017", "cicids2017"],
            **{c: [1.0, 2.0] for c in STATE_FEATURES},
            "y_attack": [0, 1],
            "family_id": [0, 6],
            "stage": ["none", "reconnaissance"],
            "stage_id": [0, 1],
        }
    )
    out = regrid_windows(frame, 30)
    assert len(out) == 3
    gaps = out["timestamp"].sort_values().diff().dropna().dt.total_seconds()
    assert (gaps == 30).all()
    assert out["y_attack"].tolist() == [0, 0, 1]
    assert out.loc[out["y_attack"] == 0, "flow_count"].iloc[1] == 0.0
