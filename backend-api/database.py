import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import bcrypt
from databases import Database

# ตัวแปรสำหรับตอนรันในเครื่อง (ค่าตรงกับ docker-compose.yaml)
POSTGRES_USER = os.getenv("POSTGRES_USER", "temp")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "temp")
POSTGRES_DB = os.getenv("POSTGRES_DB", "advcompro")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")

# ใส่บัญชีทดสอบให้อัตโนมัติตอนสตาร์ทหรือไม่
# ในเครื่อง = ใส่ (ค่าเริ่มต้น) · ตอน deploy จริง = ต้องตั้งเป็น false
TRUE_VALUES = ("1", "true", "yes", "on")
SEED_DEMO_ACCOUNTS = os.getenv("SEED_DEMO_ACCOUNTS", "true").strip().lower() in TRUE_VALUES


def normalize_database_url(url: str) -> str:
    """แปลง connection string ของผู้ให้บริการให้เป็นรูปที่ไลบรารีนี้ใช้ได้

    ผู้ให้บริการอย่าง Railway ให้ URL มาหน้าตาแบบนี้
        postgresql://user:password@host:5432/railway
    แต่ไลบรารี databases ต้องรู้ว่าจะคุยด้วย driver ตัวไหน เลยต้องเป็น
        postgresql+asyncpg://user:password@host:5432/railway

    อีกเรื่องคือพารามิเตอร์ sslmode ที่บางเจ้าติดมาท้าย URL — อันนั้นเป็นของ
    libpq (ไลบรารีฝั่ง C) ส่ง asyncpg ตรงๆ จะ error เลยต้องแปลงเป็น ssl=true
    """
    parts = urlsplit(url)

    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+asyncpg"

    query = dict(parse_qsl(parts.query))
    sslmode = query.pop("sslmode", None)
    if sslmode and sslmode not in ("disable", "allow", "prefer"):
        query["ssl"] = "true"

    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def build_database_url() -> str:
    """เลือกที่มาของค่าเชื่อมต่อฐานข้อมูล

    ลำดับความสำคัญ
      1. DATABASE_URL — ผู้ให้บริการบนคลาวด์ให้มาเป็นสตริงชุดเดียว
      2. POSTGRES_* แยกตัว — แบบที่ docker-compose.yaml ใช้ตอนรันในเครื่อง

    🔴 ห้าม print หรือ log ค่าที่ฟังก์ชันนี้คืน เพราะมีรหัสผ่านฐานข้อมูลอยู่ในนั้น
    """
    url_from_provider = os.getenv("DATABASE_URL", "").strip()

    if url_from_provider:
        return normalize_database_url(url_from_provider)

    return (
        f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
        f"@{POSTGRES_HOST}/{POSTGRES_DB}"
    )


DATABASE_URL = build_database_url()

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

    if SEED_DEMO_ACCOUNTS:
        await seed_demo_accounts()
        # เตือนดังๆ ในล็อก เผื่อลืมปิดตอน deploy จะได้เห็นตั้งแต่บรรทัดแรกที่สตาร์ท
        print(
            "[LEBIS] ⚠️  SEED_DEMO_ACCOUNTS เปิดอยู่ — ใส่บัญชีทดสอบที่รหัสผ่าน"
            " เปิดเผยในโค้ดแล้ว ตอน deploy จริงต้องตั้งเป็น false",
            flush=True,
        )
    else:
        print("[LEBIS] ข้ามการใส่บัญชีทดสอบ (SEED_DEMO_ACCOUNTS=false)", flush=True)


# 🔴 บัญชี seed สำหรับ "ทดสอบบนเครื่องตัวเอง" เท่านั้น ไม่ใช่บัญชีผู้ใช้จริง
#
#    ระบบสร้างให้เองตอนสตาร์ท เพื่อให้ทุกคนในทีมมีของเล่นเหมือนกันตั้งแต่วินาทีแรก
#    ที่ docker compose ขึ้น โดยไม่ต้องไปนั่ง INSERT เองใน psql
#    (Kul ใช้เทียบ free/pro ตอนทดสอบระบบล็อกฟีเจอร์ · Sea ใช้เปิดหน้า admin)
#
#    รหัสผ่านที่เขียนไว้ตรงนี้ไม่ใช่ความลับ ทุกคนที่ clone repo ก็เห็น —
#    และนั่นคือเหตุผลที่ตอน deploy ขึ้นใช้งานจริงต้องตั้ง SEED_DEMO_ACCOUNTS=false
#    ไม่งั้นระบบจะสร้างบัญชี admin ที่ทุกคนรู้รหัสไว้บนอินเทอร์เน็ต
#    เท่ากับเปิดประตูทิ้งไว้ให้ใครก็ได้
#
#    อีเมลต้องเป็นโดเมนปกติที่ EmailStr ยอมรับ ห้ามใช้ .local .test .localhost
#    ไม่งั้นบัญชีจะมีแถวอยู่ใน DB แต่ login ไม่ได้ (ได้ 422 ตั้งแต่ชั้นตรวจข้อมูล)
DEMO_ACCOUNTS = [
    # บัญชีที่ติดมากับ boilerplate — คงแพ็กเกจ pro ไว้เหมือนเดิม
    {
        "email": "demo@example.com",
        "password": "password",
        "name": "Demo User",
        "shop_name": "Demo Rental Shop",
        "role": "pro",
    },
    # บัญชีผู้ดูแลระบบ — Sea ใช้เปิดหน้า admin, Kul ใช้เทียบกับบัญชี free
    # ตอนทดสอบว่าระบบล็อกฟีเจอร์ตามแพ็กเกจจริงมั้ย
    {
        "email": "admin@lebis-demo.com",
        "password": "admin1234",
        "name": "LEBIS Admin",
        "shop_name": None,
        "role": "admin",
    },
]


async def seed_demo_accounts():
    """ใส่บัญชีทดสอบถ้ายังไม่มี — มีอยู่แล้วก็ข้ามไป ไม่ไปทับของเดิม

    ON CONFLICT DO NOTHING คือจุดสำคัญ: ถ้าใครเปลี่ยนรหัสหรือเปลี่ยน role
    ของบัญชีพวกนี้ไว้ การรีสตาร์ท backend จะไม่ไปรีเซ็ตทับของเขา
    """
    for account in DEMO_ACCOUNTS:
        hashed = bcrypt.hashpw(
            account["password"].encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        await database.execute(
            """
            INSERT INTO users (email, password, name, shop_name, role)
            VALUES (:email, :password, :name, :shop_name, :role)
            ON CONFLICT (email) DO NOTHING
            """,
            {
                "email": account["email"],
                "password": hashed,
                "name": account["name"],
                "shop_name": account["shop_name"],
                "role": account["role"],
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


async def create_user(
    email: str,
    hashed_password: str,
    name: str | None = None,
    shop_name: str | None = None,
    role: str = "free",
):
    """เพิ่มผู้ใช้ใหม่ 1 แถว แล้วคืนแถวนั้นกลับไป

    รับ hash มาแล้วเท่านั้น (ดู services/security.hash_password)
    ฟังก์ชันนี้ไม่เคยเห็นรหัสผ่านจริงของผู้ใช้
    """
    return await database.fetch_one(
        """
        INSERT INTO users (email, password, name, shop_name, role)
        VALUES (:email, :password, :name, :shop_name, :role)
        RETURNING email, name, shop_name, role, create_at
        """,
        {
            "email": email,
            "password": hashed_password,
            "name": name,
            "shop_name": shop_name,
            "role": role,
        },
    )
