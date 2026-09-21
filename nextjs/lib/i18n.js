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
    "brand.tagline": "ระบบยืม-คืนอุปกรณ์ของร้านให้เช่า",
    "page.login": "เข้าสู่ระบบ · LEBIS",
    "page.register": "สมัครสมาชิก · LEBIS",
    "page.help": "ลืมรหัสผ่าน · LEBIS",
    "page.account": "บัญชีของคุณ · LEBIS",

    "nav.logout": "ออกจากระบบ",
    "nav.language": "เลือกภาษา",

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
    "login.success": "ยินดีต้อนรับกลับมา",
    "login.noAccount": "ยังไม่มีบัญชีใช่ไหม",
    "login.goRegister": "สมัครสมาชิก",

    "register.title": "สมัครสมาชิก",
    "register.subtitle":
      "เปิดใช้งาน LEBIS ได้ฟรี จัดการอุปกรณ์ได้สูงสุด 50 ชิ้น ไม่มีค่าใช้จ่ายและไม่ต้องผูกบัตร",
    "register.email": "อีเมล",
    "register.emailHint": "ใช้อีเมลนี้เข้าสู่ระบบในครั้งถัดไป",
    "register.name": "ชื่อของคุณ",
    "register.namePlaceholder": "ชื่อที่อยากให้ระบบเรียกคุณ",
    "register.shopName": "ชื่อร้าน",
    "register.shopNameOptional": "ไม่บังคับ",
    "register.shopNamePlaceholder": "เช่น นิธิศ เช่ากล้อง",
    "register.password": "รหัสผ่าน",
    "register.passwordHint": "ความยาวอย่างน้อย 8 ตัวอักษร",
    "register.confirmPassword": "ยืนยันรหัสผ่าน",
    "register.submit": "สมัครสมาชิก",
    "register.submitting": "กำลังสมัครสมาชิก...",
    "register.success": "สมัครสมาชิกเรียบร้อยแล้ว ยินดีต้อนรับสู่ LEBIS",
    "register.hasAccount": "มีบัญชีอยู่แล้วใช่ไหม",
    "register.goLogin": "เข้าสู่ระบบ",

    "validate.email": "กรุณากรอกอีเมลให้ถูกต้อง เช่น you@example.com",
    "validate.name": "กรุณากรอกชื่อของคุณ",
    "validate.passwordShort": "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร",
    "validate.passwordMismatch": "รหัสผ่านทั้งสองช่องยังไม่ตรงกัน",

    "sample.caption": "ตัวอย่างหน้าจอบันทึกการยืม (ข้อมูลสมมติ)",
    "sample.colDue": "กำหนดคืน",
    "sample.status.ok": "อยู่ในกำหนด",
    "sample.status.due": "ใกล้ครบกำหนด",
    "sample.status.late": "เกินกำหนด",
    "sample.footnote":
      "ระบบจะเตือนผ่าน LINE ก่อนถึงกำหนดคืน สำหรับผู้ใช้แพ็กเกจ Pro",
    "sample.row1.customer": "คุณพิมพ์ชนก",
    "sample.row2.customer": "คุณธนกฤต",
    "sample.row3.customer": "คุณวรรณา",

    // ---- ข้อผิดพลาด: รหัสจาก backend ถูกแปลเป็นประโยคตรงนี้ ----
    "error.invalid_credentials": "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง",
    "error.email_taken": "อีเมลนี้มีบัญชีอยู่แล้ว หากเป็นบัญชีของคุณ กรุณาเข้าสู่ระบบ",
    "error.invalid_input": "ข้อมูลที่กรอกยังไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
    "error.forbidden": "บัญชีของคุณยังไม่มีสิทธิ์ใช้ส่วนนี้",
    "error.role_required": "ส่วนนี้เปิดให้เฉพาะผู้ดูแลระบบเท่านั้น",
    "error.tier_required": "ฟีเจอร์นี้อยู่ในแพ็กเกจ Pro หากต้องการใช้งาน กรุณาอัปเกรดแพ็กเกจของร้าน",
    "error.password_too_long": "รหัสผ่านยาวเกินไป กรุณาใช้รหัสที่สั้นลง (ภาษาไทยใช้ได้ประมาณ 24 ตัวอักษร)",
    "error.network": "เชื่อมต่อไม่ได้ กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง",
    "error.server": "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งในอีกสักครู่",
    "error.unknown": "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    "error.token_expired": "คุณออกจากระบบไปแล้วเนื่องจากไม่ได้ใช้งานนาน กรุณาเข้าสู่ระบบอีกครั้ง",
    "error.token_invalid": "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง กรุณาเข้าสู่ระบบอีกครั้ง",
    "error.not_signed_in": "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้",
    "error.user_not_found": "ไม่พบบัญชีนี้ในระบบ กรุณาเข้าสู่ระบบอีกครั้ง",
    "error.summary": "ยังกรอกไม่ครบ กรุณาแก้ตามที่แจ้งไว้ใต้ช่องกรอก",

    "action.retry": "ลองอีกครั้ง",
    "login.forgot": "ลืมรหัสผ่าน",
    "login.remember": "จำฉันไว้ในเครื่องนี้",
    "login.rememberHint": "เหมาะกับเครื่องส่วนตัวหรือเครื่องที่ร้าน จะได้ไม่ต้องกรอกใหม่ทุกวัน",
    "validate.passwordRequired": "กรุณากรอกรหัสผ่าน",
    "field.show": "แสดง",
    "field.hide": "ซ่อน",
    "account.title": "บัญชีของคุณ",
    "account.subtitle": "ข้อมูลบัญชีร้านของคุณในระบบ LEBIS",
    "account.email": "อีเมลที่ใช้เข้าสู่ระบบ",
    "account.shop": "ชื่อร้าน",
    "account.plan": "แพ็กเกจที่ใช้อยู่",
    "account.emptyTitle": "ยังไม่มีอุปกรณ์ในระบบ",
    "account.emptyBody":
      "ส่วนจัดการอุปกรณ์และใบยืม-คืนกำลังอยู่ระหว่างพัฒนา เมื่อเปิดใช้งานแล้ว รายการอุปกรณ์ของร้านคุณจะแสดงที่นี่",
    "account.noShop": "ยังไม่ได้ตั้งชื่อร้าน",
    "account.planTitle": "แพ็กเกจของคุณให้อะไรบ้าง",
    "account.planFree":
      "แพ็กเกจฟรีบันทึกอุปกรณ์ได้สูงสุด 50 ชิ้น ดูรายงานย้อนหลังได้ 7 วัน และยังไม่รวมการแจ้งเตือนผ่าน LINE กับการส่งออกไฟล์",
    "account.planPro":
      "แพ็กเกจ Pro บันทึกอุปกรณ์ได้ไม่จำกัด ดูรายงานย้อนหลังได้ทั้งหมด แจ้งเตือนผ่าน LINE ก่อนถึงกำหนดคืน และส่งออกไฟล์ได้",

    "help.tipsTitle": "ก่อนอื่น ลองตรวจสองเรื่องนี้ดูก่อน",
    "help.tip1": "อีเมลพิมพ์ครบถ้วนหรือไม่ ระบบไม่แยกตัวพิมพ์เล็กใหญ่ พิมพ์แบบไหนก็เข้าได้",
    "help.tip2": "กดปุ่ม แสดง ข้างช่องรหัสผ่าน เพื่อดูว่าพิมพ์ตรงกับที่ตั้งไว้จริงไหม",
    "help.title": "ลืมรหัสผ่านใช่ไหม",
    "help.body":
      "ส่วนใหญ่แล้วเข้าระบบไม่ได้เพราะสองเรื่องข้างล่างนี้ ลองตรวจดูก่อนได้เลย",
    "help.note":
      "ถ้าลองสองข้อข้างบนแล้วยังเข้าไม่ได้ ระบบยังไม่มีการตั้งรหัสผ่านใหม่ด้วยตัวเอง กรุณาติดต่อทีมงาน LEBIS เพื่อขอตั้งรหัสผ่านใหม่ให้",
    "help.contactLabel": "ติดต่อทีมงาน LEBIS",
    "help.back": "กลับไปหน้าเข้าสู่ระบบ",

    "state.loading": "กำลังโหลดข้อมูล...",
  },

  en: {
    "brand.tagline": "Borrow and return log for equipment rental shops",
    "page.login": "Sign in · LEBIS",
    "page.register": "Create account · LEBIS",
    "page.help": "Forgotten password · LEBIS",
    "page.account": "Your account · LEBIS",

    "nav.logout": "Sign out",
    "nav.language": "Choose language",

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
    "register.namePlaceholder": "What should we call you?",
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

    "validate.email": "Please enter a valid email address, for example you@example.com",
    "validate.name": "Please enter your name.",
    "validate.passwordShort": "Use at least 8 characters.",
    "validate.passwordMismatch": "The two passwords do not match.",

    "sample.caption": "Sample borrow log (illustrative data)",
    "sample.colDue": "Due",
    "sample.status.ok": "On time",
    "sample.status.due": "Due soon",
    "sample.status.late": "Overdue",
    "sample.footnote":
      "LEBIS sends a LINE reminder before the due date on the Pro plan.",
    "sample.row1.customer": "Pimchanok",
    "sample.row2.customer": "Thanakrit",
    "sample.row3.customer": "Wanna",

    // ---- Errors: backend sends a code, it is turned into a sentence here ----
    "error.invalid_credentials": "That email or password is not correct. Please check and try again.",
    "error.email_taken": "An account already uses this email. If it is yours, please sign in.",
    "error.invalid_input": "Some details are not right yet. Please check the fields below.",
    "error.forbidden": "Your account does not have access to this part yet.",
    "error.role_required": "This area is for administrators only.",
    "error.tier_required": "This feature is part of the Pro plan. Upgrade your shop's plan to use it.",
    "error.password_too_long": "That password is too long. Please use a shorter one (about 24 characters in Thai).",
    "error.network": "Could not reach the server. Please check your connection and try again.",
    "error.server": "The service is temporarily unavailable. Please try again in a moment.",
    "error.unknown": "Something went wrong. Please try again.",
    "error.token_expired": "Your session has expired. Please sign in again.",
    "error.token_invalid": "Your session is not valid. Please sign in again.",
    "error.not_signed_in": "Please sign in to use this part of LEBIS.",
    "error.user_not_found": "That account no longer exists. Please sign in again.",
    "error.summary": "Some fields still need attention. Please fix the notes below.",

    "action.retry": "Try again",
    "login.forgot": "Forgot your password?",
    "login.remember": "Keep me signed in on this device",
    "login.rememberHint": "Best for your own phone or the shop's computer, so you do not sign in every day.",
    "validate.passwordRequired": "Please enter your password.",
    "field.show": "Show",
    "field.hide": "Hide",
    "account.title": "Your account",
    "account.subtitle": "The details LEBIS holds for your shop",
    "account.email": "Sign-in email",
    "account.shop": "Shop name",
    "account.plan": "Current plan",
    "account.emptyTitle": "No equipment yet",
    "account.emptyBody":
      "Equipment and borrow records are still being built. Once they are ready, your shop's items will appear here.",
    "account.noShop": "No shop name set",
    "account.planTitle": "What your plan includes",
    "account.planFree":
      "The free plan covers up to 50 items and 7 days of report history. LINE reminders and CSV export are not included.",
    "account.planPro":
      "Pro covers unlimited items, full report history, LINE reminders before each due date, and CSV export.",

    "help.tipsTitle": "First, two things worth checking",
    "help.tip1": "Is the email typed in full? Capital letters do not matter — either way signs you in.",
    "help.tip2": "Use the Show button beside the password field to check what you typed.",
    "help.title": "Forgotten password",
    "help.body":
      "Most sign-in problems come down to the two things below. Try them first.",
    "help.note":
      "If neither helps, LEBIS cannot reset a password by itself yet — contact the LEBIS team and we will set a new one for you.",
    "help.contactLabel": "Contact the LEBIS team",
    "help.back": "Back to sign in",

    "state.loading": "Loading...",
  },
};

// แปลข้อความหนึ่งคีย์ — ถ้าหาไม่เจอจะคืนคีย์กลับไป จะได้เห็นทันทีว่าลืมเติมคำไหน
export function translate(language, key) {
  const table = TEXT[language] || TEXT[DEFAULT_LANGUAGE];
  return table[key] ?? TEXT[DEFAULT_LANGUAGE][key] ?? key;
}
