from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import connect_db, disconnect_db, setup_db
from routes.auth import router as auth_router
from routes.borrows import router as borrows_router
from routes.health import router as health_router
from routes.items import router as items_router


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
app.include_router(items_router, prefix="/api/items", tags=["items"])
app.include_router(borrows_router, prefix="/api/borrows", tags=["borrows"])


@app.get("/")
async def root():
    return {"message": "LEBIS API"}
