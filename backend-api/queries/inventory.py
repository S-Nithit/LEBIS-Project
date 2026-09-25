"""SQL สำหรับ services/inventory.py — อ่านอย่างเดียว

ดึงข้อมูลออกมาให้ services/inventory.py แปลงเป็น dict แล้วส่งต่อให้ algorithms/
ไฟล์นี้ไม่มีการเขียนหรือแก้ข้อมูลเลย

🔴 ทุกฟังก์ชันรับ owner_email แล้วใส่ใน WHERE เสมอ เหมือน queries/items.py
   ขาดเมื่อไรคือร้านหนึ่งเห็นของอีกร้าน
"""

from database import database


async def items_for_counting(owner_email: str):
    """อุปกรณ์ทุกรายการของร้าน — วัตถุดิบของ count_available / count_by_status"""
    return await database.fetch_all(
        """
        SELECT code, name, category, total, available, status
        FROM items
        WHERE owner_email = :owner_email
        """,
        {"owner_email": owner_email},
    )


async def open_borrows_by_due(owner_email: str):
    """ใบเช่าที่ยังไม่คืน เรียงตามวันกำหนดคืน ใกล้สุดขึ้นก่อน

    due_day คือ "วันที่" ตามเวลาไทย ไม่ใช่เวลาเต็ม
    DB อยู่เขต UTC แต่ร้านนับวันตามเวลาไทย จึงต้องแปลงก่อนตัดเป็นวันที่
    ไม่งั้นช่วงเที่ยงคืนถึงเจ็ดโมงเช้า วันที่จะคลาดไปหนึ่งวัน

    🔴 ORDER BY ต้องเรียงด้วย due_day ตัวเดียวกับที่ algorithms/ ใช้เทียบ
       find_due_before เป็น binary search ใช้ได้กับ list ที่เรียงแล้วเท่านั้น
       ถ้าเรียงผิดหรือลบบรรทัดนี้ มันจะไม่ error แต่ตอบผิดแบบเงียบๆ
    """
    return await database.fetch_all(
        """
        SELECT
            b.id                                          AS borrow_id,
            i.code, i.name, i.category, i.total, i.available, i.status,
            b.customer_name                               AS borrower,
            (b.due_date AT TIME ZONE 'Asia/Bangkok')::date AS due_day
        FROM borrows b
        JOIN items i ON i.id = b.item_id
        WHERE b.owner_email = :owner_email
          AND b.returned_at IS NULL
        ORDER BY due_day, b.id
        """,
        {"owner_email": owner_email},
    )
