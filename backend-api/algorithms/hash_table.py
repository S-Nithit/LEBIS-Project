"""ตารางแฮชเขียนเอง (hash table) — งานส่งวิชา Data Structures & Algorithms ของ Kim

ใช้ในระบบ LEBIS เพื่อค้นอุปกรณ์จากรหัส (code) ให้เร็วขึ้น
จากเดิมที่ต้องวนดูทั้งรายการทีละชิ้น

🔴 กฎเหล็กของไฟล์นี้: import ได้แค่ standard library ของ Python เท่านั้น
   ห้าม FastAPI ห้าม databases ห้าม Pydantic ห้าม import ไฟล์อื่นในโปรเจกต์
   เพราะไฟล์เดียวกันนี้ถูกก็อปไปวางใน Google Colab แล้วต้องกดรันได้ทันที

วิธีรัน
    python3 backend-api/algorithms/hash_table.py

สิ่งที่ต้องรู้ก่อนอ่านโค้ด
    ตารางแฮชคือการ "คำนวณ" ว่าข้อมูลควรอยู่ช่องไหน แทนการ "ไล่หา" ทีละช่อง
    พอรู้ช่องได้จากการคำนวณ เวลาค้นจึงไม่ขึ้นกับว่ามีข้อมูลทั้งหมดกี่ชิ้น
"""

import random
import time

# ---------------------------------------------------------------------------
# ส่วนที่ 1 — ตารางแฮช
# ---------------------------------------------------------------------------


class HashTable:
    """ตารางแฮชที่เขียนเองทั้งหมด แก้การชนด้วยการต่อโซ่ (chaining)

    ที่เก็บข้อมูลจริงคือ list ของ list ชื่อ self._buckets
    ไม่ได้ใช้ dict ของ Python เป็นที่เก็บ (ใช้ dict ก็คือให้ Python ทำงานให้
    ซึ่งไม่ใช่โจทย์ของวิชานี้) โครงหน้าตาประมาณนี้

        self._buckets = [
            [],                                    <- ถังที่ 0 ว่าง
            [("CAM-01", {...}), ("LEN-07", {...})], <- ถังที่ 1 มี 2 ตัว = ชนกัน
            [("TRI-03", {...})],                   <- ถังที่ 2 มี 1 ตัว
            ...
        ]

    แต่ละถัง (bucket) เก็บคู่ (key, value) เป็น tuple ต่อกันเป็นโซ่
    """

    # ค่าเริ่มต้นของจำนวนถัง ใช้เลขยกกำลังสองเพื่อให้เห็นการขยายชัดๆ (8 -> 16 -> 32)
    INITIAL_CAPACITY = 8

    # เกินค่านี้แล้วขยายตาราง — ที่มาของเลข 0.7 อธิบายไว้ที่ _resize()
    MAX_LOAD_FACTOR = 0.7

    # ฐานของ polynomial rolling hash (เหตุผลที่เลือก 31 อยู่ใน _hash())
    HASH_BASE = 31

    # จำนวนเฉพาะขนาดใหญ่ ใช้มอดเพื่อไม่ให้เลขโตจนคำนวณช้า
    HASH_MODULUS = 1_000_000_007

    def __init__(self, capacity: int = INITIAL_CAPACITY):
        # ที่เก็บข้อมูลจริง: list ของ list
        self._buckets = [[] for _ in range(capacity)]

        # จำนวนคู่ข้อมูลที่เก็บอยู่จริง (ไม่ใช่จำนวนถัง)
        self._size = 0

        # ตัวนับไว้เขียนรายงาน — นับเฉพาะตอน insert ของผู้ใช้
        # ไม่นับตอน rehash ภายใน ไม่งั้นตัวเลขจะพุ่งเกินความจริง
        self.collisions = 0
        self.resize_count = 0

    # -- ฟังก์ชันแฮช ------------------------------------------------------

    def _hash(self, key) -> int:
        """แปลง key เป็นเลขถัง ด้วยวิธี polynomial rolling hash

        สูตร: h = (((c1 * 31 + c2) * 31 + c3) * 31 + ...) % ตัวมอด
        แล้วค่อยเอา % จำนวนถัง เพื่อให้ได้เลขที่อยู่ในช่วงถังที่มีอยู่จริง

        ทำไมเลือกวิธีนี้ (ไม่ใช่แค่บวก ord ของทุกตัวอักษรรวมกัน)
          1. ตำแหน่งของตัวอักษรมีผลต่อผลลัพธ์ — "CAM-01" กับ "10-MAC" ได้ค่าต่างกัน
             ถ้าใช้วิธีบวกเฉยๆ คำที่สลับตัวอักษรกันจะได้ค่าเท่ากันหมด
             แล้วรหัสอุปกรณ์ของร้านเช่ามักต่างกันแค่การสลับตัวเลขท้าย
             (CAM-01 · CAM-10) ซึ่งจะชนกันรัวๆ
          2. คำนวณเร็ว วนตัวอักษรรอบเดียว = O(ความยาวของ key)
             ไม่ต้องยกกำลังจริง เพราะคูณฐานสะสมไปเรื่อยๆ (นี่คือความหมายของ rolling)
          3. ฐาน 31 เป็นจำนวนเฉพาะที่เล็กพอให้คูณเร็ว และใหญ่พอให้ค่ากระจาย
             เป็นค่าที่ไลบรารีจริงหลายตัวใช้ (เช่น String.hashCode ของ Java)
          4. มอดด้วยจำนวนเฉพาะใหญ่ (1e9+7) กัน int โตไม่จำกัด
             Python คำนวณเลขใหญ่ได้ แต่ยิ่งใหญ่ยิ่งช้า
        """
        # คิดบนรูปข้อความของ key — ในระบบ LEBIS key คือรหัสอุปกรณ์ซึ่งเป็นข้อความอยู่แล้ว
        #
        # ข้อจำกัดที่ต้องรู้: ตารางนี้ "เทียบ" key ด้วย == แต่ "แฮช" จากข้อความ
        # ปกติสองอย่างนี้ต้องสอดคล้องกัน คือ key ที่เท่ากันต้องแฮชลงถังเดียวกัน
        # ซึ่งจริงเสมอสำหรับข้อความ แต่ไม่จริงกับบางชนิดของ Python เช่น
        # 1 == True เป็นจริง แต่ str(1) = "1" กับ str(True) = "True" ต่างกัน
        # ตารางจะมองเป็นสอง key แยกกัน (dict ของ Python มองเป็น key เดียว)
        # จึงควรใช้ key ชนิดเดียวกันทั้งตาราง — ของเราใช้ข้อความล้วน
        text = str(key)

        hash_value = 0
        for character in text:
            hash_value = (hash_value * self.HASH_BASE + ord(character)) % self.HASH_MODULUS

        return hash_value % len(self._buckets)

    # -- เพิ่ม / อ่าน / ลบ -------------------------------------------------

    def insert(self, key, value) -> None:
        """ใส่คู่ (key, value) — key เดิมซ้ำถือว่าแก้ค่าทับ ไม่ใช่เพิ่มตัวใหม่

        เรื่อง "การชน" (collision)
            การชนคือสถานการณ์ที่ key ต่างกัน แต่ _hash() คำนวณได้เลขถังเดียวกัน
            เป็นเรื่องที่เลี่ยงไม่ได้ เพราะ key มีได้ไม่จำกัดแบบ แต่ถังมีจำกัด
            (ต่อให้ฟังก์ชันแฮชดีแค่ไหน ใส่ของ 9 ชิ้นลงตาราง 8 ถัง ก็ต้องมีถัง
            ที่ได้ของ 2 ชิ้นอยู่แล้ว)

            วิธีแก้ในไฟล์นี้คือ chaining — ต่อโซ่: ถังหนึ่งเก็บได้หลายคู่
            โดยเก็บเป็น list ต่อกันไป ตอนค้นก็ไปที่ถังนั้นแล้วไล่ดูในโซ่สั้นๆ
            (อีกวิธีที่นิยมคือ open addressing ที่เลื่อนไปหาถังว่างถัดไป
            แต่ chaining อ่านง่ายกว่าและลบข้อมูลตรงไปตรงมากว่า)
        """
        index = self._hash(key)
        bucket = self._buckets[index]

        # key เดิมมีอยู่แล้วหรือยัง — ถ้ามีก็แก้ค่าทับ จำนวนข้อมูลไม่เพิ่ม
        for position, (existing_key, _existing_value) in enumerate(bucket):
            if existing_key == key:
                bucket[position] = (key, value)
                return

        # มาถึงบรรทัดนี้แปลว่าเป็น key ใหม่
        # ถ้าถังไม่ว่างอยู่แล้ว = ชน (นับไว้เขียนรายงาน)
        if len(bucket) > 0:
            self.collisions += 1

        bucket.append((key, value))
        self._size += 1

        # ใส่เสร็จแล้วค่อยเช็กว่าตารางแน่นเกินไปมั้ย
        if self.load_factor() > self.MAX_LOAD_FACTOR:
            self._resize()

    def get(self, key):
        """คืน value ของ key นั้น ถ้าไม่มีคืน None

        ไปที่ถังที่คำนวณได้ทันที (ไม่ต้องไล่ทุกถัง) แล้วไล่ดูในโซ่ของถังนั้น
        """
        bucket = self._buckets[self._hash(key)]

        for existing_key, existing_value in bucket:
            if existing_key == key:
                return existing_value

        return None

    def delete(self, key) -> bool:
        """ลบ key ออก คืน True ถ้าลบสำเร็จ คืน False ถ้าไม่มี key นั้นอยู่ตั้งแต่แรก"""
        bucket = self._buckets[self._hash(key)]

        for position, (existing_key, _existing_value) in enumerate(bucket):
            if existing_key == key:
                bucket.pop(position)
                self._size -= 1
                return True

        return False

    # -- การขยายตาราง ------------------------------------------------------

    def load_factor(self) -> float:
        """ความแน่นของตาราง = จำนวนข้อมูล ÷ จำนวนถัง

        ค่านี้คือความยาวเฉลี่ยของโซ่ในแต่ละถัง ซึ่งคือจำนวนครั้งที่ต้องเทียบ
        โดยเฉลี่ยตอนค้นหา — เลยเป็นตัวเลขที่บอกว่าตารางยัง "เร็ว" อยู่มั้ย
        """
        return self._size / len(self._buckets)

    def _resize(self) -> None:
        """ขยายจำนวนถังเป็น 2 เท่า แล้วคำนวณตำแหน่งใหม่ให้ข้อมูลทุกตัว (rehash)

        ทำไมต้องขยายตอน load factor เกิน 0.7
            load factor คือความยาวเฉลี่ยของโซ่ ปล่อยให้แน่นขึ้นเรื่อยๆ โซ่จะยาวขึ้น
            การค้นก็ค่อยๆ กลายเป็นการไล่ดูทีละตัวเหมือน list ธรรมดา
            0.7 เป็นค่าที่ใช้กันทั่วไปเพราะอยู่ตรงกลางระหว่างสองอย่างที่ขัดกัน
              - ตั้งต่ำเกิน (เช่น 0.2) ตารางโปร่งแต่กินหน่วยความจำเยอะ และขยายบ่อย
              - ตั้งสูงเกิน (เช่น 0.95) ประหยัดที่แต่โซ่ยาว ค้นช้า

        ทำไมต้องคำนวณตำแหน่งใหม่ทุกตัว
            เลขถังมาจาก hash % จำนวนถัง — พอจำนวนถังเปลี่ยน ผลของ % ก็เปลี่ยน
            ถ้าย้ายของเฉยๆ โดยไม่คำนวณใหม่ จะหาของไม่เจออีกเลย

        การขยายมีต้นทุน O(n) หนึ่งครั้ง แต่เกิดนานๆ ครั้ง (ทุกครั้งที่ข้อมูล
        เพิ่มเป็นเท่าตัว) เฉลี่ยต่อการ insert หนึ่งครั้งจึงยังถือเป็น O(1)
        ศัพท์ของเรื่องนี้เรียกว่า amortized O(1)
        """
        old_buckets = self._buckets

        self._buckets = [[] for _ in range(len(old_buckets) * 2)]
        self.resize_count += 1

        # ใส่ของกลับเข้าตารางใหม่ — ไม่แตะตัวนับ collisions เพราะไม่ใช่การชน
        # ที่เกิดจากการใช้งานของผู้ใช้ แต่เป็นงานบ้านภายในของตาราง
        for bucket in old_buckets:
            for key, value in bucket:
                self._buckets[self._hash(key)].append((key, value))

    # -- ข้อมูลทั่วไปของตาราง ---------------------------------------------

    def __len__(self) -> int:
        """ให้ len(table) ใช้ได้ — คืนจำนวนคู่ข้อมูล ไม่ใช่จำนวนถัง"""
        return self._size

    def keys(self) -> list:
        """คืน key ทั้งหมดเป็น list

        ลำดับที่ได้เป็นลำดับของถัง ไม่ใช่ลำดับที่ใส่เข้ามา — ตารางแฮช
        ไม่รับประกันลำดับ ถ้าต้องการเรียงให้เอาไปเรียงเองข้างนอก
        """
        collected = []
        for bucket in self._buckets:
            for key, _value in bucket:
                collected.append(key)
        return collected

    def stats(self) -> dict:
        """ตัวเลขสถานะของตาราง ไว้ใส่รายงาน"""
        chain_lengths = [len(bucket) for bucket in self._buckets]
        used_buckets = sum(1 for length in chain_lengths if length > 0)

        return {
            "จำนวนข้อมูล": self._size,
            "จำนวนถัง": len(self._buckets),
            "ถังที่ถูกใช้": used_buckets,
            "load factor": round(self.load_factor(), 3),
            "ชนทั้งหมด": self.collisions,
            "ขยายตาราง": self.resize_count,
            "โซ่ที่ยาวสุด": max(chain_lengths) if chain_lengths else 0,
        }


# ---------------------------------------------------------------------------
# ส่วนที่ 2 — ความเร็ว: ทำไมบอกว่า O(1) เป็นค่าเฉลี่ย ไม่ใช่กรณีแย่สุด
#
# ค้นหาในตารางแฮช
#   กรณีเฉลี่ย O(1) — คำนวณเลขถังครั้งเดียว (ไม่ขึ้นกับ n) แล้วไล่โซ่ในถังนั้น
#                     ความยาวโซ่เฉลี่ย = load factor ซึ่งถูกกดไว้ไม่เกิน 0.7
#                     ด้วยการขยายตาราง เลยถือเป็นค่าคงที่ ไม่โตตาม n
#   กรณีแย่สุด O(n) — ถ้าทุก key ไปกองอยู่ถังเดียวกัน ตารางจะเหลือโซ่เส้นเดียว
#                     ยาว n ตัว การค้นก็กลายเป็นการไล่ดูทีละตัวเหมือน list
#
# กรณีแย่สุดเกิดขึ้นเมื่อไหร่จริงๆ
#   1. ฟังก์ชันแฮชแย่ เช่นเขียน return 0 หรือใช้ len(key) เป็นเลขถัง
#      (รหัสอุปกรณ์ยาวเท่ากันหมดก็ได้ถังเดียวกันหมด)
#   2. ไม่ขยายตาราง — ข้อมูลเพิ่มแต่ถังเท่าเดิม โซ่ยาวขึ้นเรื่อยๆ
#   3. ข้อมูลที่จงใจเลือกมาให้ชน (algorithmic complexity attack) คนที่รู้สูตรแฮช
#      ของเราสามารถคิด key ที่แฮชลงถังเดียวกันทั้งหมดได้ ของจริงจึงผสมค่าสุ่ม
#      (salt/seed) ลงในฟังก์ชันแฮช — Python เองก็ทำ ดู PYTHONHASHSEED
#
# สรุปคือ O(1) ไม่ได้มาฟรี มันมาจากฟังก์ชันแฮชที่กระจายดี + การขยายตาราง
# ขาดข้อใดข้อหนึ่งก็ไหลลงไปเป็น O(n)
# ---------------------------------------------------------------------------


def find_with_list_scan(items: list, code: str):
    """วิธีที่ 1 — ไล่ดูทีละตัวใน list (linear search) O(n)"""
    for item in items:
        if item["code"] == code:
            return item
    return None


def delete_with_list_scan(items: list, code: str) -> bool:
    """ลบออกจาก list — ต้องไล่หาตำแหน่งก่อน แล้วค่อยลบ O(n)"""
    for position, item in enumerate(items):
        if item["code"] == code:
            items.pop(position)
            return True
    return False


def build_hash_table(items: list) -> HashTable:
    """ยกข้อมูลทั้งชุดใส่ตารางแฮชที่เราเขียน โดยใช้ code เป็น key"""
    table = HashTable()
    for item in items:
        table.insert(item["code"], item)
    return table


def build_python_dict(items: list) -> dict:
    """วิธีที่ 3 — dict ของ Python ไว้เป็นตัวเทียบว่าของเราห่างจากของจริงแค่ไหน"""
    return {item["code"]: item for item in items}


# ---------------------------------------------------------------------------
# ส่วนที่ 3 — เครื่องมือวัดเวลา
# ---------------------------------------------------------------------------

ROUNDS = 3  # รันซ้ำกี่รอบแล้วเฉลี่ย — กันจังหวะที่เครื่องไปทำอย่างอื่นชั่วคราว


def measure(operation, setup=None, rounds: int = ROUNDS) -> float:
    """วัดเวลาเฉลี่ยของ operation หน่วยเป็นมิลลิวินาที

    ใช้ time.perf_counter() ไม่ใช่ time.time() เพราะ perf_counter เป็นนาฬิกา
    ความละเอียดสูงที่ทำมาเพื่อวัดช่วงเวลาสั้นๆ และไม่กระโดดเวลาเครื่องปรับนาฬิกา

    setup คือฟังก์ชันที่เตรียมของให้ใหม่ก่อนทุกรอบ (เช่นสร้างตารางขึ้นมาใหม่
    ก่อนวัดการลบ) จุดสำคัญคือมันถูกเรียก "ก่อน" เริ่มจับเวลา เวลาที่ใช้สร้างของ
    จึงไม่ถูกนับรวมเข้าไปในผล ถ้านับรวม เราจะวัดเวลาสร้าง+ลบ ไม่ใช่เวลาลบ
    """
    durations = []

    for _ in range(rounds):
        target = setup() if setup is not None else None

        started_at = time.perf_counter()
        operation(target)
        durations.append(time.perf_counter() - started_at)

    return sum(durations) / len(durations) * 1000


def lookup_order(items: list, seed: int = 99) -> list:
    """คืนลำดับ code ที่สลับแล้ว ไว้ใช้เป็นลำดับในการค้นและลบ

    ทำไมต้องสลับ: ถ้าไล่ตามลำดับเดิม การลบออกจาก list จะกลายเป็นการลบตัวแรก
    ทุกครั้ง ซึ่งเป็น "กรณีดีที่สุด" ของ list (เจอที่ตำแหน่ง 0 ทันที)
    ตัวเลขที่ได้จะสวยเกินความจริงและสรุปผิดว่า list ลบเร็วกว่าตารางแฮช
    การสลับลำดับทำให้ตำแหน่งที่ต้องไล่หาเฉลี่ยอยู่กลาง list = กรณีทั่วไปจริงๆ

    ใส่ seed ไว้ให้ได้ลำดับเดิมทุกครั้ง ตัวเลขในรายงานจะเทียบกันได้
    """
    codes = [item["code"] for item in items]
    random.Random(seed).shuffle(codes)
    return codes


def benchmark_lookup(items: list) -> dict:
    """วัดเวลา "ค้นหาทุก key หนึ่งครั้ง" ของทั้งสามวิธี บนข้อมูลชุดเดียวกัน

    การค้นไม่ได้แก้ข้อมูล จึงสร้างของไว้ล่วงหน้าครั้งเดียว ใช้ซ้ำได้ทุกรอบ
    """
    codes = lookup_order(items)

    table = build_hash_table(items)
    python_dict = build_python_dict(items)

    def with_list(_unused):
        for code in codes:
            find_with_list_scan(items, code)

    def with_hash_table(_unused):
        for code in codes:
            table.get(code)

    def with_dict(_unused):
        for code in codes:
            python_dict.get(code)

    return {
        "list": measure(with_list),
        "hash": measure(with_hash_table),
        "dict": measure(with_dict),
        "table": table,
    }


def benchmark_delete(items: list) -> dict:
    """วัดเวลา "ลบทุก key หนึ่งครั้ง" ของทั้งสามวิธี

    การลบทำให้ข้อมูลหายไป รอบต่อไปจะเหลือของให้ลบน้อยลง เลยต้องสร้างของใหม่
    ก่อนทุกรอบผ่าน setup ของ measure() — และเวลาสร้างไม่ถูกนับเข้าไปในผล

    (list(items) คือก็อป list ชั้นนอก ตัว dict ข้างในใช้ร่วมกันได้ ไม่ได้แก้)
    """
    codes = lookup_order(items)

    def with_list(working_copy):
        for code in codes:
            delete_with_list_scan(working_copy, code)

    def with_hash_table(table):
        for code in codes:
            table.delete(code)

    def with_dict(python_dict):
        for code in codes:
            python_dict.pop(code, None)

    return {
        "list": measure(with_list, setup=lambda: list(items)),
        "hash": measure(with_hash_table, setup=lambda: build_hash_table(items)),
        "dict": measure(with_dict, setup=lambda: build_python_dict(items)),
    }


def benchmark_insert(items: list) -> dict:
    """วัดเวลา "เพิ่มของทีละชิ้นจนครบชุด" ของทั้งสามวิธี เริ่มจากที่เก็บว่าง

    ทุกวิธีต้องเช็กรหัสซ้ำก่อนใส่ เพราะนี่คือกฎจริงของร้าน (add_item ในส่วนที่ 6)
    ถ้าไม่นับการเช็กนี้ list จะดูเร็วเกินจริง — append เฉยๆ เป็น O(1)
    แต่ append ที่ต้องเช็กซ้ำก่อนคือการไล่ดูทั้ง list = O(n) ต่อชิ้น
    ร้านที่ไม่เช็กซ้ำจะมีรหัสเดียวกันสองชิ้น แล้วค้นเจอผิดตัว

    ของใหม่ถูกสร้างก่อนทุกรอบผ่าน setup เวลาสร้างที่เก็บว่างจึงไม่ถูกนับ
    เวลาของ HashTable รวมการขยายตารางไว้ด้วยแล้ว (amortized ตามจริง)
    """

    def with_list(target):
        for item in items:
            if find_with_list_scan(target, item["code"]) is None:
                target.append(item)

    def with_hash_table(table):
        for item in items:
            if table.get(item["code"]) is None:
                table.insert(item["code"], item)

    def with_dict(python_dict):
        for item in items:
            if item["code"] not in python_dict:
                python_dict[item["code"]] = item

    return {
        "list": measure(with_list, setup=list),
        "hash": measure(with_hash_table, setup=HashTable),
        "dict": measure(with_dict, setup=dict),
    }


def print_table(title: str, rows: list, first_column: str = "จำนวนข้อมูล") -> None:
    """พิมพ์ผลเป็นตารางอ่านง่าย — rows คือ list ของ tuple

    (จำนวนข้อมูล หรือชื่อชุด, เวลา list, เวลา hash, เวลา dict)
    """
    print()
    print(title)
    print("-" * 76)
    print(
        f"{first_column:>12} {'วน list (ms)':>15} {'HashTable (ms)':>16}"
        f" {'dict (ms)':>12} {'เร็วขึ้นกี่เท่า':>14}"
    )
    print("-" * 76)

    for size, list_ms, hash_ms, dict_ms in rows:
        # เร็วขึ้นกี่เท่า = เวลาของ list ÷ เวลาของ HashTable ที่เราเขียน
        speedup = list_ms / hash_ms if hash_ms > 0 else 0
        label = f"{size:,}" if isinstance(size, int) else size
        print(
            f"{label:>12} {list_ms:>15.3f} {hash_ms:>16.3f}"
            f" {dict_ms:>12.3f} {speedup:>13.1f}x"
        )

    print("-" * 76)


# ---------------------------------------------------------------------------
# ส่วนที่ 4 — ข้อมูลตัวอย่าง
#
# หมายเหตุ: ตัวสร้างชุดข้อมูล A-D ที่ใช้ส่งงานจริงอยู่ที่ algorithms/datasets.py
# (งานของ Neo) ฟังก์ชันข้างล่างนี้เป็นแค่ข้อมูลตัวอย่างเล็กๆ ของไฟล์นี้เอง
# เพื่อให้ก็อปไฟล์เดียวไปวางใน Colab แล้วกดรันได้ทันทีโดยไม่ต้องพาไฟล์อื่นไปด้วย
# ---------------------------------------------------------------------------

CATEGORIES = ["กล้อง", "เลนส์", "ขาตั้ง", "ไฟ", "ไมโครโฟน"]

CATEGORY_PREFIX = {
    "กล้อง": "CAM",
    "เลนส์": "LEN",
    "ขาตั้ง": "TRI",
    "ไฟ": "LED",
    "ไมโครโฟน": "MIC",
}


def make_sample_items(count: int, seed: int = 7) -> list:
    """สร้างรายการอุปกรณ์จำลอง count ชิ้น เป็น dict ธรรมดา

    ใส่ seed ไว้เพื่อให้ได้ข้อมูลชุดเดิมทุกครั้งที่รัน — ตัวเลขในรายงาน
    จะเทียบกันได้ระหว่างการรันแต่ละครั้ง
    """
    generator = random.Random(seed)
    items = []

    for number in range(1, count + 1):
        category = CATEGORIES[number % len(CATEGORIES)]
        total = generator.randint(1, 5)

        items.append(
            {
                "code": f"{CATEGORY_PREFIX[category]}-{number:04d}",
                "name": f"{category} รุ่นที่ {number}",
                "category": category,
                "total": total,
                # ของว่างต้องไม่เกินของทั้งหมด
                "available": generator.randint(0, total),
            }
        )

    return items


# ---------------------------------------------------------------------------
# ส่วนที่ 5 — ตัวอย่างที่รันได้เลย
# ---------------------------------------------------------------------------


def demo_basic_operations() -> None:
    """โชว์ว่า insert / get / delete / len / keys ทำงานถูกต้อง บนข้อมูล 10 ชิ้น"""
    print("=" * 76)
    print("1) การใช้งานพื้นฐาน — ข้อมูล 10 รายการ")
    print("=" * 76)

    items = make_sample_items(10)
    table = build_hash_table(items)

    print(f"ใส่ข้อมูลแล้ว {len(table)} รายการ")
    print(f"key ทั้งหมด: {sorted(table.keys())}")

    # ค้นที่มีอยู่
    found = table.get("CAM-0005")
    print(f"\nget('CAM-0005') -> {found['name']} · ของว่าง {found['available']}/{found['total']} ชิ้น")

    # ค้นที่ไม่มี ต้องได้ None ไม่ใช่ error
    print(f"get('ไม่มีรหัสนี้') -> {table.get('ไม่มีรหัสนี้')}")

    # แก้ค่าทับด้วย key เดิม จำนวนข้อมูลต้องไม่เพิ่ม
    before = len(table)
    changed = dict(found)
    changed["available"] = 0
    table.insert("CAM-0005", changed)
    print(
        f"\ninsert ด้วย key เดิม -> จำนวนข้อมูล {before} เป็น {len(table)} (ต้องเท่าเดิม)"
        f" · ของว่างกลายเป็น {table.get('CAM-0005')['available']}"
    )

    # ลบ
    print(f"\ndelete('CAM-0005') -> {table.delete('CAM-0005')} (True = ลบสำเร็จ)")
    print(f"delete('CAM-0005') ซ้ำ -> {table.delete('CAM-0005')} (False = ไม่มีแล้ว)")
    print(f"get('CAM-0005') หลังลบ -> {table.get('CAM-0005')}")
    print(f"เหลือข้อมูล {len(table)} รายการ")

    print("\nสถานะตาราง:")
    for label, value in table.stats().items():
        print(f"  {label:>14} : {value}")


def demo_collision_and_resize() -> None:
    """โชว์การชนและการขยายตาราง บนข้อมูล 120 ชิ้น"""
    print()
    print("=" * 76)
    print("2) การชนและการขยายตาราง — ข้อมูล 120 รายการ")
    print("=" * 76)

    items = make_sample_items(120)

    # ตารางที่ขยายตัวตามปกติ
    good_table = build_hash_table(items)

    # ตารางที่ห้ามขยาย (ตั้ง load factor สูงจนไม่มีวันขยาย) ไว้เทียบให้เห็นภาพ
    class NeverResizeTable(HashTable):
        MAX_LOAD_FACTOR = 10_000.0

    cramped_table = NeverResizeTable()
    for item in items:
        cramped_table.insert(item["code"], item)

    print("\nตารางที่ขยายตัวตามปกติ (ขยายเมื่อ load factor > 0.7)")
    for label, value in good_table.stats().items():
        print(f"  {label:>14} : {value}")

    print("\nตารางเดียวกันแต่สั่งไม่ให้ขยาย — ไว้ดูว่าถ้าไม่ขยายจะเป็นอย่างไร")
    for label, value in cramped_table.stats().items():
        print(f"  {label:>14} : {value}")

    good, cramped = good_table.stats(), cramped_table.stats()
    print(
        f"\nอ่านตัวเลข: ตารางที่ไม่ขยายมีถังแค่ {cramped['จำนวนถัง']} ถัง"
        f" โซ่เฉลี่ยยาว {cramped['load factor']:g} ตัว ยาวสุด {cramped['โซ่ที่ยาวสุด']} ตัว"
        f"\nตารางที่ขยายตามปกติ โซ่ยาวสุดแค่ {good['โซ่ที่ยาวสุด']} ตัว"
        "\nยิ่งใส่ข้อมูลเพิ่มโดยไม่ขยาย โซ่ยิ่งยาวตาม n การค้นจึงไหลลงไปเป็น O(n)"
        "\nนี่คือกรณีแย่สุดที่พูดถึงในคอมเมนต์ส่วนที่ 2 ข้อ 2"
    )


def demo_benchmark() -> None:
    """เทียบความเร็วสามวิธีบนข้อมูลหลายขนาด"""
    print()
    print("=" * 76)
    print(f"3) เทียบความเร็วสามวิธี (แต่ละช่องรัน {ROUNDS} รอบแล้วเฉลี่ย)")
    print("=" * 76)
    print("งานที่วัด: ค้นหา/ลบ ทุก key หนึ่งครั้ง ถ้ามีข้อมูล n ชิ้นก็ทำ n ครั้ง")

    sizes = [10, 120, 1_000, 4_000]

    lookup_rows = []
    delete_rows = []
    collision_rows = []

    for size in sizes:
        items = make_sample_items(size)

        lookup = benchmark_lookup(items)
        lookup_rows.append((size, lookup["list"], lookup["hash"], lookup["dict"]))
        collision_rows.append((size, lookup["table"]))

        deletion = benchmark_delete(items)
        delete_rows.append((size, deletion["list"], deletion["hash"], deletion["dict"]))

    print_table("ค้นหา — ยิ่งข้อมูลมาก ยิ่งเห็นความต่าง", lookup_rows)
    print_table("ลบ — วิธี list ต้องไล่หาตำแหน่งก่อนลบ จึงช้าแบบเดียวกัน", delete_rows)

    print()
    print("สถิติการชนของ HashTable ที่เราเขียน")
    print("-" * 76)
    print(f"{'จำนวนข้อมูล':>12} {'จำนวนถัง':>10} {'ชนทั้งหมด':>12} {'ขยายกี่ครั้ง':>14} {'โซ่ยาวสุด':>12} {'load factor':>13}")
    print("-" * 76)
    for size, table in collision_rows:
        stat = table.stats()
        print(
            f"{size:>12,} {stat['จำนวนถัง']:>10,} {stat['ชนทั้งหมด']:>12,}"
            f" {stat['ขยายตาราง']:>14} {stat['โซ่ที่ยาวสุด']:>12} {stat['load factor']:>13}"
        )
    print("-" * 76)

    print(
        "\nสรุปสำหรับรายงาน"
        "\n  · วน list      O(n) ต่อการค้นหนึ่งครั้ง เวลาโตตามจำนวนข้อมูลเป็นเส้นตรง"
        "\n  · HashTable    O(1) เฉลี่ย เวลาแทบไม่ขยับเมื่อข้อมูลเพิ่ม"
        "\n  · dict         O(1) เฉลี่ยเหมือนกัน แต่เร็วกว่าเพราะเขียนด้วยภาษา C"
        "\n                 ไม่ได้วนลูปด้วย Python เหมือนของเรา"
        "\n  ที่ของเราช้ากว่า dict เป็นเรื่องของค่าคงที่ (constant factor)"
        "\n  ไม่ใช่เรื่องของ Big-O — ทั้งคู่โตในอัตราเดียวกัน"
        "\n"
        "\n  แถวบนสุด (ข้อมูล 10 ชิ้น) วน list เร็วกว่าตารางแฮช — ไม่ใช่ความผิดพลาด"
        "\n  ของน้อยขนาดนั้น การไล่ดู 10 ตัวถูกกว่าการคำนวณแฮชทีละครั้ง"
        "\n  Big-O พูดถึงพฤติกรรมตอน n โตขึ้น ไม่ได้บอกว่าใครเร็วกว่าที่ n น้อยๆ"
    )


# ---------------------------------------------------------------------------
# ส่วนที่ 6 — คลังอุปกรณ์: เก็บทั้ง list และดัชนีแฮชคู่กัน
#
# ทำไมต้องเก็บสองที่ ไม่ใช่ตารางแฮชอย่างเดียว
#   ตารางแฮชตอบเร็วแค่คำถามแบบ "รหัส X อยู่ไหน" แต่ไม่มีลำดับเลย
#   (ดู keys() — ได้ตามลำดับถัง ไม่ใช่ลำดับที่ใส่ และไม่ได้เรียงอะไร)
#   งานอื่นของระบบต้องการลำดับ: เรียงตามวันคืน (sort_group ของ Kul)
#   หาของที่ครบกำหนดก่อนวันที่ X (binary search ของ Neo) นับของทั้งร้าน
#
#   จึงเก็บตัว record จริงไว้ใน list และให้ตารางแฮชเก็บแค่ "รหัส -> ตำแหน่งใน list"
#
#       items = [ {CAM-0001 ...}, {LEN-0002 ...}, {TRI-0003 ...} ]
#       index = HashTable:  "CAM-0001" -> 0 · "LEN-0002" -> 1 · "TRI-0003" -> 2
#
#   list อย่างเดียว   ค้นด้วยรหัสต้องไล่ทีละตัว O(n)
#   แฮชอย่างเดียว     ค้นเร็ว แต่เรียงหรือไล่ตามลำดับไม่ได้
#   สองอย่างคู่กัน     ได้ทั้งคู่ แลกกับหน่วยความจำเพิ่มหนึ่งตาราง
#                      และต้องดูแลให้สองที่ตรงกันเสมอ (ดู remove_item)
# ---------------------------------------------------------------------------


class InventoryError(ValueError):
    """ความผิดพลาดที่เกิดจริงหน้าร้าน เช่น รหัสซ้ำ ของไม่พอ คืนของที่ไม่ได้ยืม

    แยกเป็นชนิดของตัวเอง คนเรียกจะได้ดักเฉพาะเรื่องที่ตั้งใจ
    โดยไม่เผลอกลืนบั๊กจริงอย่าง KeyError หรือ TypeError ไปด้วย
    """


class Inventory:
    """คลังอุปกรณ์ของร้าน 1 ร้าน — list ของ record + ตารางแฮชเป็นดัชนี

    record หนึ่งตัวมี 8 ฟิลด์ หน้าตาเดียวกับ make_dataset() ใน datasets.py
        code / name / category / total / available / borrower / due_date / status
    """

    def __init__(self):
        self.items = []
        self.index = HashTable()

    def __len__(self) -> int:
        return len(self.items)

    def find(self, code: str):
        """คืน record ของรหัสนั้น ไม่มีคืน None — O(1) เฉลี่ย"""
        position = self.index.get(code)
        if position is None:
            return None
        return self.items[position]

    def _require(self, code: str) -> dict:
        """เหมือน find แต่ไม่มีของ = ผิดพลาด ใช้กับงานที่ต้องมีของก่อน"""
        item = self.find(code)
        if item is None:
            raise InventoryError(f"ไม่มีอุปกรณ์รหัส {code} ในร้าน")
        return item

    def add_item(self, record: dict) -> dict:
        """เพิ่มอุปกรณ์ใหม่ — O(1) เฉลี่ย

        ตรวจให้ผ่านทุกข้อก่อนค่อยใส่ ถ้าไม่ผ่านจะไม่แตะข้อมูลเลยสักอย่าง
        ถ้าใส่ list ไปแล้วค่อยพังตอนใส่ดัชนี สองที่จะไม่ตรงกันตลอดไป
        """
        code = record["code"]
        if self.index.get(code) is not None:
            raise InventoryError(f"รหัส {code} มีอยู่แล้วในร้าน")
        if record["total"] < 1:
            raise InventoryError("จำนวนทั้งหมดต้องมีอย่างน้อย 1 ชิ้น")
        if not 0 <= record["available"] <= record["total"]:
            raise InventoryError("จำนวนที่ว่างต้องอยู่ระหว่าง 0 ถึงจำนวนทั้งหมด")

        # เติมช่องที่ขาดให้ครบ 8 ฟิลด์ แล้วก็อปเป็น dict ใหม่
        # จะได้ไม่ไปแก้ dict ที่คนเรียกถืออยู่ (เช่นชุดข้อมูลที่คนอื่นใช้ร่วม)
        item = {"borrower": None, "due_date": None, "status": "ok", **record}

        self.items.append(item)
        self.index.insert(code, len(self.items) - 1)
        return item

    def remove_item(self, code: str) -> dict:
        """ตัดอุปกรณ์ออกจากร้าน (เช่นชำรุดจนซ่อมไม่ได้) — O(1) เฉลี่ย

        ลบตัวกลาง list ด้วย pop(position) ตรงๆ เป็น O(n)
        เพราะ Python ต้องเลื่อนทุกตัวที่อยู่ข้างหลังมาอุดช่อง แล้วตำแหน่ง
        ที่ดัชนีจำไว้ของตัวพวกนั้นก็ผิดหมด ต้องไล่แก้อีก n ตัว

        จึงใช้วิธีสลับกับตัวท้ายแล้วตัดท้าย (swap-and-pop):
          1. หาตำแหน่งของตัวที่จะลบจากดัชนี                O(1)
          2. ยกตัวท้ายสุดมาวางทับตำแหน่งนั้น               O(1)
          3. แก้ดัชนีของตัวที่ถูกย้าย ให้ชี้ตำแหน่งใหม่       O(1)
          4. ตัดตัวท้ายทิ้ง แล้วลบรหัสออกจากดัชนี           O(1)
        ราคาที่จ่ายคือลำดับใน list เปลี่ยน ซึ่งรับได้ เพราะงานที่ต้องการลำดับ
        เอาไปเรียงเองอยู่แล้ว ไม่ได้พึ่งลำดับที่ใส่เข้ามา

        ของที่ยังอยู่กับลูกค้าตัดออกไม่ได้ ไม่งั้นจะไม่มีทางรับคืน
        """
        item = self._require(code)
        if item["available"] < item["total"]:
            raise InventoryError(f"{code} ยังมีของอยู่กับลูกค้า ต้องรับคืนก่อนจึงตัดออกได้")

        position = self.index.get(code)
        last = self.items[-1]

        self.items[position] = last
        self.index.insert(last["code"], position)  # key เดิม = แก้ค่าทับ
        self.items.pop()
        self.index.delete(code)
        return item

    def borrow_item(self, code: str, borrower: str, due_date: str) -> dict:
        """ปล่อยเช่า 1 ชิ้น ตัดจำนวนที่ว่างลง — O(1) เฉลี่ย

        due_date เป็นข้อความ YYYY-MM-DD แบบเดียวกับ datasets.py
        record มีช่องคนยืมช่องเดียวตามที่ออกแบบ 8 ฟิลด์ จึงเก็บคนยืมล่าสุด
        (ในเว็บจริง ใบเช่าทุกใบถูกเก็บแยกไว้ในตาราง borrows)
        """
        item = self._require(code)
        if item["status"] == "broken":
            raise InventoryError(f"{code} ชำรุดอยู่ ปล่อยเช่าไม่ได้")
        if item["available"] < 1:
            raise InventoryError(f"{code} ไม่มีของว่างเหลือให้ปล่อยเช่า")
        if not borrower.strip():
            raise InventoryError("ต้องใส่ชื่อคนเช่า")

        item["available"] -= 1
        item["borrower"] = borrower
        item["due_date"] = due_date
        # ของหมดชั้น = out เหมือนที่หน้าเว็บตั้งให้เอง
        item["status"] = "out" if item["available"] == 0 else "ok"
        return item

    def return_item(self, code: str) -> dict:
        """รับคืน 1 ชิ้น เพิ่มจำนวนที่ว่างกลับ — O(1) เฉลี่ย"""
        item = self._require(code)
        if item["available"] >= item["total"]:
            raise InventoryError(f"{code} ไม่ได้ถูกยืมอยู่ คืนไม่ได้")

        item["available"] += 1
        # คืนครบทุกชิ้นแล้ว = ไม่มีคนยืมค้างอยู่อีก
        if item["available"] == item["total"]:
            item["borrower"] = None
            item["due_date"] = None
        if item["status"] != "broken":
            item["status"] = "ok"
        return item


def build_inventory(items: list) -> Inventory:
    """ยกทั้งชุดข้อมูลใส่คลัง — ใช้กับ make_dataset() หรือ make_sample_items()"""
    inventory = Inventory()
    for item in items:
        inventory.add_item(item)
    return inventory


def demo_inventory() -> None:
    """โชว์ add / borrow / return / remove และทุกกรณีที่ต้องปฏิเสธ"""
    print()
    print("=" * 76)
    print("4) คลังอุปกรณ์ — list + ดัชนีแฮช พร้อมตัวตรวจความถูกต้อง")
    print("=" * 76)

    shop = build_inventory(make_sample_items(5))
    code = shop.items[1]["code"]
    print(f"ร้านมีอุปกรณ์ {len(shop)} รายการ · ทดลองกับ {code}")

    item = shop.find(code)
    item["available"] = item["total"] = 1  # ให้เหลือ 1 ชิ้นจะได้เห็นตอนของหมด

    shop.borrow_item(code, "คุณพลอย", "2026-10-05")
    print(f"\nปล่อยเช่าให้คุณพลอย -> ว่าง {item['available']}/{item['total']} · สถานะ {item['status']}")

    # ทุกบรรทัดข้างล่างต้องถูกปฏิเสธ — นี่คือตัวตรวจที่แผนงานสั่งไว้
    attempts = [
        ("ปล่อยเช่าซ้ำตอนของหมด", lambda: shop.borrow_item(code, "คุณหลิง", "2026-10-06")),
        ("ตัดออกทั้งที่ยังอยู่กับลูกค้า", lambda: shop.remove_item(code)),
        ("เพิ่มรหัสซ้ำ", lambda: shop.add_item(dict(item))),
        ("ค้นรหัสที่ไม่มี", lambda: shop.borrow_item("ไม่มีรหัสนี้", "ใครก็ได้", "2026-10-06")),
    ]
    print()
    for label, attempt in attempts:
        try:
            attempt()
            print(f"  ❌ {label}: ผ่านไปได้ ซึ่งผิด")
        except InventoryError as error:
            print(f"  ✅ {label}: ปฏิเสธ — {error}")

    shop.return_item(code)
    print(f"\nรับคืน -> ว่าง {item['available']}/{item['total']} · คนยืม {item['borrower']} · สถานะ {item['status']}")
    try:
        shop.return_item(code)
        print("  ❌ คืนของที่ไม่ได้ยืม: ผ่านไปได้ ซึ่งผิด")
    except InventoryError as error:
        print(f"  ✅ คืนของที่ไม่ได้ยืม: ปฏิเสธ — {error}")

    # ตัดออกด้วย swap-and-pop แล้วเช็กว่าดัชนีกับ list ยังตรงกันทุกตัว
    shop.remove_item(code)
    in_sync = all(shop.index.get(each["code"]) == position for position, each in enumerate(shop.items))
    print(f"\nตัด {code} ออก -> เหลือ {len(shop)} รายการ · ค้น {code} ได้ {shop.find(code)}")
    print(f"ดัชนีกับ list ยังตรงกันทุกตัวหลังสลับตำแหน่ง: {in_sync}")


# ---------------------------------------------------------------------------
# ส่วนที่ 7 — วัดผลบนชุดมาตรฐาน A-D (ตัวเลขที่ใส่รายงาน)
#
# ทำไมต้องวัดบนชุดเดียวกับคนอื่น: รายงานของสามคน (hash_table / search / sort_group)
# จะเทียบกันได้ก็ต่อเมื่อวัดบนข้อมูลชุดเดียวกัน
#
# ชุด D มี 1,000 รายการ ไม่ใช่ 120 ตามแผนแรก เพราะที่ 120 รายการ ตารางแฮช
# เร็วกว่าวน list แค่ราว 1.4 เท่า ยังไม่ชัดพอจะสรุป ที่ 1,000 ห่างกันชัดแล้ว
# และไม่ไปไกลกว่านี้เพราะ bubble sort ของ Kul ต้องรันสดตอนอัดวิดีโอได้
# (วัดจริง: 1,000 รายการ 0.07 วินาที · 4,000 รายการ 1.42 วินาที)
# ---------------------------------------------------------------------------


def report_on_datasets(make_dataset, names=("A", "B", "C", "D")) -> dict:
    """วัดค้นหา / เพิ่ม / ลบ ของทั้งสามวิธีบนชุด A-D แล้วพิมพ์เป็นตาราง

    รับ make_dataset เข้ามาเป็นพารามิเตอร์ แทนการ import datasets ตรงๆ
    เพราะไฟล์นี้ห้าม import ไฟล์อื่นในโปรเจกต์ (กฎ stdlib ที่หัวไฟล์)
      ใน Colab     วางเซลล์ datasets.py ไว้ก่อน แล้วเรียก report_on_datasets(make_dataset)
      ในโปรเจกต์   python3 scripts/data-course-hashtable.py

    คืนตัวเลขทั้งหมดเป็น dict ด้วย เผื่อเอาไปวาดกราฟต่อ
    """
    results = {}
    lookup_rows, insert_rows, delete_rows = [], [], []

    for name in names:
        items = make_dataset(name)
        label = f"{name} ({len(items):,})"

        lookup = benchmark_lookup(items)
        insert = benchmark_insert(items)
        deletion = benchmark_delete(items)

        results[name] = {
            "size": len(items),
            "lookup": {key: lookup[key] for key in ("list", "hash", "dict")},
            "insert": insert,
            "delete": deletion,
            "stats": lookup["table"].stats(),
        }
        lookup_rows.append((label, lookup["list"], lookup["hash"], lookup["dict"]))
        insert_rows.append((label, insert["list"], insert["hash"], insert["dict"]))
        delete_rows.append((label, deletion["list"], deletion["hash"], deletion["dict"]))

    print_table("ตาราง H1 — ค้นหาทุกรหัสหนึ่งครั้ง", lookup_rows, first_column="ชุด (จำนวน)")
    print_table("ตาราง H2 — เพิ่มทีละชิ้นจนครบชุด (เช็กรหัสซ้ำทุกครั้ง)", insert_rows, first_column="ชุด (จำนวน)")
    print_table("ตาราง H3 — ลบทุกรหัสหนึ่งครั้ง", delete_rows, first_column="ชุด (จำนวน)")

    print()
    print("ตาราง H4 — สถานะของ HashTable หลังใส่ครบชุด")
    print("-" * 76)
    print(f"{'ชุด':>6} {'จำนวน':>8} {'ถัง':>6} {'ชน':>6} {'ขยาย':>6} {'โซ่ยาวสุด':>10} {'load factor':>12}")
    print("-" * 76)
    for name, result in results.items():
        stat = result["stats"]
        print(
            f"{name:>6} {result['size']:>8,} {stat['จำนวนถัง']:>6,} {stat['ชนทั้งหมด']:>6,}"
            f" {stat['ขยายตาราง']:>6} {stat['โซ่ที่ยาวสุด']:>10} {stat['load factor']:>12}"
        )
    print("-" * 76)

    if "A" in results and "D" in results:
        small, large = results["A"], results["D"]
        grow = large["size"] / small["size"]
        print(
            f"\nอ่านตาราง: ข้อมูลโตขึ้น {grow:,.0f} เท่า (ชุด A -> ชุด D)"
            f"\n  ค้นด้วยการวน list ใช้เวลาโตขึ้น {large['lookup']['list'] / small['lookup']['list']:,.0f} เท่า"
            f"\n  ค้นด้วย HashTable ใช้เวลาโตขึ้น {large['lookup']['hash'] / small['lookup']['hash']:,.0f} เท่า"
            "\n  งานที่วัดคือค้นครบทุกรหัส (n ครั้ง) แต่ละครั้ง list ไล่เฉลี่ยครึ่งรายการ"
            "\n  เวลารวมจึงโตราว n²/2 ส่วนแฮชโตราว n เท่านั้น"
            "\n  ต่อการค้นหนึ่งครั้ง list คือ O(n) ส่วนแฮชคือ O(1) เฉลี่ย"
            "\n  (ชุดเล็กจับเวลาได้ไม่แม่น ตัวคูณที่ได้จริงจึงไม่ตรงสูตรเป๊ะ)"
        )

    return results


if __name__ == "__main__":
    demo_basic_operations()
    demo_collision_and_resize()
    demo_benchmark()
    demo_inventory()
