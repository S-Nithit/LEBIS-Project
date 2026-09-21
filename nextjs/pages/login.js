// หน้าเข้าสู่ระบบ
//
// ทางเดินของข้อมูล
//   1. ผู้ใช้พิมพ์อีเมล/รหัส -> state ของหน้านี้
//   2. กดปุ่ม -> handleSubmit() -> apiFetch("/api/auth/login")
//   3. FastAPI: routes/auth.py -> login() -> verify_password() เทียบ hash ใน DB
//   4. ถูก -> backend คืน JWT -> saveToken() เก็บลง localStorage -> ไปหน้าแรก
//      ผิด -> backend ตอบ 401 -> apiFetch throw -> ขึ้น toast แดง
//
// หน้าตาของหน้านี้มาจากระบบดีไซน์กลาง ไม่มีการกำหนดสีเองแม้แต่จุดเดียว
// อยากรู้ว่ามีอะไรให้ใช้บ้าง อ่าน docs/ui-guide.md

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "sonner";

import { apiFetch, saveToken } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import { AuthLayout } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";

export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();

  // ช่องทั้งสองเริ่มจากว่างเสมอ — ห้ามใส่อีเมล/รหัสไว้ให้ล่วงหน้า
  // เพราะหน้านี้คือหน้าที่ลูกค้าและอาจารย์เปิดจากลิงก์จริง
  // บัญชีทดสอบอยู่ในตาราง "บัญชีทดสอบ" ของ README
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      saveToken(data.access_token);

      toast.success(t("login.success"));
      router.replace("/");
    } catch (error) {
      // ข้อความมาจาก backend เช่น "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          id="email"
          label={t("login.email")}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <FormField
          id="password"
          label={t("login.password")}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("login.submitting") : t("login.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
