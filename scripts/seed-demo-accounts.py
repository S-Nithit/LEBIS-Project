#!/usr/bin/env python3
"""เตรียมบัญชีสำหรับวันพรีเซนต์ — อาจารย์จะเทสกรณีขอบสดๆ ต้องมีบัญชีพร้อมก่อนขึ้นเวที

สร้าง 2 บัญชีผ่าน API ปกติ (ไม่แตะฐานข้อมูลตรง ใช้ได้ทั้งในเครื่องและเว็บจริง)
    บัญชี Free  มีอุปกรณ์ครบ 50 ชิ้นพอดี
                → กดเพิ่มชิ้นที่ 51 ต่อหน้าอาจารย์ ต้องได้ 403
    บัญชี Pro   มีอุปกรณ์ + ใบเช่าที่ครบกำหนดวันนี้และพรุ่งนี้
                → กดส่งสรุป LINE ให้เห็นข้อความเด้งในมือถือ

รันซ้ำได้ ไม่สร้างของซ้ำ — บัญชีมีแล้วจะ login แทน ของที่มีรหัสนี้แล้วจะข้าม

วิธีรัน (จากรากของ repo)
    ในเครื่อง   python3 scripts/seed-demo-accounts.py
    เว็บจริง    python3 scripts/seed-demo-accounts.py --base https://lebis-project.vercel.app

รหัสผ่านถามตอนรัน (ไม่แสดงบนจอ) หรือตั้งไว้ใน DEMO_PASSWORD
ไม่มีรหัสผ่านอยู่ในไฟล์นี้ และสคริปต์ไม่พิมพ์รหัสผ่านออกมา

ข้อจำกัดที่ต้องรู้
    - ใบเช่าที่เลยกำหนดแล้วสร้างผ่าน API ไม่ได้ (ระบบห้ามตั้งวันคืนย้อนหลัง ซึ่งถูกแล้ว)
      ใบที่ครบวันนี้จะกลายเป็นเลยกำหนดเองตอนเที่ยงคืน ถ้าอยากโชว์ ให้รันก่อนวันพรีเซนต์ 1-2 วัน
    - การอัปเกรดเป็น Pro ใช้ checkout ของ Kul ถ้ายังไม่ขึ้นเว็บ สคริปต์จะบอกว่าต้องทำอะไร
    - การผูก LINE ต้องทำเองในมือถือ (สคริปต์พิมพ์ขั้นตอนให้ตอนจบ)
"""

import argparse
import getpass
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta

FREE_LIMIT = 50

# ของในร้านเช่ากล้องจริงๆ — ชื่อที่อาจารย์เห็นบนจอควรดูเป็นร้านจริง ไม่ใช่ "item 1"
CATALOG = [
    ("CAM", "กล้อง", ["Sony A7 IV", "Canon R6 Mark II", "Fujifilm X-T5", "Nikon Z6 II", "Sony FX3"]),
    ("LEN", "เลนส์", ["Sony 24-70 GM II", "Canon RF 50mm f/1.2", "Sigma 35mm Art", "Tamron 70-180", "Sony 85mm GM"]),
    ("TRI", "ขาตั้ง", ["Manfrotto 055", "Benro Mach3", "Gitzo Traveler", "Sirui AM-284", "Peak Travel Tripod"]),
    ("LED", "ไฟ", ["Aputure 300d II", "Godox SL60W", "Nanlite Forza 60", "Amaran 200x", "Godox AD200 Pro"]),
    ("MIC", "ไมโครโฟน", ["Rode Wireless GO II", "Sennheiser MKE 600", "DJI Mic 2", "Rode VideoMic NTG", "Zoom H6"]),
]


def catalog_item(number: int) -> dict:
    """ชิ้นที่ number (เริ่มที่ 1) — วนหมวดไปเรื่อยๆ รหัสไม่ซ้ำ"""
    prefix, category, names = CATALOG[(number - 1) % len(CATALOG)]
    name = names[((number - 1) // len(CATALOG)) % len(names)]
    return {"code": f"{prefix}-{number:03d}", "name": name, "category": category,
            "total": 1, "daily_rate": 300 + (number % 5) * 100}


class Api:
    def __init__(self, base: str):
        self.base = base.rstrip("/")
        self.token = None

    def call(self, method: str, path: str, body=None):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.status, json.loads(response.read() or b"null")
        except urllib.error.HTTPError as error:
            raw = error.read()
            try:
                return error.code, json.loads(raw or b"null")
            except ValueError:
                return error.code, {"raw": raw[:200].decode("utf-8", "replace")}

    def sign_in(self, email: str, password: str, name: str, shop: str) -> None:
        """สมัครใหม่ ถ้ามีบัญชีอยู่แล้วก็ login แทน"""
        status, body = self.call("POST", "/api/auth/register",
                                 {"email": email, "password": password, "name": name, "shop_name": shop})
        if status not in (200, 201):
            status, body = self.call("POST", "/api/auth/login", {"email": email, "password": password})
        # สมัครใหม่สำเร็จได้ 201 · login ได้ 200 — รับทั้งคู่
        if status not in (200, 201) or not body or "access_token" not in body:
            sys.exit(f"❌ เข้าบัญชี {email} ไม่ได้ ({status}) — รหัสผ่านไม่ตรงกับที่เคยสร้างไว้หรือเปล่า")
        self.token = body["access_token"]

    def me(self) -> dict:
        return self.call("GET", "/api/auth/me")[1]

    def item_count(self) -> int:
        return int(self.call("GET", "/api/items/summary")[1]["item_rows"])


def fill_items(api: Api, target: int) -> int:
    """เติมของจนครบ target ชิ้น (ข้ามรหัสที่มีอยู่แล้ว) คืนจำนวนที่เพิ่มจริง"""
    added, number = 0, 1
    while api.item_count() < target and number <= target * 3:
        status, _ = api.call("POST", "/api/items", catalog_item(number))
        added += status == 201
        number += 1
    return added


def prepare_free(api: Api, email: str, password: str) -> None:
    print(f"\n[1/2] บัญชี Free — {email}")
    api.sign_in(email, password, "Demo Free", "ร้านเช่ากล้อง (แพ็กเกจฟรี)")
    role = api.me()["role"]
    if role != "free":
        sys.exit(f"❌ บัญชีนี้เป็น {role} อยู่ ใช้เดโมเพดาน 50 ชิ้นไม่ได้ ใช้อีเมลอื่นแทน")

    added = fill_items(api, FREE_LIMIT)
    count = api.item_count()
    print(f"  อุปกรณ์ {count} ชิ้น (เพิ่มรอบนี้ {added})")
    if count != FREE_LIMIT:
        print(f"  ⚠️ ควรมี {FREE_LIMIT} ชิ้นพอดี ตอนนี้มี {count} — ลบส่วนเกินในหน้า Workspace ก่อนเดโม")

    # ลองชิ้นที่ 51 จริง เพื่อยืนยันว่าเดโมจะได้ 403 ตามที่ต้องการ
    status, body = api.call("POST", "/api/items", catalog_item(FREE_LIMIT + 1))
    if status == 403:
        print("  ✅ ลองเพิ่มชิ้นที่ 51 แล้วได้ 403 — พร้อมเดโม")
    else:
        print(f"  ❌ ชิ้นที่ 51 ได้ {status} ไม่ใช่ 403 — ตรวจเพดานแพ็กเกจฟรีก่อนขึ้นเวที")


def upgrade_to_pro(api: Api) -> bool:
    """อัปเกรดผ่าน checkout ของ Kul — ถ้ายังไม่มี endpoint นี้ บอกวิธีแทน"""
    if api.me()["role"] in ("pro", "admin"):
        return True
    status, body = api.call("POST", "/api/checkout/session", {"tier": "pro"})
    if status == 404:
        print("  ⚠️ ยังไม่มี /api/checkout บนเซิร์ฟเวอร์นี้ (รอ PR billing ของ Kul)")
        print("     อัปเกรดบัญชีนี้ผ่านหน้า Pricing เมื่อพร้อม แล้วรันสคริปต์นี้ซ้ำ")
        return False
    if status != 200:
        print(f"  ⚠️ เริ่ม checkout ไม่ได้ ({status}): {body}")
        return False
    status, body = api.call("POST", "/api/checkout/confirm", {"checkout_id": body["checkout_id"]})
    if status != 200:
        print(f"  ⚠️ ยืนยันการจ่ายเงินไม่ได้ ({status}): {body}")
        return False
    return True


def prepare_pro(api: Api, email: str, password: str) -> None:
    print(f"\n[2/2] บัญชี Pro — {email}")
    api.sign_in(email, password, "Demo Pro", "ร้านเช่ากล้อง (แพ็กเกจ Pro)")
    is_pro = upgrade_to_pro(api)
    print(f"  แพ็กเกจ: {api.me()['role']}")

    fill_items(api, 8)
    items = api.call("GET", "/api/items?limit=50")[1]["items"]
    open_borrows = [b for b in api.call("GET", "/api/borrows")[1] if b["status"] != "returned"]

    today = date.today()
    wanted = [("คุณพลอย", today), ("คุณหลิง", today), ("คุณเปิ้ล", today + timedelta(days=1)),
              ("คุณนัท", today + timedelta(days=1)), ("คุณบิว", today + timedelta(days=5))]
    have = {b["customer_name"] for b in open_borrows}
    free_items = [i for i in items if i["available"] > 0 and i["status"] != "broken"]
    created = 0
    for (customer, due), item in zip([w for w in wanted if w[0] not in have], free_items):
        status, _ = api.call("POST", "/api/borrows", {"item_id": item["id"], "customer_name": customer,
                                                      "customer_phone": "0812345678", "due_date": due.isoformat()})
        created += status == 201
    print(f"  ใบเช่าที่ยังไม่คืน: {len(open_borrows) + created} ใบ (เพิ่มรอบนี้ {created})")

    status, line = api.call("GET", "/api/line/status")
    if status == 200:
        print(f"  LINE: ระบบ{'พร้อม' if line['configured'] else 'ยังไม่ได้ตั้งค่า'} · "
              f"บัญชีนี้{'ผูกแล้ว' if line['linked'] else 'ยังไม่ได้ผูก'}")
    if not is_pro:
        print("  ⚠️ บัญชีนี้ยังไม่เป็น Pro — เดโม LINE ยังใช้ไม่ได้")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base", default="http://localhost:8000", help="ที่อยู่ backend หรือโดเมนหน้าเว็บ")
    parser.add_argument("--free-email", default="demo-free@lebis-demo.com")
    parser.add_argument("--pro-email", default="demo-pro@lebis-demo.com")
    args = parser.parse_args()

    password = os.getenv("DEMO_PASSWORD") or getpass.getpass("รหัสผ่านของบัญชีเดโม (อย่างน้อย 8 ตัว): ")
    if len(password) < 8:
        sys.exit("❌ รหัสผ่านต้องยาวอย่างน้อย 8 ตัว")

    print(f"เตรียมบัญชีเดโมที่ {args.base}")
    prepare_free(Api(args.base), args.free_email, password)
    prepare_pro(Api(args.base), args.pro_email, password)

    print("\nขั้นสุดท้ายที่ต้องทำเองในมือถือ (ผูก LINE กับบัญชี Pro)")
    print("  1. login บัญชี Pro ที่หน้าตั้งค่า แล้วกดขอรหัสผูก LINE")
    print("     (ถ้าหน้าตั้งค่ายังไม่เสร็จ: เรียก POST /api/line/link-code จากหน้า /docs ของ backend)")
    print("  2. แอด LINE OA ของ LEBIS แล้วพิมพ์รหัสนั้นในแชท")
    print("  3. เรียก POST /api/line/digest — ต้องมีข้อความสรุปเด้งในมือถือ")


if __name__ == "__main__":
    main()
