// หน้าที่บอกว่าจะทำยังไงเมื่อลืมรหัสผ่าน
//
// ตอนนี้ระบบยังไม่มีการตั้งรหัสผ่านใหม่ด้วยตัวเอง (ต้องส่งอีเมลยืนยัน
// ซึ่งยังไม่ได้ทำ) หน้านี้จึงบอกทางออกที่ใช้ได้จริงแทนการปล่อยให้ผู้ใช้
// กดปุ่มที่ไม่มีอยู่ — ร้านหนึ่งร้านมีบัญชีเดียว ลืมรหัสแล้วเข้าไม่ได้เลย
// คือเรื่องใหญ่ที่สุดของเจ้าของร้าน
//
// เมื่อทำระบบตั้งรหัสผ่านใหม่เสร็จแล้ว ให้แทนที่เนื้อหาในหน้านี้ด้วยฟอร์มกรอกอีเมล

import Head from "next/head";
import Link from "next/link";

import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/useLanguage";

export default function ForgotPassword() {
  const { t } = useLanguage();

  return (
    <>
      <Head>
        <title>{t("page.help")}</title>
      </Head>

      <AuthLayout title={t("help.title")} description={t("help.body")}>
        <div className="flex flex-col gap-5">
          <p className="t-caption">{t("help.note")}</p>

          <Button asChild variant="secondary" className="w-full">
            <Link href="/login">{t("help.back")}</Link>
          </Button>
        </div>
      </AuthLayout>
    </>
  );
}
