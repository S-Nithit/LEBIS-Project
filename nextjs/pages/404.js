// หน้าที่ขึ้นเมื่อ URL ไม่มีอยู่จริง
//
// ทำไมต้องเขียนเอง: หน้า 404 ที่ Next ให้มาเป็นภาษาอังกฤษล้วน ไม่มีโลโก้
// ไม่มีทางกลับ และไม่ได้บอกอะไรที่เจ้าของร้านเอาไปทำต่อได้
// คนที่มาถึงหน้านี้มักพิมพ์ URL ผิด หรือกดลิงก์เก่าที่ส่งกันใน LINE
// สิ่งที่เขาต้องการมีอย่างเดียวคือทางกลับเข้าระบบ

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";

export default function NotFound() {
  const { t } = useLanguage();

  // คนที่ล็อกอินอยู่แล้วพิมพ์ URL ผิด ไม่ควรถูกส่งกลับไปหน้าเข้าสู่ระบบ
  // เขาไม่ได้หลุดออกจากระบบ เขาแค่พิมพ์ผิด — ทางกลับของเขาคือหน้าบัญชี
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(Boolean(getToken())), []);

  return (
    <>
      <Head>
        <title>{t("page.notFound")}</title>
      </Head>

      <AuthLayout bare title={t("notFound.title")} description={t("notFound.body")}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href={signedIn ? "/account" : "/login"}>
              {signedIn ? t("notFound.goAccount") : t("notFound.goLogin")}
            </Link>
          </Button>
        </div>

        {/* ช่วยเหลืออยู่ห่างจากทุกหน้าหนึ่งก้าวเสมอ รวมถึงหน้าที่คนมาถึงเพราะพิมพ์ผิด */}
        <p className="t-caption mt-4">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-[44px] items-center underline underline-offset-4 hover:no-underline"
          >
            {t("nav.helpSignedIn")}
          </Link>
        </p>
      </AuthLayout>
    </>
  );
}
