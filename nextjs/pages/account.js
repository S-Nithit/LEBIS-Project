// หน้าที่ผู้ใช้มาถึงหลังเข้าสู่ระบบสำเร็จ
//
// มีไว้เพื่อสองอย่าง
//   1. ไม่ให้เจ้าของร้านที่เพิ่งสมัครเสร็จตกไปอยู่หน้าตัวอย่างของ boilerplate
//   2. เป็นตัวอย่างการใช้ AppShell + PageHeader + Card + EmptyState จริงๆ
//      ให้เพื่อนดูก่อนจะไปเขียนหน้าของตัวเอง
//
// เมื่อหน้า workspace ของ Neo เสร็จแล้ว ให้เปลี่ยนปลายทางหลัง login
// ใน pages/login.js กับ pages/register.js ไปที่หน้านั้นแทน

import Head from "next/head";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/useAuth";
import { useLanguage } from "@/lib/useLanguage";

function Row({ label, value, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0 last:pb-0">
      <span className="t-caption">{label}</span>
      {children || <span className="t-body font-medium">{value}</span>}
    </div>
  );
}

export default function Account() {
  const { user, loading, logout } = useAuth({ redirectTo: "/login" });
  const { t } = useLanguage();

  // ระหว่างรอข้อมูลผู้ใช้ ยังไม่รู้ว่าจะแสดงชื่อใคร จึงยังไม่วาดแถบหัวเว็บ
  if (loading || !user) {
    return (
      <main className="app-container py-6">
        <LoadingState rows={3} />
      </main>
    );
  }

  const planTone = user.role === "free" ? "neutral" : "accent";
  const planLabel =
    user.role === "admin" ? t("role.admin") : user.role === "pro" ? t("role.pro") : t("role.free");

  return (
    <>
      <Head>
        <title>{t("account.title")} · LEBIS</title>
      </Head>

      <AppShell user={user} onLogout={logout}>
        <PageHeader title={t("account.title")} description={t("account.subtitle")} />

        <div className="flex flex-col gap-5">
          <Card>
            <CardContent className="p-5">
              <Row label={t("account.email")} value={user.email} />
              <Row label={t("account.shop")} value={user.shop_name || t("account.noShop")} />
              <Row label={t("account.plan")}>
                <StatusBadge tone={planTone}>{planLabel}</StatusBadge>
              </Row>
            </CardContent>
          </Card>

          <EmptyState title={t("account.emptyTitle")} description={t("account.emptyBody")} />
        </div>
      </AppShell>
    </>
  );
}
