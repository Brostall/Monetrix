import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple, List
import httpx
from ..banks.config import BANK_CONFIGS, BankConfig, DEFAULT_BANK_CLIENTS, TEAM_LOGIN
from ..core.models import ConsentStatus

@dataclass
class BankTokenState:
    access_token: str
    expires_at: datetime

@dataclass
class BankConsentState:
    consent_id: Optional[str]  # Может быть None для pending согласий
    status: ConsentStatus
    bank_code: str
    client_id: str
    expires_at: Optional[datetime]
    last_synced_at: datetime
    request_id: Optional[str] = None  # Для SBank pending согласий

bank_tokens: Dict[str, BankTokenState] = {}
bank_token_locks: Dict[str, asyncio.Lock] = {code: asyncio.Lock() for code in BANK_CONFIGS}
bank_consents_by_key: Dict[Tuple[str, str], BankConsentState] = {}
bank_consents_by_id: Dict[str, BankConsentState] = {}
bank_consent_locks: Dict[Tuple[str, str], asyncio.Lock] = {}

def _get_consent_lock(bank_code: str, client_id: str) -> asyncio.Lock:
    key = (bank_code, client_id)
    if key not in bank_consent_locks:
        bank_consent_locks[key] = asyncio.Lock()
    return bank_consent_locks[key]

async def _http_post(cfg: BankConfig, path: str, *, headers: Optional[Dict[str, str]] = None,
                     params: Optional[Dict[str, Any]] = None, data: Optional[Dict[str, Any]] = None,
                     json_payload: Optional[Dict[str, Any]] = None) -> httpx.Response:
    url = f"{cfg.base_url}{path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        return await client.post(url, headers=headers, params=params, data=data, json=json_payload)

async def _http_get(cfg: BankConfig, path: str, *, headers: Optional[Dict[str, str]] = None,
                    params: Optional[Dict[str, Any]] = None) -> httpx.Response:
    url = f"{cfg.base_url}{path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        return await client.get(url, headers=headers, params=params)

async def _http_delete(cfg: BankConfig, path: str, *, headers: Optional[Dict[str, str]] = None,
                       params: Optional[Dict[str, Any]] = None) -> httpx.Response:
    url = f"{cfg.base_url}{path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        return await client.delete(url, headers=headers, params=params)

async def fetch_bank_token(cfg: BankConfig) -> BankTokenState:
    # API банка ожидает параметры как query parameters, а не JSON body
    params = {
        "client_id": cfg.client_id,
        "client_secret": cfg.client_secret,
    }
    
    print(f"    🔑 Получаю токен для {cfg.code} с client_id={cfg.client_id}")
    
    # Пробуем сначала с query parameters (как в документации)
    response = await _http_post(cfg, "/auth/bank-token", params=params)
    
    # Проверяем статус ответа
    if response.status_code >= 400:
        # Если не получилось с query params, пробуем с JSON body
        print(f"    ⚠️  Query params не сработали ({response.status_code}), пробую JSON body...")
        response = await _http_post(cfg, "/auth/bank-token", json_payload=params)
        
        if response.status_code >= 400:
            error_text = response.text
            try:
                error_data = response.json()
                error_text = str(error_data)
            except:
                pass
            print(f"    ❌ Ошибка получения токена для {cfg.code}: {response.status_code} - {error_text}")
            raise Exception(f"Failed to get bank token for {cfg.code}: {response.status_code} - {error_text}")
    
    try:
        data = response.json()
    except Exception as e:
        print(f"    ❌ Не удалось распарсить JSON ответ от {cfg.code}: {e}")
        print(f"    Ответ: {response.text}")
        raise
    
    token = data.get("access_token") or data.get("token")
    if not token:
        print(f"    ❌ Токен не найден в ответе от {cfg.code}. Данные: {data}")
        raise Exception(f"No token in response from {cfg.code}")
    
    expires_in = int(data.get("expires_in") or 3600)
    print(f"    ✅ Токен получен для {cfg.code}, expires_in={expires_in}s")
    return BankTokenState(access_token=token, expires_at=datetime.utcnow() + timedelta(seconds=expires_in - 60))

async def ensure_bank_token(bank_code: str) -> str:
    cfg = BANK_CONFIGS[bank_code]
    state = bank_tokens.get(bank_code)
    if state and state.expires_at > datetime.utcnow():
        return state.access_token
    async with bank_token_locks[bank_code]:
        state = bank_tokens.get(bank_code)
        if state and state.expires_at > datetime.utcnow():
            return state.access_token
        state = await fetch_bank_token(cfg)
        bank_tokens[bank_code] = state
        return state.access_token

def _normalize_status(value: Optional[str]) -> ConsentStatus:
    if not value:
        return ConsentStatus.PENDING
    v = value.lower()
    if v in {"active", "approved", "granted"}:
        return ConsentStatus.ACTIVE
    if v in {"pending", "awaiting", "created"}:
        return ConsentStatus.PENDING
    if v in {"revoked", "cancelled"}:
        return ConsentStatus.REVOKED
    if v in {"expired"}:
        return ConsentStatus.EXPIRED
    return ConsentStatus.PENDING

async def request_account_consent(cfg: BankConfig, token: str, client_id: str) -> BankConsentState:
    if not token:
        raise Exception(f"Token is required for {cfg.code}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Requesting-Bank": TEAM_LOGIN,
        "Content-Type": "application/json"
    }
    
    print(f"    📤 Отправляю запрос согласия для {cfg.code} с client_id={client_id}, token={token[:20]}...")
    
    response = await _http_post(cfg, "/account-consents/request", headers=headers, json_payload={
        "client_id": client_id,
        "permissions": ["ReadAccountsDetail", "ReadBalances", "ReadTransactions"],
    })
    
    # Проверяем статус ответа
    if response.status_code >= 400:
        print(f"    ❌ Ошибка от банка {cfg.code}: {response.status_code} - {response.text}")
        raise Exception(f"Bank API error: {response.status_code}")
    
    data = response.json()
    
    # Логируем полный ответ для отладки
    print(f"    📄 Полный ответ от {cfg.code}: {data}")
    
    # Пробуем разные варианты полей для ID согласия
    consent_id = (
        data.get("consent_id") or 
        data.get("id") or 
        data.get("consentId")
    )
    
    # request_id отдельно (для SBank pending согласий)
    request_id = data.get("request_id") or data.get("requestId")
    
    status = _normalize_status(data.get("status"))
    
    # Если нет consent_id, но есть request_id (для pending согласий)
    if not consent_id and request_id:
        # Для pending согласий используем request_id как временный идентификатор
        # Но не сохраняем его как consent_id, т.к. после одобрения будет другой ID
        print(f"    ℹ️  Согласие pending, request_id={request_id}, consent_id будет после одобрения")
    
    # Проверяем, не вернул ли банк старое согласие
    existing_key = (cfg.code, client_id)
    existing = bank_consents_by_key.get(existing_key)
    if existing and existing.consent_id == consent_id:
        print(f"    ⚠️  Банк вернул существующее согласие {consent_id} (возможно, не удалось отозвать)")
    else:
        if consent_id:
            print(f"    ✅ Банк вернул новое согласие {consent_id}")
        else:
            print(f"    ⚠️  Банк не вернул ID согласия. Данные: {data}")
    
    return BankConsentState(
        consent_id=consent_id, 
        status=status, 
        bank_code=cfg.code, 
        client_id=client_id, 
        expires_at=None, 
        last_synced_at=datetime.utcnow(),
        request_id=request_id
    )

async def fetch_consent_status(cfg: BankConfig, token: str, consent_id: Optional[str], client_id: str, request_id: Optional[str] = None) -> BankConsentState:
    headers = {"Authorization": f"Bearer {token}", "X-Requesting-Bank": TEAM_LOGIN}
    
    # Если есть request_id, пробуем проверить по нему (для SBank pending согласий)
    check_id = consent_id or request_id
    if not check_id:
        return BankConsentState(consent_id=None, status=ConsentStatus.PENDING, bank_code=cfg.code, client_id=client_id, expires_at=None, last_synced_at=datetime.utcnow(), request_id=request_id)
    
    try:
        # Пробуем проверить по consent_id или request_id
        response = await _http_get(cfg, f"/account-consents/{check_id}", headers=headers)
        if response.status_code >= 400:
            # Если согласие не найдено, возможно оно ещё не создано или ещё pending
            return BankConsentState(consent_id=consent_id, status=ConsentStatus.PENDING, bank_code=cfg.code, client_id=client_id, expires_at=None, last_synced_at=datetime.utcnow(), request_id=request_id)
        data = response.json()
        status = _normalize_status(data.get("status"))
        # Обновляем consent_id на случай, если банк вернул другой ID
        updated_consent_id = data.get("consent_id") or data.get("id") or consent_id
        updated_request_id = data.get("request_id") or request_id
        return BankConsentState(consent_id=updated_consent_id, status=status, bank_code=cfg.code, client_id=client_id, expires_at=None, last_synced_at=datetime.utcnow(), request_id=updated_request_id)
    except Exception as e:
        print(f"    ⚠️  Ошибка при проверке статуса согласия {check_id}: {e}")
        return BankConsentState(consent_id=consent_id, status=ConsentStatus.PENDING, bank_code=cfg.code, client_id=client_id, expires_at=None, last_synced_at=datetime.utcnow(), request_id=request_id)

async def ensure_consent(bank_code: str, client_id: str, token: str, force_new: bool = False) -> BankConsentState:
    cfg = BANK_CONFIGS[bank_code]
    key = (bank_code, client_id)
    existing = bank_consents_by_key.get(key)
    
    # Если нужно принудительно создать новое согласие, отзываем старое
    if force_new and existing and existing.consent_id:
        print(f"    🔄 Отзываю старое согласие {existing.consent_id} для {bank_code}...")
        try:
            await revoke_consent_remote(cfg, token, existing.consent_id)
            bank_consents_by_key.pop(key, None)
            bank_consents_by_id.pop(existing.consent_id, None)
            print(f"    ✅ Старое согласие отозвано")
        except Exception as e:
            print(f"    ⚠️  Не удалось отозвать старое согласие (может быть уже отозвано): {e}")
    
    # Если есть активное согласие и не нужно принудительно создавать новое - используем его
    if existing and existing.status == ConsentStatus.ACTIVE and not force_new:
        return existing
    
    # Если есть pending согласие и не нужно принудительно создавать новое - используем его
    # (не создаем новое, пока старое не одобрено или не истекло)
    if existing and existing.status == ConsentStatus.PENDING and not force_new:
        print(f"    ℹ️  Использую существующее pending согласие для {bank_code} (request_id={existing.request_id})")
        return existing
    
    async with _get_consent_lock(bank_code, client_id):
        existing = bank_consents_by_key.get(key)
        if existing and existing.status == ConsentStatus.ACTIVE and not force_new:
            return existing
        
        # Проверяем pending согласие еще раз внутри lock
        if existing and existing.status == ConsentStatus.PENDING and not force_new:
            print(f"    ℹ️  Использую существующее pending согласие для {bank_code} (request_id={existing.request_id})")
            return existing
        
        # Отзываем старое согласие, если оно есть и нужно создать новое
        if force_new and existing and existing.consent_id:
            print(f"    🔄 Отзываю старое согласие {existing.consent_id} для {bank_code} (внутри lock)...")
            try:
                await revoke_consent_remote(cfg, token, existing.consent_id)
                print(f"    ✅ Старое согласие отозвано (внутри lock)")
            except Exception as e:
                print(f"    ⚠️  Не удалось отозвать старое согласие (внутри lock): {e}")
        
        print(f"    📝 Запрашиваю новое согласие для {bank_code}...")
        state = await request_account_consent(cfg, token, client_id)
        print(f"    📋 Банк вернул: consentId={state.consent_id}, status={state.status.value}")
        
        if not cfg.auto_approve:
            bank_consents_by_key[key] = state
            if state.consent_id:
                bank_consents_by_id[state.consent_id] = state
            return state
        if state.status != ConsentStatus.ACTIVE:
            # Если нет consent_id, но есть request_id (для SBank), пробуем проверить статус
            if not state.consent_id and state.request_id:
                print(f"    ⏳ Ожидаю активации согласия для {bank_code} (request_id={state.request_id})...")
                for i in range(40):
                    await asyncio.sleep(cfg.poll_interval)
                    state = await fetch_consent_status(cfg, token, state.consent_id, client_id, state.request_id)
                    if state.status == ConsentStatus.ACTIVE:
                        print(f"    ✅ Согласие активировано для {bank_code}")
                        break
                    if i % 5 == 0:
                        print(f"    ⏳ Проверка {i+1}/40: status={state.status.value}")
            elif state.consent_id:
                print(f"    ⏳ Ожидаю активации согласия для {bank_code}...")
                for i in range(40):
                    await asyncio.sleep(cfg.poll_interval)
                    state = await fetch_consent_status(cfg, token, state.consent_id, client_id, state.request_id)
                    if state.status == ConsentStatus.ACTIVE:
                        print(f"    ✅ Согласие активировано для {bank_code}")
                        break
                    if i % 5 == 0:
                        print(f"    ⏳ Проверка {i+1}/40: status={state.status.value}")
            else:
                print(f"    ⚠️  Банк {bank_code} не вернул ID согласия. Возможно, нужно подождать или проверить вручную.")
        bank_consents_by_key[key] = state
        if state.consent_id:
            bank_consents_by_id[state.consent_id] = state
        return state

async def revoke_consent_remote(cfg: BankConfig, token: str, consent_id: str) -> None:
    headers = {"Authorization": f"Bearer {token}", "X-Requesting-Bank": TEAM_LOGIN}
    try:
        await _http_delete(cfg, f"/account-consents/{consent_id}", headers=headers)
    except Exception:
        pass  # Игнорируем ошибки при отзыве

async def fetch_bank_accounts(cfg: BankConfig, token: str, consent: BankConsentState, client_id: str) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}", "X-Requesting-Bank": TEAM_LOGIN, "X-Consent-Id": consent.consent_id}
    resp = await _http_get(cfg, "/accounts", headers=headers, params={"client_id": client_id})
    data = resp.json()
    if isinstance(data, dict) and "items" in data:
        return data["items"]
    return data if isinstance(data, list) else []

async def fetch_bank_transactions(cfg: BankConfig, token: str, consent: BankConsentState, client_id: str,
                                  account_id: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}", "X-Requesting-Bank": TEAM_LOGIN, "X-Consent-Id": consent.consent_id}
    if account_id:
        resp = await _http_get(cfg, f"/accounts/{account_id}/transactions", headers=headers, params={"client_id": client_id, "limit": limit, "offset": offset})
        data = resp.json()
        if isinstance(data, dict) and "items" in data:
            return data["items"]
        return data if isinstance(data, list) else []
    accounts = await fetch_bank_accounts(cfg, token, consent, client_id)
    aggregated: List[Dict[str, Any]] = []
    for acc in accounts:
        acc_id = acc.get("id") or acc.get("account_id")
        if not acc_id:
            continue
        nested = await fetch_bank_transactions(cfg, token, consent, client_id, acc_id, limit, offset)
        for tx in nested:
            tx.setdefault("accountId", acc_id)
            aggregated.append(tx)
    return aggregated

async def gather_bank_data(bank_code: str, client_id: str, *, account_limit: int = 50, transaction_limit: int = 100, force_new_consent: bool = False) -> Dict[str, Any]:
    token = await ensure_bank_token(bank_code)
    cfg = BANK_CONFIGS[bank_code]
    consent = await ensure_consent(bank_code, client_id, token, force_new=force_new_consent)
    if consent.status != ConsentStatus.ACTIVE:
        return {"bank": bank_code, "accounts": [], "transactions": [], "consentStatus": consent.status.value}
    accounts = await fetch_bank_accounts(cfg, token, consent, client_id)
    accounts = accounts[:account_limit]
    transactions: List[Dict[str, Any]] = []
    for acc in accounts:
        acc_id = acc.get("id") or acc.get("account_id")
        if not acc_id:
            continue
        txs = await fetch_bank_transactions(cfg, token, consent, client_id, acc_id, transaction_limit)
        for tx in txs:
            tx.setdefault("bank", bank_code)
            tx.setdefault("accountId", acc_id)
            transactions.append(tx)
    return {"bank": bank_code, "accounts": accounts, "transactions": transactions, "consentStatus": consent.status.value}

async def aggregate_banks(client_mapping: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    mapping = client_mapping or DEFAULT_BANK_CLIENTS
    results: List[Tuple[str, Any]] = []
    tasks = [(code, asyncio.create_task(gather_bank_data(code, mapping.get(code)))) for code in BANK_CONFIGS if mapping.get(code)]
    for bank_code, task in tasks:
        try:
            res = await task
            results.append((bank_code, res))
        except Exception as exc:
            results.append((bank_code, exc))
    accounts: List[Dict[str, Any]] = []
    transactions: List[Dict[str, Any]] = []
    consents: List[Dict[str, Any]] = []
    for bank_code, res in results:
        if isinstance(res, Exception):
            consents.append({"bank": bank_code, "error": str(res)})
            continue
        for acc in res.get("accounts", []):
            acc.setdefault("bank", bank_code)
            accounts.append(acc)
        for tx in res.get("transactions", []):
            tx.setdefault("bank", bank_code)
            transactions.append(tx)
        consents.append({"bank": bank_code, "status": res.get("consentStatus")})
    return {"accounts": accounts, "transactions": transactions, "consents": consents}
