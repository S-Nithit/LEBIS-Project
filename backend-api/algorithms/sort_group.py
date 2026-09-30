"""การเรียงลำดับและการจัดกลุ่ม — งานส่งวิชา Data Structures & Algorithms ของ Kul

อัลกอริทึมที่เขียนเองของไฟล์นี้คือ **merge sort** ห้ามใช้ sorted()/.sort() ของ Python
ส่วน bubble sort เขียนไว้เพื่อเป็นตัวเทียบ

list ที่ merge_sort เรียงแล้ว คือตัวที่ binary_search ของ Neo ใช้ต่อโดยตรง
(ดู find_due_before ใน search.py) งานสองคนนี้ต่อกัน ต้องคุยกันเรื่องรูปแบบ
ที่ส่งต่อให้ตรง — ไฟล์นี้คืน list ใหม่เสมอ ไม่แก้ของเดิม เหมือนที่ search.py ทำ

🔴 กฎเหล็กของไฟล์นี้: import ได้แค่ standard library ของ Python เท่านั้น
   ห้าม FastAPI ห้าม databases ห้าม Pydantic ห้าม import ไฟล์อื่นในโปรเจกต์
   เพราะไฟล์เดียวกันนี้ถูกก็อปไปวางใน Google Colab แล้วต้องกดรันได้ทันที

วิธีรัน
    python3 backend-api/algorithms/sort_group.py
    (รันลำพังได้ มีข้อมูลตัวอย่างเล็กๆ ของตัวเองอยู่ท้ายไฟล์)

ทำไมยังต้องมี bubble sort ทั้งที่ merge sort เร็วกว่าเสมอ
    ไม่ได้มีไว้ใช้งานจริง มีไว้ "เทียบ" ให้เห็นว่า O(n²) กับ O(n log n) ต่างกัน
    แค่ไหนเมื่อข้อมูลโต — ที่ 10 รายการแทบไม่ต่าง แต่ที่ 1,000 รายการ
    bubble sort ต้องเทียบมากกว่า merge sort หลายสิบเท่า
"""

import time

# ---------------------------------------------------------------------------
# ส่วนที่ 1 — การเรียงลำดับทั่วไป (รับ key แบบเดียวกับ sorted() ของ Python)
# ---------------------------------------------------------------------------


def bubble_sort(items: list, key=lambda item: item) -> list:
    """เรียงด้วยการสลับคู่ที่อยู่ผิดลำดับซ้ำไปเรื่อยๆ — O(n²) เขียนเอง

    วิธีคิด: ไล่เทียบของที่อยู่ติดกันทีละคู่ ถ้าลำดับผิด (ตัวหน้ามากกว่าตัวหลัง)
    ให้สลับที่กัน ทำแบบนี้วนจนครบรอบ แล้ววนซ้ำใหม่ทั้งชุด ของที่ "หนักที่สุด"
    จะค่อยๆ ลอยไปอยู่ท้ายสุดทีละตัวในแต่ละรอบ เหมือนฟองอากาศลอยขึ้นผิวน้ำ

    กันวนเกินความจำเป็น: ถ้ารอบไหนไม่มีการสลับเลย แปลว่าเรียงเสร็จแล้ว
    หยุดได้ทันทีโดยไม่ต้องวนจนครบ n รอบ (สำคัญมากกับชุด A ที่มีแค่ 10 ตัว
    ถ้าไม่เช็กจุดนี้ ตัวเลขเวลาของชุดเล็กจะดูแย่เกินจริง)

    คืน list ใหม่ ไม่แก้ของเดิม เพราะคนอื่นอาจถือ list ใบเดียวกันอยู่
    (ดู sort_by_code ใน search.py ที่ทำแบบเดียวกัน)
    """
    result = list(items)
    n = len(result)

    for round_index in range(n):
        swapped = False

        for i in range(n - round_index - 1):
            if key(result[i]) > key(result[i + 1]):
                result[i], result[i + 1] = result[i + 1], result[i]
                swapped = True

        if not swapped:
            break

    return result


def merge_sort(items: list, key=lambda item: item) -> list:
    """เรียงด้วยการแบ่งครึ่งแล้วผสานกลับ — O(n log n) เขียนเอง

    วิธีคิด: แบ่ง list ออกเป็นสองครึ่งไปเรื่อยๆ จนเหลือชิ้นเดียว (ชิ้นเดียว
    ถือว่าเรียงแล้วเสมอ) แล้วผสาน (merge) สองครึ่งที่เรียงแล้วเข้าด้วยกัน
    ทีละคู่ ไล่กลับขึ้นมา แต่ละชั้นของการแบ่งใช้เวลา O(n) ในการผสาน
    และมี log n ชั้น (แบ่งครึ่งไปเรื่อยๆ จนเหลือ 1) รวมเป็น O(n log n)

    ต่างจาก bubble sort ตรงที่ไม่ต้องไล่เทียบทุกคู่กับทุกคู่ — ข้อมูลสอง
    ฝั่งที่เรียงมาแล้วผสานกันได้ในรอบเดียวโดยไล่จากหัวทั้งสองฝั่งพร้อมกัน

    เขียนแบบ recursion เพราะการแบ่งครึ่งซ้ำๆ เข้ากับรูปแบบนี้ตามธรรมชาติ
    ความลึกของ stack อยู่ที่ประมาณ log2(n) ซึ่งสำหรับ 1,000 รายการคือ
    ประมาณ 10 ชั้นเท่านั้น ไม่เสี่ยง stack overflow
    """
    if len(items) <= 1:
        return list(items)

    middle = len(items) // 2
    left = merge_sort(items[:middle], key)
    right = merge_sort(items[middle:], key)

    return _merge(left, right, key)


def _merge(left: list, right: list, key) -> list:
    """ผสานสอง list ที่เรียงแล้วเข้าเป็นก้อนเดียวที่ยังเรียงอยู่ — O(n)

    ไล่เทียบตัวหน้าสุดของทั้งสองฝั่ง หยิบตัวที่เล็กกว่าออกมาก่อนเสมอ
    เขียน <= ไม่ใช่ < ตอนเทียบฝั่งซ้าย เพื่อให้เป็น stable sort — ถ้าค่าเท่ากัน
    ตัวที่มาจากฝั่งซ้าย (ซึ่งอยู่ก่อนในของเดิม) ต้องถูกหยิบก่อนเสมอ
    ลำดับเดิมของรายการที่ due_date เท่ากันจึงไม่ถูกสลับมั่วโดยไม่มีเหตุผล
    """
    merged = []
    i = j = 0

    while i < len(left) and j < len(right):
        if key(left[i]) <= key(right[j]):
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1

    merged.extend(left[i:])
    merged.extend(right[j:])

    return merged


# ---------------------------------------------------------------------------
# ส่วนที่ 2 — การเรียงเฉพาะทางที่ระบบใช้จริง
# ---------------------------------------------------------------------------


def sort_by_due_date(items: list) -> list:
    """เรียงรายการยืมตามวันครบกำหนดคืน ของค้างนานสุดขึ้นก่อน — ใช้ merge_sort

    "ค้างนานสุด" คือของที่ due_date เก่าที่สุด (เลยกำหนดมานานที่สุด)
    เรียงจากน้อยไปมาก (ascending) จึงได้ตัวที่ค้างนานสุดอยู่บนสุดพอดี

    กรองของที่ไม่มีคนยืมออกก่อน (due_date เป็น None) เพราะ merge_sort
    เทียบ None กับข้อความไม่ได้ (Python โยน TypeError ทันที) และของที่
    ไม่มีคนยืมก็ไม่มี "วันครบกำหนด" ให้เรียงตั้งแต่แรกอยู่แล้ว

    list ที่คืนออกมาเรียงตาม due_date แล้ว จึงส่งต่อให้ find_due_before()
    ของ Neo ใช้ต่อได้ทันที ไม่ต้องเรียงซ้ำ
    """
    borrowed = [item for item in items if item["due_date"] is not None]
    return merge_sort(borrowed, key=lambda item: item["due_date"])


def sort_by_available(items: list) -> list:
    """เรียงตามจำนวนคงเหลือ น้อยไปมาก เพื่อหาของที่ใกล้หมดก่อน — ใช้ merge_sort

    ของที่เหลือน้อยที่สุดอยู่บนสุด เจ้าของร้านเปิดหน้านี้แล้วเห็นทันทีว่า
    ต้องเติมของชิ้นไหนก่อน ไม่ต้องไล่ดูทั้งตาราง
    """
    return merge_sort(items, key=lambda item: item["available"])


# ---------------------------------------------------------------------------
# ส่วนที่ 3 — การจัดกลุ่ม
#
# ทั้งคู่เป็น O(n) เดินผ่านข้อมูลรอบเดียว แบ่งลงถังตามคีย์ที่ต้องการ
# เร็วกว่าการวนหลายรอบทีละหมวด (เช่นวนหาแต่ "กล้อง" ก่อน แล้ววนใหม่หา "เลนส์")
# เพราะแบบนั้นต้องอ่านข้อมูลทั้งก้อนซ้ำเท่าจำนวนหมวด กลายเป็น O(n × จำนวนหมวด)
# ส่วนแบบแบ่งถังอ่านข้อมูลแค่รอบเดียวไม่ว่าจะมีกี่หมวด
# ---------------------------------------------------------------------------


def group_by_type(items: list) -> dict:
    """จัดกลุ่มตามหมวดอุปกรณ์ (category) — O(n)

    คืน dict ที่คีย์คือชื่อหมวด ค่าคือ list ของรายการในหมวดนั้น
    ไม่ต้องรู้ล่วงหน้าว่ามีหมวดอะไรบ้าง เพราะสร้างคีย์ใหม่ทันทีที่เจอหมวดที่ยังไม่มี
    """
    groups: dict = {}

    for item in items:
        category = item["category"]
        groups.setdefault(category, []).append(item)

    return groups


def group_by_status(items: list) -> dict:
    """จัดกลุ่มตามสถานะ (ok / out / broken) — O(n)

    ต่างจาก count_by_status ของ Neo ตรงที่ตัวนี้เก็บ "รายการทั้งใบ" ไว้ในกลุ่ม
    ไม่ใช่แค่นับจำนวน ใช้ตอนต้องการดูว่ามีอะไรบ้างในแต่ละสถานะ ไม่ใช่แค่กี่ชิ้น

    คืนคีย์ครบทั้งสามเสมอแม้จะว่าง เหตุผลเดียวกับ count_by_status ของ Neo:
    กันคนเอาไปใช้ต่อแล้วต้องเขียน .get() ดักทุกที่
    """
    groups = {"ok": [], "out": [], "broken": []}

    for item in items:
        status = item["status"]
        if status in groups:
            groups[status].append(item)

    return groups


# ---------------------------------------------------------------------------
# ส่วนที่ 4 — เครื่องมือวัดเวลา
#
# ใช้วิธีเดียวกับ hash_table.py ของ Kim และ search.py ของ Neo
# (perf_counter เฉลี่ย 3 รอบ) ตัวเลขของสามไฟล์จึงอ่านเทียบกันได้ในรายงานเดียว
# ---------------------------------------------------------------------------

ROUNDS = 3  # รันซ้ำกี่รอบแล้วเฉลี่ย — กันจังหวะที่เครื่องไปทำอย่างอื่นชั่วคราว


def measure(operation, rounds: int = ROUNDS) -> float:
    """วัดเวลาเฉลี่ยของ operation หน่วยเป็นมิลลิวินาที — เหมือนของ Neo ทุกจุด"""
    durations = []

    for _ in range(rounds):
        started_at = time.perf_counter()
        operation()
        durations.append(time.perf_counter() - started_at)

    return sum(durations) / len(durations) * 1000


def benchmark_sort(items: list, key=lambda item: item) -> dict:
    """วัดเวลา "เรียงทั้งชุดหนึ่งครั้ง" ของแต่ละวิธี บนข้อมูลชุดเดียวกัน

    ส่ง items เข้าไปตรงๆ ได้เลย เพราะทั้ง bubble_sort และ merge_sort
    คืน list ใหม่เสมอ ไม่แก้ของเดิม จึงใช้ items ก้อนเดียววัดซ้ำได้หลายวิธี
    โดยไม่ต้องกังวลว่าวิธีก่อนหน้าจะทำให้ข้อมูลเรียงอยู่แล้วจนวิธีถัดไปได้เปรียบ
    """

    def with_bubble():
        bubble_sort(items, key)

    def with_merge():
        merge_sort(items, key)

    def with_builtin():
        sorted(items, key=key)

    return {
        "bubble": measure(with_bubble),
        "merge": measure(with_merge),
        "builtin": measure(with_builtin),
    }


def print_table(title: str, rows: list) -> None:
    """พิมพ์ผลเป็นตารางอ่านง่าย — rows คือ list ของ tuple

    (ชื่อชุด, จำนวนข้อมูล, เวลา bubble, เวลา merge, เวลา builtin)
    """
    print()
    print(title)
    print("-" * 78)
    print(
        f"{'ชุด':>5} {'จำนวน':>9} {'bubble (ms)':>14} {'merge (ms)':>14}"
        f" {'builtin (ms)':>14} {'เร็วขึ้น':>10}"
    )
    print("-" * 78)

    for name, size, bubble_ms, merge_ms, builtin_ms in rows:
        speedup = bubble_ms / merge_ms if merge_ms > 0 else 0
        print(
            f"{name:>5} {size:>9,} {bubble_ms:>14.3f} {merge_ms:>14.3f}"
            f" {builtin_ms:>14.3f} {speedup:>9.1f}x"
        )

    print("-" * 78)


def report_on_datasets(make_dataset) -> None:
    """วัดเวลาเรียงบนชุดข้อมูลจริง A–D ของ Neo (datasets.py) — ใช้ตอนอยู่ใน Colab เท่านั้น

    รับฟังก์ชัน make_dataset เข้ามาทางพารามิเตอร์แทนการ import ตรงๆ
    เพราะไฟล์นี้ต้อง import ได้แค่ standard library (ดูกฎเหล็กหัวไฟล์)
    ใน Colab วางเซลล์ datasets.py ไว้ก่อน แล้วเรียก
        report_on_datasets(make_dataset)
    ตัวเลขจากฟังก์ชันนี้คือของจริงที่เอาไปเขียนรายงาน ไม่ใช่ตัวเลขจาก main()
    ซึ่งวัดบนข้อมูลตัวอย่างของไฟล์นี้เองเพื่อให้รันลำพังได้เท่านั้น
    """
    rows = []

    for name in ("A", "B", "C", "D"):
        items = make_dataset(name)
        result = benchmark_sort(items, key=lambda item: item["available"])
        rows.append((name, len(items), result["bubble"], result["merge"], result["builtin"]))

    print_table("เวลาเรียงทั้งชุดหนึ่งรอบ (เฉลี่ย 3 รอบ) — ชุดข้อมูลจริง A-D", rows)


# ---------------------------------------------------------------------------
# ส่วนที่ 5 — ข้อมูลตัวอย่างของไฟล์นี้เอง
#
# ชุดข้อมูล A-D ที่ใช้ส่งงานจริงอยู่ที่ datasets.py — เรียก make_dataset()
# ฟังก์ชันข้างล่างนี้มีไว้ให้ก็อปไฟล์เดียวไปวางใน Colab แล้วกดรันได้ทันที
# เหมือนกับที่ search.py ของ Neo ทำไว้ (make_sample_items)
# ---------------------------------------------------------------------------

SAMPLE_TODAY = "2026-10-01"


def make_sample_items(count: int) -> list:
    """สร้างรายการจำลอง count ชิ้น — รูปแบบเดียวกับที่ datasets.py ผลิต

    คัดลอกแบบเดียวกับ make_sample_items ใน search.py ของ Neo เจตนาให้เหมือนกัน
    เพื่อให้ไฟล์นี้รันลำพังได้และให้ผลที่เทียบกับของ Neo ได้ตรงๆ
    """
    categories = ["กล้อง", "เลนส์", "ขาตั้ง", "ไฟ", "ไมโครโฟน"]
    prefixes = {"กล้อง": "CAM", "เลนส์": "LEN", "ขาตั้ง": "TRI", "ไฟ": "LED", "ไมโครโฟน": "MIC"}
    items = []

    for number in range(1, count + 1):
        category = categories[number % len(categories)]
        total = (number % 5) + 1
        available = number % (total + 1)
        borrowed = total - available

        items.append(
            {
                "code": f"{prefixes[category]}-{number:04d}",
                "name": f"{category} รุ่นที่ {number}",
                "category": category,
                "total": total,
                "available": available,
                "borrower": f"ลูกค้า {number}" if borrowed > 0 else None,
                "due_date": ("2026-09-20" if number % 3 == 0 else "2026-10-20") if borrowed > 0 else None,
                "status": "broken" if number % 7 == 0 else ("out" if available == 0 else "ok"),
            }
        )

    return items


# ---------------------------------------------------------------------------
# ส่วนที่ 6 — ตรวจว่าทุกฟังก์ชันทำงานถูก
# ---------------------------------------------------------------------------


def verify() -> None:
    """ตรวจผลของทุกฟังก์ชัน ถ้าไม่ตรงให้ล้มทันที"""
    items = make_sample_items(40)

    # bubble และ merge ต้องให้ผลตรงกับ sorted() ของ Python เป๊ะ
    by_available_key = lambda item: item["available"]
    expected = sorted(items, key=by_available_key)
    assert bubble_sort(items, by_available_key) == expected
    assert merge_sort(items, by_available_key) == expected

    # ต้องคืน list ใหม่ ไม่แก้ของเดิม
    original_order = [item["code"] for item in items]
    merge_sort(items, by_available_key)
    assert [item["code"] for item in items] == original_order, "ห้ามแก้ list เดิม"

    # กรณีขอบ: list ว่างและ list ตัวเดียว ต้องไม่ระเบิด
    assert bubble_sort([]) == []
    assert merge_sort([]) == []
    single = [items[0]]
    assert bubble_sort(single, by_available_key) == single
    assert merge_sort(single, by_available_key) == single

    # stable sort: ของที่ค่าเท่ากันต้องคงลำดับเดิมไว้ (เทียบกับ sorted() ซึ่ง stable)
    tied = [{"code": "A", "available": 1}, {"code": "B", "available": 1}, {"code": "C", "available": 0}]
    tied_expected = sorted(tied, key=lambda item: item["available"])
    assert merge_sort(tied, key=lambda item: item["available"]) == tied_expected

    # sort_by_due_date: ต้องกรอง None ออก และของค้างนานสุด (due_date เก่าสุด) ต้องอยู่บนสุด
    by_due = sort_by_due_date(items)
    assert all(item["due_date"] is not None for item in by_due)
    assert [item["due_date"] for item in by_due] == sorted(item["due_date"] for item in by_due)
    if len(by_due) >= 2:
        assert by_due[0]["due_date"] <= by_due[1]["due_date"]

    # sort_by_available: น้อยไปมาก
    by_avail = sort_by_available(items)
    assert [item["available"] for item in by_avail] == sorted(item["available"] for item in items)

    # group_by_type: ทุกชิ้นต้องอยู่ในกลุ่มของตัวเอง ไม่หายไม่เกิน
    by_type = group_by_type(items)
    assert sum(len(group) for group in by_type.values()) == len(items)
    for category, group in by_type.items():
        assert all(item["category"] == category for item in group)

    # group_by_status: คีย์ครบสามเสมอ ผลรวมเท่าจำนวนทั้งหมด
    by_status = group_by_status(items)
    assert set(by_status) == {"ok", "out", "broken"}
    assert sum(len(group) for group in by_status.values()) == len(items)
    assert group_by_status([]) == {"ok": [], "out": [], "broken": []}

    print("ตรวจฟังก์ชันเรียงลำดับและจัดกลุ่ม ผ่านทั้งหมด")


# ---------------------------------------------------------------------------
# ส่วนที่ 7 — รันเพื่อดูผล
# ---------------------------------------------------------------------------


def main() -> None:
    print("=" * 78)
    print("การเรียงลำดับและการจัดกลุ่ม — LEBIS (งานของ Kul)")
    print("=" * 78)

    verify()

    items = make_sample_items(20)
    print()
    print("ตัวอย่างการจัดกลุ่ม บนข้อมูลตัวอย่าง 20 รายการ")
    print("-" * 78)
    for status, group in group_by_status(items).items():
        print(f"    {status:<8} {len(group)} รายการ")

    # วัดเวลาบนขนาดที่ต่างกัน ให้เห็นว่า bubble แย่ลงเร็วแค่ไหนเมื่อข้อมูลโต
    # ตัวเลขจริงที่ใช้ในรายงานต้องมาจากชุด A-D ของ datasets.py
    rows = []
    for size in (10, 100, 1000):
        sample = make_sample_items(size)
        result = benchmark_sort(sample, key=lambda item: item["available"])
        rows.append((str(size), size, result["bubble"], result["merge"], result["builtin"]))

    print_table("เวลาเรียงทั้งชุดหนึ่งรอบ (เฉลี่ย 3 รอบ) — ข้อมูลตัวอย่างของไฟล์นี้", rows)

    print()
    print("อ่านตารางนี้ยังไง")
    print("-" * 78)
    print("    ข้อมูลโตขึ้น 10 เท่า bubble sort ใช้เวลาโตขึ้นประมาณ 100 เท่า เพราะเป็น n²")
    print("    ส่วน merge sort โตขึ้นเพียงประมาณ 14-15 เท่า เพราะโตแบบ n log n")
    print("    (ทฤษฎี n log n ให้ค่าประมาณ 15 เท่า ตรงกับตัวเลขที่วัดได้จริงในตาราง)")
    print()
    print("    ตัวเลขที่ใช้ในรายงานจริงมาจากชุด A-D ของ datasets.py")
    print("    เรียก report_on_datasets(make_dataset) เพื่อดูตารางเต็ม")


if __name__ == "__main__":
    main()