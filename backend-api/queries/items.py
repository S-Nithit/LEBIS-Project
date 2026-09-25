"""SQL ของอุปกรณ์ในร้าน (ตาราง items)

ไฟล์นี้มีแต่คำสั่ง SQL ไม่มีการตัดสินใจทางธุรกิจและไม่มี HTTPException
กฎว่าใครทำอะไรได้บ้างอยู่ที่ routes/items.py — แยกกันแบบนี้เพราะ
ฟังก์ชันในนี้ถูกเรียกจากที่อื่นได้ด้วย (เช่นงานแจ้งเตือนที่ไม่มี request)

🔴 ทุกฟังก์ชันรับ owner_email แล้วใส่ใน WHERE เสมอ ขาดเมื่อไรคือช่องโหว่
   ร้านหนึ่งจะเห็นหรือแก้ของอีกร้านได้ทันที
"""

from database import database

# คอลัมน์ที่ส่งออกไปให้หน้าเว็บ เขียนไว้ที่เดียวกันลืมแก้ไม่ครบ
# (ชื่อคอลัมน์เวลาสร้างคือ create_at ไม่ใช่ created_at — ตามของ boilerplate)
COLUMNS = (
    "id, owner_email, code, name, category, total, available, "
    "status, daily_rate, create_at"
)


# ---------------------------------------------------------------------------
# อ่าน
# ---------------------------------------------------------------------------

async def count_by_owner(owner_email: str) -> int:
    """นับว่าร้านนี้มีอุปกรณ์กี่รายการ — ใช้เช็กเพดาน 50 ชิ้นของแพ็กเกจฟรี"""
    return await database.fetch_val(
        "SELECT COUNT(*) FROM items WHERE owner_email = :owner_email",
        {"owner_email": owner_email},
    )


def _build_filters(owner_email, keyword, category, status):
    """ประกอบท่อน WHERE จากตัวกรองที่ผู้ใช้เลือก

    สังเกตว่าค่าที่ผู้ใช้กรอกไม่เคยถูกต่อเป็นสตริง SQL — ต่อแค่ชื่อคอลัมน์
    ที่เราเขียนเองในไฟล์นี้ ส่วนค่าจริงส่งผ่าน named parameter ทั้งหมด
    """
    conditions = ["owner_email = :owner_email"]
    values = {"owner_email": owner_email}

    if keyword:
        # ILIKE = ไม่แยกตัวพิมพ์เล็กใหญ่ · %...% = พิมพ์แค่บางส่วนก็เจอ
        conditions.append("(name ILIKE :keyword OR code ILIKE :keyword)")
        values["keyword"] = f"%{keyword}%"

    if category:
        conditions.append("category = :category")
        values["category"] = category

    if status:
        conditions.append("status = :status")
        values["status"] = status

    return " AND ".join(conditions), values


async def search(owner_email, keyword=None, category=None, status=None, limit=20, offset=0):
    """รายการอุปกรณ์หนึ่งหน้า เรียงของใหม่ขึ้นก่อน"""
    where, values = _build_filters(owner_email, keyword, category, status)

    return await database.fetch_all(
        f"""
        SELECT {COLUMNS} FROM items
        WHERE {where}
        ORDER BY create_at DESC, id DESC
        LIMIT :limit OFFSET :offset
        """,
        {**values, "limit": limit, "offset": offset},
    )


async def count_search(owner_email, keyword=None, category=None, status=None) -> int:
    """จำนวนทั้งหมดที่ตรงเงื่อนไข — ใช้คำนวณจำนวนหน้าให้ตารางหน้าเว็บ"""
    where, values = _build_filters(owner_email, keyword, category, status)

    return await database.fetch_val(
        f"SELECT COUNT(*) FROM items WHERE {where}", values
    )


async def get(item_id: int, owner_email: str):
    return await database.fetch_one(
        f"SELECT {COLUMNS} FROM items WHERE id = :id AND owner_email = :owner_email",
        {"id": item_id, "owner_email": owner_email},
    )


async def get_for_update(item_id: int, owner_email: str):
    """อ่านแถวพร้อม "จอง" ไว้จนจบทรานแซกชัน (FOR UPDATE)

    ต้องเรียกตัวนี้ก่อนแก้ available เสมอ ถ้าสองคนกดเช่าของชิ้นสุดท้าย
    พร้อมกัน คนที่สองจะถูกให้รอตรงบรรทัดนี้จนคนแรกจบ แล้วค่อยอ่านค่าใหม่
    ไม่ใช่อ่านค่าเก่าค้างไว้แล้วลบซ้ำจนติดลบ

    🔴 ใช้ได้เฉพาะข้างใน async with database.transaction() เท่านั้น
    """
    return await database.fetch_one(
        f"""
        SELECT {COLUMNS} FROM items
        WHERE id = :id AND owner_email = :owner_email
        FOR UPDATE
        """,
        {"id": item_id, "owner_email": owner_email},
    )


async def list_categories(owner_email: str):
    """หมวดทั้งหมดที่ร้านนี้เคยใช้ — เอาไปเติมในกล่องตัวเลือกบนหน้าเว็บ"""
    rows = await database.fetch_all(
        """
        SELECT DISTINCT category FROM items
        WHERE owner_email = :owner_email
        ORDER BY category
        """,
        {"owner_email": owner_email},
    )

    return [row["category"] for row in rows]


async def summary(owner_email: str):
    """ตัวเลขสำหรับแถบสถานะบนสุดของหน้า Workspace

    นับ "ชิ้น" ไม่ใช่ "รายการ" เพราะอุปกรณ์หนึ่งรายการมีได้หลายชิ้น
    ของที่ปลดระวางแล้ว (status = 'broken') ไม่ถูกนับว่าเป็นของบนชั้น
    """
    return await database.fetch_one(
        """
        SELECT
            COUNT(*)                                          AS item_rows,
            COALESCE(SUM(total), 0)                           AS total_units,
            COALESCE(SUM(available) FILTER (WHERE status <> 'broken'), 0)
                                                              AS available_units
        FROM items
        WHERE owner_email = :owner_email
        """,
        {"owner_email": owner_email},
    )


async def code_exists(owner_email: str, code: str, exclude_id: int = -1) -> bool:
    """รหัสนี้ถูกใช้ในร้านนี้แล้วหรือยัง

    exclude_id มีไว้ตอนแก้ไข — ไม่งั้นของชิ้นเดิมจะฟ้องว่ารหัสตัวเองซ้ำกับตัวเอง
    ค่าเริ่มต้นเป็น -1 เพราะ id ของจริงเริ่มที่ 1 เสมอ จึงไม่ไปชนของใคร

    ที่ไม่เขียนเป็น :exclude_id IS NULL เพราะไลบรารีที่อยู่ใต้ databases
    มองว่า :ชื่อ ที่ตามด้วยเครื่องหมาย : (อย่าง ::int ที่ต้องใส่กำกับชนิด)
    ไม่ใช่พารามิเตอร์ แล้วจะไม่ส่งค่าเข้าไปให้เลย
    """
    found = await database.fetch_val(
        """
        SELECT 1 FROM items
        WHERE owner_email = :owner_email
          AND code = :code
          AND id <> :exclude_id
        """,
        {"owner_email": owner_email, "code": code, "exclude_id": exclude_id},
    )

    return found is not None


# ---------------------------------------------------------------------------
# เขียน
# ---------------------------------------------------------------------------

async def insert(owner_email, code, name, category, total, daily_rate):
    """เพิ่มอุปกรณ์ใหม่ — ของใหม่ยังไม่มีใครยืม available จึงเท่ากับ total"""
    return await database.fetch_one(
        f"""
        INSERT INTO items
            (owner_email, code, name, category, total, available, daily_rate)
        VALUES
            (:owner_email, :code, :name, :category, :total, :total, :daily_rate)
        RETURNING {COLUMNS}
        """,
        {
            "owner_email": owner_email,
            "code": code,
            "name": name,
            "category": category,
            "total": total,
            "daily_rate": daily_rate,
        },
    )


async def update(item_id: int, owner_email: str, fields: dict):
    """แก้เฉพาะคอลัมน์ที่ส่งมาใน fields

    ชื่อคอลัมน์ใน fields มาจาก Pydantic model ฝั่ง route เท่านั้น
    ไม่ได้มาจากสิ่งที่ผู้ใช้พิมพ์ จึงเอามาต่อเป็นชื่อคอลัมน์ได้อย่างปลอดภัย
    """
    assignments = ", ".join(f"{column} = :{column}" for column in fields)

    return await database.fetch_one(
        f"""
        UPDATE items SET {assignments}
        WHERE id = :id AND owner_email = :owner_email
        RETURNING {COLUMNS}
        """,
        {**fields, "id": item_id, "owner_email": owner_email},
    )


async def delete(item_id: int, owner_email: str):
    return await database.fetch_one(
        """
        DELETE FROM items
        WHERE id = :id AND owner_email = :owner_email
        RETURNING id
        """,
        {"id": item_id, "owner_email": owner_email},
    )


async def change_available(item_id: int, delta: int):
    """บวกหรือลบจำนวนที่ว่าง แล้วคืนค่าที่ว่างใหม่

    เขียนเป็น available = available + :delta ไม่ใช่อ่านมาบวกในไพทอนแล้วเขียนทับ
    เพราะฐานข้อมูลเป็นคนบวกให้ ค่าจึงไม่หายแม้มีคนแก้แถวเดียวกันแทรกเข้ามา
    ส่วน CHECK ท้ายคำสั่งไม่มี — กฎ 0 <= available <= total ถูกกันด้วยการ
    เช็กก่อนเรียก (ดู routes/borrows.py)
    """
    return await database.fetch_val(
        """
        UPDATE items SET available = available + :delta
        WHERE id = :id
        RETURNING available
        """,
        {"id": item_id, "delta": delta},
    )


async def sync_status(item_id: int):
    """ปรับ status ให้ตรงกับจำนวนที่ว่างจริง

    ความหมายของแต่ละค่า
        ok     = ให้เช่าได้ ยังมีของบนชั้น
        out    = ถูกยืมไปหมดแล้ว (ระบบตั้งให้เอง)
        broken = ชำรุด เจ้าของร้านตั้งเอง และให้เช่าไม่ได้จนกว่าจะแก้กลับ

    broken ต้องไม่ถูกทับ เพราะของชำรุดที่บังเอิญมีชิ้นว่างก็ยังห้ามปล่อยเช่า
    """
    return await database.execute(
        """
        UPDATE items
        SET status = CASE
            WHEN status = 'broken' THEN 'broken'
            WHEN available <= 0    THEN 'out'
            ELSE 'ok'
        END
        WHERE id = :id
        """,
        {"id": item_id},
    )
