// หน้าเข้าสู่ระบบ
//
// ทางเดินของข้อมูล
//   1. ผู้ใช้พิมพ์อีเมล/รหัส -> state ของหน้านี้
//   2. กดปุ่ม -> handleSubmit() -> ตรวจฝั่งหน้าเว็บก่อน -> apiFetch("/api/auth/login")
//   3. FastAPI: routes/auth.py -> login() -> verify_password() เทียบ hash ใน DB
//   4. ถูก -> backend คืน JWT -> saveToken() เก็บลง localStorage -> ไปหน้าแรก
//      ผิด -> backend ตอบ 401 พร้อมรหัส invalid_credentials
//             -> errorMessage() แปลเป็นภาษาที่ผู้ใช้เลือก -> ขึ้นทั้งใต้ช่องและเป็น toast
//
// หน้าตาทั้งหมดมาจากระบบดีไซน์กลาง ไม่มีการกำหนดสีหรือขนาดเองแม้แต่จุดเดียว
// อยากรู้ว่ามีอะไรให้ใช้บ้าง อ่าน docs/ui-guide.md

import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "sonner";

import { apiFetch, errorMessage, saveToken } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import { AuthLayout } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";

export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();

  // ช่องทั้งสองเริ่มจากว่างเสมอ — ห้ามใส่อีเมล/รหัสไว้ให้ล่วงหน้า
  // เพราะหน้านี้คือหน้าที่ลูกค้าและอาจารย์เปิดจากลิงก์จริง
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // เก็บข้อความผิดพลาดแยกเป็นรายช่อง ผู้ใช้จะได้รู้ว่าต้องแก้ช่องไหน
  const [errors, setErrors] = useState({});

  const emailRef = useRef(null);

  // โฟกัสช่องแรกให้เลย คนที่ใช้คีย์บอร์ดจะได้พิมพ์ต่อได้ทันที
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  function validate() {
    const found = {};
    if (!email.trim().includes("@")) found.email = t("validate.email");
    if (password.length === 0) found.password = t("validate.passwordRequired");
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // พาโฟกัสไปที่ช่องแรกที่ผิด ไม่ต้องให้ผู้ใช้ไล่หาเอง
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });

      saveToken(data.access_token);

      toast.success(t("login.success"));
      router.replace("/");
    } catch (error) {
      // errorMessage() แปลรหัสจาก backend เป็นภาษาที่ผู้ใช้เลือกอยู่
      const message = errorMessage(error, t);
      // ขึ้นทั้งใต้ช่องรหัสผ่าน (อยู่ต่อจนกว่าจะแก้) และ toast (เห็นทันที)
      setErrors({ password: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>{t("page.login")}</title>
      </Head>

      <AuthLayout
        title={t("login.title")}
        description={t("login.subtitle")}
        footer={
          <p className="t-caption">
            {t("login.noAccount")}{" "}
            <Link
              href="/register"
              className="font-medium text-ink underline underline-offset-4 hover:no-underline"
            >
              {t("login.goRegister")}
            </Link>
          </p>
        }
      >
        {/* noValidate = ปิดกล่องเตือนของเบราว์เซอร์ เพราะมันขึ้นเป็นภาษาของเบราว์เซอร์
            ไม่ใช่ภาษาที่ผู้ใช้เลือกในเว็บเรา เราตรวจเองและแสดงเองทั้งหมด */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <FormField
            id="email"
            ref={emailRef}
            label={t("login.email")}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <div>
            <FormField
              id="password"
              label={t("login.password")}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={errors.password}
              autoComplete="current-password"
              required
            />

            <p className="mt-2">
              <Link
                href="/forgot-password"
                className="t-caption underline underline-offset-4 hover:no-underline"
              >
                {t("login.forgot")}
              </Link>
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
            {loading ? t("login.submitting") : t("login.submit")}
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
