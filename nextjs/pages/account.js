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
  // 🔴 เก็บร่างแยกรายช่อง ไม่ใช่ตัวเดียวใช้ร่วมกัน
  //    ปุ่มแก้ไขสองปุ่มห่างกัน 96px บนจอมือถือ กดพลาดง่ายมาก
  //    เดิมใช้ร่างตัวเดียว พอกดอีกแถว สิ่งที่พิมพ์ค้างไว้หายทันทีโดยไม่เตือนอะไรเลย
  const [drafts, setDrafts] = useState({});
  const draft = editing ? drafts[editing] ?? "" : "";
  const setDraft = (value) => setDrafts((current) => ({ ...current, [editing]: value }));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const slow = useSlowRequest(saving);
  const [fieldError, setFieldError] = useState(""); // ผิดที่ช่อง ไม่ใช่ผิดทั้งฟอร์ม
  // จำไว้ว่าการย้อนกลับครั้งล่าสุดคือย้อนอะไรเป็นอะไร ปุ่ม "ลองอีกครั้ง" จะได้ทำซ้ำได้
  const [lastUndo, setLastUndo] = useState(null);
  // ตัวหยุดคำขอที่ผู้ใช้กดเอง เหมือนหน้า login/register
  const abortRef = useRef(null);
  const editButtonRefs = useRef({});

  const FIELDS = {
    name: {
      label: t("account.name"),
      editLabel: t("account.editName"),
      empty: t("account.noName"),
      value: user?.name,
    },
    shop_name: {
      label: t("account.shop"),
      editLabel: t("account.editShop"),
      empty: t("account.noShop"),
      value: user?.shop_name,
    },
  };

  function startEditing(field) {
    setEditing(field);
    // ถ้าเคยพิมพ์ค้างไว้ที่ช่องนี้ ให้กลับมาเจอของเดิม ไม่ใช่เริ่มใหม่
    setDrafts((current) => ({
      ...current,
      [field]: current[field] ?? FIELDS[field].value ?? "",
    }));
    setSaveError("");
    setFieldError("");
  }

  function cancelEditing() {
    const field = editing;
    // ถ้ากำลังบันทึกอยู่ ต้องหยุดคำขอนั้นจริงๆ ไม่ใช่แค่ปิดฟอร์มแล้วปล่อยให้มันวิ่งต่อ
    abortRef.current?.abort();
    // ยกเลิกต้องทิ้งสิ่งที่พิมพ์ค้างไว้จริงๆ ไม่งั้นกดแก้ไขอีกครั้งจะเจอของเดิม
    setEditing(null);
    // กดยกเลิก = ตั้งใจทิ้งร่างของช่องนั้นจริงๆ (ต่างจากการไปกดอีกแถว ซึ่งไม่ได้ตั้งใจทิ้ง)
    setDrafts((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSaveError("");
    setFieldError("");
    // คืนโฟกัสให้ปุ่มที่กดเข้ามา ไม่งั้นโฟกัสจะตกไปที่ body
    // คนที่ใช้คีย์บอร์ดจะต้องไล่ Tab ใหม่ตั้งแต่ต้นหน้า
    requestAnimationFrame(() => editButtonRefs.current[field]?.focus());
  }

  // คืนค่าเดิมหลังบันทึกไปแล้ว
  //
  // ถ้าคืนค่าไม่สำเร็จ ต้องบอกด้วย ห้ามเงียบ เพราะผู้ใช้กดย้อนกลับแล้วจะเชื่อว่า
  // มันย้อนแล้ว ถ้าจริงๆ ไม่ได้ย้อน เขาจะเดินจากไปโดยที่ข้อมูลผิดค้างอยู่
  async function undoSave(field, previous) {
    setSaveError("");
    setLastUndo({ field, previous });
    setSaving(true);
    try {
      await apiFetch("/api/auth/me", { method: "PATCH", body: { [field]: previous } });
      applyUser({ [field]: previous });
      setLastUndo(null);
      toast.success(t("account.undone"));
      reload();
    } catch (error) {
      if (isDeadToken(error)) {
        logout();
        return;
      }
      setSaveError(errorMessage(error, t));
    } finally {
      setSaving(false);
    }
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
    abortRef.current = new AbortController();

    const value = draft.trim() === "" ? null : draft.trim();

    try {
      await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: { [editing]: value },
        // 🔴 หน้านี้เป็นหน้าเดียวที่เขียนลงฐานข้อมูล และเป็นหน้าเดียวที่เคยไม่มี
        //    ตัวยกเลิก ผลคือปุ่ม "ยกเลิก" ข้างปุ่มบันทึกเป็นปุ่มหลอก — กดแล้วแถว
        //    กลับไปเป็นค่าเดิมเหมือนยกเลิกสำเร็จ แต่คำขอยังวิ่งอยู่ อีก 3 วินาที
        //    ค่าใหม่จะเด้งกลับมาพร้อมข้อความว่าบันทึกสำเร็จ
        signal: abortRef.current.signal,
      });

      // 🔴 อัปเดตค่าที่แสดงอยู่ "ทันที" จากค่าที่เพิ่งส่งไปสำเร็จ
      //    ไม่ใช่รอให้ reload() ดึงมาใหม่แล้วค่อยเปลี่ยน
      //    เพราะถ้าการดึงรอบนั้นล้มเหลว (เน็ตสะดุดพอดี) หน้าจะขึ้นว่า
      //    "บันทึกเรียบร้อยแล้ว" ทั้งที่แถวยังเป็นชื่อเดิม และไม่มีกล่องแดงที่ไหนเลย
      //    เจ้าของร้านจะกดบันทึกซ้ำเพราะคิดว่าไม่ติด
      applyUser({ [editing]: value });

      // ให้ย้อนกลับได้ทันที ไม่ใช่แค่บอกว่าสำเร็จแล้วจบ
      //
      // เจ้าของร้านแก้ชื่อร้านผิด แล้วจำชื่อเดิมไม่ได้ว่าสะกดยังไง คือเรื่องที่เกิดจริง
      // ปุ่มนี้ทำให้ "กดผิด" ไม่ใช่เรื่องที่ต้องเสียเวลาแก้ ระบบจำค่าเดิมไว้ให้แล้ว
      const saved = editing;
      const previous = FIELDS[saved].value ?? null;
      const canUndo = previous !== value;
      // 🔴 ข้อความต้องบอกว่าบันทึก "อะไร" และแต่ละช่องต้องมี id ของตัวเอง
      //    เดิมทั้งสองช่องขึ้นข้อความเดียวกันเป๊ะว่า "บันทึกเรียบร้อยแล้ว / ย้อนกลับ"
      //    แก้ชื่อแล้วแก้ชื่อร้านต่อภายใน 10 วินาที จะมีปุ่มย้อนกลับสองใบพร้อมกัน
      //    หน้าตาเหมือนกันทุกอย่างแต่ย้อนคนละค่า ผู้ใช้ต้องจำเองว่าใบไหนของอะไร
      //    ซึ่งเป็นสิ่งที่ปุ่มนี้มีไว้เพื่อ "ไม่ต้องจำ" ตั้งแต่แรก
      toast.success(`${t("account.saved")} · ${FIELDS[saved].label}`, {
        id: `lebis-saved-${saved}`,
        // ข้อความที่มีปุ่มให้กด ต้องอยู่นานกว่าข้อความที่แค่บอกให้รู้
        // 4 วินาทีเป็นเวลาที่อ่านคำว่า "บันทึกแล้ว" ทัน แต่ไม่ทันคิดว่า "เอ๊ะ ผิดนี่"
        // แล้วมองหาปุ่มย้อนกลับ ซึ่งคือช่วงเวลาที่ปุ่มนี้มีไว้เพื่อ
        duration: canUndo ? 10000 : 4000,
        action: canUndo
          ? { label: t("action.undo"), onClick: () => undoSave(saved, previous) }
          : undefined,
      });
      setEditing(null);
      setDrafts((current) => {
        const next = { ...current };
        delete next[saved];
        return next;
      });
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
      // ผู้ใช้กดยกเลิกเอง ไม่ใช่ความผิดพลาด จึงไม่ขึ้นกล่องแดงพร้อมปุ่ม "ลองอีกครั้ง"
      // เขาเป็นคนสั่งเอง และฟอร์มก็ปิดไปแล้ว การขึ้นกล่องแดงจะอ่านเหมือนระบบพัง
      if (error?.code === "cancelled") return;
      // ขึ้นในหน้าเหมือนหน้าอื่นของระบบ ไม่ใช่ข้อความแจ้งเตือนที่หายเอง
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
    const { label, editLabel, empty, value } = FIELDS[field];
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
              /* ป้ายบอกว่าแก้ไข "อะไร" ทั้งบนจอและในเสียงที่โปรแกรมอ่านหน้าจออ่าน
                 เดิมทั้งสองปุ่มเขียนว่า "แก้ไข" เฉยๆ แล้วใส่ aria-label เพิ่มให้เฉพาะ
                 คนที่ใช้เสียง ซึ่งแปลว่าคนที่ "อ่าน" ยังต้องเดาอยู่ดีว่าปุ่มไหนของอะไร
                 ทางที่ถูกคือเขียนให้ชัดตั้งแต่บนจอ แล้วทุกคนได้ข้อมูลเท่ากัน */
              onClick={() => startEditing(field)}
            >
              {editLabel}
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

        {/* 🔴 ความล้มเหลวที่เกิด "ตอนไม่ได้อยู่ในโหมดแก้ไข" ต้องมีที่ให้วาดด้วย
               เคยพลาด: กดย้อนกลับแล้วคำขอล้มเหลว โค้ดเขียน setSaveError() ถูกแล้ว
               แต่กล่องที่วาด saveError อยู่ในฟอร์มของแถว ซึ่งถูกถอดออกไปตั้งแต่
               บันทึกสำเร็จ (editing = null) ผลคือข้อความถูกเขียนลงใน component
               ที่ไม่ได้อยู่บนหน้าจอ — ผู้ใช้กดย้อนกลับ แล้วไม่มีอะไรเกิดขึ้นเลย
               ไม่มีกล่อง ไม่มีข้อความ และค่าที่ผิดยังอยู่ทั้งบนจอและในฐานข้อมูล
               สคริปต์ตรวจจับไม่ได้ เพราะมันมองหาการเรียกข้อความแจ้งเตือนแบบผิดพลาด
               ส่วนโค้ดนี้ไม่ได้เรียกอะไรเลย มันแค่เขียนค่าลงที่ที่ไม่มีใครอ่าน */}
        {!editing && saveError ? (
          <div className="mb-5">
            <FormError
              message={saveError}
              onRetry={lastUndo ? () => undoSave(lastUndo.field, lastUndo.previous) : undefined}
              retrying={saving}
            />
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
