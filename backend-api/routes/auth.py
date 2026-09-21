"""สมัครสมาชิก · เข้าสู่ระบบ · ดูข้อมูลตัวเอง

ไฟล์นี้เป็นตัวอย่างแพตเทิร์นของ route ทุกไฟล์ในโปรเจกต์ ก็อปโครงนี้ไปใช้ได้เลย
โครงมี 3 ส่วนเรียงตามนี้: (1) Pydantic model  (2) ฟังก์ชันช่วยเล็กๆ  (3) ตัว route

กฎ 2 ข้อที่ห้ามพลาด
- ทุก endpoint ต้องมี Pydantic model ทั้งขาเข้า (request) และขาออก (response)
- 🔴 ห้ามคืน row จาก DB ตรงๆ ให้หน้าเว็บ เพราะ row มีคอลัมน์ password ติดอยู่ด้วย
  ต้องแปลงเป็น response model ก่อนเสมอ (ดู to_user_response ข้างล่าง)
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from database import create_user, get_user_by_email, update_user_token
from services.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# 1) Pydantic model — หน้าตาของข้อมูลที่ส่งเข้ามาและที่ส่งกลับไป
#    FastAPI ใช้ model เหล่านี้ตรวจข้อมูลให้เอง ถ้าผิดรูปจะตอบ 422 ให้เลย
#    โดยที่โค้ดใน route ไม่ต้องเช็กซ้ำ
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    # bcrypt รับรหัสได้ไม่เกิน 72 ไบต์ เลยกั้นที่ตรงนี้ ไม่ให้หลุดไปพังข้างใน
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=1, max_length=120)
    shop_name: str | None = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    # ใช้ EmailStr เหมือนตอนสมัคร — การตรวจอีเมลสองที่ต้องเป็นกฎเดียวกัน
    # ข้อควรรู้: EmailStr ไม่รับโดเมนสงวนอย่าง .local .test .localhost
    # เพราะฉะนั้นบัญชีที่ seed ไว้เองก็ต้องใช้โดเมนปกติด้วย (ดู DEMO_ACCOUNTS
    # ใน database.py) ไม่งั้นจะสมัครไม่ได้ login ไม่ได้ ทั้งที่มีแถวอยู่ใน DB
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class TokenResponse(BaseModel):
    """ส่งกลับตอนสมัครเสร็จและตอน login สำเร็จ"""

    access_token: str
    token_type: str = "bearer"
    email: EmailStr
    role: str


class UserResponse(BaseModel):
    """ข้อมูล user ที่ปล่อยให้หน้าเว็บเห็นได้ — สังเกตว่าไม่มี password"""

    email: EmailStr
    name: str | None
    shop_name: str | None
    role: str
    create_at: datetime


# ---------------------------------------------------------------------------
# 2) ฟังก์ชันช่วย
# ---------------------------------------------------------------------------

def to_user_response(user) -> UserResponse:
    """แปลง row จาก DB ให้เป็น response model (คอลัมน์ password ถูกตัดทิ้งที่ขั้นนี้)"""
    return UserResponse(
        email=user["email"],
        name=user["name"],
        shop_name=user["shop_name"],
        role=user["role"],
        create_at=user["create_at"],
    )


# ---------------------------------------------------------------------------
# 3) Route — router ตัวนี้ถูกต่อ prefix "/api/auth" ไว้ใน app.py
#    ฉะนั้น @router.post("/register") = POST /api/auth/register
# ---------------------------------------------------------------------------

@router.post(
    "/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def register(payload: RegisterRequest):
    """สมัครสมาชิกใหม่ ได้แพ็กเกจ free แล้วคืน JWT ให้ใช้งานต่อทันที

    ทางเดินของข้อมูล:
        ฟอร์ม register.js -> apiFetch("/api/auth/register") -> ฟังก์ชันนี้
        -> hash_password() -> create_user() เขียนลงตาราง users
        -> create_access_token() -> JWT กลับไปถึงหน้าเว็บ
    """
    # เช็กก่อนว่าอีเมลนี้มีคนใช้แล้วหรือยัง
    existing = await get_user_by_email(payload.email)
    if existing is not None:
        # ส่ง code ไปด้วยเพื่อให้หน้าเว็บแปลเป็นภาษาที่ผู้ใช้เลือกได้
        # (message เป็นข้อความสำรองสำหรับคนที่เรียก API ตรงๆ เช่นใน /docs)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "email_taken", "message": "อีเมลนี้ถูกใช้สมัครไปแล้ว"},
        )

    # เก็บลง DB เป็น hash เท่านั้น ไม่เคยเก็บรหัสจริง
    user = await create_user(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        shop_name=payload.shop_name,
        role="free",
    )

    token = create_access_token(user["email"])

    return TokenResponse(access_token=token, email=user["email"], role=user["role"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    """เข้าสู่ระบบ คืน JWT

    อีเมลไม่มีในระบบ กับ รหัสผิด ตอบข้อความเดียวกันและเป็น 401 ทั้งคู่
    เพื่อไม่ให้คนเดาได้ว่าอีเมลไหนมีอยู่จริงในระบบ
    """
    user = await get_user_by_email(payload.email)

    if user is None or not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "invalid_credentials",
                "message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
            },
        )

    token = create_access_token(user["email"])

    # เก็บ token ใบล่าสุดไว้ในคอลัมน์ users.token ด้วย — คอลัมน์นี้ติดมากับ
    # boilerplate เก็บไว้เพื่อความเข้ากันได้ แต่ตัวที่ระบบเชื่อจริงคือ JWT
    await update_user_token(user["email"], token)

    return TokenResponse(access_token=token, email=user["email"], role=user["role"])


@router.get("/me", response_model=UserResponse)
async def me(user=Depends(get_current_user)):
    """คืนข้อมูลของคนที่ถือ token ใบนี้

    Depends(get_current_user) คือจุดที่เช็ก token ให้เรียบร้อยแล้ว
    ถ้าไม่ได้ส่ง token มา หรือ token ใช้ไม่ได้ จะไม่เข้าฟังก์ชันนี้เลย (ตอบ 401 ไปก่อน)
    """
    return to_user_response(user)
