// ไฟล์นี้ควบคุมโครง HTML ชั้นนอกสุดที่ Next.js สร้างที่ฝั่งเซิร์ฟเวอร์
// ปกติไม่ต้องแก้ ใส่ไว้เพื่อสองเรื่อง
//   1. กำหนด lang ของหน้าตั้งแต่ HTML ชุดแรก ไม่ต้องรอ JavaScript ทำงาน
//      ถ้าไม่มี เบราว์เซอร์จะตัดบรรทัดภาษาไทยผิด (เช่น "แพ็กเกจ" แยกเป็น "แพ็ก / เกจ")
//   2. ให้พื้นหลังของหน้ามาตั้งแต่แรก จะได้ไม่เห็นขาววาบก่อนโหลด css เสร็จ

import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="th">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
