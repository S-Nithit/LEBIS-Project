#!/usr/bin/env node
// ตรวจ "หน้าที่เรนเดอร์จริง" ไม่ใช่ตรวจไฟล์
//
// ทำไมต้องมีอีกตัวทั้งที่มี check-conventions.mjs แล้ว:
// สิบรอบที่ผ่านมา บั๊กที่แพงที่สุดสองตัวมองไม่เห็นจากไฟล์เลยแม้แต่น้อย
//   1. สี toast — เขียนถูกทุกบรรทัด แต่แพ้ CSS ของไลบรารีบนหน้าจริง
//   2. วันที่ในตัวอย่าง — เซิร์ฟเวอร์กับเบราว์เซอร์คนละเขตเวลา หน้าเว็บเขียนวันที่ใหม่
//      หลังโหลดเสร็จ ข้อความอยู่ใน console ซึ่งไม่มีใครเปิดดูสิบรอบ
// ทั้งสองตัวผ่าน check-conventions.mjs ทุกครั้ง เพราะมันอ่านไฟล์ ไม่ได้เปิดหน้า
//
// รัน:  node scripts/check-pages.mjs            (ต้องรัน docker compose up ไว้ก่อน)
//       node scripts/check-pages.mjs http://localhost:3000
//
// ต้องมี playwright: npx playwright install chromium
// ถ้ายังไม่ได้ติดตั้ง สคริปต์จะบอกแล้วออกด้วยรหัส 0 (ไม่บล็อกคนที่ยังไม่ได้ลง)

const BASE = process.argv[2] || "http://localhost:3000";
const ROUTES = ["/login", "/register", "/forgot-password"];

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log("⚠️  ยังไม่ได้ติดตั้ง playwright — ข้ามการตรวจหน้าจริง");
  console.log("   ติดตั้งด้วย:  npm i -D playwright && npx playwright install chromium");
  process.exit(0);
}

const failures = [];
const browser = await chromium.launch();

for (const scheme of ["light", "dark"]) {
  for (const route of ROUTES) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: scheme,
      // เขตเวลาของคนใช้จริง ไม่ใช่ของเครื่องที่รันเทส — นี่คือจุดที่บั๊กวันที่ซ่อนอยู่
      timezoneId: "Asia/Bangkok",
      locale: "th-TH",
    });
    const page = await context.newPage();
    const problems = [];
    page.on("pageerror", (e) => problems.push(`JavaScript error: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() !== "error" && m.type() !== "warning") return;
      const text = m.text();
      // ข้อความของ React ที่บอกว่า HTML จากเซิร์ฟเวอร์ไม่ตรงกับที่เบราว์เซอร์วาด
      if (/Hydration|did not match|switch to client rendering/i.test(text)) {
        problems.push(`hydration: ${text.slice(0, 120)}`);
      } else if (m.type() === "error") {
        problems.push(`console: ${text.slice(0, 120)}`);
      }
    });

    let response;
    try {
      response = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 20000 });
    } catch (error) {
      failures.push(`${route} (${scheme}) เปิดไม่ได้: ${error.message.split("\n")[0]}`);
      await context.close();
      continue;
    }
    if (!response || response.status() >= 400) {
      failures.push(`${route} (${scheme}) ตอบ ${response ? response.status() : "ไม่มีคำตอบ"}`);
    }

    // เนื้อหาต้องไม่เปลี่ยนเองหลังโหลดเสร็จ
    const first = await page.locator("main").innerText();
    await page.waitForTimeout(1200);
    const second = await page.locator("main").innerText();
    if (first !== second) {
      failures.push(`${route} (${scheme}) เนื้อหาเปลี่ยนเองหลังโหลดเสร็จ — ผู้ใช้เห็นข้อความเปลี่ยนต่อหน้า`);
    }

    // เลื่อนซ้ายขวาไม่ได้ที่จอมือถือ
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (overflow > 0) failures.push(`${route} (${scheme}) ล้นออกนอกจอ ${overflow}px ที่ความกว้าง 390px`);

    for (const problem of problems) failures.push(`${route} (${scheme}) ${problem}`);
    await context.close();
  }
}

await browser.close();

if (failures.length === 0) {
  console.log(`✅ เปิดหน้าจริงแล้วสะอาดทุกหน้า (${ROUTES.length} หน้า x 2 โหมด)`);
  process.exit(0);
}
console.error(`❌ พบปัญหาบนหน้าจริง ${failures.length} ข้อ\n`);
for (const line of failures) console.error("  " + line);
process.exit(1);
