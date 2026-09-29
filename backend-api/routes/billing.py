"""แพ็กเกจ (Pricing) และการจ่ายเงินจำลอง (Checkout)

โครงไฟล์เหมือน routes/items.py: (1) Pydantic model (2) ฟังก์ชันช่วย (3) route
router ตัวนี้ต่อ prefix "/api" ตรงๆ ใน app.py (ไม่มี prefix ย่อยอีกชั้น)
เพราะเส้นทางมีทั้ง /plans, /checkout/*, /subscription/me ซึ่งไม่ได้ขึ้นต้น
เหมือนกันหมดแบบ items
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from database import database
from queries import billing as billing_query
from services.security import get_current_user

router = APIRouter()

# ราคาคงที่ ไม่ต้องอ่านจาก DB เพราะมีแค่ 2 แพ็กเกจตายตัวตามที่ตกลงกันไว้
PLANS = {
    "free": {"tier": "free", "price": 0, "item_limit": 50, "report_days": 7, "line_reminder": False, "csv_export": False},
    "pro": {"tier": "pro", "price": 299, "item_limit": None, "report_days": None, "line_reminder": True, "csv_export": True},
}


# ---------------------------------------------------------------------------
# 1) Pydantic model
# ---------------------------------------------------------------------------

class PlanResponse(BaseModel):
    tier: str
    price: int
    item_limit: int | None
    report_days: int | None
    line_reminder: bool
    csv_export: bool


class CheckoutSessionRequest(BaseModel):
    tier: str  # ตอนนี้รับแค่ "pro" เพราะ "free" ไม่ต้องจ่ายเงิน


class CheckoutSessionResponse(BaseModel):
    checkout_id: int
    tier: str
    amount: int


class CheckoutConfirmRequest(BaseModel):
    checkout_id: int
    method: Literal["mock_qr", "stripe_test"] = "mock_qr"


class SubscriptionResponse(BaseModel):
    tier: str
    status: str | None = None
    started_at: datetime | None = None
    expires_at: datetime | None = None


# ---------------------------------------------------------------------------
# 2) ฟังก์ชันช่วย
# ---------------------------------------------------------------------------

def fail(status_code: int, code: str, message: str):
    raise HTTPException(status_code=status_code, detail={"code": code, "message": message})


# ---------------------------------------------------------------------------
# 3) route
# ---------------------------------------------------------------------------

@router.get("/plans", response_model=list[PlanResponse])
async def list_plans():
    """แพ็กเกจทั้งหมด — endpoint นี้ไม่ต้อง login เพราะหน้า Landing เรียกดูได้"""
    return list(PLANS.values())


@router.post("/checkout/session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    payload: CheckoutSessionRequest, user=Depends(get_current_user)
):
    if payload.tier != "pro":
        fail(400, "invalid_plan", "เลือกได้เฉพาะแพ็กเกจ pro เท่านั้นสำหรับการอัปเกรด")

    if user["role"] == "admin":
        fail(403, "admin_cannot_subscribe", "บัญชีผู้ดูแลระบบไม่ต้องสมัครแพ็กเกจ")

    if user["role"] == "pro":
        fail(409, "already_pro", "ร้านนี้ใช้แพ็กเกจ Pro อยู่แล้ว")

    amount = Decimal(str(PLANS["pro"]["price"]))
    txn = await billing_query.insert_pending_transaction(user["email"], amount)

    return CheckoutSessionResponse(checkout_id=txn["id"], tier="pro", amount=PLANS["pro"]["price"])


@router.post("/checkout/confirm", response_model=SubscriptionResponse)
async def confirm_checkout(payload: CheckoutConfirmRequest, user=Depends(get_current_user)):
    """ยืนยันจ่ายเงินแล้ว

    ความปลอดภัยจริงอยู่ที่ get_pending_transaction_for_update: ต้องเจอแถว
    pending ของ checkout_id นี้ที่เป็นของ user คนนี้เท่านั้น ถึงจะไปต่อได้
    FOR UPDATE ล็อกแถวไว้ ทำให้คำขอที่ยิงซ้ำพร้อมกันเรียงคิวกันเอง
    คำขอแรกอัปเดตแถวเป็น paid แล้ว คำขอถัดไปจะไม่เจอแถว pending อีก จึงโดน 404
    """
    async with database.transaction():
        txn = await billing_query.get_pending_transaction_for_update(
            payload.checkout_id, user["email"]
        )

        if txn is None:
            fail(404, "checkout_not_found", "ไม่พบรายการจ่ายเงินนี้ หรือถูกใช้ไปแล้ว")

        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        sub = await billing_query.insert_subscription(user["email"], "pro", expires_at)
        await billing_query.mark_transaction_paid(txn["id"], sub["id"], payload.method)
        await billing_query.update_user_role(user["email"], "pro")

    return SubscriptionResponse(
        tier="pro", status=sub["status"], started_at=sub["started_at"], expires_at=sub["expires_at"]
    )


@router.post("/checkout/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(user=Depends(get_current_user)):
    """ยกเลิก Pro → ลดกลับเป็น free ทันที (ไม่รอครบรอบบิล เพื่อความง่ายของ demo)"""
    if user["role"] != "pro":
        fail(400, "not_pro", "ร้านนี้ไม่ได้ใช้แพ็กเกจ Pro อยู่")

    async with database.transaction():
        await billing_query.cancel_active(user["email"])
        await billing_query.update_user_role(user["email"], "free")

    return SubscriptionResponse(tier="free", status="cancelled")


@router.get("/subscription/me", response_model=SubscriptionResponse)
async def my_subscription(user=Depends(get_current_user)):
    """สถานะแพ็กเกจปัจจุบัน — หน้า Profile/Settings และกล่องเตือนเพดาน 50 ชิ้นเรียกใช้"""
    row = await billing_query.get_latest(user["email"])

    if row is None:
        return SubscriptionResponse(tier=user["role"])

    return SubscriptionResponse(
        tier=user["role"], status=row["status"], started_at=row["started_at"], expires_at=row["expires_at"]
    )