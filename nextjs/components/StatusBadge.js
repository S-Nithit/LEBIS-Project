// ป้ายสถานะเม็ดเล็ก มุมมน ใช้สีตามตารางใน docs/brand.md
//
// วิธีใช้
//   import { StatusBadge } from "@/components/StatusBadge";
//
//   <StatusBadge tone="success">ว่าง</StatusBadge>        ของอยู่บนชั้น คืนแล้ว
//   <StatusBadge tone="warning">ใกล้ครบกำหนด</StatusBadge>
//   <StatusBadge tone="danger">เกินกำหนด</StatusBadge>
//   <StatusBadge tone="accent">Pro</StatusBadge>           ป้ายแพ็กเกจ
//   <StatusBadge>ร่าง</StatusBadge>                         สถานะกลางๆ
//
// สีตัวอักษรที่ใช้เป็นเวอร์ชันที่อ่านออกบนพื้นขาว (ผ่านค่าความต่างของสี 4.5:1)
// ไม่ได้เอาสีดิบอย่าง --amber มาเป็นตัวอักษร ตามข้อห้ามใน brand.md

import { cn } from "@/lib/utils";

const TONES = {
  neutral: "badge-neutral",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  accent: "badge-accent",
};

export function StatusBadge({ tone = "neutral", children, className }) {
  return (
    <span className={cn("badge", TONES[tone] || TONES.neutral, className)}>
      {children}
    </span>
  );
}
