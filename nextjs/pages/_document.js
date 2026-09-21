// ไฟล์นี้ควบคุมโครง HTML ชั้นนอกสุดที่ Next.js สร้างที่ฝั่งเซิร์ฟเวอร์
// ปกติไม่ต้องแก้ ใส่ไว้เพื่อสองเรื่อง
//   1. กำหนด lang ของหน้าตั้งแต่ HTML ชุดแรก ไม่ต้องรอ JavaScript ทำงาน
//      ถ้าไม่มี เบราว์เซอร์จะตัดบรรทัดภาษาไทยผิด (เช่น "แพ็กเกจ" แยกเป็น "แพ็ก / เกจ")
//   2. ให้พื้นหลังของหน้ามาตั้งแต่แรก จะได้ไม่เห็นขาววาบก่อนโหลด css เสร็จ

import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="th">
      <Head>
        {/* ฟอนต์ 2 ตัวตาม docs/brand.md หัวข้อ 3
            Space Grotesk = โลโก้ หัวข้อ ตัวเลข · DM Sans = เนื้อความ ปุ่ม ป้ายกำกับ
            ต้องอยู่ในไฟล์นี้ ไม่ใช่ใน _app.js ไม่งั้น Next.js จะเตือนทุกหน้า
            ว่าโหลด stylesheet ภายนอกผิดที่ */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Space+Grotesk:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
