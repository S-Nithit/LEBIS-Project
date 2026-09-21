// 📄 หน้าแม่แบบ — ก็อปทั้งไฟล์นี้ไปเริ่มหน้าใหม่ของคุณ
//
// ทำไมแม่แบบถึงเป็น "ไฟล์" ไม่ใช่ "ก้อนโค้ดในเอกสาร"
//   ก้อนโค้ดในไฟล์ .md ไม่มีใครตรวจให้ว่ามันรันได้จริงหรือเปล่า เคยพลาดมาแล้ว
//   สองรอบ: รอบแรกลืม import รอบสองใช้ตัวแปรที่ไม่ได้ประกาศ ทั้งสองครั้งกว่าจะรู้
//   คือตอนเพื่อนก็อปไปใช้แล้วเจอจอขาว
//   ไฟล์นี้ถูก build ทุกครั้งที่ build โปรเจกต์ และเปิดดูได้จริงที่ /template
//   ถ้ามันพัง จะพังตั้งแต่ตอน build ไม่ใช่ตอนเพื่อนเอาไปใช้
//
// 🔒 เปิดได้เฉพาะตอน dev — ตอน deploy จริงหน้านี้จะเป็น 404
//    (ดู getServerSideProps ท้ายไฟล์) เพราะมันเป็นของสำหรับคนทำงาน ไม่ใช่ของลูกค้า
//
// วิธีใช้: ก็อปไฟล์นี้เป็น pages/ชื่อหน้าของคุณ.js แล้วแก้ 3 จุด
//   1. เปลี่ยน template.* เป็นคีย์ข้อความของหน้าคุณใน lib/i18n.js (ใส่ครบทั้ง th และ en)
//   2. เปลี่ยน loadItems() ให้ยิง API ของจริงด้วย apiFetch
//   3. ใส่เนื้อหาจริงแทน <CardContent>

import { useCallback, useEffect, useState } from "react";
import Head from "next/head";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { FormError } from "@/components/FormError";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useLanguage } from "@/lib/useLanguage";

export default function Template() {
  // loadError = ติดต่อเซิร์ฟเวอร์ไม่ได้ (token ยังใช้ได้) · reload = ลองใหม่
  const { user, loading, loadError, reload, logout } = useAuth({ redirectTo: "/login" });
  const { t } = useLanguage();

  // ข้อมูลของหน้ามี 3 ตัวเสมอ: ตัวข้อมูล · กำลังโหลดอยู่ไหม · โหลดพลาดหรือเปล่า
  // ขาดตัวใดตัวหนึ่ง หน้าจะมีสถานะที่วาดไม่ได้
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState("");

  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    setItemsError("");
    try {
      // ของจริงเปลี่ยนบรรทัดนี้เป็น  const data = await apiFetch("/api/items");
      const data = [];
      setItems(data);
    } catch (error) {
      setItemsError(errorMessage(error, t));
    } finally {
      setItemsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) loadItems();
  }, [user, loadItems]);

  // ---- สถานะที่ 1 · กำลังโหลดครั้งแรก
  // เช็ก `&& !user` ด้วย ไม่งั้นหน้าจะวูบเป็นจอว่างทุกครั้งที่โหลดซ้ำ
  if (loading && !user) {
    return (
      <AppShell>
        <LoadingState rows={3} />
      </AppShell>
    );
  }

  // ---- สถานะที่ 2 · ยังไม่ได้เข้าสู่ระบบ (useAuth พาไปหน้า login ให้แล้ว)
  // วาดอะไรตรงนี้ไม่ได้ ไม่งั้นคนที่แค่ยังไม่ได้ล็อกอินจะเจอกล่องแดงว่าผิดพลาด
  if (!user && !loadError) return null;

  // ---- สถานะที่ 3 · โหลดไม่สำเร็จเพราะเน็ตหรือเซิร์ฟเวอร์ ต้องมีทางให้ลองใหม่
  if (!user) {
    return (
      <AppShell onLogout={logout}>
        <PageHeader title={t("template.title")} />
        <FormError message={errorMessage(loadError, t)} onRetry={reload} retrying={loading} />
      </AppShell>
    );
  }

  // ---- สถานะที่ 4 · มีผู้ใช้แล้ว
  return (
    <>
      <Head>
        <title>{t("template.title")}</title>
      </Head>

      <AppShell user={user} onLogout={logout}>
        <PageHeader
          title={t("template.title")}
          description={t("template.subtitle")}
          action={<Button>{t("template.addItem")}</Button>}
        />

        {/* ข้อมูลในหน้าก็มีสถานะของมันเองอีกชุด: กำลังโหลด / พลาด / ว่าง / มี */}
        {itemsLoading ? (
          <LoadingState rows={4} />
        ) : itemsError ? (
          <FormError message={itemsError} onRetry={loadItems} retrying={itemsLoading} />
        ) : items.length === 0 ? (
          <EmptyState
            title={t("template.emptyTitle")}
            description={t("template.emptyBody")}
            action={<Button variant="secondary">{t("template.addItem")}</Button>}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("template.listTitle")}</CardTitle>
            </CardHeader>
            <CardContent>{/* ตารางของคุณ */}</CardContent>
          </Card>
        )}
      </AppShell>
    </>
  );
}

// หน้านี้มีไว้ให้คนในทีมดู ไม่ใช่ลูกค้า — บนเครื่องจริงจึงตอบ 404
// เขียนแบบนี้แทนการลบไฟล์ทิ้ง เพราะไฟล์ที่ไม่ถูก build คือไฟล์ที่ไม่มีใครตรวจ
export async function getServerSideProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true };
  return { props: {} };
}
