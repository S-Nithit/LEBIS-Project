#!/usr/bin/env python3
"""วัดผลชุด A-D ของวิชา Data — ตัวเลขทุกตัวที่ใส่ในรายงานต้องมาจากสคริปต์นี้

ทำไมสคริปต์นี้ถึงอยู่นอกโฟลเดอร์ algorithms/
    ไฟล์ใน algorithms/ ห้าม import ไฟล์อื่นในโปรเจกต์ (ดู docs/data-course/plan.md)
    เพราะแต่ละไฟล์ต้องก็อปไปวางใน Colab แล้วกดรันได้ทันที
    แต่การวัดผลต้องใช้ทั้งสามไฟล์พร้อมกัน — จึงต้องมีตัวประกอบอยู่ข้างนอก
    ตัวประกอบนั้นคือไฟล์นี้ ไม่ใช่ import ที่แอบใส่กลับเข้าไปใน algorithms/

ใช้แก้อะไร
    hash_table.py ของ Kim มี TODO ค้างไว้ว่า "รอ datasets.py ของ Neo เสร็จก่อน"
    เพราะตัวเลขในไฟล์นั้นวัดบน make_sample_items() ของตัวเอง ไม่ใช่ชุด A-D
    ตัวเลขของสามหัวข้อจึงอ่านเทียบกันไม่ได้ สคริปต์นี้ปิดช่องนั้น:
    ทุกคนวัดบนชุดเดียวกันจาก make_dataset()

วิธีรัน (จากรากของ repo)
    python3 scripts/data-course-benchmark.py

ใน Colab ไม่ต้องใช้ไฟล์นี้ — วางเซลล์ตามลำดับแล้วเรียกฟังก์ชันได้ตรงๆ
    เซลล์ 1  datasets.py
    เซลล์ 2  hash_table.py
    เซลล์ 3  search.py
    เซลล์ 4  sort_group.py
"""

import sys
from pathlib import Path

# ชี้ไปที่โฟลเดอร์ algorithms/ เพื่อ import ทั้งสามไฟล์เข้ามาประกอบกัน
# การ import อยู่ "ที่นี่" ไม่ใช่ในไฟล์อัลกอริทึม จึงไม่ผิดกฎ stdlib ของไฟล์พวกนั้น
ALGORITHMS = Path(__file__).resolve().parent.parent / "backend-api" / "algorithms"
sys.path.insert(0, str(ALGORITHMS))

import datasets  # noqa: E402
import hash_table  # noqa: E402
import search  # noqa: E402


def check_datasets() -> None:
    """หน้าตาของแต่ละชุด — ต้องพิมพ์ลงรายงานเพื่อบอกว่าวัดบนอะไร"""
    print()
    print("ชุดข้อมูลที่ใช้วัด")
    print("=" * 78)
    print(f"วันอ้างอิง (TODAY) = {datasets.TODAY.isoformat()}")
    print("-" * 78)
    print(
        f"{'ชุด':>5} {'จำนวน':>9} {'ชื่อซ้ำ':>9} {'ของหมด':>9}"
        f" {'เลยกำหนด':>10} {'ชำรุด':>8}"
    )
    print("-" * 78)

    for name in ("A", "B", "C", "D"):
        items = datasets.make_dataset(name)
        info = datasets.describe(items)
        print(
            f"{name:>5} {info['จำนวน']:>9,} {info['ชื่อที่ซ้ำกัน']:>9}"
            f" {info['available = 0']:>9} {info['เลยกำหนดคืน']:>10} {info['ชำรุด']:>8}"
        )

    print("-" * 78)


def benchmark_search_all() -> None:
    """ตารางที่ 1 ของรายงาน Neo — เทียบสามวิธีค้นหาบนชุด A ถึง D"""
    rows = []

    for name in ("A", "B", "C", "D"):
        items = datasets.make_dataset(name)
        table = hash_table.build_hash_table(items)
        result = search.benchmark_search(items, table=table)
        rows.append((name, len(items), result["linear"], result["binary"], result["hash"]))

    search.print_table(
        "ตารางที่ 1 — เวลาค้นครบทุก code หนึ่งรอบ (เฉลี่ย 3 รอบ) บนชุด A-D",
        rows,
    )

    # ตัวเลขสองบรรทัดนี้คือประโยคหลักของหัวข้อ Neo ในรายงาน
    small = rows[0]
    large = rows[3]
    print()
    print("สิ่งที่ตารางนี้พิสูจน์")
    print("-" * 78)
    print(
        f"    ชุด A มี {small[1]} รายการ linear เร็วกว่าหรือพอๆ กับ binary"
        f" ({small[2]:.3f} vs {small[3]:.3f} ms)"
    )
    print("    เพราะข้อมูลน้อยเกินกว่าที่การตัดครึ่งจะคุ้มค่าใช้จ่ายของการคำนวณตำแหน่ง")
    print()
    print(
        f"    ชุด D มี {large[1]:,} รายการ binary เร็วกว่า linear"
        f" {large[2] / large[3]:.1f} เท่า ({large[2]:.3f} vs {large[3]:.3f} ms)"
    )
    print(f"    และ hash เร็วกว่า linear {large[2] / large[4]:.1f} เท่า ({large[4]:.3f} ms)")
    print()
    print("    ข้อมูลโตขึ้น 100 เท่าจาก A ไป D แต่ทั้งสามวิธีโตไม่เท่ากัน")
    print("    ซึ่งคือความต่างระหว่าง O(n) · O(log n) · O(1) ที่วัดออกมาเป็นตัวเลขได้จริง")


def benchmark_counts() -> None:
    """ตารางที่ 2 — ผลการนับบนแต่ละชุด ใช้ตรวจว่าชุดข้อมูลทำหน้าที่ของมันจริง"""
    print()
    print("ตารางที่ 2 — ผลการนับบนชุด A-D")
    print("-" * 78)
    print(f"{'ชุด':>5} {'ว่างบนชั้น':>12} {'ok':>6} {'out':>6} {'broken':>8} {'เลยกำหนด':>10}")
    print("-" * 78)

    today = datasets.TODAY.isoformat()

    for name in ("A", "B", "C", "D"):
        items = datasets.make_dataset(name)
        counts = search.count_by_status(items)
        print(
            f"{name:>5} {search.count_available(items):>12,}"
            f" {counts['ok']:>6} {counts['out']:>6} {counts['broken']:>8}"
            f" {search.count_overdue(items, today):>10}"
        )

    print("-" * 78)


def check_duplicate_names() -> None:
    """ชุด B มีไว้พิสูจน์ข้อนี้ข้อเดียว — ชื่อซ้ำแล้วยังแยกออกว่าเป็นตัวไหน"""
    items = datasets.make_dataset("B")

    # หยิบชื่อแรกที่ซ้ำ
    seen = {}
    duplicate_name = None
    for item in items:
        if item["name"] in seen:
            duplicate_name = item["name"]
            break
        seen[item["name"]] = True

    found = search.search_by_name(items, duplicate_name)

    print()
    print("ชุด B — ค้นด้วยชื่อที่ซ้ำกัน")
    print("-" * 78)
    print(f'    ค้นคำว่า "{duplicate_name}" ได้ {len(found)} รายการ')
    for item in found:
        print(f"        {item['code']}  ว่าง {item['available']}/{item['total']}  {item['status']}")
    print()
    print("    ถ้า search_by_name คืนตัวแรกที่เจอแบบ linear_search ผู้ใช้จะได้ของผิดชิ้น")
    print("    แปลว่าปล่อยเช่าผิดชิ้น และอีกชิ้นจะหายไปจากระบบเงียบๆ")

    # จำนวนที่ได้มากกว่าคู่ที่ตั้งใจให้ซ้ำ เพราะค้นแบบ "มีคำนี้อยู่ข้างใน"
    # คำว่า "รุ่นที่ 1" เป็นส่วนหนึ่งของ "รุ่นที่ 11" และ "รุ่นที่ 12" ด้วย
    # พฤติกรรมนี้ถูกแล้วสำหรับช่องค้นหาในหน้าเว็บ ผู้ใช้พิมพ์ไม่ครบก็ยังเจอ
    # แต่ต้องรู้ตัวว่ามันกว้างกว่าการเทียบชื่อแบบตรงเป๊ะ — เขียนข้อนี้ลงรายงานด้วย
    exact = [item for item in items if item["name"] == duplicate_name]
    print()
    print(f"    ในจำนวนนี้ ชื่อตรงกันเป๊ะจริงๆ มี {len(exact)} รายการ")
    print('    ที่เกินมาคือชื่อที่มีคำนี้อยู่ข้างใน เช่น "รุ่นที่ 11" ก็มีคำว่า "รุ่นที่ 1" อยู่')
    print("    ค้นแบบนี้ถูกสำหรับช่องค้นหาในหน้าเว็บ เพราะผู้ใช้พิมพ์ไม่ครบก็ยังเจอ")

    # และแต่ละตัวยังหาเจอด้วย code ของตัวเองอยู่ ไม่ได้ปนกัน
    sorted_items = search.sort_by_code(items)
    for item in found:
        assert search.binary_search(sorted_items, item["code"]) == item
    print()
    print(f"    ตรวจแล้ว: ทั้ง {len(found)} ตัวยังค้นเจอด้วย code ของตัวเอง ไม่ได้ปนกัน")


def check_range_query() -> None:
    """คำถามแบบเป็นช่วง — เหตุผลว่าทำไมยังต้องมี binary search ทั้งที่ hash เร็วกว่า"""
    items = datasets.make_dataset("D")
    today = datasets.TODAY.isoformat()

    with_due = sorted(
        [item for item in items if item["due_date"] is not None],
        key=lambda item: item["due_date"],
    )

    overdue = search.find_due_before(with_due, today)
    counted = search.count_overdue(items, today)

    print()
    print("ชุด D — คำถามที่ตารางแฮชตอบไม่ได้")
    print("-" * 78)
    print(f'    "มีของอะไรบ้างที่ครบกำหนดคืนก่อน {today}"')
    print(f"    หาแบบช่วงด้วย binary search ได้ {len(overdue)} รายการ")
    print(f"    นับทีละตัวแบบ O(n) ได้ {counted} รายการ  ->  ตรงกัน")
    assert len(overdue) == counted

    print()
    print("    ตารางแฮชคำนวณตำแหน่งจาก key ที่ตรงเป๊ะเท่านั้น")
    print("    คำถามแบบ 'ก่อนวันที่ X' จึงต้องไล่ดูทั้งตาราง กลายเป็น O(n)")
    print("    ส่วน list ที่เรียงแล้ว + binary search หาขอบของช่วงได้ใน O(log n)")


def main() -> None:
    print("=" * 78)
    print("LEBIS — ผลวัดวิชา Data Structures & Algorithms")
    print("=" * 78)

    datasets.verify()
    search.verify()

    check_datasets()
    benchmark_search_all()
    benchmark_counts()
    check_duplicate_names()
    check_range_query()

    print()
    print("=" * 78)
    print("เสร็จ — ตัวเลขข้างบนคือตัวเลขที่ใส่ในรายงานได้")
    print("=" * 78)


if __name__ == "__main__":
    main()
