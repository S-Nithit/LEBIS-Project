// หน้าตั้งค่า — แจ้งเตือน LINE + จัดการแพ็กเกจ
// แก้ชื่อ/ชื่อร้าน และภาษาอยู่ที่ /account แล้ว หน้านี้ไม่ทำซ้ำ

import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { FormError } from "@/components/FormError";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, errorMessage } from "@/lib/api";
import { planFor } from "@/lib/plan";
import { isDeadToken, rememberSignOutReason, useAuth } from "@/lib/useAuth";
import { useLanguage } from "@/lib/useLanguage";
import { useSlowRequest } from "@/lib/useSlowRequest";

// token ตายระหว่างกดปุ่มในหน้านี้ — พาออกไปหน้าเข้าสู่ระบบจริง เหมือน account.js
// ไม่ขึ้นกล่องแดงแล้วให้ "ลองอีกครั้ง" ซึ่งส่ง token ใบที่ตายแล้วซ้ำไปเรื่อยๆ
function isAuthFailure(error, onDeadToken) {
  if (isDeadToken(error)) {
    onDeadToken(error);
    return true;
  }
  return false;
}

function formatDate(iso, language) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(language === "th" ? "th-TH" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return iso;
  }
}

// ===== ส่วนที่ 1: แจ้งเตือน LINE =====
function LineSection({ t, onDeadToken, reloadKey }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(null); // { linked, tier_ok, configured }

  const [requestingCode, setRequestingCode] = useState(false);
  const [codeData, setCodeData] = useState(null); // { code, expires_at }
  const [codeError, setCodeError] = useState(null);
  // รหัสหมดอายุแล้ว (เกิน 10 นาที) — โชว์ข้อความบอกตอนปุ่ม "ขอรหัส" กลับมา
  const [codeExpired, setCodeExpired] = useState(false);
  const codeAbortRef = useRef(null);
  const codeSlow = useSlowRequest(requestingCode);

  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(null);
  const [checkMessage, setCheckMessage] = useState("");

  const [sendingTest, setSendingTest] = useState(false);
  const [testError, setTestError] = useState(null);
  const testAbortRef = useRef(null);
  const testSlow = useSlowRequest(sendingTest);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await apiFetch("/api/line/status");
      setData(result);
    } catch (error) {
      if (isAuthFailure(error, onDeadToken)) return;
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }

  // โหลดตอนเปิดหน้า และโหลดใหม่ทุกครั้งที่ reloadKey เปลี่ยน
  // (เช่นหลังยกเลิก Pro — สิทธิ์ LINE หายทันที กล่องนี้ต้องเปลี่ยนตาม ไม่งั้นยังขึ้น "ผูกแล้ว")
  useEffect(() => {
    setCodeData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // รหัสผูก LINE มีอายุ 10 นาที (expires_at มาจาก API)
  // หมดเวลาแล้วล้างรหัสทิ้ง ปุ่ม "ขอรหัส" จะกลับมาเอง ไม่ต้องรีเฟรชหน้า
  useEffect(() => {
    if (!codeData?.expires_at) return undefined;
    const msLeft = new Date(codeData.expires_at).getTime() - Date.now();
    const expire = () => {
      setCodeData(null);
      setCheckMessage("");
      setCheckError(null);
      setCodeExpired(true);
    };
    if (!(msLeft > 0)) {
      expire();
      return undefined;
    }
    const timer = setTimeout(expire, msLeft);
    return () => clearTimeout(timer);
  }, [codeData]);

  async function requestCode() {
    setRequestingCode(true);
    setCodeError(null);
    setCodeExpired(false);
    codeAbortRef.current = new AbortController();
    try {
      const result = await apiFetch("/api/line/link-code", {
        method: "POST",
        signal: codeAbortRef.current.signal,
      });
      setCodeData(result);
    } catch (error) {
      if (isAuthFailure(error, onDeadToken)) return;
      if (error?.code === "cancelled") return;
      setCodeError({ message: errorMessage(error, t), retry: requestCode });
    } finally {
      setRequestingCode(false);
    }
  }

  async function checkStatus() {
    setChecking(true);
    setCheckError(null);
    setCheckMessage("");
    try {
      const result = await apiFetch("/api/line/status");
      setData(result);
      if (result.linked) {
        toast.success(t("settings.line.connectedToast"));
        setCodeData(null);
      } else {
        setCheckMessage(t("settings.line.stillNotLinked"));
      }
    } catch (error) {
      if (isAuthFailure(error, onDeadToken)) return;
      setCheckError({ message: errorMessage(error, t), retry: checkStatus });
    } finally {
      setChecking(false);
    }
  }

  async function sendTest() {
    setSendingTest(true);
    setTestError(null);
    testAbortRef.current = new AbortController();
    try {
      await apiFetch("/api/line/test", { method: "POST", signal: testAbortRef.current.signal });
      toast.success(t("settings.line.testSentToast"));
    } catch (error) {
      if (isAuthFailure(error, onDeadToken)) return;
      if (error?.code === "cancelled") return;
      setTestError({ message: errorMessage(error, t), retry: sendTest });
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="t-section">{t("settings.line.title")}</h2>

        {loading ? (
          <div className="mt-3">
            <LoadingState rows={2} />
          </div>
        ) : loadError ? (
          <div className="mt-3">
            <FormError message={errorMessage(loadError, t)} onRetry={load} retrying={loading} />
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-start gap-3">
            {!data.tier_ok ? (
              <>
                <p className="t-caption">{t("settings.line.needsPro")}</p>
                <Button asChild>
                  <Link href="/pricing">{t("settings.line.viewPricing")}</Link>
                </Button>
              </>
            ) : !data.configured ? (
              <p className="t-caption">{t("settings.line.notConfigured")}</p>
            ) : data.linked ? (
              <>
                <StatusBadge tone="success">{t("settings.line.linked")}</StatusBadge>
                <Button onClick={sendTest} disabled={sendingTest}>
                  {sendingTest
                    ? testSlow
                      ? t("state.slow")
                      : t("settings.line.sendingTest")
                    : t("settings.line.sendTest")}
                </Button>
                {testSlow ? (
                  <button
                    type="button"
                    onClick={() => testAbortRef.current?.abort()}
                    className="inline-flex min-h-[44px] items-center font-medium underline underline-offset-4"
                  >
                    {t("action.cancelRequest")}
                  </button>
                ) : null}
                {testError ? (
                  <FormError message={testError.message} onRetry={testError.retry} retrying={sendingTest} />
                ) : null}
              </>
            ) : !codeData ? (
              <>
                {codeExpired ? (
                  <p role="status" className="t-caption">
                    {t("settings.line.codeExpired")}
                  </p>
                ) : null}
                <p className="t-caption">{t("settings.line.howTo")}</p>
                <Button onClick={requestCode} disabled={requestingCode}>
                  {requestingCode
                    ? codeSlow
                      ? t("state.slow")
                      : t("settings.line.requesting")
                    : t("settings.line.requestCode")}
                </Button>
                {codeSlow ? (
                  <button
                    type="button"
                    onClick={() => codeAbortRef.current?.abort()}
                    className="inline-flex min-h-[44px] items-center font-medium underline underline-offset-4"
                  >
                    {t("action.cancelRequest")}
                  </button>
                ) : null}
                {codeError ? (
                  <FormError message={codeError.message} onRetry={codeError.retry} retrying={requestingCode} />
                ) : null}
              </>
            ) : (
              <>
                <ol className="t-caption flex list-decimal flex-col gap-1 pl-5">
                  <li>{t("settings.line.step1")}</li>
                  <li>{t("settings.line.step2")}</li>
                  <li>{t("settings.line.step3")}</li>
                </ol>
                {codeData.add_friend_url ? (
                  <Button asChild variant="secondary">
                    <a href={codeData.add_friend_url} target="_blank" rel="noopener noreferrer">
                      {t("settings.line.addFriend")}
                    </a>
                  </Button>
                ) : null}
                <div className="w-full rounded-control border border-line bg-paper px-4 py-3 text-center font-mono text-2xl tracking-widest">
                  {codeData.code}
                </div>
                <p className="t-caption">{t("settings.line.codeExpires")}</p>
                <Button variant="secondary" onClick={checkStatus} disabled={checking}>
                  {checking ? t("settings.line.checking") : t("settings.line.checkStatus")}
                </Button>
                {checkMessage ? (
                  <p role="status" className="t-caption">
                    {checkMessage}
                  </p>
                ) : null}
                {checkError ? (
                  <FormError message={checkError.message} onRetry={checkError.retry} retrying={checking} />
                ) : null}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== ส่วนที่ 2: แพ็กเกจ =====
function SubscriptionSection({ t, language, user, onDeadToken, onCancelled }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(null); // { tier, status, started_at, expires_at }

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const cancelAbortRef = useRef(null);
  const cancelSlow = useSlowRequest(cancelling);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await apiFetch("/api/subscription/me");
      setData(result);
    } catch (error) {
      if (isAuthFailure(error, onDeadToken)) return;
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelSubscription() {
    setCancelling(true);
    setCancelError(null);
    cancelAbortRef.current = new AbortController();
    try {
      const result = await apiFetch("/api/checkout/cancel", {
        method: "POST",
        signal: cancelAbortRef.current.signal,
      });
      setData((current) => ({ ...current, ...result }));
      setConfirmOpen(false);
      toast.success(t("settings.plan.cancelledToast"));
      onCancelled(); // reload() ของ useAuth — แพ็กเกจบนแถบหัวเว็บต้องเปลี่ยนตามทันที
    } catch (error) {
      if (isAuthFailure(error, onDeadToken)) return;
      if (error?.code === "cancelled") return;
      setCancelError({ message: errorMessage(error, t), retry: cancelSubscription });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="t-section">{t("settings.plan.title")}</h2>
          {!loading && !loadError ? (
            <StatusBadge tone={planFor(user.role, t).tone}>{planFor(user.role, t).label}</StatusBadge>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-3">
            <LoadingState rows={2} />
          </div>
        ) : loadError ? (
          <div className="mt-3">
            <FormError message={errorMessage(loadError, t)} onRetry={load} retrying={loading} />
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-start gap-3">
            {data.tier === "pro" && data.expires_at ? (
              <p className="t-caption">
                {t("settings.plan.validUntil")} {formatDate(data.expires_at, language)}
              </p>
            ) : null}

            {data.tier === "pro" ? (
              !confirmOpen ? (
                <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
                  {t("settings.plan.cancel")}
                </Button>
              ) : (
                <div className="w-full rounded-control border border-line bg-paper p-4">
                  <div className="flex flex-col gap-3">
                    <p className="t-body font-medium">{t("settings.plan.cancelConfirmTitle")}</p>
                    <p className="t-caption">{t("settings.plan.cancelConfirmBody")}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmOpen(false)}
                        disabled={cancelling}
                      >
                        {t("action.keep")}
                      </Button>
                      <Button variant="danger" size="sm" onClick={cancelSubscription} disabled={cancelling}>
                        {cancelling
                          ? cancelSlow
                            ? t("state.slow")
                            : t("settings.plan.cancelling")
                          : t("settings.plan.confirmCancel")}
                      </Button>
                    </div>
                    {cancelSlow ? (
                      <button
                        type="button"
                        onClick={() => cancelAbortRef.current?.abort()}
                        className="inline-flex min-h-[44px] items-center self-start font-medium underline underline-offset-4"
                      >
                        {t("action.cancelRequest")}
                      </button>
                    ) : null}
                    {cancelError ? (
                      <FormError message={cancelError.message} onRetry={cancelError.retry} retrying={cancelling} />
                    ) : null}
                  </div>
                </div>
              )
            ) : data.tier === "free" ? (
              <Button asChild>
                <Link href="/pricing">{t("settings.plan.upgrade")}</Link>
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user, loading, loadError, reload, logout } = useAuth({ redirectTo: "/login" });
  const { t, language } = useLanguage();
  // เปลี่ยนค่านี้เพื่อสั่งให้กล่อง LINE โหลดสถานะใหม่
  const [lineReloadKey, setLineReloadKey] = useState(0);

  function handleCancelled() {
    reload(); // แพ็กเกจบนแถบหัวเว็บเปลี่ยนตาม
    setLineReloadKey((key) => key + 1); // กล่อง LINE เปลี่ยนเป็น "ต้องเป็น Pro"
  }

  function handleDeadToken(error) {
    rememberSignOutReason(error.code);
    logout();
  }

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
        <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />
        <FormError message={errorMessage(loadError, t)} onRetry={reload} retrying={loading} />
      </AppShell>
    );
  }

  return (
    <>
      <Head>
        <title>{t("page.settings")}</title>
      </Head>

      <AppShell user={user} onLogout={logout}>
        <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />

        <div className="flex max-w-3xl flex-col gap-5">
          <LineSection t={t} onDeadToken={handleDeadToken} reloadKey={lineReloadKey} />
          <SubscriptionSection t={t} language={language} user={user} onDeadToken={handleDeadToken} onCancelled={handleCancelled} />
        </div>
      </AppShell>
    </>
  );
}