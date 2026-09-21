from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
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


# ถ้ามีข้อผิดพลาดที่เราไม่ได้ดักไว้ FastAPI จะตอบเป็นข้อความเปล่าๆ ไม่ใช่ JSON
# หน้าเว็บที่เรียก response.json() จะพังซ้ำอีกชั้นและผู้ใช้จะไม่เห็นอะไรเลย
# ตัวนี้ทำให้ทุกข้อผิดพลาดออกมาเป็น JSON รูปเดียวกันเสมอ
@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, error: Exception):
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
