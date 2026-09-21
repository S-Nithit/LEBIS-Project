// หน้าที่บอกว่าจะทำยังไงเมื่อเข้าสู่ระบบไม่ได้
//
// ลำดับสำคัญ: บอกสองเรื่องที่แก้เองได้ทันทีก่อน แล้วค่อยบอกทางติดต่อ
// ถ้าขึ้นต้นด้วย "ระบบยังทำไม่ได้" คนอ่านจะหมดหวังตั้งแต่บรรทัดแรก
// ทั้งที่ส่วนใหญ่แก้เองได้
//
// ใช้ AuthLayout แบบ bare (ไม่มีแผงตัวอย่างบันทึกการยืมกับคำโฆษณา Pro)
// คนที่เข้าระบบไม่ได้ไม่ควรเจอคำเชิญให้ซื้อแพ็กเกจขวางอยู่
//
// เมื่อทำระบบตั้งรหัสผ่านใหม่เสร็จแล้ว ให้แทนที่รายการนี้ด้วยฟอร์มกรอกอีเมล

import Head from "next/head";
import Link from "next/link";

import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { SUPPORT_CONTACT } from "@/lib/config";
import { useLanguage } from "@/lib/useLanguage";

export default function ForgotPassword() {
  const { t } = useLanguage();

  return (
    <>
      <Head>
        <title>{t("page.help")}</title>
      </Head>

      <AuthLayout bare title={t("help.title")} description={t("help.body")}>
        {/* สองเรื่องที่คนมักพลาดและแก้เองได้ทันที ไม่ต้องรอใคร */}
        <ol className="flex flex-col gap-4">
          {["help.tip1", "help.tip2"].map((key, index) => (
            <li key={key} className="flex gap-3 border-b border-line pb-4 last:border-b-0 last:pb-0">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-badge border border-line text-label font-medium text-muted"
              >
                {index + 1}
              </span>
              <p className="t-body">{t(key)}</p>
            </li>
          ))}
        </ol>

        <p className="t-caption mt-5 border-t border-line pt-4">{t("help.note")}</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {/* ปุ่มติดต่อจะขึ้นก็ต่อเมื่อมีช่องทางจริงใน lib/config.js
              ไม่ตั้งค่าไว้ก็ไม่โชว์ปุ่มที่กดแล้วไม่ไปไหน */}
          {SUPPORT_CONTACT ? (
            <Button asChild className="w-full sm:w-auto">
              <a href={SUPPORT_CONTACT}>{t("help.contactLabel")}</a>
            </Button>
          ) : null}

          <Button asChild variant="secondary" className="w-full sm:w-auto">
            <Link href="/login">{t("help.back")}</Link>
          </Button>
        </div>
      </AuthLayout>
    </>
  );
}
