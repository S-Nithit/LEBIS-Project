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
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-control border p-1",
        onDark ? "border-white/25" : "border-line bg-surface",
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
              "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-inner px-3 text-label font-medium transition-colors",
              active
                ? onDark
                  ? "bg-white text-ink"
                  : "bg-ink text-on-ink"
                : onDark
                  ? "text-white/70 hover:text-white"
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
