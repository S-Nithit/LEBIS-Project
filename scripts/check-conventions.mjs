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
