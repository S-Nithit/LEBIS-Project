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

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface px-5 py-8 text-center">
      {/* ไอคอนป้ายแท็กแบบเส้น ใช้รูปทรงเดียวกับโลโก้ */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="text-line"
      >
        <path
          d="M27.4 4.5H40.5a3 3 0 0 1 3 3v13.1a3 3 0 0 1-.88 2.12L24.72 40.62a3 3 0 0 1-4.24 0L7.38 27.52a3 3 0 0 1 0-4.24L25.28 5.38a3 3 0 0 1 2.12-.88Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="35.2" cy="12.8" r="3.4" stroke="currentColor" strokeWidth="2.4" />
      </svg>

      <div className="flex flex-col gap-2">
        <p className="t-section">{title}</p>
        {description ? <p className="t-caption mx-auto">{description}</p> : null}
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}
