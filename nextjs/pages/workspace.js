// หน้าหลักที่เจ้าของร้านเปิดใช้ทุกวัน — อุปกรณ์ทั้งหมดและรายการเช่าที่ยังค้าง
//
// หน้านี้คุยกับ backend 4 ที่: /api/items, /api/items/summary,
// /api/items/categories และ /api/borrows ทุกตัวเรียกผ่าน apiFetch ซึ่งแนบ
// token ให้เองแล้ว (ดู lib/api.js)
//
// โครงของหน้าไล่จากบนลงล่าง
//   แถบสถานะ 3 ช่อง -> ปุ่มสลับ อุปกรณ์/รายการเช่า -> แผงฟอร์ม (ถ้าเปิดอยู่)
//   -> ตัวกรอง -> ตาราง
//
// กฎที่ต้องรักษาไว้เวลาแก้ไฟล์นี้ (จาก docs/ui-guide.md)
//   - ข้อความทุกคำผ่าน t() และเติมครบทั้ง th และ en ใน lib/i18n.js
//   - ห้ามเขียนค่าสีเอง ใช้ชื่อสีของระบบเท่านั้น
//   - สำเร็จ -> toast · พลาด -> ขึ้นในหน้าตรงจุดที่พลาด ห้ามเป็น toast
//     (docs/brand.md หัวข้อ 6 แก้กฎข้อนี้เมื่อ 21 ก.ย. หลังไฟล์นี้เขียนไปแล้ว)
//     ผิดที่ช่องไหน -> ใต้ช่องนั้นผ่าน FormField
//     ไม่ใช่ความผิดของช่องไหน -> กล่อง FormError ที่อยู่ติดปุ่มที่ผู้ใช้เพิ่งกด

import Head from "next/head";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { FormError } from "@/components/FormError";
import { FormField } from "@/components/FormField";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useLanguage } from "@/lib/useLanguage";

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// ฟังก์ชันช่วยเล็กๆ
// ---------------------------------------------------------------------------

// เติมค่าลงในช่องว่างของคำแปล เช่น "แสดง {shown} จาก {total} รายการ"
// t() ในโปรเจกต์นี้รับแค่ชื่อคีย์ ไม่รับตัวแปร เลยต้องแทนค่าเองตรงนี้
function fill(text, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    text
  );
}

function formatDate(value, language) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(language === "en" ? "en-GB" : "th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value) {
  return Number(value).toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

// วันนี้ในรูป YYYY-MM-DD สำหรับใส่ min ให้ช่องเลือกวัน
// ใช้เวลาของเครื่องผู้ใช้ ซึ่งคือเวลาไทยอยู่แล้วเพราะร้านอยู่ไทย
function todayISO() {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  return new Date(now.getTime() - offsetMinutes * 60000).toISOString().slice(0, 10);
}

function itemStatusBadge(status, t) {
  if (status === "broken") return <StatusBadge tone="danger">{t("item.statusBroken")}</StatusBadge>;
  if (status === "out") return <StatusBadge tone="warning">{t("item.statusOut")}</StatusBadge>;
  return <StatusBadge tone="success">{t("item.statusOk")}</StatusBadge>;
}

function borrowStatusBadge(status, t) {
  if (status === "overdue") return <StatusBadge tone="danger">{t("borrow.statusOverdue")}</StatusBadge>;
  if (status === "returned") return <StatusBadge tone="neutral">{t("borrow.statusReturned")}</StatusBadge>;
  return <StatusBadge tone="success">{t("borrow.statusActive")}</StatusBadge>;
}

// ---------------------------------------------------------------------------
// ชิ้นส่วนของหน้า
// ---------------------------------------------------------------------------

function StatCard({ label, value, unit }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="t-caption">{label}</p>
        <p className="t-page-title mt-2">
          {value} <span className="t-caption">{unit}</span>
        </p>
      </CardContent>
    </Card>
  );
}

// แถบยืนยันก่อนทำสิ่งที่ย้อนกลับยาก — ใช้แทน confirm() ของเบราว์เซอร์
// เพราะกล่องของเบราว์เซอร์ขึ้นเป็นภาษาของเบราว์เซอร์ ไม่ใช่ภาษาที่ผู้ใช้เลือกในเว็บเรา
function ConfirmPanel({ message, confirmLabel, onConfirm, onCancel, busy, error }) {
  const { t } = useLanguage();

  return (
    <Card className="mb-5">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-body">{message}</p>
          <div className="flex shrink-0 gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={busy}>
              {t("item.cancel")}
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={busy}>
              {confirmLabel}
            </Button>
          </div>
        </div>

        {/* ถ้าลบหรือรับคืนไม่สำเร็จ แผงนี้ต้องไม่ปิดตัวเอง เหตุผลจะได้อยู่ตรงที่ผู้ใช้กด
            และปุ่มลองใหม่ก็อยู่ตรงนั้นพอดี ไม่ใช่ toast ที่หายไปใน 4 วินาที */}
        <FormError message={error} onRetry={onConfirm} retrying={busy} />
      </CardContent>
    </Card>
  );
}

// ฟอร์มเพิ่ม/แก้ไขอุปกรณ์ — ใช้ตัวเดียวกันทั้งสองงาน ต่างกันแค่ค่าตั้งต้น
function ItemForm({ item, onSaved, onCancel }) {
  const { t } = useLanguage();
  const editing = Boolean(item);

  const [form, setForm] = useState({
    code: item?.code ?? "",
    name: item?.name ?? "",
    category: item?.category ?? "",
    total: item ? String(item.total) : "1",
    daily_rate: item ? String(item.daily_rate) : "0",
  });
  const [errors, setErrors] = useState({});
  // ข้อผิดพลาดที่ไม่ได้เป็นของช่องใดช่องหนึ่ง เช่นเน็ตหลุด หรือเพดาน 50 ชิ้นของแพ็กเกจฟรี
  // ขึ้นในกล่องที่อยู่ติดปุ่มบันทึก ไม่ใช่ toast (docs/brand.md หัวข้อ 6)
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // ตรวจทุกช่องพร้อมกัน ไม่หยุดที่ช่องแรกที่ผิด ผู้ใช้จะได้แก้รอบเดียวจบ
  function validate() {
    const found = {};
    if (!form.code.trim()) found.code = t("validate.itemCode");
    if (!form.name.trim()) found.name = t("validate.itemName");
    if (!form.category.trim()) found.category = t("validate.itemCategory");

    const total = Number(form.total);
    if (!Number.isInteger(total) || total < 1) found.total = t("validate.itemTotal");

    const rate = Number(form.daily_rate);
    if (Number.isNaN(rate) || rate < 0) found.daily_rate = t("validate.itemRate");

    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // ข้อความอยู่ใต้ช่องที่ผิดแล้ว ตรงนี้แค่พาโฟกัสไปหาช่องแรก
      // ไม่ต้องสรุปซ้ำเป็น toast เพราะ toast ไม่บอกว่าผิดช่องไหน
      setFormError("");
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      total: Number(form.total),
      daily_rate: Number(form.daily_rate),
    };

    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await apiFetch(`/api/items/${item.id}`, { method: "PUT", body });
        toast.success(t("item.updated"));
      } else {
        await apiFetch("/api/items", { method: "POST", body });
        toast.success(t("item.created"));
      }
      onSaved();
    } catch (error) {
      // รหัสซ้ำเป็นความผิดของช่อง code โดยตรง จึงขึ้นใต้ช่องนั้น ไม่ใช่ในกล่องรวม
      // ถ้าขึ้นทั้งสองที่ ผู้ใช้จะอ่านข้อความเดียวกันสองรอบแล้วยังไม่รู้ว่าต้องแก้ตรงไหน
      if (error.code === "item_code_taken") {
        setErrors({ code: t("error.item_code_taken") });
        document.getElementById("code")?.focus();
        return;
      }

      // 🔴 ต้องผ่าน errorMessage เสมอ ห้ามเอา error.message มาโชว์ตรงๆ
      setFormError(errorMessage(error, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>{editing ? t("item.editTitle") : t("item.newTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="code"
              label={t("item.code")}
              hint={t("item.codeHint")}
              error={errors.code}
              value={form.code}
              onChange={(event) => change("code", event.target.value)}
              maxLength={32}
            />
            <FormField
              id="name"
              label={t("item.name")}
              placeholder={t("item.namePlaceholder")}
              error={errors.name}
              value={form.name}
              onChange={(event) => change("name", event.target.value)}
              maxLength={160}
            />
            <FormField
              id="category"
              label={t("item.category")}
              placeholder={t("item.categoryPlaceholder")}
              error={errors.category}
              value={form.category}
              onChange={(event) => change("category", event.target.value)}
              maxLength={60}
            />
            <FormField
              id="total"
              label={t("item.total")}
              hint={t("item.totalHint")}
              error={errors.total}
              type="number"
              min="1"
              value={form.total}
              onChange={(event) => change("total", event.target.value)}
            />
            <FormField
              id="daily_rate"
              label={t("item.dailyRate")}
              hint={t("item.dailyRateHint")}
              error={errors.daily_rate}
              type="number"
              min="0"
              step="0.01"
              value={form.daily_rate}
              onChange={(event) => change("daily_rate", event.target.value)}
            />
          </div>

          {/* กล่องนี้ต้องอยู่ติดปุ่มบันทึก เพราะบนมือถือฟอร์มนี้ยาวเกินหนึ่งจอ
              ถ้าไปอยู่บนสุด ผู้ใช้ที่กดปุ่มล่างสุดจะไม่เห็นว่าเกิดอะไรขึ้น */}
          <FormError message={formError} onRetry={handleSubmit} retrying={saving} />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={saving}>
              {saving ? t("item.saving") : t("item.save")}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              {t("item.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ฟอร์มเปิดรายการเช่า — เปิดจากปุ่มในแถวของอุปกรณ์ จึงรู้อยู่แล้วว่าปล่อยเช่าชิ้นไหน
function BorrowForm({ item, onSaved, onCancel }) {
  const { t } = useLanguage();

  const [form, setForm] = useState({ customer_name: "", customer_phone: "", due_date: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const found = {};
    if (!form.customer_name.trim()) found.customer_name = t("validate.customerName");
    if (!form.due_date) found.due_date = t("validate.dueDate");
    else if (form.due_date < todayISO()) found.due_date = t("validate.dueDatePast");
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      setFormError("");
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await apiFetch("/api/borrows", {
        method: "POST",
        body: {
          item_id: item.id,
          customer_name: form.customer_name.trim(),
          customer_phone: form.customer_phone.trim() || null,
          due_date: form.due_date,
        },
      });
      toast.success(t("borrow.created"));
      onSaved();
    } catch (error) {
      // เคสที่เจอบ่อยสุดคือของถูกยืมไปหมดแล้วระหว่างที่ฟอร์มนี้เปิดค้างอยู่
      // ซึ่งไม่ใช่ความผิดของช่องไหนเลย จึงขึ้นเป็นกล่องรวมข้างปุ่ม
      setFormError(errorMessage(error, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>{t("borrow.newTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <p className="t-label">{t("borrow.forItem")}</p>
            <p className="t-body mt-2">
              {item.name} <span className="t-caption">({item.code})</span>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="customer_name"
              label={t("borrow.customerName")}
              placeholder={t("borrow.customerNamePlaceholder")}
              error={errors.customer_name}
              value={form.customer_name}
              onChange={(event) => change("customer_name", event.target.value)}
              maxLength={120}
            />
            <FormField
              id="customer_phone"
              label={t("borrow.customerPhone")}
              badge={t("borrow.customerPhoneOptional")}
              type="tel"
              value={form.customer_phone}
              onChange={(event) => change("customer_phone", event.target.value)}
              maxLength={32}
            />
            <FormField
              id="due_date"
              label={t("borrow.dueDate")}
              hint={t("borrow.dueDateHint")}
              error={errors.due_date}
              type="date"
              min={todayISO()}
              value={form.due_date}
              onChange={(event) => change("due_date", event.target.value)}
            />
          </div>

          <FormError message={formError} onRetry={handleSubmit} retrying={saving} />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={saving}>
              {saving ? t("borrow.submitting") : t("borrow.submit")}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              {t("item.cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ตัวหน้า
// ---------------------------------------------------------------------------

export default function Workspace() {
  const { user, loading, logout } = useAuth({ redirectTo: "/login" });
  const { t, language } = useLanguage();

  const [tab, setTab] = useState("items");
  const [summary, setSummary] = useState(null);

  // ตัวกรองของแท็บอุปกรณ์
  const [query, setQuery] = useState(""); // สิ่งที่ผู้ใช้กำลังพิมพ์
  const [keyword, setKeyword] = useState(""); // คำที่ส่งไป backend จริง (หน่วงแล้ว)
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  // ตัวกรองและข้อมูลของแท็บรายการเช่า
  const [borrowFilter, setBorrowFilter] = useState("active");
  const [borrows, setBorrows] = useState([]);
  const [borrowsLoading, setBorrowsLoading] = useState(true);

  // แผงที่เปิดอยู่ด้านบนตาราง: เพิ่ม แก้ไข หรือปล่อยเช่า
  const [panel, setPanel] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  // ข้อผิดพลาดระดับหน้า — โหลดตารางไม่ขึ้น หรือสลับสถานะชำรุดไม่สำเร็จ
  // ขึ้นเป็นกล่องเหนือตาราง ไม่ใช่ toast (docs/brand.md หัวข้อ 6)
  const [pageError, setPageError] = useState("");
  // ข้อผิดพลาดของแผงยืนยัน แยกจากตัวบน เพราะคนละที่บนหน้าจอ
  const [confirmError, setConfirmError] = useState("");

  // หน่วงการค้นหา 300 มิลลิวินาที — ไม่งั้นพิมพ์หนึ่งตัวอักษรยิง API หนึ่งครั้ง
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(query.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await apiFetch("/api/items/summary"));
    } catch (error) {
      setPageError(errorMessage(error, t));
    }
  }, [t]);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await apiFetch("/api/items/categories"));
    } catch (error) {
      // หมวดเป็นแค่ตัวช่วยกรอง โหลดไม่ได้ก็ยังใช้หน้านี้ได้ ไม่ต้องรบกวนผู้ใช้
    }
  }, []);

  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (keyword) params.set("q", keyword);
      if (category) params.set("category", category);
      if (statusFilter) params.set("status", statusFilter);

      const data = await apiFetch(`/api/items?${params.toString()}`);
      setItems(data.items);
      setItemsTotal(data.total);
      setPageError("");
    } catch (error) {
      setPageError(errorMessage(error, t));
    } finally {
      setItemsLoading(false);
    }
  }, [keyword, category, statusFilter, page, t]);

  const loadBorrows = useCallback(async () => {
    setBorrowsLoading(true);
    try {
      const params = new URLSearchParams();
      if (borrowFilter) params.set("status", borrowFilter);

      setBorrows(await apiFetch(`/api/borrows?${params.toString()}`));
      setPageError("");
    } catch (error) {
      setPageError(errorMessage(error, t));
    } finally {
      setBorrowsLoading(false);
    }
  }, [borrowFilter, t]);

  // โหลดข้อมูลเมื่อ login เสร็จแล้วเท่านั้น ยิงก่อนหน้านั้นจะได้ 401
  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user, loadItems]);

  useEffect(() => {
    if (!user) return;
    loadBorrows();
  }, [user, loadBorrows]);

  useEffect(() => {
    if (!user) return;
    loadSummary();
    loadCategories();
  }, [user, loadSummary, loadCategories]);

  // เรียกหลังทุกครั้งที่ข้อมูลเปลี่ยน เพราะตัวเลขบนแถบสถานะต้องตรงกับตารางเสมอ
  async function refreshAll() {
    setPanel(null);
    setConfirm(null);
    setConfirmError("");
    await Promise.all([loadItems(), loadBorrows(), loadSummary(), loadCategories()]);
  }

  async function handleDelete(item) {
    setBusy(true);
    setConfirmError("");
    try {
      await apiFetch(`/api/items/${item.id}`, { method: "DELETE" });
      toast.success(t("item.deleted"));
      await refreshAll();
    } catch (error) {
      // เคสที่เจอจริงคือของชิ้นนี้เคยถูกเช่าไปแล้ว ซึ่งลบไม่ได้และต้องอธิบายให้ครบ
      // แผงยืนยันจึงเปิดค้างไว้พร้อมเหตุผล แทนที่จะปิดตัวเองแล้วทิ้ง toast ไว้ใบเดียว
      setConfirmError(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }

  async function handleReturn(borrow) {
    setBusy(true);
    setConfirmError("");
    try {
      await apiFetch(`/api/borrows/${borrow.id}/return`, { method: "PUT" });
      toast.success(t("borrow.returned"));
      await refreshAll();
    } catch (error) {
      setConfirmError(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  }

  // สลับของชำรุด / กลับมาให้เช่าได้ — ส่งแค่ช่อง status ช่องเดียว
  async function toggleBroken(item) {
    setPageError("");
    try {
      await apiFetch(`/api/items/${item.id}`, {
        method: "PUT",
        body: { status: item.status === "broken" ? "ok" : "broken" },
      });
      toast.success(t("item.updated"));
      await refreshAll();
    } catch (error) {
      setPageError(errorMessage(error, t));
    }
  }

  function clearFilters() {
    setQuery("");
    setKeyword("");
    setCategory("");
    setStatusFilter("");
    setPage(1);
  }

  if (loading) return null;

  const hasFilter = Boolean(keyword || category || statusFilter);
  const lastPage = Math.max(1, Math.ceil(itemsTotal / PAGE_SIZE));

  return (
    <>
      <Head>
        <title>{t("page.workspace")}</title>
      </Head>

      <AppShell user={user} onLogout={logout}>
        <PageHeader
          title={t("workspace.title")}
          description={t("workspace.subtitle")}
          action={
            <Button onClick={() => setPanel({ mode: "new" })}>{t("item.add")}</Button>
          }
        />

        {/* แถบสถานะ — เจ้าของร้านดูสามตัวเลขนี้ก่อนอย่างอื่นเสมอ */}
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard
            label={t("workspace.statAvailable")}
            value={summary ? summary.available_units : "-"}
            unit={t("workspace.unit")}
          />
          <StatCard
            label={t("workspace.statBorrowed")}
            value={summary ? summary.borrowed_units : "-"}
            unit={t("workspace.unit")}
          />
          <StatCard
            label={t("workspace.statOverdue")}
            value={summary ? summary.overdue_borrows : "-"}
            unit={t("workspace.unitBorrow")}
          />
        </div>

        {/* เตือนเมื่อแพ็กเกจฟรีใกล้เต็ม — ขึ้นตั้งแต่ 40 รายการ */}
        {user?.role === "free" && summary && summary.item_rows >= 40 ? (
          <p className="t-caption mb-4">
            {fill(t("item.limitBanner"), { count: summary.item_rows })}
          </p>
        ) : null}

        {/* ปุ่มสลับแท็บ */}
        <div className="mb-5 flex gap-3">
          <Button
            variant={tab === "items" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("items")}
          >
            {t("workspace.tabItems")}
          </Button>
          <Button
            variant={tab === "borrows" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("borrows")}
          >
            {t("workspace.tabBorrows")}
          </Button>
        </div>

        {/* แผงฟอร์ม — เปิดได้ทีละหนึ่ง */}
        {panel?.mode === "new" ? (
          <ItemForm onSaved={refreshAll} onCancel={() => setPanel(null)} />
        ) : null}

        {panel?.mode === "edit" ? (
          <ItemForm item={panel.item} onSaved={refreshAll} onCancel={() => setPanel(null)} />
        ) : null}

        {panel?.mode === "borrow" ? (
          <BorrowForm item={panel.item} onSaved={refreshAll} onCancel={() => setPanel(null)} />
        ) : null}

        {confirm?.kind === "delete" ? (
          <ConfirmPanel
            message={fill(t("item.confirmDelete"), { name: confirm.item.name })}
            confirmLabel={t("item.delete")}
            busy={busy}
            error={confirmError}
            onConfirm={() => handleDelete(confirm.item)}
            onCancel={() => {
              setConfirm(null);
              setConfirmError("");
            }}
          />
        ) : null}

        {confirm?.kind === "return" ? (
          <ConfirmPanel
            message={fill(t("borrow.confirmReturn"), {
              name: confirm.borrow.item_name,
              customer: confirm.borrow.customer_name,
            })}
            confirmLabel={t("borrow.return")}
            busy={busy}
            error={confirmError}
            onConfirm={() => handleReturn(confirm.borrow)}
            onCancel={() => {
              setConfirm(null);
              setConfirmError("");
            }}
          />
        ) : null}

        {/* โหลดตารางไม่ขึ้น หรือสลับสถานะชำรุดไม่สำเร็จ — ขึ้นเหนือตารางพร้อมปุ่มลองใหม่
            ไม่ใช่ toast เพราะผู้ใช้ต้องอ่านทันว่าตัวเลขบนแถบสถานะที่เห็นอยู่ยังเชื่อได้ไหม */}
        <FormError
          message={pageError}
          onRetry={tab === "items" ? loadItems : loadBorrows}
          retrying={tab === "items" ? itemsLoading : borrowsLoading}
        />

        {tab === "items" ? (
          <section className="flex flex-col gap-4">
            {/* ตัวกรอง */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                id="search"
                label={t("workspace.searchLabel")}
                placeholder={t("workspace.searchPlaceholder")}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />

              <div>
                <label htmlFor="filter-category" className="t-label mb-2 block">
                  {t("workspace.filterCategory")}
                </label>
                <select
                  id="filter-category"
                  className="field-input"
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("workspace.filterAll")}</option>
                  {categories.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-status" className="t-label mb-2 block">
                  {t("workspace.filterStatus")}
                </label>
                <select
                  id="filter-status"
                  className="field-input"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t("workspace.filterAll")}</option>
                  <option value="ok">{t("item.statusOk")}</option>
                  <option value="out">{t("item.statusOut")}</option>
                  <option value="broken">{t("item.statusBroken")}</option>
                </select>
              </div>
            </div>

            {/* สามสถานะที่ทุกหน้าต้องมี: กำลังโหลด / ไม่มีข้อมูล / มีข้อมูล */}
            {itemsLoading ? (
              <LoadingState rows={5} />
            ) : items.length === 0 ? (
              <EmptyState
                title={hasFilter ? t("workspace.noResultTitle") : t("item.emptyTitle")}
                description={hasFilter ? t("workspace.noResultBody") : t("item.emptyBody")}
                action={
                  hasFilter ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      {t("workspace.clearFilter")}
                    </Button>
                  ) : (
                    <Button onClick={() => setPanel({ mode: "new" })}>{t("item.add")}</Button>
                  )
                }
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  {/* ตารางกว้างกว่าจอมือถือ เลยต้องครอบด้วย overflow-x-auto
                      ไม่งั้นทั้งหน้าจะเลื่อนซ้ายขวาได้ */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[46rem] border-collapse">
                      <thead>
                        <tr className="border-b border-line text-left">
                          <th className="t-label p-4">{t("item.code")}</th>
                          <th className="t-label p-4">{t("item.name")}</th>
                          <th className="t-label p-4">{t("item.category")}</th>
                          <th className="t-label p-4">{t("item.available")}</th>
                          <th className="t-label p-4">{t("item.dailyRate")}</th>
                          <th className="t-label p-4">{t("item.status")}</th>
                          <th className="t-label p-4">{t("item.actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className="border-b border-line last:border-0">
                            <td className="t-body p-4">{item.code}</td>
                            <td className="t-body p-4">{item.name}</td>
                            <td className="t-body p-4">{item.category}</td>
                            <td className="t-body p-4">
                              {item.available} / {item.total}
                            </td>
                            <td className="t-body p-4">{formatMoney(item.daily_rate)}</td>
                            <td className="p-4">{itemStatusBadge(item.status, t)}</td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => setPanel({ mode: "borrow", item })}
                                  disabled={item.available <= 0 || item.status === "broken"}
                                >
                                  {t("borrow.open")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPanel({ mode: "edit", item })}
                                >
                                  {t("item.edit")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleBroken(item)}
                                >
                                  {item.status === "broken" ? t("item.markOk") : t("item.markBroken")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirm({ kind: "delete", item })}
                                >
                                  {t("item.delete")}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* แบ่งหน้า — ขึ้นเฉพาะตอนที่มีมากกว่าหนึ่งหน้าจริงๆ */}
            {!itemsLoading && itemsTotal > PAGE_SIZE ? (
              <div className="flex items-center justify-between gap-4">
                <p className="t-caption">
                  {fill(t("workspace.showing"), { shown: items.length, total: itemsTotal })}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    {t("workspace.prev")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= lastPage}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    {t("workspace.next")}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            <div className="sm:max-w-xs">
              <label htmlFor="filter-borrow" className="t-label mb-2 block">
                {t("workspace.filterStatus")}
              </label>
              <select
                id="filter-borrow"
                className="field-input"
                value={borrowFilter}
                onChange={(event) => setBorrowFilter(event.target.value)}
              >
                <option value="active">{t("borrow.statusActive")}</option>
                <option value="overdue">{t("borrow.statusOverdue")}</option>
                <option value="returned">{t("borrow.statusReturned")}</option>
                <option value="">{t("workspace.filterAll")}</option>
              </select>
            </div>

            {borrowsLoading ? (
              <LoadingState rows={5} />
            ) : borrows.length === 0 ? (
              <EmptyState
                title={itemsTotal === 0 ? t("borrow.noItemTitle") : t("borrow.emptyTitle")}
                description={itemsTotal === 0 ? t("borrow.noItemBody") : t("borrow.emptyBody")}
                action={
                  <Button variant="secondary" onClick={() => setTab("items")}>
                    {t("workspace.tabItems")}
                  </Button>
                }
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[46rem] border-collapse">
                      <thead>
                        <tr className="border-b border-line text-left">
                          <th className="t-label p-4">{t("borrow.item")}</th>
                          <th className="t-label p-4">{t("borrow.customer")}</th>
                          <th className="t-label p-4">{t("borrow.borrowedAt")}</th>
                          <th className="t-label p-4">{t("borrow.dueDate")}</th>
                          <th className="t-label p-4">{t("borrow.estimated")}</th>
                          <th className="t-label p-4">{t("item.status")}</th>
                          <th className="t-label p-4">{t("item.actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {borrows.map((borrow) => (
                          <tr key={borrow.id} className="border-b border-line last:border-0">
                            <td className="t-body p-4">
                              {borrow.item_name}
                              <span className="t-caption"> ({borrow.item_code})</span>
                            </td>
                            <td className="t-body p-4">
                              {borrow.customer_name}
                              {borrow.customer_phone ? (
                                <span className="t-caption"> · {borrow.customer_phone}</span>
                              ) : null}
                            </td>
                            <td className="t-body p-4">{formatDate(borrow.borrowed_at, language)}</td>
                            <td className="t-body p-4">{formatDate(borrow.due_date, language)}</td>
                            <td className="t-body p-4">
                              {formatMoney(borrow.estimated_price)}
                              <span className="t-caption"> · {borrow.days} {t("borrow.days")}</span>
                            </td>
                            <td className="p-4">{borrowStatusBadge(borrow.status, t)}</td>
                            <td className="p-4">
                              {borrow.returned_at ? null : (
                                <Button
                                  size="sm"
                                  onClick={() => setConfirm({ kind: "return", borrow })}
                                >
                                  {t("borrow.return")}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </AppShell>
    </>
  );
}
