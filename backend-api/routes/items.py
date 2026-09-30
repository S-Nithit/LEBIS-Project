"""อุปกรณ์ในร้าน — เพิ่ม ดู แก้ ลบ และตัวเลขสรุปของหน้า Workspace

โครงไฟล์เหมือน routes/auth.py: (1) Pydantic model (2) ฟังก์ชันช่วย (3) ตัว route
SQL ทั้งหมดอยู่ที่ queries/items.py ไฟล์นี้ตัดสินแค่ว่า "ทำได้หรือไม่ได้"

router ตัวนี้ถูกต่อ prefix "/api/items" ใน app.py
ฉะนั้น @router.post("") = POST /api/items
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from database import database
from queries import items as items_query
from services.security import get_current_user

router = APIRouter()

# เพดานของแพ็กเกจฟรี — ตัวเลขเดียวกับที่เขียนไว้ในหน้า Pricing
# 🔴 การกั้นต้องอยู่ที่นี่ ไม่ใช่แค่ซ่อนปุ่มในหน้าเว็บ (ดู CLAUDE.md หัวข้อ 5)
FREE_ITEM_LIMIT = 50

# สถานะที่เจ้าของร้านตั้งเองได้ ส่วน 'out' ระบบตั้งให้เองตามจำนวนที่ว่าง
OWNER_SETTABLE_STATUS = ("ok", "broken")


# ---------------------------------------------------------------------------
# 1) Pydantic model
# ---------------------------------------------------------------------------

class ItemCreate(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=60)
    total: int = Field(ge=1, le=9999)
    daily_rate: float = Field(default=0, ge=0, le=999999)


class ItemUpdate(BaseModel):
    """ทุกช่องไม่บังคับ — ส่งมาเฉพาะช่องที่อยากแก้"""

    code: str | None = Field(default=None, min_length=1, max_length=32)
    name: str | None = Field(default=None, min_length=1, max_length=160)
    category: str | None = Field(default=None, min_length=1, max_length=60)
    total: int | None = Field(default=None, ge=1, le=9999)
    daily_rate: float | None = Field(default=None, ge=0, le=999999)
    status: str | None = None


class ItemResponse(BaseModel):
    id: int
    code: str
    name: str
    category: str
    total: int
    available: int
    status: str
    daily_rate: float
    create_at: datetime


class ItemListResponse(BaseModel):
    items: list[ItemResponse]
    total: int
    page: int
    size: int


class SummaryResponse(BaseModel):
    """ตัวเลขบนแถบสถานะ — นับเป็น "ชิ้น" ไม่ใช่ "รายการ" """

    item_rows: int
    total_units: int
    available_units: int
    borrowed_units: int
    overdue_borrows: int


# ---------------------------------------------------------------------------
# 2) ฟังก์ชันช่วย
# ---------------------------------------------------------------------------

def fail(status_code: int, code: str, message: str):
    """โยนข้อผิดพลาดในรูปที่หน้าเว็บแปลเป็นสองภาษาได้

    หน้าเว็บอ่านเฉพาะช่อง code แล้วไปหาคำแปลใน lib/i18n.js เอง
    ช่อง message มีไว้ให้คนอ่าน log และให้ /docs อ่านรู้เรื่องเท่านั้น
    เพิ่มรหัสใหม่ที่นี่แล้วอย่าลืมเติม error.<code> ทั้ง th และ en
    """
    raise HTTPException(status_code=status_code, detail={"code": code, "message": message})


def to_item_response(row) -> ItemResponse:
    """แปลง row จาก DB เป็น response model

    daily_rate เก็บเป็น NUMERIC ซึ่ง asyncpg คืนมาเป็น Decimal
    ไม่แปลงเป็น float ก่อนจะ serialize เป็น JSON ไม่ได้
    """
    return ItemResponse(
        id=row["id"],
        code=row["code"],
        name=row["name"],
        category=row["category"],
        total=row["total"],
        available=row["available"],
        status=row["status"],
        daily_rate=float(row["daily_rate"]),
        create_at=row["create_at"],
    )


async def get_own_item_or_404(item_id: int, owner_email: str):
    """หาอุปกรณ์ของร้านตัวเอง ไม่เจอก็จบที่ 404

    ของร้านอื่นตอบ 404 ไม่ใช่ 403 — ตอบ 403 เท่ากับบอกว่า id นี้มีอยู่จริง
    ซึ่งเป็นข้อมูลที่ร้านอื่นไม่ควรรู้
    """
    row = await items_query.get(item_id, owner_email)

    if row is None:
        fail(404, "item_not_found", "ไม่พบอุปกรณ์ชิ้นนี้ในร้านของคุณ")

    return row


# ---------------------------------------------------------------------------
# 3) route
#    ทางที่เป็นคำตายตัวอย่าง /summary ต้องประกาศก่อน /{item_id} เสมอ
#    ไม่งั้น FastAPI จะจับคำว่า summary เป็น item_id แล้วตอบ 422
# ---------------------------------------------------------------------------

@router.get("", response_model=ItemListResponse)
async def list_items(
    user=Depends(get_current_user),
    q: str | None = Query(default=None, max_length=60, description="ค้นหาจากชื่อหรือรหัส"),
    category: str | None = Query(default=None, max_length=60),
    item_status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
):
    """รายการอุปกรณ์ของร้าน ค้นหาและกรองได้ แบ่งหน้าเสมอ"""
    filters = {
        "keyword": q,
        "category": category,
        "status": item_status,
    }

    total = await items_query.count_search(user["email"], **filters)
    rows = await items_query.search(
        user["email"], **filters, limit=size, offset=(page - 1) * size
    )

    return ItemListResponse(
        items=[to_item_response(row) for row in rows],
        total=total,
        page=page,
        size=size,
    )


@router.get("/summary", response_model=SummaryResponse)
async def item_summary(user=Depends(get_current_user)):
    """ตัวเลขสามช่องบนหัวหน้า Workspace: ว่างกี่ชิ้น ถูกยืมกี่ชิ้น เลยกำหนดกี่ใบ

    สองตัวเลขนี้นับด้วยฟังก์ชันของวิชา Data ไม่ใช่ COUNT/SUM ของ SQL
        available_units  <- algorithms/search.py :: count_available()
        overdue_borrows  <- algorithms/search.py :: count_overdue()

    ทำไมถึงคุ้มที่จะไม่ให้ SQL นับ ทั้งที่ SQL นับได้และเร็วกว่า
    เพราะฟังก์ชันสองตัวนั้นคือชิ้นงานที่ถูกให้คะแนนในวิชา Data
    ถ้ามันอยู่แต่ใน Colab แล้วเว็บนับเองด้วย SQL อีกชุด เท่ากับเขียนตรรกะ
    เดียวกันสองรอบ แล้ววันหนึ่งสองรอบนั้นจะไม่ตรงกันโดยไม่มีใครรู้
    ตอนนี้เหลือที่เดียว ถ้าแก้นิยามว่า "ว่าง" หมายถึงอะไร ทั้งเว็บและรายงาน
    วิชา Data เปลี่ยนตามพร้อมกันเสมอ

    ตัวเลขที่ได้เท่าเดิมทุกตัว ทั้งสองทางไม่นับของที่ชำรุด (status = 'broken')
    และนับใบที่เลยกำหนดแบบเดียวกัน (ดู services/inventory.py)
    """
    # นำเข้าตรงนี้แทนหัวไฟล์ เพราะไฟล์ทั้งสองอ้างถึงกันไปมาไม่ได้
    from services import inventory

    row = await items_query.summary(user["email"])
    shelf = await inventory.shelf_summary(user["email"])
    overdue = await inventory.count_overdue(user["email"])

    total_units = int(row["total_units"])
    available_units = int(shelf["available_units"])

    return SummaryResponse(
        item_rows=int(row["item_rows"]),
        total_units=total_units,
        available_units=available_units,
        # ของที่ไม่ได้อยู่บนชั้น = ทั้งหมด ลบ ที่ว่างอยู่
        borrowed_units=total_units - available_units,
        overdue_borrows=overdue,
    )


@router.get("/categories", response_model=list[str])
async def list_categories(user=Depends(get_current_user)):
    """หมวดที่ร้านนี้เคยใช้ — หน้าเว็บเอาไปทำกล่องตัวเลือกให้กดกรอง"""
    return await items_query.list_categories(user["email"])


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int, user=Depends(get_current_user)):
    row = await get_own_item_or_404(item_id, user["email"])
    return to_item_response(row)


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(payload: ItemCreate, user=Depends(get_current_user)):
    """เพิ่มอุปกรณ์เข้าร้าน

    ทำในทรานแซกชันเดียวกันทั้งการนับเพดานและการเพิ่ม เพื่อไม่ให้ผู้ใช้แพ็กเกจฟรี
    ที่เปิดเว็บสองแท็บแล้วกดพร้อมกัน เพิ่มของทะลุ 50 ชิ้นไปได้
    """
    async with database.transaction():
        if user["role"] == "free":
            count = await items_query.count_by_owner(user["email"])

            if count >= FREE_ITEM_LIMIT:
                fail(
                    403,
                    "item_limit_reached",
                    f"แพ็กเกจฟรีเก็บอุปกรณ์ได้ {FREE_ITEM_LIMIT} รายการ",
                )

        if await items_query.code_exists(user["email"], payload.code):
            fail(409, "item_code_taken", f"รหัส {payload.code} ถูกใช้ไปแล้วในร้านนี้")

        row = await items_query.insert(
            owner_email=user["email"],
            code=payload.code,
            name=payload.name,
            category=payload.category,
            total=payload.total,
            daily_rate=payload.daily_rate,
        )

    return to_item_response(row)


@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(item_id: int, payload: ItemUpdate, user=Depends(get_current_user)):
    """แก้ข้อมูลอุปกรณ์

    จุดที่พลาดง่ายคือการลดจำนวนทั้งหมด ถ้าของ 5 ชิ้นถูกยืมอยู่ 3 แล้วแก้เหลือ 2
    จำนวนที่ว่างจะติดลบ ต้องกันไว้ตรงนี้
    """
    fields = payload.model_dump(exclude_unset=True, exclude_none=True)

    if not fields:
        fail(400, "no_changes", "ไม่มีข้อมูลที่จะแก้ไข")

    if "status" in fields and fields["status"] not in OWNER_SETTABLE_STATUS:
        fail(
            422,
            "status_not_allowed",
            "สถานะตั้งได้เฉพาะ ok หรือ broken ส่วน out ระบบตั้งให้เอง",
        )

    async with database.transaction():
        current = await items_query.get_for_update(item_id, user["email"])

        if current is None:
            fail(404, "item_not_found", "ไม่พบอุปกรณ์ชิ้นนี้ในร้านของคุณ")

        if "total" in fields:
            borrowed = current["total"] - current["available"]

            if fields["total"] < borrowed:
                fail(
                    409,
                    "item_total_below_borrowed",
                    f"ตอนนี้ถูกยืมอยู่ {borrowed} ชิ้น ลดจำนวนต่ำกว่านี้ไม่ได้",
                )

            # ที่ว่างใหม่ = จำนวนใหม่ หักของที่ยังอยู่กับลูกค้า
            fields["available"] = fields["total"] - borrowed

        if "code" in fields and await items_query.code_exists(
            user["email"], fields["code"], exclude_id=item_id
        ):
            fail(409, "item_code_taken", f"รหัส {fields['code']} ถูกใช้ไปแล้วในร้านนี้")

        await items_query.update(item_id, user["email"], fields)

        # แก้จำนวนหรือแก้สถานะแล้ว ต้องให้ ok/out ตรงกับของจริงเสมอ
        await items_query.sync_status(item_id)
        row = await items_query.get(item_id, user["email"])

    return to_item_response(row)


@router.delete("/{item_id}")
async def delete_item(item_id: int, user=Depends(get_current_user)):
    """ลบอุปกรณ์ — ลบได้เฉพาะชิ้นที่ยังไม่เคยถูกเช่าเลย

    มีสองด่าน เพราะเหตุผลคนละเรื่องกัน

    ด่านแรก ของยังอยู่กับลูกค้า — บอกให้รับคืนก่อน แก้ได้

    ด่านสอง เคยถูกเช่าแต่คืนครบแล้ว — ลบไม่ได้เหมือนกัน เพราะทุกแถวใน
    borrows ชี้กลับมาที่ items.id ถ้าลบอุปกรณ์ทิ้ง ประวัติการเช่าจะชี้ไปหา
    ของที่ไม่มีอยู่ ฐานข้อมูลกันไว้ด้วย foreign key อยู่แล้ว แต่ถ้าปล่อยให้
    ไปโดนด่านนั้น ผู้ใช้จะเจอ 500 แทนที่จะเจอคำอธิบาย เลยต้องดักที่นี่ก่อน

    ของที่เลิกใช้แล้วให้ทำเครื่องหมายว่าชำรุดแทน (PUT status = broken)
    """
    from queries import borrows as borrows_query

    async with database.transaction():
        await get_own_item_or_404(item_id, user["email"])

        active = await borrows_query.count_active_by_item(item_id)

        if active:
            fail(
                409,
                "item_has_active_borrows",
                f"ยังมีรายการเช่าค้างอยู่ {active} รายการ กรุณารับคืนให้ครบก่อน",
            )

        history = await borrows_query.count_all_by_item(item_id)

        if history:
            fail(
                409,
                "item_has_history",
                f"อุปกรณ์ชิ้นนี้มีประวัติการเช่า {history} ครั้ง ลบแล้วประวัติจะหาย",
            )

        await items_query.delete(item_id, user["email"])

    return {"id": item_id, "message": "ลบอุปกรณ์เรียบร้อยแล้ว"}
