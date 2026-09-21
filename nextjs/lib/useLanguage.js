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

import { DEFAULT_LANGUAGE, LANGUAGES, translate } from "@/lib/i18n";

export const STORAGE_KEY = "lebis_language";

// 🔴 ภาษาถูกเก็บใน "คุกกี้" ด้วย ไม่ใช่แค่ localStorage
//
//    เหตุผล: หน้า login/register/forgot ถูกสร้างเป็น HTML ไว้ล่วงหน้าเป็นภาษาไทย
//    ส่วน localStorage เซิร์ฟเวอร์อ่านไม่ได้ ทำให้คนที่เคยกด EN ไว้จะเห็นหน้าเป็น
//    ภาษาไทยก่อน แล้วค่อยเปลี่ยนเป็นอังกฤษทั้งหน้าหลังโหลดเสร็จ
//    วัดแล้ว: เห็นภาษาผิดอยู่ 414ms บนเครื่องปกติ · 1194ms ถ้าเครื่องช้า
//    และบนเน็ต 400kbps ยังเป็นภาษาไทยอยู่เลยหลังผ่านไป 6 วินาที
//
//    นี่คือบั๊กชนิดเดียวกับเรื่องวันที่ในรอบก่อน คือ "เซิร์ฟเวอร์วาดสิ่งที่ตัวเองไม่รู้"
//    ต่างกันตรงที่อันนี้ไม่มี error ใน console เลย จึงไม่มีเครื่องมือไหนในโปรเจกต์เห็น
//
//    กฎที่ได้จากสองเรื่องนี้: อะไรที่เซิร์ฟเวอร์ไม่มีทางรู้ ห้ามเป็นตัวกำหนดสิ่งที่
//    เซิร์ฟเวอร์วาด — ในโปรเจกต์นี้มีสองอย่างคือ "นาฬิกา" กับ "ค่าที่เก็บในเครื่อง"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isSupportedLanguage(value) {
  return LANGUAGES.some((item) => item.code === value);
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children, initialLanguage }) {
  // ค่าเริ่มต้นมาจากคุกกี้ที่เซิร์ฟเวอร์อ่านได้ตั้งแต่ก่อนวาดหน้า (ดู pages/_app.js)
  // จึงไม่มีจังหวะที่หน้าเป็นภาษาหนึ่งแล้วเปลี่ยนเป็นอีกภาษาให้ผู้ใช้เห็น
  const [language, setLanguageState] = useState(
    isSupportedLanguage(initialLanguage) ? initialLanguage : DEFAULT_LANGUAGE
  );

  // 🔴 อ่าน localStorage เฉพาะตอนที่เบราว์เซอร์ "เขียนคุกกี้ไม่ได้" เท่านั้น
  //
  //    ถ้าอ่านทุกครั้ง จะกลับไปเป็นบั๊กเดิมเป๊ะๆ คือเซิร์ฟเวอร์วาดภาษาไทยมา
  //    แล้วเบราว์เซอร์เปลี่ยนเป็นอังกฤษให้ผู้ใช้เห็น เพราะเซิร์ฟเวอร์อ่าน
  //    localStorage ไม่ได้ ต่อให้ค่าในนั้นถูกแค่ไหนก็ตาม
  //
  //    เบราว์เซอร์ที่ปิดคุกกี้ไว้ยอมให้กระพริบหนึ่งจังหวะ เพราะทางเลือกอีกทางคือ
  //    ภาษาไม่ถูกจำเลย ซึ่งแย่กว่า — และเป็นกรณีที่เกิดน้อยมาก
  //
  //    ต้องตรวจว่าเป็นภาษาที่มีจริงด้วย ไม่งั้นค่าเพี้ยน (เช่น "fr") จะถูกยัดลง
  //    <html lang> ตรงๆ หน้าจะประกาศตัวเองเป็นภาษาฝรั่งเศสทั้งที่เนื้อหาเป็นไทย
  useEffect(() => {
    if (cookiesWork()) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isSupportedLanguage(saved) && saved !== language) setLanguageState(saved);
    } catch (error) {
      // อ่านไม่ได้ก็ใช้ภาษาเริ่มต้นไป
    }
    // ตั้งใจให้ทำงานครั้งเดียวตอน mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // บอกเบราว์เซอร์ว่าหน้านี้เป็นภาษาอะไร มีผลกับการอ่านออกเสียงและการตัดคำ
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next) => {
    if (!isSupportedLanguage(next)) return;
    setLanguageState(next);
    writeCookie(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      // เขียนไม่ได้ก็ไม่เป็นไร คุกกี้ยังทำงานอยู่
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, t: (key) => translate(language, key) }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function cookiesWork() {
  try {
    return typeof document !== "undefined" && navigator.cookieEnabled !== false;
  } catch (error) {
    return false;
  }
}

function writeCookie(value) {
  try {
    document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  } catch (error) {
    // เขียนคุกกี้ไม่ได้ก็ยังใช้งานได้ แค่ครั้งหน้าจะเห็นภาษาเริ่มต้นก่อนหนึ่งจังหวะ
  }
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  // ถ้าลืมวาง LanguageProvider ไว้ใน _app.js จะเห็นข้อความนี้ทันที
  if (!context) {
    throw new Error("useLanguage ต้องอยู่ภายใต้ <LanguageProvider> ใน pages/_app.js");
  }

  return context;
}
