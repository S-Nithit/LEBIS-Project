"""SQL ของแพ็กเกจและการจ่ายเงิน (ตาราง subscriptions, transactions)

ไฟล์นี้มีแต่คำสั่ง SQL ไม่มีการตัดสินใจทางธุรกิจ ตามแบบ queries/items.py
กฎว่าใครทำอะไรได้บ้างอยู่ที่ routes/billing.py

checkout_id คือ id ของแถวใน transactions เอง — /checkout/session สร้างแถว
สถานะ pending ไว้ก่อน แล้ว /checkout/confirm อ่านแถวนั้นด้วย FOR UPDATE
ก่อนจะยืนยันจริง วิธีนี้กันทั้งการข้ามขั้นจ่ายเงิน (ยิง confirm มั่วๆ id ที่ไม่มี)
และการกดยืนยันซ้ำพร้อมกัน (id เดียวกันโดนล็อกแถว คำขอที่ 2 จะไม่เจอแถว pending แล้ว)
"""

from decimal import Decimal

from database import database

SUB_COLUMNS = "id, user_email, tier, started_at, expires_at, status"
TXN_COLUMNS = "id, user_email, subscription_id, amount, method, status, paid_at"


# ---------------------------------------------------------------------------
# transactions — วงจรของ checkout
# ---------------------------------------------------------------------------

async def insert_pending_transaction(user_email: str, amount: Decimal):
    """สร้างแถวจ่ายเงินสถานะ pending — id ของแถวนี้คือ checkout_id ที่ส่งกลับหน้าเว็บ

    subscription_id เป็น NULL เพราะยังไม่รู้ว่าจะสร้าง subscription ไหน
    (schema อนุญาตให้ NULL ไว้ตรงนี้อยู่แล้ว)
    """
    return await database.fetch_one(
        f"""
        INSERT INTO transactions (user_email, subscription_id, amount, method, status)
        VALUES (:user_email, NULL, :amount, 'mock_qr', 'pending')
        RETURNING {TXN_COLUMNS}
        """,
        {"user_email": user_email, "amount": amount},
    )


async def get_pending_transaction_for_update(transaction_id: int, user_email: str):
    """หาแถว pending ของ user คนนี้ พร้อมล็อกแถวไว้จนจบทรานแซกชัน (FOR UPDATE)

    เงื่อนไขครบ 3 อย่างในที่เดียว: id ตรง + เป็นเจ้าของ + ยังไม่ถูกใช้
    ไม่เจอ = ปฏิเสธเป็น 404 ไม่บอกว่าติดเงื่อนไขไหน (กันเดา id ของคนอื่น)

    🔴 ใช้ได้เฉพาะข้างใน async with database.transaction() เท่านั้น
       และต้องเรียกก่อนจะอ่าน role ของ user เพื่อตัดสินใจอัปเกรดเสมอ
       ไม่งั้นคำขอที่ยิงพร้อมกันจะอ่าน role เดิมได้เหมือนกันหมด
    """
    return await database.fetch_one(
        f"""
        SELECT {TXN_COLUMNS} FROM transactions
        WHERE id = :id AND user_email = :user_email AND status = 'pending'
        FOR UPDATE
        """,
        {"id": transaction_id, "user_email": user_email},
    )


async def mark_transaction_paid(transaction_id: int, subscription_id: int, method: str):
    return await database.fetch_one(
        f"""
        UPDATE transactions
        SET status = 'paid', subscription_id = :subscription_id,
            method = :method, paid_at = now()
        WHERE id = :id
        RETURNING {TXN_COLUMNS}
        """,
        {"id": transaction_id, "subscription_id": subscription_id, "method": method},
    )


# ---------------------------------------------------------------------------
# subscriptions
# ---------------------------------------------------------------------------

async def insert_subscription(user_email: str, tier: str, expires_at):
    return await database.fetch_one(
        f"""
        INSERT INTO subscriptions (user_email, tier, started_at, expires_at, status)
        VALUES (:user_email, :tier, now(), :expires_at, 'active')
        RETURNING {SUB_COLUMNS}
        """,
        {"user_email": user_email, "tier": tier, "expires_at": expires_at},
    )


async def cancel_active(user_email: str):
    return await database.execute(
        """
        UPDATE subscriptions SET status = 'cancelled'
        WHERE user_email = :user_email AND status = 'active'
        """,
        {"user_email": user_email},
    )


async def get_latest(user_email: str):
    """แพ็กเกจล่าสุด ไม่ว่าจะสถานะไหนก็ตาม — ใช้แสดงผลหน้า subscription/me"""
    return await database.fetch_one(
        f"""
        SELECT {SUB_COLUMNS} FROM subscriptions
        WHERE user_email = :user_email
        ORDER BY started_at DESC
        LIMIT 1
        """,
        {"user_email": user_email},
    )


async def update_user_role(user_email: str, role: str):
    await database.execute(
        "UPDATE users SET role = :role WHERE email = :user_email",
        {"role": role, "user_email": user_email},
    )