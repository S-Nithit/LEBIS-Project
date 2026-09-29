// หน้า Landing Page — หน้าแรกของ LEBIS สำหรับแนะนำระบบและแพ็กเกจราคา
// ออกแบบตามระบบดีไซน์ docs/brand.md และ Figma UI Mockup
//
// โครงสร้างหน้า:
//   1. Navigation bar: โลโก้, ป้าย RENTAL OS, ลิงก์นำทาง, ปุ่มสลับภาษา, ลิงก์ Login, ปุ่มสมัคร
//   2. Hero Section: คำโปรยแก้ปัญหา, พาดหัวหลัก, ปุ่มเริ่มใช้งานฟรี, จุดเด่น 3 ข้อ
//   3. Features Section: การ์ด 3 ฟีเจอร์หลัก (ของบนชั้น, แจ้งเตือน LINE, ประวัติการเช่า)
//   4. Pricing Section: ตารางเทียบแพ็กเกจ Free vs Pro
//   5. Footer: ข้อมูลลิขสิทธิ์และลิงก์ไปยังหน้าเข้าสู่ระบบ

import Head from "next/head";
import Link from "next/link";

import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/useLanguage";

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col selection:bg-amber/20">
      <Head>
        <title>LEBIS — {t("brand.tagline")}</title>
        <meta
          name="description"
          content={t("landing.hero.description")}
        />
      </Head>

      {/* ── แถบนำทางด้านบน (Navbar) ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="app-container flex h-16 items-center justify-between gap-4">
          {/* ฝั่งซ้าย: โลโก้ และ ป้ายกำกับ RENTAL OS */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-2 focus-visible:outline-none"
              aria-label="LEBIS Home"
            >
              <Logo size={32} />
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-badge border border-line-strong px-2 py-0.5 text-eyebrow font-semibold text-muted tracking-wider">
              {t("landing.nav.badge")}
            </span>
          </div>

          {/* ฝั่งขวา: ลิงก์นำทาง, ปุ่มสลับภาษา และปุ่ม Action */}
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main Navigation">
            <a
              href="#features"
              className="hidden md:inline-flex min-h-[44px] items-center px-3 text-label font-medium text-muted hover:text-ink transition-colors"
            >
              {t("landing.nav.features")}
            </a>
            <a
              href="#pricing"
              className="hidden md:inline-flex min-h-[44px] items-center px-3 text-label font-medium text-muted hover:text-ink transition-colors"
            >
              {t("landing.nav.pricing")}
            </a>

            <LanguageToggle />

            <Button asChild variant="ghost" className="min-h-[44px] px-3 text-label">
              <Link href="/login">{t("landing.nav.login")}</Link>
            </Button>

            <Button
              asChild
              className="min-h-[44px] px-4 text-label"
            >
              <Link href="/register">{t("landing.nav.getStarted")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── 1. Hero Section ────────────────────────────────────────── */}
        <section className="py-16 sm:py-24 lg:py-28 border-b border-line">
          <div className="app-container text-center">
            {/* ป้ายด้านบนหัวข้อหลัก */}
            <div className="inline-flex items-center gap-2 rounded-badge border border-line bg-surface px-4 py-1.5 text-label font-medium text-muted mb-6">
              <span>{t("landing.hero.pill")}</span>
            </div>

            {/* หัวข้อหลัก */}
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink max-w-4xl mx-auto leading-[1.15]">
              {t("landing.hero.title")}
            </h1>

            {/* รายละเอียดคำอธิบาย */}
            <p className="mt-6 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              {t("landing.hero.description")}
            </p>

            {/* ปุ่ม Call-to-Action */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto sm:max-w-none">
              <Button
                asChild
                className="w-full sm:w-auto min-h-[44px] px-6 text-body font-medium"
              >
                <Link href="/register">{t("landing.hero.ctaPrimary")}</Link>
              </Button>

              <Button
                asChild
                variant="secondary"
                className="w-full sm:w-auto min-h-[44px] px-6 text-body font-medium"
              >
                <a href="#pricing">{t("landing.hero.ctaSecondary")}</a>
              </Button>
            </div>

            {/* จุดเด่น 3 ข้อ (Trust items) */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-label text-muted">
              <div className="inline-flex items-center gap-2">
                <span className="text-base" role="img" aria-hidden="true">📦</span>
                <span>{t("landing.hero.trust1")}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="text-base" role="img" aria-hidden="true">💬</span>
                <span>{t("landing.hero.trust2")}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="text-base" role="img" aria-hidden="true">👥</span>
                <span>{t("landing.hero.trust3")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Features Section ────────────────────────────────────── */}
        <section id="features" className="py-16 sm:py-24 border-b border-line bg-surface/50">
          <div className="app-container">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center rounded-badge border border-line bg-surface px-3 py-1 text-eyebrow font-semibold text-muted mb-3">
                {t("landing.features.pill")}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                {t("landing.features.title")}
              </h2>
              <p className="mt-2 text-body text-muted">
                {t("landing.features.subtitle")}
              </p>
            </div>

            {/* การ์ดฟีเจอร์ 3 ใบ */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* การ์ด 1: รู้ของว่างบนชั้น */}
              <div className="rounded-card border border-line bg-surface p-6 sm:p-8 flex flex-col justify-between transition-all hover:border-line-strong">
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-badge border border-line bg-paper text-ink mb-6">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-bold text-ink mb-3">
                    {t("landing.features.card1.title")}
                  </h3>
                  <p className="text-body text-muted leading-relaxed">
                    {t("landing.features.card1.desc")}
                  </p>
                </div>
              </div>

              {/* การ์ด 2: แจ้งเตือน LINE อัตโนมัติ */}
              <div className="rounded-card border border-line bg-surface p-6 sm:p-8 flex flex-col justify-between transition-all hover:border-line-strong">
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-badge border border-line bg-paper text-ink mb-6">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-bold text-ink mb-3">
                    {t("landing.features.card2.title")}
                  </h3>
                  <p className="text-body text-muted leading-relaxed">
                    {t("landing.features.card2.desc")}
                  </p>
                </div>
              </div>

              {/* การ์ด 3: ประวัติการเช่าชัดเจน */}
              <div className="rounded-card border border-line bg-surface p-6 sm:p-8 flex flex-col justify-between transition-all hover:border-line-strong">
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-badge border border-line bg-paper text-ink mb-6">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-bold text-ink mb-3">
                    {t("landing.features.card3.title")}
                  </h3>
                  <p className="text-body text-muted leading-relaxed">
                    {t("landing.features.card3.desc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Pricing Section ─────────────────────────────────────── */}
        <section id="pricing" className="py-16 sm:py-24">
          <div className="app-container">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center rounded-badge border border-line bg-surface px-3 py-1 text-eyebrow font-semibold text-muted mb-3">
                {t("landing.pricing.pill")}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                {t("landing.pricing.title")}
              </h2>
              <p className="mt-2 text-body text-muted">
                {t("landing.pricing.subtitle")}
              </p>
            </div>

            {/* ตารางเทียบราคา 2 คอลัมน์ */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
              {/* แพ็กเกจ Free */}
              <div className="rounded-card border border-line bg-surface p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="inline-flex rounded-badge border border-line bg-paper px-3 py-1 text-label font-medium text-muted mb-4">
                    {t("landing.pricing.free.badge")}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-ink">
                    {t("landing.pricing.free.name")}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-ink">
                      {t("landing.pricing.free.price")}
                    </span>
                    <span className="text-caption text-muted">
                      {t("landing.pricing.free.period")}
                    </span>
                  </div>
                  <p className="mt-2 text-caption text-muted">
                    {t("landing.pricing.free.desc")}
                  </p>

                  <div className="my-6 border-t border-line" />

                  <ul className="space-y-3 text-label" role="list">
                    <li className="flex items-center gap-3">
                      <span className="text-success font-bold" aria-hidden="true">✓</span>
                      <span>{t("landing.pricing.free.f1")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-success font-bold" aria-hidden="true">✓</span>
                      <span>{t("landing.pricing.free.f2")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-success font-bold" aria-hidden="true">✓</span>
                      <span>{t("landing.pricing.free.f3")}</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted">
                      <span className="text-muted font-bold" aria-hidden="true">—</span>
                      <span>{t("landing.pricing.free.f4")}</span>
                    </li>
                    <li className="flex items-center gap-3 text-muted">
                      <span className="text-muted font-bold" aria-hidden="true">—</span>
                      <span>{t("landing.pricing.free.f5")}</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <Button asChild variant="secondary" className="w-full min-h-[44px]">
                    <Link href="/register">{t("landing.pricing.free.cta")}</Link>
                  </Button>
                </div>
              </div>

              {/* แพ็กเกจ Pro */}
              <div className="rounded-card border border-line-strong bg-surface p-6 sm:p-8 flex flex-col justify-between relative">
                <div>
                  <div className="inline-flex rounded-badge border border-amber/40 bg-surface px-3 py-1 text-label font-semibold text-amber-text mb-4">
                    {t("landing.pricing.pro.badge")}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-ink">
                    {t("landing.pricing.pro.name")}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-amber-text">
                      {t("landing.pricing.pro.price")}
                    </span>
                    <span className="text-caption text-muted">
                      {t("landing.pricing.pro.period")}
                    </span>
                  </div>
                  <p className="mt-2 text-caption text-muted">
                    {t("landing.pricing.pro.desc")}
                  </p>

                  <div className="my-6 border-t border-line" />

                  <ul className="space-y-3 text-label" role="list">
                    <li className="flex items-center gap-3">
                      <span className="text-success font-bold" aria-hidden="true">✓</span>
                      <span>{t("landing.pricing.pro.f1")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-success font-bold" aria-hidden="true">✓</span>
                      <span>{t("landing.pricing.pro.f2")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-success font-bold" aria-hidden="true">✓</span>
                      <span>{t("landing.pricing.pro.f3")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-success font-bold" aria-hidden="true">✓</span>
                      <span>{t("landing.pricing.pro.f4")}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-success font-bold" aria-hidden="true">✓</span>
                      <span>{t("landing.pricing.pro.f5")}</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <Button
                    asChild
                    className="w-full min-h-[44px] font-medium"
                  >
                    <Link href="/register">{t("landing.pricing.pro.cta")}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── ท้ายหน้า (Footer) ────────────────────────────────────────── */}
      <footer className="border-t border-line bg-surface py-8">
        <div className="app-container flex flex-col sm:flex-row items-center justify-between gap-4 text-caption text-muted">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span>{t("landing.footer.text")}</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="inline-flex min-h-[44px] items-center text-muted hover:text-ink transition-colors">
              {t("landing.nav.login")}
            </Link>
            <Link href="/register" className="inline-flex min-h-[44px] items-center text-muted hover:text-ink transition-colors">
              {t("landing.nav.getStarted")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
