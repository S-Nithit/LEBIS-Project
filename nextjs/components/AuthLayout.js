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
  { code: "CAM-0102", key: "row1", tone: "success", statusKey: "sample.status.ok" },
  { code: "LEN-0044", key: "row2", tone: "warning", statusKey: "sample.status.due" },
  { code: "TRI-0009", key: "row3", tone: "danger", statusKey: "sample.status.late" },
];

export function AuthLayout({ title, description, children, footer }) {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen flex-col bg-paper py-5 md:justify-center md:py-7">
      <div className="app-container max-w-5xl">
        {/* แถบบนสุด: โลโก้ กับปุ่มสลับภาษา */}
        <div className="flex items-center justify-between gap-4">
          <Logo size={30} />
          <LanguageToggle />
        </div>

        <div className="mt-5 grid items-start gap-5 md:mt-6 md:grid-cols-[1fr_1.05fr] md:gap-6">
          {/* การ์ดฟอร์ม — บนมือถือมาก่อนเสมอ */}
          <section className="order-1 rounded-card border border-line bg-surface p-5 md:order-2 md:p-6">
            <h1 className="t-page-title">{title}</h1>
            {description ? <p className="t-caption mt-2">{description}</p> : null}

            <div className="mt-5">{children}</div>

            {footer ? (
              <div className="mt-5 border-t border-line pt-4">{footer}</div>
            ) : null}
          </section>

          {/* ตัวอย่างบันทึกการยืม — ให้คนที่เพิ่งเข้ามาเห็นว่าระบบเก็บอะไรให้ */}
          <aside className="order-2 rounded-card border border-line bg-surface p-5 md:order-1 md:p-6">
            <p className="t-eyebrow">{t("sample.caption")}</p>

            <ul className="mt-4 flex flex-col">
              {SAMPLE_ROWS.map((row) => (
                <li
                  key={row.code}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-medium text-ink">
                      {row.code}
                    </p>
                    <p className="t-caption">
                      {t(`sample.${row.key}.customer`)} · {t("sample.colDue")}{" "}
                      {t(`sample.${row.key}.due`)}
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
        </div>
      </div>
    </main>
  );
}
