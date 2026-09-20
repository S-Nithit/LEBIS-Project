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
        // token ใช้ไม่ได้แล้ว (หมดอายุ / ถูกแก้) — ลบทิ้งแล้วส่งไปหน้า login
        clearToken();
        if (redirectTo) router.replace(redirectTo);
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
    isLoggedIn: user !== null,
    logout,
  };
}
