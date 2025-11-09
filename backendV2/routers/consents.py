from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from ..core.models import ConsentRequest
from ..core.auth import get_current_user
from ..banks.client import ensure_bank_token, ensure_consent, fetch_consent_status, revoke_consent_remote, bank_consents_by_id, bank_consents_by_key
from ..banks.config import BANK_CONFIGS, resolve_bank_clients

router = APIRouter(prefix="/api/consents", tags=["consents"])

@router.post("")
async def create_consent(request: ConsentRequest, current_user = Depends(get_current_user)) -> Dict:
    bank_code = request.bankCode.lower()
    if bank_code not in BANK_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Unknown bank code: {bank_code}")
    client_mapping = resolve_bank_clients(current_user.get("bankClientId"))
    client_id = request.clientId or client_mapping.get(bank_code)
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID is required")
    token = await ensure_bank_token(bank_code)
    state = await ensure_consent(bank_code, client_id, token, force_new=True)
    return {"consentId": state.consent_id, "status": state.status.value, "bank": bank_code}

@router.get("/{consent_id}/status")
async def status(consent_id: str, current_user = Depends(get_current_user)) -> Dict:
    state = bank_consents_by_id.get(consent_id)
    if not state:
        state = None
        for s in bank_consents_by_key.values():
            if s.request_id == consent_id:
                state = s
                break
        if not state:
            raise HTTPException(status_code=404, detail="Consent not found")
    token = await ensure_bank_token(state.bank_code)
    cfg = BANK_CONFIGS[state.bank_code]
    updated = await fetch_consent_status(cfg, token, state.consent_id, state.client_id, state.request_id)
    bank_consents_by_key[(updated.bank_code, updated.client_id)] = updated
    if updated.consent_id:
        bank_consents_by_id[updated.consent_id] = updated
    if updated.request_id:
        bank_consents_by_id[updated.request_id] = updated
    return {"consentId": updated.consent_id, "status": updated.status.value, "bank": updated.bank_code, "requestId": updated.request_id}

@router.delete("/{consent_id}")
async def revoke(consent_id: str, current_user = Depends(get_current_user)) -> Dict:
    state = bank_consents_by_id.get(consent_id)
    if not state:
        raise HTTPException(status_code=404, detail="Consent not found")
    token = await ensure_bank_token(state.bank_code)
    cfg = BANK_CONFIGS[state.bank_code]
    await revoke_consent_remote(cfg, token, consent_id)
    bank_consents_by_id.pop(consent_id, None)
    bank_consents_by_key.pop((state.bank_code, state.client_id), None)
    return {"message": "ok"}
