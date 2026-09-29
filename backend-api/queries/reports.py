"""SQL ของรายงานประวัติการเช่า — อ่านอย่างเดียว

🔴 ทุกคำสั่งมี owner_email ใน WHERE เหมือนทุกไฟล์ใน queries/ ร้านหนึ่งเห็นแค่ของตัวเอง
"""

from datetime import date

from database import database
from queries.borrows import STATUS_SQL


async def rentals(owner_email: str, since: date | None):
    """ใบเช่าทุกใบที่เริ่มเช่าตั้งแต่วัน since (ตามเวลาไทย) ใหม่สุดขึ้นก่อน · since=None = ทั้งหมด

    days = จำนวนวันที่คิดเงิน นับจากวันเริ่มเช่าถึงวันคืน (ยังไม่คืน = ถึงวันนี้)
           เช่าแล้วคืนวันเดียวกันนับ 1 วัน · เช่าวันนี้คืนพรุ่งนี้ก็ 1 วัน
    amount = daily_rate × days — เป็นรายได้โดยประมาณ ระบบยังไม่ได้บันทึกเงินที่เก็บจริง
    ตัดวันตามเวลาไทย ไม่ใช่ UTC ไม่งั้นเช่าตอนตีหนึ่งจะถูกนับเป็นเมื่อวาน
    """
    return await database.fetch_all(
        f"""
        SELECT
            b.id, i.code, i.name, i.category,
            b.customer_name, b.customer_phone,
            b.borrowed_at, b.due_date, b.returned_at,
            {STATUS_SQL} AS status,
            i.daily_rate,
            GREATEST(1,
                (COALESCE(b.returned_at, NOW()) AT TIME ZONE 'Asia/Bangkok')::date
              - (b.borrowed_at AT TIME ZONE 'Asia/Bangkok')::date
            ) AS days
        FROM borrows b
        JOIN items i ON i.id = b.item_id
        WHERE b.owner_email = :owner_email
          AND (CAST(:since AS date) IS NULL
               OR (b.borrowed_at AT TIME ZONE 'Asia/Bangkok')::date >= CAST(:since AS date))
        ORDER BY b.borrowed_at DESC, b.id DESC
        """,
        {"owner_email": owner_email, "since": since},
    )
