"""ความปลอดภัยของระบบ: รหัสผ่าน + JWT + การเช็กสิทธิ์

ไฟล์นี้เป็น "ตัวอย่างแพตเทิร์น" ของโปรเจกต์ — route อื่นๆ ทุกไฟล์
เอา dependency ในนี้ไปใช้ ไม่ต้องเขียนเช็กสิทธิ์เองในตัว route

ทางเดินของข้อมูลตอน login:
    ฟอร์มหน้าเว็บ -> routes/auth.py -> verify_password() เทียบกับ hash ใน DB
                  -> create_access_token() -> ส่ง JWT กลับไปให้หน้าเว็บ

ทางเดินของข้อมูลตอนเรียก endpoint ที่ต้อง login:
    หน้าเว็บส่ง header "Authorization: Bearer <JWT>"
                  -> get_current_user() -> decode_access_token()
                  -> get_user_by_email() -> ได้ row ของ user คนนั้น
"""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import get_user_by_email

# กุญแจที่ใช้เซ็น JWT — มาจาก environment variable เท่านั้น ไม่มีค่า default
# ใครถือกุญแจนี้ปลอม token เป็นใครก็ได้ในระบบ เลยห้ามเขียนค่าจริงลงไฟล์ใดๆ ใน repo
# บนเครื่องตัวเองค่านี้มาจากไฟล์ .env (ดู README) ตอน deploy ตั้งที่ Railway/Render
JWT_SECRET = os.getenv("JWT_SECRET", "")

if not JWT_SECRET:
    # ตั้งใจให้ backend ไม่ขึ้นเลยถ้าไม่มีกุญแจ ดีกว่าขึ้นมาแล้วใช้กุญแจที่ใครก็เดาได้
    raise RuntimeError(
        "ยังไม่ได้ตั้งค่า JWT_SECRET — สร้างไฟล์ .env ที่รากโปรเจกต์ด้วยคำสั่ง\n"
        '    printf \'JWT_SECRET=%s\\n\' "$(openssl rand -hex 32)" > .env\n'
        "แล้วสั่ง docker compose up --build ใหม่อีกครั้ง (ดูหัวข้อวิธีติดตั้งใน README)"
    )
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# ลำดับของแพ็กเกจ ใช้เทียบว่าสิทธิ์ "ถึง" ที่ต้องการหรือยัง
# admin ถือว่าสูงกว่า pro เลยเข้าถึงของ pro ได้ด้วย
TIER_ORDER = {"free": 0, "pro": 1, "admin": 2}

# บอก FastAPI ว่า endpoint ที่ต้อง login อ่าน token จาก header Authorization
# auto_error=False เพื่อให้เราเขียนข้อความ error เองได้
bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# รหัสผ่าน
# ---------------------------------------------------------------------------

def hash_password(plain_password: str) -> str:
    """เปลี่ยนรหัสผ่านที่ผู้ใช้พิมพ์ ให้เป็น hash ที่เก็บลง DB ได้

    เก็บลง DB เป็น hash เท่านั้น ห้ามเก็บรหัสจริง และห้าม log รหัสจริง
    """
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """เทียบรหัสที่ผู้ใช้พิมพ์ กับ hash ที่เก็บไว้ใน DB

    bcrypt ถอด hash กลับไม่ได้ วิธีเทียบคือเอารหัสที่พิมพ์มา hash ใหม่
    ด้วย salt เดิม (ซึ่งฝังอยู่ใน hash แล้ว) แล้วดูว่าได้ค่าเดียวกันมั้ย
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(email: str) -> str:
    """สร้าง JWT ให้ user คนนี้ อายุ 24 ชั่วโมง

    JWT คือข้อความที่เซ็นด้วย JWT_SECRET — ใครแก้ข้างในแล้วลายเซ็นจะไม่ตรง
    ข้างในเก็บแค่ email (ช่อง sub) กับเวลาหมดอายุ (ช่อง exp)
    ห้ามใส่รหัสผ่านหรือของที่เป็นความลับลงไป เพราะใครก็อ่านข้างในได้
    """
    expire_at = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": email, "exp": expire_at}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """แกะ JWT กลับเป็น dict ถ้าลายเซ็นไม่ตรงหรือหมดอายุแล้วจะโยน 401

    PyJWT เช็ก exp ให้เองตอน decode เราแค่ดักข้อผิดพลาดมาเขียนข้อความให้อ่านรู้เรื่อง
    """
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "token_expired", "message": "Token หมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "token_invalid", "message": "Token ไม่ถูกต้อง"},
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# Dependency สำหรับใส่ใน route
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    """คืน row ของ user ที่ถือ token ใบนี้

    ใช้แบบนี้ใน route:
        @router.get("/me")
        async def me(user = Depends(get_current_user)):
            ...
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "not_signed_in", "message": "ต้องเข้าสู่ระบบก่อน"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    email = payload.get("sub")

    user = await get_user_by_email(email) if email else None
    if user is None:
        # token ถูกต้องแต่หา user ไม่เจอ (เช่นถูกลบไปแล้ว)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "user_not_found", "message": "ไม่พบผู้ใช้ของ token นี้"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(*roles: str):
    """ให้เข้าได้เฉพาะ role ที่ระบุ ไม่ถึงก็ 403

    ใช้แบบนี้:  Depends(require_role("admin"))
    """

    async def dependency(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "role_required",
                    "message": f"ต้องเป็น {' หรือ '.join(roles)} จึงเข้าถึงส่วนนี้ได้",
                    "required": list(roles),
                },
            )
        return user

    return dependency


def require_tier(tier: str):
    """ให้เข้าได้เฉพาะคนที่แพ็กเกจถึงระดับที่ระบุ ไม่ถึงก็ 403

    ใช้แบบนี้:  Depends(require_tier("pro"))
    admin ถือว่าถึงระดับ pro อยู่แล้ว (ดู TIER_ORDER ด้านบน)

    🔴 การจำกัดสิทธิ์ต้องทำที่นี่เท่านั้น การซ่อนปุ่มในหน้าเว็บไม่นับว่ากันแล้ว
    """

    async def dependency(user=Depends(get_current_user)):
        if TIER_ORDER.get(user["role"], -1) < TIER_ORDER[tier]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "tier_required",
                    "message": f"ฟีเจอร์นี้ใช้ได้เฉพาะแพ็กเกจ {tier}",
                    "required": tier,
                },
            )
        return user

    return dependency
