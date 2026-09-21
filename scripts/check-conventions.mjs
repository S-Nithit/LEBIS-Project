#!/usr/bin/env node
// ตรวจกฎที่เคยเขียนไว้ในคอมเมนต์แล้วไม่มีใครบังคับใช้
//
// ทำไมต้องมีไฟล์นี้: กฎของโปรเจกต์นี้อยู่ใน docs/brand.md และในคอมเมนต์หัวไฟล์
// ซึ่งอ่านแล้วเข้าใจง่ายดี แต่ "คอมเมนต์ทำให้ build พังไม่ได้" ของที่ตรวจไม่ได้
// จะค่อยๆ เพี้ยนออกจากกฎทีละนิดโดยไม่มีใครเห็น จนวันหนึ่งเอกสารกับโค้ดพูดคนละเรื่อง
// เคยเกิดมาแล้วสามรอบติดกัน ไฟล์นี้คือการย้ายกฎจากคอมเมนต์มาเป็นของที่รันได้
//
// รัน:  node scripts/check-conventions.mjs
// ออก 0 = ผ่าน · ออก 1 = มีข้อที่ยังไม่ผ่าน (พิมพ์บอกว่าไฟล์ไหนบรรทัดไหน)

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const WEB = join(ROOT, "nextjs");
const failures = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".js") || name.endsWith(".jsx")) out.push(full);
  }
  return out;
}

const files = walk(WEB).map((f) => ({ path: f, rel: relative(ROOT, f), text: readFileSync(f, "utf8") }));

function fail(rule, rel, line, detail) {
  failures.push(`${rel}:${line}  [${rule}] ${detail}`);
}

function eachLine(file, fn) {
  file.text.split("\n").forEach((line, i) => fn(line, i + 1));
}

// ── กฎ 1 · ความล้มเหลวขึ้นในหน้า ไม่ใช่ toast (docs/brand.md หัวข้อ 6)
//    รวมถึงในคอมเมนต์ด้วย เพราะคอมเมนต์คือสิ่งที่เพื่อนก็อปไปใช้
for (const file of files) {
  eachLine(file, (line, n) => {
    if (line.includes("toast.error")) fail("no-toast-error", file.rel, n, "ใช้ toast บอกความล้มเหลว ให้ขึ้นในหน้าแทน");
  });
}

// ── กฎ 2 · error.field ต้องผ่าน fieldToInputId() เสมอ
//    backend ใช้ shop_name แต่ id ของ input คือ shopName ถ้าไม่แปลง หน้าจะเงียบสนิท
for (const file of files) {
  if (file.rel.endsWith("lib/api.js")) continue;
  eachLine(file, (line, n) => {
    // ที่ห้ามคือ "เอาค่าไปใช้เป็น id ของช่อง" ไม่ใช่การเช็กว่ามีค่าไหม
    // หรือการอ่านค่ามาเก็บในตัวแปรก่อน
    const usesAsId = /setErrors\s*\(|getElementById\s*\(|focusField\s*\(/.test(line);
    if (!usesAsId) return;
    if (/\berror\??\.field\b/.test(line) && !line.includes("fieldToInputId")) {
      fail("field-id-mapping", file.rel, n, "ใช้ error.field ดิบ ต้องห่อด้วย fieldToInputId()");
    }
  });
}

// ── กฎ 3 · <FormError> ทุกที่ต้องมีทางให้ลองใหม่
for (const file of files) {
  if (file.rel.endsWith("components/FormError.js")) continue;
  const re = /<FormError\b[^>]*?\/>/gs;
  for (const match of file.text.matchAll(re)) {
    const n = file.text.slice(0, match.index).split("\n").length;
    if (!match[0].includes("onRetry") || !match[0].includes("retrying")) {
      fail("formerror-retry", file.rel, n, "ขาด onRetry หรือ retrying — กล่องบอกว่าพังแล้วไม่มีปุ่มให้กด");
    }
  }
}

// ── กฎ 4 · สีต้องมาจาก token ไม่ใช่เขียนค่าลงหน้า
for (const file of files) {
  if (file.rel.endsWith("components/Logo.js")) continue; // โลโก้ใช้สีตายตัวตาม brand.md หัวข้อ 1
  eachLine(file, (line, n) => {
    // <meta name="theme-color"> รับค่า CSS variable ไม่ได้ ต้องเป็นค่าสีตรงๆ เท่านั้น
    if (line.includes("theme-color")) return;
    if (/#[0-9a-fA-F]{6}\b/.test(line)) fail("no-hardcoded-color", file.rel, n, "เขียนค่าสีลงไฟล์โดยตรง ให้ใช้ token ใน globals.css");
  });
}

// ── กฎ 5 · ข้อความสองภาษาต้องมีคีย์ครบเท่ากัน และไม่มีคีย์ที่ไม่มีใครเรียก
const i18n = readFileSync(join(WEB, "lib/i18n.js"), "utf8");
const section = (name) => {
  const m = i18n.match(new RegExp(`${name}:\\s*\\{([\\s\\S]*?)\\n  \\},`));
  return new Set([...m[1].matchAll(/^\s*"([^"]+)":/gm)].map((x) => x[1]));
};
const th = section("th");
const en = section("en");
for (const key of th) if (!en.has(key)) fail("i18n-parity", "nextjs/lib/i18n.js", 1, `คีย์ "${key}" มีแต่ภาษาไทย`);
for (const key of en) if (!th.has(key)) fail("i18n-parity", "nextjs/lib/i18n.js", 1, `คีย์ "${key}" มีแต่ภาษาอังกฤษ`);

// คีย์ที่ถูกประกอบขึ้นตอนรัน หาด้วยการ grep ตรงๆ ไม่เจอ
const DYNAMIC = ["error.", "sample."];
const allCode = files.filter((f) => !f.rel.endsWith("lib/i18n.js")).map((f) => f.text).join("\n");
for (const key of th) {
  if (DYNAMIC.some((prefix) => key.startsWith(prefix))) continue;
  if (!allCode.includes(`"${key}"`)) {
    fail("i18n-orphan", "nextjs/lib/i18n.js", 1, `คีย์ "${key}" ไม่มีใครเรียกแล้ว`);
  }
}

// คีย์ที่โค้ดเรียกแต่ไม่มีอยู่จริง — t() จะคืนชื่อคีย์ออกมาโชว์ผู้ใช้ตรงๆ
// เช่นหน้าจอขึ้นคำว่า "account.emptyTitle" แทนข้อความไทย ซึ่งไม่มีใครสังเกต
// จนกว่าจะเปิดหน้านั้นพอดี
for (const file of files) {
  if (file.rel.endsWith("lib/i18n.js")) continue;
  for (const match of file.text.matchAll(/\bt\(\s*"([^"]+)"/g)) {
    const n = file.text.slice(0, match.index).split("\n").length;
    if (!th.has(match[1])) fail("i18n-missing", file.rel, n, `เรียกคีย์ "${match[1]}" ที่ไม่มีใน i18n.js`);
  }
}

// ── กฎ 7 · ทุกอย่างที่กดได้ต้องสูงอย่างน้อย 44px (docs/brand.md หัวข้อ 6)
//    เคยพลาดมาแล้ว 3 จุดในรอบเดียว: ปุ่มลองใหม่ 74x23 และลิงก์สลับหน้า 70x17
//    ทั้งสามจุดเป็นลิงก์/ปุ่มที่ไม่ได้ใช้คลาส .btn จึงไม่มีความสูงติดมาให้
const CLICKABLE = /<(button|Link|a)\b([^>]*)>/gs;
for (const file of files) {
  for (const m of file.text.matchAll(CLICKABLE)) {
    const attrs = m[2];
    if (!/className=/.test(attrs)) continue;
    const cls = (attrs.match(/className="([^"]*)"/) || [])[1];
    if (!cls) continue; // className แบบ cn(...) ตรวจตรงนี้ไม่ได้ ปล่อยให้เบราว์เซอร์วัดแทน
    const hasFloor = /\bbtn\b/.test(cls) || /min-h-\[44px\]/.test(cls) || /\bh-(1[1-9]|[2-9]\d)\b/.test(cls);
    if (!hasFloor) {
      const n = file.text.slice(0, m.index).split("\n").length;
      fail("touch-target", file.rel, n, `<${m[1]}> ไม่มีความสูงขั้นต่ำ ใส่ min-h-[44px] หรือใช้ <Button>`);
    }
  }
}

// ── กฎ 8 · ระบบดีไซน์อยู่ใน globals.css ซึ่งกฎ 4 มองไม่เห็นเพราะไล่แค่ไฟล์ .js
//    ค่าสีตายตัวนอกบล็อกประกาศตัวแปร คือสีที่ไม่พลิกตามโหมดมืด
const cssPath = join(WEB, "styles/globals.css");
const css = readFileSync(cssPath, "utf8");
{
  let depth = 0;
  let inRoot = false;
  css.split("\n").forEach((line, i) => {
    if (/:root|prefers-color-scheme/.test(line)) inRoot = true;
    const before = depth;
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    if (inRoot && depth <= 0) inRoot = false;
    const code = line.split("/*")[0];
    if (!inRoot && /#[0-9a-fA-F]{3,8}\b/.test(code) && !/@font-face|url\(/.test(code)) {
      fail("css-hardcoded-color", "nextjs/styles/globals.css", i + 1, `ค่าสีตายตัวนอกบล็อกตัวแปร: ${code.trim()}`);
    }
    void before;
  });
}

// ── กฎ 9 · ความต่างของสีที่ "ไม่ใช่ตัวอักษร" (WCAG 1.4.11 / 2.4.11 ต้องการ 3:1)
//    รอบก่อนวัดเฉพาะตัวอักษร จึงมองไม่เห็นขอบปุ่มบนแถบหัวเว็บที่ได้ 2.65:1
//    และวงแหวนโฟกัสบนแถบหัวเว็บที่ได้ 2.43:1 — ทั้งคู่อยู่ใน CSS ล้วนๆ
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}
function relLum([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [hi, lo] = [relLum(hexToRgb(a)), relLum(hexToRgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
// อ่านค่าตัวแปรจากไฟล์จริง ไม่ใช่เขียนค่าซ้ำไว้ในสคริปต์
// ถ้าเขียนซ้ำ วันที่มีคนแก้สี สคริปต์จะยังตรวจค่าเก่าและบอกว่าผ่าน
function tokens(scopeMarker) {
  const start = css.indexOf(scopeMarker);
  const slice = css.slice(start, start + 4000);
  const map = {};
  for (const m of slice.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) map[m[1]] = m[2];
  return map;
}
const light = tokens(":root {");
const dark = tokens("prefers-color-scheme: dark");
const PAIRS = [
  ["--header-line", "--header-bg", 3, "ขอบปุ่มบนแถบหัวเว็บ"],
  ["--focus-on-header", "--header-bg", 3, "วงแหวนโฟกัสบนแถบหัวเว็บ"],
  ["--line-strong", "--paper", 3, "ขอบของสิ่งที่กดได้บนพื้นหน้า"],
];
for (const [scope, set] of [["โหมดสว่าง", light], ["โหมดมืด", { ...light, ...dark }]]) {
  for (const [fg, bg, need, what] of PAIRS) {
    if (!set[fg] || !set[bg]) continue;
    const r = contrast(set[fg], set[bg]);
    if (r < need) fail("nontext-contrast", "nextjs/styles/globals.css", 1, `${what} (${scope}) ${r.toFixed(2)}:1 < ${need}:1`);
  }
}

// ── กฎ 6 · เอกสารต้องไม่สอนกฎที่ยกเลิกไปแล้ว
for (const rel of ["CLAUDE.md", "docs/ui-guide.md", "docs/brand.md"]) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  text.split("\n").forEach((line, i) => {
    if (/toast\s*อย่างเดียว|only in a toast/.test(line)) {
      fail("retired-rule", rel, i + 1, 'เขียนว่า "ไม่ใช่ toast อย่างเดียว" ซึ่งยังอนุญาต toast — กฎคือห้าม toast');
    }
  });
}

if (failures.length === 0) {
  console.log("✅ ผ่านทุกข้อ");
  process.exit(0);
}
console.error(`❌ ไม่ผ่าน ${failures.length} ข้อ\n`);
for (const line of failures) console.error("  " + line);
process.exit(1);
