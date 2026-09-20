import os

import bcrypt
from databases import Database

POSTGRES_USER = os.getenv("POSTGRES_USER", "temp")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "temp")
POSTGRES_DB = os.getenv("POSTGRES_DB", "advcompro")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")

DATABASE_URL = (
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}/{POSTGRES_DB}"
)

database = Database(DATABASE_URL)


async def connect_db():
    await database.connect()


async def disconnect_db():
    await database.disconnect()


# ---------------------------------------------------------------------------
# สร้างตาราง
#
# setup_db() ถูกเรียกทุกครั้งที่ backend สตาร์ท (ดู lifespan ใน app.py)
# ทุกคำสั่งในนี้ต้อง "รันซ้ำได้โดยไม่พัง" — เลยใช้ IF NOT EXISTS ทั้งหมด
# โปรเจกต์นี้ไม่มี migration tool ถ้าแก้ schema ให้ล้าง volume แล้วขึ้นใหม่:
#   docker compose down -v && docker compose up --build
# ---------------------------------------------------------------------------

# ตาราง users ของ boilerplate มีแค่ email/password/token/create_at
# LEBIS ขยายในที่เดิม (ยังใช้ email เป็น primary key) เพื่อให้ demo login เดิมใช้ได้
CREATE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    email        VARCHAR(255) PRIMARY KEY,
    password     TEXT NOT NULL,
    token        TEXT,
    name         VARCHAR(120),
    shop_name    VARCHAR(120),
    role         VARCHAR(10) NOT NULL DEFAULT 'free',
    line_user_id VARCHAR(64),
    create_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
"""

# เผื่อกรณีที่ volume เดิมมีตาราง users ของ boilerplate อยู่ก่อนแล้ว
# CREATE TABLE IF NOT EXISTS ด้านบนจะข้ามไปเลย คอลัมน์ใหม่จึงต้องเติมด้วย ALTER
ALTER_USERS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(120)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_name VARCHAR(120)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'free'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(64)",
]

# อุปกรณ์ในร้าน — code ซ้ำได้ข้ามร้าน แต่ห้ามซ้ำในร้านเดียวกัน (ดู UNIQUE ท้ายตาราง)
CREATE_ITEMS = """
CREATE TABLE IF NOT EXISTS items (
    id          SERIAL PRIMARY KEY,
    owner_email VARCHAR(255) NOT NULL REFERENCES users(email),
    code        VARCHAR(32)  NOT NULL,
    name        VARCHAR(160) NOT NULL,
    category    VARCHAR(60)  NOT NULL,
    total       INT NOT NULL DEFAULT 1,
    available   INT NOT NULL DEFAULT 1,
    status      VARCHAR(10) NOT NULL DEFAULT 'ok',
    daily_rate  NUMERIC(10,2) NOT NULL DEFAULT 0,
    create_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (owner_email, code)
)
"""

# ใบยืม 1 ใบ = อุปกรณ์ 1 ชิ้นที่ลูกค้าถือไป + กำหนดคืน
# status: active | returned | overdue
CREATE_BORROWS = """
CREATE TABLE IF NOT EXISTS borrows (
    id             SERIAL PRIMARY KEY,
    item_id        INT NOT NULL REFERENCES items(id),
    owner_email    VARCHAR(255) NOT NULL REFERENCES users(email),
    customer_name  VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(32),
    borrowed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date       TIMESTAMPTZ NOT NULL,
    returned_at    TIMESTAMPTZ,
    status         VARCHAR(10) NOT NULL DEFAULT 'active'
)
"""

# แพ็กเกจ pro ที่ผู้ใช้สมัคร — status: active | cancelled | expired
CREATE_SUBSCRIPTIONS = """
CREATE TABLE IF NOT EXISTS subscriptions (
    id         SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email),
    tier       VARCHAR(10) NOT NULL DEFAULT 'pro',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status     VARCHAR(10) NOT NULL DEFAULT 'active'
)
"""

# รายการจ่ายเงิน (จำลอง ไม่มีเงินจริง) — status: pending | paid | failed
CREATE_TRANSACTIONS = """
CREATE TABLE IF NOT EXISTS transactions (
    id              SERIAL PRIMARY KEY,
    user_email      VARCHAR(255) NOT NULL REFERENCES users(email),
    subscription_id INT REFERENCES subscriptions(id),
    amount          NUMERIC(10,2) NOT NULL,
    method          VARCHAR(40) NOT NULL DEFAULT 'mock_qr',
    status          VARCHAR(10) NOT NULL DEFAULT 'pending',
    paid_at         TIMESTAMPTZ
)
"""

# คิวแจ้งเตือนใกล้ครบกำหนดคืน (ส่งผ่าน LINE) — status: pending | sent | failed
CREATE_NOTIFICATIONS = """
CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email),
    borrow_id  INT NOT NULL REFERENCES borrows(id),
    channel    VARCHAR(20) NOT NULL DEFAULT 'line',
    sent_at    TIMESTAMPTZ,
    status     VARCHAR(20) NOT NULL DEFAULT 'pending'
)
"""

# ลำดับสำคัญ: ตารางที่ถูกอ้างด้วย REFERENCES ต้องถูกสร้างก่อน
CREATE_TABLES = [
    CREATE_USERS,
    CREATE_ITEMS,
    CREATE_BORROWS,
    CREATE_SUBSCRIPTIONS,
    CREATE_TRANSACTIONS,
    CREATE_NOTIFICATIONS,
]


async def setup_db():
    for statement in CREATE_TABLES:
        await database.execute(statement)

    for statement in ALTER_USERS:
        await database.execute(statement)

    # บัญชีทดลองที่ติดมากับ boilerplate — demo@example.com / password
    demo_password = bcrypt.hashpw(b"password", bcrypt.gensalt()).decode("utf-8")
    await database.execute(
        """
        INSERT INTO users (email, password, name, shop_name, role)
        VALUES (:email, :password, :name, :shop_name, :role)
        ON CONFLICT (email) DO NOTHING
        """,
        {
            "email": "demo@example.com",
            "password": demo_password,
            "name": "Demo User",
            "shop_name": "Demo Rental Shop",
            "role": "pro",
        },
    )


async def get_user_by_email(email: str):
    return await database.fetch_one(
        """
        SELECT email, password, token, name, shop_name, role, line_user_id, create_at
        FROM users
        WHERE email = :email
        """,
        {"email": email},
    )


async def update_user_token(email: str, token: str):
    await database.execute(
        "UPDATE users SET token = :token WHERE email = :email",
        {"email": email, "token": token},
    )
