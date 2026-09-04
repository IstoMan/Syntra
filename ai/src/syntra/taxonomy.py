"""Coarse family / MITRE ATT&CK lookup. Learned classes are dataset families, not ATT&CK."""

from __future__ import annotations

# Index 0 is always benign. Heads predict these ids from rolled-out states.
ATTACK_FAMILIES: tuple[str, ...] = (
    "benign",
    "brute_force",
    "dos",
    "web",
    "infiltration",
    "botnet",
    "portscan",
    "heartbleed",
)

# Coarse tactics only — honest mapping from CIC families, not a general ATT&CK classifier.
ATTACK_STAGES: tuple[str, ...] = (
    "none",
    "reconnaissance",
    "initial_access",
    "credential_access",
    "command_and_control",
    "impact",
)

FAMILY_TO_STAGE: dict[str, str] = {
    "benign": "none",
    "brute_force": "credential_access",
    "dos": "impact",
    "web": "initial_access",
    "infiltration": "initial_access",
    "botnet": "command_and_control",
    "portscan": "reconnaissance",
    "heartbleed": "initial_access",
}

FAMILY_TO_MITRE: dict[str, dict[str, str]] = {
    "benign": {"tactic": "None", "technique": "—"},
    "brute_force": {"tactic": "Credential Access", "technique": "T1110 Brute Force"},
    "dos": {"tactic": "Impact", "technique": "T1498/T1499 Network Denial of Service"},
    "web": {
        "tactic": "Initial Access",
        "technique": "T1190 Exploit Public-Facing Application",
    },
    "infiltration": {"tactic": "Initial Access", "technique": "T1190 / T1021"},
    "botnet": {
        "tactic": "Command and Control",
        "technique": "T1071 Application Layer Protocol",
    },
    "portscan": {
        "tactic": "Reconnaissance",
        "technique": "T1046 Network Service Discovery",
    },
    "heartbleed": {"tactic": "Initial Access", "technique": "T1190 Heartbleed"},
}

CIC_LABEL_TO_FAMILY: dict[str, str] = {
    "benign": "benign",
    "ftp-patator": "brute_force",
    "ssh-patator": "brute_force",
    "ftp-bruteforce": "brute_force",
    "ssh-bruteforce": "brute_force",
    "web attack – brute force": "brute_force",
    "web attack-brute force": "brute_force",
    "web attack – xss": "web",
    "web attack-xss": "web",
    "web attack – sql injection": "web",
    "web attack-sql injection": "web",
    "dos slowloris": "dos",
    "dos slowhttptest": "dos",
    "dos hulk": "dos",
    "dos goldeneye": "dos",
    "ddos": "dos",
    "ddos loit": "dos",
    "heartbleed": "heartbleed",
    "infiltration": "infiltration",
    "bot": "botnet",
    "botnet": "botnet",
    "portscan": "portscan",
}


def normalize_label(raw: str) -> str:
    return " ".join(
        str(raw).strip().lower().replace("\x96", "-").replace("–", "-").split()
    )


def family_from_cic_label(raw: str) -> str:
    key = normalize_label(raw)
    if key in CIC_LABEL_TO_FAMILY:
        return CIC_LABEL_TO_FAMILY[key]
    if "patator" in key or "brute" in key:
        return "brute_force"
    if "xss" in key or "sql" in key:
        return "web"
    if (
        "hulk" in key
        or "goldeneye" in key
        or "slowloris" in key
        or "slowhttp" in key
        or key == "ddos"
    ):
        return "dos"
    if "infilt" in key:
        return "infiltration"
    if "bot" in key:
        return "botnet"
    if "port" in key and "scan" in key:
        return "portscan"
    if "heartbleed" in key:
        return "heartbleed"
    if key == "benign":
        return "benign"
    return "benign"


def family_id(name: str) -> int:
    return ATTACK_FAMILIES.index(name)


def stage_id(name: str) -> int:
    return ATTACK_STAGES.index(name)


def stage_from_family(family: str) -> str:
    return FAMILY_TO_STAGE[family]
