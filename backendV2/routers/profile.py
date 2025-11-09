from fastapi import APIRouter, Depends
from typing import Dict, Any
from ..core.auth import get_current_user
from ..banks.client import bank_consents_by_key
from ..banks.config import BANK_CONFIGS, resolve_bank_clients, BANK_CLIENT_IDS

router = APIRouter(prefix="/api", tags=["profile"])

@router.get("/profile")
async def profile(current_user = Depends(get_current_user)) -> Dict[str, Any]:
    consents = []
    client_mapping = resolve_bank_clients(current_user.get("bankClientId"))
    for bank_code in BANK_CONFIGS:
        client_id = client_mapping.get(bank_code)
        state = bank_consents_by_key.get((bank_code, client_id))
        consents.append({
            "bank": bank_code,
            "bankLabel": BANK_CONFIGS[bank_code].name,
            "status": state.status.value if state else "missing",
            "consentId": state.consent_id if state else None,
            "clientId": client_id,
        })
    return {"user": current_user, "consents": consents, "availableClients": BANK_CLIENT_IDS}
