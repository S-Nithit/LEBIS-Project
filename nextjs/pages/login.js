// หน้าเข้าสู่ระบบ
//
// ทางเดินของข้อมูล
//   1. ผู้ใช้พิมพ์อีเมล/รหัส -> state ของหน้านี้
//   2. กดปุ่ม -> handleSubmit() -> ตรวจฝั่งหน้าเว็บก่อน -> apiFetch("/api/auth/login")
//   3. FastAPI: routes/auth.py -> login() -> verify_password() เทียบ hash ใน DB
//   4. ถูก -> backend คืน JWT -> saveToken() เก็บลง localStorage -> ไปหน้าแรก
//      ผิด -> backend ตอบ 401 พร้อมรหัส invalid_credentials
//             -> errorMessage() แปลเป็นภาษาที่ผู้ใช้เลือก -> ขึ้นในหน้า ไม่ใช่ toast
//
// หน้าตาทั้งหมดมาจากระบบดีไซน์กลาง ไม่มีการกำหนดสีหรือขนาดเองแม้แต่จุดเดียว
// อยากรู้ว่ามีอะไรให้ใช้บ้าง อ่าน docs/ui-guide.md

import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "sonner";

import { apiFetch, errorMessage, fieldToInputId, saveToken } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import { AuthLayout } from "@/components/AuthLayout";
import { FormError } from "@/components/FormError";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();

  // ช่องทั้งสองเริ่มจากว่างเสมอ — ห้ามใส่อีเมล/รหัสไว้ให้ล่วงหน้า
  // เพราะหน้านี้คือหน้าที่ลูกค้าและอาจารย์เปิดจากลิงก์จริง
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  // เก็บข้อความผิดพลาดแยกเป็นรายช่อง ผู้ใช้จะได้รู้ว่าต้องแก้ช่องไหน
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const emailRef = useRef(null);

  // เติมอีเมลที่เคยเข้าสู่ระบบสำเร็จครั้งล่าสุดให้เลย
  // เจ้าของร้านเข้าระบบจากเครื่องเดิมทุกวัน ไม่ควรต้องพิมพ์อีเมลใหม่ทุกครั้ง
  // (เก็บแค่อีเมล ไม่เก็บรหัสผ่าน)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lebis_last_email");
      if (saved) {
        setEmail(saved);
        setRemember(true); // เคยเลือกให้จำไว้ ก็ติ๊กค้างไว้ให้เลย
      }
    } catch (error) {
      // เบราว์เซอร์ปิด localStorage ไว้ ก็แค่ไม่เติมให้
    }
  }, []);

  // โฟกัสช่องแรกให้เฉพาะเครื่องที่มีเมาส์ (คอมพิวเตอร์)
  // บนมือถือไม่โฟกัส เพราะคีย์บอร์ดจะเด้งขึ้นมาบังครึ่งจอทันทีที่เปิดหน้า
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      emailRef.current?.focus();
    }
  }, []);

  // ล้างข้อความผิดพลาดของช่องที่ผู้ใช้เริ่มแก้ (FormField เรียกให้เอง)
  function clearError(field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    // กล่องข้อผิดพลาดระดับฟอร์มก็ต้องหายไปด้วย พอผู้ใช้เริ่มแก้
    // ไม่งั้นจะมีกล่องแดง "เชื่อมต่อไม่ได้" ค้างอยู่ขณะที่เขากำลังพิมพ์อีเมลใหม่
    // ซึ่งอ่านเหมือนระบบยังพังอยู่ทั้งที่เขากำลังแก้ให้แล้ว
    setFormError("");
  }

  function validate() {
    const found = {};
    if (!email.trim().includes("@")) found.email = t("validate.email");
    if (password.length === 0) found.password = t("validate.passwordRequired");
    // ตรวจความยาวตั้งแต่ในหน้าเว็บ ไม่งั้นรหัสที่ยาวเกินจะถูกส่งไปถึง backend
    // แล้วได้ข้อความคนละแบบกับ "อีเมลหรือรหัสผ่านไม่ถูกต้อง" ซึ่งบอกใบ้ว่า
    // รหัสที่พิมพ์ผิดรูปแบบ ไม่ใช่ผิดรหัส
    // ข้อความคนละใบกับหน้าสมัคร — ที่นี่รหัสที่ยาวเกินแปลว่าพิมพ์เกินมา
    // ไม่ใช่ว่าตั้งรหัสไว้ยาวเกิน เพราะรหัสยาวขนาดนั้นสมัครไม่ผ่านตั้งแต่แรก
    // บอกว่า "กรุณาใช้ไม่เกิน 24 ตัวอักษร" กับคนที่มีรหัสอยู่แล้ว คือบอกสิ่งที่ไม่จริง
    else if (new Blob([password]).size > 72) found.password = t("validate.passwordLongLogin");
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    // ล้างข้อความระดับฟอร์มของรอบก่อนทิ้ง ไม่งั้นข้อความเก่าที่ไม่จริงแล้ว
    // (เช่น "เชื่อมต่อไม่ได้") จะค้างอยู่คู่กับข้อความใหม่ที่คนละเรื่องกัน
    setFormError("");

    if (Object.keys(found).length > 0) {
      // ไม่ขึ้น toast ซ้ำ เพราะข้อความอยู่ใต้ช่องที่ผิดแล้ว
      // บอกซ้ำสองที่ทำให้โปรแกรมอ่านหน้าจออ่านซ้ำ และรกโดยไม่ได้ข้อมูลเพิ่ม
      // พาโฟกัสไปที่ช่องแรกที่ผิด ไม่ต้องให้ผู้ใช้ไล่หาเอง
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password, remember },
      });

      saveToken(data.access_token);

      try {
        // จำอีเมลเฉพาะเมื่อผู้ใช้ติ๊กให้จำเท่านั้น
        // เครื่องที่ร้านใช้กันหลายคน คนที่ไม่ได้ติ๊กแปลว่าไม่อยากให้เหลือร่องรอยไว้
        if (remember) {
          localStorage.setItem("lebis_last_email", email.trim().toLowerCase());
        } else {
          localStorage.removeItem("lebis_last_email");
        }
      } catch (error) {
        // จำไม่ได้ก็ไม่เป็นไร ไม่ใช่เรื่องคอขาดบาดตาย
      }

      toast.success(t("login.success"));
      router.replace("/account");
    } catch (error) {
      // errorMessage() แปลรหัสจาก backend เป็นภาษาที่ผู้ใช้เลือกอยู่
      const message = errorMessage(error, t);

      // ทุกข้อผิดพลาดจาก backend ขึ้นเป็นข้อความระดับฟอร์ม ไม่แปะช่องใดช่องหนึ่ง
      // แม้แต่ "อีเมลหรือรหัสผ่านไม่ถูกต้อง" ก็ด้วย เพราะ backend ตั้งใจไม่บอก
      // ว่าผิดที่อีเมลหรือรหัส (กันคนไล่เดาว่าอีเมลไหนมีบัญชีอยู่จริง)
      // ถ้าหน้าเว็บไปทำกรอบแดงที่ช่องรหัสผ่าน เท่ากับบอกว่าอีเมลถูกแล้ว
      // ซึ่งขัดกับสิ่งที่ backend ตั้งใจ และอาจทำให้คนที่พิมพ์อีเมลผิดไปแก้รหัสที่ถูกอยู่แล้ว
      // backend บอกมาว่าผิดที่ช่องไหนก็แปะที่ช่องนั้น ไม่งั้นขึ้นระดับฟอร์ม
      if (error?.field) {
        setFormError("");
        setErrors({ [fieldToInputId(error.field)]: message });
        document.getElementById(fieldToInputId(error.field))?.focus();
      } else {
        setFormError(message);
      }

      // ไม่ขึ้น toast ซ้ำ ข้อความอยู่ในหน้าแล้วและอยู่ต่อจนกว่าจะแก้
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
              className="inline-flex min-h-[44px] items-center font-medium text-ink underline underline-offset-4 hover:no-underline"
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
            onClearError={clearError}
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />

          <div>
            <FormField
              id="password"
              label={t("login.password")}
              type="password"
              maxBytes={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={errors.password}
              onClearError={clearError}
              autoComplete="current-password"
              required
            />

            {/* จำฉันไว้ + ลืมรหัสผ่าน อยู่บรรทัดเดียวกันใต้ช่องรหัสผ่าน */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <Checkbox
                id="remember"
                label={t("login.remember")}
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />

              <Link
                href="/forgot-password"
                className="t-caption inline-flex min-h-[44px] items-center underline underline-offset-4 hover:no-underline"
              >
                {t("login.forgot")}
              </Link>
            </div>

            {/* 🔴 คำอธิบายอยู่ตรงนี้ตลอด ไม่ใช่โผล่หลังติ๊ก
                   เดิมโผล่เฉพาะตอนติ๊ก ผลคือปุ่มส่งกระโดดลงไป 47px ตอนที่นิ้วโป้ง
                   กำลังเคลื่อนไปหามันพอดี ซึ่งมากกว่าความสูงของปุ่มหนึ่งปุ่ม
                   และเป็นคำอธิบายที่ต้อง "อ่านก่อนตัดสินใจ" โดยเฉพาะคนที่ใช้
                   เครื่องกลางที่หน้าร้าน ไม่ใช่อ่านหลังจากตัดสินใจไปแล้ว */}
            <p className="t-caption mt-2">{t("login.rememberHint")}</p>
          </div>

          <FormError message={formError} onRetry={handleSubmit} retrying={loading} />

          <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
            {loading ? t("login.submitting") : t("login.submit")}
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
