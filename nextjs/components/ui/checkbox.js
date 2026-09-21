// ช่องติ๊กมาตรฐานของ LEBIS
//
// วิธีใช้
//   import { Checkbox } from "@/components/ui/checkbox";
//
//   <Checkbox id="remember" checked={remember} onChange={...} label="จำฉันไว้" />
//
// ทำไมไม่ใช้ <input type="checkbox"> เปล่าๆ: เบราว์เซอร์วาดกล่องติ๊กด้วยสีของตัวเอง
// ในโหมดมืดมันจะเป็นกล่องสีเทาอุ่นทึบๆ บนพื้นเขียวน้ำทะเลของเรา
// แล้วคนอ่านจะนึกว่า "ติ๊กไว้แล้ว" ทั้งที่ยังไม่ได้ติ๊ก
// ตัวนี้วาดเองด้วยสีของแบรนด์ สถานะติ๊ก/ไม่ติ๊กจึงต่างกันชัดในทั้งสองโหมด

import { cn } from "@/lib/utils";

export function Checkbox({ id, label, className, ...inputProps }) {
  return (
    <label
      htmlFor={id}
      className={cn("flex min-h-[44px] cursor-pointer items-center gap-3", className)}
    >
      <input id={id} type="checkbox" className="lebis-checkbox" {...inputProps} />
      <span className="t-label">{label}</span>
    </label>
  );
}
