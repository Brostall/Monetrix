from dataclasses import dataclass
from typing import Dict, List, Optional

TEAM_LOGIN = "team217"
TEAM_PASSWORD = "YPbqtBmr3GdLOTTGTjXG6veu2MUlc1JJ"

BANK_CLIENT_IDS: List[str] = [f"{TEAM_LOGIN}-{i}" for i in range(1, 11)]


@dataclass
class BankConfig:
    code: str
    name: str
    base_url: str
    client_id: str
    client_secret: str
    auto_approve: bool = True
    poll_interval: float = 2.0
    poll_timeout: float = 60.0


BANK_CONFIGS: Dict[str, BankConfig] = {
    "vbank": BankConfig(
        code="vbank",
        name="VBank",
        base_url="https://vbank.open.bankingapi.ru",
        client_id=TEAM_LOGIN,
        client_secret=TEAM_PASSWORD,
        auto_approve=True,
    ),
    "abank": BankConfig(
        code="abank",
        name="ABank",
        base_url="https://abank.open.bankingapi.ru",
        client_id=TEAM_LOGIN,
        client_secret=TEAM_PASSWORD,
        auto_approve=True,
    ),
    "sbank": BankConfig(
        code="sbank",
        name="SBank",
        base_url="https://sbank.open.bankingapi.ru",
        client_id=TEAM_LOGIN,
        client_secret=TEAM_PASSWORD,
        auto_approve=False,
        poll_interval=3.0,
        poll_timeout=120.0,
    ),
}

DEFAULT_BANK_CLIENTS: Dict[str, str] = {code: BANK_CLIENT_IDS[0] for code in BANK_CONFIGS}


def resolve_bank_clients(preferred_client: Optional[str] = None) -> Dict[str, str]:
    target = preferred_client or BANK_CLIENT_IDS[0]
    return {code: target for code in BANK_CONFIGS}
