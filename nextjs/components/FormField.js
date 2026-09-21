// ช่องกรอกหนึ่งช่อง พร้อมป้ายกำกับและคำอธิบายใต้ช่อง
//
// วิธีใช้
//   import { FormField } from "@/components/FormField";
//
//   <FormField
//     id="email"
//     label="อีเมล"
//     hint="ใช้อีเมลนี้เข้าสู่ระบบในครั้งถัดไป"
//     type="email"
//     value={email}
//     onChange={(event) => setEmail(event.target.value)}
//     required
//   />
//
// prop อื่นๆ (placeholder, autoComplete, disabled) ส่งต่อให้ <input> ให้เอง
// ป้ายกำกับเป็น <label> จริงที่ผูกกับช่องกรอกด้วย id ผู้ใช้จึงกดที่ป้ายแล้วโฟกัสได้

import { Input } from "@/components/ui/input";

export function FormField({ id, label, hint, badge, className, ...inputProps }) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="t-label">
          {label}
        </label>
        {/* badge ไว้เขียนคำว่า "ไม่บังคับ" กำกับช่องที่ไม่ต้องกรอกก็ได้ */}
        {badge ? <span className="t-caption">{badge}</span> : null}
      </div>

      <Input id={id} {...inputProps} />

      {hint ? <p className="t-caption mt-2">{hint}</p> : null}
    </div>
  );
}
