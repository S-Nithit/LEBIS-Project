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

// วันที่ในตัวอย่างนับจากวันนี้เสมอ ไม่ได้เขียนตายตัว
// ไม่งั้นอีกสองเดือนจะกลายเป็นวันที่ผ่านมาแล้วแต่ป้ายยังเขียนว่า "อยู่ในกำหนด"
function dueLabel(offsetDays, language) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString(language === "en" ? "en-GB" : "th-TH", {
    day: "numeric",
    month: "short",
  });
}

export function AuthLayout({ title, description, children, footer, bare = false }) {
  const { t, language } = useLanguage();

  return (
    <main className="flex min-h-screen flex-col bg-paper py-5 md:justify-center md:py-7">
      <div className="app-container max-w-5xl">
        {/* แถบบนสุด: โลโก้ กับปุ่มสลับภาษา */}
        <div className="flex items-center justify-between gap-4">
          <Logo size={30} />
          <LanguageToggle />
        </div>

        <div
          className={`mt-5 grid items-start gap-5 md:mt-6 md:gap-6 ${
            bare ? "max-w-2xl" : "md:grid-cols-[1.15fr_0.85fr]"
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
          <aside className="rounded-card border border-line bg-paper p-5 md:p-6">
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
                      {dueLabel(row.offsetDays, language)}
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
