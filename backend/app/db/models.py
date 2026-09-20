"""
ตารางฐานข้อมูลทั้ง 6 ตาราง (ตามสคีมาในหัวข้อ 4 ของ CLAUDE.md)

เขียนด้วย SQLAlchemy 2.0 style คือใช้ Mapped[...] กับ mapped_column()
ไม่ใช่ Column() แบบเก่า ข้อดีคือ editor ฟ้อง type ผิดให้ตั้งแต่ตอนเขียน

อ่านยังไง:
    id: Mapped[int] = mapped_column(primary_key=True)
    ^ชื่อคอลัมน์  ^ชนิดข้อมูลในฝั่ง Python   ^รายละเอียดฝั่งฐานข้อมูล

Mapped[str]         = ห้ามเป็น NULL
Mapped[str | None]  = เป็น NULL ได้
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


# ---------------------------------------------------------------------------
# ENUM
# ---------------------------------------------------------------------------
# ประกาศเป็น Enum ของ Python ก่อน แล้วค่อยห่อด้วย SAEnum ตอนใช้ในคอลัมน์
# ข้อดี: โค้ดเขียน UserRole.PRO ได้เลย ไม่ต้องพิมพ์ "pro" เป็นสตริงลอยๆ
#        พิมพ์ผิดเมื่อไหร่รู้ทันทีตั้งแต่ตอนรัน ไม่ใช่ไปเจอตอนข้อมูลเพี้ยน
#
# values_callable บอก SQLAlchemy ให้เก็บ "ค่า" (pro) ลงฐานข้อมูล
# ถ้าไม่ใส่ มันจะเก็บ "ชื่อตัวแปร" (PRO) แทน ซึ่งไม่ตรงกับสคีมาที่ตกลงกันไว้
ENUM_VALUES = lambda enum_cls: [member.value for member in enum_cls]  # noqa: E731


class UserRole(str, Enum):
    ADMIN = "admin"
    FREE = "free"
    PRO = "pro"


class ItemStatus(str, Enum):
    OK = "ok"
    OUT = "out"
    BROKEN = "broken"


class BorrowStatus(str, Enum):
    ACTIVE = "active"
    RETURNED = "returned"
    OVERDUE = "overdue"


class SubscriptionTier(str, Enum):
    FREE = "free"
    PRO = "pro"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"


# ---------------------------------------------------------------------------
# 1. users - เจ้าของร้านที่สมัครใช้ระบบ
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    # เก็บเฉพาะรหัสผ่านที่ผ่าน bcrypt แล้ว ห้ามเก็บรหัสผ่านจริงเด็ดขาด
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    shop_name: Mapped[str | None] = mapped_column(String(160))

    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", values_callable=ENUM_VALUES),
        default=UserRole.FREE,
        server_default=UserRole.FREE.value,
        nullable=False,
    )

    # ได้มาตอนผู้ใช้ผูกบัญชี LINE ตอนสมัครใหม่ๆ ยังไม่มี จึงเป็น NULL ได้
    line_user_id: Mapped[str | None] = mapped_column(String(64), index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ความสัมพันธ์: ผู้ใช้ 1 คน มีของได้หลายชิ้น
    # back_populates ผูกสองทางเข้าหากัน -> user.items และ item.owner ใช้ได้ทั้งคู่
    # cascade "all, delete-orphan" = ลบผู้ใช้แล้วของของเขาถูกลบตามไปด้วย
    items: Mapped[list["Item"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    borrows: Mapped[list["Borrow"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    subscriptions: Mapped[list["Subscription"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"


# ---------------------------------------------------------------------------
# 2. items - อุปกรณ์ที่ร้านมีให้เช่า
# ---------------------------------------------------------------------------
class Item(Base):
    __tablename__ = "items"
    __table_args__ = (
        # รหัสของห้ามซ้ำ "ภายในร้านเดียวกัน" เท่านั้น
        # ร้าน A กับร้าน B ใช้รหัส CAM-01 พร้อมกันได้ ไม่ถือว่าชนกัน
        UniqueConstraint("owner_id", "code", name="uq_items_owner_code"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str | None] = mapped_column(String(80), index=True)

    total: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    # available = จำนวนที่ยังอยู่บนชั้นตอนนี้ (total ลบด้วยจำนวนที่ถูกยืมอยู่)
    available: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)

    status: Mapped[ItemStatus] = mapped_column(
        SAEnum(ItemStatus, name="item_status", values_callable=ENUM_VALUES),
        default=ItemStatus.OK,
        server_default=ItemStatus.OK.value,
        nullable=False,
    )

    # เงินใช้ Numeric ห้ามใช้ Float เพราะ Float ปัดเศษเพี้ยน
    daily_rate: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=0, server_default="0", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    owner: Mapped["User"] = relationship(back_populates="items")
    borrows: Mapped[list["Borrow"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Item id={self.id} code={self.code} available={self.available}>"


# ---------------------------------------------------------------------------
# 3. borrows - ใบยืม ใครเอาอะไรไป ต้องคืนวันไหน
# ---------------------------------------------------------------------------
class Borrow(Base):
    __tablename__ = "borrows"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    item_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("items.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # user_id = เจ้าของร้านที่บันทึกรายการนี้ ไม่ใช่ลูกค้าที่มายืม
    # ลูกค้าไม่มีบัญชีในระบบ เก็บแค่ชื่อกับเบอร์
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    customer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    customer_phone: Mapped[str | None] = mapped_column(String(32))

    borrowed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    # ยังไม่คืน = NULL  ใช้เช็กว่ารายการไหนยังค้างอยู่
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    status: Mapped[BorrowStatus] = mapped_column(
        SAEnum(BorrowStatus, name="borrow_status", values_callable=ENUM_VALUES),
        default=BorrowStatus.ACTIVE,
        server_default=BorrowStatus.ACTIVE.value,
        index=True,
        nullable=False,
    )

    item: Mapped["Item"] = relationship(back_populates="borrows")
    user: Mapped["User"] = relationship(back_populates="borrows")
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="borrow", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Borrow id={self.id} item_id={self.item_id} status={self.status}>"


# ---------------------------------------------------------------------------
# 4. subscriptions - แพ็กเกจที่ผู้ใช้สมัคร (free / pro)
# ---------------------------------------------------------------------------
class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    tier: Mapped[SubscriptionTier] = mapped_column(
        SAEnum(SubscriptionTier, name="subscription_tier", values_callable=ENUM_VALUES),
        default=SubscriptionTier.FREE,
        server_default=SubscriptionTier.FREE.value,
        nullable=False,
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # แพ็กเกจ free ไม่มีวันหมดอายุ จึงเป็น NULL ได้
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    status: Mapped[SubscriptionStatus] = mapped_column(
        SAEnum(SubscriptionStatus, name="subscription_status", values_callable=ENUM_VALUES),
        default=SubscriptionStatus.ACTIVE,
        server_default=SubscriptionStatus.ACTIVE.value,
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="subscriptions")
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="subscription", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Subscription id={self.id} tier={self.tier} status={self.status}>"


# ---------------------------------------------------------------------------
# 5. transactions - การจ่ายเงิน (โปรเจคนี้จำลอง ไม่ตัดเงินจริง)
# ---------------------------------------------------------------------------
class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subscription_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("subscriptions.id", ondelete="SET NULL"), index=True
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    method: Mapped[str | None] = mapped_column(String(40))  # qr / card / mock

    status: Mapped[TransactionStatus] = mapped_column(
        SAEnum(TransactionStatus, name="transaction_status", values_callable=ENUM_VALUES),
        default=TransactionStatus.PENDING,
        server_default=TransactionStatus.PENDING.value,
        nullable=False,
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    subscription: Mapped["Subscription | None"] = relationship(back_populates="transactions")

    def __repr__(self) -> str:
        return f"<Transaction id={self.id} amount={self.amount} status={self.status}>"


# ---------------------------------------------------------------------------
# 6. notifications - ประวัติการส่งเตือนผ่าน LINE
# ---------------------------------------------------------------------------
class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    borrow_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("borrows.id", ondelete="CASCADE"), index=True
    )

    # ตอนนี้มีช่องทางเดียวคือ line เผื่อไว้ให้เพิ่ม email/sms ทีหลัง
    channel: Mapped[str] = mapped_column(
        String(20), default="line", server_default="line", nullable=False
    )
    # ยังไม่ได้ส่ง = NULL
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(
        String(20), default="pending", server_default="pending", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    borrow: Mapped["Borrow | None"] = relationship(back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification id={self.id} channel={self.channel} status={self.status}>"
