from contextlib import asynccontextmanager

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from database import connect_db, disconnect_db, setup_db
from routes.auth import router as auth_router
from routes.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await setup_db()
    yield
    await disconnect_db()


app = FastAPI(title="LEBIS API", lifespan=lifespan)

# ทุก router ต่อ prefix "/api" เพราะ Next.js rewrite เฉพาะ /api/* มาที่นี่
# เพิ่ม router ใหม่ให้เติมต่อท้ายบรรทัดพวกนี้ (เช่น items, borrows, billing)
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(health_router, prefix="/api/health", tags=["health"])


logger = logging.getLogger("lebis")


# ---------------------------------------------------------------------------
# ทุกข้อผิดพลาดต้องออกมาเป็น JSON รูปเดียวกัน: {"detail": {"code", "message"}}
# หน้าเว็บอ่าน code ไปแปลเป็นภาษาที่ผู้ใช้เลือก (ดู lib/api.js)
# ---------------------------------------------------------------------------

# Pydantic ตรวจข้อมูลไม่ผ่าน จะตอบ detail เป็น "list" ตามรูปแบบของ FastAPI
# ซึ่งหน้าเว็บอ่าน code ไม่ได้ ได้แต่บอกรวมๆ ว่า "ข้อมูลไม่ถูกต้อง" โดยไม่รู้ว่าช่องไหน
#
# ตัวนี้แปลง list ให้เป็นรูปเดียวกับข้อผิดพลาดอื่น โดยหยิบข้อความที่ validator
# โยนมา (เช่น password_too_long) มาเป็น code และบอกด้วยว่าผิดที่ช่องไหน
@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, error: RequestValidationError):
    first = error.errors()[0] if error.errors() else {}

    # ชื่อช่องที่ผิด เช่น ("body", "password") -> "password"
    location = [str(part) for part in first.get("loc", []) if part != "body"]
    field = location[-1] if location else None

    # ข้อความจาก validator ของเราเองมาในรูป "Value error, password_too_long"
    raw = str(first.get("msg", ""))
    code = raw.split("Value error, ")[-1].strip() if "Value error, " in raw else "invalid_input"

    return JSONResponse(
        status_code=422,
        content={
            "detail": {
                "code": code,
                "field": field,
                "message": raw or "ข้อมูลที่กรอกไม่ถูกต้อง",
            }
        },
    )


# ข้อผิดพลาดที่เราไม่ได้ดักไว้ ถ้าปล่อยไว้ FastAPI จะตอบเป็นข้อความเปล่าๆ ไม่ใช่ JSON
# หน้าเว็บที่เรียก response.json() จะพังซ้ำอีกชั้นและผู้ใช้จะไม่เห็นอะไรเลย
@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, error: Exception):
    # บันทึกไว้ในล็อกด้วย ไม่งั้นตัวดักนี้จะกลืนบั๊กทุกตัวจนหาไม่เจอ
    logger.exception("unhandled error at %s %s", request.method, request.url.path)

    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "code": "server",
                "message": "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง",
            }
        },
    )


@app.get("/")
async def root():
    return {"message": "LEBIS API"}
