// โครงหน้าหลักของทุกหน้าที่ต้องเข้าสู่ระบบก่อน
// แถบหัวเว็บสีหมึกเข้ม มีโลโก้ซ้าย ชื่อผู้ใช้กับปุ่มออกจากระบบขวา
// เนื้อหาของหน้าอยู่ข้างล่างบนพื้น --paper (ตาม docs/brand.md หัวข้อ 5)
//
// วิธีใช้ — อย่าคัดลอกจากคอมเมนต์ตรงนี้
// ก้อนตัวอย่างที่รันได้จริงอยู่ที่ pages/template.js เปิดไฟล์นั้นแล้วก็อปทั้งไฟล์
// (ไฟล์นั้นถูก build ทุกครั้งที่ build โปรเจกต์ ถ้ามันพัง จะพังตอน build ไม่ใช่
//  ตอนเพื่อนก็อปไปใช้แล้วเจอจอขาว — คอมเมนต์ในไฟล์ไม่มีใครตรวจให้)

import Link from "next/link";
import { useRouter } from "next/router";

import { Logo } from "@/components/Logo";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { planFor } from "@/lib/plan";
import { useLanguage } from "@/lib/useLanguage";
import { cn } from "@/lib/utils";

// เมนูหลักของหน้าที่ต้องเข้าสู่ระบบ — เพิ่มหน้าใหม่ให้เติมแถวในนี้แถวเดียว
const NAV_ITEMS = [
  { href: "/workspace", key: "nav.workspace" },
  { href: "/reports", key: "nav.reports" },
  { href: "/account", key: "nav.account" },
];

export function AppShell({ user, onLogout, children }) {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* ลิงก์ข้ามไปเนื้อหา — มองไม่เห็นจนกว่าจะกด Tab ถึงมัน
          คนที่ใช้คีย์บอร์ดจะได้ไม่ต้องไล่ผ่านโลโก้ ชื่อร้าน และปุ่มออกจากระบบ
          ทุกครั้งที่เปลี่ยนหน้า */}
      <a
        href="#main"
        className="sr-only inline-flex min-h-[44px] items-center px-4 focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-30 focus:rounded-control focus:bg-surface focus:text-ink"
      >
        {t("nav.skipToContent")}
      </a>
      {/* แถบหัวเว็บ — พื้นสีหมึก โลโก้ใช้ variant dark */}
      <header className="sticky top-0 z-20 bg-header-bg text-header-fg">
        <div className="app-container flex h-16 items-center justify-between gap-4">
          {/* โลโก้พากลับหน้าอุปกรณ์ ซึ่งเป็นหน้าที่ร้านใช้ทั้งวัน
              ไม่ใช่ "/" เพราะหน้านั้นเป็นหน้าขายของสำหรับคนที่ยังไม่ได้สมัคร */}
          <Link
            href="/workspace"
            aria-label="LEBIS"
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-control"
          >
            <Logo variant="dark" size={26} />
          </Link>

          <div className="flex min-w-0 items-center gap-3">
            {user ? (
              <div className="flex min-w-0 items-center gap-3">
                {/* 🔴 ต้องเห็นบนมือถือด้วย ไม่ใช่เฉพาะจอคอม
                       เดิมเป็น hidden md:flex ผลคือบนเครื่องที่หน้าร้าน ซึ่งพนักงาน
                       หลายคนใช้ร่วมกัน ไม่มีอะไรบอกเลยว่าตอนนี้เปิดบัญชีของใครอยู่
                       จนกว่าจะเลื่อนลงไปท้ายหน้า (วัดได้ที่ 801px ของจอสูง 844px)
                       ชื่อร้านยาวๆ ตัดท้ายเอา ดีกว่าไม่บอกอะไรเลย */}
                <span className="min-w-0 truncate text-label text-header-fg">
                  {user.shop_name || user.name || user.email}
                </span>
                {/* ป้ายแพ็กเกจ — Pro ได้สีอำพัน ซึ่งเป็นไฮไลต์จุดเดียวของแถบนี้
                    บนมือถือซ่อนไว้ เพราะการ์ดในหน้าบัญชีบอกแพ็กเกจอยู่แล้ว
                    และพื้นที่บนแถบหัวเว็บต้องเหลือให้ชื่อร้านก่อน */}
                <span className="hidden md:block">
                  <StatusBadge tone={planFor(user.role, t).tone}>
                    {planFor(user.role, t).label}
                  </StatusBadge>
                </span>
              </div>
            ) : null}

            {onLogout ? (
              // shrink-0 + nowrap: บนจอ 390px ปุ่มเคยถูกบีบจน "ออกจากระบบ" ตกเป็นสองบรรทัด
              // ให้ชื่อร้านเป็นฝ่ายถูกตัดท้ายแทน
              <Button variant="onDark" onClick={onLogout} className="shrink-0 whitespace-nowrap">
                {t("nav.logout")}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {/* เมนูหลัก — แถวที่สองใต้แถบหัวเว็บ เพราะแถวบนบนมือถือเต็มแล้ว
          (โลโก้ + ชื่อร้าน + ปุ่มออกจากระบบ) ถ้ายัดเมนูเข้าไปอีก ชื่อร้านจะถูกตัดจนอ่านไม่ออก
          บนมือถือแบ่งสามช่องเท่ากัน ทุกช่องสูงอย่างน้อย 44px ตามเกณฑ์ของ brand.md
          aria-current บอกโปรแกรมอ่านหน้าจอว่าตอนนี้อยู่หน้าไหน ไม่ใช่แค่ใช้สีบอก */}
      {user ? (
        <nav aria-label={t("nav.main")} className="border-b border-line bg-surface">
          <div className="app-container grid grid-cols-4 sm:flex sm:gap-2">
            {NAV_ITEMS.map((item) => {
              const active = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-[44px] items-center justify-center border-b-2 px-3 text-label font-medium",
                    active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
                  )}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      <main id="main" className="app-container w-full flex-1 py-5 md:py-6">{children}</main>

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
          {/* บรรทัดนี้เคยมีเพราะแถบหัวเว็บซ่อนชื่อร้านบนมือถือ พอย้ายชื่อร้านขึ้นไป
              อยู่บนแถบทุกขนาดจอแล้ว มันก็กลายเป็นการบอกตัวตนซ้ำรอบที่สาม
              ในจอเดียว (แถบหัวเว็บ + แถวอีเมลในการ์ด + บรรทัดนี้) จึงเอาออก */}
        </div>
      </footer>
    </div>
  );
}
