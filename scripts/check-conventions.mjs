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
//    🔴 กฎเวอร์ชันแรกเขียนว่า "ไม่มี className ให้ข้าม" ซึ่งทำให้มันเห็นเฉพาะ
//       ปุ่มที่เคยมีคนชี้ให้ทีละบรรทัด ส่วนที่ไม่มีใครเคยชี้ก็ไม่มีใครเห็นต่อไป
//       ตอนนี้ "ไม่รู้ = ไม่ผ่าน" ของที่ยกเว้นได้ต้องเขียนคำว่า ok-touch-target
//       พร้อมเหตุผลกำกับไว้ ไม่ใช่เงียบแล้วผ่าน
const TOUCH_OK = /\bbtn\b|min-h-\[44px\]|\bh-(1[1-9]|[2-9]\d)\b|ok-touch-target/;

// อ่าน attribute ของแท็กให้ถูก — หยุดที่ ">" ที่อยู่นอกวงเล็บปีกกาเท่านั้น
// ไม่งั้น onClick={() => ...} จะทำให้ตัดจบกลางทางที่ ">" ของลูกศร
// แล้วจะพลาดคลาสที่อยู่ข้างหลัง ซึ่งคือ min-h-[44px] พอดี
function readTag(text, from) {
  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    const c = text[i];
    if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (c === ">" && depth === 0) return text.slice(from, i);
  }
  return text.slice(from, from + 600);
}

for (const file of files) {
  for (const m of file.text.matchAll(/<(button|Link|a|label)\b/g)) {
    const attrs = readTag(file.text, m.index + m[0].length);
    const n = file.text.slice(0, m.index).split("\n").length;

    // <label> เป็นเป้าหมายสัมผัสก็ต่อเมื่อมันครอบ input อยู่ (เช่นช่องติ๊ก)
    // label ที่เป็นแค่ป้ายอยู่เหนือช่องกรอก ไม่ใช่ปุ่ม ไม่ต้องสูง 44px
    if (m[1] === "label") {
      const body = file.text.slice(m.index, m.index + 900);
      const close = body.indexOf("</label>");
      if (close === -1 || !/<(input|Input)\b/.test(body.slice(0, close))) continue;
    }

    // asChild ส่งคลาสของ <Button> ลงไปให้ลูกผ่าน Slot ลูกจึงได้ความสูงมาแล้ว
    const before = file.text.slice(Math.max(0, m.index - 300), m.index);
    if (/asChild/.test(before)) continue;

    if (TOUCH_OK.test(attrs)) continue;
    fail("touch-target", file.rel, n, `<${m[1]}> ไม่รับประกันความสูง 44px — ใส่ min-h-[44px] ใช้ <Button> หรือเขียน ok-touch-target พร้อมเหตุผล`);
  }
}

// ── กฎ 7ข · ห้ามเอา onClick ไปแปะบน <div> หรือ <span> (docs/brand.md หัวข้อ 6)
//    ของแบบนั้นกดด้วยคีย์บอร์ดไม่ได้ และโปรแกรมอ่านหน้าจอไม่รู้ว่ามันกดได้
for (const file of files) {
  for (const m of file.text.matchAll(/<(div|span|p|li)(\s[^>]*?)?>/gs)) {
    if (!/onClick/.test(m[2] || "")) continue;
    const n = file.text.slice(0, m.index).split("\n").length;
    fail("clickable-div", file.rel, n, `<${m[1]}> มี onClick — ใช้ <button> แทน`);
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
    // ห้ามทุก "รูปแบบ" ของค่าสี ไม่ใช่เฉพาะ #hex ซึ่งเป็นรูปแบบที่บังเอิญเจอครั้งก่อน
    // สีที่เขียนเป็น rgb() hsl() oklch() ก็ไม่พลิกตามโหมดมืดเหมือนกันทุกประการ
    const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/;
    if (!inRoot && COLOUR.test(code) && !/@font-face|url\(|color-mix\(/.test(code)) {
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
  ["--line-strong", "--surface", 3, "ขอบของสิ่งที่กดได้บนการ์ด"],
  // ตรวจ "ขอบ" ไม่ใช่ "พื้น" — พื้นของปุ่มหลักในโหมดมืดตั้งใจให้ใกล้กับพื้นการ์ด
  // สิ่งที่ทำให้เห็นขอบเขตของปุ่มกับช่องติ๊กคือ --primary-border
  ["--primary-border", "--surface", 3, "ขอบปุ่มหลัก (โหมดมืด)"],
  ["--checked-border", "--surface", 3, "ขอบช่องติ๊กตอนติ๊กแล้ว"],
  ["--on-danger", "--danger-solid", 4.5, "ตัวอักษรบนปุ่มอันตราย"],
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

// ── กฎ 10 · ค่าสีใน docs/brand.md ต้องตรงกับที่ globals.css ใช้จริง
//    🔴 นี่คือคลาสที่ทำให้ brand.md ตีพิมพ์ค่า 2.65:1 ต่อไปอีกหนึ่งรอบเต็ม
//       หลังจากโค้ดเลิกใช้ไปแล้ว ทีมอ่าน brand.md ไม่ได้อ่าน globals.css
//       ถ้าสองไฟล์นี้ไม่ตรงกัน เอกสารจะกลายเป็นตัวแพร่ค่าที่ผิด
{
  const brand = readFileSync(join(ROOT, "docs/brand.md"), "utf8");
  const all = { ...light, ...dark };
  // brand.md เขียนแบบ  `--header-line` `#7FA8B0` light / `#6B99A2` dark
  for (const m of brand.matchAll(/`(--[\w-]+)`\s+`(#[0-9a-fA-F]{3,8})`(?:\s*(?:light|สว่าง))?(?:\s*\/\s*`?(#[0-9a-fA-F]{3,8})`?\s*(?:dark|มืด))?/g)) {
    const [, name, lightHex, darkHex] = m;
    const n = brand.slice(0, m.index).split("\n").length;
    if (light[name] && light[name].toLowerCase() !== lightHex.toLowerCase()) {
      fail("spec-drift", "docs/brand.md", n, `${name} เอกสารเขียน ${lightHex} แต่ globals.css ใช้ ${light[name]}`);
    }
    if (darkHex && dark[name] && dark[name].toLowerCase() !== darkHex.toLowerCase()) {
      fail("spec-drift", "docs/brand.md", n, `${name} (โหมดมืด) เอกสารเขียน ${darkHex} แต่ globals.css ใช้ ${dark[name]}`);
    }
    void all;
  }
}

if (failures.length === 0) {
  console.log("✅ ผ่านทุกข้อ");
  process.exit(0);
}
console.error(`❌ ไม่ผ่าน ${failures.length} ข้อ\n`);
for (const line of failures) console.error("  " + line);
process.exit(1);
