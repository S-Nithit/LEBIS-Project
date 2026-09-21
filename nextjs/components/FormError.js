// กล่องบอกข้อผิดพลาดของทั้งฟอร์ม
//
// ใช้กับเรื่องที่ไม่ได้ผิดที่ช่องใดช่องหนึ่ง เช่นเน็ตหลุด เซิร์ฟเวอร์ล่ม
// หรืออีเมลกับรหัสผ่านไม่ตรงกัน (ซึ่งไม่รู้ว่าผิดที่ช่องไหน)
//
// วิธีใช้ — วางไว้ "ติดกับปุ่มส่ง" เสมอ
//   <FormError message={formError} onRetry={handleSubmit} retrying={submitting} />
//   <Button type="submit">...</Button>
//
// ส่ง onRetry กับ retrying ให้ครบทุกที่ที่เรียก ไม่งั้นกล่องจะบอกว่าพังแล้วไม่มีปุ่มให้กด
// คนที่เน็ตสะดุดตอนกดบันทึกจะเหลือทางเดียวคือเดาเอาเองว่าต้องทำอะไรต่อ
//
// 🔴 อย่าวางไว้บนสุดของฟอร์ม เพราะบนมือถือฟอร์มยาว ผู้ใช้กดปุ่มที่อยู่ล่างสุด
//    แล้วข้อความจะไปโผล่นอกจอที่เขามองอยู่ กล่องนี้จะเลื่อนหน้าจอมาหาตัวเอง
//    และรับโฟกัสให้ด้วย โปรแกรมอ่านหน้าจอจะได้อ่านทันที

import { useEffect, useRef } from "react";

import { useLanguage } from "@/lib/useLanguage";

export function FormError({ message, onRetry, retrying = false }) {
  const boxRef = useRef(null);
  const { t } = useLanguage();

  // เลื่อนหน้าจอและย้ายโฟกัสเฉพาะ "ตอนกล่องเพิ่งโผล่" ไม่ใช่ทุกครั้งที่ข้อความเปลี่ยน
  // role="alert" อ่านข้อความใหม่ให้เองอยู่แล้ว ถ้าย้ายโฟกัสซ้ำระหว่างที่โปรแกรม
  // อ่านหน้าจอกำลังอ่านอยู่ จะกระชากผู้ใช้กลับไปต้นกล่องกลางประโยค
  const wasShown = useRef(false);

  useEffect(() => {
    if (!message) {
      wasShown.current = false;
      return;
    }
    if (wasShown.current) return;
    wasShown.current = true;

    // ถ้าผู้ใช้ตั้งเครื่องให้ลดการเคลื่อนไหว ต้องเลื่อนแบบกระโดด ไม่ใช่ไถลนุ่มๆ
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    boxRef.current?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    boxRef.current?.focus();
  }, [message]);

  if (!message) return null;

  return (
    <div ref={boxRef} role="alert" tabIndex={-1} className="form-error">
      <p>{message}</p>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          /* ปุ่มเดียวในระบบที่ใช้กู้สถานการณ์ตอนพัง ต้องกดง่ายที่สุด ไม่ใช่ยากที่สุด
             วัดได้ 74x23 ตอนยังไม่มี min-h ซึ่งเล็กกว่าเกณฑ์ 44px ของ brand.md
             และเล็กกว่า 24px ขั้นต่ำของ WCAG 2.5.8 ด้วยซ้ำ */
          className="mt-2 inline-flex min-h-[44px] items-center font-medium underline underline-offset-4 disabled:opacity-60"
        >
          {t("action.retry")}
        </button>
      ) : null}
    </div>
  );
}
