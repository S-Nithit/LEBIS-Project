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

      <AuthLayout bare title={t("help.title")} description={t("help.tipsLead")}>
        {/* 🔴 ไม่มีหัวข้อย่อยเหนือรายการ
               เดิมมี <h2> ขนาด 20px ตัวหนาเขียนว่า "ลองสองเรื่องนี้ก่อน..." ซึ่งเป็น
               ป้ายบอกว่าข้างล่างมีลิสต์ ไม่ใช่เนื้อหา ผลคือของที่ดังเป็นอันดับสอง
               ในหน้าคือป้าย ส่วนคำตอบจริงอยู่ล่างสุดด้วยขนาดเล็กกว่า
               รายการเลขใต้หัวข้อ "ช่วยเหลือเรื่องการเข้าสู่ระบบ" บอกตัวเองอยู่แล้วว่าคืออะไร
               ประโยคที่หัวข้อย่อยเคยแบกไว้ ย้ายขึ้นไปเป็นคำอธิบายใต้หัวข้อหน้า */}
        <ol className="flex flex-col gap-4">
          {["help.tip1", "help.tip2"].map((key, index) => (
            <li key={key} className="flex gap-3 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
              <span
                aria-hidden="true"
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-badge border border-line text-label font-medium text-muted"
              >
                {index + 1}
              </span>
              <p className="t-body">{t(key)}</p>
            </li>
          ))}
        </ol>

        {/* 🔴 ข้อความนี้คือคำตอบของทั้งหน้า ต้องเป็นขนาดตัวอักษรของเนื้อความ
               ไม่ใช่ t-caption 13px สีจาง ซึ่งเป็นขนาดที่เล็กที่สุดในหน้า
               คนที่เข้าระบบไม่ได้มาอ่านหน้านี้เพื่อหาประโยคนี้ประโยคเดียว
               ถ้ายังไม่ได้ตั้งช่องทางติดต่อไว้ ห้ามเขียนว่า "กรุณาติดต่อทีมงาน"
               เพราะหน้าจอไม่มีอะไรให้กด ให้บอกสิ่งที่เป็นจริงแทน */}
        <p className="t-body mt-5 border-t border-line pt-4">
          {SUPPORT_CONTACT ? t("help.note") : t("help.noteNoChannel")}
        </p>

        {/* คำปลอบใจอยู่ติดกับปุ่ม ไม่ใช่เป็นบรรทัดจางๆ ใต้หัวข้อหน้าที่สายตาข้ามไป */}
        <p className="t-caption mt-3">
          {t("help.body")}
          {SUPPORT_CONTACT ? null : (
            <>
              {" "}
              <Link
                href="/register"
                className="inline-flex min-h-[44px] items-center font-medium text-ink underline underline-offset-4 hover:no-underline"
              >
                {t("help.register")}
              </Link>
            </>
          )}
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {/* ปุ่มติดต่อจะขึ้นก็ต่อเมื่อมีช่องทางจริงใน lib/config.js
              ไม่ตั้งค่าไว้ก็ไม่โชว์ปุ่มที่กดแล้วไม่ไปไหน */}
          {SUPPORT_CONTACT ? (
            <Button asChild className="w-full sm:w-auto">
              <a href={SUPPORT_CONTACT}>{t("help.contactLabel")}</a>
            </Button>
          ) : null}

          {/* 🔴 ปุ่มหลักต้องตรงกับสิ่งที่ย่อหน้าข้างบนแนะนำ
                 ถ้ายังไม่มีช่องทางติดต่อ ย่อหน้าจะบอกให้ไปสมัครด้วยอีเมลอื่นก่อน
                 ปุ่มที่เด่นที่สุดจึงต้องเป็นปุ่มนั้น ไม่ใช่ปุ่มพากลับไปหน้า
                 ที่เขาเพิ่งเข้าไม่ได้ — ปุ่มดังที่ขัดกับย่อหน้า คือการบอกสองอย่าง
                 พร้อมกันแล้วให้ผู้ใช้เดาเอาเองว่าอันไหนจริง
                 (ส่วนเรื่องปุ่มหลักมีได้กี่ปุ่ม ดู docs/brand.md หัวข้อ 5
                  ซึ่งนับต่อ "ส่วน" ของหน้า ไม่ใช่ต่อหน้า) */}
          {/* 🔴 ปุ่มหลักคือ "กลับไปหน้าเข้าสู่ระบบ" ไม่ใช่ "สมัครบัญชีใหม่"
                 หน้านี้เขียนไว้เองที่หัวไฟล์ว่าจงใจเอาวิธีที่แก้เองได้ขึ้นก่อน
                 เพื่อไม่ให้คนอ่านหมดหวังตั้งแต่บรรทัดแรก — และวิธีทั้งสองข้อนั้น
                 ทำที่หน้าเข้าสู่ระบบ การทำให้ทางเลือกสุดท้ายเป็นปุ่มที่ดังที่สุด
                 คือการกลับลำดับที่หน้านี้เพิ่งเถียงไว้เอง
                 และสำหรับร้านให้เช่า "สมัครบัญชีใหม่" แปลว่าร้านใบที่สองที่ไม่มีของเลย */}
          <Button asChild className="w-full sm:w-auto">
            <Link href="/login">{t("help.back")}</Link>
          </Button>
        </div>
      </AuthLayout>
    </>
  );
}
