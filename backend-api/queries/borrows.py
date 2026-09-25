"""SQL ของรายการเช่า (ตาราง borrows)

ใบยืม 1 แถว = อุปกรณ์ 1 ชิ้นที่ลูกค้าถือไป ถ้าลูกค้าเช่ากล้องตัวเดียวกัน
3 ตัวก็เป็น 3 แถว เพราะแต่ละตัวคืนคนละวันได้

🔴 ทุกฟังก์ชันกรองด้วย owner_email เสมอ (ดูเหตุผลใน queries/items.py)
"""

from database import database

# สถานะคำนวณสดทุกครั้งที่อ่าน ไม่ได้เชื่อคอลัมน์ status ในตาราง
#
# เหตุผล: ของจะ "เลยกำหนด" เองเมื่อเวลาผ่านไป ไม่มีใครมากดเปลี่ยน ถ้าเก็บเป็น
# ค่าถาวรแล้วงานตั้งเวลาไม่ทำงานสักวัน หน้าเว็บจะโชว์ว่ายังไม่เลยกำหนดทั้งที่เลยแล้ว
# คอลัมน์ status ในตารางเก็บไว้เป็นร่องรอยตอนรับคืนเท่านั้น
STATUS_SQL = """
    CASE
        WHEN b.returned_at IS NOT NULL THEN 'returned'
        WHEN b.due_date < NOW()        THEN 'overdue'
        ELSE 'active'
    END
"""

COLUMNS = f"""
    b.id, b.item_id, i.code AS item_code, i.name AS item_name,
    b.customer_name, b.customer_phone, b.borrowed_at, b.due_date,
    b.returned_at, {STATUS_SQL} AS status, i.daily_rate
"""

# แปลงชื่อสถานะที่หน้าเว็บส่งมา เป็นเงื่อนไข WHERE
# เขียนเป็นตารางตายตัวแบบนี้ เพราะค่าจากผู้ใช้จะได้ไม่มีทางกลายเป็น SQL
STATUS_FILTERS = {
    "active": "b.returned_at IS NULL AND b.due_date >= NOW()",
    "overdue": "b.returned_at IS NULL AND b.due_date < NOW()",
    "returned": "b.returned_at IS NOT NULL",
}


# ---------------------------------------------------------------------------
# อ่าน
# ---------------------------------------------------------------------------

async def list_by_owner(owner_email: str, status: str | None = None, limit: int = 100):
    """รายการเช่าของร้าน เรียงของที่ยังไม่คืนขึ้นก่อน แล้วไล่ตามวันครบกำหนด

    เจ้าของร้านเปิดหน้านี้เพื่อดูว่า "วันนี้ต้องทวงใคร" ของที่ใกล้ครบกำหนด
    จึงต้องอยู่บนสุด ไม่ใช่เรียงตามวันที่บันทึก
    """
    conditions = ["b.owner_email = :owner_email"]
    values = {"owner_email": owner_email, "limit": limit}

    if status in STATUS_FILTERS:
        conditions.append(STATUS_FILTERS[status])

    where = " AND ".join(conditions)

    return await database.fetch_all(
        f"""
        SELECT {COLUMNS}
        FROM borrows b
        JOIN items i ON i.id = b.item_id
        WHERE {where}
        ORDER BY (b.returned_at IS NOT NULL), b.due_date ASC, b.id DESC
        LIMIT :limit
        """,
        values,
    )


async def get(borrow_id: int, owner_email: str):
    return await database.fetch_one(
        f"""
        SELECT {COLUMNS}
        FROM borrows b
        JOIN items i ON i.id = b.item_id
        WHERE b.id = :id AND b.owner_email = :owner_email
        """,
        {"id": borrow_id, "owner_email": owner_email},
    )


async def get_for_update(borrow_id: int, owner_email: str):
    """อ่านใบยืมพร้อมจองแถวไว้ — กันกดปุ่มรับคืนรัวๆ แล้วคืนซ้ำสองรอบ

    FOR UPDATE OF b บอกว่าจองเฉพาะแถวของ borrows ไม่ต้องไปจองแถว items
    ที่ join มาด้วย เพราะแถว items จะถูกจองแยกอีกทีตอนแก้ available

    🔴 ใช้ได้เฉพาะข้างใน async with database.transaction() เท่านั้น
    """
    return await database.fetch_one(
        """
        SELECT b.id, b.item_id, b.returned_at
        FROM borrows b
        WHERE b.id = :id AND b.owner_email = :owner_email
        FOR UPDATE OF b
        """,
        {"id": borrow_id, "owner_email": owner_email},
    )


async def count_active_by_item(item_id: int) -> int:
    """ใบยืมของอุปกรณ์ชิ้นนี้ที่ยังไม่ได้คืน — ใช้กันลบของที่ยังอยู่กับลูกค้า"""
    return await database.fetch_val(
        """
        SELECT COUNT(*) FROM borrows
        WHERE item_id = :item_id AND returned_at IS NULL
        """,
        {"item_id": item_id},
    )


async def count_all_by_item(item_id: int) -> int:
    """ใบยืมของอุปกรณ์ชิ้นนี้ทั้งหมด รวมที่คืนไปแล้ว

    ใช้กันลบอุปกรณ์ที่เคยถูกเช่า เพราะ borrows.item_id ชี้มาที่ items.id
    ฐานข้อมูลจึงไม่ยอมให้ลบแถวที่ยังมีคนอ้างถึง ถ้าไม่เช็กตรงนี้ก่อน
    คำสั่ง DELETE จะพังเป็น 500 แทนที่จะบอกเหตุผลให้ผู้ใช้เข้าใจ
    """
    return await database.fetch_val(
        "SELECT COUNT(*) FROM borrows WHERE item_id = :item_id",
        {"item_id": item_id},
    )


async def count_overdue_by_owner(owner_email: str) -> int:
    """จำนวนใบที่เลยกำหนดคืนแล้ว — ตัวเลขช่องที่สามของแถบสถานะ"""
    return await database.fetch_val(
        """
        SELECT COUNT(*) FROM borrows
        WHERE owner_email = :owner_email
          AND returned_at IS NULL
          AND due_date < NOW()
        """,
        {"owner_email": owner_email},
    )


# ---------------------------------------------------------------------------
# เขียน
# ---------------------------------------------------------------------------

async def insert(item_id, owner_email, customer_name, customer_phone, due_date):
    """เปิดใบยืมใหม่แล้วคืนแถวที่พร้อมส่งให้หน้าเว็บ (join ชื่ออุปกรณ์มาด้วย)

    เขียน INSERT ไว้ใน WITH แล้ว SELECT ต่อในคำสั่งเดียว เพื่อไม่ต้องยิง
    query สองรอบ และได้ชื่อกับรหัสอุปกรณ์กลับไปพร้อมกันเลย
    """
    return await database.fetch_one(
        f"""
        WITH inserted AS (
            INSERT INTO borrows
                (item_id, owner_email, customer_name, customer_phone, due_date)
            VALUES
                (:item_id, :owner_email, :customer_name, :customer_phone, :due_date)
            RETURNING *
        )
        SELECT {COLUMNS}
        FROM inserted b
        JOIN items i ON i.id = b.item_id
        """,
        {
            "item_id": item_id,
            "owner_email": owner_email,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "due_date": due_date,
        },
    )


async def mark_returned(borrow_id: int):
    """บันทึกว่าคืนแล้ว ณ เวลานี้

    เงื่อนไข returned_at IS NULL ท้ายคำสั่งคือด่านสุดท้ายกันคืนซ้ำ ถ้ามีใคร
    แทรกเข้ามาคืนก่อนได้จริงๆ คำสั่งนี้จะไม่อัปเดตแถวไหนเลยและคืน None กลับไป
    """
    return await database.fetch_one(
        f"""
        WITH updated AS (
            UPDATE borrows
            SET returned_at = NOW(), status = 'returned'
            WHERE id = :id AND returned_at IS NULL
            RETURNING *
        )
        SELECT {COLUMNS}
        FROM updated b
        JOIN items i ON i.id = b.item_id
        """,
        {"id": borrow_id},
    )
