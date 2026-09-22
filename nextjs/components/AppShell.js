// โครงหน้าหลักของทุกหน้าที่ต้องเข้าสู่ระบบก่อน
// แถบหัวเว็บสีหมึกเข้ม มีโลโก้ซ้าย ชื่อผู้ใช้กับปุ่มออกจากระบบขวา
// เนื้อหาของหน้าอยู่ข้างล่างบนพื้น --paper (ตาม docs/brand.md หัวข้อ 5)
//
// วิธีใช้ — อย่าคัดลอกจากคอมเมนต์ตรงนี้
// ก้อนตัวอย่างที่รันได้จริงอยู่ที่ pages/template.js เปิดไฟล์นั้นแล้วก็อปทั้งไฟล์
// (ไฟล์นั้นถูก build ทุกครั้งที่ build โปรเจกต์ ถ้ามันพัง จะพังตอน build ไม่ใช่
//  ตอนเพื่อนก็อปไปใช้แล้วเจอจอขาว — คอมเมนต์ในไฟล์ไม่มีใครตรวจให้)

import Link from "next/link";

import { Logo } from "@/components/Logo";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { planFor } from "@/lib/plan";
import { useLanguage } from "@/lib/useLanguage";

export function AppShell({ user, onLogout, children }) {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* แถบหัวเว็บ — พื้นสีหมึก โลโก้ใช้ variant dark */}
      <header className="sticky top-0 z-20 bg-header-bg text-header-fg">
        <div className="app-container flex h-16 items-center justify-between gap-4">
          {/* โลโก้พากลับหน้าบัญชี ไม่ใช่ "/" เพราะหน้าแรกยังเป็นหน้าตัวอย่างของ boilerplate
              เมื่อหน้า workspace ของ Neo เสร็จแล้วให้เปลี่ยนปลายทางตรงนี้ */}
          <Link
            href="/account"
            aria-label="LEBIS"
            className="inline-flex min-h-[44px] items-center rounded-control"
          >
            <Logo variant="dark" size={26} />
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden items-center gap-3 md:flex">
                <span className="text-label text-header-fg">
                  {user.shop_name || user.name || user.email}
                </span>
                {/* ป้ายแพ็กเกจ — Pro ได้สีอำพัน ซึ่งเป็นไฮไลต์จุดเดียวของแถบนี้ */}
                <StatusBadge tone={planFor(user.role, t).tone}>
                  {planFor(user.role, t).label}
                </StatusBadge>
              </div>
            ) : null}

            {onLogout ? (
              <Button variant="onDark" onClick={onLogout}>
                {t("nav.logout")}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="app-container w-full flex-1 py-5 md:py-6">{children}</main>

      <footer className="border-t border-line py-5">
        <div className="app-container flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="t-caption">{t("brand.tagline")}</span>

          {/* ทางเข้าความช่วยเหลือ มีอยู่ในทุกหน้าที่ใช้ AppShell
              🔴 ป้ายต้องตรงกับหัวข้อของหน้าปลายทาง ไม่ใช่แค่ "ต้องการความช่วยเหลือ"
                 ลอยๆ เพราะหน้าปลายทางพูดเรื่องการเข้าใช้งานอย่างเดียว
                 ป้ายที่สัญญากว้างกว่าของที่มีจริง คือการหลอกให้กดแล้วผิดหวัง */}
          <Link
            href="/forgot-password"
            className="t-caption inline-flex min-h-[44px] items-center underline underline-offset-4 hover:no-underline"
          >
            {t("nav.helpSignedIn")}
          </Link>
          {/* ชื่อผู้ใช้ย้ายมาท้ายหน้าบนจอมือถือ แทนที่จะอัดไว้ในแถบบน */}
          {user ? (
            // 🔴 ต้องตัดคำได้ อีเมลยาวๆ ที่ไม่มีขีดกลางตัดบรรทัดเองไม่ได้
            //    วัดที่ 320px: อีเมล 53 ตัวอักษรดันทั้งหน้าให้เลื่อนซ้ายขวาได้ 60px
            //    ที่ไม่เคยเจอเพราะทุกการทดสอบล็อกอินด้วย demo@example.com ซึ่งสั้น
            <span className="t-caption min-w-0 break-all md:hidden">
              {user.email} · {planFor(user.role, t).label}
            </span>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
