// ปุ่มสลับภาษา ไทย / EN
//
// วิธีใช้
//   <LanguageToggle />
//
// อยู่ 2 ที่เท่านั้น: หน้าที่ยังไม่ได้เข้าสู่ระบบ (AuthLayout) กับหน้าบัญชี
// ไม่ได้อยู่บนแถบหัวเว็บอีกแล้ว เพราะภาษาเป็นค่าที่ตั้งครั้งเดียวต่อบัญชี
// ไม่ใช่การกระทำที่ทำซ้ำทุกหน้า ปุ่มที่อยู่ทุกหน้าแต่แทบไม่มีใครกด
// จะกลายเป็นของที่เด่นที่สุดในหน้าโดยไม่ได้ตั้งใจ
//
// ภาษาที่เลือกถูกจำไว้ในเครื่อง และเปลี่ยนทั้งเว็บพร้อมกันทุกหน้า

import { cn } from "@/lib/utils";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

export function LanguageToggle({ className }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={cn(
        "inline-flex items-center rounded-control border border-line bg-surface p-1",
        className
      )}
    >
      {LANGUAGES.map((item) => {
        const active = item.code === language;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLanguage(item.code)}
            aria-pressed={active}
            className={cn(
              // สูงพอให้กดด้วยนิ้วโป้งบนมือถือ (brand.md หัวข้อ 6)
              "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-control px-3 text-label font-medium transition-colors",
              // ตัวที่เลือกอยู่ใช้ "ขอบ" ไม่ใช่ "พื้นทึบ"
              // พื้นทึบทำให้ปุ่มที่คนกดปีละครั้งดังกว่าปุ่มที่เป็นงานจริงของหน้า
              // และในโหมดมืด --ink เป็นสีอ่อน กลายเป็นบล็อกเกือบขาวกลางการ์ด
              // สถานะที่เลือกไว้มี aria-pressed บอกโปรแกรมอ่านหน้าจออยู่แล้ว
              active
                ? "border border-line-strong bg-surface text-ink"
                : "border border-transparent text-muted hover:text-ink"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
