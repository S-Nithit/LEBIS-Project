// หน้าสมัครสมาชิก
//
// ทางเดินของข้อมูลทั้งเส้น อ่านจากบนลงล่างได้เลย
//   1. ผู้ใช้พิมพ์ในฟอร์ม -> เก็บไว้ใน state ของหน้านี้
//   2. กดปุ่มสมัคร -> handleSubmit()
//   3. validate() ตรวจ "ทุกช่องพร้อมกัน" แล้วคืนข้อความผิดพลาดแยกรายช่อง
//      (ไม่ใช่หยุดที่ช่องแรกที่ผิด ไม่งั้นผู้ใช้ต้องกดส่งหลายรอบกว่าจะรู้ครบ)
//   4. apiFetch("/api/auth/register") -> FastAPI: routes/auth.py -> register()
//   5. backend hash รหัสผ่าน แล้ว INSERT ลงตาราง users
//   6. backend คืน JWT -> saveToken() เก็บลง localStorage
//   7. พาไปหน้าแรก
//
// 🔴 validate ในไฟล์นี้เป็นแค่ความสะดวกของผู้ใช้ ตัวที่กันจริงคือ Pydantic
// กับ dependency ที่ฝั่ง backend เพราะคนแก้ JavaScript ในเบราว์เซอร์ได้

import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "sonner";

import { apiFetch, errorMessage, fieldToInputId, getToken, saveToken } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import { useSlowRequest } from "@/lib/useSlowRequest";
import { AuthLayout } from "@/components/AuthLayout";
import { FormError } from "@/components/FormError";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function Register() {
  const router = useRouter();
  const { t } = useLanguage();

  // 1 ช่อง 1 state อ่านง่ายกว่าเก็บรวมเป็น object เดียว
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const slow = useSlowRequest(loading);

  // ตัวหยุดคำขอที่ผู้ใช้กดเอง — คนละเรื่องกับตัวตัดเวลา 15 วินาทีใน lib/api.js
  // ตัวนั้นกันหน้าค้างตลอดกาล ตัวนี้คืนอำนาจให้ผู้ใช้ตัดสินใจว่าจะไม่รอแล้ว
  const abortRef = useRef(null);
  // ข้อความ "ยกเลิกแล้ว" เป็นการบอกให้รู้ ไม่ใช่การบอกว่าพัง จึงไม่ใช้กล่องแดง
  const [cancelled, setCancelled] = useState("");

  // มี token อยู่แล้ว = มีคนเข้าสู่ระบบค้างไว้บนเครื่องนี้
  //
  // 🔴 ห้ามเด้งไป /account ดื้อๆ
  //    เคยทำแบบนั้นเพื่อแก้เรื่องกดปุ่มย้อนกลับแล้วมาเจอหน้านี้ทั้งที่ยังล็อกอินอยู่
  //    แต่ผลคือ "ปิดประตูทั้งบาน" — เครื่องกลางที่หน้าร้านมีพนักงานหลายคนใช้
  //    คนที่สองจะเข้าหน้าเข้าสู่ระบบไม่ได้เลย ต้องรู้เองว่าต้องไปกดออกจากระบบ
  //    ของบัญชีคนแรกก่อน ซึ่งไม่มีอะไรบนจอบอก
  //    และถ้า token หมดอายุ จะเห็นหน้าเด้ง /login -> /account -> /login
  //
  //    ทางที่ถูกคือบอกให้รู้ แล้วให้เลือกเอง
  const [signedInAs, setSignedInAs] = useState("");
  useEffect(() => {
    if (!getToken()) return;
    // ถ้าไม่ได้ติ๊ก "จำฉันไว้" ไว้ เราก็ไม่รู้ว่าเป็นอีเมลอะไร
    // ห้ามโชว์เครื่องหมายคำถามให้ผู้ใช้อ่าน ให้ใช้ข้อความที่ไม่ต้องรู้อีเมลแทน
    try {
      setSignedInAs(localStorage.getItem("lebis_last_email") || "unknown");
    } catch (error) {
      setSignedInAs("unknown");
    }
  }, []);
  function cancelRequest() {
    abortRef.current?.abort();
  }
  const emailRef = useRef(null);

  // โฟกัสช่องแรกให้เฉพาะเครื่องที่มีเมาส์ (คอมพิวเตอร์) — กฎเดียวกับหน้าเข้าสู่ระบบ
  // บนมือถือไม่โฟกัส เพราะคีย์บอร์ดจะเด้งขึ้นมาบังครึ่งจอทันทีที่เปิดหน้า
  // (หน้านี้ไม่เติมอีเมลที่เคยใช้ให้เหมือนหน้าเข้าสู่ระบบ เพราะคนที่มาสมัคร
  //  กำลังจะสร้างบัญชีใหม่ การเติมอีเมลของบัญชีเดิมให้คือการชวนให้สมัครซ้ำ)
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      emailRef.current?.focus();
    }
  }, []);

  // ล้างข้อความผิดพลาดของช่องที่ผู้ใช้เริ่มแก้ (FormField เรียกให้เอง)
  function clearError(field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    // กล่องข้อผิดพลาดระดับฟอร์มก็ต้องหายไปด้วย พอผู้ใช้เริ่มแก้
    // ไม่งั้นจะมีกล่องแดง "เชื่อมต่อไม่ได้" ค้างอยู่ขณะที่เขากำลังพิมพ์อีเมลใหม่
    // ซึ่งอ่านเหมือนระบบยังพังอยู่ทั้งที่เขากำลังแก้ให้แล้ว
    setFormError("");
  }

  // ตรวจทุกช่องพร้อมกัน คืน object ที่ key คือ id ของช่องที่ผิด
  function validate() {
    const found = {};
    if (!email.trim().includes("@")) found.email = t("validate.email");
    if (name.trim().length === 0) found.name = t("validate.name");
    if (password.length < 8) found.password = t("validate.passwordShort");
    // bcrypt รับได้ 72 ไบต์ ภาษาไทยกิน 3 ไบต์ต่อตัว ตรวจตั้งแต่ในหน้าเว็บ
    // จะได้ไม่ต้องรอให้ยิงไปถึง backend แล้วค่อยรู้
    else if (new Blob([password]).size > 72) found.password = t("validate.passwordLong");
    if (confirmPassword !== password) {
      found.confirmPassword = t("validate.passwordMismatch");
    }
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault(); // กันเบราว์เซอร์ refresh หน้าเองตามพฤติกรรมเดิมของฟอร์ม

    const found = validate();
    setErrors(found);
    // 🔴 ห้ามล้างข้อความระดับฟอร์มตรงนี้
    //    เคยล้างตอนเริ่มส่ง เพื่อไม่ให้ข้อความเก่าค้างคู่กับข้อความใหม่
    //    แต่ผลคือพอกด "ลองอีกครั้ง" กล่องแดงหายไปทั้งก้อน หน้าเด้งขึ้น 124px
    //    (วัดที่ 390px) แล้วเด้งกลับลงมาเมื่อพลาดอีกครั้ง ปุ่มที่นิ้วเล็งอยู่เลื่อนหนี
    //    และคำอธิบายว่าพังเพราะอะไรก็หายไปพร้อมกัน ทั้งที่ brand.md หัวข้อ 6
    //    เขียนว่าความล้มเหลวต้องอยู่จนกว่าผู้ใช้จะแก้ — การกดลองใหม่ไม่ใช่การแก้
    //
    //    ข้อความเก่าไม่ค้างอยู่แล้ว เพราะรอบใหม่จะเขียนทับด้วย setFormError(ข้อความใหม่)
    //    หรือถูกล้างเมื่อสำเร็จ หรือเมื่อผู้ใช้เริ่มพิมพ์แก้ (clearError)

    if (Object.keys(found).length > 0) {
      // ไม่ขึ้น toast ซ้ำ ข้อความอยู่ใต้ช่องที่ผิดแล้ว
      // พาโฟกัสไปที่ช่องแรกที่ผิด ผู้ใช้จะได้ไม่ต้องไล่หาเองว่าผิดตรงไหน
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    setLoading(true);
    setCancelled("");
    abortRef.current = new AbortController();

    try {
      const data = await apiFetch("/api/auth/register", {
        signal: abortRef.current.signal,
        method: "POST",
        body: {
          email: email.trim(),
          password,
          name: name.trim(),
          // ช่องนี้ไม่บังคับ ถ้าเว้นว่างส่ง null ไปแทนสตริงว่าง
          shop_name: shopName.trim() === "" ? null : shopName.trim(),
          remember,
        },
      });

      saveToken(data.access_token);

      try {
        // เหมือนหน้าเข้าสู่ระบบ: จำอีเมลเฉพาะเมื่อผู้ใช้ติ๊กให้จำ
        if (remember) {
          localStorage.setItem("lebis_last_email", email.trim().toLowerCase());
        } else {
          // เหมือนหน้าเข้าสู่ระบบ: ไม่ติ๊ก = ไม่อยากให้เหลือร่องรอยบนเครื่องนี้
          localStorage.removeItem("lebis_last_email");
        }
      } catch (error) {
        // จำไม่ได้ก็ไม่เป็นไร
      }

      toast.success(t("register.success"));
      router.replace("/account"); // replace ไม่ push เพื่อไม่ให้กด back กลับมาหน้าสมัครได้
    } catch (error) {
      // ผู้ใช้กดยกเลิกเอง ไม่ใช่ความผิดพลาด
      // กล่องแดงที่แย่งโฟกัสและเลื่อนหน้าจอมาหาตัวเอง อ่านว่า "ระบบพัง"
      // ทั้งที่ข้อความข้างในเขียนว่า "ยกเลิกแล้ว" — ภาชนะขัดกับเนื้อความ
      // (หน้าบัญชีทำถูกแล้ว อีกสองหน้ายังไม่ได้ทำตาม)
      if (error?.code === "cancelled") {
        setCancelled(t("error.cancelled"));
        return;
      }
      const message = errorMessage(error, t);

      // backend บอกมาว่าผิดที่ช่องไหน (เช่น password ยาวเกิน) ก็แปะที่ช่องนั้น
      // อีเมลซ้ำก็เป็นความผิดของช่องอีเมล
      // เรื่องที่ไม่ได้ผิดที่ช่องใดช่องหนึ่ง (เน็ตหลุด เซิร์ฟเวอร์ล่ม) ขึ้นระดับฟอร์ม
      const field = error?.field || (error?.code === "email_taken" ? "email" : null);

      if (field) {
        setFormError("");
        setErrors({ [fieldToInputId(field)]: message });
        document.getElementById(fieldToInputId(field))?.focus();
      } else {
        setFormError(message);
      }

      // ไม่ขึ้น toast ซ้ำ ข้อความอยู่ในหน้าแล้วและอยู่ต่อจนกว่าจะแก้
      // toast มีไว้สำหรับเรื่องที่ไม่มีที่ทางในหน้า ไม่ใช่พูดซ้ำสิ่งที่พูดไปแล้ว
    } finally {
      setLoading(false); // ปลดล็อกปุ่มทั้งกรณีสำเร็จและกรณีพลาด
    }
  }

  return (
    <>
      <Head>
        <title>{t("page.register")}</title>
      </Head>

      <AuthLayout
        title={t("register.title")}
        description={t("register.subtitle")}
        footer={
          <p className="t-caption">
            {t("register.hasAccount")}{" "}
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center font-medium text-ink underline underline-offset-4 hover:no-underline"
            >
              {t("register.goLogin")}
            </Link>
            {" · "}
            {/* ช่วยเหลือต้องไปถึงได้จากทุกประตู ไม่ใช่เฉพาะหน้าเข้าสู่ระบบ
                คนที่ติดตรงนี้ (อีเมลซ้ำ เข้าไม่ได้) ต้องกระโดดสองต่อกว่าจะเจอ */}
            <Link
              href="/forgot-password"
              className="inline-flex min-h-[44px] items-center font-medium text-ink underline underline-offset-4 hover:no-underline"
            >
              {t("nav.helpSignedIn")}
            </Link>
          </p>
        }
      >
        {/* มีคนเข้าสู่ระบบค้างไว้บนเครื่องนี้ — บอกว่าเป็นใคร แล้วให้เลือกเอง
            ว่าจะกลับเข้าบัญชีนั้น หรือเข้าด้วยบัญชีอื่น
            เครื่องกลางที่หน้าร้านมีพนักงานหลายคนใช้ การปิดหน้านี้ทิ้งเลย
            ทำให้คนที่สองเข้าระบบไม่ได้โดยไม่มีอะไรบอกว่าต้องทำยังไง */}
        {signedInAs ? (
          <div
            role="status"
            className="mb-5 flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="t-caption break-words">
              {signedInAs === "unknown"
                ? t("auth.alreadySignedInUnknown")
                : t("auth.alreadySignedIn").replace("{email}", signedInAs)}
            </p>
            <Button asChild variant="secondary" size="sm" className="shrink-0">
              <Link href="/account">{t("auth.goAccount")}</Link>
            </Button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <FormField
            ref={emailRef}
            id="email"
            label={t("register.email")}
            hint={t("register.emailHint")}
            error={errors.email}
            onClearError={clearError}
            // คำใบ้สำหรับแป้นพิมพ์บนมือถือ — เจ้าของร้านกรอกด้วยนิ้วโป้งข้างเดียว
            // inputMode="email" ทำให้แป้นมีปุ่ม @ กับ . โดยไม่ต้องสลับหน้าแป้น
            // autoCapitalize/spellCheck ปิด เพราะ iOS ชอบขึ้นตัวใหญ่ตัวแรกของอีเมล
            // แล้วคนไม่ทันสังเกต ต้องมาแก้ทีหลังทั้งที่พิมพ์ถูกแล้ว
            // enterKeyHint บอกว่าปุ่มมุมขวาล่างของแป้นควรเขียนว่าอะไร
            type="email"
            inputMode="email"
            enterKeyHint="next"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
          />

          <FormField
            id="name"
            label={t("register.name")}
            error={errors.name}
            onClearError={clearError}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("register.namePlaceholder")}
            maxLength={120}
            autoComplete="name"
            required
          />

          <FormField
            id="shopName"
            label={t("register.shopName")}
            badge={t("register.shopNameOptional")}
            value={shopName}
            onChange={(event) => setShopName(event.target.value)}
            placeholder={t("register.shopNamePlaceholder")}
            maxLength={120}
            autoComplete="organization"
          />

          {/* รหัสผ่านสองช่องอยู่คนละบรรทัดบนมือถือ และเรียงคู่กันบนจอใหญ่ */}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="password"
              label={t("register.password")}
              hint={t("register.passwordHint")}
              error={errors.password}
              onClearError={clearError}
              type="password"
              maxBytes={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              enterKeyHint="next"
              required
            />

            <FormField
              id="confirmPassword"
              label={t("register.confirmPassword")}
              error={errors.confirmPassword}
              onClearError={clearError}
              type="password"
              maxBytes={72}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              enterKeyHint="go"
              required
            />
          </div>

          <div>
            <Checkbox
              id="remember"
              label={t("login.remember")}
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            {/* อยู่ตรงนี้ตลอด ไม่ใช่โผล่หลังติ๊ก — เหตุผลเดียวกับหน้าเข้าสู่ระบบ
                คำอธิบายที่โผล่ตอนติ๊กจะดันปุ่มส่งลงไป 47px ตอนที่นิ้วกำลังเคลื่อนไปหา
                และเป็นคำที่ต้องอ่านก่อนตัดสินใจ ไม่ใช่หลังตัดสินใจไปแล้ว */}
            <p className="t-caption mt-2">{t("login.rememberHint")}</p>
          </div>

          {/* ข้อความบอกให้รู้ ไม่ใช่กล่องแดง — ไม่แย่งโฟกัส ไม่เลื่อนหน้าจอ */}
          {cancelled ? (
            <p role="status" className="t-caption text-center">
              {cancelled}
            </p>
          ) : null}

          <FormError message={formError} onRetry={handleSubmit} retrying={loading} />

          <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
            {loading ? t("register.submitting") : t("register.submit")}
          </Button>

          {/* หลัง 6 วินาที บอกเพิ่มว่ายังรออยู่ ไม่ใช่ปล่อยให้คำเดิมคำเดียวนิ่ง 15 วินาที
              คนที่มีลูกค้ายืนรอจะคิดว่าเครื่องค้างแล้วกดรีเฟรช ซึ่งทำให้ที่พิมพ์ไว้หายหมด */}
          {slow ? (
            <div role="status" className="mt-2 flex flex-col items-center gap-1">
              <p className="t-caption text-center">{t("state.slow")}</p>
              {/* ต้องมีทางออก ไม่ใช่มีแต่ข้อความบอกให้รออีก
                  ของเดิมรอได้สูงสุด 15 วินาที โดยทางเดียวที่หยุดได้คือรีเฟรช
                  ซึ่งทำให้รหัสที่พิมพ์ไว้หายหมด แล้วต้องเริ่มใหม่ทั้งหมด */}
              <button
                type="button"
                onClick={cancelRequest}
                className="inline-flex min-h-[44px] items-center font-medium underline underline-offset-4"
              >
                {t("action.cancelRequest")}
              </button>
            </div>
          ) : null}
        </form>
      </AuthLayout>
    </>
  );
}
