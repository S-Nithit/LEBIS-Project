"""SQL ของแพ็กเกจและการจ่ายเงิน (ตาราง subscriptions, transactions)

ไฟล์นี้มีแต่คำสั่ง SQL ไม่มีการตัดสินใจทางธุรกิจ ตามแบบ queries/items.py
กฎว่าใครทำอะไรได้บ้างอยู่ที่ routes/billing.py

🔴 สมมติฐานที่ต้องเช็ก: ใช้ user_email เป็นคีย์ ตามแบบ items.owner_email
   ถ้า schema จริงใช้ user_id ให้แก้ชื่อคอลัมน์ในไฟล์นี้ทั้งหมด
"""

from database import database

SUB_COLUMNS = "id, user_email, tier, started_at, expires_at, status"
TXN_COLUMNS = "id, user_email, subscription_id, amount, method, status, paid_at"


# ---------------------------------------------------------------------------
# อ่าน
# ---------------------------------------------------------------------------

async def get_active(user_email: str):
    """แพ็กเกจที่ใช้งานอยู่ตอนนี้ของร้านนี้ (ถ้ามี)"""
    return await database.fetch_one(
        f"""
        SELECT {SUB_COLUMNS} FROM subscriptions
        WHERE user_email = :user_email AND status = 'active'
        ORDER BY started_at DESC
        LIMIT 1
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


# ---------------------------------------------------------------------------
# เขียน
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
    """ปิดแพ็กเกจที่ active อยู่ทั้งหมดของร้านนี้ (ปกติมีแค่ใบเดียว)"""
    return await database.execute(
        """
        UPDATE subscriptions SET status = 'cancelled'
        WHERE user_email = :user_email AND status = 'active'
        """,
        {"user_email": user_email},
    )


async def insert_transaction(user_email: str, subscription_id: int, amount: float, method: str, status: str):
    return await database.fetch_one(
        f"""
        INSERT INTO transactions (user_email, subscription_id, amount, method, status, paid_at)
        VALUES (:user_email, :subscription_id, :amount, :method, :status, now())
        RETURNING {TXN_COLUMNS}
        """,
        {
            "user_email": user_email,
            "subscription_id": subscription_id,
            "amount": amount,
            "method": method,
            "status": status,
        },
    )


async def update_user_role(user_email: str, role: str):
    """เปลี่ยน role ของ user ใน users table — ตัวที่ routes/items.py อ่าน user['role']"""
    await database.execute(
        "UPDATE users SET role = :role WHERE email = :user_email",
        {"role": role, "user_email": user_email},
    )