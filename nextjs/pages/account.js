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
import { LanguageToggle } from "@/components/LanguageToggle";
import { apiFetch, errorMessage, fieldToInputId } from "@/lib/api";
import { isDeadToken, useAuth } from "@/lib/useAuth";
import { planFor } from "@/lib/plan";
import { useLanguage } from "@/lib/useLanguage";
import { useSlowRequest } from "@/lib/useSlowRequest";

// หนึ่งบรรทัดข้อมูล: ป้ายซ้าย ค่าขวา
//
// 🔴 บนจอคอมห้ามใช้ justify-between ลอยๆ เพราะป้ายกับค่าจะถูกดันไปคนละฝั่งของจอ
//    ห่างกันเป็นพันพิกเซลจนสายตาจับคู่กันไม่ติด ใช้ grid กำหนดคอลัมน์ป้ายไว้ตายตัวแทน
//
// hideLabel ใช้ตอนข้างในเป็นฟอร์มที่มี <label> ของตัวเองอยู่แล้ว
// ไม่งั้นคำว่า "ชื่อร้าน" จะขึ้นสองครั้งติดกัน และโปรแกรมอ่านหน้าจอจะอ่านซ้ำสองรอบ
function Row({ label, value, children, hideLabel = false }) {
  return (
    // 🔴 ต้องมี minmax(0,1fr) ที่ "จอมือถือ" ด้วย ไม่ใช่เฉพาะ sm: ขึ้นไป
    //    ของเดิมมีเฉพาะฝั่งจอคอม ส่วนจอมือถือปล่อยให้คอลัมน์เป็น auto
    //    ซึ่งจะขยายตามคำที่ตัดบรรทัดไม่ได้ เช่นอีเมลยาวๆ ที่ไม่มีขีดกลาง
    //    วัดที่ 390px: อีเมล 53 ตัวอักษร ทำให้ทั้งหน้าเลื่อนซ้ายขวาได้ 81px
    //    break-words ช่วยไม่ได้ เพราะกล่องไม่เคยแคบพอให้มันทำงาน
    //    รอดมา 13 รอบเพราะทุกการทดสอบล็อกอินด้วย demo@example.com ซึ่งยาว 16 ตัว
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 border-b border-line py-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center sm:gap-4">
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
  const { user, loading, loadError, reload, logout, applyUser } = useAuth({ redirectTo: "/login" });
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
  const slow = useSlowRequest(saving);
  const [fieldError, setFieldError] = useState(""); // ผิดที่ช่อง ไม่ใช่ผิดทั้งฟอร์ม
  const editButtonRefs = useRef({});

  const FIELDS = {
    name: { label: t("account.name"), empty: t("account.noName"), value: user?.name },
    shop_name: { label: t("account.shop"), empty: t("account.noShop"), value: user?.shop_name },
  };

  function startEditing(field) {
    setEditing(field);
    setDraft(FIELDS[field].value || "");
    setSaveError("");
    setFieldError("");
  }

  function cancelEditing() {
    const field = editing;
    // ยกเลิกต้องทิ้งสิ่งที่พิมพ์ค้างไว้จริงๆ ไม่งั้นกดแก้ไขอีกครั้งจะเจอของเดิม
    setEditing(null);
    setDraft("");
    setSaveError("");
    setFieldError("");
    // คืนโฟกัสให้ปุ่มที่กดเข้ามา ไม่งั้นโฟกัสจะตกไปที่ body
    // คนที่ใช้คีย์บอร์ดจะต้องไล่ Tab ใหม่ตั้งแต่ต้นหน้า
    requestAnimationFrame(() => editButtonRefs.current[field]?.focus());
  }

  async function handleSave(event) {
    event?.preventDefault();
    if (!editing) return;

    // ตรวจก่อนส่งเหมือนหน้า login กับ register
    // ชื่อผู้ใช้งานเป็นช่องบังคับตอนสมัคร (register.js) ถ้าหน้านี้ปล่อยให้ลบทิ้งได้
    // ระบบจะมีบัญชีที่ไม่มีชื่อ ทั้งที่กฎบอกว่าต้องมี — กฎเดียวกันต้องบังคับทุกทาง
    if (editing === "name" && draft.trim() === "") {
      setFieldError(t("validate.nameRequired"));
      document.getElementById(fieldToInputId(editing))?.focus();
      return;
    }

    setSaving(true);
    setSaveError("");
    setFieldError("");

    const value = draft.trim() === "" ? null : draft.trim();

    try {
      await apiFetch("/api/auth/me", { method: "PATCH", body: { [editing]: value } });

      // 🔴 อัปเดตค่าที่แสดงอยู่ "ทันที" จากค่าที่เพิ่งส่งไปสำเร็จ
      //    ไม่ใช่รอให้ reload() ดึงมาใหม่แล้วค่อยเปลี่ยน
      //    เพราะถ้าการดึงรอบนั้นล้มเหลว (เน็ตสะดุดพอดี) หน้าจะขึ้นว่า
      //    "บันทึกเรียบร้อยแล้ว" ทั้งที่แถวยังเป็นชื่อเดิม และไม่มีกล่องแดงที่ไหนเลย
      //    เจ้าของร้านจะกดบันทึกซ้ำเพราะคิดว่าไม่ติด
      applyUser({ [editing]: value });

      toast.success(t("account.saved"));
      const saved = editing;
      setEditing(null);
      // คืนโฟกัสให้ปุ่มแก้ไขของแถวที่เพิ่งบันทึก เหมือนตอนกดยกเลิก
      requestAnimationFrame(() => editButtonRefs.current[saved]?.focus());
      reload(); // ดึงข้อมูลใหม่ ชื่อบนแถบหัวเว็บจะได้เปลี่ยนตาม
    } catch (error) {
      // 🔴 token หมดอายุระหว่างเปิดหน้าค้างไว้ ต้องพาออกไปหน้าเข้าสู่ระบบจริงๆ
      //    ไม่ใช่ขึ้นกล่องแดงแล้วให้กด "ลองอีกครั้ง" ซึ่งส่ง token ใบที่ตายแล้ว
      //    ซ้ำไปเรื่อยๆ ไม่มีวันสำเร็จ และทางออกที่ใช้ได้จริงกลับเขียนว่า "ออกจากระบบ"
      //    ทั้งที่ระบบพาเขาออกไปแล้ว
      if (isDeadToken(error)) {
        logout();
        return;
      }
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
          <form
            onSubmit={handleSave}
            // Esc = ยกเลิก เป็นสิ่งที่คนคาดหวังจากช่องแก้ไขในทุกโปรแกรม
            // ถ้าไม่มี ทางออกเดียวด้วยคีย์บอร์ดคือไล่ Tab ไปหาปุ่มยกเลิก
            onKeyDown={(event) => {
              if (event.key === "Escape") cancelEditing();
            }}
            className="flex w-full flex-wrap items-end gap-3"
          >
            {/* ใช้ FormField เสมอ ไม่ใช้ <Input> เปล่าๆ
                เพราะ FormField เป็นตัวที่รับประกันว่ามี <label> ผูกกับช่องจริง
                placeholder ไม่ใช่ป้ายกำกับ และมันหายไปทันทีที่พิมพ์ตัวแรก */}
            <FormField
              id={fieldToInputId(field)}
              label={label}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              error={fieldError}
              // ล้างทั้งข้อความระดับช่องและระดับฟอร์ม เหมือนหน้า login กับ register
              // ถ้าล้างแค่ระดับช่อง กล่องแดง "เชื่อมต่อไม่ได้" จะค้างอยู่ตลอดเวลา
              // ที่เจ้าของร้านกำลังพิมพ์แก้ ซึ่งอ่านเหมือนระบบยังพังทั้งที่เขาแก้อยู่แล้ว
              onClearError={() => {
                setFieldError("");
                setSaveError("");
              }}
              maxLength={120}
              autoComplete={field === "name" ? "name" : "organization"}
              className="w-full sm:w-64"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={saving} aria-busy={saving}>
              {saving ? t("account.saving") : t("account.save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancelEditing}>
              {t("account.cancel")}
            </Button>

            {/* 🔴 กล่องผิดพลาดอยู่ในฟอร์มของแถวนี้ ไม่ใช่ท้ายการ์ด
                   เคยวาดไว้ท้ายการ์ดใบเดียว ผลคือแก้แถว "ชื่อผู้ใช้งาน" แล้วพัง
                   กล่องแดงไปโผล่ห่างจากปุ่มบันทึก 110px คนละฝั่งของแถว "ชื่อร้าน"
                   ผู้ใช้จะไปไล่ดูแถวที่ไม่ได้แตะเลยว่าผิดตรงไหน
                   (docs/brand.md หัวข้อ 6 · คอมเมนต์หัวไฟล์ FormError.js) */}
            {slow ? (
              <p role="status" className="t-caption w-full">
                {t("state.slow")}
              </p>
            ) : null}

            {saveError ? (
              <div className="w-full">
                <FormError message={saveError} onRetry={handleSave} retrying={saving} />
              </div>
            ) : null}
          </form>
        ) : (
          <span className="flex flex-wrap items-center gap-3">
            <span className="t-body break-words font-medium">{value || empty}</span>
            <Button
              ref={(node) => { editButtonRefs.current[field] = node; }}
              size="sm"
              variant="secondary"
              /* ป้ายที่เห็นคือ "แก้ไข" สั้นๆ เพราะมันอยู่ติดกับค่าอยู่แล้ว
                 แต่ชื่อที่โปรแกรมอ่านหน้าจออ่าน ต้องบอกว่าแก้ไขอะไร
                 ไม่งั้นคนที่ไล่ฟังทีละปุ่มจะได้ยินว่า "แก้ไข, แก้ไข" แล้วต้องเดาเอง */
              aria-label={`${t("account.edit")} ${label}`}
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
        {/* หน้านี้เป็นรายการข้อมูลบัญชี ไม่ใช่หน้าที่มีงานหลักหนึ่งงาน
            การกระทำของมันคือ "แก้ไขแถวนี้" ซึ่งอยู่ในแถวนั้นๆ อยู่แล้ว
            🔴 เคยใส่ปุ่มหลักไว้ที่หัวข้อด้วย แล้วกลายเป็นปุ่มสองปุ่มคนละน้ำหนัก
               คนละคำ ที่ทำสิ่งเดียวกัน ห่างกัน 220px ผู้ใช้ต้องมานั่งเดาว่าต่างกันยังไง
               (ดู docs/brand.md หัวข้อ 5 ฉบับแก้ไข 21 ก.ย. 2569) */}
        <PageHeader title={t("account.title")} description={t("account.subtitle")} />

        {/* 🔴 loadError ตอน "โหลดซ้ำ" ต้องเห็นด้วย ไม่ใช่เห็นเฉพาะตอนยังไม่มีข้อมูลเลย
               เดิมกล่องนี้ถูกวาดเฉพาะตอน !user ซึ่งแปลว่าถ้ามีข้อมูลเก่าค้างอยู่
               แล้วดึงใหม่ไม่สำเร็จ หน้าจะเงียบสนิทและโชว์ของเก่าเหมือนไม่มีอะไรเกิดขึ้น */}
        {loadError ? (
          <div className="mb-5">
            <FormError message={errorMessage(loadError, t)} onRetry={reload} retrying={loading} />
          </div>
        ) : null}

        {/* หน้านี้มีเนื้อหาไม่กี่บรรทัด ถ้าปล่อยให้การ์ดกว้างเต็ม 1100px
            บนจอคอม จะเหลือพื้นที่ว่างเป็นบริเวณกว้างจนดูเหมือนหน้ายังโหลดไม่เสร็จ
            จำกัดความกว้างให้พอดีกับเนื้อหาจริง */}
        <div className="flex max-w-3xl flex-col gap-5">
          <Card>
            <CardContent className="p-5">
              <Row label={t("account.email")} value={user.email} />
              {editableRow("name")}
              {editableRow("shop_name")}

              {/* ภาษาเป็นค่าที่ตั้งครั้งเดียวต่อบัญชี ไม่ใช่การกระทำที่ทำซ้ำทุกหน้า
                  เดิมอยู่บนแถบหัวเว็บของทุกหน้าที่เข้าสู่ระบบแล้ว ซึ่งทำให้ปุ่มที่
                  แทบไม่มีใครกดเป็นของที่เด่นที่สุดในหน้า และทุกหน้าที่เพื่อนจะเขียน
                  ต่อจากนี้ก็จะได้มันติดมาด้วย ที่นี่คือที่ของค่าประจำบัญชี */}
              <Row label={t("nav.language")}>
                {/* justify-self-start ไม่งั้นช่องของ grid จะยืดกล่องของปุ่มสลับภาษา
                    ออกไปเต็มคอลัมน์ กลายเป็นกรอบยาว 500px ที่มีปุ่มเล็กสองปุ่มอยู่ซ้ายสุด */}
                <LanguageToggle className="justify-self-start" />
              </Row>
            </CardContent>
          </Card>

          {/* ส่วนอุปกรณ์ยังไม่เปิด — บอกเป็นบรรทัดเดียว ไม่ใช่กล่องใหญ่ที่สุดในหน้า
              กล่องว่างมีไว้สำหรับ "รายการที่ยังไม่มีข้อมูล" (brand.md หัวข้อ 5)
              ไม่ใช่สำหรับขอโทษที่ฟีเจอร์ยังไม่เสร็จ
              🔴 ต้องอยู่ "ก่อน" การ์ดแพ็กเกจ ไม่ใช่หลัง เพราะการ์ดแพ็กเกจสัญญาว่า
                 บันทึกอุปกรณ์ได้ไม่จำกัด การอ่านคำสัญญานั้นก่อนแล้วค่อยมาเจอว่า
                 ส่วนอุปกรณ์ยังไม่เสร็จ ทำให้คำสัญญาอ่านเหมือนคำโกหก */}
          <p className="t-caption">{t("account.buildNote")}</p>

          {/* อธิบายว่าแพ็กเกจที่ใช้อยู่ให้อะไรบ้าง — ป้ายชื่อแพ็กเกจอยู่บนแถบหัวเว็บ
              อยู่แล้ว ตรงนี้จึงไม่ซ้ำป้ายอีก แต่บอกว่ามันแปลว่าอะไร */}
          <Card>
            <CardContent className="p-5">
              <h2 className="t-section">{t("account.planTitle")}</h2>
              <p className="t-caption mt-2">
                {t(planFor(user.role, t).copyKey)}
              </p>
            </CardContent>
          </Card>

        </div>
      </AppShell>
    </>
  );
}
