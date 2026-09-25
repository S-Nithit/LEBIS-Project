"""รายการเช่า — เปิดใบยืม รับคืน และดูว่าใครถืออะไรอยู่

router ตัวนี้ถูกต่อ prefix "/api/borrows" ใน app.py
ฉะนั้น @router.post("") = POST /api/borrows

หัวใจของไฟล์นี้คือ "จำนวนที่ว่างต้องตรงกับความจริงเสมอ" เปิดใบยืมแล้วของว่าง
ต้องลดทันทีในทรานแซกชันเดียวกัน ถ้าเปิดใบยืมสำเร็จแต่ลดจำนวนไม่สำเร็จ
ร้านจะปล่อยเช่าของที่ไม่มีอยู่จริง
"""

from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from database import database
from queries import borrows as borrows_query
from queries import items as items_query
from services.security import get_current_user

router = APIRouter()

# ร้านทั้งหมดอยู่ไทย เลยตรึงเขตเวลาไว้ที่ +07:00
#
# เขียนเป็นตัวเลขตรงๆ ไม่ใช้ ZoneInfo("Asia/Bangkok") เพราะอิมเมจ python:3.10-slim
# ไม่มีฐานข้อมูลเขตเวลาติดมา เรียกแล้วจะพังตอนรันใน Docker ทั้งที่รันบนเครื่องผ่าน
BANGKOK = timezone(timedelta(hours=7))


# ---------------------------------------------------------------------------
# 1) Pydantic model
# ---------------------------------------------------------------------------

class BorrowCreate(BaseModel):
    item_id: int = Field(ge=1)
    customer_name: str = Field(min_length=1, max_length=120)
    customer_phone: str | None = Field(default=None, max_length=32)
    # หน้าเว็บส่งมาเป็น "2026-09-30" จากช่อง <input type="date">
    due_date: date


class BorrowResponse(BaseModel):
    id: int
    item_id: int
    item_code: str
    item_name: str
    customer_name: str
    customer_phone: str | None
    borrowed_at: datetime
    due_date: datetime
    returned_at: datetime | None
    status: str
    days: int
    estimated_price: float


# ---------------------------------------------------------------------------
# 2) ฟังก์ชันช่วย
# ---------------------------------------------------------------------------

def fail(status_code: int, code: str, message: str):
    """โยนข้อผิดพลาดในรูปที่หน้าเว็บแปลเป็นสองภาษาได้ (ดูคำอธิบายใน routes/items.py)"""
    raise HTTPException(status_code=status_code, detail={"code": code, "message": message})


def due_date_to_deadline(due: date) -> datetime:
    """แปลงวันที่ที่ผู้ใช้เลือก ให้เป็นเส้นตายสิ้นวันตามเวลาไทย

    เลือกวันที่ 30 ก.ย. = คืนภายในสิ้นวันนั้น ไม่ใช่ก่อนเที่ยงคืนที่เพิ่งผ่านมา
    ถ้าไม่ทำแบบนี้ ของที่กำหนดคืนวันนี้จะขึ้นว่าเลยกำหนดตั้งแต่เช้า
    """
    return datetime.combine(due, time(23, 59, 59), tzinfo=BANGKOK)


def today_in_bangkok() -> date:
    """วันนี้ตามเวลาไทย ไม่ใช่ตามเวลาของเครื่องเซิร์ฟเวอร์

    เซิร์ฟเวอร์ที่ deploy อยู่ตั้งเวลาเป็น UTC ถ้าใช้ date.today() ตรงๆ
    ช่วงหลังเที่ยงคืนถึงเจ็ดโมงเช้าบ้านเรา เซิร์ฟเวอร์จะยังคิดว่าเป็นเมื่อวาน
    """
    return datetime.now(BANGKOK).date()


def to_borrow_response(row) -> BorrowResponse:
    """แปลง row เป็น response พร้อมคำนวณจำนวนวันและค่าเช่าโดยประมาณ

    นับจากวันที่ยืมถึงวันที่คืนจริง ถ้ายังไม่คืนก็นับถึงวันนี้
    เศษวันคิดเป็นหนึ่งวันเต็ม และอย่างน้อยต้องคิดหนึ่งวันเสมอ

    ตัวเลขนี้เป็นตัวช่วยคิดเงินหน้าร้าน ไม่ใช่ใบเสร็จ — ร้านคิดส่วนลดหรือ
    ค่าปรับเพิ่มเองได้ ระบบไม่ได้บันทึกยอดที่เก็บจริง
    """
    borrowed_on = row["borrowed_at"].astimezone(BANGKOK).date()

    if row["returned_at"] is not None:
        end_on = row["returned_at"].astimezone(BANGKOK).date()
    else:
        end_on = today_in_bangkok()

    days = max(1, (end_on - borrowed_on).days)
    daily_rate = float(row["daily_rate"])

    return BorrowResponse(
        id=row["id"],
        item_id=row["item_id"],
        item_code=row["item_code"],
        item_name=row["item_name"],
        customer_name=row["customer_name"],
        customer_phone=row["customer_phone"],
        borrowed_at=row["borrowed_at"],
        due_date=row["due_date"],
        returned_at=row["returned_at"],
        status=row["status"],
        days=days,
        estimated_price=round(daily_rate * days, 2),
    )


# ---------------------------------------------------------------------------
# 3) route
# ---------------------------------------------------------------------------

@router.get("", response_model=list[BorrowResponse])
async def list_borrows(
    user=Depends(get_current_user),
    borrow_status: str | None = Query(
        default=None,
        alias="status",
        description="active | overdue | returned · ไม่ใส่ = ทั้งหมด",
    ),
):
    """รายการเช่าของร้าน ของที่ยังไม่คืนและใกล้ครบกำหนดจะอยู่บนสุด"""
    if borrow_status is not None and borrow_status not in borrows_query.STATUS_FILTERS:
        fail(422, "invalid_status", "สถานะที่กรองได้มีแค่ active, overdue และ returned")

    rows = await borrows_query.list_by_owner(user["email"], borrow_status)

    return [to_borrow_response(row) for row in rows]


@router.post("", response_model=BorrowResponse, status_code=status.HTTP_201_CREATED)
async def create_borrow(payload: BorrowCreate, user=Depends(get_current_user)):
    """เปิดรายการเช่าและตัดจำนวนของว่างทันที

    ลำดับสำคัญมาก: ล็อกแถวอุปกรณ์ด้วย FOR UPDATE ก่อน แล้วค่อยอ่านจำนวนที่ว่าง
    ถ้าอ่านก่อนล็อก สองคนที่กดเช่าของชิ้นสุดท้ายพร้อมกันจะเห็นเลข 1 ทั้งคู่
    แล้วลบคนละครั้งจนเหลือ -1 ซึ่งแปลว่าร้านปล่อยเช่าของที่ไม่มีอยู่
    """
    if payload.due_date < today_in_bangkok():
        fail(422, "due_date_past", "วันกำหนดคืนต้องไม่เป็นวันที่ผ่านมาแล้ว")

    async with database.transaction():
        item = await items_query.get_for_update(payload.item_id, user["email"])

        if item is None:
            fail(404, "item_not_found", "ไม่พบอุปกรณ์ชิ้นนี้ในร้านของคุณ")

        if item["status"] == "broken":
            fail(409, "item_broken", f"{item['name']} ถูกทำเครื่องหมายว่าชำรุดอยู่")

        if item["available"] <= 0:
            fail(409, "item_unavailable", f"{item['name']} ถูกยืมไปหมดแล้ว")

        await items_query.change_available(payload.item_id, -1)
        await items_query.sync_status(payload.item_id)

        row = await borrows_query.insert(
            item_id=payload.item_id,
            owner_email=user["email"],
            customer_name=payload.customer_name,
            customer_phone=payload.customer_phone,
            due_date=due_date_to_deadline(payload.due_date),
        )

    return to_borrow_response(row)


@router.put("/{borrow_id}/return", response_model=BorrowResponse)
async def return_borrow(borrow_id: int, user=Depends(get_current_user)):
    """รับคืนอุปกรณ์ — คืนซ้ำไม่ได้

    ถ้ากดปุ่มรับคืนซ้ำแล้วเพิ่มจำนวนว่างทุกครั้ง ของ 3 ชิ้นจะกลายเป็น 5 ชิ้น
    ในระบบทั้งที่บนชั้นมีแค่ 3 เลยต้องเช็กก่อนสองชั้น: เช็กที่นี่ชั้นหนึ่ง
    และใส่เงื่อนไข returned_at IS NULL ใน UPDATE อีกชั้นหนึ่ง
    """
    async with database.transaction():
        borrow = await borrows_query.get_for_update(borrow_id, user["email"])

        if borrow is None:
            fail(404, "borrow_not_found", "ไม่พบรายการเช่านี้ในร้านของคุณ")

        if borrow["returned_at"] is not None:
            fail(409, "borrow_already_returned", "รายการนี้รับคืนไปแล้ว")

        row = await borrows_query.mark_returned(borrow_id)

        if row is None:
            # มีคนกดรับคืนแทรกเข้ามาระหว่างนี้พอดี ถือว่าคืนไปแล้วเหมือนกัน
            fail(409, "borrow_already_returned", "รายการนี้รับคืนไปแล้ว")

        await items_query.change_available(borrow["item_id"], 1)
        await items_query.sync_status(borrow["item_id"])

    return to_borrow_response(row)
