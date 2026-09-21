// ปุ่มสลับภาษา ไทย / EN
//
// วิธีใช้
//   <LanguageToggle />           บนพื้นอ่อน
//   <LanguageToggle onDark />    บนแถบหัวเว็บสีเข้ม
//
// ตัวนี้อยู่ใน AppShell ให้แล้ว หน้าที่ใช้ AppShell ไม่ต้องวางเอง
// ภาษาที่เลือกถูกจำไว้ในเครื่อง และเปลี่ยนทั้งเว็บพร้อมกันทุกหน้า

import { cn } from "@/lib/utils";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

export function LanguageToggle({ onDark = false, className }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={cn(
        "inline-flex items-center rounded-control border p-1",
        onDark ? "border-header-line" : "border-line bg-surface",
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
              active
                ? onDark
                  // 🔴 ห้ามใช้ bg-white กับ text-ink บนแถบหัวเว็บ
                  //    --ink พลิกเป็นสีอ่อนในโหมดมืด ตัวอักษรอ่อนบนพื้นขาว = 1.10:1
                  //    ซึ่งคือมองไม่เห็นเลย ต้องใช้สีคู่ของแถบหัวเว็บที่ไม่พลิกตามธีม
                  ? "bg-header-fg text-header-bg"
                  : "bg-ink text-on-ink"
                : onDark
                  ? "text-header-fg hover:text-header-fg"
                  : "text-muted hover:text-ink"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
