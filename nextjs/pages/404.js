// หน้าที่ขึ้นเมื่อ URL ไม่มีอยู่จริง
//
// ทำไมต้องเขียนเอง: หน้า 404 ที่ Next ให้มาเป็นภาษาอังกฤษล้วน ไม่มีโลโก้
// ไม่มีทางกลับ และไม่ได้บอกอะไรที่เจ้าของร้านเอาไปทำต่อได้
// คนที่มาถึงหน้านี้มักพิมพ์ URL ผิด หรือกดลิงก์เก่าที่ส่งกันใน LINE
// สิ่งที่เขาต้องการมีอย่างเดียวคือทางกลับเข้าระบบ

import Head from "next/head";
import Link from "next/link";

import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/useLanguage";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <>
      <Head>
        <title>{t("page.notFound")}</title>
      </Head>

      <AuthLayout bare title={t("notFound.title")} description={t("notFound.body")}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/login">{t("notFound.goLogin")}</Link>
          </Button>
        </div>
      </AuthLayout>
    </>
  );
}
