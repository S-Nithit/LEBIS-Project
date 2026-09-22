// แปลง users.role ให้เป็น "สิ่งที่หน้าเว็บต้องรู้" ที่เดียว
//
// 🔴 ทำไมต้องรวมไว้ที่เดียว
//    เดิมมีสองที่อ่าน role แล้วตีความไม่ตรงกัน
//      - AppShell อ่านเป็น 3 ค่า (admin / pro / free)
//      - หน้าบัญชีอ่านเป็น 2 ค่า (free / ไม่ใช่ free)
//    ผลคือบัญชี admin เห็นป้ายว่า "ผู้ดูแลระบบ" แต่ข้อความข้างล่างบอกว่าได้สิทธิ์
//    แพ็กเกจ Pro ทั้งชุด ทั้งที่ admin ไม่ได้ซื้อแพ็กเกจอะไร
//    และถ้า role เป็นค่าที่ไม่รู้จัก ป้ายจะบอกว่า "ฟรี" แต่ข้อความบอกว่า "Pro"
//    สองอย่างนี้อยู่บนจอเดียวกัน อ่านจากฟิลด์เดียวกัน แล้วขัดกันเอง
//
// 🔴 ค่าที่ไม่รู้จักต้องตกไปทาง "ฟรี" เสมอ
//    เพราะนี่คือคำกล่าวอ้างว่าลูกค้าจ่ายเงินซื้ออะไรไว้ ถ้าเดาผิดทางสูง
//    ระบบจะสัญญาสิ่งที่เขาไม่ได้ซื้อ ซึ่งแก้ยากกว่าการให้สิทธิ์น้อยไปหนึ่งขั้น

export function planFor(role, t) {
  if (role === "admin") {
    return { tier: "admin", label: t("role.admin"), tone: "accent", copyKey: "account.planAdmin" };
  }
  if (role === "pro") {
    return { tier: "pro", label: t("role.pro"), tone: "accent", copyKey: "account.planPro" };
  }
  return { tier: "free", label: t("role.free"), tone: "neutral", copyKey: "account.planFree" };
}
