from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List, Optional
from ..core.auth import get_current_user
from ..banks.client import aggregate_banks
from ..banks.config import resolve_bank_clients

router = APIRouter(prefix="/api", tags=["dashboard"])


def _safe_amount(value: Any) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def _extract_account_balance(account: Dict[str, Any]) -> float:
    if "balance" in account:
        return _safe_amount(account.get("balance"))
    return 0.0


def _calculate_summary(accounts: List[Dict[str, Any]], transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    net_worth = sum(_extract_account_balance(a) for a in accounts)
    assets = sum(v for v in map(_extract_account_balance, accounts) if v >= 0)
    liabilities = sum(abs(v) for v in map(_extract_account_balance, accounts) if v < 0)
    cashflow = sum(_safe_amount(t.get("amount", 0)) for t in transactions)
    return {
        "netWorth": net_worth,
        "assets": assets,
        "liabilities": liabilities,
        "cashflow": {"next30days": cashflow, "trend": 0},
        "budgets": [],
    }


@router.get("/dashboard/summary")
async def summary(current_user = Depends(get_current_user)):
    client_mapping = resolve_bank_clients(current_user.get("bankClientId"))
    aggregated = await aggregate_banks(client_mapping)
    summary_data = _calculate_summary(aggregated["accounts"], aggregated["transactions"])
    summary_data["consents"] = aggregated["consents"]
    summary_data["accounts"] = aggregated["accounts"]
    return summary_data


@router.get("/dashboard/transactions")
async def transactions(current_user = Depends(get_current_user),
                       from_date: Optional[str] = Query(None, alias="from"),
                       to_date: Optional[str] = Query(None, alias="to"),
                       accountId: Optional[str] = None,
                       limit: int = 50,
                       offset: int = 0):
    client_mapping = resolve_bank_clients(current_user.get("bankClientId"))
    aggregated = await aggregate_banks(client_mapping)
    txs = aggregated["transactions"]

    def match(tx: Dict[str, Any]) -> bool:
        if accountId and str(tx.get("accountId")) != str(accountId):
            return False
        if from_date and str(tx.get("date")) < from_date:
            return False
        if to_date and str(tx.get("date")) > to_date:
            return False
        return True

    filtered = [tx for tx in txs if match(tx)]
    total = len(filtered)
    return {"items": filtered[offset:offset + limit], "pagination": {"limit": limit, "offset": offset, "total": total}}


@router.get("/recommendations")
async def recommendations(current_user = Depends(get_current_user)):
    client_mapping = resolve_bank_clients(current_user.get("bankClientId"))
    aggregated = await aggregate_banks(client_mapping)
    accounts = aggregated["accounts"]
    transactions = aggregated["transactions"]

    total_positive = sum(_safe_amount(tx.get("amount", 0)) for tx in transactions if _safe_amount(tx.get("amount", 0)) > 0)
    total_negative = sum(_safe_amount(tx.get("amount", 0)) for tx in transactions if _safe_amount(tx.get("amount", 0)) < 0)
    largest_accounts = sorted(accounts, key=lambda acc: _safe_amount(acc.get("balance", 0)), reverse=True)[:3]

    recs: List[Dict[str, Any]] = []

    net_cashflow = total_positive + total_negative
    if net_cashflow < 0:
        recs.append({
            "id": "rec-cashflow",
            "title": "Оптимизируйте расходы",
            "message": "За последние периоды расходы превышают доходы. Проверьте крупные списания и сократите необязательные платежи.",
            "category": "Расходы",
        })

    if largest_accounts:
        top_account = largest_accounts[0]
        top_balance = _safe_amount(top_account.get("balance", 0))
        top_label = top_account.get("name") or top_account.get("accountType") or top_account.get("bank") or "счёте"
        recs.append({
            "id": "rec-deposit",
            "title": "Разместите излишки ликвидности",
            "message": f"На счёте {top_label} скопилось {top_balance:,.2f} ₽ — рассмотрите вклад или инвестиции под более высокий процент.",
            "category": "Инвестиции",
        })

    unique_banks = set(acc.get("bank") for acc in accounts if acc.get("bank"))
    if len(unique_banks) < len(accounts):
        recs.append({
            "id": "rec-diversify",
            "title": "Диверсифицируйте средства",
            "message": "Некоторые счета сконцентрированы в одном банке. Распределите активы между разными банками для снижения рисков.",
            "category": "Риски",
        })

    if not recs:
        recs.append({
            "id": "rec-default",
            "title": "Данные обновлены",
            "message": "Система не обнаружила критичных действий. Мониторинг продолжается.",
            "category": "Информация",
        })

    return recs
