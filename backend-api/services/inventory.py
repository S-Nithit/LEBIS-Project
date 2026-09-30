"""ตัวเชื่อมระหว่างฐานข้อมูลกับ algorithms/ — จุดที่โค้ดวิชา Data ทำงานในเว็บจริง

ทำไมต้องมีไฟล์นี้
  ไฟล์ใน algorithms/ ห้าม import อะไรนอกจาก standard library (CLAUDE.md §6)
  เพราะไฟล์เดียวกันต้องเอาไปรันใน Colab ได้ มันจึงคุยกับฐานข้อมูลเองไม่ได้
  ไฟล์นี้เลยแปลงแถวจาก DB ให้เป็น dict หน้าตาเดียวกับ make_dataset()
  ใน algorithms/datasets.py แล้วส่งต่อให้ฟังก์ชันใน search.py

      DB row  ->  item_to_record() / borrow_to_record()  ->  algorithms/sort_group.py
                                                         ->  algorithms/search.py

  ห้ามย้ายการแปลงนี้เข้าไปใน algorithms/ เด็ดขาด ไม่งั้น Colab รันไม่ได้
"""

from datetime import datetime, timedelta, timezone

from algorithms import search, sort_group
from queries import inventory as inventory_query

# ต้องตรงกับ BANGKOK ใน routes/borrows.py
# ใช้ offset ตายตัวแทน ZoneInfo("Asia/Bangkok") เพราะ image ใน Docker
# ไม่มีฐานข้อมูลเขตเวลา · ไทยไม่มีเวลาออมแสง +7 จึงถูกตลอดทั้งปี
BANGKOK = timezone(timedelta(hours=7))


def today_in_bangkok() -> str:
    """วันนี้ตามเวลาไทย เป็นข้อความ YYYY-MM-DD แบบที่ algorithms/ ใช้เทียบ"""
    return datetime.now(BANGKOK).date().isoformat()


# ---------------------------------------------------------------------------
# แปลงแถวจาก DB เป็น dict 8 ฟิลด์ของวิชา Data
# code / name / category / total / available / borrower / due_date / status
# ---------------------------------------------------------------------------

def item_to_record(row) -> dict:
    """อุปกรณ์ 1 รายการ — ยังไม่ผูกกับใบเช่า จึงไม่มี borrower กับ due_date"""
    return {
        "code": row["code"],
        "name": row["name"],
        "category": row["category"],
        "total": row["total"],
        "available": row["available"],
        "borrower": None,
        "due_date": None,
        "status": row["status"],
    }


def borrow_to_record(row) -> dict:
    """ใบเช่าที่ยังไม่คืน 1 ใบ — ข้อมูลของ + คนเช่า + วันกำหนดคืน

    due_date ต้องเป็นข้อความ YYYY-MM-DD ไม่ใช่ date
    search.py เทียบวันด้วย < แบบข้อความ ถ้าส่ง date ไปเทียบกับข้อความ
    Python จะโยน TypeError ทันที

    borrow_id ไม่อยู่ใน 8 ฟิลด์ของวิชา Data แต่ต้องพกไปด้วย
    เพราะคนเรียกต้องรู้ว่าจะแจ้งเตือนใบเช่าใบไหน
    ฟังก์ชันใน algorithms/ อ่านเฉพาะคีย์ที่ตัวเองใช้ คีย์ที่เกินมาจึงไม่กระทบ
    """
    record = item_to_record(row)
    record["borrow_id"] = row["borrow_id"]
    record["borrower"] = row["borrower"]
    record["due_date"] = row["due_day"].isoformat()
    return record


async def open_borrows(owner_email: str) -> list:
    """ใบเช่าที่ยังไม่คืนของร้าน เรียงตามวันกำหนดคืนด้วย merge sort ของวิชา Data

    SQL ไม่ได้เรียงให้แล้ว — sort_by_due_date ของ Kul เป็นคนเรียง
    แล้วส่งต่อให้ find_due_before ของ Neo ซึ่งเป็น binary search ใช้ได้กับ list ที่เรียงแล้วเท่านั้น
    merge sort ของ Kul เป็น stable sort ใบที่ครบกำหนดวันเดียวกันจึงยังเรียงตาม id ที่ SQL ส่งมา
    """
    rows = await inventory_query.open_borrows(owner_email)
    return sort_group.sort_by_due_date([borrow_to_record(row) for row in rows])


# ---------------------------------------------------------------------------
# สิ่งที่ส่วนอื่นของระบบเรียกใช้ — ทุกตัวคำนวณด้วยฟังก์ชันของวิชา Data
# ---------------------------------------------------------------------------

async def shelf_summary(owner_email: str) -> dict:
    """ของบนชั้นกี่ชิ้น และกี่รายการในแต่ละสถานะ

    ตัวเลขต้องเท่ากับ available_units ที่ /api/items/summary นับด้วย SQL
    ทั้งสองฝั่งไม่นับของชำรุด (status = 'broken')
    """
    rows = await inventory_query.items_for_counting(owner_email)
    records = [item_to_record(row) for row in rows]
    return {
        "available_units": search.count_available(records),
        "by_status": search.count_by_status(records),
    }


async def count_overdue(owner_email: str, today: str | None = None) -> int:
    """กี่ใบที่เลยกำหนดคืนแล้ว

    today ใส่เองได้เพื่อให้ทดสอบได้ผลเดิมทุกครั้ง ไม่ใส่ = วันนี้ตามเวลาไทย
    ตรงกับ due_date < NOW() ของหน้าเว็บ เพราะ routes/borrows.py เก็บเส้นตาย
    เป็น 23:59:59 ของวันกำหนดคืน ของจึงเริ่มเลยกำหนดตอนขึ้นวันใหม่พอดี
    """
    records = await open_borrows(owner_email)
    return search.count_overdue(records, today or today_in_bangkok())


async def due_before(owner_email: str, limit_day: str) -> list:
    """ใบเช่าที่กำหนดคืน "ก่อน" วัน limit_day (ไม่รวมวันนั้น)

    ใช้ find_due_before ของวิชา Data ซึ่งเป็น binary search — O(log n + k)
    อยากได้ "ถึงพรุ่งนี้" ให้ส่งวันมะรืน เพราะเงื่อนไขคือก่อน ไม่ใช่ถึง
    """
    records = await open_borrows(owner_email)
    return search.find_due_before(records, limit_day)
