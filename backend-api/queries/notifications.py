"""SQL ของงานแจ้งเตือน LINE — ตาราง notifications และช่องผูกบัญชี LINE ใน users

ไฟล์นี้มีแต่ SQL ไม่มีการตัดสินใจ กฎว่าส่งเมื่อไรและส่งให้ใครอยู่ที่
services/line_notify.py
"""

from datetime import date, datetime

from database import database


# ---------------------------------------------------------------------------
# ผูกบัญชี LINE
# ---------------------------------------------------------------------------

async def save_link_code(email: str, code: str, expires_at: datetime) -> None:
    """เก็บรหัสผูกบัญชีใบใหม่ ทับใบเก่าของคนนี้ (ขอใหม่ = ใบเก่าใช้ไม่ได้ทันที)"""
    await database.execute(
        """
        UPDATE users
        SET line_link_code = :code, line_link_expires = :expires_at
        WHERE email = :email
        """,
        {"email": email, "code": code, "expires_at": expires_at},
    )


async def link_by_code(code: str, line_user_id: str):
    """ผูก LINE เข้ากับร้านที่ถือรหัสนี้ คืนแถวของร้าน หรือ None ถ้ารหัสผิด/หมดอายุ

    ตรวจรหัส ผูกบัญชี และล้างรหัสทิ้งในคำสั่งเดียว
    รหัสจึงใช้ได้ครั้งเดียวจริงๆ ต่อให้มีคนส่งรหัสเดียวกันมาพร้อมกันสองคน
    """
    return await database.fetch_one(
        """
        UPDATE users
        SET line_user_id = :line_user_id, line_link_code = NULL, line_link_expires = NULL
        WHERE line_link_code = :code AND line_link_expires > NOW()
        RETURNING email, shop_name
        """,
        {"code": code, "line_user_id": line_user_id},
    )


# ---------------------------------------------------------------------------
# สรุปรายวัน
# ---------------------------------------------------------------------------

async def users_with_line():
    """ร้านที่ผูก LINE แล้ว — แพ็กเกจกรองต่อใน services ด้วย TIER_ORDER ตัวเดียวกับ route"""
    return await database.fetch_all(
        """
        SELECT email, shop_name, role, line_user_id
        FROM users
        WHERE line_user_id IS NOT NULL
        """
    )


async def sent_on(email: str, day: date) -> bool:
    """วันนี้ (ตามเวลาไทย) ส่งสรุปให้ร้านนี้สำเร็จไปแล้วหรือยัง"""
    found = await database.fetch_val(
        """
        SELECT 1 FROM notifications
        WHERE user_email = :email
          AND channel = 'line'
          AND status = 'sent'
          AND (sent_at AT TIME ZONE 'Asia/Bangkok')::date = :day
        LIMIT 1
        """,
        {"email": email, "day": day},
    )
    return found is not None


async def record(email: str, borrow_ids: list, status: str) -> None:
    """บันทึกว่าใบเช่าไหนอยู่ในข้อความที่ส่ง — 1 แถวต่อ 1 ใบเช่า

    sent_at ใส่เฉพาะตอนส่งสำเร็จ แถวที่ล้มเหลวจะได้ไม่ถูกนับว่า "ส่งแล้ววันนี้"
    """
    await database.execute_many(
        """
        INSERT INTO notifications (user_email, borrow_id, channel, sent_at, status)
        VALUES (:email, :borrow_id, 'line',
                CASE WHEN :status = 'sent' THEN NOW() END, :status)
        """,
        [{"email": email, "borrow_id": borrow_id, "status": status} for borrow_id in borrow_ids],
    )
