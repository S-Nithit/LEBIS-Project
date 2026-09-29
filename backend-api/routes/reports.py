"""รายงานประวัติการเช่า และส่งออก CSV

ต่อ prefix "/api/reports" (ดู app.py) ฉะนั้น @router.get("/rentals") = GET /api/reports/rentals

กฎตามแพ็กเกจ (CLAUDE.md §5)
    Free  ดูย้อนหลังได้ 7 วัน · ส่งออก CSV ไม่ได้ (403)
    Pro   ดูย้อนหลังได้ทั้งหมด · ส่งออก CSV ได้

ตอบปัญหาข้อ 3 ของร้านใน Proposal ด้วย: "ไม่รู้ว่าของชิ้นไหนทำเงิน"
รายงานจึงมีอันดับอุปกรณ์ที่ทำรายได้สูงสุดติดมาด้วย
"""

import csv
import io
from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from pydantic import BaseModel

from queries import reports as reports_query
from services.inventory import BANGKOK
from services.security import TIER_ORDER, get_current_user, require_tier

router = APIRouter()

FREE_HISTORY_DAYS = 7
TOP_ITEMS = 5


# ---------------------------------------------------------------------------
# 1) Pydantic model — เงินใช้ Decimal เสมอ ห้าม float
# ---------------------------------------------------------------------------

class RentalRow(BaseModel):
    id: int
    code: str
    name: str
    category: str
    customer_name: str
    customer_phone: str | None
    borrowed_at: datetime
    due_date: datetime
    returned_at: datetime | None
    status: str
    days: int
    daily_rate: Decimal
    amount: Decimal


class TopItem(BaseModel):
    code: str
    name: str
    rentals: int
    revenue: Decimal


class RentalReport(BaseModel):
    days: int | None          # ช่วงที่แสดงจริง · None = ทั้งหมด
    since: date | None        # วันแรกของช่วง (เวลาไทย)
    limited: bool             # True = แพ็กเกจฟรีถูกจำกัดไว้ที่ 7 วัน
    rentals: int
    estimated_revenue: Decimal
    top_items: list[TopItem]
    rows: list[RentalRow]


# ---------------------------------------------------------------------------
# 2) ฟังก์ชันช่วย
# ---------------------------------------------------------------------------

def history_window(user, days: int | None) -> tuple:
    """ช่วงวันที่ผู้ใช้คนนี้ดูได้ คืน (จำนวนวัน, วันเริ่ม, ถูกจำกัดหรือไม่)

    ผู้ใช้ Free ขอเกิน 7 วัน ไม่ตอบ 403 แต่ตัดเหลือ 7 วันแล้วบอกว่าถูกจำกัด
    เพราะโจทย์เขียนว่า "ดูรายงานย้อนหลัง 7 วัน" ไม่ใช่ "ดูรายงานไม่ได้"
    """
    is_pro = TIER_ORDER.get(user["role"], -1) >= TIER_ORDER["pro"]
    if not is_pro:
        days = min(days or FREE_HISTORY_DAYS, FREE_HISTORY_DAYS)
    if days is None:
        return None, None, False

    today = datetime.now(BANGKOK).date()
    # "ย้อนหลัง 7 วัน" นับวันนี้ด้วย = วันนี้กับอีก 6 วันก่อนหน้า
    return days, today - timedelta(days=days - 1), not is_pro


def to_rows(records) -> list:
    rows = []
    for r in records:
        rate = Decimal(r["daily_rate"])
        rows.append(RentalRow(**{k: r[k] for k in RentalRow.model_fields if k != "amount"},
                              amount=rate * r["days"]))
    return rows


def top_items(rows: list) -> list:
    """รวมรายได้ต่ออุปกรณ์ แล้วเอา 5 อันดับแรก — ข้อมูลอยู่ในมือแล้ว ไม่ต้องยิง SQL อีกรอบ"""
    totals = {}
    for row in rows:
        entry = totals.setdefault(row.code, {"code": row.code, "name": row.name, "rentals": 0, "revenue": Decimal(0)})
        entry["rentals"] += 1
        entry["revenue"] += row.amount
    ranked = sorted(totals.values(), key=lambda e: (-e["revenue"], -e["rentals"], e["code"]))
    return [TopItem(**entry) for entry in ranked[:TOP_ITEMS]]


def bangkok_day(moment: datetime | None) -> str:
    return moment.astimezone(BANGKOK).date().isoformat() if moment else ""


def safe_cell(text: str | None) -> str:
    """กันสูตรอันตรายตอนเปิดใน Excel (CSV injection)

    ชื่อลูกค้าที่ขึ้นต้นด้วย = + - @ Excel จะตีความเป็นสูตร เช่น =HYPERLINK(...)
    ใส่ ' นำหน้าให้ Excel มองเป็นข้อความธรรมดา
    """
    text = text or ""
    return "'" + text if text[:1] in ("=", "+", "-", "@") else text


# ---------------------------------------------------------------------------
# 3) route
# ---------------------------------------------------------------------------

@router.get("/rentals", response_model=RentalReport)
async def rental_report(
    days: int | None = Query(None, ge=1, le=3650, description="ย้อนหลังกี่วัน ไม่ใส่ = Free 7 วัน · Pro ทั้งหมด"),
    user=Depends(get_current_user),
):
    """ประวัติการเช่า + รายได้โดยประมาณ + อุปกรณ์ที่ทำเงินสูงสุด"""
    window, since, limited = history_window(user, days)
    rows = to_rows(await reports_query.rentals(user["email"], since))
    return RentalReport(
        days=window, since=since, limited=limited, rentals=len(rows),
        estimated_revenue=sum((row.amount for row in rows), Decimal(0)),
        top_items=top_items(rows), rows=rows,
    )


@router.get("/rentals.csv")
async def rental_csv(
    days: int | None = Query(None, ge=1, le=3650),
    user=Depends(require_tier("pro")),
):
    """ส่งออกประวัติการเช่าเป็น CSV — เฉพาะ Pro · Free เรียกแล้วได้ 403 จาก require_tier"""
    _window, since, _limited = history_window(user, days)
    rows = to_rows(await reports_query.rentals(user["email"], since))

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["rental_id", "item_code", "item_name", "category", "customer", "phone",
                     "borrowed_date", "due_date", "returned_date", "status", "days", "daily_rate", "amount"])
    for row in rows:
        writer.writerow([row.id, safe_cell(row.code), safe_cell(row.name), safe_cell(row.category),
                         safe_cell(row.customer_name), safe_cell(row.customer_phone),
                         bangkok_day(row.borrowed_at), bangkok_day(row.due_date), bangkok_day(row.returned_at),
                         row.status, row.days, f"{row.daily_rate:.2f}", f"{row.amount:.2f}"])

    # BOM นำหน้า ไม่งั้น Excel เปิดแล้วภาษาไทยเพี้ยนเป็นตัวอ่านไม่ออก
    filename = f"lebis-rentals-{datetime.now(BANGKOK).date().isoformat()}.csv"
    return Response(
        content="﻿" + buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
