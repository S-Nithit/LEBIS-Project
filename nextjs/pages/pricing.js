// หน้าแพ็กเกจและการชำระเงิน — ตารางเทียบ Free/Pro, อัปเกรด, จ่ายเงินจำลอง
//
// ทางเดินของข้อมูลตอนอัปเกรด
//   1. กด "อัปเกรดเป็น Pro" -> POST /api/checkout/session -> ได้ checkout_id + amount
//   2. เปิดแผง QR จำลอง พร้อมยอดเงินจาก backord (ไม่ใช่ตัวเลขที่พิมพ์เอง)
//   3. กด "ชำระเงินแล้ว" -> POST /api/checkout/confirm { checkout_id }
//      สำเร็จ -> toast + router.replace("/account") ป้าย Pro ขึ้นทันทีเพราะ
//                useAuth ยิง /api/auth/me ใหม่ทุกครั้งที่หน้าถูก mount
//      พลาด (เช่น already_pro) -> ขึ้นใต้ปุ่มในหน้านี้ ไม่ใช่ toast (brand.md หัวข้อ 6)
//
// ราคาและสถานะทั้งหมดดึงจาก backend เสมอ ไม่มีตัวเลขฮาร์ดโค้ดในไฟล์นี้เลย
// feature ของแต่ละแพ็กเกจเขียนเป็นคำแปลในไฟล์นี้ ไม่ได้ดึงจาก field "features"
// ของ GET /api/plans เพราะตอนนี้ backend ส่งเป็นข้อความไทยล้วน (ดู CLAUDE.md)

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { FormError } from "@/components/FormError";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, errorMessage } from "@/lib/api";
import { planFor } from "@/lib/plan";
import { isDeadToken, rememberSignOutReason, useAuth } from "@/lib/useAuth";
import { useLanguage } from "@/lib/useLanguage";

function formatDate(value, language) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(language === "en" ? "en-GB" : "th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// ตารางเทียบแพ็กเกจ — การ์ดเดียวใช้ได้ทั้ง free และ pro ต่างกันแค่ props
// price มาจาก /api/plans เสมอ ไม่พิมพ์ราคาเองในไฟล์นี้
// ---------------------------------------------------------------------------

function PlanCard({ plan, isCurrent, onUpgrade, upgrading, isAdmin }) {
  const { t } = useLanguage();
  const isFree = plan.tier === "free";

  const features = isFree
    ? ["pricing.featureItemLimitFree", "pricing.featureReportFree", "pricing.featureLineFree", "pricing.featureCsvFree"]
    : ["pricing.featureItemLimitPro", "pricing.featureReportPro", "pricing.featureLinePro", "pricing.featureCsvPro"];

  return (
    <Card className={isCurrent ? "border-ink" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t(isFree ? "pricing.freeTitle" : "pricing.proTitle")}</CardTitle>
          {isCurrent ? <StatusBadge tone="success">{t("pricing.currentBadge")}</StatusBadge> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="t-caption">{t(isFree ? "pricing.freeDesc" : "pricing.proDesc")}</p>

        <p className="t-page-title">
          {isFree ? t("pricing.freePrice") : `${plan.price} ${t("pricing.perMonth")}`}
        </p>

        <ul className="flex flex-col gap-2">
          {features.map((key) => (
            <li key={key} className="t-body flex items-start gap-2">
              <span aria-hidden="true">•</span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>

        {/* ปุ่มอัปเกรด: ขึ้นเฉพาะการ์ด Pro เมื่อยังไม่ใช่แพ็กเกจปัจจุบัน และไม่ใช่ admin
            admin ไม่ผูกกับแพ็กเกจใด (เหมือนที่ account.js ใช้ planFor ตัดสิน) */}
        {!isFree && !isCurrent && !isAdmin ? (
          <Button onClick={onUpgrade} disabled={upgrading}>
            {upgrading ? t("pricing.upgrading") : t("pricing.upgrade")}
          </Button>
        ) : null}
        {!isFree && isCurrent ? (
          <Button asChild variant="secondary">
            <Link href="/settings">{t("pricing.manage")}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// แผง QR จำลอง — เปิดหลังกดอัปเกรด ยอดเงินมาจาก checkout/session เท่านั้น
// ---------------------------------------------------------------------------

function CheckoutPanel({ amount, onConfirm, onCancel, busy, error, errorCode }) {
  const { t } = useLanguage();
  const stuck = errorCode === "checkout_not_found" || errorCode === "already_pro";
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Card className="mb-5">
      <CardHeader>
        <div ref={headingRef} tabIndex={-1} className="outline-none">
          <CardTitle>{t("checkout.title")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <span className="t-caption">{t("checkout.amount")}</span>
          <span className="t-page-title">{amount} ฿</span>
        </div>

        {/* QR จำลอง — ไม่มีการเชื่อมต่อ payment gateway จริง ตามที่ระบบออกแบบไว้
            🔴 สแกนได้จริง แต่ข้างในเป็นแค่ข้อความ "การชำระเงินจำลอง ไม่มีการตัดเงินจริง"
               ห้ามเปลี่ยนเป็น QR พร้อมเพย์ เดี๋ยวคนสแกนแล้วโอนเงินจริง
               เดิมเป็นกล่องเปล่าเขียนว่า "QR" ซึ่งดูเหมือนรูปโหลดไม่ขึ้น
            พื้นใช้ --qr-surface ซึ่งขาวทั้งสองโหมด เพราะ QR ต้องเป็นสีเข้มบนพื้นสว่างถึงจะสแกนได้
            ไฟล์สร้างครั้งเดียวด้วยแพ็กเกจ qrcode นอกโปรเจกต์ ไม่ได้เพิ่ม dependency */}
        <div
          aria-hidden="true"
          className="h-48 w-48 self-center rounded-card border border-line bg-[var(--qr-surface)] p-2"
        >
          <img src="/mock-qr.svg" alt="" width={176} height={176} className="h-full w-full" />
        </div>

        <p className="t-caption text-center">{t("checkout.methodNote")}</p>

        {/* ใบนี้ใช้ไม่ได้แล้ว: ลองซ้ำก็ error เหมือนเดิม จึงพากลับไปเลือกแพ็กเกจแทน */}
        <FormError message={error} onRetry={stuck ? undefined : onConfirm} retrying={busy} />

        {stuck ? (
          <Button onClick={onCancel}>{t("checkout.backToPlans")}</Button>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onConfirm} disabled={busy} aria-busy={busy}>
              {busy ? t("checkout.paying") : t("checkout.pay")}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
              {t("item.cancel")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ตัวหน้า
// ---------------------------------------------------------------------------

export default function Pricing() {
  const { user, loading, loadError, reload, logout } = useAuth({ redirectTo: "/login" });
  const { t, language } = useLanguage();
  const router = useRouter();

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");

  const [subscription, setSubscription] = useState(null);

  const [checkoutId, setCheckoutId] = useState(null);
  const [checkoutAmount, setCheckoutAmount] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutErrorCode, setCheckoutErrorCode] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  // error ที่เกิดตอนกดปุ่มอัปเกรด (ก่อนแผง QR เปิด) เช่น already_pro
  const [upgradeError, setUpgradeError] = useState("");

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      setPlans(await apiFetch("/api/plans"));
      setPlansError("");
    } catch (error) {
      setPlansError(errorMessage(error, t));
    } finally {
      setPlansLoading(false);
    }
  }, [t]);

  const loadSubscription = useCallback(async () => {
    try {
      setSubscription(await apiFetch("/api/subscription/me"));
    } catch (error) {
      // สถานะแพ็กเกจเป็นแค่ตัวช่วยแสดงผล (เช่นวันหมดอายุ) โหลดไม่ได้ก็ยังใช้
      // หน้านี้ได้ด้วย user.role ที่มีอยู่แล้วจาก useAuth
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadPlans();
    loadSubscription();
  }, [user, loadPlans, loadSubscription]);

  async function handleUpgradeClick() {
    setUpgrading(true);
    setUpgradeError("");
    try {
      const session = await apiFetch("/api/checkout/session", {
        method: "POST",
        body: { tier: "pro" },
      });
      setCheckoutId(session.checkout_id);
      setCheckoutAmount(session.amount);
      setCheckoutOpen(true);
      setCheckoutError("");
    } catch (error) {
      if (isDeadToken(error)) {
        rememberSignOutReason(error.code);
        logout();
        return;
      }
      if (error?.code === "already_pro") {
        // อีกแท็บอัปเกรดไปแล้ว: ดึงข้อมูลใหม่ให้หน้าเลิกโชว์ว่าเป็น Free (ข้อ 4)
        reload();
      } else {
        setUpgradeError(errorMessage(error, t));
      }
      loadSubscription();
    } finally {
      setUpgrading(false);
    }
  }

  async function handleConfirmPayment() {
    setCheckoutBusy(true);
    setCheckoutErrorCode("");
    setCheckoutError("");
    try {
      await apiFetch("/api/checkout/confirm", {
        method: "POST",
        body: { checkout_id: checkoutId, method: "mock_qr" },
      });
      toast.success(t("checkout.success"));
      // ไปหน้าบัญชีทันที — useAuth ที่นั่นยิง /api/auth/me ใหม่เสมอตอน mount
      // ป้าย Pro จึงขึ้นทันทีโดยไม่ต้องทำอะไรเพิ่มในไฟล์นี้
      router.replace("/account");
    } catch (error) {
      if (isDeadToken(error)) {
        rememberSignOutReason(error.code);
        logout();
        return;
      }
      setCheckoutError(errorMessage(error, t));
      setCheckoutErrorCode(error?.code || "");
      if (error?.code === "already_pro") reload();
    } finally {
      setCheckoutBusy(false);
    }
  }

  function closeCheckout() {
    setCheckoutOpen(false);
    setCheckoutId(null);
    setCheckoutAmount(null);
    setCheckoutError("");
    setCheckoutErrorCode("");
  }

  // ---- สถานะที่ 1 · กำลังโหลดครั้งแรก
  if (loading && !user) {
    return (
      <AppShell>
        <LoadingState rows={3} />
      </AppShell>
    );
  }

  // ---- สถานะที่ 2 · ยังไม่ได้เข้าสู่ระบบ (useAuth พาไปหน้า login ให้แล้ว)
  if (!user && !loadError) return null;

  // ---- สถานะที่ 3 · โหลดไม่สำเร็จเพราะเน็ตหรือเซิร์ฟเวอร์
  if (!user) {
    return (
      <AppShell onLogout={logout}>
        <PageHeader title={t("pricing.title")} />
        <FormError message={errorMessage(loadError, t)} onRetry={reload} retrying={loading} />
      </AppShell>
    );
  }

  // ---- สถานะที่ 4 · มีผู้ใช้แล้ว
  const plan = planFor(user.role, t);
  const isAdmin = plan.tier === "admin";
  const isPro = plan.tier === "pro";
  const freePlan = plans.find((p) => p.tier === "free");
  const proPlan = plans.find((p) => p.tier === "pro");

  return (
    <>
      <Head>
        <title>{t("page.pricing")}</title>
      </Head>

      <AppShell user={user} onLogout={logout}>
        <PageHeader title={t("pricing.title")} description={t("pricing.subtitle")} />

        {isAdmin ? <p className="t-caption mb-4">{t("pricing.adminNote")}</p> : null}

        {isPro && subscription?.expires_at ? (
          <p className="t-caption mb-4">
            {t("pricing.expiresOn").replace("{date}", formatDate(subscription.expires_at, language))}
          </p>
        ) : null}

        {plansLoading ? (
          <LoadingState rows={2} />
        ) : plansError ? (
          <FormError message={plansError} onRetry={loadPlans} retrying={plansLoading} />
        ) : (
          <>
            {!checkoutOpen ? (
              <div className="mb-5 grid gap-4 sm:grid-cols-2">
                {freePlan ? (
                  <PlanCard plan={freePlan} isCurrent={plan.tier === "free"} isAdmin={isAdmin} />
                ) : null}
                {proPlan ? (
                  <PlanCard
                    plan={proPlan}
                    isCurrent={isPro}
                    isAdmin={isAdmin}
                    onUpgrade={handleUpgradeClick}
                    upgrading={upgrading}
                  />
                ) : null}
              </div>
            ) : null}

            {/* error จากการกดปุ่มอัปเกรด (ก่อนแผง QR เปิด) เช่น already_pro
                ขึ้นใต้การ์ด ไม่ใช่ toast ตามกฎ brand.md หัวข้อ 6 */}
            {!checkoutOpen && upgradeError ? (
              <div className="mb-5">
                <FormError message={upgradeError} onRetry={handleUpgradeClick} retrying={upgrading} />
              </div>
            ) : null}

            {checkoutOpen ? (
              <CheckoutPanel
                amount={checkoutAmount}
                busy={checkoutBusy}
                error={checkoutError}
                errorCode={checkoutErrorCode}
                onConfirm={handleConfirmPayment}
                onCancel={closeCheckout}
              />
            ) : null}
          </>
        )}
      </AppShell>
    </>
  );
}

// หน้านี้ต้องเข้าสู่ระบบก่อนเสมอ — ไม่ต้องมี getServerSideProps พิเศษ
// (ต่างจาก template.js ที่บล็อกตอน production เพราะหน้านี้เป็นหน้าจริงของลูกค้า)