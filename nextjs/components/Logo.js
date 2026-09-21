// โลโก้ LEBIS — ป้ายแท็กที่ร้านผูกไว้กับอุปกรณ์ทุกชิ้น
//
// วิธีใช้
//   import { Logo } from "@/components/Logo";
//
//   <Logo />                          ขนาดปกติ สำหรับพื้นอ่อน
//   <Logo variant="dark" />           สำหรับพื้นเข้ม เช่นแถบหัวเว็บ
//   <Logo size={40} />                กำหนดความสูงของแท็กเป็นพิกเซล
//   <Logo showWordmark={false} />     เอาเฉพาะแท็ก ไม่เอาตัวอักษร
//
// 🔴 ทุกที่ที่ต้องใช้โลโก้ให้เรียก component นี้ ห้ามวาดเองหรือใส่รูปเอง
//    รูปทรงมาจาก docs/brand.md หัวข้อ 1 ตรงๆ ห้ามหมุน ยืด ใส่เงา หรือใส่ไล่สี
//
// ตัวอักษร LEBIS เป็นข้อความจริง ไม่ใช่รูป ผู้ใช้จึงลากเลือกและค้นหาเจอ

export function Logo({ size = 28, variant = "light", showWordmark = true, className = "" }) {
  // พื้นอ่อนใช้เส้นสีหมึก พื้นเข้มใช้เส้นสีขาว ส่วนรูของแท็กเป็นสีอำพันเสมอ
  const strokeColor = variant === "dark" ? "#FFFFFF" : "var(--ink)";
  const wordmarkColor = variant === "dark" ? "#FFFFFF" : "var(--ink)";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-label="LEBIS"
        style={{ display: "block", flexShrink: 0 }}
      >
        <path
          d="M27.4 4.5H40.5a3 3 0 0 1 3 3v13.1a3 3 0 0 1-.88 2.12L24.72 40.62a3 3 0 0 1-4.24 0L7.38 27.52a3 3 0 0 1 0-4.24L25.28 5.38a3 3 0 0 1 2.12-.88Z"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="35.2" cy="12.8" r="3.4" fill="#E09540" />
      </svg>

      {showWordmark ? (
        <span
          style={{
            fontFamily: "'Space Grotesk', 'Prompt', ui-sans-serif, system-ui, sans-serif",
            fontWeight: 600,
            letterSpacing: "0.06em",
            fontSize: Math.round(size * 0.62),
            lineHeight: 1,
            color: wordmarkColor,
          }}
        >
          LEBIS
        </span>
      ) : null}
    </span>
  );
}
