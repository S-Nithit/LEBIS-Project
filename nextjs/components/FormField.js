// ช่องกรอกหนึ่งช่อง พร้อมป้ายกำกับ คำอธิบาย และข้อความบอกข้อผิดพลาด
//
// วิธีใช้
//   import { FormField } from "@/components/FormField";
//
//   <FormField
//     id="email"
//     label="อีเมล"
//     hint="ใช้อีเมลนี้เข้าสู่ระบบในครั้งถัดไป"
//     error={errors.email}          // ใส่ข้อความเมื่อกรอกผิด ไม่ผิดก็ส่ง undefined
//     type="email"
//     value={email}
//     onChange={(event) => setEmail(event.target.value)}
//     required
//   />
//
// 🔴 เวลาผู้ใช้กรอกผิด ให้ส่งข้อความผ่าน prop error เสมอ ห้ามบอกผ่าน toast
//    เพราะ toast ไม่ได้บอกว่าช่องไหนผิด และหายไปเองภายในไม่กี่วินาที
//    ตัว component จัดการให้แล้วทั้งกรอบสีแดง ข้อความใต้ช่อง และการบอกโปรแกรม
//    อ่านหน้าจอ (aria-invalid / aria-describedby) — หน้าเว็บแค่ส่งข้อความมา
//
// prop อื่นๆ (placeholder, autoComplete, disabled) ส่งต่อให้ <input> ให้เอง

import { forwardRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/useLanguage";
import { cn } from "@/lib/utils";

export const FormField = forwardRef(function FormField(
  { id, label, hint, badge, error, onClearError, className, maxBytes, ...inputProps },
  ref
) {
  const { t } = useLanguage();

  // ช่องรหัสผ่านจะมีปุ่ม "ดู/ซ่อน" ให้อัตโนมัติ
  // คนที่ยืนกรอกด้วยมือเดียวหน้าร้านพิมพ์ผิดง่าย ต้องมีทางตรวจว่าพิมพ์ถูกมั้ย
  const isPassword = inputProps.type === "password";

  // พอผู้ใช้เริ่มแก้ ข้อความผิดพลาดต้องหายไปทันที
  // ไม่งั้นหน้าจอจะยืนยันว่าผิดอยู่ทั้งที่แก้ถูกแล้ว (และโปรแกรมอ่านหน้าจอ
  // ก็จะยังประกาศว่าช่องนี้ผิดอยู่ เพราะ aria-invalid ค้าง)
  function handleChange(event) {
    // เรียกทุกครั้งที่พิมพ์ ไม่ใช่เฉพาะตอนช่องนี้มีข้อความผิดพลาด
    // กล่องผิดพลาดระดับฟอร์ม (เช่น "เชื่อมต่อไม่ได้") ไม่ได้ผูกกับช่องไหน
    // ถ้ารอให้ช่องมี error ก่อน กล่องแดงจะค้างอยู่ขณะที่ผู้ใช้กำลังแก้อยู่แล้ว
    onClearError?.(id);
    inputProps.onChange?.(event);
  }
  const [revealed, setRevealed] = useState(false);
  const inputType = isPassword && revealed ? "text" : inputProps.type;
  // ถึงขีดสูงสุดแล้วเบราว์เซอร์จะกลืนตัวอักษรที่พิมพ์ต่อโดยไม่บอกอะไรเลย
  // คนที่วางข้อความยาวมาจะเห็นของหายไปครึ่งหนึ่งโดยไม่รู้ว่าเพราะอะไร
  const atLimit =
    typeof inputProps.maxLength === "number" &&
    String(inputProps.value ?? "").length >= inputProps.maxLength;

  // bcrypt นับรหัสผ่านเป็น "ไบต์" ไม่ใช่ "ตัวอักษร" ภาษาไทยตัวละ 3 ไบต์
  // ถ้าบอกผู้ใช้เป็นจำนวนตัวอักษร คนที่พิมพ์ไทยปนอังกฤษจะอยู่ในกฎตามที่เขียน
  // แต่ถูกปฏิเสธจริง เพราะไม่มีใครนั่งคิดว่าของตัวเองกินกี่ไบต์
  // ทางที่ถูกคือให้ช่องกรอกบอกเองตอนเกิน ไม่ใช่ให้ผู้ใช้คำนวณ
  const usedBytes =
    typeof maxBytes === "number"
      ? new Blob([String(inputProps.value ?? "")]).size
      : 0;
  const overBytes = typeof maxBytes === "number" && usedBytes > maxBytes;

  // ข้อความเตือนไม่กลืนคำอธิบายเดิมทิ้ง ต่อท้ายแทน ไม่งั้นช่องที่มีทั้งสองอย่าง
  // จะเสียคำอธิบายไปตอนที่ผู้ใช้ต้องการมันที่สุด
  const notice = overBytes ? t("field.tooLongBytes") : atLimit ? t("field.limit") : "";
  const shownHint = [notice, hint].filter(Boolean).join(" · ");
  const hintId = shownHint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  // บอกโปรแกรมอ่านหน้าจอว่าข้อความไหนอธิบายช่องนี้อยู่
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      {/* badge ("ไม่บังคับ") อยู่ใน <label> เดียวกัน ไม่ใช่ span ลอยข้างนอก
          โปรแกรมอ่านหน้าจอจะได้อ่านว่า "ชื่อร้าน ไม่บังคับ" ต่อกันไปเลย
          ถ้าวางไว้นอก label คนที่ใช้โปรแกรมอ่านหน้าจอจะไม่รู้ว่าช่องไหนไม่บังคับ */}
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between gap-2">
        <span className="t-label">{label}</span>
        {badge ? <span className="t-caption">{badge}</span> : null}
      </label>

      <div className={cn(isPassword && "relative")}>
        <Input
          id={id}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn(error && "field-input-error", isPassword && "pr-[84px]")}
          {...inputProps}
          onChange={handleChange}
          type={inputType}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-pressed={revealed}
            aria-label={`${revealed ? t("field.hide") : t("field.show")} ${label}`}
            /* ปุ่มนี้ต้องไม่ดูเหมือนช่องกรอกอีกช่องซ้อนอยู่ในช่องกรอก
               เดิมใช้ขอบ 1px --line-strong กับมุมมนชุดเดียวกับช่อง ขอบเลยทับกันพอดี
               ตอนนี้ไม่มีขอบรอบตัว มีแค่เส้นคั่นด้านซ้าย + พื้นคนละสีกับช่อง
               ยังเห็นขอบเขตของสิ่งที่กดได้ (brand.md หัวข้อ 2) แต่ไม่ปลอมเป็นช่องกรอก */
            className="absolute right-0 top-1/2 inline-flex min-h-[44px] w-[76px] -translate-y-1/2 items-center justify-center whitespace-nowrap rounded-r-control border-l border-line-strong bg-paper text-label font-medium text-muted hover:bg-surface hover:text-ink"
          >
            {revealed ? t("field.hide") : t("field.show")}
          </button>
        ) : null}
      </div>

      {/* ข้อความบอกข้อผิดพลาดอยู่ก่อนคำอธิบาย เพราะเป็นสิ่งที่ต้องอ่านก่อน
          role="alert" ทำให้โปรแกรมอ่านหน้าจออ่านทันทีที่ข้อความโผล่ */}
      {error ? (
        <p id={errorId} role="alert" className="t-caption mt-2 text-danger">
          {error}
        </p>
      ) : null}

      {shownHint ? (
        <p id={hintId} className="t-caption mt-2">
          {shownHint}
        </p>
      ) : null}
    </div>
  );
});
