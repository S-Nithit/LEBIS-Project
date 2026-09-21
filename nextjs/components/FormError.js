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

export function FormError({ message, onRetry }) {
  const boxRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!message) return;
    boxRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    boxRef.current?.focus();
  }, [message]);

  if (!message) return null;

  return (
    <div ref={boxRef} role="alert" tabIndex={-1} className="form-error">
      <p>{message}</p>

      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-2 font-medium underline underline-offset-4">
          {t("action.retry")}
        </button>
      ) : null}
    </div>
  );
}
