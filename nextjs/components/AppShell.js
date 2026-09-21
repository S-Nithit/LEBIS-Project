// โครงหน้าหลักของทุกหน้าที่ต้องเข้าสู่ระบบก่อน
// แถบหัวเว็บสีหมึกเข้ม มีโลโก้ซ้าย ชื่อผู้ใช้กับปุ่มออกจากระบบขวา
// เนื้อหาของหน้าอยู่ข้างล่างบนพื้น --paper (ตาม docs/brand.md หัวข้อ 5)
//
// วิธีใช้ (คัดลอกทั้งก้อนนี้ไปเริ่มหน้าใหม่ได้เลย)
//
//   import { AppShell } from "@/components/AppShell";
//   import { PageHeader } from "@/components/PageHeader";
//   import { useAuth } from "@/lib/useAuth";
//
//   export default function Workspace() {
//     const { user, loading, logout } = useAuth({ redirectTo: "/login" });
//     if (loading) return null;
//
//     return (
//       <AppShell user={user} onLogout={logout}>
//         <PageHeader title="อุปกรณ์ทั้งหมด" description="..." />
//         {/* เนื้อหาของหน้าใส่ตรงนี้ */}
//       </AppShell>
//     );
//   }

import Link from "next/link";

import { Logo } from "@/components/Logo";
import { StatusBadge } from "@/components/StatusBadge";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/useLanguage";

// แปลง role ที่ได้จาก API เป็นคำที่ผู้ใช้อ่านรู้เรื่อง
function planLabel(role, t) {
  if (role === "admin") return t("role.admin");
  if (role === "pro") return t("role.pro");
  return t("role.free");
}

export function AppShell({ user, onLogout, children }) {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* แถบหัวเว็บ — พื้นสีหมึก โลโก้ใช้ variant dark */}
      <header className="sticky top-0 z-20 bg-header-bg text-header-fg">
        <div className="app-container flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="LEBIS" className="rounded-control">
            <Logo variant="dark" size={26} />
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden items-center gap-3 md:flex">
                <span className="text-label text-header-fg/85">
                  {user.shop_name || user.name || user.email}
                </span>
                {/* ป้ายแพ็กเกจ — Pro ได้สีอำพัน ซึ่งเป็นไฮไลต์จุดเดียวของแถบนี้ */}
                <StatusBadge tone={user.role === "free" ? "neutral" : "accent"}>
                  {planLabel(user.role, t)}
                </StatusBadge>
              </div>
            ) : null}

            <LanguageToggle onDark />

            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="btn btn-sm min-h-[44px] rounded-control border border-header-fg/30 bg-transparent px-4 text-header-fg hover:border-header-fg/70"
              >
                {t("nav.logout")}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="app-container w-full flex-1 py-5 md:py-6">{children}</main>

      <footer className="border-t border-line py-5">
        <div className="app-container flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="t-caption">{t("brand.tagline")}</span>
          {/* ชื่อผู้ใช้ย้ายมาท้ายหน้าบนจอมือถือ แทนที่จะอัดไว้ในแถบบน */}
          {user ? (
            <span className="t-caption md:hidden">
              {user.email} · {planLabel(user.role, t)}
            </span>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
