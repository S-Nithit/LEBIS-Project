// หน้าสมัครสมาชิก
//
// ทางเดินของข้อมูลทั้งเส้น อ่านจากบนลงล่างได้เลย
//   1. ผู้ใช้พิมพ์ในฟอร์ม  -> เก็บไว้ใน state (useState) ของหน้านี้
//   2. กดปุ่มสมัคร        -> handleSubmit()
//   3. validate ฝั่งหน้าเว็บ (กันพิมพ์ผิดเบื้องต้น ไม่ใช่การกันจริง)
//   4. apiFetch("/api/auth/register")  -> FastAPI: routes/auth.py -> register()
//   5. backend hash รหัสผ่าน แล้ว INSERT ลงตาราง users
//   6. backend คืน JWT กลับมา -> saveToken() เก็บลง localStorage
//   7. พาไปหน้าแรก
//
// 🔴 validate ในไฟล์นี้เป็นแค่ความสะดวกของผู้ใช้ ตัวที่กันจริงคือ Pydantic
// กับ dependency ที่ฝั่ง backend เพราะคนแก้ JavaScript ในเบราว์เซอร์ได้

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "sonner";

import { apiFetch, saveToken } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import { AuthLayout } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";

export default function Register() {
  const router = useRouter();
  const { t } = useLanguage();

  // 1) ช่องในฟอร์ม — 1 ช่อง 1 state อ่านง่ายกว่าเก็บรวมเป็น object เดียว
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // 3) ตรวจข้อมูลก่อนส่ง — คืนข้อความ error ถ้าเจอปัญหา คืน null ถ้าผ่าน
  function findProblem() {
    if (!email.includes("@")) return t("validate.email");
    if (name.trim().length === 0) return t("validate.name");
    if (password.length < 8) return t("validate.passwordShort");
    if (password !== confirmPassword) return t("validate.passwordMismatch");
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault(); // กันเบราว์เซอร์ refresh หน้าเองตามพฤติกรรมเดิมของฟอร์ม

    const problem = findProblem();
    if (problem) {
      toast.error(problem);
      return;
    }

    setLoading(true);

    try {
      // 4) ยิงไป backend — ถ้า backend ตอบ error apiFetch จะ throw ให้ catch ข้างล่างรับ
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: {
          email,
          password,
          name,
          // ช่องนี้ไม่บังคับ ถ้าเว้นว่างส่ง null ไปแทนสตริงว่าง
          shop_name: shopName.trim() === "" ? null : shopName,
        },
      });

      // 6) เก็บ JWT ที่ backend ส่งมา หน้าอื่นจะหยิบไปใช้ต่อผ่าน apiFetch
      saveToken(data.access_token);

      toast.success(t("register.success"));
      router.replace("/"); // 7) replace ไม่ push เพื่อไม่ให้กด back กลับมาหน้าสมัครได้
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false); // ปลดล็อกปุ่มทั้งกรณีสำเร็จและกรณีพลาด
    }
  }

  return (
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          id="email"
          label={t("register.email")}
          hint={t("register.emailHint")}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <FormField
          id="name"
          label={t("register.name")}
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

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="password"
            label={t("register.password")}
            hint={t("register.passwordHint")}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />

          <FormField
            id="confirmPassword"
            label={t("register.confirmPassword")}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("register.submitting") : t("register.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
