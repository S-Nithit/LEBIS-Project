// หน้า Admin Dashboard — ภาพรวมทั้งระบบ เห็นได้เฉพาะ role admin
//
// การซ่อนเมนูใน AppShell ไม่ใช่การกันสิทธิ์ ตัวกันจริงคือ require_role("admin")
// ที่ทุก endpoint ใน routes/admin.py หน้านี้เช็ก role ซ้ำฝั่งหน้าเว็บด้วย
// เพื่อไม่ต้องยิง API ไปแล้วโดน 403 แต่ backend ก็ยังกันอยู่ดีไม่ว่าอะไรจะเกิดขึ้น

import Head from "next/head";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { FormError } from "@/components/FormError";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useLanguage } from "@/lib/useLanguage";

function formatMoney(value) {
  return `฿${Number(value).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function formatMonth(monthStr, language) {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(language === "en" ? "en-US" : "th-TH", {
    month: "short",
    year: "numeric",
  });
}

function StatCard({ label, value, note }) {
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

// กราฟเส้นรายได้ — วาด SVG เอง ไม่ใช้ไลบรารี (ในโปรเจกต์ไม่มีไลบรารีกราฟเลย
// แม้แต่ในหน้ารายงานของนีโอ) ใช้ตัวแปรสีของระบบเพื่อให้ขึ้นถูกสีตามโหมดมืด/สว่าง
// และมีตัวเลขเป็นตัวหนังสือคู่กับกราฟเสมอ (คนที่อ่านกราฟเส้นไม่สะดวกยังเห็นตัวเลขตรงๆ)
function RevenueChart({ data, t, language }) {
  const width = 600;
  const height = 200;
  const padLeft = 40;
  const padRight = 40;
  const padTop = 16;
  const padBottom = 28;
  const max = Math.max(1, ...data.map((d) => d.amount));
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    ...d,
    x: padLeft + i * stepX,
    y: padTop + (1 - d.amount / max) * innerHeight,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="admin-revenue-title" className="w-full">
        <title id="admin-revenue-title">{t("admin.charts.revenueTitle")}</title>
        <line
          x1={padLeft}
          y1={height - padBottom}
          x2={width - padRight}
          y2={height - padBottom}
          stroke="var(--line)"
          strokeWidth="1"
        />
        <path d={pathD} fill="none" stroke="var(--amber)" strokeWidth="2" />
        {points.map((p) => (
          <circle key={p.month} cx={p.x} cy={p.y} r="3" fill="var(--amber)" />
        ))}
        {points.map((p) => (
          <text
            key={`label-${p.month}`}
            x={p.x}
            y={height - padBottom + 16}
            textAnchor="middle"
            fill="var(--muted)"
            style={{ fontSize: 10 }}
          >
            {formatMonth(p.month, language)}
          </text>
        ))}
      </svg>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {data.map((d) => (
          <li key={d.month} className="t-caption flex justify-between gap-2">
            <span>{formatMonth(d.month, language)}</span>
            <span className="font-medium text-ink">{formatMoney(d.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// กราฟแท่งคนสมัครใหม่ Free เทียบ Pro — แพตเทิร์นเดียวกับกราฟเส้นด้านบน
function SignupsChart({ data, t, language }) {
  const width = 600;
  const height = 200;
  const padLeft = 40;
  const padRight = 40;
  const padTop = 16;
  const padBottom = 28;
  const groupGap = 16;
  const barGap = 4;
  const max = Math.max(1, ...data.map((d) => Math.max(d.free, d.pro)));
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const groupWidth = innerWidth / data.length;
  const barWidth = (groupWidth - groupGap - barGap) / 2;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="t-caption flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--line-strong)" }} />
          {t("admin.stats.free")}
        </span>
        <span className="t-caption flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--amber)" }} />
          {t("admin.stats.pro")}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="admin-signups-title" className="w-full">
        <title id="admin-signups-title">{t("admin.charts.signupsTitle")}</title>
        <line
          x1={padLeft}
          y1={height - padBottom}
          x2={width - padRight}
          y2={height - padBottom}
          stroke="var(--line)"
          strokeWidth="1"
        />
        {data.map((d, i) => {
          const groupX = padLeft + i * groupWidth + groupGap / 2;
          const freeHeight = (d.free / max) * innerHeight;
          const proHeight = (d.pro / max) * innerHeight;
          return (
            <g key={d.month}>
              <rect
                x={groupX}
                y={padTop + innerHeight - freeHeight}
                width={barWidth}
                height={freeHeight}
                fill="var(--line-strong)"
              />
              <rect
                x={groupX + barWidth + barGap}
                y={padTop + innerHeight - proHeight}
                width={barWidth}
                height={proHeight}
                fill="var(--amber)"
              />
              <text
                x={groupX + barWidth}
                y={height - padBottom + 16}
                textAnchor="middle"
                fill="var(--muted)"
                style={{ fontSize: 10 }}
              >
                {formatMonth(d.month, language)}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {data.map((d) => (
          <li key={d.month} className="t-caption flex justify-between gap-2">
            <span>{formatMonth(d.month, language)}</span>
            <span className="font-medium text-ink">
              {t("admin.stats.free")} {d.free} · {t("admin.stats.pro")} {d.pro}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading, loadError, reload, logout } = useAuth({ redirectTo: "/login" });
  const { t, language } = useLanguage();

  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  async function load() {
    setDataLoading(true);
    setDataError(null);
    try {
      const result = await apiFetch("/api/admin/overview");
      setData(result);
    } catch (error) {
      setDataError(error);
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "admin") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
        <PageHeader title={t("admin.title")} />
        <FormError message={errorMessage(loadError, t)} onRetry={reload} retrying={loading} />
      </AppShell>
    );
  }

  // คนทั่วไปที่พิมพ์ /admin ตรงๆ ต้องเห็นข้อความนี้ ไม่ใช่จอขาวหรือ error ที่อ่านไม่รู้เรื่อง
  if (user.role !== "admin") {
    return (
      <>
        <Head>
          <title>{t("page.admin")}</title>
        </Head>
        <AppShell user={user} onLogout={logout}>
          <PageHeader title={t("admin.title")} />
          <EmptyState title={t("admin.noAccessTitle")} description={t("admin.noAccessBody")} />
        </AppShell>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{t("page.admin")}</title>
      </Head>
      <AppShell user={user} onLogout={logout}>
        <PageHeader title={t("admin.title")} description={t("admin.subtitle")} />

        {dataLoading && !data ? (
          <LoadingState rows={4} />
        ) : dataError ? (
          <FormError message={errorMessage(dataError, t)} onRetry={load} retrying={dataLoading} />
        ) : (
          <div className="flex flex-col gap-5" aria-busy={dataLoading}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
              <StatCard
                label={t("admin.stats.shops")}
                value={data.total_shops.toLocaleString("th-TH")}
                note={`${t("admin.stats.free")} ${data.free_count} · ${t("admin.stats.pro")} ${data.pro_count}`}
              />
              <StatCard label={t("admin.stats.conversion")} value={`${(data.conversion_rate * 100).toFixed(1)}%`} />
              <StatCard
                label={t("admin.stats.mrr")}
                value={formatMoney(data.mrr)}
                note={`${t("admin.stats.arr")} ${formatMoney(data.arr)}`}
              />
              <StatCard
                label={t("admin.stats.rentals")}
                value={data.total_rentals.toLocaleString("th-TH")}
                note={`${t("admin.stats.itemsOut")} ${data.items_out}`}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("admin.charts.revenueTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart data={data.revenue_by_month} t={t} language={language} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("admin.charts.signupsTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <SignupsChart data={data.signups_by_month} t={t} language={language} />
              </CardContent>
            </Card>
          </div>
        )}
      </AppShell>
    </>
  );
}