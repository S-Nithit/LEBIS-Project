"""แพ็กเกจ (Pricing) และการจ่ายเงินจำลอง (Checkout)

โครงไฟล์เหมือน routes/items.py: (1) Pydantic model (2) ฟังก์ชันช่วย (3) route
router ตัวนี้ต่อ prefix "/api" ตรงๆ ใน app.py (ไม่มี prefix ย่อยอีกชั้น)
เพราะเส้นทางมีทั้ง /plans, /checkout/*, /subscription/me ซึ่งไม่ได้ขึ้นต้น
เหมือนกันหมดแบบ items
"""

from datetime import datetime, timedelta, timezone
from typing import Literal
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from database import database
from queries import subscriptions as sub_query
from services.security import get_current_user

router = APIRouter()

# ราคาคงที่ ไม่ต้องอ่านจาก DB เพราะมีแค่ 2 แพ็กเกจตายตัวตามที่ตกลงกันไว้
PLANS = {
    "free": {"tier": "free", "price": 0, "features": [
        "ของไม่เกิน 50 ชิ้น",
        "รายงานย้อนหลัง 7 วัน",
        "ไม่มีแจ้งเตือน",
    ]},
    "pro": {"tier": "pro", "price": 299, "features": [
        "ของไม่จำกัด",
        "แจ้งเตือน LINE อัตโนมัติ",
        "รายงานเต็ม",
        "ส่งออกไฟล์ CSV",
    ]},
}


# ---------------------------------------------------------------------------
# 1) Pydantic model
# ---------------------------------------------------------------------------

class PlanResponse(BaseModel):
    tier: str
    price: int
    features: list[str]


class CheckoutSessionRequest(BaseModel):
    tier: str  # ตอนนี้รับแค่ "pro" เพราะ "free" ไม่ต้องจ่ายเงิน


class CheckoutSessionResponse(BaseModel):
    checkout_id: str
    tier: str
    amount: int


class CheckoutConfirmRequest(BaseModel):
    checkout_id: str
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
    """เริ่มขั้นตอนจ่ายเงินจำลอง — ยังไม่แก้อะไรใน DB แค่สร้าง session ให้หน้าเว็บอ้างอิง"""
    if payload.tier != "pro":
        fail(400, "invalid_plan", "เลือกได้เฉพาะแพ็กเกจ pro เท่านั้นสำหรับการอัปเกรด")

    if user["role"] == "pro":
        fail(409, "already_pro", "ร้านนี้ใช้แพ็กเกจ Pro อยู่แล้ว")

    if user["role"] == "admin":
        fail(403, "admin_cannot_subscribe", "บัญชีผู้ดูแลระบบไม่ต้องสมัครแพ็กเกจ")

    # checkout_id จำลอง ไม่ผูกกับ payment gateway จริง เพราะโจทย์ให้จ่ายเงินจำลอง
    checkout_id = str(uuid.uuid4())

    return CheckoutSessionResponse(
        checkout_id=checkout_id, tier="pro", amount=PLANS["pro"]["price"]
    )


@router.post("/checkout/confirm", response_model=SubscriptionResponse)
async def confirm_checkout(payload: CheckoutConfirmRequest, user=Depends(get_current_user)):
    """ยืนยันจ่ายเงินแล้ว → อัปเกรด role เป็น pro บันทึกลง subscriptions และ transactions

    ทำในทรานแซกชันเดียวกันทั้งหมด ตามแบบ create_item ใน routes/items.py
    เพื่อไม่ให้ role เปลี่ยนแล้วแต่บันทึกเงินไม่สำเร็จ (หรือกลับกัน)
    """
    if user["role"] == "pro":
        fail(409, "already_pro", "ร้านนี้ใช้แพ็กเกจ Pro อยู่แล้ว")

    if user["role"] == "admin":
        fail(403, "admin_cannot_subscribe", "บัญชีผู้ดูแลระบบไม่ต้องสมัครแพ็กเกจ")

    async with database.transaction():
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        sub = await sub_query.insert_subscription(user["email"], "pro", expires_at)
        await sub_query.insert_transaction(
            user_email=user["email"],
            subscription_id=sub["id"],
            amount=PLANS["pro"]["price"],
            method=payload.method,
            status="paid",
        )
        await sub_query.update_user_role(user["email"], "pro")

    return SubscriptionResponse(
        tier="pro", status=sub["status"], started_at=sub["started_at"], expires_at=sub["expires_at"]
    )


@router.post("/checkout/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(user=Depends(get_current_user)):
    """ยกเลิก Pro → ลดกลับเป็น free ทันที (ไม่รอครบรอบบิล เพื่อความง่ายของ demo)"""
    if user["role"] != "pro":
        fail(400, "not_pro", "ร้านนี้ไม่ได้ใช้แพ็กเกจ Pro อยู่")

    async with database.transaction():
        await sub_query.cancel_active(user["email"])
        await sub_query.update_user_role(user["email"], "free")

    return SubscriptionResponse(tier="free", status="cancelled")


@router.get("/subscription/me", response_model=SubscriptionResponse)
async def my_subscription(user=Depends(get_current_user)):
    """สถานะแพ็กเกจปัจจุบัน — หน้า Profile/Settings และกล่องเตือนเพดาน 50 ชิ้นเรียกใช้"""
    row = await sub_query.get_latest(user["email"])

    if row is None:
        return SubscriptionResponse(tier=user["role"])

    return SubscriptionResponse(
    tier=user["role"], status=row["status"], started_at=row["started_at"], expires_at=row["expires_at"]
)