// หน้าที่ผู้ใช้มาถึงหลังเข้าสู่ระบบสำเร็จ
//
// มีไว้เพื่อสองอย่าง
//   1. ไม่ให้เจ้าของร้านที่เพิ่งสมัครเสร็จตกไปอยู่หน้าตัวอย่างของ boilerplate
//   2. เป็นตัวอย่างการใช้ AppShell + PageHeader + Card + EmptyState จริงๆ
//      ให้เพื่อนดูก่อนจะไปเขียนหน้าของตัวเอง
//
// เมื่อหน้า workspace ของ Neo เสร็จแล้ว ให้เปลี่ยนปลายทางหลัง login
// ใน pages/login.js กับ pages/register.js ไปที่หน้านั้นแทน

import { useEffect, useState } from "react";
import Head from "next/head";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { FormError } from "@/components/FormError";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/api";
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
  const { user, loading, loadError, reload, logout } = useAuth({ redirectTo: "/login" });
  const { t } = useLanguage();

  // แก้ชื่อร้านได้จากหน้านี้เลย เพราะเป็นข้อมูลเดียวที่เจ้าของร้านมักข้ามตอนสมัคร
  // แล้วไม่มีที่ไหนให้กลับมาใส่ (หน้าตั้งค่าเป็นงานของ Sea ยังไม่เสร็จ)
  const [editing, setEditing] = useState(false);
  const [shopName, setShopName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setShopName(user.shop_name || "");
  }, [user]);

  async function handleSaveShopName(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: { shop_name: shopName.trim() === "" ? null : shopName.trim() },
      });

      toast.success(t("account.saved"));
      setEditing(false);
      reload(); // ดึงข้อมูลใหม่ ชื่อร้านบนแถบหัวเว็บจะได้เปลี่ยนตาม
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setSaving(false);
    }
  }

  // ระหว่างรอข้อมูล วาดแถบหัวเว็บไว้ก่อนเลย หน้าจะได้ไม่กระโดดตอนข้อมูลมาถึง
  if (loading) {
    return (
      <AppShell>
        <LoadingState rows={3} />
      </AppShell>
    );
  }

  // 🔴 โหลดข้อมูลไม่สำเร็จเพราะเน็ตหรือเซิร์ฟเวอร์ (token ยังใช้ได้อยู่)
  //    ต้องบอกให้รู้และให้ทางไปต่อ ห้ามปล่อยให้หมุนค้างเป็น "กำลังโหลด..."
  //    เพราะหน้าจอจะโกหกว่ากำลังทำงานอยู่ทั้งที่เลิกพยายามไปแล้ว
  if (!user) {
    return (
      <AppShell onLogout={logout}>
        <PageHeader title={t("account.title")} />
        <FormError
          message={loadError ? errorMessage(loadError, t) : t("error.unknown")}
          onRetry={reload}
        />
      </AppShell>
    );
  }

  const planTone = user.role === "free" ? "neutral" : "accent";
  const planLabel =
    user.role === "admin" ? t("role.admin") : user.role === "pro" ? t("role.pro") : t("role.free");

  return (
    <>
      <Head>
        <title>{t("page.account")}</title>
      </Head>

      <AppShell user={user} onLogout={logout}>
        <PageHeader title={t("account.title")} description={t("account.subtitle")} />

        <div className="flex flex-col gap-5">
          <Card>
            <CardContent className="p-5">
              <Row label={t("account.email")} value={user.email} />
              <Row label={t("account.shop")}>
                {editing ? (
                  <form onSubmit={handleSaveShopName} className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                    <Input
                      id="shopName"
                      value={shopName}
                      onChange={(event) => setShopName(event.target.value)}
                      placeholder={t("register.shopNamePlaceholder")}
                      className="w-full sm:w-64"
                      autoFocus
                    />
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? t("account.saving") : t("account.save")}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      {t("account.cancel")}
                    </Button>
                  </form>
                ) : (
                  <span className="flex items-center gap-3">
                    <span className="t-body font-medium">
                      {user.shop_name || t("account.noShop")}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                      {t("account.edit")}
                    </Button>
                  </span>
                )}
              </Row>
            </CardContent>
          </Card>

          {/* อธิบายว่าแพ็กเกจที่ใช้อยู่ให้อะไรบ้าง — หน้าที่บอกชื่อแพ็กเกจ
              แต่ไม่บอกว่ามันคืออะไร ทำให้ผู้ใช้ต้องไปหาเอง */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="t-section">{t("account.planTitle")}</h2>
                <StatusBadge tone={planTone}>{planLabel}</StatusBadge>
              </div>
              <p className="t-caption mt-2">
                {user.role === "free" ? t("account.planFree") : t("account.planPro")}
              </p>
            </CardContent>
          </Card>

          {/* EmptyState ต้องมีปุ่มเสมอ (brand.md หัวข้อ 5) หน้านี้ยังไม่มีหน้าอุปกรณ์
              ให้ไป จึงให้ปุ่มพาไปตั้งชื่อร้านซึ่งเป็นสิ่งที่ทำได้จริงตอนนี้ */}
          <EmptyState
            title={t("account.emptyTitle")}
            description={t("account.emptyBody")}
            action={
              user.shop_name ? null : (
                <Button onClick={() => setEditing(true)}>{t("account.setShopName")}</Button>
              )
            }
          />
        </div>
      </AppShell>
    </>
  );
}
