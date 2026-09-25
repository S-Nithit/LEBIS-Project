#!/usr/bin/env python3
"""สร้าง notebook วิชา Data จากไฟล์ใน algorithms/ — ห้ามก็อปโค้ดไปวางเอง

ทำไมต้องสร้างจากสคริปต์
    โค้ดวิชา Data มีที่เดียวคือ backend-api/algorithms/ (CLAUDE.md §1)
    ถ้าก็อปไปวางใน notebook ด้วยมือ พอแก้ไฟล์ในรีโป notebook ก็ตกรุ่นทันที
    แล้วตัวเลขในรายงานจะไม่ตรงกับโค้ดที่อาจารย์เปิดดู
    สคริปต์นี้อ่านไฟล์จริงทุกครั้ง แก้โค้ดแล้วรันใหม่ notebook ก็ตามทัน

ทำไมทุกไฟล์อยู่ในเซลล์ %%writefile แล้วค่อย import
    ถ้าวางโค้ดหลายไฟล์ลงในเซลล์ติดกัน ทุกไฟล์จะใช้ชื่อตัวแปรชุดเดียวกัน
    hash_table.py กับ search.py มีฟังก์ชันชื่อซ้ำกัน 5 ตัว หน้าตาไม่เหมือนกัน
    (measure / print_table / lookup_order / make_sample_items / ROUNDS)
    ไฟล์ที่วางทีหลังจะทับไฟล์แรกเงียบๆ แล้วฟังก์ชันของไฟล์แรกจะไปเรียก
    ของไฟล์หลังตอนรัน — ผลคือพังหรือพิมพ์ตัวเลขผิดโดยไม่มีใครรู้
    %%writefile เขียนเซลล์ลงเป็นไฟล์ แล้ว import ทีละไฟล์ แต่ละไฟล์จึงมีชื่อ
    เป็นของตัวเอง เหมือนในรีโปทุกอย่าง และโค้ดในเซลล์ก็ตรงกับไฟล์ทุกตัวอักษร

วิธีรัน (จากรากของ repo)
    python3 scripts/build-notebooks.py

    ได้ docs/data-course/LEBIS_Kim_HashTable.ipynb
    LEBIS_Final.ipynb จะถูกสร้างเมื่อมี algorithms/sort_group.py ของ Kul แล้ว

    ถ้าเครื่องมี nbclient + ipykernel สคริปต์จะรันทุกเซลล์ให้ผลติดมาในไฟล์ด้วย
    ถ้าไม่มี ได้ไฟล์ที่ยังไม่รัน — อัปขึ้น Colab แล้วกด Runtime > Run all
"""

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALGORITHMS = ROOT / "backend-api" / "algorithms"
SCRIPTS = ROOT / "scripts"
OUTPUT = ROOT / "docs" / "data-course"


# ---------------------------------------------------------------------------
# ตัวช่วยสร้างเซลล์
# ---------------------------------------------------------------------------

def _lines(text: str) -> list:
    """notebook เก็บข้อความเป็น list ของบรรทัด (บรรทัดท้ายไม่มี \\n)"""
    return text.splitlines(keepends=True)


def markdown(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": _lines(text.strip())}


def code(text: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": _lines(text.strip("\n")),
    }


def file_cell(path: Path, save_as: str) -> dict:
    """เซลล์ที่เขียนไฟล์จริงจากรีโปลงเครื่องของ Colab — เนื้อหาตรงกับรีโปทุกตัวอักษร

    ไม่ผ่าน code() เพราะ code() ตัดบรรทัดว่างท้ายเซลล์ทิ้ง
    ไฟล์ที่ %%writefile เขียนออกมาจะขาดขึ้นบรรทัดสุดท้าย แล้วไม่ตรงกับรีโปอีก
    """
    cell = code("")
    cell["source"] = _lines(f"%%writefile {save_as}\n" + path.read_text(encoding="utf-8"))
    return cell


def notebook(cells: list, name: str) -> dict:
    # nbformat 4.5 บังคับให้ทุกเซลล์มี id — ใช้เลขลำดับ จะได้ diff อ่านง่าย
    for number, cell in enumerate(cells):
        cell["id"] = f"cell-{number:02d}"

    return {
        "cells": cells,
        "metadata": {
            "colab": {"name": name, "provenance": []},
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def save(content: dict, name: str) -> Path:
    path = OUTPUT / name
    path.write_text(json.dumps(content, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return path


def execute(path: Path) -> bool:
    """รันทุกเซลล์ให้ผลติดมาในไฟล์ — ถ้าเครื่องไม่มี nbclient ข้ามไป ไม่ถือว่าพัง

    รันในโฟลเดอร์ชั่วคราว ไฟล์ .py ที่ %%writefile เขียนออกมา
    จะได้ไม่ไปตกค้างใน docs/ แล้วถูก commit ขึ้นไปโดยไม่ตั้งใจ
    """
    try:
        import nbformat
        from nbclient import NotebookClient
    except ImportError:
        print(f"  ยังไม่ได้รัน {path.name} (เครื่องนี้ไม่มี nbclient) — อัปขึ้น Colab แล้วกด Run all")
        return False

    content = nbformat.read(path, as_version=4)
    with tempfile.TemporaryDirectory() as workdir:
        NotebookClient(content, timeout=600, kernel_name="python3",
                       resources={"metadata": {"path": workdir}}).execute()
    nbformat.write(content, path)
    return True


# ---------------------------------------------------------------------------
# notebook ของ Kim — ตารางแฮช
# ---------------------------------------------------------------------------

def build_kim() -> Path:
    cells = [
        markdown("""
# LEBIS — ตารางแฮชเขียนเอง (Hash Table)

**วิชา Data Structures & Algorithms · ส่วนของ Kim**

LEBIS คือระบบจัดการสต็อกและการยืม-คืนของร้านเช่าอุปกรณ์ถ่ายภาพ
คำถามที่ร้านถามทุกวันคือ *"กล้องรหัส CAM-0012 อยู่ไหน ว่างมั้ย"*
ถ้าเก็บของไว้ใน list ธรรมดา ต้องไล่ดูทีละชิ้นจนเจอ ของยิ่งมากยิ่งช้า

notebook นี้แสดงตารางแฮชที่เขียนเองทั้งหมด (ไม่ได้ครอบ `dict` ของ Python)
ที่ทำให้ค้นจากรหัสได้ในเวลาเกือบคงที่ ไม่ว่าร้านจะมีของกี่ชิ้น

| อัลกอริทึมกลุ่ม | ฟังก์ชัน | Big-O เฉลี่ย |
|---|---|---|
| Insert | `HashTable.insert` · `Inventory.add_item` · `borrow_item` | O(1) |
| Search | `HashTable.get` · `Inventory.find` | O(1) |
| Delete | `HashTable.delete` · `Inventory.remove_item` · `return_item` | O(1) |

**วิธีรัน:** เมนู Runtime → Run all
"""),
        markdown("""
---
## 1. ชุดข้อมูลทดสอบ A–D

ใช้ `datasets.py` ของ Neo ชุดเดียวกับทั้งทีม ตัวเลขของสามหัวข้อจะได้เทียบกันได้

| ชุด | จำนวน | ลักษณะ | ใช้พิสูจน์อะไร |
|---|---|---|---|
| A | 10 | ข้อมูลสะอาด | ทุกฟังก์ชันทำงานถูก |
| B | 12 | ชื่อซ้ำ แต่รหัสไม่ซ้ำ | ค้นด้วยรหัสแล้วได้ตัวที่ถูก ไม่ใช่ตัวแรกที่ชื่อตรง |
| C | 10 | ของหมดหลายตัว | การนับและสถานะ |
| D | 1,000 | ชุดใหญ่ | วัดเวลาจริงว่า Big-O ต่างกันแค่ไหน |

> เซลล์ที่ขึ้นต้นด้วย `%%writefile` คือไฟล์จริงจากรีโปทุกตัวอักษร
> เขียนลงเป็นไฟล์แล้วค่อย `import` เพื่อให้แต่ละไฟล์มีชื่อตัวแปรเป็นของตัวเอง
"""),
        file_cell(ALGORITHMS / "datasets.py", "datasets.py"),
        code("""
import datasets

for name in "ABCD":
    info = datasets.describe(datasets.make_dataset(name))
    print(f"ชุด {name}: " + " · ".join(f"{key} {value}" for key, value in info.items()))
"""),
        markdown("""
---
## 2. โครงสร้างข้อมูล — list คู่กับดัชนีแฮช

อุปกรณ์ 1 ชิ้นเก็บเป็น `dict` 8 ฟิลด์:
`code` · `name` · `category` · `total` · `available` · `borrower` · `due_date` · `status`

เก็บของไว้ **สองที่คู่กัน**

```
items = [ {CAM-0001 ...}, {LEN-0002 ...}, {TRI-0003 ...} ]      <- ตัวข้อมูลจริง มีลำดับ
index = HashTable:  "CAM-0001" -> 0 · "LEN-0002" -> 1 · ...      <- รหัส -> ตำแหน่ง
```

| เก็บแบบ | ค้นด้วยรหัส | เรียง / ไล่ตามลำดับ |
|---|---|---|
| list อย่างเดียว | O(n) ต้องไล่ทีละตัว | ได้ |
| ตารางแฮชอย่างเดียว | O(1) เฉลี่ย | ไม่ได้ — ลำดับเป็นลำดับของถัง |
| **list + ดัชนีแฮช** | **O(1) เฉลี่ย** | **ได้** |

งานอื่นของระบบต้องการลำดับ — merge sort ของ Kul เรียงตามวันคืน
binary search ของ Neo หาของที่ครบกำหนดก่อนวันที่กำหนด จึงทิ้ง list ไม่ได้
ราคาที่จ่ายคือหน่วยความจำเพิ่มหนึ่งตาราง และต้องดูแลให้สองที่ตรงกันเสมอ
"""),
        file_cell(ALGORITHMS / "hash_table.py", "hash_table.py"),
        code("import hash_table"),
        markdown("""
---
## 3. การใช้งานพื้นฐาน — insert / get / delete

ฟังก์ชันแฮชคือ **polynomial rolling hash** ฐาน 31 มอดด้วย 1,000,000,007
ตำแหน่งของตัวอักษรมีผล `CAM-01` กับ `CAM-10` จึงได้ถังต่างกัน
(ถ้าแค่บวกรหัสตัวอักษร สองรหัสนี้จะได้ค่าเท่ากันและชนกันทุกครั้ง)
"""),
        code("hash_table.demo_basic_operations()"),
        markdown("""
---
## 4. การชน (collision) · chaining · การขยายตาราง

**การชน** คือ key ต่างกันแต่คำนวณได้ถังเดียวกัน เลี่ยงไม่ได้ เพราะ key มีได้ไม่จำกัดแต่ถังมีจำกัด

**chaining** — ถังหนึ่งเก็บได้หลายคู่ ต่อกันเป็นโซ่ ตอนค้นไปที่ถังนั้นแล้วไล่ดูในโซ่สั้นๆ

**ขยายตาราง** — เมื่อ load factor (ข้อมูล ÷ ถัง) เกิน 0.7 ขยายถังเป็น 2 เท่าแล้ว rehash ทุกตัว
ต้นทุน O(n) ต่อครั้ง แต่เกิดเฉพาะตอนข้อมูลเพิ่มเป็นเท่าตัว เฉลี่ยต่อการ insert จึงยังเป็น O(1) (amortized)

### ทำไม O(1) เป็นค่าเฉลี่ย ไม่ใช่กรณีแย่สุด

ถ้าทุก key ไปกองถังเดียวกัน ตารางจะเหลือโซ่เส้นเดียวยาว n ตัว การค้นกลายเป็นการไล่ทีละตัว = **O(n)**
เกิดได้เมื่อฟังก์ชันแฮชกระจายไม่ดี หรือเมื่อไม่ขยายตาราง เซลล์ข้างล่างสร้างตารางที่ห้ามขยายไว้เทียบให้เห็น
"""),
        code("hash_table.demo_collision_and_resize()"),
        markdown("""
---
## 5. คลังอุปกรณ์ของร้าน + ตัวตรวจความถูกต้อง

`add_item` · `borrow_item` · `return_item` · `remove_item` ทำงานบน list + ดัชนีแฮช
ทุกตัวตรวจก่อนแก้ข้อมูล ถ้าไม่ผ่านจะไม่แตะอะไรเลย

**ลบแบบ swap-and-pop** — ลบตัวกลาง list ตรงๆ เป็น O(n) เพราะต้องเลื่อนทุกตัวข้างหลัง
และตำแหน่งที่ดัชนีจำไว้จะผิดหมด จึงยกตัวท้ายมาวางทับ แก้ดัชนีตัวเดียว แล้วตัดท้าย = O(1)
"""),
        code("hash_table.demo_inventory()"),
        markdown("""
---
## 6. วัดเวลาจริงบนชุด A–D

สามวิธีบนข้อมูลชุดเดียวกัน · วน list = O(n) · HashTable ที่เขียนเอง = O(1) เฉลี่ย · `dict` ของ Python = O(1) เฉลี่ย (ตัวเทียบ)
แต่ละช่องรัน 3 รอบแล้วเฉลี่ย ใช้ `time.perf_counter()` เวลาสร้างของก่อนวัดไม่ถูกนับรวม
"""),
        code("results = hash_table.report_on_datasets(datasets.make_dataset)"),
        markdown("""
---
## 7. สรุป

1. **ชุดเล็ก (A–C) วน list เร็วกว่า** — ไล่ดู 10 ตัวถูกกว่าการคำนวณแฮชทีละครั้ง
   Big-O บอกพฤติกรรมตอน n โตขึ้น ไม่ได้บอกว่าใครชนะที่ n น้อยๆ
2. **ชุด D (1,000) ตารางแฮชชนะชัด** — ค้นเร็วกว่าวน list ราว 12 เท่า และห่างขึ้นเรื่อยๆ เมื่อ n โต
3. **`dict` ของ Python เร็วกว่าของเรา** แต่เป็น O(1) เหมือนกัน ต่างกันที่ค่าคงที่
   เพราะ `dict` เขียนด้วยภาษา C ของเราวนลูปด้วย Python — โตในอัตราเดียวกัน
4. **O(1) ไม่ได้มาฟรี** มาจากฟังก์ชันแฮชที่กระจายดี + การขยายตารางที่ 0.7
   ขาดข้อใดข้อหนึ่งก็ไหลลงไปเป็น O(n) (เห็นในหัวข้อ 4)
5. **เก็บ list คู่ดัชนีแฮช** เพราะระบบต้องการทั้งค้นเร็วและลำดับ

Flowchart ของส่วนนี้อยู่ในโฟลเดอร์ `flowcharts/` — ภาพรวมระบบ · การเพิ่มอุปกรณ์ (รวมเส้นทางตอนชน) · การลบและการคืน
"""),
    ]

    path = save(notebook(cells, "LEBIS_Kim_HashTable.ipynb"), "LEBIS_Kim_HashTable.ipynb")
    print(f"สร้างแล้ว {path.relative_to(ROOT)}")
    return path


# ---------------------------------------------------------------------------
# notebook รวม — ประกอบเมื่อครบทั้งสามคน
# ---------------------------------------------------------------------------

def build_final():
    """LEBIS_Final.ipynb รวมงานสามคน — รอ sort_group.py ของ Kul

    พอ Kul ส่งไฟล์แล้ว ให้เติมเซลล์โชว์งานของ Kul ในส่วนที่ 4 ตามฟังก์ชันจริงที่เขาเขียน
    (ตอนนี้ยังไม่รู้ชื่อฟังก์ชัน จึงยังเขียนแทนไม่ได้)
    """
    sort_group = ALGORITHMS / "sort_group.py"
    if not sort_group.exists():
        print("ยังไม่สร้าง LEBIS_Final.ipynb — รอ algorithms/sort_group.py ของ Kul")
        return None

    cells = [
        markdown("""
# LEBIS — อัลกอริทึมของระบบยืม-คืนอุปกรณ์ (ฉบับรวม)

**วิชา Data Structures & Algorithms**

| ส่วน | คนเขียน | อัลกอริทึมที่เขียนเอง |
|---|---|---|
| Insert / Delete | Kim | Hash Table (chaining + resize) |
| Search / Count | Neo | Binary Search |
| Sort / Group | Kul | Merge Sort |

ทุกคนวัดบนชุดข้อมูล A–D ชุดเดียวกัน · **วิธีรัน:** Runtime → Run all
"""),
        markdown("## 1. ไฟล์ของทั้งทีม\n\nแต่ละเซลล์คือไฟล์จริงจากรีโป เขียนลงเป็นไฟล์แล้ว import แยกกัน ชื่อฟังก์ชันที่ซ้ำกันข้ามไฟล์จึงไม่ทับกัน"),
        file_cell(ALGORITHMS / "datasets.py", "datasets.py"),
        file_cell(ALGORITHMS / "hash_table.py", "hash_table.py"),
        file_cell(ALGORITHMS / "search.py", "search.py"),
        file_cell(sort_group, "sort_group.py"),
        code("import datasets, hash_table, search, sort_group"),
        markdown("---\n## 2. Insert / Delete — Hash Table (Kim)"),
        code("hash_table.demo_inventory()\nresults_kim = hash_table.report_on_datasets(datasets.make_dataset)"),
        markdown("---\n## 3. Search / Count — Binary Search (Neo)"),
        file_cell(SCRIPTS / "data-course-benchmark.py", "data_course_benchmark.py"),
        code("import data_course_benchmark\ndata_course_benchmark.main()"),
        markdown("---\n## 4. Sort / Group — Merge Sort (Kul)\n\n> เติมเซลล์โชว์ผลของ Kul ตรงนี้ตามฟังก์ชันที่อยู่ใน sort_group.py"),
    ]

    path = save(notebook(cells, "LEBIS_Final.ipynb"), "LEBIS_Final.ipynb")
    print(f"สร้างแล้ว {path.relative_to(ROOT)} — ยังต้องเติมส่วนของ Kul")
    return path


if __name__ == "__main__":
    kim = build_kim()
    if execute(kim):
        print(f"  รันครบทุกเซลล์แล้ว ผลติดมาในไฟล์")

    final = build_final()
    if final is not None and execute(final):
        print(f"  รันครบทุกเซลล์แล้ว ผลติดมาในไฟล์")

    sys.exit(0)
