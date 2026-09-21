// ระบบสลับภาษา ไทย / อังกฤษ ของทั้งเว็บ
//
// วิธีใช้ในหน้าของตัวเอง
//   import { useLanguage } from "@/lib/useLanguage";
//   const { t, language, setLanguage } = useLanguage();
//   <h1>{t("login.title")}</h1>
//
// ตัว LanguageProvider ถูกวางไว้ใน pages/_app.js แล้วครั้งเดียว
// ทุกหน้าจึงใช้ภาษาเดียวกัน กดเปลี่ยนที่เดียวเปลี่ยนพร้อมกันทั้งหน้า
// ภาษาที่เลือกถูกจำไว้ในเครื่องผู้ใช้ เปิดครั้งหน้าจะได้ภาษาเดิม
// ค่าเริ่มต้นคือภาษาไทย

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_LANGUAGE, translate } from "@/lib/i18n";

const STORAGE_KEY = "lebis_language";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  // อ่านภาษาที่เคยเลือกไว้ — ต้องอ่านใน useEffect เท่านั้น
  // เพราะตอน Next.js สร้างหน้าที่ฝั่งเซิร์ฟเวอร์ยังไม่มี localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLanguageState(saved);
    } catch (error) {
      // เบราว์เซอร์บางตัวปิด localStorage ไว้ ก็ใช้ภาษาเริ่มต้นไป
    }
  }, []);

  // บอกเบราว์เซอร์ว่าหน้านี้เป็นภาษาอะไร มีผลกับการอ่านออกเสียงและการตัดคำ
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      // เขียนไม่ได้ก็ไม่เป็นไร ภาษายังเปลี่ยนในหน้านี้ได้
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, t: (key) => translate(language, key) }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  // ถ้าลืมวาง LanguageProvider ไว้ใน _app.js จะเห็นข้อความนี้ทันที
  if (!context) {
    throw new Error("useLanguage ต้องอยู่ภายใต้ <LanguageProvider> ใน pages/_app.js");
  }

  return context;
}
