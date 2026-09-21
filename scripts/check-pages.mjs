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

const BASE = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3000";

// หน้าที่ยังไม่ต้องเข้าสู่ระบบ กับหน้าที่ต้องเข้าสู่ระบบก่อน
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];
const PRIVATE_ROUTES = ["/account", "/template"];

// 🔴 ผู้ใช้จริงไม่ได้มาถึงหน้าเว็บด้วยเบราว์เซอร์เปล่าทุกครั้ง
//    เบราว์เซอร์ที่ใช้เทสเริ่มจากศูนย์เสมอ ส่วนคนใช้จริงพกของเก่ามาด้วย
//    บั๊กภาษากระพริบซ่อนตัวอยู่ตรงนี้ได้ทั้งรอบ เพราะไม่มีใครเทสในสภาพ "เคยมาแล้ว"
const PERSONAS = [
  { name: "มาครั้งแรก", cookies: [], storage: {} },
  { name: "เคยเลือกภาษาอังกฤษ", cookies: [{ name: "lebis_language", value: "en" }], storage: {} },
  { name: "ของเก่าอยู่ใน localStorage อย่างเดียว", cookies: [], storage: { lebis_language: "en", lebis_last_email: "old@example.com" } },
];

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  // 🔴 ข้ามแบบเงียบๆ แล้วออกด้วยรหัส 0 = ทุกคนที่ยังไม่ได้ติดตั้งจะเห็นเครื่องหมายถูก
  //    จากการตรวจที่ไม่เคยเปิดเบราว์เซอร์เลย ซึ่งแย่กว่าไม่มีการตรวจ
  //    เพราะรายการเช็กก่อนเปิด PR เขียนว่า "ตัวนี้เปิดหน้าจริง"
  //    ถ้าจะข้ามต้องตั้งใจข้าม: SKIP_PAGE_CHECK=1 node scripts/check-pages.mjs
  if (process.env.SKIP_PAGE_CHECK === "1") {
    console.log("⚠️  ข้ามการตรวจหน้าจริงตามที่สั่ง (SKIP_PAGE_CHECK=1)");
    process.exit(0);
  }
  console.error("❌ ยังไม่ได้ติดตั้ง playwright จึงตรวจหน้าจริงไม่ได้");
  console.error("   ติดตั้ง:  cd nextjs && npm i -D playwright && npx playwright install chromium");
  console.error("   ถ้าตั้งใจจะข้ามจริงๆ:  SKIP_PAGE_CHECK=1 node scripts/check-pages.mjs");
  process.exit(1);
}

const failures = [];
const browser = await chromium.launch();

for (const scheme of ["light", "dark"]) {
  for (const persona of PERSONAS) {
    for (const route of PUBLIC_ROUTES) {
    const label = `${route} (${scheme} · ${persona.name})`;
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: scheme,
      // เขตเวลาของคนใช้จริง ไม่ใช่ของเครื่องที่รันเทส — นี่คือจุดที่บั๊กวันที่ซ่อนอยู่
      timezoneId: "Asia/Bangkok",
      locale: "th-TH",
    });
    if (persona.cookies.length) {
      await context.addCookies(persona.cookies.map((c) => ({ ...c, url: BASE })));
    }
    if (Object.keys(persona.storage).length) {
      await context.addInitScript((data) => {
        try {
          for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
        } catch (error) {
          // เบราว์เซอร์ปิด localStorage ก็ข้ามไป
        }
      }, persona.storage);
    }
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
      // 🔴 ต้องเป็น "commit" ไม่ใช่ "networkidle"
      //    ของเดิมรอจนนิ่งก่อนค่อยถ่ายภาพแรก ซึ่งตอนนั้นการเปลี่ยนเนื้อหาจบไปแล้ว
      //    กฎนี้จึงไม่เคยจับอะไรได้เลย แม้แต่บั๊กที่มันถูกเขียนขึ้นมาเพื่อจับ
      response = await page.goto(BASE + route, { waitUntil: "commit", timeout: 20000 });
    } catch (error) {
      failures.push(`${label} เปิดไม่ได้: ${error.message.split("\n")[0]}`);
      await context.close();
      continue;
    }
    if (!response || response.status() >= 400) {
      failures.push(`${label} ตอบ ${response ? response.status() : "ไม่มีคำตอบ"}`);
    }

    // เนื้อหาต้องไม่เปลี่ยนเองหลังจากที่ผู้ใช้เริ่มเห็นมันแล้ว
    // เก็บภาพแรกให้เร็วที่สุด แล้วเฝ้าต่ออีก 3 วินาที
    // เทียบเฉพาะ "ตัวอักษร" ไม่เอาช่องว่างกับการขึ้นบรรทัด
    // เพราะก่อน CSS โหลดเสร็จ ข้อความชุดเดียวกันจะถูกตัดบรรทัดคนละแบบ
    // ซึ่งไม่ใช่การเปลี่ยนเนื้อหา ผู้ใช้ไม่ได้อ่านคำใหม่
    // ไม่เอาตัวพิมพ์ใหญ่ด้วย เพราะ text-transform: uppercase มีผลหลัง CSS โหลดเสร็จ
    // innerText จะคืนค่าตามที่แสดงจริง ทำให้ "Sample" กลายเป็น "SAMPLE"
    // ซึ่งเป็นการเปลี่ยนรูปแบบ ไม่ใช่เปลี่ยนคำ ผู้ใช้ไม่ได้อ่านข้อความคนละอัน
    const squash = (text) => text.replace(/\s+/g, "").toLowerCase();
    let first = null;
    let last = null;
    for (let i = 0; i < 30; i += 1) {
      const text = await page.evaluate(() => document.querySelector("main")?.innerText || null).catch(() => null);
      if (text) {
        if (first === null) first = squash(text);
        last = squash(text);
      }
      await page.waitForTimeout(100);
    }
    if (first !== null && first !== last) {
      failures.push(`${label} เนื้อหาเปลี่ยนเองหลังผู้ใช้เห็นแล้ว — เขาจะเห็นข้อความเปลี่ยนต่อหน้า`);
    }

    // ภาษาที่หน้าประกาศตัวเอง ต้องตรงกับภาษาที่วาดจริงตั้งแต่ต้น
    const langs = await page.evaluate(() => document.documentElement.lang);
    if (!["th", "en"].includes(langs)) {
      failures.push(`${label} <html lang> เป็น "${langs}" ซึ่งไม่ใช่ภาษาที่ระบบมี`);
    }

    // เลื่อนซ้ายขวาไม่ได้ที่จอมือถือ
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (overflow > 0) failures.push(`${label} ล้นออกนอกจอ ${overflow}px ที่ความกว้าง 390px`);

    for (const problem of problems) failures.push(`${label} ${problem}`);
    await context.close();
    }
  }
}

// หน้าหลังเข้าสู่ระบบ — ต้องล็อกอินจริงก่อน ไม่ใช่ยัด token ปลอม
// เพราะจุดที่เคยพังคือ "หน้าที่เซิร์ฟเวอร์วาดมาก่อน แล้วเบราว์เซอร์เปลี่ยนทีหลัง"
// ซึ่งจะเห็นก็ต่อเมื่อเดินเส้นทางเดียวกับผู้ใช้จริง
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: scheme,
    timezoneId: "Asia/Bangkok",
    locale: "th-TH",
  });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`JavaScript error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    const text = m.text();
    if (/Hydration|did not match|switch to client rendering/i.test(text)) problems.push(`hydration: ${text.slice(0, 120)}`);
    else if (m.type() === "error") problems.push(`console: ${text.slice(0, 120)}`);
  });

  try {
    await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.fill("#email", "demo@example.com");
    await page.fill("#password", "password");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/account", { timeout: 20000 });
  } catch (error) {
    failures.push(`เข้าสู่ระบบด้วยบัญชีตัวอย่างไม่สำเร็จ (${scheme}): ${error.message.split("\n")[0]}`);
    await context.close();
    continue;
  }

  for (const route of PRIVATE_ROUTES) {
    const label = `${route} (${scheme} · หลังเข้าสู่ระบบ)`;
    problems.length = 0;
    await page.goto(BASE + route, { waitUntil: "commit", timeout: 20000 });
    let first = null;
    let last = null;
    for (let i = 0; i < 25; i += 1) {
      const text = await page.evaluate(() => document.querySelector("main")?.innerText || null).catch(() => null);
      if (text) {
        if (first === null) first = text;
        last = text;
      }
      await page.waitForTimeout(100);
    }
    // หน้าเหล่านี้ขึ้นโครงรอก่อนแล้วค่อยมีข้อมูล จึงเทียบเฉพาะ "หลังมีข้อมูลแล้ว"
    // สิ่งที่ห้ามคือข้อความที่ผู้ใช้อ่านได้แล้วเปลี่ยนความหมาย ไม่ใช่โครงรอหายไป
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (overflow > 0) failures.push(`${label} ล้นออกนอกจอ ${overflow}px`);
    void first;
    void last;
    for (const problem of problems) failures.push(`${label} ${problem}`);
  }
  await context.close();
}

await browser.close();

if (failures.length === 0) {
  console.log(
    `✅ เปิดหน้าจริงแล้วสะอาด (${PUBLIC_ROUTES.length} หน้า x 2 โหมด x ${PERSONAS.length} แบบผู้ใช้` +
      `${PRIVATE_ROUTES.length ? ` + ${PRIVATE_ROUTES.length} หน้าหลังเข้าสู่ระบบ` : ""})`
  );
  process.exit(0);
}
console.error(`❌ พบปัญหาบนหน้าจริง ${failures.length} ข้อ\n`);
for (const line of failures) console.error("  " + line);
process.exit(1);
