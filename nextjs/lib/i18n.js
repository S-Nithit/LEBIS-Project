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
    "page.help": "ช่วยเหลือเรื่องการเข้าสู่ระบบ · LEBIS",
    "page.account": "บัญชีของคุณ · LEBIS",

    "nav.logout": "ออกจากระบบ",
    "nav.language": "เลือกภาษา",
    "nav.helpSignedIn": "ช่วยเหลือเรื่องการเข้าสู่ระบบ",

    "role.free": "ฟรี",
    "role.pro": "Pro",
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
    "register.passwordHint": "อย่างน้อย 8 ตัวอักษร ใช้ภาษาไทยและตัวเลขได้",
    "register.confirmPassword": "ยืนยันรหัสผ่าน",
    "register.submit": "สมัครสมาชิก",
    "register.submitting": "กำลังสมัครสมาชิก...",
    "register.success": "สมัครสมาชิกเรียบร้อยแล้ว ยินดีต้อนรับสู่ LEBIS",
    "register.hasAccount": "มีบัญชีอยู่แล้วใช่ไหม",
    "register.goLogin": "เข้าสู่ระบบ",

    "validate.email": "กรุณากรอกอีเมลให้ถูกต้อง เช่น you@example.com",
    "validate.name": "กรุณากรอกชื่อของคุณ",
    "validate.passwordShort": "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร",
    "validate.passwordLong": "รหัสผ่านยาวเกินที่ระบบรับได้ กรุณาตัดให้สั้นลง",
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
    "error.invalid_input": "ข้อมูลที่กรอกยังไม่ถูกต้อง กรุณาตรวจช่องที่ทำเครื่องหมายไว้",
    "error.forbidden": "บัญชีของคุณยังไม่มีสิทธิ์ใช้ส่วนนี้",
    "error.role_required": "ส่วนนี้เปิดให้เฉพาะผู้ดูแลระบบเท่านั้น",
    "error.tier_required": "ฟีเจอร์นี้อยู่ในแพ็กเกจ Pro หากต้องการใช้งาน กรุณาอัปเกรดแพ็กเกจของร้าน",
    "error.password_too_long": "รหัสผ่านยาวเกินที่ระบบรับได้ กรุณาตัดให้สั้นลง",
    "error.network": "เชื่อมต่อไม่ได้ กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง",
    "error.server": "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งในอีกสักครู่",
    "error.unknown": "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    "error.token_expired": "การเข้าสู่ระบบครั้งก่อนหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง",
    "error.token_invalid": "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง กรุณาเข้าสู่ระบบอีกครั้ง",
    "error.not_signed_in": "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้",
    "error.user_not_found": "ไม่พบบัญชีนี้ในระบบ กรุณาเข้าสู่ระบบอีกครั้ง",

    "action.retry": "ลองอีกครั้ง",
    "login.forgot": "เข้าสู่ระบบไม่ได้ใช่ไหม",
    "login.remember": "จำฉันไว้ในเครื่องนี้",
    "login.rememberHint": "เหมาะกับเครื่องส่วนตัวหรือเครื่องที่ร้าน จะได้ไม่ต้องกรอกใหม่ทุกวัน",
    "validate.nameRequired": "กรุณากรอกชื่อผู้ใช้งาน ช่องนี้จำเป็นต้องมี",
    "validate.passwordRequired": "กรุณากรอกรหัสผ่าน",
    // บนหน้าเข้าสู่ระบบ รหัสผ่านที่ยาวเกินแปลว่าพิมพ์เกินมา ไม่ใช่ว่าตั้งรหัสไว้ยาวเกิน
    // เพราะรหัสที่ยาวเกินขีดนี้สมัครไม่ผ่านตั้งแต่แรกอยู่แล้ว
    "validate.passwordLongLogin": "รหัสผ่านที่พิมพ์ยาวเกินกว่าที่ระบบรับได้ กรุณาตรวจว่าพิมพ์เกินมาหรือไม่",
    "field.limit": "ถึงความยาวสูงสุดแล้ว พิมพ์ต่อจะไม่ถูกบันทึก",
    "field.tooLongBytes": "ยาวเกินที่ระบบรับได้แล้ว ลองตัดให้สั้นลง",
    "field.show": "แสดง",
    "field.hide": "ซ่อน",
    "account.title": "บัญชีของคุณ",
    "account.subtitle": "ข้อมูลบัญชีร้านของคุณในระบบ LEBIS",
    "account.email": "อีเมลที่ใช้เข้าสู่ระบบ",
    "account.name": "ชื่อผู้ใช้งาน",
    "account.noName": "ยังไม่ได้ตั้งชื่อ",
    "account.shop": "ชื่อร้าน",
    "account.buildNote": "ส่วนจัดการอุปกรณ์และใบยืม-คืนกำลังอยู่ระหว่างพัฒนา เมื่อเปิดใช้งานแล้วรายการอุปกรณ์ของร้านคุณจะแสดงที่นี่",
    "account.noShop": "ยังไม่ได้ตั้งชื่อร้าน",
    "account.edit": "แก้ไข",
    "account.save": "บันทึก",
    "account.saving": "กำลังบันทึก...",
    "account.cancel": "ยกเลิก",
    "account.saved": "บันทึกเรียบร้อยแล้ว",
    "account.planTitle": "แพ็กเกจของคุณให้อะไรบ้าง",
    "account.planFree":
      "บันทึกอุปกรณ์ได้สูงสุด 50 ชิ้น ดูรายงานย้อนหลังได้ 7 วัน และยังไม่รวมการแจ้งเตือนผ่าน LINE กับการส่งออกไฟล์",
    "account.planPro":
      "บันทึกอุปกรณ์ได้ไม่จำกัด ดูรายงานย้อนหลังได้ทั้งหมด แจ้งเตือนผ่าน LINE ก่อนถึงกำหนดคืน และส่งออกไฟล์ได้",

    "help.tipsTitle": "ลองสองเรื่องนี้ก่อน ส่วนใหญ่แก้ได้เองในไม่กี่วินาที",
    "help.tip1": "อีเมลพิมพ์ครบถ้วนหรือไม่ ระบบไม่แยกตัวพิมพ์เล็กใหญ่ พิมพ์แบบไหนก็เข้าได้",
    "help.tip2": "กดปุ่ม แสดง ข้างช่องรหัสผ่าน เพื่อดูว่าพิมพ์ตรงกับที่ตั้งไว้จริงไหม",
    "help.title": "ช่วยเหลือเรื่องการเข้าสู่ระบบ",
    "help.body":
      "ข้อมูลร้านของคุณยังอยู่ครบ ไม่ได้หายไปไหน",
    "help.note":
      "ถ้าลองสองข้อข้างบนแล้วยังเข้าไม่ได้ ระบบยังไม่มีการตั้งรหัสผ่านใหม่ด้วยตัวเอง กรุณาติดต่อทีมงาน LEBIS เพื่อขอตั้งรหัสผ่านใหม่ให้",
    // 🔴 ห้ามลงท้ายด้วยการชี้ไปหาคนที่หน้าจอไม่มีปุ่มให้ติดต่อ
    //    ตอนนี้ยังไม่มีช่องทางติดต่อจริง จึงต้องบอกตรงๆ ว่าฟีเจอร์นี้ยังไม่เปิด
    //    แล้วให้ทางที่เธอทำเองได้ตอนนี้ ไม่ใช่สัญญาถึงคนที่เธอหาไม่เจอ
    "help.noteNoChannel":
      "การตั้งรหัสผ่านใหม่ด้วยตัวเองยังไม่เปิดใช้งาน ถ้าสองวิธีข้างบนยังไม่ได้ผล ให้สมัครบัญชีใหม่ด้วยอีเมลอื่นไปก่อน แล้วกลับมาที่บัญชีเดิมได้เมื่อฟีเจอร์นี้เปิด",
    "help.contactLabel": "ติดต่อทีมงาน LEBIS",
    "help.back": "กลับไปหน้าเข้าสู่ระบบ",
    "help.register": "สมัครบัญชีใหม่",

    "state.loading": "กำลังโหลดข้อมูล...",

    // ใช้เฉพาะหน้าแม่แบบ pages/template.js (เปิดได้เฉพาะตอน dev)
    "template.title": "หน้าแม่แบบ",
    "template.subtitle": "ก็อปไฟล์ pages/template.js ไปเริ่มหน้าใหม่ของคุณได้เลย",
    "template.addItem": "เพิ่มรายการ",
    "template.addFirst": "เพิ่มรายการแรก",
    "template.listTitle": "รายการทั้งหมด",
    "template.emptyTitle": "ยังไม่มีรายการ",
    "template.emptyBody": "เมื่อมีข้อมูลแล้ว รายการจะแสดงตรงนี้ ระหว่างนี้กล่องนี้คือสิ่งที่ผู้ใช้เห็น",
  },

  en: {
    "brand.tagline": "Borrow and return log for equipment rental shops",
    "page.login": "Sign in · LEBIS",
    "page.register": "Create account · LEBIS",
    "page.help": "Help with signing in · LEBIS",
    "page.account": "Your account · LEBIS",

    "nav.logout": "Sign out",
    "nav.language": "Choose language",
    "nav.helpSignedIn": "Help with signing in",

    "role.free": "Free",
    "role.pro": "Pro",
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
    "register.passwordHint": "At least 8 characters. Thai letters and numbers are fine.",
    "register.confirmPassword": "Confirm password",
    "register.submit": "Create account",
    "register.submitting": "Creating your account...",
    "register.success": "Your account is ready. Welcome to LEBIS.",
    "register.hasAccount": "Already have an account?",
    "register.goLogin": "Sign in",

    "validate.email": "Please enter a valid email address, for example you@example.com",
    "validate.name": "Please enter your name.",
    "validate.passwordShort": "Use at least 8 characters.",
    "validate.passwordLong": "That password is longer than the system accepts — please shorten it.",
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
    "error.invalid_input": "Some details are not right yet. Please check the marked field.",
    "error.forbidden": "Your account does not have access to this part yet.",
    "error.role_required": "This area is for administrators only.",
    "error.tier_required": "This feature is part of the Pro plan. Upgrade your shop's plan to use it.",
    "error.password_too_long": "That password is longer than the system accepts — please shorten it.",
    "error.network": "Could not reach the server. Please check your connection and try again.",
    "error.server": "The service is temporarily unavailable. Please try again in a moment.",
    "error.unknown": "Something went wrong. Please try again.",
    "error.token_expired": "Your session has expired. Please sign in again.",
    "error.token_invalid": "Your session is not valid. Please sign in again.",
    "error.not_signed_in": "Please sign in to use this part of LEBIS.",
    "error.user_not_found": "That account no longer exists. Please sign in again.",

    "action.retry": "Try again",
    "login.forgot": "Trouble signing in?",
    "login.remember": "Keep me signed in on this device",
    "login.rememberHint": "Best for your own phone or the shop's computer, so you do not sign in every day.",
    "validate.nameRequired": "Your name is required — please fill it in.",
    "validate.passwordRequired": "Please enter your password.",
    "validate.passwordLongLogin": "That is longer than any LEBIS password can be — check for extra characters.",
    "field.limit": "Maximum length reached — anything more will not be kept.",
    "field.tooLongBytes": "This is longer than the system accepts — please shorten it.",
    "field.show": "Show",
    "field.hide": "Hide",
    "account.title": "Your account",
    "account.subtitle": "The details LEBIS holds for your shop",
    "account.email": "Sign-in email",
    "account.name": "Your name",
    "account.noName": "No name set",
    "account.shop": "Shop name",
    "account.buildNote": "Equipment and borrow records are still being built. Once they are ready, your shop's items will appear here.",
    "account.noShop": "No shop name set",
    "account.edit": "Edit",
    "account.save": "Save",
    "account.saving": "Saving...",
    "account.cancel": "Cancel",
    "account.saved": "Saved.",
    "account.planTitle": "What your plan includes",
    "account.planFree":
      "Up to 50 items and 7 days of report history. LINE reminders and CSV export are not included.",
    "account.planPro":
      "Unlimited items, full report history, LINE reminders before each due date, and CSV export.",

    "help.tipsTitle": "Two quick things solve most sign-in problems",
    "help.tip1": "Is the email typed in full? Capital letters do not matter — either way signs you in.",
    "help.tip2": "Use the Show button beside the password field to check what you typed.",
    "help.title": "Help with signing in",
    "help.body":
      "Your shop's records are safe — nothing has been lost.",
    "help.note":
      "If neither helps, LEBIS cannot reset a password by itself yet — contact the LEBIS team and we will set a new one for you.",
    "help.noteNoChannel":
      "Self-service password reset is not available yet. If neither tip helped, register with a different email for now, and come back to this account once resets are switched on.",
    "help.contactLabel": "Contact the LEBIS team",
    "help.back": "Back to sign in",
    "help.register": "Register a new account",

    "state.loading": "Loading...",

    "template.title": "Page template",
    "template.subtitle": "Copy pages/template.js to start a new page",
    "template.addItem": "Add item",
    "template.addFirst": "Add the first item",
    "template.listTitle": "All items",
    "template.emptyTitle": "Nothing here yet",
    "template.emptyBody": "Once there is data it appears here. Until then this box is what the user sees.",
  },
};

// แปลข้อความหนึ่งคีย์ — ถ้าหาไม่เจอจะคืนคีย์กลับไป จะได้เห็นทันทีว่าลืมเติมคำไหน
export function translate(language, key) {
  const table = TEXT[language] || TEXT[DEFAULT_LANGUAGE];
  return table[key] ?? TEXT[DEFAULT_LANGUAGE][key] ?? key;
}
