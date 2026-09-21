// hook เล็กๆ ไว้ถามว่า "ตอนนี้ login อยู่มั้ย และเป็นใคร"
//
// ใช้ในหน้าที่ต้อง login ก่อนเข้า:
//   const { user, loading } = useAuth({ redirectTo: "/login" });
//   if (loading && !user) return <AppShell><LoadingState /></AppShell>;
//
// ใช้ LoadingState ไม่ใช่ <p>กำลังโหลด...</p> (docs/brand.md หัวข้อ 5 — โครงรอ
// ไม่ใช่ตัวหมุน) และเช็ก `&& !user` ด้วย ไม่งั้นหน้าจะวูบเป็นจอว่างทุกครั้งที่โหลดซ้ำ
// ก้อนตัวอย่างที่รันได้จริงทั้งหน้าอยู่ที่ pages/template.js
//
// ใช้ในหน้าที่ไม่บังคับ login (เช่นหน้าแรก) ก็เรียก useAuth() เปล่าๆ
//
// วิธีทำงาน: มี token ในเครื่องมั้ย -> ถ้ามี ยิง /api/auth/me ไปถาม backend
// ว่า token ยังใช้ได้อยู่หรือเปล่า เพราะ token อาจหมดอายุไปแล้วก็ได้
// (เช็กแค่ว่ามี token ในเครื่อง ยังไม่พอ)

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { TOKEN_KEY, apiFetch, clearToken, getToken } from "@/lib/api";

export function useAuth(options = {}) {
  const { redirectTo } = options;
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // เพิ่มค่านี้ทีละ 1 เพื่อสั่งให้โหลดข้อมูลใหม่ (ปุ่ม "ลองอีกครั้ง")
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false; // กันกรณีผู้ใช้เปลี่ยนหน้าไปก่อนที่ข้อมูลจะมาถึง

    async function loadUser() {
      if (!cancelled) {
        setLoading(true);
        setLoadError(null);
      }

      if (!getToken()) {
        if (!cancelled) setLoading(false);
        if (redirectTo) router.replace(redirectTo);
        return;
      }

      try {
        const me = await apiFetch("/api/auth/me");
        if (!cancelled) setUser(me);
      } catch (error) {
        // 🔴 แยกให้ออกว่า "token ใช้ไม่ได้" กับ "ติดต่อเซิร์ฟเวอร์ไม่ได้" ไม่เหมือนกัน
        //
        // token หมดอายุหรือถูกแก้ -> ลบทิ้งแล้วส่งไปหน้าเข้าสู่ระบบ ถูกต้องแล้ว
        // แต่ถ้าแค่เน็ตหลุดหรือเซิร์ฟเวอร์ไม่ตอบ token ยังใช้ได้อยู่
        // ถ้าลบทิ้งด้วย เจ้าของร้านจะถูกเตะออกจากระบบกลางคันทั้งที่ลูกค้ายืนรออยู่
        // เพราะสัญญาณหลุดไปไม่กี่วินาที
        if (isDeadToken(error)) {
          clearToken();
          if (redirectTo) router.replace(redirectTo);
        } else if (!cancelled) {
          // เก็บ token ไว้ แล้วบอกหน้าเว็บว่าตอนนี้ติดต่อเซิร์ฟเวอร์ไม่ได้
          setLoadError(error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [redirectTo, router, reloadCount]);

  // ออกจากระบบที่แท็บหนึ่ง แท็บอื่นที่เปิดค้างไว้ต้องออกตาม
  //
  // 🔴 เครื่องที่หน้าร้านมักเปิดหลายแท็บค้างไว้ ถ้าปิดแค่แท็บเดียว อีกแท็บจะยัง
  //    โชว์อีเมลกับชื่อร้านของคนก่อนต่อไปเรื่อยๆ ซึ่งเป็นสิ่งเดียวกับที่บรรทัด
  //    ลบ lebis_last_email ข้างล่างพยายามกันไว้ แต่กันได้แค่แท็บเดียว
  useEffect(() => {
    function onStorage(event) {
      if (event.key === TOKEN_KEY && !event.newValue) {
        setUser(null);
        if (redirectTo) router.replace(redirectTo);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [redirectTo, router]);

  // สั่งโหลดข้อมูลผู้ใช้ใหม่ ใช้กับปุ่ม "ลองอีกครั้ง" ตอนเน็ตหลุด
  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  // อัปเดตข้อมูลผู้ใช้ที่ถืออยู่ในหน้าทันที โดยไม่ต้องรอเซิร์ฟเวอร์ตอบ
  //
  // 🔴 ทำไมต้องมี: เดิมหน้าบัญชีกดบันทึกสำเร็จ แล้วเรียก reload() เพื่อดึงข้อมูลใหม่
  //    ถ้าการดึงรอบนั้น "ล้มเหลว" (เน็ตสะดุดพอดี) หน้าจะขึ้น "บันทึกเรียบร้อยแล้ว"
  //    ทั้งที่แถวยังโชว์ชื่อเดิม และไม่มีกล่องแดงที่ไหนเลย
  //    เจ้าของร้านจะกดบันทึกซ้ำอีกรอบเพราะคิดว่าไม่ติด
  //    ข้อความว่าสำเร็จ ห้ามเป็นสิ่งเดียวที่เปลี่ยนบนหน้าจอ
  const applyUser = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  function logout() {
    clearToken();
    try {
      // ลบอีเมลที่จำไว้ด้วย ไม่งั้นคนถัดไปที่ใช้เครื่องร้านจะเห็นอีเมลของคนก่อน
      localStorage.removeItem("lebis_last_email");
    } catch (error) {
      // ลบไม่ได้ก็ไม่เป็นไร
    }
    setUser(null);
    router.replace("/login");
  }

  return {
    applyUser,
    user, // ข้อมูล user จาก /api/auth/me (null ถ้ายังไม่ login)
    loading, // true ระหว่างที่ยังถาม backend ไม่เสร็จ
    loadError, // มีค่าเมื่อโหลดข้อมูลไม่สำเร็จเพราะเน็ต/เซิร์ฟเวอร์ (token ยังอยู่)
    reload, // เรียกเพื่อลองโหลดข้อมูลผู้ใช้ใหม่
    isLoggedIn: user !== null,
    logout,
  };
}

// "token ตายแล้ว" กับ "ติดต่อเซิร์ฟเวอร์ไม่ได้" ต้องแยกกันทุกที่ที่ยิง API
// ไม่ใช่แยกเฉพาะตอนโหลดหน้าครั้งแรก
//
// 🔴 เดิมกฎนี้อยู่ใน useAuth ที่เดียว ส่วนการบันทึกในหน้าเรียก apiFetch ตรงๆ
//    พอ token หมดอายุระหว่างเปิดหน้าค้างไว้ การกดบันทึกจะได้กล่องแดงเฉยๆ
//    ปุ่ม "ลองอีกครั้ง" ก็ส่ง token ใบเดิมที่ตายแล้วซ้ำไปเรื่อยๆ ไม่มีวันสำเร็จ
//    ทางออกเดียวที่ใช้ได้จริงคือปุ่ม "ออกจากระบบ" ซึ่งเขียนว่าออกจากระบบ
//    ทั้งที่จริงๆ ระบบพาเขาออกไปแล้ว
export function isDeadToken(error) {
  return ["token_expired", "token_invalid", "user_not_found", "not_signed_in"].includes(error?.code);
}
