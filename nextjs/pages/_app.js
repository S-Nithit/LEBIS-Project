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
      <Toaster position="bottom-center" richColors />
    </LanguageProvider>
  );
}
