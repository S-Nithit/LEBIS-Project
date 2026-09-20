"""ตัวอย่างสั้นๆ ของ endpoint ที่กันสิทธิ์ — ไว้ให้ดูเป็นแบบ

ประเด็นเดียวที่อยากให้เห็น: การกันสิทธิ์อยู่ใน dependencies ของ decorator
ไม่ได้อยู่ในตัวฟังก์ชัน ฉะนั้นอ่านหัว route ก็รู้ทันทีว่าใครเข้าได้
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from services.security import require_role

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    message: str


@router.get("", response_model=HealthResponse)
async def health():
    """เปิดให้ทุกคนเรียก ใช้เช็กว่า backend ยังหายใจอยู่"""
    return HealthResponse(status="ok", message="backend ทำงานปกติ")


@router.get(
    "/protected",
    response_model=HealthResponse,
    dependencies=[Depends(require_role("admin"))],
)
async def protected_health():
    """เข้าได้เฉพาะ admin

    - ไม่ส่ง token มา          -> 401
    - token ของ user ธรรมดา    -> 403
    - token ของ admin          -> 200
    """
    return HealthResponse(status="ok", message="คุณเป็น admin จึงเห็นข้อความนี้")
