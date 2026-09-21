import Head from "next/head";
import { Toaster } from "sonner";

import { LanguageProvider, STORAGE_KEY } from "@/lib/useLanguage";
import "@/styles/globals.css";

export default function App({ Component, pageProps, initialLanguage }) {
  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <Head>
        <title>LEBIS</title>
        <meta
          name="description"
          content="ระบบจัดการสต็อกและการยืม-คืนสำหรับร้านให้เช่าอุปกรณ์"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* ไอคอนของเว็บ — ไฟล์มาจาก docs/brand.md ห้ามวาดใหม่ */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/app-icon.svg" />

        {/* สีแถบบนของเบราว์เซอร์บนมือถือ ให้กลืนกับพื้นหลังของเว็บ */}
        <meta key="theme-light" name="theme-color" content="#F7F9F9" media="(prefers-color-scheme: light)" />
        <meta key="theme-dark" name="theme-color" content="#0B2126" media="(prefers-color-scheme: dark)" />
      </Head>

      <Component {...pageProps} />

      {/* ที่อยู่ของข้อความแจ้งเตือน (toast) ทุกใบในเว็บ ต้องวางไว้ที่นี่ครั้งเดียว
          หน้าไหนอยากบอกว่าทำสำเร็จก็  import { toast } from "sonner"
          แล้วเรียก toast.success("...")
          🔴 ห้ามใช้ toast บอกความล้มเหลว (docs/brand.md หัวข้อ 6) ความล้มเหลว
             ต้องขึ้นในหน้าตรงจุดที่ล้มเหลว และอยู่จนกว่าผู้ใช้จะแก้ ไม่ใช่หายเอง
          วางไว้ล่างจอเพราะบนจอมีแถบหัวเว็บอยู่ และล่างจออยู่ใกล้นิ้วโป้งกว่า */}
      {/* ยกสูงจากขอบล่าง 72px เพราะท้ายหน้ามีลิงก์ช่วยเหลืออยู่ตรงนั้นพอดี
          ถ้าวางชิดขอบ ข้อความ "บันทึกแล้ว" จะทับลิงก์ช่วยเหลือบนมือถือ
          ซึ่งคือจังหวะที่คนเพิ่งใช้ระบบครั้งแรกอยากกดมันที่สุด */}
      {/* ไม่ใช้ richColors เพราะมันเอาจานสีของ sonner มาใช้แทนสีของระบบ
          ข้อความ "บันทึกแล้ว" คือสิ่งที่ผู้ใช้เห็นหลังกดบันทึกทุกครั้ง
          มันควรเป็นสีเขียวของ LEBIS ไม่ใช่สีเขียวของไลบรารี */}
      <Toaster
        position="bottom-center"
        offset={72}
        // ไม่ระบุ theme = sonner ล็อกเป็นโหมดสว่างตลอด ทั้งที่หน้าเว็บเป็นโหมดมืด
        // ผลคือกล่องขาวโพลนอยู่ล่างจอมืด ซึ่งจะเป็นของที่สว่างที่สุดในแอป
        // และมันโผล่ทุกครั้งที่ทำสำเร็จ
        theme="system"
        // 🔴 sonner ไม่ได้อ่านค่า background จาก CSS ของเราตรงๆ
        //    มันอ่านจากตัวแปรของมันเอง (--normal-bg / --normal-text / --normal-border)
        //    การเขียนทับ .lebis-toast จึงไม่มีผลเลย ไม่ว่าจะเพิ่มน้ำหนักเท่าไหร่
        //    ทางที่ถูกคือป้อนตัวแปรของมันด้วยสีของเรา ซึ่งเป็นวิธีที่ไลบรารีออกแบบไว้
        //    กว่าจะรู้ต้องเปิดหน้าจริงแล้วไล่ดูว่ากฎไหนชนะ อ่านจากไฟล์ไม่มีทางเห็น
        style={{
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--line-strong)",
          "--success-bg": "var(--surface)",
          "--success-text": "var(--ink)",
          "--success-border": "var(--line-strong)",
          "--error-bg": "var(--surface)",
          "--error-text": "var(--ink)",
          "--error-border": "var(--line-strong)",
        }}
        toastOptions={{
          classNames: {
            toast: "lebis-toast",
            success: "lebis-toast-success",
            error: "lebis-toast-error",
          },
        }}
      />
    </LanguageProvider>
  );
}

// อ่านภาษาจากคุกกี้ "ก่อน" วาดหน้า ทั้งฝั่งเซิร์ฟเวอร์และฝั่งเบราว์เซอร์
//
// 🔴 การมี getInitialProps ทำให้ทุกหน้าเลิกเป็น static ไปเป็น server-rendered
//    ซึ่งเป็นสิ่งที่เราต้องการพอดี: หน้า login/register/forgot ต้องถูกวาดใหม่
//    ทุกครั้งตามภาษาของคนที่เปิด ไม่ใช่ถูกอบไว้เป็นภาษาไทยตั้งแต่ตอน build
//    แล้วค่อยเปลี่ยนเป็นอังกฤษให้ผู้ใช้เห็นหลังโหลดเสร็จ
App.getInitialProps = async ({ ctx }) => {
  const raw = ctx?.req?.headers?.cookie || (typeof document !== "undefined" ? document.cookie : "");
  const match = String(raw).match(new RegExp(`${STORAGE_KEY}=([^;]+)`));
  return { initialLanguage: match ? match[1] : null };
};
