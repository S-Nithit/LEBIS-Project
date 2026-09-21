// กล่องบอกข้อผิดพลาดของทั้งฟอร์ม
//
// ใช้กับเรื่องที่ไม่ได้ผิดที่ช่องใดช่องหนึ่ง เช่นเน็ตหลุด เซิร์ฟเวอร์ล่ม
// หรืออีเมลกับรหัสผ่านไม่ตรงกัน (ซึ่งไม่รู้ว่าผิดที่ช่องไหน)
//
// วิธีใช้ — วางไว้ "ติดกับปุ่มส่ง" เสมอ
//   <FormError message={formError} onRetry={handleSubmit} />
//   <Button type="submit">...</Button>
//
// 🔴 อย่าวางไว้บนสุดของฟอร์ม เพราะบนมือถือฟอร์มยาว ผู้ใช้กดปุ่มที่อยู่ล่างสุด
//    แล้วข้อความจะไปโผล่นอกจอที่เขามองอยู่ กล่องนี้จะเลื่อนหน้าจอมาหาตัวเอง
//    และรับโฟกัสให้ด้วย โปรแกรมอ่านหน้าจอจะได้อ่านทันที

import { useEffect, useRef } from "react";

import { useLanguage } from "@/lib/useLanguage";

export function FormError({ message, onRetry, retrying = false }) {
  const boxRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!message) return;
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
          className="mt-2 font-medium underline underline-offset-4 disabled:opacity-60"
        >
          {t("action.retry")}
        </button>
      ) : null}
    </div>
  );
}
