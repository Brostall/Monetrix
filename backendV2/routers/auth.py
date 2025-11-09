import asyncio
import logging
from fastapi import APIRouter, BackgroundTasks
from typing import Dict
from ..core.models import LoginRequest, RegisterIndividualRequest, RegisterBusinessRequest, UserType
from ..core.auth import create_token, users_db
from ..banks.config import BANK_CLIENT_IDS, BANK_CONFIGS, resolve_bank_clients
from ..banks.client import ensure_bank_token, ensure_consent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

async def _create_consents_for_user(bank_client_id: str):
    """Автоматически создает согласия для всех банков после регистрации"""
    print(f"\n🔄 Начинаю создание согласий для bankClientId: {bank_client_id}")
    client_mapping = resolve_bank_clients(bank_client_id)
    results = []
    for bank_code in BANK_CONFIGS:
        try:
            client_id = client_mapping.get(bank_code)
            if not client_id:
                continue
            print(f"  ⏳ Создаю согласие для {bank_code} (client: {client_id})...")
            token = await ensure_bank_token(bank_code)
            state = await ensure_consent(bank_code, client_id, token, force_new=True)
            status_emoji = "✅" if state.status.value == "active" else "⏳" if state.status.value == "pending" else "❌"
            print(f"  {status_emoji} {bank_code}: consentId={state.consent_id}, status={state.status.value}")
            results.append({"bank": bank_code, "consentId": state.consent_id, "status": state.status.value})
        except Exception as e:
            print(f"  ❌ Ошибка при создании согласия для {bank_code}: {e}")
            results.append({"bank": bank_code, "error": str(e)})
    print(f"✅ Создание согласий завершено. Результаты: {results}\n")

@router.post("/register")
async def register(request: RegisterIndividualRequest | RegisterBusinessRequest, background_tasks: BackgroundTasks) -> Dict:
    for user in users_db.values():
        if user["email"] == request.email:
            return {"error": "Email already registered"}
    user_id = f"u-{len(users_db)+1}"
    bank_client_id = request.bankClientId or BANK_CLIENT_IDS[0]
    user = {
        "id": user_id,
        "userType": UserType.INDIVIDUAL.value if isinstance(request, RegisterIndividualRequest) else UserType.BUSINESS.value,
        "fullName": getattr(request, "fullName", None) or getattr(request, "contact", None),
        "companyName": getattr(request, "companyName", None),
        "email": request.email,
        "password": request.password,
        "bankClientId": bank_client_id,
    }
    users_db[user_id] = user
    access = create_token({"sub": user_id, "type": user["userType"]})
    refresh = create_token({"sub": user_id, "type": "refresh"}, expires_minutes=60*24*7)
    #Логирование для отладки
    print("\n" + "="*80)
    print("🔑 НОВЫЙ ПОЛЬЗОВАТЕЛЬ ЗАРЕГИСТРИРОВАН")
    print("="*80)
    print(f"User ID: {user_id}")
    print(f"Email: {user['email']}")
    print(f"Bank Client ID: {bank_client_id}")
    print(f"\n📝 ACCESS TOKEN (используй в curl):")
    print(f"{access}")
    print("="*80 + "\n")
    
    background_tasks.add_task(_create_consents_for_user, bank_client_id)
    
    return {"accessToken": access, "refreshToken": refresh, "expiresIn": 3600, "user": user}

@router.post("/login")
async def login(request: LoginRequest) -> Dict:
    for uid, user in users_db.items():
        if user["email"] == request.email and user["password"] == request.password and user["userType"] == request.userType.value:
            access = create_token({"sub": uid, "type": user["userType"]})
            refresh = create_token({"sub": uid, "type": "refresh"}, expires_minutes=60*24*7)
            
            print("\n" + "="*80)
            print("🔐 ПОЛЬЗОВАТЕЛЬ ВОШЕЛ В СИСТЕМУ")
            print("="*80)
            print(f"User ID: {uid}")
            print(f"Email: {user['email']}")
            print(f"\n📝 ACCESS TOKEN (используй в curl):")
            print(f"{access}")
            print("="*80 + "\n")
            
            return {"accessToken": access, "refreshToken": refresh, "expiresIn": 3600, "user": user}
    return {"error": "Invalid credentials"}
