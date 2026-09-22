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
import { StatusBadge } from "@/components/StatusBadge";
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
  // 🔴 "กำลังบันทึก" ต้องรู้ว่าช่องไหนกำลังบันทึก เหมือนที่ saveError รู้
  //    เดิมเป็น boolean ระดับหน้า ผลคือ: บันทึกชื่อร้านบนเน็ตช้า แล้วกดแก้ไขชื่อ
  //    ระหว่างรอ ปุ่มบันทึกของแถว "ชื่อ" จะกดไม่ได้และเขียนว่า "กำลังบันทึก..."
  //    เพราะคำขอของอีกแถวหนึ่ง และไม่มีข้อความไหนบนจอบอกว่าเกิดอะไรขึ้น
  //    อาการนี้แย่กว่าข้อความไปผิดแถว เพราะมันบล็อกไม่ให้พิมพ์ต่อด้วย
  const [savingField, setSavingField] = useState(null); // null | ชื่อช่อง | "undo"
  const saving = savingField !== null;
  // แยกให้ออกว่าคำขอที่ค้างอยู่คือการบันทึกหรือการย้อนกลับ ข้อความคนละอัน
  const [undoing, setUndoing] = useState(false);
  // 🔴 ต้องจำว่าข้อความนี้เป็นของช่องไหน และตอนนั้นกำลังจะบันทึกค่าอะไร
  //    เดิมเก็บแค่ข้อความ แล้ว onRetry ผูกกับ handleSave ซึ่งอ่าน editing "ปัจจุบัน"
  //    ผลคือ: บันทึกชื่อร้านบนเน็ตช้า ระหว่างรอไปกดแก้ไขชื่อ พอคำขอเก่าล้มเหลว
  //    กล่องแดงไปโผล่ในฟอร์มของ "ชื่อผู้ใช้งาน" แล้วปุ่มลองใหม่ส่ง name ไปแทน
  //    เจ้าของร้านได้ข้อความว่าสำเร็จ ส่วนชื่อร้านที่เขาแก้หายไปโดยไม่มีร่องรอย
  //    เป็นข้อเดียวกับที่เพิ่งแก้ให้เส้นทางสำเร็จ แต่ไม่ได้แก้ให้เส้นทางล้มเหลว
  const [saveError, setSaveError] = useState(null); // { field, message, retry }
  const slow = useSlowRequest(saving);
  const [fieldError, setFieldError] = useState(""); // ผิดที่ช่อง ไม่ใช่ผิดทั้งฟอร์ม
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
    setSaveError(null);
    setFieldError("");
  }

  function cancelEditing() {
    const field = editing;
    // ถ้ากำลังบันทึกอยู่ ต้องหยุดคำขอนั้นจริงๆ ไม่ใช่แค่ปิดฟอร์มแล้วปล่อยให้มันวิ่งต่อ
    abortRef.current?.abort();

    // 🔴 ถ้าการบันทึกของช่องนี้ "เพิ่งล้มเหลว" ห้ามลบร่างกับกล่องผิดพลาดทิ้ง
    //    วัดจริง: บันทึกไม่สำเร็จ -> กด Esc -> กล่องหาย ค่าที่พิมพ์หาย แถวโชว์ค่าเก่า
    //    และไม่มีอะไรบอกว่าการบันทึกไม่เคยสำเร็จ ผู้ใช้เดินจากไปโดยเชื่อว่าเรียบร้อย
    //    brand.md หัวข้อ 6 เขียนว่าความล้มเหลวต้องอยู่จนกว่าผู้ใช้จะแก้
    //    การกด Esc ไม่ใช่การแก้ — มันคือการปิดฟอร์ม
    const failedHere = saveError?.field === field;

    setEditing(null);
    if (!failedHere) {
      // กดยกเลิกตามปกติ = ตั้งใจทิ้งร่างของช่องนั้นจริงๆ
      setDrafts((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
      setSaveError(null);
    }
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
    setSaveError(null);
    setSavingField(field);
    setUndoing(true);
    // 🔴 การย้อนกลับเคยเป็นคำขอเดียวในระบบที่ไม่มีทางออก
    //    ทั้งหน้า login หน้าสมัคร และการบันทึก มีปุ่มยกเลิกให้หลัง 6 วินาที
    //    ส่วนการย้อนกลับรอได้ถึง 15 วินาทีโดยไม่มีอะไรให้กด — ในจังหวะที่เจ้าของร้าน
    //    เพิ่งรู้ตัวว่าบันทึกผิด และข้อความที่มีปุ่มย้อนกลับก็หายไปแล้ว
    abortRef.current = new AbortController();
    try {
      await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: { [field]: previous },
        signal: abortRef.current.signal,
      });
      applyUser({ [field]: previous });
      toast.success(t("account.undone"));
      reload();
    } catch (error) {
      if (isDeadToken(error)) {
        logout();
        return;
      }
      if (error?.code === "cancelled") return;
      // ผูกปุ่มลองใหม่กับ "การย้อนครั้งนี้" ไม่ใช่กับช่องที่เปิดอยู่ตอนนั้น
      setSaveError({
        field,
        message: errorMessage(error, t),
        retry: () => undoSave(field, previous),
      });
    } finally {
      setSavingField(null);
      setUndoing(false);
    }
  }

  // ลองบันทึกซ้ำด้วยช่องและค่าเดิม โดยไม่สนว่าตอนนี้ผู้ใช้เปิดช่องไหนอยู่
  async function retrySave(field, value) {
    setSavingField(field);
    setSaveError(null);
    abortRef.current = new AbortController();
    try {
      await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: { [field]: value },
        signal: abortRef.current.signal,
      });
      applyUser({ [field]: value });
      toast.success(`${t("account.saved")} · ${FIELDS[field].label}`, { id: `lebis-saved-${field}` });
      setDrafts((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
      setEditing((current) => (current === field ? null : current));
      reload();
    } catch (error) {
      if (isDeadToken(error)) {
        logout();
        return;
      }
      if (error?.code === "cancelled") return;
      setSaveError({
        field,
        message: errorMessage(error, t),
        retry: () => retrySave(field, value),
      });
    } finally {
      setSavingField(null);
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

    // 🔴 จำไว้ตั้งแต่ตอนเริ่มว่า "กำลังบันทึกช่องไหน เป็นค่าอะไร"
    //    ถ้าอ่านจาก editing ตอนที่คำขอกลับมา มันอาจเป็นคนละช่องไปแล้ว
    //    เพราะบนเน็ตช้าผู้ใช้ไปกดแก้ช่องอื่นระหว่างรอได้
    const attempted = editing;
    const value = draft.trim() === "" ? null : draft.trim();

    setSavingField(attempted);
    setSaveError(null);
    setFieldError("");
    abortRef.current = new AbortController();

    try {
      await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: { [attempted]: value },
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
      applyUser({ [attempted]: value });

      // ให้ย้อนกลับได้ทันที ไม่ใช่แค่บอกว่าสำเร็จแล้วจบ
      //
      // เจ้าของร้านแก้ชื่อร้านผิด แล้วจำชื่อเดิมไม่ได้ว่าสะกดยังไง คือเรื่องที่เกิดจริง
      // ปุ่มนี้ทำให้ "กดผิด" ไม่ใช่เรื่องที่ต้องเสียเวลาแก้ ระบบจำค่าเดิมไว้ให้แล้ว
      const saved = attempted;
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
      // 🔴 ปิดฟอร์มเฉพาะถ้าผู้ใช้ยังอยู่ที่ช่องเดิม
      //    เน็ตร้านช้า การบันทึกใช้เวลาหลายวินาที ระหว่างนั้นผู้ใช้กดแก้ไขอีกแถวได้
      //    ถ้าปิดดื้อๆ ตอนคำขอเก่าสำเร็จ ฟอร์มที่เขาเพิ่งเปิดจะหายไปต่อหน้า
      //    วัดจริง: กดบันทึกชื่อร้าน (หน่วง 2.5 วินาที) แล้วกดแก้ไขชื่อระหว่างรอ
      //    ฟอร์มเปิดขึ้นมาแล้วหายไปเองเมื่อคำขอเก่าลงจอด
      //    การกระทำล่าสุดของผู้ใช้ต้องชนะคำขอที่ค้างอยู่เสมอ
      setEditing((current) => (current === saved ? null : current));
      setDrafts((current) => {
        const next = { ...current };
        delete next[saved];
        return next;
      });
      // คืนโฟกัสให้ปุ่มแก้ไขของแถวที่เพิ่งบันทึก เหมือนตอนกดยกเลิก
      // แต่ถ้าผู้ใช้ย้ายไปช่องอื่นแล้ว อย่าไปแย่งโฟกัสของเขากลับมา
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) editButtonRefs.current[saved]?.focus();
      });
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
      // ปุ่มลองใหม่ต้องส่ง "ค่าที่พยายามบันทึกไปเมื่อกี้" ไม่ใช่ค่าของช่องที่เปิดอยู่ตอนนี้
      setSaveError({
        field: attempted,
        message: errorMessage(error, t),
        retry: () => retrySave(attempted, value),
      });
    } finally {
      setSavingField(null);
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
                setSaveError(null);
              }}
              maxLength={120}
              autoComplete={field === "name" ? "name" : "organization"}
              className="w-full sm:w-64"
              autoFocus
            />
            {/* ดูจาก "ช่องนี้กำลังบันทึกอยู่ไหม" ไม่ใช่ "หน้านี้กำลังบันทึกอะไรอยู่ไหม"
                ไม่งั้นคำขอของอีกแถวจะทำให้ปุ่มของแถวนี้กดไม่ได้ */}
            <Button
              type="submit"
              size="sm"
              disabled={savingField === field}
              aria-busy={savingField === field}
            >
              {savingField === field ? t("account.saving") : t("account.save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancelEditing}>
              {t("account.cancel")}
            </Button>

            {/* 🔴 กล่องผิดพลาดอยู่ในฟอร์มของแถวนี้ ไม่ใช่ท้ายการ์ด
                   เคยวาดไว้ท้ายการ์ดใบเดียว ผลคือแก้แถว "ชื่อผู้ใช้งาน" แล้วพัง
                   กล่องแดงไปโผล่ห่างจากปุ่มบันทึก 110px คนละฝั่งของแถว "ชื่อร้าน"
                   ผู้ใช้จะไปไล่ดูแถวที่ไม่ได้แตะเลยว่าผิดตรงไหน
                   (docs/brand.md หัวข้อ 6 · คอมเมนต์หัวไฟล์ FormError.js) */}
            {slow && savingField === field ? (
              <p role="status" className="t-caption w-full">
                {t("state.slow")}
              </p>
            ) : null}

            {saveError && saveError.field === field ? (
              <div className="w-full">
                <FormError
                  message={saveError.message}
                  onRetry={saveError.retry}
                  retrying={saving}
                />
              </div>
            ) : null}
          </form>
        ) : (
          // ปุ่มแก้ไขของทุกแถวต้องอยู่ชิดขวาเท่ากัน ไม่ใช่ตามหลังค่าที่ยาวไม่เท่ากัน
          // สองปุ่มที่ทำสิ่งเดียวกันในรายการที่กวาดสายตาอ่าน ควรอยู่แนวเดียวกัน
          <span className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <span className="t-body min-w-0 break-words font-medium">{value || empty}</span>
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
        {/* 🔴 การย้อนกลับเกิดตอนที่ไม่มีฟอร์มอยู่บนจอแล้ว
               เดิมข้อความ "กำลังบันทึก" กับ "ช้ากว่าปกติ" อยู่ในฟอร์มของแถวทั้งคู่
               ผลคือกดย้อนกลับแล้วไม่มีอะไรบนจอเลยตลอดเวลาที่รอ — วัดได้ 7.5 วินาที
               ที่ไม่มีทั้งข้อความแจ้งเตือน ไม่มี role=status ไม่มี aria-busy
               และข้อความแจ้งเตือนที่มีปุ่มย้อนกลับก็หายไปตอนกด เพราะการกดคือการปิดมัน
               ผู้ใช้จึงไม่มีทางรู้ว่าที่กดไปนั้นติดหรือไม่ติด */}
        {savingField && savingField !== editing ? (
          <div role="status" className="mb-5 flex flex-col items-start gap-1">
            <p className="t-caption">
              {slow
                ? t("state.slow")
                : `${FIELDS[savingField] ? FIELDS[savingField].label + " · " : ""}${
                    undoing ? t("account.undoing") : t("account.saving")
                  }`}
            </p>
            {/* ทุกคำขอในระบบต้องมีทางออก ไม่ใช่มีแค่บางหน้า
                การย้อนกลับเคยเป็นคำขอเดียวที่รอได้ถึง 15 วินาทีโดยไม่มีอะไรให้กด */}
            {slow ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="inline-flex min-h-[44px] items-center font-medium underline underline-offset-4"
              >
                {t("action.cancelRequest")}
              </button>
            ) : null}
          </div>
        ) : null}

        {saveError && saveError.field !== editing ? (
          <div className="mb-5">
            {/* บอกด้วยว่าเป็นของช่องไหน เพราะตอนนี้ผู้ใช้ไปอยู่ที่ช่องอื่นแล้ว
                ถ้าไม่บอก เขาจะอ่านว่าช่องที่กำลังแก้อยู่ตอนนี้เป็นตัวที่พัง */}
            <FormError
              message={
                saveError.field && FIELDS[saveError.field]
                  ? `${FIELDS[saveError.field].label} · ${saveError.message}`
                  : saveError.message
              }
              onRetry={saveError.retry}
              retrying={saving}
              // ไม่แย่งโฟกัส กล่องนี้โผล่ตอนผู้ใช้ไปทำอย่างอื่นอยู่แล้ว
              stealFocus={false}
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
              {/* 🔴 ป้ายแพ็กเกจบนแถบหัวเว็บเป็น hidden md:flex — บนมือถือจึงไม่มีเลย
                  การ์ดนี้เลยพูดถึงสิทธิ์ 4 ข้อโดยไม่เคยบอกว่าคนอ่านมีสิทธิ์นั้นหรือเปล่า
                  ที่เดียวที่บอกคือบรรทัดท้ายหน้า ซึ่งต้องเลื่อนลงไป 966px */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="t-section">{t("account.planTitle")}</h2>
                <StatusBadge tone={planFor(user.role, t).tone}>
                  {planFor(user.role, t).label}
                </StatusBadge>
              </div>
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
