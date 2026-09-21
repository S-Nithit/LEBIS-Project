// หน้าที่ผู้ใช้มาถึงหลังเข้าสู่ระบบสำเร็จ
//
// มีไว้เพื่อสองอย่าง
//   1. ไม่ให้เจ้าของร้านที่เพิ่งสมัครเสร็จตกไปอยู่หน้าตัวอย่างของ boilerplate
//   2. เป็นตัวอย่างการใช้ AppShell + PageHeader + Card + FormField จริงๆ
//      ให้เพื่อนดูก่อนจะไปเขียนหน้าของตัวเอง
//
// เมื่อหน้า workspace ของ Neo เสร็จแล้ว ให้เปลี่ยนปลายทางหลัง login
// ใน pages/login.js กับ pages/register.js ไปที่หน้านั้นแทน

import { useRef, useState } from "react";
import Head from "next/head";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState } from "@/components/LoadingState";
import { FormError } from "@/components/FormError";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/FormField";
import { apiFetch, errorMessage, fieldToInputId } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useLanguage } from "@/lib/useLanguage";

// หนึ่งบรรทัดข้อมูล: ป้ายซ้าย ค่าขวา
//
// 🔴 บนจอคอมห้ามใช้ justify-between ลอยๆ เพราะป้ายกับค่าจะถูกดันไปคนละฝั่งของจอ
//    ห่างกันเป็นพันพิกเซลจนสายตาจับคู่กันไม่ติด ใช้ grid กำหนดคอลัมน์ป้ายไว้ตายตัวแทน
//
// hideLabel ใช้ตอนข้างในเป็นฟอร์มที่มี <label> ของตัวเองอยู่แล้ว
// ไม่งั้นคำว่า "ชื่อร้าน" จะขึ้นสองครั้งติดกัน และโปรแกรมอ่านหน้าจอจะอ่านซ้ำสองรอบ
function Row({ label, value, children, hideLabel = false }) {
  return (
    <div className="grid gap-2 border-b border-line py-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center sm:gap-4">
      {hideLabel ? (
        <span className="hidden sm:block" aria-hidden="true" />
      ) : (
        <span className="t-caption">{label}</span>
      )}
      {children || <span className="t-body break-words font-medium">{value}</span>}
    </div>
  );
}

export default function Account() {
  const { user, loading, loadError, reload, logout } = useAuth({ redirectTo: "/login" });
  const { t } = useLanguage();

  // แก้ชื่อผู้ใช้งานกับชื่อร้านได้จากหน้านี้ — สองอย่างนี้กรอกตอนสมัครแล้วไม่มีที่ไหน
  // ให้กลับมาแก้เลย (หน้าตั้งค่าเป็นงานของ Sea ยังไม่เสร็จ) ทั้งที่ backend รับแก้
  // ได้อยู่แล้วที่ PATCH /api/auth/me
  //
  // ใช้ตัวแก้ตัวเดียวสลับว่ากำลังแก้ช่องไหน (editing = ชื่อ field หรือ null)
  // ถ้าทำแยกกันสองชุด โค้ดจะซ้ำกันสองเท่าและมีโอกาสแก้ที่เดียวลืมอีกที่
  const [editing, setEditing] = useState(null); // null | "name" | "shop_name"
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const editButtonRef = useRef(null);

  const FIELDS = {
    name: { label: t("account.name"), empty: t("account.noName"), value: user?.name },
    shop_name: { label: t("account.shop"), empty: t("account.noShop"), value: user?.shop_name },
  };

  function startEditing(field) {
    setEditing(field);
    setDraft(FIELDS[field].value || "");
    setSaveError("");
  }

  function cancelEditing() {
    // ยกเลิกต้องทิ้งสิ่งที่พิมพ์ค้างไว้จริงๆ ไม่งั้นกดแก้ไขอีกครั้งจะเจอของเดิม
    setEditing(null);
    setDraft("");
    setSaveError("");
    // คืนโฟกัสให้ปุ่มที่กดเข้ามา ไม่งั้นโฟกัสจะตกไปที่ body
    // คนที่ใช้คีย์บอร์ดจะต้องไล่ Tab ใหม่ตั้งแต่ต้นหน้า
    requestAnimationFrame(() => editButtonRef.current?.focus());
  }

  async function handleSave(event) {
    event?.preventDefault();
    if (!editing) return;
    setSaving(true);
    setSaveError("");

    const value = draft.trim() === "" ? null : draft.trim();

    try {
      await apiFetch("/api/auth/me", { method: "PATCH", body: { [editing]: value } });

      toast.success(t("account.saved"));
      setEditing(null);
      reload(); // ดึงข้อมูลใหม่ ชื่อบนแถบหัวเว็บจะได้เปลี่ยนตาม
    } catch (error) {
      // ขึ้นในหน้าเหมือนหน้าอื่นของระบบ ไม่ใช่ toast ที่หายเอง
      setSaveError(errorMessage(error, t));
    } finally {
      setSaving(false);
    }
  }

  // ระหว่างรอข้อมูล "ครั้งแรก" เท่านั้นที่วาดโครงรอ
  // ถ้ามีข้อมูลอยู่แล้ว (เช่นกดบันทึกแล้วโหลดใหม่) ให้คงหน้าเดิมไว้
  // ไม่งั้นหน้าจะวูบเป็นหน้าว่างทุกครั้งที่บันทึก
  if (loading && !user) {
    return (
      <AppShell>
        <LoadingState rows={3} />
      </AppShell>
    );
  }

  // ยังไม่ได้เข้าสู่ระบบ — useAuth กำลังพาไปหน้า login อยู่แล้ว
  // ตรงนี้ไม่ต้องวาดอะไรเลย ไม่งั้นจะขึ้นกล่องแดงว่า "เกิดข้อผิดพลาด"
  // ให้คนที่แค่ยังไม่ได้ล็อกอิน ซึ่งเขาไม่ได้ทำอะไรผิด
  if (!user && !loadError) return null;

  // 🔴 โหลดข้อมูลไม่สำเร็จเพราะเน็ตหรือเซิร์ฟเวอร์ (token ยังใช้ได้อยู่)
  //    ต้องบอกให้รู้และให้ทางไปต่อ ห้ามปล่อยให้หมุนค้างเป็น "กำลังโหลด..."
  //    เพราะหน้าจอจะโกหกว่ากำลังทำงานอยู่ทั้งที่เลิกพยายามไปแล้ว
  if (!user) {
    return (
      <AppShell onLogout={logout}>
        <PageHeader title={t("account.title")} />
        <FormError message={errorMessage(loadError, t)} onRetry={reload} retrying={loading} />
      </AppShell>
    );
  }

  // แถวข้อมูลหนึ่งแถว สลับระหว่าง "แสดงค่า" กับ "กำลังแก้"
  //
  // 🔴 เรียกเป็นฟังก์ชัน {editableRow("name")} ไม่ใช่ <EditableRow field="name" />
  //    component ที่ประกาศข้างใน component อื่น จะถูกนับเป็นชนิดใหม่ทุกครั้งที่วาดใหม่
  //    React จะถอดของเก่าทิ้งแล้วสร้างใหม่ทั้งก้อน = โฟกัสหลุดทุกตัวอักษรที่พิมพ์
  function editableRow(field) {
    const { label, empty, value } = FIELDS[field];
    const isEditing = editing === field;

    return (
      <Row label={label} hideLabel={isEditing}>
        {isEditing ? (
          <form onSubmit={handleSave} className="flex w-full flex-wrap items-end gap-3">
            {/* ใช้ FormField เสมอ ไม่ใช้ <Input> เปล่าๆ
                เพราะ FormField เป็นตัวที่รับประกันว่ามี <label> ผูกกับช่องจริง
                placeholder ไม่ใช่ป้ายกำกับ และมันหายไปทันทีที่พิมพ์ตัวแรก */}
            <FormField
              id={fieldToInputId(field)}
              label={label}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={120}
              className="w-full sm:w-64"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? t("account.saving") : t("account.save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancelEditing}>
              {t("account.cancel")}
            </Button>
          </form>
        ) : (
          <span className="flex flex-wrap items-center gap-3">
            <span className="t-body break-words font-medium">{value || empty}</span>
            <Button
              ref={editing === null ? editButtonRef : null}
              size="sm"
              variant="secondary"
              onClick={() => startEditing(field)}
            >
              {t("account.edit")}
            </Button>
          </span>
        )}
      </Row>
    );
  }

  return (
    <>
      <Head>
        <title>{t("page.account")}</title>
      </Head>

      <AppShell user={user} onLogout={logout}>
        {/* ปุ่มหลักของหน้าอยู่ที่หัวข้อ — หน้าหนึ่งหน้าต้องมีปุ่มหลักเสมอ
            ไม่งั้นผู้ใช้ที่เพิ่งสมัครเสร็จจะไม่รู้ว่าควรทำอะไรต่อ
            สิ่งเดียวที่ทำได้จริงตอนนี้คือตั้งชื่อร้าน ปุ่มหลักจึงเป็นอันนั้น */}
        <PageHeader
          title={t("account.title")}
          description={t("account.subtitle")}
          action={
            editing === null ? (
              <Button onClick={() => startEditing("shop_name")}>
                {user.shop_name ? t("account.editShopName") : t("account.setShopName")}
              </Button>
            ) : null
          }
        />

        <div className="flex flex-col gap-5">
          <Card>
            <CardContent className="p-5">
              <Row label={t("account.email")} value={user.email} />
              {editableRow("name")}
              {editableRow("shop_name")}
              {saveError ? (
                <FormError message={saveError} onRetry={handleSave} retrying={saving} />
              ) : null}
            </CardContent>
          </Card>

          {/* อธิบายว่าแพ็กเกจที่ใช้อยู่ให้อะไรบ้าง — ป้ายชื่อแพ็กเกจอยู่บนแถบหัวเว็บ
              อยู่แล้ว ตรงนี้จึงไม่ซ้ำป้ายอีก แต่บอกว่ามันแปลว่าอะไร */}
          <Card>
            <CardContent className="p-5">
              <h2 className="t-section">{t("account.planTitle")}</h2>
              <p className="t-caption mt-2">
                {user.role === "free" ? t("account.planFree") : t("account.planPro")}
              </p>
            </CardContent>
          </Card>

          {/* ส่วนอุปกรณ์ยังไม่เปิด — บอกเป็นบรรทัดเดียว ไม่ใช่กล่องใหญ่ที่สุดในหน้า
              กล่องว่างมีไว้สำหรับ "รายการที่ยังไม่มีข้อมูล" (brand.md หัวข้อ 5)
              ไม่ใช่สำหรับขอโทษที่ฟีเจอร์ยังไม่เสร็จ ถ้าใช้ผิดที่ สิ่งที่ใหญ่ที่สุด
              ในหน้าแรกหลังสมัครจะกลายเป็นคำขอโทษ */}
          <p className="t-caption">{t("account.buildNote")}</p>
        </div>
      </AppShell>
    </>
  );
}
