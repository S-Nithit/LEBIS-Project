// หน้าที่บอกว่าจะทำยังไงเมื่อเข้าสู่ระบบไม่ได้
//
// ตอนนี้ระบบยังไม่มีการตั้งรหัสผ่านใหม่ด้วยตัวเอง (ต้องส่งอีเมลยืนยัน
// ซึ่งยังไม่ได้ทำ) หน้านี้จึงทำสองอย่างที่ช่วยได้จริง
//   1. บอกสองเรื่องที่คนมักพลาดและแก้เองได้ทันที
//   2. บอกทางติดต่อเมื่อแก้เองไม่ได้
// ร้านหนึ่งร้านมีบัญชีเดียว ลืมรหัสแล้วเข้าไม่ได้เลยคือเรื่องใหญ่ที่สุดของเจ้าของร้าน
//
// เมื่อทำระบบตั้งรหัสผ่านใหม่เสร็จแล้ว ให้แทนที่เนื้อหาด้วยฟอร์มกรอกอีเมล
//
// หน้านี้ไม่ใช้ AuthLayout เพราะคนที่มาถึงหน้านี้กำลังเข้าระบบไม่ได้
// ไม่ควรเจอตัวอย่างบันทึกการยืมกับคำโฆษณาแพ็กเกจ Pro ขวางอยู่

import Head from "next/head";
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/useLanguage";

export default function ForgotPassword() {
  const { t } = useLanguage();

  return (
    <>
      <Head>
        <title>{t("page.help")}</title>
      </Head>

      <main className="flex min-h-screen flex-col bg-paper py-5 md:justify-center md:py-7">
        <div className="app-container max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <Logo size={30} />
            <LanguageToggle />
          </div>

          <div className="mt-5 rounded-card border border-line bg-surface p-5 md:mt-6 md:p-6">
            <h1 className="t-page-title">{t("help.title")}</h1>
            <p className="t-caption mt-2">{t("help.body")}</p>

            {/* สองเรื่องที่คนมักพลาดและแก้เองได้ทันที ไม่ต้องรอใคร */}
            <h2 className="t-section mt-5">{t("help.tipsTitle")}</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {["help.tip1", "help.tip2"].map((key) => (
                <li
                  key={key}
                  className="t-body border-b border-line pb-3 last:border-b-0 last:pb-0"
                >
                  {t(key)}
                </li>
              ))}
            </ul>

            <p className="t-caption mt-5 border-t border-line pt-4">{t("help.note")}</p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/login">{t("help.back")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
