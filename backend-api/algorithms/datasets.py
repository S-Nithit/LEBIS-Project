"""ชุดข้อมูลทดสอบ A–D — งานส่งวิชา Data Structures & Algorithms ของ Neo

ทั้งสามหัวข้อของกลุ่ม (hash_table ของ Kim · search ของ Neo · sort_group ของ Kul)
ต้องวัดผลบนข้อมูลชุดเดียวกันจากไฟล์นี้ ไม่ใช่ต่างคนต่างสร้างข้อมูลของตัวเอง
ถ้าแต่ละคนวัดบนข้อมูลคนละชุด ตัวเลขในรายงานจะอ่านเทียบกันไม่ได้เลย
และกรรมการจะเห็นทันทีว่าสามหัวข้อไม่ได้คุยกัน

🔴 กฎเหล็กของไฟล์นี้: import ได้แค่ standard library ของ Python เท่านั้น
   ห้าม FastAPI ห้าม databases ห้าม Pydantic ห้าม import ไฟล์อื่นในโปรเจกต์
   เพราะไฟล์เดียวกันนี้ถูกก็อปไปวางใน Google Colab แล้วต้องกดรันได้ทันที

วิธีรัน
    python3 backend-api/algorithms/datasets.py

วิธีใช้ใน Colab
    วางเซลล์ของไฟล์นี้ไว้ "ก่อน" เซลล์ของ hash_table.py และ search.py
    แล้วเรียก make_dataset("A") ... make_dataset("D") ส่งเข้าฟังก์ชันของแต่ละคน
    ได้ตรงๆ เพราะทุกตัวรับ list ของ dict ธรรมดา

หนึ่ง record มี 8 ฟิลด์ตามที่ Kim ออกแบบไว้
    code       รหัสอุปกรณ์ ไม่ซ้ำกันทั้งชุด — ใช้เป็น key ของตารางแฮช
    name       ชื่อที่คนเรียก ซ้ำกันได้ (ชุด B จงใจให้ซ้ำ)
    category   หมวด ใช้ตอนจัดกลุ่มของ Kul
    total      จำนวนทั้งหมดที่ร้านมี
    available  จำนวนที่ยังอยู่บนชั้นตอนนี้
    borrower   ชื่อผู้เช่า ถ้ายังไม่มีใครยืมเป็น None
    due_date   กำหนดคืนในรูป "YYYY-MM-DD" ถ้าไม่มีคนยืมเป็น None
    status     "ok" ว่างให้เช่าได้ · "out" ถูกยืมหมด · "broken" ชำรุด

ทำไมวันที่ถึงตายตัว
    count_overdue() ของ search.py นับจากวันครบกำหนดเทียบกับ "วันนี้"
    ถ้าใช้วันจริงของเครื่อง ตัวเลขในรายงานจะเปลี่ยนทุกวันที่รันใหม่
    และตัวเลขในรายงานกับตัวเลขในวิดีโอจะไม่ตรงกัน ไฟล์นี้จึงตรึง TODAY ไว้
    ให้ทุกคนอ้างอิงค่าเดียวกัน
"""

import random
from datetime import date, timedelta

# ---------------------------------------------------------------------------
# ส่วนที่ 1 — ค่าคงที่
# ---------------------------------------------------------------------------

# วันอ้างอิงตายตัว ใช้แทน "วันนี้" ทั้งระบบทดสอบ
# ตัวเลขในรายงานจึงเท่าเดิมทุกครั้งที่รัน ไม่ว่าจะรันวันไหน
TODAY = date(2026, 10, 1)

# หมวดและคำนำหน้ารหัส ใช้ชุดเดียวกับ hash_table.py ของ Kim
# (คัดลอกค่ามา ไม่ได้ import เพราะกฎ stdlib เท่านั้นข้างบน)
CATEGORIES = ["กล้อง", "เลนส์", "ขาตั้ง", "ไฟ", "ไมโครโฟน"]

CATEGORY_PREFIX = {
    "กล้อง": "CAM",
    "เลนส์": "LEN",
    "ขาตั้ง": "TRI",
    "ไฟ": "LED",
    "ไมโครโฟน": "MIC",
}

# ชื่อผู้เช่าสำหรับข้อมูลจำลอง ไม่ใช่ชื่อคนจริง
BORROWERS = [
    "ปวีณา",
    "ธนกร",
    "สุชาดา",
    "ณัฐพล",
    "กมลชนก",
    "อานนท์",
    "พิมพ์ชนก",
    "วีรภัทร",
]

# seed แยกตามชุด ชุดเดิมจึงได้ข้อมูลเดิมเสมอ แต่คนละชุดไม่เหมือนกัน
SEEDS = {"A": 11, "B": 22, "C": 33, "D": 44}

DATASET_SIZES = {"A": 10, "B": 12, "C": 10, "D": 1000}


# ---------------------------------------------------------------------------
# ส่วนที่ 2 — ตัวช่วยสร้าง record
# ---------------------------------------------------------------------------


def _iso(day: date) -> str:
    """แปลงวันเป็นข้อความ "YYYY-MM-DD"

    เก็บเป็นข้อความไม่ใช่ออบเจ็กต์ date เพราะรูปแบบนี้เรียงลำดับด้วยการเทียบ
    ข้อความได้ตรงๆ อยู่แล้ว (ปี-เดือน-วัน เรียงจากหน่วยใหญ่ไปเล็ก)
    merge_sort ของ Kul กับ binary_search ของ Neo จึงเทียบวันได้โดยไม่ต้องแปลงก่อน
    """
    return day.isoformat()


def _make_record(
    number: int,
    category: str,
    name: str,
    total: int,
    available: int,
    borrower=None,
    due_offset=None,
    broken: bool = False,
) -> dict:
    """ประกอบ record 8 ฟิลด์ให้ครบ และคิดค่า status ให้สอดคล้องกับ available

    due_offset คือจำนวนวันนับจาก TODAY ติดลบ = เลยกำหนดคืนมาแล้ว
    """
    if broken:
        status = "broken"
    elif available == 0:
        status = "out"
    else:
        status = "ok"

    return {
        "code": f"{CATEGORY_PREFIX[category]}-{number:04d}",
        "name": name,
        "category": category,
        "total": total,
        "available": available,
        "borrower": borrower,
        "due_date": _iso(TODAY + timedelta(days=due_offset)) if due_offset is not None else None,
        "status": status,
    }


def _build(size: int, seed: int, duplicate_names: bool, zero_stock: bool) -> list:
    """สร้างรายการตามพารามิเตอร์ที่แต่ละชุดต้องการ

    duplicate_names  ให้ชื่อซ้ำกันเป็นคู่ๆ แต่ code ยังไม่ซ้ำ (ชุด B)
    zero_stock       ดันให้หลายตัวมี available = 0 (ชุด C)
    """
    generator = random.Random(seed)
    items = []

    for number in range(1, size + 1):
        # ชุด B: ตัวเลขคู่ใช้ชื่อเดียวกับตัวก่อนหน้า จึงได้ชื่อซ้ำเป็นคู่ๆ
        # แต่ code ยังไม่ซ้ำ เพราะ code เดินตาม number ตลอด
        # ใช้พิสูจน์ว่าค้นด้วยชื่อแล้วยังแยกออกว่าเป็นตัวไหน
        #
        # หมวดต้องเดินตามชื่อไปด้วย ไม่งั้นจะได้ของที่ชื่อว่า "เลนส์ รุ่นที่ 1"
        # แต่หมวดเป็น "ขาตั้ง" ซึ่งเป็นข้อมูลที่ขัดกันเองและทำให้ group_by_type
        # ของ Kul ให้ผลที่อธิบายในรายงานไม่ได้
        name_number = number - 1 if duplicate_names and number % 2 == 0 else number
        category = CATEGORIES[name_number % len(CATEGORIES)]
        name = f"{category} รุ่นที่ {name_number}"

        total = generator.randint(1, 5)

        if zero_stock and number % 2 == 1:
            # ชุด C: ครึ่งหนึ่งถูกยืมไปหมด
            available = 0
        else:
            available = generator.randint(0, total)

        borrowed_units = total - available

        if borrowed_units > 0:
            borrower = BORROWERS[number % len(BORROWERS)]
            # กระจายกำหนดคืนไว้ทั้งก่อนและหลังวันอ้างอิง
            # ค่าติดลบคือเลยกำหนดแล้ว ซึ่งเป็นตัวที่ count_overdue() ต้องนับได้
            due_offset = generator.randint(-10, 14)
        else:
            borrower = None
            due_offset = None

        # ให้มีของชำรุดปนอยู่บ้าง เพื่อให้ count_by_status() มีครบทั้งสามสถานะ
        # ทุกๆ 7 ชิ้น — เลือกเลขนี้เพราะชุดเล็กสุดมี 10 ชิ้น ใช้ 7 แล้วยังได้
        # อย่างน้อย 1 ชิ้นในทุกชุด ถ้าใช้เลขที่ใหญ่กว่านั้น ชุด A-C จะไม่มีของชำรุดเลย
        # แล้วการนับสถานะ "broken" จะไม่เคยถูกทดสอบบนชุดที่ตรวจด้วยตาได้
        broken = number % 7 == 0

        items.append(
            _make_record(
                number=number,
                category=category,
                name=name,
                total=total,
                available=available,
                borrower=borrower,
                due_offset=due_offset,
                broken=broken,
            )
        )

    return items


# ---------------------------------------------------------------------------
# ส่วนที่ 3 — ทางเข้าหลัก
# ---------------------------------------------------------------------------


def make_dataset(name: str) -> list:
    """คืนชุดข้อมูลทดสอบตามชื่อชุด "A" "B" "C" หรือ "D"

    A  10 รายการ  ข้อมูลสะอาด ชื่อไม่ซ้ำ       ใช้เช็กว่าทุกฟังก์ชันทำงานถูก
    B  12 รายการ  ชื่อซ้ำเป็นคู่ code ไม่ซ้ำ    ใช้เช็กว่าค้นแล้วได้ตัวที่ถูก
    C  10 รายการ  หลายตัว available = 0        ใช้เช็กการนับและสถานะ
    D  1,000 รายการ                            ใช้วัดเวลาจริงเทียบ Big-O

    เรียกซ้ำกี่ครั้งก็ได้ข้อมูลเดิมเสมอ เพราะ seed ตายตัวตาม SEEDS
    แต่คืน list ใหม่ทุกครั้ง ฟังก์ชันที่แก้ข้อมูล (เช่น sort แบบแก้ในที่)
    จึงไม่ไปกระทบผลของคนอื่นที่เรียกทีหลัง
    """
    key = name.strip().upper()

    if key not in DATASET_SIZES:
        raise ValueError(f"ไม่รู้จักชุดข้อมูล {name!r} — มีให้เลือกแค่ A, B, C, D")

    return _build(
        size=DATASET_SIZES[key],
        seed=SEEDS[key],
        duplicate_names=(key == "B"),
        zero_stock=(key == "C"),
    )


def all_datasets() -> dict:
    """คืนทั้งสี่ชุดในทีเดียว ใช้ตอนวนวัดผลในรายงาน"""
    return {name: make_dataset(name) for name in ("A", "B", "C", "D")}


def describe(items: list) -> dict:
    """สรุปหน้าตาของชุดข้อมูลไว้ตรวจว่าสร้างมาถูกจริง

    ไม่ได้เรียกฟังก์ชันนับของ search.py เพราะไฟล์นี้ต้องรันได้ลำพัง
    (และ search.py ก็ต้องรันได้ลำพังเหมือนกัน) การนับสองบรรทัดตรงนี้
    จึงถูกกว่าการผูกสองไฟล์เข้าหากัน
    """
    codes = [item["code"] for item in items]
    names = [item["name"] for item in items]

    return {
        "จำนวน": len(items),
        "code ไม่ซ้ำ": len(set(codes)) == len(codes),
        "ชื่อที่ซ้ำกัน": len(names) - len(set(names)),
        "available = 0": sum(1 for item in items if item["available"] == 0),
        "มีคนยืมอยู่": sum(1 for item in items if item["borrower"] is not None),
        "เลยกำหนดคืน": sum(
            1
            for item in items
            if item["due_date"] is not None and item["due_date"] < _iso(TODAY)
        ),
        "ชำรุด": sum(1 for item in items if item["status"] == "broken"),
    }


# ---------------------------------------------------------------------------
# ส่วนที่ 4 — ตรวจว่าแต่ละชุดมีคุณสมบัติตามที่ตั้งใจไว้จริง
#
# ข้อมูลทดสอบที่ผิดเงียบๆ อันตรายกว่าไม่มีข้อมูลทดสอบ เพราะทุกฟังก์ชัน
# จะ "ผ่าน" หมดแล้วเราจะเชื่อผลนั้นไปเขียนในรายงาน
# ---------------------------------------------------------------------------


def verify() -> None:
    """เช็กคุณสมบัติที่แต่ละชุดสัญญาไว้ ถ้าไม่ตรงให้ล้มทันที"""
    a = make_dataset("A")
    b = make_dataset("B")
    c = make_dataset("C")
    d = make_dataset("D")

    # ขนาดตามที่แผนกำหนด — โจทย์บังคับว่าทุกชุดต้อง >= 10
    assert len(a) == 10 and len(b) == 12 and len(c) == 10 and len(d) == 1000
    assert all(len(items) >= 10 for items in (a, b, c, d))

    # code ต้องไม่ซ้ำทุกชุด เพราะเป็น key ของตารางแฮช
    for name, items in (("A", a), ("B", b), ("C", c), ("D", d)):
        codes = [item["code"] for item in items]
        assert len(set(codes)) == len(codes), f"ชุด {name} มี code ซ้ำ"

    # ชุด A ชื่อต้องไม่ซ้ำ ชุด B ต้องซ้ำ — นี่คือความต่างที่ชุด B มีไว้พิสูจน์
    assert len({item["name"] for item in a}) == len(a), "ชุด A ไม่ควรมีชื่อซ้ำ"
    assert len({item["name"] for item in b}) < len(b), "ชุด B ต้องมีชื่อซ้ำ"

    # ชุด C ต้องมีของหมดสต็อกอย่างน้อยครึ่งหนึ่ง
    assert sum(1 for item in c if item["available"] == 0) >= len(c) // 2

    # ทุกชุดต้องมีของชำรุดอย่างน้อยหนึ่งชิ้น ไม่งั้น count_by_status()
    # จะไม่เคยถูกทดสอบครบทั้งสามสถานะ
    for name, items in (("A", a), ("B", b), ("C", c), ("D", d)):
        assert any(item["status"] == "broken" for item in items), f"ชุด {name} ไม่มีของชำรุด"

    # ทุกชุดต้องมีของที่เลยกำหนดคืน ไม่งั้น count_overdue() จะทดสอบไม่ได้
    for name, items in (("A", a), ("B", b), ("C", c), ("D", d)):
        overdue = [
            item
            for item in items
            if item["due_date"] is not None and item["due_date"] < _iso(TODAY)
        ]
        assert overdue, f"ชุด {name} ไม่มีรายการที่เลยกำหนดคืนเลย"

    # ความสอดคล้องของ record ทุกใบ
    for items in (a, b, c, d):
        for item in items:
            assert set(item) == {
                "code",
                "name",
                "category",
                "total",
                "available",
                "borrower",
                "due_date",
                "status",
            }, "record ต้องมีครบ 8 ฟิลด์"
            assert 0 <= item["available"] <= item["total"], "ของว่างต้องไม่เกินของทั้งหมด"
            assert item["status"] in ("ok", "out", "broken")

            # มีคนยืมก็ต้องมีกำหนดคืน ไม่มีคนยืมก็ต้องไม่มีกำหนดคืน
            assert (item["borrower"] is None) == (item["due_date"] is None)

            # ของที่ยังไม่มีใครยืมต้องมีของครบบนชั้น
            if item["borrower"] is None:
                assert item["available"] == item["total"]

    # เรียกสองครั้งต้องได้ข้อมูลเดิมเป๊ะ ไม่งั้นตัวเลขในรายงานจะขยับเอง
    assert make_dataset("D") == d, "make_dataset ต้องคืนข้อมูลเดิมทุกครั้ง"

    # แต่ต้องเป็น list คนละใบ ไม่ใช่ใบเดิมที่ใครแก้ไปแล้ว
    assert make_dataset("A") is not a

    print("ตรวจชุดข้อมูล A-D ผ่านทั้งหมด")


# ---------------------------------------------------------------------------
# ส่วนที่ 5 — รันเพื่อดูผล
# ---------------------------------------------------------------------------


def main() -> None:
    print("=" * 70)
    print("ชุดข้อมูลทดสอบ A-D ของ LEBIS")
    print(f"วันอ้างอิง (TODAY) = {_iso(TODAY)}")
    print("=" * 70)

    for name in ("A", "B", "C", "D"):
        items = make_dataset(name)
        print()
        print(f"ชุด {name}")
        print("-" * 70)
        for label, value in describe(items).items():
            print(f"    {label:<16} {value}")

    print()
    print("ตัวอย่าง 3 รายการแรกของชุด A")
    print("-" * 70)
    for item in make_dataset("A")[:3]:
        print(f"    {item}")

    print()
    print("ชื่อที่ซ้ำกันในชุด B (code ไม่ซ้ำ)")
    print("-" * 70)
    for item in make_dataset("B"):
        print(f"    {item['code']}  {item['name']}")

    print()
    verify()


if __name__ == "__main__":
    main()
