"""SQL ของแดชบอร์ดผู้ดูแลระบบ — อ่านข้อมูลรวมทุกร้าน ไม่กรองด้วย owner_email

ต่างจากไฟล์อื่นใน queries/ ตรงที่ไม่มี owner_email ใน WHERE เลย เพราะหน้านี้
ตั้งใจให้เห็นข้อมูลของทุกร้านในระบบ สิทธิ์เข้าถึงถูกกันที่ require_role("admin")
ใน routes/admin.py ไม่ใช่กันที่ชั้นนี้
"""

from database import database

# จำนวนเดือนที่ย้อนดูในกราฟทั้งสองอัน — รวมเดือนนี้ด้วย
MONTHS_BACK = 6


async def overview_counts():
    """จำนวนร้าน Free และ Pro ในระบบ — ไม่นับบัญชี admin เพราะไม่ใช่ "ร้าน" """
    return await database.fetch_one(
        """
        SELECT
            COUNT(*) FILTER (WHERE role = 'free') AS free_count,
            COUNT(*) FILTER (WHERE role = 'pro')  AS pro_count
        FROM users
        WHERE role IN ('free', 'pro')
        """
    )


async def active_subscriptions_count() -> int:
    """จำนวนใบสมัคร Pro ที่ยัง active และยังไม่หมดอายุ ณ ตอนนี้

    ใช้ตัวนี้คำนวณ MRR แทนการนับจาก users.role ตรงๆ เพราะ role ถูกแก้มือใน
    ฐานข้อมูลได้ตอนทดสอบ (เช่นตอนดีบั๊ก) โดยไม่ผ่าน subscriptions เลย
    """
    count = await database.fetch_val(
        """
        SELECT COUNT(*) FROM subscriptions
        WHERE status = 'active' AND expires_at > NOW()
        """
    )
    return count or 0


async def revenue_this_month() -> float:
    """เงินที่เก็บได้จริงเดือนนี้ (ตามเวลาไทย) — คนละตัวกับ MRR

    MRR คือรายได้ที่คาดว่าจะได้ต่อเนื่อง ตัวนี้คือเงินที่ "เข้าจริง" ในเดือนปฏิทิน
    นี้ ถ้ามีคนสมัครหรือยกเลิกกลางเดือน สองตัวนี้จะไม่เท่ากัน
    """
    total = await database.fetch_val(
        """
        SELECT COALESCE(SUM(amount), 0) FROM transactions
        WHERE status = 'paid'
          AND date_trunc('month', paid_at AT TIME ZONE 'Asia/Bangkok')
            = date_trunc('month', NOW() AT TIME ZONE 'Asia/Bangkok')
        """
    )
    return float(total or 0)


async def total_rentals() -> int:
    """จำนวนใบเช่าทั้งหมดในระบบ ทุกร้านรวมกัน ทุกสถานะ"""
    count = await database.fetch_val("SELECT COUNT(*) FROM borrows")
    return count or 0


async def items_out() -> int:
    """จำนวนชิ้นที่ยังอยู่กับลูกค้า (ยังไม่คืน) ทุกร้านรวมกัน

    นับจากใบเช่าที่ยังไม่คืน เพราะเป็นแหล่งข้อมูลตรงที่สุด (ควรตรงกับ
    SUM(items.total - items.available) อยู่แล้ว แต่ borrows ชัดเจนกว่า)
    """
    count = await database.fetch_val(
        "SELECT COUNT(*) FROM borrows WHERE returned_at IS NULL"
    )
    return count or 0


async def revenue_by_month():
    """รายได้ (เฉพาะ paid) แยกตามเดือน ย้อนหลัง 6 เดือนรวมเดือนนี้ เรียงเก่า→ใหม่

    เติมเดือนที่ไม่มีรายการเป็น 0 ด้วย generate_series ไม่งั้นเดือนที่ไม่มีคน
    จ่ายเงินเลยจะหายไปจากกราฟ แทนที่จะเห็นเป็นจุดที่ค่า 0
    """
    return await database.fetch_all(
        f"""
        WITH months AS (
            SELECT date_trunc('month', NOW() AT TIME ZONE 'Asia/Bangkok')
                   - (n || ' months')::interval AS month
            FROM generate_series({MONTHS_BACK - 1}, 0, -1) AS n
        )
        SELECT
            to_char(months.month, 'YYYY-MM') AS month,
            COALESCE(SUM(t.amount), 0) AS amount
        FROM months
        LEFT JOIN transactions t
            ON t.status = 'paid'
           AND date_trunc('month', t.paid_at AT TIME ZONE 'Asia/Bangkok') = months.month
        GROUP BY months.month
        ORDER BY months.month
        """
    )


async def signups_by_month():
    """คนสมัครใหม่แยก Free/Pro ตามเดือนที่สร้างบัญชี ย้อนหลัง 6 เดือน

    🔴 role ที่นับคือ role "ตอนนี้" ไม่ใช่ role ตอนสมัคร เพราะตาราง users ไม่ได้
    เก็บประวัติการเปลี่ยนแพ็กเกจ คนที่สมัครฟรีแล้วอัปเกรดทีหลัง จะถูกนับเป็น Pro
    ของเดือนที่เขาสมัคร ไม่ใช่เดือนที่เขาอัปเกรด — ยอมรับความคลาดเคลื่อนนี้ไว้ก่อน
    เพราะสคีมาไม่มีข้อมูลพอจะทำให้แม่นกว่านี้ (เขียนข้อจำกัดนี้ลง Design Doc ด้วย)
    """
    return await database.fetch_all(
        f"""
        WITH months AS (
            SELECT date_trunc('month', NOW() AT TIME ZONE 'Asia/Bangkok')
                   - (n || ' months')::interval AS month
            FROM generate_series({MONTHS_BACK - 1}, 0, -1) AS n
        )
        SELECT
            to_char(months.month, 'YYYY-MM') AS month,
            COUNT(*) FILTER (WHERE u.role = 'free') AS free,
            COUNT(*) FILTER (WHERE u.role = 'pro')  AS pro
        FROM months
        LEFT JOIN users u
            ON date_trunc('month', u.create_at AT TIME ZONE 'Asia/Bangkok') = months.month
           AND u.role IN ('free', 'pro')
        GROUP BY months.month
        ORDER BY months.month
        """
    )