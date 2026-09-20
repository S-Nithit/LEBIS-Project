import Head from "next/head";
import { Toaster } from "sonner";

import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>LEBIS</title>
        <meta
          name="description"
          content="ระบบจัดการสต็อกและการยืม-คืนสำหรับร้านให้เช่าอุปกรณ์"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />

      {/* ที่อยู่ของข้อความแจ้งเตือน (toast) ทุกใบในเว็บ ต้องวางไว้ที่นี่ครั้งเดียว
          หน้าไหนอยากแจ้งเตือนก็  import { toast } from "sonner"
          แล้วเรียก toast.success("...") หรือ toast.error("...") ได้เลย */}
      <Toaster position="top-center" richColors />
    </>
  );
}
