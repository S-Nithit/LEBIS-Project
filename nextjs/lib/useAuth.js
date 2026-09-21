// hook เล็กๆ ไว้ถามว่า "ตอนนี้ login อยู่มั้ย และเป็นใคร"
//
// ใช้ในหน้าที่ต้อง login ก่อนเข้า:
//   const { user, loading } = useAuth({ redirectTo: "/login" });
//   if (loading) return <p>กำลังโหลด...</p>;
//
// ใช้ในหน้าที่ไม่บังคับ login (เช่นหน้าแรก) ก็เรียก useAuth() เปล่าๆ
//
// วิธีทำงาน: มี token ในเครื่องมั้ย -> ถ้ามี ยิง /api/auth/me ไปถาม backend
// ว่า token ยังใช้ได้อยู่หรือเปล่า เพราะ token อาจหมดอายุไปแล้วก็ได้
// (เช็กแค่ว่ามี token ในเครื่อง ยังไม่พอ)

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { apiFetch, clearToken, getToken } from "@/lib/api";

export function useAuth(options = {}) {
  const { redirectTo } = options;
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false; // กันกรณีผู้ใช้เปลี่ยนหน้าไปก่อนที่ข้อมูลจะมาถึง

    async function loadUser() {
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
        const tokenIsDead = ["token_expired", "token_invalid", "user_not_found", "not_signed_in"].includes(
          error?.code
        );

        if (tokenIsDead) {
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
  }, [redirectTo, router]);

  function logout() {
    clearToken();
    setUser(null);
    router.replace("/login");
  }

  return {
    user, // ข้อมูล user จาก /api/auth/me (null ถ้ายังไม่ login)
    loading, // true ระหว่างที่ยังถาม backend ไม่เสร็จ
    loadError, // มีค่าเมื่อโหลดข้อมูลไม่สำเร็จเพราะเน็ต/เซิร์ฟเวอร์ (token ยังอยู่)
    isLoggedIn: user !== null,
    logout,
  };
}
