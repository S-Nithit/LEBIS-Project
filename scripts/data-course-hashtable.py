#!/usr/bin/env python3
"""วัดผล hash table ของ Kim บนชุด A-D — ตัวเลขในรายงานส่วนของ Kim มาจากสคริปต์นี้

ทำไมสคริปต์นี้อยู่นอก algorithms/
    hash_table.py ห้าม import ไฟล์อื่นในโปรเจกต์ (ต้องก็อปไปรันใน Colab ได้)
    มันจึงรับ make_dataset เข้ามาเป็นพารามิเตอร์แทน การประกอบสองไฟล์เข้าด้วยกัน
    เกิดที่นี่ ไม่ใช่ import ที่แอบใส่กลับเข้าไปใน algorithms/

วิธีรัน (จากรากของ repo)
    python3 scripts/data-course-hashtable.py

ใน Colab ไม่ต้องใช้ไฟล์นี้ — วางเซลล์ datasets.py ก่อนเซลล์ hash_table.py
แล้วเรียก report_on_datasets(make_dataset) ได้ตรงๆ
"""

import sys
from pathlib import Path

ALGORITHMS = Path(__file__).resolve().parent.parent / "backend-api" / "algorithms"
sys.path.insert(0, str(ALGORITHMS))

import datasets  # noqa: E402
import hash_table  # noqa: E402


def check_inventory_on_datasets() -> None:
    """ยกชุด A-D ใส่คลังแล้วเช็กว่าดัชนีกับ list ตรงกันทุกตัว — ก่อนเชื่อตัวเลขเวลา"""
    for name in ("A", "B", "C", "D"):
        items = datasets.make_dataset(name)
        shop = hash_table.build_inventory(items)

        assert len(shop) == len(items), f"ชุด {name} ใส่ไม่ครบ"
        for item in items:
            assert shop.find(item["code"])["code"] == item["code"], f"ชุด {name} ค้น {item['code']} ไม่เจอ"

    print("ยกชุด A-D ใส่คลังได้ครบ ค้นเจอทุกรหัส")


if __name__ == "__main__":
    print("=" * 76)
    print("LEBIS — ผลวัด hash table (Kim) บนชุด A-D")
    print("=" * 76)
    check_inventory_on_datasets()
    hash_table.report_on_datasets(datasets.make_dataset)
