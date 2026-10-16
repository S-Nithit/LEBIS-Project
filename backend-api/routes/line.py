"""เส้นทาง LINE — ผูกบัญชี ส่งทดสอบ ส่งสรุปตอนนี้ และ webhook ที่ LINE เรียกเข้ามา

ต่อ prefix "/api/line" (ดู app.py) ฉะนั้น @router.post("/test") = POST /api/line/test

🔴 ทุกเส้นที่ผู้ใช้เรียกต้องผ่าน require_tier("pro")
   แจ้งเตือน LINE คือฟีเจอร์ที่ขาย ผู้ใช้ Free เรียกตรงๆ ต้องได้ 403 (CLAUDE.md §5)
   ยกเว้น /webhook ที่ LINE เป็นคนเรียก ไม่มี token ของผู้ใช้ จึงตรวจลายเซ็นแทน
"""

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from services import line_notify
from services.security import get_current_user, require_tier

logger = logging.getLogger("lebis.line")

router = APIRouter()


class LineStatus(BaseModel):
    linked: bool
    tier_ok: bool
    configured: bool


class LinkCodeResponse(BaseModel):
    code: str
    expires_at: datetime
    add_friend_url: str | None


class SendResult(BaseModel):
    status: str
    count: int


def fail(status_code: int, code: str, message: str):
    raise HTTPException(status_code=status_code, detail={"code": code, "message": message})


def require_linked(user) -> None:
    if not line_notify.is_configured():
        fail(503, "line_not_configured", "ระบบยังไม่ได้เชื่อมกับ LINE")
    if not user["line_user_id"]:
        fail(409, "line_not_linked", "ร้านนี้ยังไม่ได้ผูกบัญชี LINE")


@router.get("/status", response_model=LineStatus)
async def line_status(user=Depends(get_current_user)):
    """หน้าตั้งค่าใช้ตัดสินว่าจะโชว์ปุ่มอะไร — ไม่ใช่เส้นที่ส่งข้อความ จึงเปิดให้ทุกแพ็กเกจ"""
    return LineStatus(
        linked=bool(user["line_user_id"]),
        tier_ok=line_notify.is_pro(user),
        # ผูกบัญชีต้องใช้ทั้ง token (ตอบกลับ) และ secret (ตรวจ webhook)
        # เดิมดูแค่ token — ตั้ง token แต่ลืม secret หน้าตั้งค่าจะโชว์ปุ่มขอรหัส แล้วกดได้ 503
        configured=line_notify.is_configured() and line_notify.webhook_ready(),
    )


@router.post("/link-code", response_model=LinkCodeResponse)
async def create_link_code(user=Depends(require_tier("pro"))):
    """ออกรหัส 8 ตัว ให้เจ้าของร้านพิมพ์ส่งในแชท LINE ภายใน 10 นาที"""
    if not line_notify.webhook_ready():
        fail(503, "line_not_configured", "ระบบยังไม่ได้เชื่อมกับ LINE")
    code, expires_at = await line_notify.issue_link_code(user["email"])
    return LinkCodeResponse(code=code, expires_at=expires_at,
                            add_friend_url=line_notify.add_friend_url())


@router.post("/test", response_model=SendResult)
async def send_test(user=Depends(require_tier("pro"))):
    """ส่งข้อความทดสอบหา LINE ของตัวเอง — ใช้ตอนผูกบัญชีเสร็จ"""
    require_linked(user)
    try:
        await line_notify.push_text(user["line_user_id"], "LEBIS · ทดสอบการแจ้งเตือน ได้รับข้อความนี้แปลว่าผูกบัญชีสำเร็จ")
    except line_notify.LineError:
        fail(502, "line_send_failed", "ส่งข้อความไป LINE ไม่สำเร็จ ลองใหม่อีกครั้ง")
    return SendResult(status="sent", count=0)


@router.post("/digest", response_model=SendResult)
async def send_digest_now(user=Depends(require_tier("pro"))):
    """ส่งสรุปของต้องคืนตอนนี้เลย ไม่ต้องรอ 08:00 — ปุ่มเดโมและปุ่ม "ส่งอีกครั้ง" """
    require_linked(user)
    result = await line_notify.send_digest(user, force=True)
    if result["status"] == "failed":
        fail(502, "line_send_failed", "ส่งข้อความไป LINE ไม่สำเร็จ ลองใหม่อีกครั้ง")
    return SendResult(**result)


@router.post("/webhook")
async def webhook(request: Request):
    """LINE เรียกเส้นนี้ทุกครั้งที่มีคนแอดเพื่อนหรือพิมพ์ข้อความหา OA

    อ่าน body ดิบก่อน parse — ลายเซ็นคำนวณจาก byte ตามที่ LINE ส่งมาเป๊ะ
    LINE ส่ง events ว่างมาเพื่อทดสอบการเชื่อมต่อตอนกดปุ่ม Verify ต้องตอบ 200
    """
    if not line_notify.webhook_ready():
        fail(503, "line_not_configured", "ระบบยังไม่ได้เชื่อมกับ LINE")

    body = await request.body()
    if not line_notify.verify_signature(body, request.headers.get("x-line-signature", "")):
        fail(403, "bad_signature", "ลายเซ็นไม่ถูกต้อง")

    for event in json.loads(body).get("events", []):
        # event เดียวพัง (เช่นฐานข้อมูลสะดุด) ต้องไม่ลากตัวที่เหลือในชุดเดียวกันพังไปด้วย
        try:
            await line_notify.handle_event(event)
        except Exception:
            logger.exception("จัดการ event จาก LINE ไม่สำเร็จ")
    return {"ok": True}
