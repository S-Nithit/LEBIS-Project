"""
จุดเริ่มต้นของ backend ทั้งหมด

รันแล้วเปิดดูได้ที่:
    http://localhost:8000/health   เช็กว่าเซิร์ฟเวอร์ยังไหว
    http://localhost:8000/docs     หน้าเทส API อัตโนมัติ (ใช้แทน Postman ได้เลย)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

# ต้อง import models ไว้ตรงนี้ ถึงแม้จะดูเหมือนไม่ได้เรียกใช้
# เพราะ create_all() รู้จักเฉพาะตารางที่ถูก import เข้ามาแล้วเท่านั้น
# ถ้าลบบรรทัดนี้ ฐานข้อมูลจะว่างเปล่า ไม่มีตารางสักตัว
from app.db import models  # noqa: F401
from app.db.session import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- ส่วนนี้ทำงานตอนแอปเริ่ม ----
    # create_all สร้างตารางที่ยังไม่มีให้ครบ ตารางที่มีอยู่แล้วจะไม่ถูกแตะ
    # หมายเหตุ: มันไม่ทำ migration ให้ ถ้าแก้คอลัมน์ในตารางที่มีอยู่แล้ว
    # ต้อง docker compose down -v เพื่อล้างฐานข้อมูลแล้วขึ้นใหม่
    Base.metadata.create_all(bind=engine)
    yield
    # ---- ส่วนนี้ทำงานตอนแอปปิด (ตอนนี้ยังไม่มีอะไรต้องเก็บกวาด) ----


app = FastAPI(
    title="LEBIS API",
    description="ระบบยืม-คืนและจัดการสต็อกอุปกรณ์ให้เช่า",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS = อนุญาตให้เว็บที่รันคนละพอร์ต (frontend ที่ :3000) ยิง API มาที่ :8000 ได้
# ถ้าไม่ใส่ เบราว์เซอร์จะบล็อกเอง ทั้งที่ backend ทำงานปกติ
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    """ใช้เช็กว่าเซิร์ฟเวอร์ขึ้นแล้ว docker healthcheck กับ Railway ก็ยิงมาที่นี่"""
    return {"status": "ok"}


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"service": "LEBIS API", "docs": "/docs"}


# ---------------------------------------------------------------------------
# ที่สำหรับลงทะเบียน router (Phase 2 เป็นต้นไป)
# เพิ่มแบบนี้:
#     from app.routers import auth
#     app.include_router(auth.router, prefix="/auth", tags=["auth"])
# ---------------------------------------------------------------------------
