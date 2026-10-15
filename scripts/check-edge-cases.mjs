#!/usr/bin/env node
// ยิงกรณีที่อาจารย์จะเทสสดตอนพรีเซนต์ ใส่ระบบจริง แล้วบอกว่าผ่านครบมั้ย
//
// ทำไมต้องมี: วันพรีเซนต์อาจารย์ลองกรณีขอบด้วยตัวเอง ถ้าตัวไหนหลุดบนเวที
// แก้ไม่ทันแล้ว — รันตัวนี้ก่อนขึ้นเวที (เย็นวันก่อน + เช้าวันจริง)
//
// รัน:  DEMO_PASSWORD=<รหัสบัญชีเดโม> node scripts/check-edge-cases.mjs
//       DEMO_PASSWORD=... node scripts/check-edge-cases.mjs http://localhost:3000
//
// 🔴 รหัสผ่านส่งผ่าน env เท่านั้น ห้ามเขียนลงไฟล์นี้ (repo ไม่มี secret)
//
// สคริปต์นี้ไม่เปลี่ยนข้อมูลอะไรเลย: คำขอที่เขียนข้อมูลทุกตัวคาดว่าจะโดนบล็อก (403)
// ถ้าตัวไหนผ่านเข้าไปได้ = บั๊ก และสคริปต์จะบอกว่า "ไม่ผ่าน"

const BASE = (process.argv.find((a) => a.startsWith("http")) || "https://lebis-project.vercel.app") + "/api";
const PASSWORD = process.env.DEMO_PASSWORD;
const FREE = "demo-free@lebis-demo.com";
const PRO = "demo-pro@lebis-demo.com";

if (!PASSWORD) {
  console.error("ต้องตั้ง DEMO_PASSWORD ก่อนรัน");
  process.exit(1);
}

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  const token = body.access_token || body.token;
  if (!token) throw new Error(`เข้าสู่ระบบ ${email} ไม่ได้ (${res.status})`);
  return token;
}

const free = await login(FREE);
const pro = await login(PRO);
const auth = (t) => ({ Authorization: `Bearer ${t}` });

// ร้าน Free ต้องมีของครบ 50 ชิ้นพอดี ไม่งั้นกรณี "เพิ่มชิ้นที่ 51" ไม่ได้เทสอะไรเลย
const summary = await (await fetch(`${BASE}/items/summary`, { headers: auth(free) })).json();

// [ชื่อกรณี, path, ตัวเลือก fetch, status ที่ต้องได้]
const CASES = [
  ["Free เพิ่มอุปกรณ์ชิ้นที่ 51", "/items", {
    method: "POST",
    headers: { ...auth(free), "content-type": "application/json" },
    body: JSON.stringify({ code: "EDGE-051", name: "Edge test", category: "test", total: 1, daily_rate: 1 }),
  }, 403],
  ["Free ขอรหัสผูก LINE", "/line/link-code", { method: "POST", headers: auth(free) }, 403],
  ["Free ส่ง LINE ทดสอบ", "/line/test", { method: "POST", headers: auth(free) }, 403],
  ["Free ส่ง LINE สรุปรายวัน", "/line/digest", { method: "POST", headers: auth(free) }, 403],
  ["Free ส่งออก CSV", "/reports/rentals.csv", { headers: auth(free) }, 403],
  ["Free เข้า admin", "/admin/overview", { headers: auth(free) }, 403],
  ["Pro (ไม่ใช่ admin) เข้า admin", "/admin/overview", { headers: auth(pro) }, 403],
  ["ไม่มี token ดูอุปกรณ์", "/items", {}, 401],
  ["ไม่มี token เข้า admin", "/admin/overview", {}, 401],
  ["token ปลอม", "/items", { headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.bad" } }, 401],
  ["Pro ส่งออก CSV (ต้องได้)", "/reports/rentals.csv", { headers: auth(pro) }, 200],
  ["Pro ดูสถานะ LINE (ต้องได้)", "/line/status", { headers: auth(pro) }, 200],
];

let failed = 0;
const itemsOk = summary.item_rows === 50 && summary.item_limit === 50;
console.log(`${itemsOk ? "✅" : "❌"} ร้าน Free มีของ ${summary.item_rows}/${summary.item_limit} ชิ้น`);
if (!itemsOk) failed++;

for (const [name, path, opts, want] of CASES) {
  const res = await fetch(BASE + path, opts);
  const ok = res.status === want;
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} ${name} → ${res.status}${ok ? "" : ` (ต้องได้ ${want})`}`);
}

// Pro ต้องผูก LINE แล้ว ไม่งั้นโชว์ข้อความ LINE บนเวทีไม่ได้
const line = await (await fetch(`${BASE}/line/status`, { headers: auth(pro) })).json();
console.log(`${line.linked ? "✅" : "❌"} ร้าน Pro ผูก LINE แล้ว`);
if (!line.linked) failed++;

console.log(failed ? `\n❌ ไม่ผ่าน ${failed} ข้อ` : "\n✅ ผ่านครบ พร้อมขึ้นเวที");
process.exit(failed ? 1 : 0);
