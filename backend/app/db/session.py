"""
ตัวเชื่อมต่อฐานข้อมูล

ศัพท์ที่ควรรู้:
- engine  = ท่อที่ต่อไปหา PostgreSQL (สร้างครั้งเดียวตอนแอปสตาร์ท)
- Session = หนึ่งรอบการคุยกับฐานข้อมูล เปิดตอนเริ่ม request ปิดตอนจบ
- Base    = คลาสแม่ของทุกตารางในไฟล์ models.py
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    # เช็กว่า connection ยังไม่ตายก่อนหยิบมาใช้ กัน error ตอน db รีสตาร์ท
    pool_pre_ping=True,
    # echo=True จะพิมพ์ SQL ทุกคำสั่งลง log เปิดไว้ตอน dev จะดูง่าย
    echo=(settings.ENV == "development"),
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """คลาสแม่ของทุก model ตารางใหม่ทุกตารางต้องสืบทอดจากตัวนี้"""


def get_db() -> Generator[Session, None, None]:
    """
    ใช้กับ FastAPI แบบนี้:

        @router.get("/items")
        def list_items(db: Session = Depends(get_db)):
            ...

    yield = ส่ง session ให้ route ใช้ พอ route ทำงานเสร็จค่อยกลับมาปิดให้อัตโนมัติ
    ต่อให้ route โยน error ออกมา บรรทัด close() ใน finally ก็ยังทำงาน
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
