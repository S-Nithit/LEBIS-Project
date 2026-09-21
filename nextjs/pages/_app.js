import Head from "next/head";
import { Toaster } from "sonner";

import { LanguageProvider } from "@/lib/useLanguage";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <LanguageProvider>
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

        {/* ฟอนต์ 2 ตัวตาม brand.md หัวข้อ 3
            Space Grotesk = โลโก้ หัวข้อ ตัวเลข · DM Sans = เนื้อความ ปุ่ม ป้ายกำกับ */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Space+Grotesk:wght@500;600&display=swap"
          rel="stylesheet"
        />

        {/* สีแถบบนของเบราว์เซอร์บนมือถือ ให้กลืนกับพื้นหลังของเว็บ */}
        <meta key="theme-light" name="theme-color" content="#F7F9F9" media="(prefers-color-scheme: light)" />
        <meta key="theme-dark" name="theme-color" content="#0B2126" media="(prefers-color-scheme: dark)" />
      </Head>

      <Component {...pageProps} />

      {/* ที่อยู่ของข้อความแจ้งเตือน (toast) ทุกใบในเว็บ ต้องวางไว้ที่นี่ครั้งเดียว
          หน้าไหนอยากแจ้งเตือนก็  import { toast } from "sonner"
          แล้วเรียก toast.success("...") หรือ toast.error("...") ได้เลย
          วางไว้ล่างจอเพราะบนจอมีแถบหัวเว็บอยู่ และล่างจออยู่ใกล้นิ้วโป้งกว่า */}
      <Toaster position="bottom-center" richColors />
    </LanguageProvider>
  );
}
