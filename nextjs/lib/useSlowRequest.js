// บอกว่า "ยังรออยู่นะ" เมื่อคำขอใช้เวลานานผิดปกติ
//
// ทำไมต้องมี: lib/api.js ตัดการรอที่ 15 วินาที ซึ่งกันหน้าค้างตลอดกาลได้ก็จริง
// แต่ระหว่าง 15 วินาทีนั้น หน้าจอมีแค่คำว่า "กำลังเข้าสู่ระบบ..." คำเดียวไม่ขยับ
// เจ้าของร้านที่มีลูกค้ายืนรอจะคิดว่าเครื่องค้าง แล้วกดรีเฟรช ซึ่งทำให้รหัสที่พิมพ์ไว้หายหมด
// วัดจริงแล้วได้ 15558 มิลลิวินาทีของข้อความเดิมคำเดียว
//
// วิธีใช้
//   const slow = useSlowRequest(loading);
//   {slow ? <p className="t-caption mt-2">{t("state.slow")}</p> : null}

import { useEffect, useState } from "react";

const SLOW_AFTER_MS = 6000;

export function useSlowRequest(active, delay = SLOW_AFTER_MS) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);

  return slow;
}
