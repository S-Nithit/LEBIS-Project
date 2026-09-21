// ข้อความทุกคำในเว็บอยู่ที่ไฟล์นี้ที่เดียว ทั้งภาษาไทยและอังกฤษ
//
// วิธีใช้ในหน้าของตัวเอง
//   import { useLanguage } from "@/lib/useLanguage";
//   const { t } = useLanguage();
//   <h1>{t("login.title")}</h1>
//
// วิธีเพิ่มข้อความใหม่
//   1. ตั้งชื่อคีย์แบบ "ชื่อหน้า.สิ่งที่พูดถึง" เช่น "workspace.addItem"
//   2. เติมทั้งใน th และ en ให้ครบทั้งคู่ ห้ามเติมข้างเดียว
//   3. ภาษาไทยเขียนให้เหมือนคนพิมพ์ — สุภาพ เป็นประโยคเต็ม ไม่ห้วน
//      ❌ "กรอกอีเมล"        ✅ "กรุณากรอกอีเมลของคุณ"
//      ❌ "รหัสผิด"          ✅ "อีเมลหรือรหัสผ่านไม่ถูกต้อง"

export const LANGUAGES = [
  { code: "th", label: "ไทย" },
  { code: "en", label: "EN" },
];

export const DEFAULT_LANGUAGE = "th";

const TEXT = {
  th: {
    "brand.name": "LEBIS",
    "brand.tagline": "ระบบยืม-คืนอุปกรณ์ของร้านให้เช่า",

    "nav.logout": "ออกจากระบบ",
    "nav.language": "ภาษา",
    "nav.account": "บัญชีของคุณ",

    "role.free": "แพ็กเกจฟรี",
    "role.pro": "แพ็กเกจ Pro",
    "role.admin": "ผู้ดูแลระบบ",

    "login.title": "เข้าสู่ระบบ",
    "login.subtitle":
      "กรุณากรอกอีเมลและรหัสผ่านที่ใช้สมัครไว้ เพื่อเข้าไปจัดการอุปกรณ์ของร้านคุณ",
    "login.email": "อีเมล",
    "login.password": "รหัสผ่าน",
    "login.submit": "เข้าสู่ระบบ",
    "login.submitting": "กำลังเข้าสู่ระบบ...",
    "login.success": "ยินดีต้อนรับกลับมาค่ะ",
    "login.noAccount": "ยังไม่มีบัญชีใช่ไหม",
    "login.goRegister": "สมัครสมาชิก",

    "register.title": "สมัครสมาชิก",
    "register.subtitle":
      "เปิดใช้งาน LEBIS ได้ฟรี จัดการอุปกรณ์ได้สูงสุด 50 ชิ้น ไม่มีค่าใช้จ่ายและไม่ต้องผูกบัตร",
    "register.email": "อีเมล",
    "register.emailHint": "ใช้อีเมลนี้เข้าสู่ระบบในครั้งถัดไป",
    "register.name": "ชื่อผู้ใช้",
    "register.namePlaceholder": "ชื่อที่อยากให้ระบบเรียกคุณ",
    "register.shopName": "ชื่อร้าน",
    "register.shopNameOptional": "ไม่บังคับ",
    "register.shopNamePlaceholder": "เช่น นิธิศ เช่ากล้อง",
    "register.password": "รหัสผ่าน",
    "register.passwordHint": "ความยาวอย่างน้อย 8 ตัวอักษร",
    "register.confirmPassword": "ยืนยันรหัสผ่าน",
    "register.submit": "สมัครสมาชิก",
    "register.submitting": "กำลังสมัครสมาชิก...",
    "register.success": "สมัครสมาชิกเรียบร้อยแล้ว ยินดีต้อนรับค่ะ",
    "register.hasAccount": "มีบัญชีอยู่แล้วใช่ไหม",
    "register.goLogin": "เข้าสู่ระบบ",

    "validate.email": "กรุณากรอกอีเมลให้ถูกต้อง",
    "validate.name": "กรุณากรอกชื่อผู้ใช้",
    "validate.passwordShort": "กรุณาตั้งรหัสผ่านให้ยาวอย่างน้อย 8 ตัวอักษร",
    "validate.passwordMismatch": "รหัสผ่านทั้งสองช่องยังไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง",

    "sample.caption": "ตัวอย่างหน้าจอบันทึกการยืม (ข้อมูลสมมติ)",
    "sample.colItem": "อุปกรณ์",
    "sample.colCustomer": "ผู้ยืม",
    "sample.colDue": "กำหนดคืน",
    "sample.status.ok": "อยู่ในกำหนด",
    "sample.status.due": "ใกล้ครบกำหนด",
    "sample.status.late": "เกินกำหนด",
    "sample.footnote":
      "ระบบจะเตือนผ่าน LINE ก่อนถึงกำหนดคืน สำหรับผู้ใช้แพ็กเกจ Pro",
    "sample.row1.customer": "คุณพิมพ์ชนก",
    "sample.row1.due": "24 ก.ย.",
    "sample.row2.customer": "คุณธนกฤต",
    "sample.row2.due": "22 ก.ย.",
    "sample.row3.customer": "คุณวรรณา",
    "sample.row3.due": "18 ก.ย.",

    "state.loading": "กำลังโหลดข้อมูล...",
    "state.emptyTitle": "ยังไม่มีข้อมูลในหน้านี้",
    "state.emptyBody": "เมื่อเริ่มบันทึกข้อมูลแล้ว รายการจะแสดงขึ้นที่นี่",
  },

  en: {
    "brand.name": "LEBIS",
    "brand.tagline": "Borrow and return log for equipment rental shops",

    "nav.logout": "Sign out",
    "nav.language": "Language",
    "nav.account": "Your account",

    "role.free": "Free plan",
    "role.pro": "Pro plan",
    "role.admin": "Administrator",

    "login.title": "Sign in",
    "login.subtitle":
      "Enter the email and password you registered with to manage your shop's equipment.",
    "login.email": "Email",
    "login.password": "Password",
    "login.submit": "Sign in",
    "login.submitting": "Signing in...",
    "login.success": "Welcome back.",
    "login.noAccount": "Don't have an account yet?",
    "login.goRegister": "Create one",

    "register.title": "Create an account",
    "register.subtitle":
      "Start using LEBIS for free with up to 50 items. No payment details required.",
    "register.email": "Email",
    "register.emailHint": "You will sign in with this address next time.",
    "register.name": "Your name",
    "register.namePlaceholder": "The name the system should call you",
    "register.shopName": "Shop name",
    "register.shopNameOptional": "optional",
    "register.shopNamePlaceholder": "e.g. Nithit Camera Rental",
    "register.password": "Password",
    "register.passwordHint": "At least 8 characters.",
    "register.confirmPassword": "Confirm password",
    "register.submit": "Create account",
    "register.submitting": "Creating your account...",
    "register.success": "Your account is ready. Welcome to LEBIS.",
    "register.hasAccount": "Already have an account?",
    "register.goLogin": "Sign in",

    "validate.email": "Please enter a valid email address.",
    "validate.name": "Please enter your name.",
    "validate.passwordShort": "Please use a password of at least 8 characters.",
    "validate.passwordMismatch": "The two passwords do not match yet. Please check them again.",

    "sample.caption": "Sample borrow log (illustrative data)",
    "sample.colItem": "Item",
    "sample.colCustomer": "Borrower",
    "sample.colDue": "Due",
    "sample.status.ok": "On time",
    "sample.status.due": "Due soon",
    "sample.status.late": "Overdue",
    "sample.footnote":
      "LEBIS sends a LINE reminder before the due date on the Pro plan.",
    "sample.row1.customer": "Pimchanok",
    "sample.row1.due": "24 Sep",
    "sample.row2.customer": "Thanakrit",
    "sample.row2.due": "22 Sep",
    "sample.row3.customer": "Wanna",
    "sample.row3.due": "18 Sep",

    "state.loading": "Loading...",
    "state.emptyTitle": "Nothing here yet",
    "state.emptyBody": "Records will appear here once you start adding them.",
  },
};

// แปลข้อความหนึ่งคีย์ — ถ้าหาไม่เจอจะคืนคีย์กลับไป จะได้เห็นทันทีว่าลืมเติมคำไหน
export function translate(language, key) {
  const table = TEXT[language] || TEXT[DEFAULT_LANGUAGE];
  return table[key] ?? TEXT[DEFAULT_LANGUAGE][key] ?? key;
}
