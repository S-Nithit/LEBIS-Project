// หน้ารายงานการเช่า — ของชิ้นไหนทำเงิน ประวัติการเช่า และส่งออก CSV
//
// ตอบปัญหาข้อ 3 ของร้านใน Proposal: "ไม่รู้ว่าของชิ้นไหนทำเงิน"
// ข้อมูลมาจาก GET /api/reports/rentals (routes/reports.py)
//
// กฎตามแพ็กเกจ — ตัดสินที่ backend ทั้งหมด หน้านี้แค่แสดงผลให้ตรงกัน
//   Free  ดูย้อนหลังได้ 7 วัน · ส่งออก CSV ไม่ได้
//   Pro   ดูย้อนหลังได้ทั้งหมด · ส่งออก CSV ได้
//   🔴 ซ่อนปุ่มไม่ใช่การกันสิทธิ์ ถึงผู้ใช้ Free ยิง API ตรงก็ได้ 403 จาก backend อยู่ดี

import { useCallback, useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { FormError } from "@/components/FormError";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiDownload, apiFetch, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useLanguage } from "@/lib/useLanguage";
import { cn } from "@/lib/utils";

// ช่วงเวลาที่เลือกได้ — days: null คือทั้งหมด
const RANGES = [
  { value: "7", days: 7, key: "reports.range7" },
  { value: "30", days: 30, key: "reports.range30" },
  { value: "all", days: null, key: "reports.rangeAll" },
];

// admin นับเป็น pro เหมือน TIER_ORDER ใน services/security.py
function isPro(user) {
  return user?.role === "pro" || user?.role === "admin";
}

function reportPath(rangeValue, extension = "") {
  const days = RANGES.find((range) => range.value === rangeValue)?.days;
  const path = `/api/reports/rentals${extension}`;
  return days ? `${path}?days=${days}` : path;
}

// แทน {count} ในข้อความแปล
function fill(text, values) {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value), text);
}

function formatDate(value, language) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(language === "en" ? "en-GB" : "th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// เงินมาจาก API เป็นข้อความ เช่น "600.00" (backend ใช้ Decimal ไม่ใช่ float)
function formatMoney(value) {
  return `฿${Number(value).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
}

// สีเดียวกับหน้าอุปกรณ์ของ Neo — สถานะเดียวกันต้องสีเดียวกันทั้งระบบ
function statusBadge(status, t) {
  if (status === "overdue") return <StatusBadge tone="danger">{t("borrow.statusOverdue")}</StatusBadge>;
  if (status === "returned") return <StatusBadge tone="neutral">{t("borrow.statusReturned")}</StatusBadge>;
  return <StatusBadge tone="success">{t("borrow.statusActive")}</StatusBadge>;
}

function CardRow({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="t-caption shrink-0">{label}</span>
      <span className="t-body text-right">{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ชิ้นส่วนของหน้า
// ---------------------------------------------------------------------------

// ปุ่มเลือกช่วงเวลา — ผู้ใช้ Free กดได้แค่ 7 วัน ช่องอื่นแสดงไว้ให้เห็นว่ามี
function RangePicker({ value, onChange, pro }) {
  const { t } = useLanguage();
  return (
    <div role="group" aria-label={t("reports.range")} className="inline-flex rounded-control border border-line bg-surface p-1">
      {RANGES.map((range) => {
        const locked = !pro && range.value !== "7";
        const active = value === range.value;
        return (
          <button
            key={range.value}
            type="button"
            aria-pressed={active}
            disabled={locked}
            onClick={() => onChange(range.value)}
            className={cn(
              "min-h-[44px] rounded-control px-4 text-label font-medium",
              active ? "bg-ink text-on-ink" : "text-muted hover:text-ink",
              locked && "cursor-not-allowed"
            )}
          >
            {t(range.key)}
          </button>
        );
      })}
    </div>
  );
}

function SummaryCard({ label, value, note }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4 sm:p-5">
        <span className="t-caption">{label}</span>
        <span className="font-display text-2xl font-bold text-ink">{value}</span>
        {note ? <span className="t-caption">{note}</span> : null}
      </CardContent>
    </Card>
  );
}

function TopItems({ items }) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reports.topTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col">
          {items.map((item, index) => (
            <li key={item.code} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
              <span className="t-label w-6 shrink-0 text-muted">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="t-body truncate font-medium">{item.name}</p>
                <p className="t-caption">
                  {item.code} · {fill(t("reports.topRentals"), { count: item.rentals })}
                </p>
              </div>
              <span className="t-body font-medium">{formatMoney(item.revenue)}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function History({ rows }) {
  const { t, language } = useLanguage();
  const returned = (row) => (row.returned_at ? formatDate(row.returned_at, language) : t("reports.notReturned"));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reports.historyTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* มือถือ: การ์ดใบละรายการ — ตารางกว้างๆ บนจอ 390px ต้องเลื่อนขวา
            แล้วคอลัมน์ยอดเงินจะอยู่นอกจอ (บทเรียนเดียวกับหน้าอุปกรณ์) */}
        <ul className="flex flex-col sm:hidden">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-col gap-2 border-b border-line p-4 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="t-body font-medium">{row.name}</p>
                  <p className="t-caption">{row.code}</p>
                </div>
                {statusBadge(row.status, t)}
              </div>
              <CardRow label={t("reports.colCustomer")}>{row.customer_name}</CardRow>
              <CardRow label={t("reports.colBorrowed")}>{formatDate(row.borrowed_at, language)}</CardRow>
              <CardRow label={t("reports.colReturned")}>{returned(row)}</CardRow>
              <CardRow label={t("reports.colAmount")}>
                {formatMoney(row.amount)} · {fill(t("reports.days"), { count: row.days })}
              </CardRow>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="t-label p-4">{t("reports.colItem")}</th>
                <th className="t-label p-4">{t("reports.colCustomer")}</th>
                <th className="t-label p-4">{t("reports.colBorrowed")}</th>
                <th className="t-label p-4">{t("reports.colDue")}</th>
                <th className="t-label p-4">{t("reports.colReturned")}</th>
                <th className="t-label p-4 text-right">{t("reports.colDays")}</th>
                <th className="t-label p-4 text-right">{t("reports.colAmount")}</th>
                <th className="t-label p-4">{t("reports.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="p-4">
                    <p className="t-body font-medium">{row.name}</p>
                    <p className="t-caption">{row.code}</p>
                  </td>
                  <td className="t-body p-4">{row.customer_name}</td>
                  <td className="t-body p-4">{formatDate(row.borrowed_at, language)}</td>
                  <td className="t-body p-4">{formatDate(row.due_date, language)}</td>
                  <td className="t-body p-4">{returned(row)}</td>
                  <td className="t-body p-4 text-right">{row.days}</td>
                  <td className="t-body p-4 text-right">{formatMoney(row.amount)}</td>
                  <td className="p-4">{statusBadge(row.status, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// หน้า
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { user, loading, loadError, reload, logout } = useAuth({ redirectTo: "/login" });
  const { t } = useLanguage();

  const pro = isPro(user);
  // ยังไม่เลือกเอง = Free เริ่มที่ 7 วัน (เท่าที่ดูได้) · Pro เริ่มที่ 30 วัน
  const [chosenRange, setChosenRange] = useState(null);
  const range = chosenRange ?? (pro ? "30" : "7");

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // กดสลับช่วงเวลาเร็วๆ คำตอบของคำขอเก่าอาจมาถึงทีหลังคำขอใหม่
  // จำเลขคำขอล่าสุดไว้ คำตอบที่ไม่ใช่ของคำขอล่าสุดทิ้งไป — การกดครั้งล่าสุดต้องชนะเสมอ
  const latestRequest = useRef(0);

  const loadReport = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setReportLoading(true);
    setReportError("");
    try {
      const data = await apiFetch(reportPath(range));
      if (requestId === latestRequest.current) setReport(data);
    } catch (error) {
      if (requestId === latestRequest.current) setReportError(errorMessage(error, t));
    } finally {
      if (requestId === latestRequest.current) setReportLoading(false);
    }
  }, [range, t]);

  useEffect(() => {
    if (user) loadReport();
  }, [user, loadReport]);

  async function exportCsv() {
    setExporting(true);
    setExportError("");
    try {
      await apiDownload(reportPath(range, ".csv"), "lebis-rentals.csv");
      toast.success(t("reports.exported"));
    } catch (error) {
      setExportError(errorMessage(error, t));
    } finally {
      setExporting(false);
    }
  }

  // ---- สถานะของผู้ใช้ — แบบเดียวกับ pages/template.js
  if (loading && !user) {
    return (
      <AppShell>
        <LoadingState rows={3} />
      </AppShell>
    );
  }
  if (!user && !loadError) return null;
  if (!user) {
    return (
      <AppShell onLogout={logout}>
        <PageHeader title={t("reports.title")} />
        <FormError message={errorMessage(loadError, t)} onRetry={reload} retrying={loading} />
      </AppShell>
    );
  }

  // ปุ่มส่งออก — Free ไม่มีปุ่มให้กดแล้วเจอ 403 แต่บอกตรงๆ ว่าอยู่ในแพ็กเกจ Pro
  const exportAction = pro ? (
    <Button onClick={exportCsv} disabled={exporting} aria-busy={exporting}>
      {exporting ? t("reports.exporting") : t("reports.export")}
    </Button>
  ) : (
    <span className="t-caption">{t("reports.exportLocked")}</span>
  );

  return (
    <>
      <Head>
        <title>{t("page.reports")}</title>
      </Head>

      <AppShell user={user} onLogout={logout}>
        <PageHeader title={t("reports.title")} description={t("reports.subtitle")} action={exportAction} />
        {/* ส่งออกไม่สำเร็จ ขึ้นตรงนี้ใต้ปุ่ม ไม่ใช่ toast (docs/brand.md หัวข้อ 6) */}
        <FormError message={exportError} onRetry={exportCsv} retrying={exporting} />

        <div className="mb-5 flex flex-col gap-3">
          <RangePicker value={range} onChange={setChosenRange} pro={pro} />
          {!pro ? <p className="t-caption">{t("reports.limited")}</p> : null}
        </div>

        {reportLoading && !report ? (
          <LoadingState rows={4} />
        ) : reportError ? (
          <FormError message={reportError} onRetry={loadReport} retrying={reportLoading} />
        ) : report.rentals === 0 ? (
          <EmptyState
            title={t("reports.emptyTitle")}
            description={t("reports.emptyBody")}
            action={
              <Button asChild variant="secondary">
                <Link href="/workspace">{t("reports.emptyAction")}</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-5" aria-busy={reportLoading}>
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <SummaryCard label={t("reports.rentals")} value={report.rentals.toLocaleString("th-TH")} />
              <SummaryCard
                label={t("reports.revenue")}
                value={formatMoney(report.estimated_revenue)}
                note={t("reports.revenueNote")}
              />
            </div>
            <TopItems items={report.top_items} />
            <History rows={report.rows} />
          </div>
        )}
      </AppShell>
    </>
  );
}
