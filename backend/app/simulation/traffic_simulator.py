"""
Comprehensive Traffic Simulation and Demo Engine for SYNTRA
"""
import random
import time
from typing import List, Dict, Any, Optional
from ..models.schemas import FlowDetail, AlertItem, RiskComponent, RiskHistoryPoint, RiskAnalysisResponse
from ..processing.feature_extraction import extract_flow_features, calculate_anomaly_score

# Indian Enterprise Infrastructure Demo Nodes
DEMO_ASSETS = [
    {"ip": "10.10.10.10", "name": "DC-01", "role": "Authentication Server (Domain Controller)"},
    {"ip": "10.10.10.20", "name": "WEB-01", "role": "Web Application Server (Frontend)"},
    {"ip": "10.10.20.15", "name": "DB-01", "role": "Database Server (PostgreSQL/Oracle)"},
    {"ip": "10.10.10.30", "name": "APP-01", "role": "Application Microservices Server"},
    {"ip": "10.10.30.42", "name": "USER-042", "role": "Employee Workstation (Finance Subnet)"},
    {"ip": "10.10.40.17", "name": "IOT-017", "role": "IoT Gateway / Environmental Monitor"},
    {"ip": "198.51.100.24", "name": "EXT-C2", "role": "External Suspicious Host (Simulated C2)"}
]

STAGE_NAMES = [
    "Stage 1: Normal Baseline Traffic",
    "Stage 2: Reconnaissance & Port Scanning Anomaly",
    "Stage 3: Increasing Risk & Exploit Probing",
    "Stage 4: Temporal Forecast (C2 Stage Predicted)",
    "Stage 5: Early Warning Alert Generation",
    "Stage 6: Explainable AI & SHAP Attribution",
    "Stage 7: Security Analyst Response & Action"
]

class TrafficSimulator:
    def __init__(self):
        self.is_running = False
        self.current_stage = 1  # 1 to 7
        self.speed_multiplier = 1.0
        self.tick_count = 0
        self.flows: List[FlowDetail] = []
        self.alerts: List[AlertItem] = []
        self.risk_history: List[RiskHistoryPoint] = []
        self.active_scenario = "Indian Digital Infrastructure Network — CII Simulation"
        self._initialize_baseline_flows()
        self._initialize_alerts()
        self._initialize_risk_history()

    def _get_current_time_str(self, offset_seconds: int = 0) -> str:
        # Base demonstration time in IST
        base_h = 10
        base_m = 30
        base_s = 21 + (self.tick_count * 2) + offset_seconds
        while base_s >= 60:
            base_s -= 60
            base_m += 1
        while base_m >= 60:
            base_m -= 60
            base_h += 1
        return f"{base_h:02d}:{base_m:02d}:{base_s:02d} IST"

    def _initialize_risk_history(self):
        self.risk_history = [
            RiskHistoryPoint(timestamp_ist="10:25:00 IST", risk_score=1.2, level="LOW", stage="Baseline"),
            RiskHistoryPoint(timestamp_ist="10:26:00 IST", risk_score=1.4, level="LOW", stage="Baseline"),
            RiskHistoryPoint(timestamp_ist="10:27:00 IST", risk_score=4.2, level="MEDIUM", stage="Reconnaissance"),
            RiskHistoryPoint(timestamp_ist="10:28:00 IST", risk_score=5.8, level="MEDIUM", stage="Initial Access Attempt"),
            RiskHistoryPoint(timestamp_ist="10:29:00 IST", risk_score=7.4, level="HIGH", stage="Privilege Escalation"),
            RiskHistoryPoint(timestamp_ist="10:30:21 IST", risk_score=8.7, level="CRITICAL", stage="Command & Control (Forecasted)"),
        ]

    def _initialize_alerts(self):
        self.alerts = [
            AlertItem(
                id="ALT-2026-0901",
                title="HIGH RISK ACTIVITY DETECTED",
                severity="HIGH",
                source_ip="10.10.30.42",
                source_asset="USER-042",
                destination_ip="10.10.10.20",
                destination_asset="WEB-01",
                timestamp_ist="10:30:21 IST",
                risk_score=8.7,
                attack_probability=0.82,
                predicted_stage="Command & Control",
                forecast_horizon=5,
                status="NEW",
                main_contributors=[
                    "High packet burst rate (+0.38)",
                    "Periodic egress beaconing (+0.31)",
                    "Non-standard destination port activity (+0.27)"
                ],
                reason="Abnormal multi-stage temporal progression detected from employee workstation."
            ),
            AlertItem(
                id="ALT-2026-0902",
                title="UNUSUAL PORT ACTIVITY",
                severity="MEDIUM",
                source_ip="10.10.30.42",
                source_asset="USER-042",
                destination_ip="10.10.10.10",
                destination_asset="DC-01",
                timestamp_ist="10:28:11 IST",
                risk_score=6.2,
                attack_probability=0.58,
                predicted_stage="Privilege Escalation",
                forecast_horizon=5,
                status="UNDER_INVESTIGATION",
                main_contributors=[
                    "Unusual destination-port pattern (445, 88, 389)",
                    "Rapid connection reset ratio"
                ],
                reason="Unexpected destination-port behavior and LDAP/Kerberos probing."
            ),
            AlertItem(
                id="ALT-2026-0903",
                title="ABNORMAL TRAFFIC PATTERN",
                severity="LOW",
                source_ip="10.10.40.17",
                source_asset="IOT-017",
                destination_ip="10.10.10.30",
                destination_asset="APP-01",
                timestamp_ist="10:26:33 IST",
                risk_score=3.8,
                attack_probability=0.34,
                predicted_stage="Reconnaissance",
                forecast_horizon=5,
                status="REVIEWED",
                main_contributors=[
                    "Sudden outbound UDP telemetry burst",
                    "Telemetry jitter anomaly"
                ],
                reason="Sudden outbound traffic increase from IoT environmental gateway."
            )
        ]

    def _initialize_baseline_flows(self):
        self.flows = []
        protocols = ["TCP", "UDP", "TLS/HTTPS", "DNS", "SSH"]
        sample_conns = [
            ("10.10.30.42", "USER-042", 54210, "10.10.10.20", "WEB-01", 443, "TLS/HTTPS", 4281, 2800000, 12.4, "HIGH", "Suspicious", ["Packet rate deviation", "Unusual port activity"]),
            ("10.10.30.42", "USER-042", 54211, "10.10.10.10", "DC-01", 88, "TCP", 342, 45200, 1.8, "MEDIUM", "Suspicious", ["Kerberos probe pattern"]),
            ("10.10.10.20", "WEB-01", 48202, "10.10.20.15", "DB-01", 5432, "TCP", 1820, 940000, 4.2, "LOW", "Normal", []),
            ("10.10.10.30", "APP-01", 39102, "10.10.20.15", "DB-01", 5432, "TCP", 950, 480000, 2.1, "LOW", "Normal", []),
            ("10.10.40.17", "IOT-017", 1883, "10.10.10.30", "APP-01", 1883, "MQTT/TCP", 120, 14500, 0.8, "LOW", "Normal", []),
            ("10.10.30.42", "USER-042", 53120, "10.10.10.10", "DC-01", 53, "DNS/UDP", 64, 4200, 0.12, "LOW", "Normal", []),
            ("10.10.30.42", "USER-042", 59942, "198.51.100.24", "EXT-C2", 8443, "TLS/TCP", 894, 620000, 18.2, "CRITICAL", "Malicious", ["Periodic beaconing", "High egress volume", "Non-standard port"])
        ]

        for i, conn in enumerate(sample_conns):
            src_ip, src_asset, src_port, dst_ip, dst_asset, dst_port, proto, pkts, bytes_c, dur, risk, status, anoms = conn
            self.flows.append(
                FlowDetail(
                    id=f"FLOW-{1000 + i}",
                    timestamp=self._get_current_time_str(-i * 15),
                    source_ip=src_ip,
                    source_port=src_port,
                    source_asset=src_asset,
                    destination_ip=dst_ip,
                    destination_port=dst_port,
                    destination_asset=dst_asset,
                    protocol=proto,
                    packets=pkts,
                    bytes_transferred=bytes_c,
                    flow_duration_sec=dur,
                    packet_rate=round(pkts / max(dur, 0.1), 2),
                    byte_rate=round(bytes_c / max(dur, 0.1), 2),
                    syn_flag_count=12 if "Suspicious" in status else 2,
                    ack_flag_count=pkts - 4,
                    rst_flag_count=3 if "Malicious" in status else 0,
                    risk_level=risk,
                    status=status,
                    anomalies=anoms
                )
            )

    def set_stage(self, stage: int):
        self.current_stage = max(1, min(7, stage))
        if self.current_stage >= 5:
            # Check if early warning alert exists
            if not any(a.id == "ALT-2026-0901" for a in self.alerts):
                self._initialize_alerts()

    def step_forward(self):
        if self.current_stage < 7:
            self.current_stage += 1
        else:
            self.current_stage = 1
        self.tick_count += 1
        self.generate_tick()

    def reset_simulation(self):
        self.current_stage = 1
        self.is_running = False
        self.tick_count = 0
        self._initialize_baseline_flows()
        self._initialize_alerts()
        self._initialize_risk_history()

    def generate_tick(self):
        self.tick_count += 1
        # Add new flow based on stage
        current_time = self._get_current_time_str()
        
        if self.current_stage == 1:
            risk = "LOW"
            status = "Normal"
            anoms = []
            pkts = random.randint(40, 180)
            bytes_c = pkts * random.randint(80, 500)
            dur = round(random.uniform(0.5, 3.0), 2)
            src = "10.10.30.42"
            src_asset = "USER-042"
            dst = "10.10.10.20"
            dst_asset = "WEB-01"
            dst_port = 443
            proto = "TLS/HTTPS"
        elif self.current_stage == 2:
            risk = "MEDIUM"
            status = "Suspicious"
            anoms = ["Port scan probe", "Abnormal SYN flag ratio"]
            pkts = random.randint(150, 450)
            bytes_c = pkts * 70
            dur = round(random.uniform(0.1, 0.6), 2)
            src = "10.10.30.42"
            src_asset = "USER-042"
            dst = "10.10.10.10"
            dst_asset = "DC-01"
            dst_port = random.choice([21, 22, 23, 80, 88, 135, 139, 445, 3389])
            proto = "TCP"
        elif self.current_stage == 3:
            risk = "HIGH"
            status = "Suspicious"
            anoms = ["Exploit payload signature", "High packet rate deviation"]
            pkts = random.randint(800, 2200)
            bytes_c = pkts * 850
            dur = round(random.uniform(4.0, 12.0), 2)
            src = "10.10.30.42"
            src_asset = "USER-042"
            dst = "10.10.10.20"
            dst_asset = "WEB-01"
            dst_port = 8080
            proto = "HTTP/TCP"
        else:
            risk = "CRITICAL" if self.current_stage >= 4 else "HIGH"
            status = "Malicious"
            anoms = ["C2 Heartbeat beaconing", "Periodic egress channel", "High data volume"]
            pkts = random.randint(1200, 4800)
            bytes_c = pkts * 1200
            dur = round(random.uniform(8.0, 25.0), 2)
            src = "10.10.30.42"
            src_asset = "USER-042"
            dst = "198.51.100.24"
            dst_asset = "EXT-C2"
            dst_port = 8443
            proto = "TLS/TCP"

        new_flow = FlowDetail(
            id=f"FLOW-{1000 + len(self.flows)}",
            timestamp=current_time,
            source_ip=src,
            source_port=random.randint(49152, 65535),
            source_asset=src_asset,
            destination_ip=dst,
            destination_port=dst_port,
            destination_asset=dst_asset,
            protocol=proto,
            packets=pkts,
            bytes_transferred=bytes_c,
            flow_duration_sec=dur,
            packet_rate=round(pkts / max(dur, 0.1), 2),
            byte_rate=round(bytes_c / max(dur, 0.1), 2),
            syn_flag_count=15 if "Suspicious" in status else 1,
            ack_flag_count=max(pkts - 5, 1),
            rst_flag_count=4 if "Malicious" in status else 0,
            risk_level=risk,
            status=status,
            anomalies=anoms
        )
        self.flows.insert(0, new_flow)
        if len(self.flows) > 50:
            self.flows.pop()

    def get_risk_score(self) -> float:
        if self.current_stage == 1:
            return 1.4
        elif self.current_stage == 2:
            return 4.2
        elif self.current_stage == 3:
            return 6.7
        else:
            return 8.7

    def get_attack_probability(self) -> float:
        if self.current_stage == 1:
            return 0.12
        elif self.current_stage == 2:
            return 0.42
        elif self.current_stage == 3:
            return 0.67
        elif self.current_stage == 4:
            return 0.81
        else:
            return 0.82

    def get_risk_analysis(self) -> RiskAnalysisResponse:
        score = self.get_risk_score()
        prob = self.get_attack_probability()
        
        components = [
            RiskComponent(name="Traffic Anomaly", score_percentage=min(100.0, score * 9.4), description="Deviation from learned normal traffic feature distribution", weight=0.35),
            RiskComponent(name="Temporal Escalation", score_percentage=min(100.0, score * 8.8), description="Rate of state transition acceleration across windows", weight=0.25),
            RiskComponent(name="Attack Probability", score_percentage=round(prob * 100, 1), description="GRU world-model predicted likelihood of multi-stage cyberattack progression", weight=0.25),
            RiskComponent(name="Asset Severity", score_percentage=min(100.0, score * 8.5), description="Criticality weighting of target infrastructure (Web/Auth/DB)", weight=0.15),
        ]

        if score < 3.0:
            interpretation = "Risk is LOW. Network behavior aligns with normal enterprise operations and baseline traffic envelopes."
        elif score < 6.0:
            interpretation = "Risk is MEDIUM. Model has observed early reconnaissance scanning and port probing. Increased monitoring recommended."
        else:
            interpretation = "Risk is HIGH. Rapid temporal escalation detected across recent time windows indicating imminent Command & Control or lateral movement."

        return RiskAnalysisResponse(
            current_risk_score=score,
            risk_level="CRITICAL" if score >= 8.0 else ("HIGH" if score >= 6.0 else ("MEDIUM" if score >= 3.5 else "LOW")),
            attack_probability=prob,
            components=components,
            history=self.risk_history,
            soc_interpretation=interpretation
        )

    def update_alert_status(self, alert_id: str, new_status: str) -> Optional[AlertItem]:
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.status = new_status
                return alert
        return None

# Global singleton instance
simulator = TrafficSimulator()
