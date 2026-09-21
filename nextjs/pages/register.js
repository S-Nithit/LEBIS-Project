// หน้าสมัครสมาชิก
//
// ทางเดินของข้อมูลทั้งเส้น อ่านจากบนลงล่างได้เลย
//   1. ผู้ใช้พิมพ์ในฟอร์ม -> เก็บไว้ใน state ของหน้านี้
//   2. กดปุ่มสมัคร -> handleSubmit()
//   3. validate() ตรวจ "ทุกช่องพร้อมกัน" แล้วคืนข้อความผิดพลาดแยกรายช่อง
//      (ไม่ใช่หยุดที่ช่องแรกที่ผิด ไม่งั้นผู้ใช้ต้องกดส่งหลายรอบกว่าจะรู้ครบ)
//   4. apiFetch("/api/auth/register") -> FastAPI: routes/auth.py -> register()
//   5. backend hash รหัสผ่าน แล้ว INSERT ลงตาราง users
//   6. backend คืน JWT -> saveToken() เก็บลง localStorage
//   7. พาไปหน้าแรก
//
// 🔴 validate ในไฟล์นี้เป็นแค่ความสะดวกของผู้ใช้ ตัวที่กันจริงคือ Pydantic
// กับ dependency ที่ฝั่ง backend เพราะคนแก้ JavaScript ในเบราว์เซอร์ได้

import { useState } from "react";
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

export default function Register() {
  const router = useRouter();
  const { t } = useLanguage();

  // 1 ช่อง 1 state อ่านง่ายกว่าเก็บรวมเป็น object เดียว
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  // ล้างข้อความผิดพลาดของช่องที่ผู้ใช้เริ่มแก้ (FormField เรียกให้เอง)
  function clearError(field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // ตรวจทุกช่องพร้อมกัน คืน object ที่ key คือ id ของช่องที่ผิด
  function validate() {
    const found = {};
    if (!email.trim().includes("@")) found.email = t("validate.email");
    if (name.trim().length === 0) found.name = t("validate.name");
    if (password.length < 8) found.password = t("validate.passwordShort");
    // bcrypt รับได้ 72 ไบต์ ภาษาไทยกิน 3 ไบต์ต่อตัว ตรวจตั้งแต่ในหน้าเว็บ
    // จะได้ไม่ต้องรอให้ยิงไปถึง backend แล้วค่อยรู้
    else if (new Blob([password]).size > 72) found.password = t("validate.passwordLong");
    if (confirmPassword !== password) {
      found.confirmPassword = t("validate.passwordMismatch");
    }
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault(); // กันเบราว์เซอร์ refresh หน้าเองตามพฤติกรรมเดิมของฟอร์ม

    const found = validate();
    setErrors(found);
    // ล้างข้อความระดับฟอร์มของรอบก่อนทิ้ง ไม่งั้นข้อความเก่าที่ไม่จริงแล้ว
    // (เช่น "เชื่อมต่อไม่ได้") จะค้างอยู่คู่กับข้อความใหม่ที่คนละเรื่องกัน
    setFormError("");

    if (Object.keys(found).length > 0) {
      // ไม่ขึ้น toast ซ้ำ ข้อความอยู่ใต้ช่องที่ผิดแล้ว
      // พาโฟกัสไปที่ช่องแรกที่ผิด ผู้ใช้จะได้ไม่ต้องไล่หาเองว่าผิดตรงไหน
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: {
          email: email.trim(),
          password,
          name: name.trim(),
          // ช่องนี้ไม่บังคับ ถ้าเว้นว่างส่ง null ไปแทนสตริงว่าง
          shop_name: shopName.trim() === "" ? null : shopName.trim(),
          remember,
        },
      });

      saveToken(data.access_token);

      try {
        // เหมือนหน้าเข้าสู่ระบบ: จำอีเมลเฉพาะเมื่อผู้ใช้ติ๊กให้จำ
        if (remember) {
          localStorage.setItem("lebis_last_email", email.trim().toLowerCase());
        } else {
          // เหมือนหน้าเข้าสู่ระบบ: ไม่ติ๊ก = ไม่อยากให้เหลือร่องรอยบนเครื่องนี้
          localStorage.removeItem("lebis_last_email");
        }
      } catch (error) {
        // จำไม่ได้ก็ไม่เป็นไร
      }

      toast.success(t("register.success"));
      router.replace("/account"); // replace ไม่ push เพื่อไม่ให้กด back กลับมาหน้าสมัครได้
    } catch (error) {
      const message = errorMessage(error, t);

      // backend บอกมาว่าผิดที่ช่องไหน (เช่น password ยาวเกิน) ก็แปะที่ช่องนั้น
      // อีเมลซ้ำก็เป็นความผิดของช่องอีเมล
      // เรื่องที่ไม่ได้ผิดที่ช่องใดช่องหนึ่ง (เน็ตหลุด เซิร์ฟเวอร์ล่ม) ขึ้นระดับฟอร์ม
      const field = error?.field || (error?.code === "email_taken" ? "email" : null);

      if (field) {
        setFormError("");
        setErrors({ [fieldToInputId(field)]: message });
        document.getElementById(fieldToInputId(field))?.focus();
      } else {
        setFormError(message);
      }

      // ไม่ขึ้น toast ซ้ำ ข้อความอยู่ในหน้าแล้วและอยู่ต่อจนกว่าจะแก้
      // toast มีไว้สำหรับเรื่องที่ไม่มีที่ทางในหน้า ไม่ใช่พูดซ้ำสิ่งที่พูดไปแล้ว
    } finally {
      setLoading(false); // ปลดล็อกปุ่มทั้งกรณีสำเร็จและกรณีพลาด
    }
  }

  return (
    <>
      <Head>
        <title>{t("page.register")}</title>
      </Head>

      <AuthLayout
        title={t("register.title")}
        description={t("register.subtitle")}
        footer={
          <p className="t-caption">
            {t("register.hasAccount")}{" "}
            <Link
              href="/login"
              className="font-medium text-ink underline underline-offset-4 hover:no-underline"
            >
              {t("register.goLogin")}
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <FormField
            id="email"
            label={t("register.email")}
            hint={t("register.emailHint")}
            error={errors.email}
            onClearError={clearError}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />

          <FormField
            id="name"
            label={t("register.name")}
            error={errors.name}
            onClearError={clearError}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("register.namePlaceholder")}
            maxLength={120}
            autoComplete="name"
            required
          />

          <FormField
            id="shopName"
            label={t("register.shopName")}
            badge={t("register.shopNameOptional")}
            value={shopName}
            onChange={(event) => setShopName(event.target.value)}
            placeholder={t("register.shopNamePlaceholder")}
            maxLength={120}
            autoComplete="organization"
          />

          {/* รหัสผ่านสองช่องอยู่คนละบรรทัดบนมือถือ และเรียงคู่กันบนจอใหญ่ */}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="password"
              label={t("register.password")}
              hint={t("register.passwordHint")}
              error={errors.password}
              onClearError={clearError}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />

            <FormField
              id="confirmPassword"
              label={t("register.confirmPassword")}
              error={errors.confirmPassword}
              onClearError={clearError}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <Checkbox
              id="remember"
              label={t("login.remember")}
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            {remember ? (
              <p className="t-caption mt-2">{t("login.rememberHint")}</p>
            ) : null}
          </div>

          <FormError message={formError} onRetry={handleSubmit} retrying={loading} />

          <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
            {loading ? t("register.submitting") : t("register.submit")}
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
