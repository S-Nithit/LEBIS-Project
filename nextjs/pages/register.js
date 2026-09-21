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

import { apiFetch, errorMessage, saveToken } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import { AuthLayout } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";

export default function Register() {
  const router = useRouter();
  const { t } = useLanguage();

  // 1 ช่อง 1 state อ่านง่ายกว่าเก็บรวมเป็น object เดียว
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
    if (confirmPassword !== password) {
      found.confirmPassword = t("validate.passwordMismatch");
    }
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault(); // กันเบราว์เซอร์ refresh หน้าเองตามพฤติกรรมเดิมของฟอร์ม

    const found = validate();
    setErrors(found);
    setFormError("");

    if (Object.keys(found).length > 0) {
      toast.error(t("error.summary"));
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
        },
      });

      saveToken(data.access_token);

      toast.success(t("register.success"));
      router.replace("/account"); // replace ไม่ push เพื่อไม่ให้กด back กลับมาหน้าสมัครได้
    } catch (error) {
      const message = errorMessage(error, t);

      // อีเมลซ้ำเป็นความผิดของช่องอีเมล จึงแปะไว้ที่ช่องนั้นโดยตรง
      // เรื่องอื่น (เน็ตหลุด เซิร์ฟเวอร์ล่ม) ขึ้นเป็นข้อความระดับฟอร์ม
      // ห้ามปล่อยให้เหลือแค่ toast เพราะ toast หายไปเองภายในไม่กี่วินาที
      if (error?.code === "email_taken") {
        setErrors({ email: message });
      } else {
        setFormError(message);
      }

      toast.error(message);
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
        formError={formError}
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

          <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
            {loading ? t("register.submitting") : t("register.submit")}
          </Button>
        </form>
      </AuthLayout>
    </>
  );
}
