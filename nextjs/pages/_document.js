// ไฟล์นี้ควบคุมโครง HTML ชั้นนอกสุดที่ Next.js สร้างที่ฝั่งเซิร์ฟเวอร์
// ปกติไม่ต้องแก้ ใส่ไว้เพื่อสองเรื่อง
//   1. กำหนด lang ของหน้าตั้งแต่ HTML ชุดแรก ไม่ต้องรอ JavaScript ทำงาน
//      ถ้าไม่มี เบราว์เซอร์จะตัดบรรทัดภาษาไทยผิด (เช่น "แพ็กเกจ" แยกเป็น "แพ็ก / เกจ")
//   2. ให้พื้นหลังของหน้ามาตั้งแต่แรก จะได้ไม่เห็นขาววาบก่อนโหลด css เสร็จ

import { Html, Head, Main, NextScript } from "next/document";

// อ่านคุกกี้ภาษาเองอีกครั้งที่ชั้นนี้ เพราะ <Html lang> อยู่นอก React tree
// ของ _app.js จึงส่งค่าลงมาทางเดิมไม่ได้
// ถ้าปล่อยเป็น "th" ตายตัว หน้าที่แสดงภาษาอังกฤษจะประกาศตัวเองว่าเป็นภาษาไทย
// โปรแกรมอ่านหน้าจอจะออกเสียงอังกฤษด้วยสำเนียงไทย และเบราว์เซอร์จะตัดบรรทัดผิด
function languageFromCookie(cookie) {
  const match = String(cookie || "").match(/lebis_language=([^;]+)/);
  return match && (match[1] === "en" || match[1] === "th") ? match[1] : "th";
}

export default function Document({ __lang }) {
  return (
    <Html lang={__lang}>
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

Document.getInitialProps = async (ctx) => {
  const initialProps = await ctx.defaultGetInitialProps(ctx);
  return { ...initialProps, __lang: languageFromCookie(ctx.req?.headers?.cookie) };
};
