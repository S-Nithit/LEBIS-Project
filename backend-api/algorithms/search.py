"""การค้นหาและการนับ — งานส่งวิชา Data Structures & Algorithms ของ Neo

อัลกอริทึมที่เขียนเองของไฟล์นี้คือ **binary search** ห้ามใช้ bisect ของ Python
ส่วน linear search เขียนไว้เพื่อเป็นตัวเทียบ และ hash lookup ใช้ตารางแฮช
ที่ Kim เขียนใน hash_table.py

ทั้งสามวิธีตอบคำถามเดียวกัน ("อุปกรณ์รหัสนี้คือชิ้นไหน") แต่ใช้เวลาต่างกัน
คนละระดับ ซึ่งเป็นสิ่งที่รายงานต้องพิสูจน์ด้วยเวลาที่วัดมาจริง ไม่ใช่แค่อ้าง Big-O

🔴 กฎเหล็กของไฟล์นี้: import ได้แค่ standard library ของ Python เท่านั้น
   ห้าม FastAPI ห้าม databases ห้าม Pydantic ห้าม import ไฟล์อื่นในโปรเจกต์
   เพราะไฟล์เดียวกันนี้ถูกก็อปไปวางใน Google Colab แล้วต้องกดรันได้ทันที

   ข้อนี้รวมถึง datasets.py และ hash_table.py ของคนในกลุ่มด้วย
   ไฟล์นี้จึงไม่ import อะไรเลย แต่ "รับ" ของที่ต้องใช้เข้ามาทางพารามิเตอร์
       - ชุดข้อมูล รับเป็น list ของ dict
       - ตารางแฮช รับเป็นออบเจ็กต์ที่มีเมท็อด .get() (ตัวของ Kim มีอยู่แล้ว)
   ใน Colab ให้วางเซลล์ตามลำดับ datasets -> hash_table -> ไฟล์นี้
   แล้วทุกอย่างจะอยู่ใน namespace เดียวกันเอง

วิธีรัน
    python3 backend-api/algorithms/search.py
    (รันลำพังได้ มีข้อมูลตัวอย่างเล็กๆ ของตัวเองอยู่ท้ายไฟล์)

ทำไมยังต้องมี binary search ทั้งที่ตารางแฮชเร็วกว่า
    ตารางแฮชเร็วเฉพาะตอนที่รู้ code เป๊ะๆ เพราะมันคำนวณตำแหน่งจาก key ตรงๆ
    แต่คำถามที่ร้านถามจริงคือ "มีของอะไรบ้างที่ครบกำหนดคืนก่อนวันที่ X"
    ตารางแฮชตอบไม่ได้เลย ต้องไล่ดูทั้งตาราง ซึ่งกลายเป็น O(n)
    คำถามแบบเป็นช่วงแบบนี้ต้องใช้ list ที่เรียงแล้ว + binary search
    ซึ่งหาขอบของช่วงได้ใน O(log n) — ดู find_due_before() ท้ายส่วนที่ 2
"""

import time

# ---------------------------------------------------------------------------
# ส่วนที่ 1 — การค้นหา
# ---------------------------------------------------------------------------


def linear_search(items: list, code: str):
    """ไล่ดูทีละชิ้นตั้งแต่ต้นจนเจอ — O(n)

    กรณีดีที่สุดคือเจอที่ชิ้นแรก (1 ครั้ง) กรณีแย่ที่สุดคือไม่มีของชิ้นนั้นอยู่เลย
    ซึ่งต้องดูครบทุกชิ้นก่อนจะสรุปได้ว่าไม่มี (n ครั้ง)
    เฉลี่ยแล้วอยู่ประมาณกลาง list คือ n/2 ครั้ง ซึ่งยังโตตาม n จึงนับเป็น O(n)

    ข้อดีที่ทำให้ยังต้องมี: ใช้กับ list แบบไหนก็ได้ ไม่ต้องเรียงมาก่อน
    และไม่ต้องสร้างโครงสร้างอะไรเพิ่ม
    """
    for item in items:
        if item["code"] == code:
            return item

    return None


def binary_search(sorted_items: list, code: str):
    """ค้นบน list ที่เรียงตาม code แล้ว — O(log n) เขียนเอง ไม่ใช้ bisect

    วิธีคิด: ดูตัวที่อยู่ตรงกลางก่อน
        ถ้าตรงกลางคือตัวที่หา                -> จบ
        ถ้าตัวที่หา "น้อยกว่า" ตรงกลาง       -> ของที่หาต้องอยู่ครึ่งซ้าย ทิ้งครึ่งขวา
        ถ้าตัวที่หา "มากกว่า" ตรงกลาง        -> ของที่หาต้องอยู่ครึ่งขวา ทิ้งครึ่งซ้าย
    ทุกครั้งที่เทียบหนึ่งรอบ จำนวนที่เหลือต้องดูลดลงครึ่งหนึ่ง
    ข้อมูล 1,000 ชิ้นจึงใช้การเทียบแค่ประมาณ 10 ครั้ง (เพราะ 2^10 = 1,024)
    เทียบกับ linear search ที่ต้องเทียบเฉลี่ย 500 ครั้ง

    🔴 เงื่อนไขที่ห้ามลืม: list ต้องเรียงตาม code มาก่อนแล้ว
       ถ้าไม่เรียง การตัดครึ่งจะตัดผิดข้าง แล้วจะคืน None ทั้งที่ของอยู่ในนั้น
       ซึ่งเป็นบั๊กที่ไม่ฟ้องอะไรเลย ใช้ sort_by_code() ข้างล่างเตรียมก่อนเสมอ

    เขียนเป็นลูป ไม่ใช่เรียกตัวเอง (recursion) เพราะลูปไม่กินพื้นที่ stack เพิ่ม
    พื้นที่ที่ใช้จึงเป็น O(1) ไม่ใช่ O(log n)
    """
    low = 0
    high = len(sorted_items) - 1

    while low <= high:
        # เขียนแบบนี้แทน (low + high) // 2 เพื่อกันค่าล้นในภาษาที่ int มีขนาดจำกัด
        # ใน Python ไม่ล้นอยู่แล้ว แต่เขียนให้ถูกหลักไว้ เพราะเป็นท่ามาตรฐาน
        middle = low + (high - low) // 2
        current = sorted_items[middle]["code"]

        if current == code:
            return sorted_items[middle]

        if current < code:
            # ตัวกลางน้อยกว่าที่หา ของที่หาต้องอยู่ทางขวา
            low = middle + 1
        else:
            high = middle - 1

    return None


def hash_lookup(table, code: str):
    """ค้นผ่านตารางแฮชที่ Kim เขียน — O(1) โดยเฉลี่ย

    table คือออบเจ็กต์ HashTable จาก hash_table.py ส่งเข้ามาทางพารามิเตอร์
    ไม่ได้ import เพราะกฎ stdlib ที่หัวไฟล์ (ดูคำอธิบายด้านบน)

    ทำไมเป็น O(1) "เฉลี่ย" ไม่ใช่ทุกกรณี: ตารางแฮชคำนวณว่า key ควรอยู่ถังไหน
    แล้วไปหยิบจากถังนั้นเลย ถ้าถังนั้นมีของชิ้นเดียวก็จบใน 1 ครั้ง
    แต่ถ้า key หลายตัวคำนวณได้ถังเดียวกัน (ชนกัน) ถังนั้นจะยาวขึ้นและต้องไล่ในถัง
    กรณีแย่สุดคือทุก key ตกถังเดียวกันหมด ซึ่งจะกลายเป็น O(n) เท่า linear search
    """
    return table.get(code)


def search_by_name(items: list, keyword: str) -> list:
    """ค้นจากชื่อบางส่วน คืน "ทุก" ตัวที่ตรง — O(n)

    ต้องคืนเป็น list ไม่ใช่ตัวเดียว เพราะชื่อซ้ำกันได้จริงในร้าน
    (ชุดข้อมูล B มีไว้พิสูจน์ข้อนี้โดยเฉพาะ: ชื่อซ้ำเป็นคู่ แต่ code ไม่ซ้ำ)
    ถ้าคืนตัวแรกที่เจอเหมือน linear_search ผู้ใช้จะได้ของผิดชิ้นโดยไม่รู้ตัว
    ซึ่งแปลว่าปล่อยเช่าผิดชิ้น และของอีกชิ้นจะหายไปจากระบบเงียบๆ

    ค้นแบบนี้ใช้ตารางแฮชไม่ได้ เพราะแฮชต้องการ key ที่ตรงเป๊ะทั้งตัว
    "กล้อง" กับ "กล้อง รุ่นที่ 5" คำนวณได้คนละถังโดยสิ้นเชิง
    """
    if not keyword:
        return []

    needle = keyword.strip().lower()
    found = []

    for item in items:
        if needle in item["name"].lower():
            found.append(item)

    return found


def sort_by_code(items: list) -> list:
    """เรียงตาม code เพื่อเตรียมให้ binary_search

    ใช้ sorted() ของ Python ตรงนี้ได้ เพราะการเรียงไม่ใช่อัลกอริทึมที่ไฟล์นี้
    ต้องพิสูจน์ (เป็นงานของ Kul ใน sort_group.py) ตรงนี้แค่เตรียมข้อมูล
    ตอนวัดเวลา การเรียงจึงต้องทำ "ก่อน" เริ่มจับเวลาเสมอ ไม่งั้นจะกลายเป็น
    การวัดเวลาเรียง + ค้น แล้ว binary search จะดูแพ้ทั้งที่ไม่ได้ช้า

    คืน list ใหม่ ไม่แก้ของเดิม เพราะคนอื่นถือ list ใบเดียวกันอยู่
    """
    return sorted(items, key=lambda item: item["code"])


def find_due_before(sorted_by_due: list, limit_date: str) -> list:
    """หาทุกรายการที่ครบกำหนดคืน "ก่อน" วันที่กำหนด — O(log n + k)

    นี่คือคำถามที่ร้านถามจริงทุกเช้า และเป็นเหตุผลว่าทำไมยังต้องมี binary search
    ทั้งที่ตารางแฮชเร็วกว่า: แฮชตอบคำถามแบบ "เป็นช่วง" ไม่ได้เลย

    วิธี: ใช้การตัดครึ่งหาขอบซ้ายสุดที่ due_date >= limit_date ด้วย O(log n)
    แล้วตัดเอาทุกตัวก่อนหน้านั้น ซึ่งคือคำตอบทั้งก้อน
    k คือจำนวนคำตอบ ซึ่งต้องเสียเวลาก็อปออกมาอยู่แล้วไม่ว่าใช้วิธีไหน

    sorted_by_due ต้องเรียงตาม due_date แล้ว และต้องไม่มี None ปนอยู่
    (ของที่ไม่มีใครยืมไม่มีกำหนดคืน จึงไม่ควรอยู่ในรายการนี้ตั้งแต่ต้น)
    """
    low = 0
    high = len(sorted_by_due)

    # หาตำแหน่งแรกสุดที่ due_date >= limit_date
    # สังเกตว่า high เริ่มที่ len ไม่ใช่ len-1 เพราะคำตอบอาจเป็น "ท้ายสุด"
    # คือไม่มีตัวไหนถึงเกณฑ์เลย ทุกตัวจึงเข้าเงื่อนไขทั้งหมด
    while low < high:
        middle = low + (high - low) // 2

        if sorted_by_due[middle]["due_date"] < limit_date:
            low = middle + 1
        else:
            high = middle

    return sorted_by_due[:low]


# ---------------------------------------------------------------------------
# ส่วนที่ 2 — การนับ
#
# ทุกตัวเป็น O(n) เพราะต้องดูทุกชิ้นถึงจะนับได้ ไม่มีทางลัด
# การนับต่างจากการค้นตรงที่ไม่มี "ตัวที่ใช่" ให้หยุด จึงข้ามตัวไหนไม่ได้เลย
# ---------------------------------------------------------------------------


def count_available(items: list) -> int:
    """นับจำนวน "ชิ้น" ที่ยังอยู่บนชั้นทั้งร้าน — O(n)

    นับเป็นชิ้น ไม่ใช่นับจำนวนรายการ เพราะหนึ่งรายการมีได้หลายชิ้น
    (กล้องรุ่นเดียวกัน 5 ตัว = 1 รายการ 5 ชิ้น)
    ตัวเลขนี้คือเลขที่ขึ้นบนแถบสถานะของหน้า workspace ในตัวเว็บ

    ของชำรุดไม่นับ ถึงจะยังวางอยู่บนชั้นก็ปล่อยเช่าไม่ได้
    ถ้านับรวม หน้าเว็บจะบอกว่ามีของว่าง 3 ชิ้นแต่กดปล่อยเช่าไม่ได้สักชิ้น
    """
    total = 0

    for item in items:
        if item["status"] != "broken":
            total += item["available"]

    return total


def count_by_status(items: list) -> dict:
    """นับจำนวน "รายการ" แยกตามสถานะ — O(n)

    คืนคีย์ครบทั้งสามเสมอ แม้ค่าจะเป็น 0 เพราะถ้าคีย์หายไปเฉยๆ
    คนที่เอาไปใช้ต่อต้องเขียน .get() ดักทุกที่ ซึ่งจะมีคนลืมสักที่แน่นอน

    เดินผ่านข้อมูลรอบเดียวได้ทั้งสามตัวเลข ไม่ใช่วนสามรอบแยกกัน
    ผลลัพธ์เท่ากันแต่วนรอบเดียวอ่านข้อมูลน้อยกว่าสามเท่า
    """
    counts = {"ok": 0, "out": 0, "broken": 0}

    for item in items:
        status = item["status"]
        if status in counts:
            counts[status] += 1

    return counts


def count_overdue(items: list, today: str) -> int:
    """นับรายการที่เลยกำหนดคืนแล้ว — O(n)

    today ส่งเข้ามาเป็นข้อความ "YYYY-MM-DD" ไม่ได้อ่านวันจริงจากเครื่อง
    เพราะตัวเลขในรายงานต้องเท่าเดิมทุกครั้งที่รัน ไม่ใช่เปลี่ยนไปทุกวัน
    (datasets.py ตรึงวันอ้างอิงไว้ที่ TODAY ให้แล้ว)

    เทียบวันด้วยการเทียบข้อความได้เลย เพราะรูปแบบ YYYY-MM-DD เรียงจาก
    หน่วยใหญ่ไปหน่วยเล็ก "2026-09-26" < "2026-10-01" เป็นจริงทั้งในเชิง
    ข้อความและเชิงวันที่ ถ้าเก็บเป็น "26/09/2026" ข้อนี้จะไม่จริงทันที

    ของที่คืนแล้วไม่มี due_date (เป็น None) จึงต้องข้ามก่อนเทียบ
    ไม่งั้นจะเทียบ None กับข้อความแล้ว Python จะโยน TypeError ทิ้ง
    """
    count = 0

    for item in items:
        due = item["due_date"]
        if due is not None and due < today:
            count += 1

    return count


# ---------------------------------------------------------------------------
# ส่วนที่ 3 — เครื่องมือวัดเวลา
#
# ใช้วิธีเดียวกับ hash_table.py ของ Kim (perf_counter เฉลี่ย 3 รอบ)
# ตัวเลขของสองไฟล์จะได้อ่านเทียบกันได้ในรายงานฉบับเดียว
# ---------------------------------------------------------------------------

ROUNDS = 3  # รันซ้ำกี่รอบแล้วเฉลี่ย — กันจังหวะที่เครื่องไปทำอย่างอื่นชั่วคราว


def measure(operation, rounds: int = ROUNDS) -> float:
    """วัดเวลาเฉลี่ยของ operation หน่วยเป็นมิลลิวินาที

    ใช้ time.perf_counter() ไม่ใช่ time.time() เพราะ perf_counter เป็นนาฬิกา
    ความละเอียดสูงที่ทำมาเพื่อวัดช่วงเวลาสั้นๆ และไม่กระโดดเวลาเครื่องปรับนาฬิกา
    """
    durations = []

    for _ in range(rounds):
        started_at = time.perf_counter()
        operation()
        durations.append(time.perf_counter() - started_at)

    return sum(durations) / len(durations) * 1000


def lookup_order(items: list) -> list:
    """คืนลำดับ code ที่จะใช้ค้น — สลับแบบตายตัวโดยไม่ต้องสุ่ม

    ทำไมต้องสลับ: ถ้าไล่ค้นตามลำดับเดิม linear_search จะเจอที่ตำแหน่งต้นๆ
    เกือบทุกครั้ง ซึ่งเป็นกรณีดีที่สุดของมัน ตัวเลขจะสวยเกินจริงและสรุปผิด
    ว่า linear ไม่ได้ช้าอย่างที่ Big-O บอก

    ใช้การเดินข้ามทีละ 7 ช่อง (7 เป็นจำนวนเฉพาะ จึงวนครบทุกตำแหน่งพอดี
    ก่อนจะกลับมาซ้ำ) แทน random.shuffle เพื่อให้ได้ลำดับเดิมทุกครั้ง
    โดยไม่ต้อง import random เพิ่ม
    """
    size = len(items)
    return [items[(index * 7) % size]["code"] for index in range(size)]


def benchmark_search(items: list, table=None) -> dict:
    """วัดเวลา "ค้นทุก code หนึ่งครั้ง" ของแต่ละวิธี บนข้อมูลชุดเดียวกัน

    table ส่งเข้ามาได้ถ้ามี HashTable ของ Kim อยู่ใน namespace แล้ว
    ถ้าไม่ส่ง จะวัดแค่ linear กับ binary — ไฟล์นี้จึงรันลำพังได้

    การเรียงทำก่อนเริ่มจับเวลา เพราะในระบบจริง list ที่เรียงแล้วถูกเก็บไว้
    และใช้ซ้ำได้หลายพันครั้ง ไม่ได้เรียงใหม่ทุกครั้งที่มีคนค้น
    ถ้านับเวลาเรียงเข้าไปด้วย จะเป็นการวัดคนละอย่างกับที่ระบบทำจริง
    """
    codes = lookup_order(items)
    sorted_items = sort_by_code(items)

    def with_linear():
        for code in codes:
            linear_search(items, code)

    def with_binary():
        for code in codes:
            binary_search(sorted_items, code)

    results = {
        "linear": measure(with_linear),
        "binary": measure(with_binary),
    }

    if table is not None:

        def with_hash():
            for code in codes:
                hash_lookup(table, code)

        results["hash"] = measure(with_hash)

    return results


def print_table(title: str, rows: list) -> None:
    """พิมพ์ผลเป็นตารางอ่านง่าย — rows คือ list ของ tuple

    (ชื่อชุด, จำนวนข้อมูล, เวลา linear, เวลา binary, เวลา hash หรือ None)
    """
    print()
    print(title)
    print("-" * 78)
    print(
        f"{'ชุด':>5} {'จำนวน':>9} {'linear (ms)':>14} {'binary (ms)':>14}"
        f" {'hash (ms)':>12} {'เร็วขึ้น':>10}"
    )
    print("-" * 78)

    for name, size, linear_ms, binary_ms, hash_ms in rows:
        speedup = linear_ms / binary_ms if binary_ms > 0 else 0
        hash_text = f"{hash_ms:>12.3f}" if hash_ms is not None else f"{'-':>12}"
        print(
            f"{name:>5} {size:>9,} {linear_ms:>14.3f} {binary_ms:>14.3f}"
            f" {hash_text} {speedup:>9.1f}x"
        )

    print("-" * 78)


# ---------------------------------------------------------------------------
# ส่วนที่ 4 — ข้อมูลตัวอย่างของไฟล์นี้เอง
#
# ชุดข้อมูล A-D ที่ใช้ส่งงานจริงอยู่ที่ datasets.py — เรียก make_dataset()
# ฟังก์ชันข้างล่างนี้มีไว้ให้ก็อปไฟล์เดียวไปวางใน Colab แล้วกดรันได้ทันที
# โดยไม่ต้องพาไฟล์อื่นไปด้วย ตัวเลขในรายงานต้องมาจาก datasets.py เท่านั้น
# ---------------------------------------------------------------------------

SAMPLE_TODAY = "2026-10-01"


def make_sample_items(count: int) -> list:
    """สร้างรายการจำลอง count ชิ้น — รูปแบบเดียวกับที่ datasets.py ผลิต

    ไม่สุ่มเลย เดินเป็นแบบแผนตายตัว จึงได้ข้อมูลเดิมทุกครั้งโดยไม่ต้องใส่ seed
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
                # สลับกันระหว่างเลยกำหนดกับยังไม่ถึงกำหนด
                "due_date": ("2026-09-20" if number % 3 == 0 else "2026-10-20") if borrowed > 0 else None,
                "status": "broken" if number % 7 == 0 else ("out" if available == 0 else "ok"),
            }
        )

    return items


# ---------------------------------------------------------------------------
# ส่วนที่ 5 — ตรวจว่าทุกฟังก์ชันทำงานถูก
# ---------------------------------------------------------------------------


def verify() -> None:
    """ตรวจผลของทุกฟังก์ชัน ถ้าไม่ตรงให้ล้มทันที

    จุดที่ตั้งใจตรวจเป็นพิเศษคือ binary_search ต้องให้คำตอบ "ตรงกับ"
    linear_search ทุกตัว ถ้าสองตัวนี้ตอบไม่ตรงกัน แปลว่าตัวใดตัวหนึ่งผิด
    และการเทียบเวลาในรายงานก็ไม่มีความหมาย เพราะเทียบของที่ทำงานคนละอย่าง
    """
    items = make_sample_items(40)
    sorted_items = sort_by_code(items)

    # binary ต้องตอบเหมือน linear ทุกตัว รวมถึงตัวที่ไม่มีอยู่จริงด้วย
    for item in items:
        assert binary_search(sorted_items, item["code"]) == linear_search(items, item["code"])

    for missing in ("ไม่มีจริง", "CAM-9999", "", "AAA-0001", "ZZZ-9999"):
        assert linear_search(items, missing) is None
        assert binary_search(sorted_items, missing) is None, f"binary หา {missing!r} แล้วต้องไม่เจอ"

    # ขอบของ list — ตัวแรกสุดและตัวท้ายสุดคือจุดที่ off-by-one ชอบโผล่
    assert binary_search(sorted_items, sorted_items[0]["code"]) == sorted_items[0]
    assert binary_search(sorted_items, sorted_items[-1]["code"]) == sorted_items[-1]

    # list ว่างและ list ที่มีตัวเดียว ต้องไม่ระเบิด
    assert binary_search([], "CAM-0001") is None
    single = [sorted_items[0]]
    assert binary_search(single, single[0]["code"]) == single[0]
    assert binary_search(single, "ZZZ-0000") is None

    # ค้นด้วยชื่อ ต้องได้ทุกตัวที่ตรง ไม่ใช่ตัวแรกที่เจอ
    duplicates = [
        {"code": "CAM-0001", "name": "กล้อง A", "category": "กล้อง", "total": 1,
         "available": 1, "borrower": None, "due_date": None, "status": "ok"},
        {"code": "CAM-0002", "name": "กล้อง A", "category": "กล้อง", "total": 1,
         "available": 0, "borrower": "ก", "due_date": "2026-09-01", "status": "out"},
    ]
    found = search_by_name(duplicates, "กล้อง A")
    assert len(found) == 2, "ชื่อซ้ำต้องคืนครบทุกตัว"
    assert {row["code"] for row in found} == {"CAM-0001", "CAM-0002"}
    assert search_by_name(duplicates, "") == []
    assert search_by_name(duplicates, "ไม่มีชื่อนี้") == []

    # นับของว่าง — ของชำรุดต้องไม่ถูกนับรวม
    hand_counted = sum(item["available"] for item in items if item["status"] != "broken")
    assert count_available(items) == hand_counted
    assert count_available([]) == 0

    # นับตามสถานะ — ผลรวมต้องเท่าจำนวนรายการทั้งหมด และมีครบสามคีย์เสมอ
    counts = count_by_status(items)
    assert set(counts) == {"ok", "out", "broken"}
    assert sum(counts.values()) == len(items)
    assert count_by_status([]) == {"ok": 0, "out": 0, "broken": 0}

    # นับของเลยกำหนด
    hand_overdue = sum(
        1 for item in items if item["due_date"] is not None and item["due_date"] < SAMPLE_TODAY
    )
    assert count_overdue(items, SAMPLE_TODAY) == hand_overdue
    assert count_overdue([], SAMPLE_TODAY) == 0

    # คำถามแบบเป็นช่วง — ตัวที่พิสูจน์ว่าทำไมยังต้องมี binary search
    with_due = sorted(
        [item for item in items if item["due_date"] is not None],
        key=lambda item: item["due_date"],
    )
    early = find_due_before(with_due, SAMPLE_TODAY)
    assert all(item["due_date"] < SAMPLE_TODAY for item in early)
    assert len(early) == hand_overdue, "หาแบบช่วงต้องได้จำนวนเท่ากับการนับทีละตัว"
    assert find_due_before(with_due, "2000-01-01") == []
    assert len(find_due_before(with_due, "2999-12-31")) == len(with_due)

    print("ตรวจฟังก์ชันค้นหาและนับ ผ่านทั้งหมด")


# ---------------------------------------------------------------------------
# ส่วนที่ 6 — รันเพื่อดูผล
# ---------------------------------------------------------------------------


def main() -> None:
    print("=" * 78)
    print("การค้นหาและการนับ — LEBIS (งานของ Neo)")
    print("=" * 78)

    verify()

    items = make_sample_items(20)
    print()
    print("ตัวอย่างผลการนับ บนข้อมูลตัวอย่าง 20 รายการ")
    print("-" * 78)
    print(f"    ของว่างบนชั้น        {count_available(items)} ชิ้น")
    print(f"    แยกตามสถานะ          {count_by_status(items)}")
    print(f"    เลยกำหนดคืน          {count_overdue(items, SAMPLE_TODAY)} รายการ")

    # วัดเวลาบนขนาดที่ต่างกัน ให้เห็นว่า linear แย่ลงเร็วแค่ไหนเมื่อข้อมูลโต
    # ตัวเลขจริงที่ใช้ในรายงานต้องมาจากชุด A-D ของ datasets.py
    rows = []
    for size in (10, 100, 1000):
        sample = make_sample_items(size)
        result = benchmark_search(sample)
        rows.append((str(size), size, result["linear"], result["binary"], None))

    print_table("เวลาค้นครบทุก code หนึ่งรอบ (เฉลี่ย 3 รอบ) — ข้อมูลตัวอย่างของไฟล์นี้", rows)

    print()
    print("อ่านตารางนี้ยังไง")
    print("-" * 78)
    print("    ข้อมูลโตขึ้น 10 เท่า linear ใช้เวลาโตขึ้นประมาณ 100 เท่า")
    print("    เพราะทั้งจำนวนครั้งที่ค้นและความยาวที่ต้องไล่ โตขึ้นอย่างละ 10 เท่า")
    print("    ส่วน binary โตขึ้นแค่ประมาณ 10 เท่า เพราะแต่ละครั้งยังใช้การเทียบ")
    print("    เพิ่มขึ้นแค่ 3-4 ครั้งเท่านั้น (log2 ของ 10 เท่า)")
    print()
    print("    ตัวเลขที่ใช้ในรายงานจริงต้องมาจากชุด A-D ของ datasets.py")
    print("    วิธีรันใน Colab: วางเซลล์ datasets -> hash_table -> ไฟล์นี้")
    print("    แล้วเรียก benchmark_search(make_dataset('D'), build_hash_table(...))")


if __name__ == "__main__":
    main()
