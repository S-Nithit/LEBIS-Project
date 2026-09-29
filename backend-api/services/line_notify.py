"""แจ้งเตือนผ่าน LINE Messaging API — ส่งสรุปของต้องคืนให้เจ้าของร้านทุกเช้า

ส่งให้ใคร
    เจ้าของร้าน (users.line_user_id) ไม่ใช่ลูกค้าที่เช่า
    ลูกค้าไม่ได้ผูก LINE กับระบบ เจ้าของร้านเป็นคนโทรตามเอง

ส่งอะไร
    สรุปรวมวันละ 1 ข้อความต่อร้าน ไม่ใช่ 1 ข้อความต่อใบเช่า
    เพราะ LINE OA แพ็กเกจฟรีในไทยส่ง push ได้ 300 ข้อความ/เดือน
    (lineforbusiness.com/th ตรวจเมื่อ ก.ย. 2569) ข้อความตอบกลับ (reply) ไม่นับโควตา
    วันละ 1 ข้อความ = ราว 30 ข้อความ/เดือน/ร้าน แพ็กเกจฟรีรองรับได้ราว 10 ร้าน
    ถ้าส่งรายใบ ร้านเดียวที่ปล่อยเช่าวันละ 10 ใบก็หมดโควตาแล้ว

ค่าที่ต้องตั้ง (Railway / .env เท่านั้น ห้ามใส่ในโค้ด)
    LINE_CHANNEL_ACCESS_TOKEN   ใช้ส่งข้อความ
    LINE_CHANNEL_SECRET         ใช้ตรวจลายเซ็นของ webhook
    ไม่ตั้ง = ระบบยังรันได้ แค่ข้ามการส่ง LINE ทั้งหมด

ที่มาของรายละเอียด API: สเปค OpenAPI ทางการ github.com/line/line-openapi
และ developers.line.biz (ตรวจลายเซ็น · retry key)
"""

import asyncio
import base64
import hashlib
import hmac
import logging
import os
import secrets
import uuid
from datetime import date, datetime, time, timedelta

import httpx

from database import expire_pro_if_due
from queries import notifications as notifications_query
from services import inventory
from services.inventory import BANGKOK
from services.security import TIER_ORDER

logger = logging.getLogger("lebis.line")

DAILY_HOUR = 8  # ส่งสรุปตอน 08:00 เวลาไทย ก่อนร้านเปิด
MAX_LINES = 15  # รายการที่แสดงในข้อความ เกินนี้บอกเป็นจำนวน ให้ไปดูต่อในเว็บ
LINK_CODE_MINUTES = 10
LINK_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # ตัด 0 O 1 I ที่อ่านสลับกันง่าย

# namespace ของ retry key รายวัน — ร้านเดียวกัน วันเดียวกัน ได้ key เดิมเสมอ
DAILY_KEY_NAMESPACE = uuid.UUID("6f1c5e2a-0b7d-4c1e-9a3f-2d8e4b7c9a10")

THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
               "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]


class LineError(Exception):
    """LINE ปฏิเสธคำขอ หรือเชื่อมต่อไม่ได้หลังลองซ้ำแล้ว"""


# ---------------------------------------------------------------------------
# ค่าตั้ง — อ่านตอนเรียกทุกครั้ง ไม่ใช่ตอน import ตั้งค่าใหม่แล้วไม่ต้องรีสตาร์ทโค้ด
# ---------------------------------------------------------------------------

def _token() -> str:
    return os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "").strip()


def _secret() -> str:
    return os.getenv("LINE_CHANNEL_SECRET", "").strip()


def _api_base() -> str:
    # เปลี่ยนได้เฉพาะตอนทดสอบ ให้ชี้ไปเซิร์ฟเวอร์จำลองแทน LINE จริง
    return os.getenv("LINE_API_BASE", "https://api.line.me").rstrip("/")


def _app_url() -> str:
    return os.getenv("APP_URL", "https://lebis-project.vercel.app").rstrip("/")


def add_friend_url() -> str | None:
    """ลิงก์แอดเพื่อน OA ของ LEBIS (จากหน้า LINE Official Account Manager) ไม่ตั้งก็ได้"""
    return os.getenv("LINE_ADD_FRIEND_URL", "").strip() or None


def is_configured() -> bool:
    return bool(_token())


def webhook_ready() -> bool:
    return bool(_secret())


# ---------------------------------------------------------------------------
# คุยกับ LINE
# ---------------------------------------------------------------------------

async def _post(path: str, body: dict, retry_key: str | None = None) -> str:
    """ยิงคำขอไป LINE คืน "sent" หรือ "duplicate" · ล้มเหลวโยน LineError

    ลองซ้ำได้ 1 ครั้ง เฉพาะตอน 5xx หรือ timeout และต้องใช้ retry key เดิม
    LINE รับประกันว่า key เดียวกันส่งจริงแค่ครั้งเดียวภายใน 24 ชม.
    ลองซ้ำตอน 4xx ไม่ได้ เพราะคำขอผิดตั้งแต่ต้น ส่งซ้ำก็ผิดเหมือนเดิม
    """
    headers = {"Authorization": f"Bearer {_token()}"}
    if retry_key:
        headers["X-Line-Retry-Key"] = retry_key

    attempts = 2 if retry_key else 1
    async with httpx.AsyncClient(timeout=10) as client:
        for attempt in range(1, attempts + 1):
            try:
                response = await client.post(_api_base() + path, json=body, headers=headers)
            except httpx.TransportError as error:
                if attempt < attempts:
                    continue
                raise LineError(f"เชื่อมต่อ LINE ไม่ได้: {error}") from error

            if response.status_code == 200:
                return "sent"
            # 409 = key นี้เคยส่งสำเร็จไปแล้ว ถือว่าสำเร็จ ไม่ใช่ error
            if response.status_code == 409 and retry_key:
                return "duplicate"
            if response.status_code >= 500 and attempt < attempts:
                continue
            raise LineError(f"LINE ตอบ {response.status_code}: {response.text[:200]}")

    raise LineError("LINE ไม่ตอบ")


async def push_text(to: str, text: str, retry_key: str | None = None) -> str:
    """ส่งข้อความหาผู้ใช้คนเดียว — นับโควตา"""
    body = {"to": to, "messages": [{"type": "text", "text": text}]}
    return await _post("/v2/bot/message/push", body, retry_key or str(uuid.uuid4()))


async def reply_text(reply_token: str, text: str) -> None:
    """ตอบกลับข้อความที่เพิ่งได้รับ — ไม่นับโควตา · reply ไม่รองรับ retry key"""
    body = {"replyToken": reply_token, "messages": [{"type": "text", "text": text}]}
    await _post("/v2/bot/message/reply", body)


def verify_signature(body: bytes, signature: str) -> bool:
    """webhook มาจาก LINE จริงมั้ย — HMAC-SHA256 ด้วย channel secret แล้ว Base64

    🔴 ต้องคำนวณจาก body ดิบก่อน parse JSON เสมอ
       ถ้า parse แล้ว serialize กลับ ช่องว่างหรือลำดับคีย์เปลี่ยน ลายเซ็นจะไม่ตรง
    เทียบด้วย compare_digest เพื่อไม่ให้เวลาที่ใช้เทียบบอกใบ้ว่าตรงกี่ตัวอักษร
    """
    secret = _secret()
    if not secret or not signature:
        return False
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode("ascii")
    return hmac.compare_digest(expected, signature)


# ---------------------------------------------------------------------------
# ผูกบัญชี
# ---------------------------------------------------------------------------

def new_link_code() -> str:
    return "".join(secrets.choice(LINK_CODE_ALPHABET) for _ in range(8))


def normalize_code(text: str) -> str:
    """คนพิมพ์รหัสมาได้หลายแบบ ตัวเล็ก เว้นวรรค ขีด — ทำให้เหลือแบบเดียว"""
    return "".join(ch for ch in text.upper() if ch.isalnum())


async def issue_link_code(email: str) -> tuple:
    code = new_link_code()
    expires_at = datetime.now(BANGKOK) + timedelta(minutes=LINK_CODE_MINUTES)
    await notifications_query.save_link_code(email, code, expires_at)
    return code, expires_at


async def handle_event(event: dict) -> None:
    """จัดการ event 1 ตัวจาก webhook — พังได้แค่ตัวเอง ไม่ลากตัวอื่นพังไปด้วย"""
    source = event.get("source") or {}
    reply_token = event.get("replyToken")
    if source.get("type") != "user" or not reply_token:
        return  # ข้อความจากกลุ่ม หรือ event ที่ตอบกลับไม่ได้ — ข้าม

    if event.get("type") == "follow":
        await _safe_reply(reply_token, "ยินดีต้อนรับสู่ LEBIS\n"
                          "ส่งรหัส 8 ตัวจากหน้าตั้งค่าของร้านมาในแชทนี้ เพื่อรับสรุปของต้องคืนทุกเช้า")
        return

    message = event.get("message") or {}
    if event.get("type") != "message" or message.get("type") != "text":
        return

    code = normalize_code(message.get("text", ""))
    if len(code) != 8:
        await _safe_reply(reply_token, "ส่งรหัส 8 ตัวจากหน้าตั้งค่าของร้านใน LEBIS มาในแชทนี้ได้เลย")
        return

    shop = await notifications_query.link_by_code(code, source["userId"])
    if shop is None:
        await _safe_reply(reply_token, "รหัสนี้ไม่ถูกต้องหรือหมดอายุแล้ว (ใช้ได้ 10 นาที)\n"
                          "ขอรหัสใหม่ที่หน้าตั้งค่าของร้าน")
        return

    name = shop["shop_name"] or shop["email"]
    await _safe_reply(reply_token, f"ผูกบัญชีกับร้าน {name} แล้ว\n"
                      f"จะได้รับสรุปของต้องคืนทุกเช้า {DAILY_HOUR:02d}:00")


async def _safe_reply(reply_token: str, text: str) -> None:
    """ตอบกลับไม่สำเร็จไม่ควรทำให้ webhook ตอบ LINE เป็น error"""
    try:
        await reply_text(reply_token, text)
    except LineError as error:
        logger.warning("ตอบกลับ LINE ไม่สำเร็จ: %s", error)


# ---------------------------------------------------------------------------
# สรุปรายวัน
# ---------------------------------------------------------------------------

def _thai_day(iso_day: str) -> str:
    day = date.fromisoformat(iso_day)
    return f"{day.day} {THAI_MONTHS[day.month - 1]}"


def build_digest(shop_name: str, records: list, today: str) -> str:
    """ประกอบข้อความสรุป — แบ่งเป็นเลยกำหนด / ครบวันนี้ / ครบพรุ่งนี้"""
    tomorrow = (date.fromisoformat(today) + timedelta(days=1)).isoformat()
    groups = [
        ("เลยกำหนดคืนแล้ว", [r for r in records if r["due_date"] < today]),
        ("ครบกำหนดวันนี้", [r for r in records if r["due_date"] == today]),
        ("ครบกำหนดพรุ่งนี้", [r for r in records if r["due_date"] == tomorrow]),
    ]

    lines = [f"LEBIS · ของต้องคืน {_thai_day(today)}", f"ร้าน {shop_name}"]
    shown = 0
    for title, group in groups:
        if not group:
            continue
        lines += ["", f"{title} {len(group)} รายการ"]
        for record in group:
            if shown == MAX_LINES:
                break
            lines.append(f"• {record['code']} {record['name']} — {record['borrower']}"
                         f" (ครบ {_thai_day(record['due_date'])})")
            shown += 1

    hidden = len(records) - shown
    if hidden > 0:
        lines += ["", f"และอีก {hidden} รายการ"]
    lines += ["", f"ดูทั้งหมด: {_app_url()}/workspace"]
    return "\n".join(lines)


def is_pro(user) -> bool:
    return TIER_ORDER.get(user["role"], -1) >= TIER_ORDER["pro"]


async def send_digest(user, today: str | None = None, force: bool = False) -> dict:
    """ส่งสรุปให้ร้านเดียว คืน {"status", "count"}

    status: sent · already_sent · nothing_due · not_linked · not_configured · failed
    force=True ใช้กับปุ่ม "ส่งตอนนี้" — ข้ามการเช็กว่าวันนี้ส่งแล้ว และใช้ key ใหม่
    """
    if not user["line_user_id"]:
        return {"status": "not_linked", "count": 0}
    if not is_configured():
        return {"status": "not_configured", "count": 0}

    today = today or inventory.today_in_bangkok()
    if not force and await notifications_query.sent_on(user["email"], date.fromisoformat(today)):
        return {"status": "already_sent", "count": 0}

    # ใบที่ครบก่อนวันมะรืน = เลยกำหนด + วันนี้ + พรุ่งนี้ (binary search ของวิชา Data)
    day_after_tomorrow = (date.fromisoformat(today) + timedelta(days=2)).isoformat()
    records = await inventory.due_before(user["email"], day_after_tomorrow)
    if not records:
        return {"status": "nothing_due", "count": 0}

    text = build_digest(user["shop_name"] or user["email"], records, today)
    retry_key = None if force else str(uuid.uuid5(DAILY_KEY_NAMESPACE, f"{user['email']}:{today}"))
    borrow_ids = [record["borrow_id"] for record in records]

    try:
        await push_text(user["line_user_id"], text, retry_key)
    except LineError as error:
        logger.warning("ส่งสรุปให้ %s ไม่สำเร็จ: %s", user["email"], error)
        await notifications_query.record(user["email"], borrow_ids, "failed")
        return {"status": "failed", "count": len(records)}

    await notifications_query.record(user["email"], borrow_ids, "sent")
    return {"status": "sent", "count": len(records)}


async def run_daily_job(today: str | None = None) -> dict:
    """ส่งสรุปให้ทุกร้านที่เป็น pro และผูก LINE แล้ว คืนจำนวนตามผลลัพธ์"""
    summary = {}
    for user in await notifications_query.users_with_line():
        if not is_pro(user):
            continue  # ลดแพ็กเกจแล้วแต่ยังผูก LINE ค้างอยู่ — ไม่ส่ง
        # งานนี้ไม่ได้ผ่าน get_current_user เหมือนคำขอจากหน้าเว็บ
        # ถ้าไม่เช็คตรงนี้ ร้านที่ Pro หมดอายุแต่ไม่ได้เปิดเว็บ จะได้ LINE ต่อไปเรื่อยๆ
        if user["role"] == "pro" and await expire_pro_if_due(user["email"]):
            continue
        result = await send_digest(user, today)
        summary[result["status"]] = summary.get(result["status"], 0) + 1
    logger.info("สรุปรายวัน LINE: %s", summary)
    return summary


def seconds_until_next_run(now: datetime | None = None) -> float:
    now = now or datetime.now(BANGKOK)
    target = datetime.combine(now.date(), time(DAILY_HOUR), tzinfo=BANGKOK)
    if now >= target:
        target += timedelta(days=1)
    return (target - now).total_seconds()


async def daily_loop() -> None:
    """รันอยู่เบื้องหลังตลอดอายุของเซิร์ฟเวอร์ (เริ่มใน app.py)

    เซิร์ฟเวอร์รีสตาร์ทหลัง 08:00 (เช่น deploy ใหม่) = วันนั้นยังไม่ได้ส่ง
    จึงรันตามหลังทันทีถ้าตื่นมาระหว่าง 08:00-20:00 ไม่ส่งซ้ำเพราะ send_digest
    เช็กว่าวันนี้ส่งแล้วหรือยัง และ retry key รายวันกันซ้ำที่ฝั่ง LINE อีกชั้น
    """
    now = datetime.now(BANGKOK)
    if DAILY_HOUR <= now.hour < 20:
        await _run_safely()
    while True:
        await asyncio.sleep(seconds_until_next_run())
        await _run_safely()


async def _run_safely() -> None:
    if not is_configured():
        logger.info("ข้ามสรุปรายวัน LINE — ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN")
        return
    try:
        await run_daily_job()
    except Exception:  # งานเบื้องหลังตายเงียบๆ ไม่ได้ ต้องเห็นในล็อก แล้ววนต่อพรุ่งนี้
        logger.exception("สรุปรายวัน LINE ล้มเหลว")
