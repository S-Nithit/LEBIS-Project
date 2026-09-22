// กล่องที่แสดงตอนยังไม่มีข้อมูลในหน้านั้น
// มีไอคอนเส้น คำอธิบายหนึ่งบรรทัด และปุ่มหนึ่งปุ่ม (ตาม docs/brand.md หัวข้อ 5)
//
// วิธีใช้
//   import { EmptyState } from "@/components/EmptyState";
//
//   {items.length === 0 ? (
//     <EmptyState
//       title="ยังไม่มีอุปกรณ์ในระบบ"
//       description="เพิ่มอุปกรณ์ชิ้นแรกของร้าน แล้วระบบจะเริ่มนับจำนวนที่อยู่บนชั้นให้เอง"
//       action={<Button>เพิ่มอุปกรณ์</Button>}
//     />
//   ) : (
//     <ItemTable items={items} />
//   )}
//
// 🔴 ทุกหน้าที่มีรายการต้องมีกล่องนี้ ตารางว่างเปล่าที่ไม่บอกอะไรเลยถือว่าเป็นบั๊ก

import { Logo } from "@/components/Logo";

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface px-5 py-8 text-center">
      {/* ไอคอนคือโลโก้ตัวเดียวกับของแบรนด์ เรียกผ่าน Logo เสมอ ห้ามวาดเอง */}
      <span aria-hidden="true">
        <Logo size={40} showWordmark={false} />
      </span>

      <div className="flex flex-col gap-2">
        <p className="t-section">{title}</p>
        {description ? <p className="t-caption mx-auto">{description}</p> : null}
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}
