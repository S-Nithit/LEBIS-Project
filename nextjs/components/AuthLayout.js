// โครงของหน้าเข้าสู่ระบบและหน้าสมัครสมาชิก
//
// วิธีใช้
//   <AuthLayout title="เข้าสู่ระบบ" description="..." footer={<p>...</p>}>
//     <form> ... </form>
//   </AuthLayout>
//
// จอใหญ่: ซ้ายเป็นโลโก้กับตัวอย่างบันทึกการยืม ขวาเป็นการ์ดฟอร์ม
// จอมือถือ: โลโก้ ฟอร์ม แล้วค่อยตัวอย่างบันทึก — ฟอร์มอยู่บนสุดเสมอ

import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/useLanguage";

// ข้อมูลสมมติสำหรับโชว์หน้าตาของระบบ — ไม่ใช่ข้อมูลจริงของร้านใด
// มีคำกำกับว่าเป็นตัวอย่างอยู่เหนือรายการเสมอ
const SAMPLE_ROWS = [
  { code: "CAM-0102", key: "row1", tone: "success", statusKey: "sample.status.ok", offsetDays: 3 },
  { code: "LEN-0044", key: "row2", tone: "warning", statusKey: "sample.status.due", offsetDays: 1 },
  { code: "TRI-0009", key: "row3", tone: "danger", statusKey: "sample.status.late", offsetDays: -3 },
];

// 🔴 เคยเขียนเป็น "วันที่" โดยคำนวณจาก new Date() ตอนวาด แล้วพังสองชั้น
//
//    ชั้นแรก: หน้านี้ถูกสร้างเป็น HTML ไว้ตอน build เซิร์ฟเวอร์จึงคำนวณวันที่
//    ณ ตอน build ส่วนเบราว์เซอร์คำนวณ ณ ตอนเปิดหน้า สองค่านี้ไม่ตรงกัน
//    React จึงทิ้ง HTML ที่ส่งมาทั้งก้อนแล้ววาดใหม่ทั้งหน้า (hydration failed)
//    และผู้ใช้เห็นวันที่ "เปลี่ยนเอง" ต่อหน้าต่อตา
//
//    ชั้นที่สอง: เครื่องที่ deploy อยู่เป็นเวลา UTC ส่วนคนใช้อยู่ไทย +07
//    ต่างกัน 7 ชั่วโมงทุกวัน วันที่จึงไม่ตรงกันเป็นเรื่องปกติ ไม่ใช่เรื่องบังเอิญ
//
//    เรื่องนี้ไม่มีทางเห็นจากการอ่านไฟล์ ดูภาพหน้าจอ หรือวัดสีเลย
//    มันอยู่ใน console ตอนโหลดหน้า ซึ่งไม่มีใครเปิดดูมาสิบรอบ
//
// ทางที่ถูกคือเลิกใช้ "วันที่" ไปเลย แล้วบอกเป็น "อีกกี่วัน" ซึ่งเป็นค่าคงที่
// ไม่ขึ้นกับนาฬิกา ไม่ขึ้นกับเขตเวลา ไม่ขึ้นกับว่า build เมื่อไหร่
// และสำหรับเจ้าของร้านที่ยืนอยู่หน้าเคาน์เตอร์ "อีก 3 วัน" อ่านง่ายกว่า "25 ก.ย." ด้วย
function dueLabel(offsetDays, t) {
  // ภาษาอังกฤษต้องแยกเอกพจน์ ไม่งั้นได้ "in 1 days" ซึ่งเป็นข้อความที่ผิดจริงๆ
  // ภาษาไทยไม่มีพหูพจน์ แต่ "พรุ่งนี้" อ่านเป็นธรรมชาติกว่า "อีก 1 วัน" อยู่ดี
  if (offsetDays === 1) return t("sample.dueInOne");
  if (offsetDays === -1) return t("sample.lateByOne");
  if (offsetDays > 0) return t("sample.dueIn").replace("{n}", String(offsetDays));
  if (offsetDays === 0) return t("sample.dueToday");
  return t("sample.lateBy").replace("{n}", String(-offsetDays));
}

export function AuthLayout({ title, description, children, footer, bare = false }) {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen flex-col bg-paper py-5 md:justify-center md:py-7">
      {/* โหมด bare แคบกว่า กรอบนอกจึงต้องแคบตาม ไม่งั้นโลโก้กับปุ่มสลับภาษา
          จะกางออกไปสุดขอบจอ ห่างจากการ์ดที่อยู่ข้างล่างเป็นร้อยพิกเซล
          ดูเหมือนปุ่มที่ไม่ได้เป็นของหน้านี้ */}
      <div className={`app-container ${bare ? "max-w-2xl" : "max-w-5xl"}`}>
        {/* แถบบนสุด: โลโก้ กับปุ่มสลับภาษา */}
        <div className="flex items-center justify-between gap-4">
          <Logo size={30} />
          <LanguageToggle />
        </div>

        <div
          className={`mt-5 grid items-start gap-5 md:mt-6 md:gap-6 ${
            bare ? "" : "md:grid-cols-[1.15fr_0.85fr]"
          }`}
        >
          {/* การ์ดฟอร์ม — บนมือถือมาก่อนเสมอ */}
          <section className="rounded-card border border-line bg-surface p-5 md:p-6">
            <h1 className="t-page-title">{title}</h1>
            {description ? <p className="t-caption mt-2">{description}</p> : null}

            <div className="mt-5">{children}</div>

            {footer ? (
              <div className="mt-5 border-t border-line pt-4">{footer}</div>
            ) : null}
          </section>

          {/* ตัวอย่างบันทึกการยืม — ให้คนที่เพิ่งเข้ามาเห็นว่าระบบเก็บอะไรให้
              หน้าที่ส่ง bare เข้ามาจะไม่แสดงแผงนี้ เช่นหน้าลืมรหัสผ่าน
              คนที่เข้าระบบไม่ได้ไม่ควรเจอคำโฆษณาแพ็กเกจขวางอยู่ */}
          {bare ? null : (
          <aside className="rounded-card border border-line bg-surface p-5 md:p-6">
            <p className="t-eyebrow">{t("sample.caption")}</p>

            <ul className="mt-4 flex flex-col">
              {SAMPLE_ROWS.map((row) => (
                <li
                  key={row.code}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-display text-body font-medium text-ink">
                      {row.code}
                    </p>
                    <p className="t-caption">
                      {t(`sample.${row.key}.customer`)} · {t("sample.colDue")}{" "}
                      {dueLabel(row.offsetDays, t)}
                    </p>
                  </div>

                  <StatusBadge tone={row.tone}>{t(row.statusKey)}</StatusBadge>
                </li>
              ))}
            </ul>

            <p className="t-caption mt-5 border-t border-line pt-4">
              {t("sample.footnote")}
            </p>
          </aside>
          )}
        </div>
      </div>
    </main>
  );
}
