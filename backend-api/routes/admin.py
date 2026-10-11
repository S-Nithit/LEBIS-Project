"""Admin dashboard — ตัวเลขรวมทั้งระบบ เห็นได้เฉพาะ role admin

ทุก endpoint มี Depends(require_role("admin")) ไม่มีเส้นไหนยกเว้น
อาจารย์เทสสดว่าคนทั่วไปเรียกแล้วต้องได้ 403 — ดู services/security.py
"""

from fastapi import APIRouter, Depends

from queries import admin as admin_queries
from services.security import require_role
from routes.billing import PLANS

router = APIRouter()


@router.get("/overview")
async def overview(admin=Depends(require_role("admin"))):
    """ตัวเลขรวม + ข้อมูลกราฟ 2 อัน ให้หน้า pages/admin.js ในคำขอเดียว"""
    counts = await admin_queries.overview_counts()
    free_count = counts["free_count"]
    pro_count = counts["pro_count"]
    total_shops = free_count + pro_count

    active_subs = await admin_queries.active_subscriptions_count()
    mrr = active_subs * PLANS["pro"]["price"]

    revenue_rows = await admin_queries.revenue_by_month()
    signup_rows = await admin_queries.signups_by_month()

    return {
        "total_shops": total_shops,
        "free_count": free_count,
        "pro_count": pro_count,
        "conversion_rate": (pro_count / total_shops) if total_shops else 0,
        "mrr": mrr,
        "arr": mrr * 12,
        "revenue_this_month": await admin_queries.revenue_this_month(),
        "total_rentals": await admin_queries.total_rentals(),
        "items_out": await admin_queries.items_out(),
        "revenue_by_month": [
            {"month": row["month"], "amount": float(row["amount"])} for row in revenue_rows
        ],
        "signups_by_month": [
            {"month": row["month"], "free": row["free"], "pro": row["pro"]} for row in signup_rows
        ],
    }