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

// นิยามเดียวของคำว่า "ค่าสีตายตัว" ใช้ร่วมกันทุกกฎ
// 🔴 เคยมีสองนิยาม: กฎ 4 รู้จักแค่ #hex 6 หลัก ส่วนกฎ 8 รู้จัก rgb() hsl() ด้วย
//    ผลคือ style={{ color: "#fff" }} กับ style={{ color: "rgb(255,0,0)" }} ผ่านฉลุย
//    ทั้งที่เป็นค่าสีที่ไม่พลิกตามโหมดมืดเหมือนกันทุกประการ
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|\b(white|black|red|blue|green|rebeccapurple|transparent)\b\s*[;"']/;

function fail(rule, rel, line, detail) {
  failures.push(`${rel}:${line}  [${rule}] ${detail}`);
}

function eachLine(file, fn) {
  file.text.split("\n").forEach((line, i) => fn(line, i + 1));
}

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


// กฎที่ตรวจ "โครงสร้าง JSX" ต้องไม่อ่านโค้ดตัวอย่างในคอมเมนต์ว่าเป็นของจริง
// (กฎที่ตรวจ "กฎที่สอนผิด" ต้องอ่านคอมเมนต์ นั่นคือกฎ 1 ซึ่งใช้ข้อความดิบ)
// แทนที่ด้วยช่องว่างความยาวเท่าเดิม เลขบรรทัดกับตำแหน่งจะได้ไม่เพี้ยน
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}
for (const file of files) file.code = stripComments(file.text);

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
    if (COLOUR.test(line)) fail("no-hardcoded-color", file.rel, n, "เขียนค่าสีลงไฟล์โดยตรง ให้ใช้ token ใน globals.css");
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
// 🔴 "sm:min-h-[44px]" ไม่นับ — มันสูง 44px เฉพาะจอ 640px ขึ้นไป
//    ส่วนบนมือถือที่หน้าร้านซึ่งเป็นที่ที่นิ้วโป้งใช้งานจริง ยังเตี้ยอยู่
//    จึงต้องไม่มีอะไรนำหน้า (\b กันไม่ได้เพราะ ":" ไม่ใช่ขอบคำ)
// 🔴 min-w-[44px] เคยอยู่ในรายการนี้ ซึ่งแปลว่า "กว้างพอ" ถูกนับเป็น "สูงพอ"
//    เป็นรูที่เกิดจากการแก้รอบก่อนเอง
const TOUCH_OK = /(^|[\s"'`])(btn|min-h-\[44px\]|h-(1[1-9]|[2-9]\d))([\s"'`]|$)/;
// ยกเว้นได้ แต่ต้องเขียนเหตุผลต่อท้ายจริงๆ ไม่ใช่แปะคำวิเศษแล้วผ่าน
const TOUCH_EXEMPT = /ok-touch-target:\s*\S+/;

for (const file of files) {
  for (const m of file.code.matchAll(/<(button|Link|a|label|input|select|textarea)\b/g)) {
    const attrs = readTag(file.code, m.index + m[0].length);
    const n = file.code.slice(0, m.index).split("\n").length;

    // <label> เป็นเป้าหมายสัมผัสก็ต่อเมื่อมันครอบ input อยู่ (เช่นช่องติ๊ก)
    // label ที่เป็นแค่ป้ายอยู่เหนือช่องกรอก ไม่ใช่ปุ่ม ไม่ต้องสูง 44px
    // ช่องกรอกที่วาดด้วยคลาสของระบบ (.field-input / Input) สูง 44px จาก CSS อยู่แล้ว
    if (/type="(hidden)"/.test(attrs)) continue;
    if (m[1] === "label") {
      const body = file.code.slice(m.index, m.index + 900);
      const close = body.indexOf("</label>");
      if (close === -1 || !/<(input|Input)\b/.test(body.slice(0, close))) continue;
    }

    // asChild ส่งคลาสของ <Button> ลงไปให้ลูกผ่าน Slot ลูกจึงได้ความสูงมาแล้ว
    // 🔴 ต้องเป็น <Button asChild> ที่เปิดอยู่จริงและยังไม่ปิด ไม่ใช่เจอคำว่า asChild
    //    ที่ไหนก็ได้ข้างหน้า — เวอร์ชันแรกเป็นการค้นข้อความเฉยๆ คำว่า asChild
    //    ในคอมเมนต์ภาษาไทยก็ทำให้ข้ามได้
    const before = file.code.slice(0, m.index);
    const lastOpen = before.lastIndexOf("<Button");
    const lastClose = before.lastIndexOf("</Button>");
    if (lastOpen > lastClose && /asChild/.test(readTag(file.code, lastOpen + 7))) continue;

    // ข้อยกเว้นเขียนเป็นคอมเมนต์เหนือแท็ก จึงต้องอ่านจากข้อความดิบ
    // (stripComments แทนคอมเมนต์ด้วยช่องว่างความยาวเท่าเดิม ตำแหน่งจึงตรงกันพอดี)
    if (TOUCH_EXEMPT.test(file.text.slice(Math.max(0, m.index - 400), m.index))) continue;
    if (TOUCH_EXEMPT.test(attrs)) continue;
    // 🔴 ต้องดูเฉพาะค่าใน className ไม่ใช่ทั้งก้อน attribute
    //    ไม่งั้น aria-label="btn" หรือ href="/btn" จะถูกนับว่าเป็นคลาส btn
    const classes = [...attrs.matchAll(/className=(?:"([^"]*)"|\{([^}]*)\})/g)]
      .map((c) => c[1] || c[2] || "")
      .join(" ");
    if (TOUCH_OK.test(classes)) continue;
    fail("touch-target", file.rel, n, `<${m[1]}> ไม่รับประกันความสูง 44px — ใส่ min-h-[44px] ใช้ <Button> หรือเขียน ok-touch-target พร้อมเหตุผล`);
  }
}

// ── กฎ 7ข · ห้ามเอา onClick ไปแปะบนแท็กที่กดไม่ได้ (docs/brand.md หัวข้อ 6)
//    ของแบบนั้นกดด้วยคีย์บอร์ดไม่ได้ และโปรแกรมอ่านหน้าจอไม่รู้ว่ามันกดได้
//    🔴 เวอร์ชันแรกใช้ [^>]*? ซึ่งตัดจบที่ ">" ของ => ทั้งที่ readTag() ที่เขียนไว้
//       ข้างบนในคอมมิตเดียวกันมีไว้แก้ปัญหานี้พอดี — เขียนเครื่องมือแล้วไม่ได้ใช้
const INTERACTIVE = new Set(["button", "a", "input", "select", "textarea", "label", "Link", "Button"]);
for (const file of files) {
  for (const m of file.code.matchAll(/<([A-Za-z][\w.]*)\b/g)) {
    if (INTERACTIVE.has(m[1])) continue;
    const attrs = readTag(file.code, m.index + m[0].length);
    if (!/\bon(Click|MouseDown|MouseUp|PointerDown|PointerUp|TouchStart|TouchEnd)\b/.test(attrs)) continue;  // onKeyDown ไม่ใช่การกดด้วยเมาส์ เช่น Esc บนฟอร์ม
    if (/\brole="button"/.test(attrs) && /\bonKeyDown\b/.test(attrs) && /\btabIndex\b/.test(attrs)) continue;
    const n = file.code.slice(0, m.index).split("\n").length;
    fail("clickable-nonbutton", file.rel, n, `<${m[1]}> รับการกด แต่ไม่ใช่ปุ่ม — ใช้ <button> แทน`);
  }
}

// ── กฎ 7ค · ห้ามสื่อสาร "กำลังทำงาน" ด้วยการทำให้จาง
//    ปุ่มที่กำลังทำงานยังพูดอยู่ — ป้ายมันเปลี่ยนเป็น "กำลังบันทึก..." ซึ่งเป็นข้อมูล
//    ชิ้นเดียวที่บอกว่าระบบยังไม่ตาย ทำให้จางคือทำให้ข้อความที่สำคัญที่สุดในจังหวะนั้น
//    อ่านยากที่สุด (วัดแล้วเคยเหลือ 2.49:1 บนปุ่มลองใหม่)
for (const file of files) {
  file.code.split("\n").forEach((line, i) => {
    if (/disabled:opacity|aria-busy[^}]*opacity/.test(line)) {
      fail("busy-not-faded", file.rel, i + 1, "ทำให้ปุ่มจางตอนกำลังทำงาน — ใช้ป้ายที่เปลี่ยนข้อความแทน");
    }
  });
}

// ── กฎ 8 · ระบบดีไซน์อยู่ใน globals.css ซึ่งกฎ 4 มองไม่เห็นเพราะไล่แค่ไฟล์ .js
//    ค่าสีตายตัวนอกบล็อกประกาศตัวแปร คือสีที่ไม่พลิกตามโหมดมืด
const cssPath = join(WEB, "styles/globals.css");
const css = readFileSync(cssPath, "utf8");
{
  let depth = 0;
  let inRoot = false;
  css.split("\n").forEach((line, i) => {
    // 🔴 ต้องดูจาก "โค้ด" ไม่ใช่ทั้งบรรทัด — คอมเมนต์ภาษาไทยที่มีคำว่า :root
    //    เคยเปิดโหมดยกเว้นค้างไว้ทั้งไฟล์ที่เหลือ (ถูกพิสูจน์มาแล้วสองรอบ)
    const codeOnly = line.split("/*")[0].split("*/").pop();
    if (/(^|[\s,}])(:root|@media[^{]*prefers-color-scheme)/.test(codeOnly)) inRoot = true;
    const before = depth;
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    if (inRoot && depth <= 0) inRoot = false;
    // ไม่ต้องยกเว้น color-mix() เลย — การใช้งานที่ถูกต้องรับแต่ var(--token)
    // ซึ่งไม่เข้าเงื่อนไข COLOUR อยู่แล้ว ถ้ามีค่าสีดิบอยู่ข้างในก็ควรถูกจับ
    const code = line.split("/*")[0];
    // ห้ามทุก "รูปแบบ" ของค่าสี ไม่ใช่เฉพาะ #hex ซึ่งเป็นรูปแบบที่บังเอิญเจอครั้งก่อน
    // สีที่เขียนเป็น rgb() hsl() oklch() ก็ไม่พลิกตามโหมดมืดเหมือนกันทุกประการ
    const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/;
    if (!inRoot && COLOUR.test(code) && !/@font-face|url\(/.test(code)) {
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
// อ่านตัวแปรจากบล็อกที่ต้องการ โดย "นับวงเล็บ" ไม่ใช่ตัดเอาจำนวนตัวอักษรคงที่
// 🔴 เวอร์ชันแรกตัดเอา 4000 ตัวอักษร ซึ่งแปลว่าวันที่มีคนเพิ่ม token ใหม่ 6 บรรทัด
//    token ตัวท้ายๆ จะหลุดออกนอกหน้าต่างเงียบๆ แล้วกฎจะเลิกตรวจมันโดยไม่บอกใคร
//    ตอนนั้นเคยห่างจากการกลืนบล็อกโหมดมืดเข้ามาด้วยแค่ 4 ตัวอักษร
function tokens(scopeMarker) {
  const start = css.indexOf(scopeMarker);
  if (start === -1) return {};
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  const slice = css.slice(open, end);
  const map = {};
  for (const m of slice.matchAll(/(--[\w-]+):\s*([^;]+);/g)) map[m[1]] = m[2].trim();
  return map;
}

// token บางตัวชี้ไปที่ token ตัวอื่น เช่น --checked-border: var(--primary)
// ต้องตามไปจนเจอค่าสีจริง ไม่งั้นจะนึกว่า "หาไม่เจอ"
function resolve(map, name, depth = 0) {
  const value = map[name];
  if (!value || depth > 5) return null;
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  const ref = value.match(/^var\(\s*(--[\w-]+)/);
  return ref ? resolve(map, ref[1], depth + 1) : null;
}
const light = tokens(":root {");
const dark = tokens("prefers-color-scheme: dark");

// ช่องที่ 5 = ตรวจเฉพาะโหมดไหน ("dark" หรือ "light") ไม่ใส่ = ตรวจทั้งสองโหมด
const PAIRS = [
  ["--header-line", "--header-bg", 3, "ขอบปุ่มบนแถบหัวเว็บ"],
  ["--focus-on-header", "--header-bg", 3, "วงแหวนโฟกัสบนแถบหัวเว็บ"],
  ["--line-strong", "--paper", 3, "ขอบของสิ่งที่กดได้บนพื้นหน้า"],
  ["--line-strong", "--surface", 3, "ขอบของสิ่งที่กดได้บนการ์ด"],
  // ตรวจ "ขอบ" ไม่ใช่ "พื้น" — พื้นของปุ่มหลักในโหมดมืดตั้งใจให้ใกล้กับพื้นการ์ด
  // สิ่งที่ทำให้เห็นขอบเขตของปุ่มกับช่องติ๊กคือ --primary-border
  // โหมดสว่าง --primary-border เป็น transparent ตั้งใจ เพราะปุ่มสีหมึกเข้ม
  // บนพื้นขาวไม่ต้องมีขอบก็เห็นขอบเขตชัดอยู่แล้ว
  ["--primary-border", "--surface", 3, "ขอบปุ่มหลัก", "dark"],
  ["--checked-border", "--surface", 3, "ขอบช่องติ๊กตอนติ๊กแล้ว"],
  ["--on-danger", "--danger-solid", 4.5, "ตัวอักษรบนปุ่มอันตราย"],
  ["--amber", "--header-bg", 3, "ขอบป้ายแพ็กเกจบนแถบหัวเว็บ"],
];
for (const [scope, set, key] of [["โหมดสว่าง", light, "light"], ["โหมดมืด", { ...light, ...dark }, "dark"]]) {
  for (const [fg, bg, need, what, only] of PAIRS) {
    if (only && only !== key) continue;
    // 🔴 "หาไม่เจอ" ต้องเป็นความผิดพลาด ไม่ใช่ความเงียบ
    //    ถ้าเงียบ วันที่มีคนเปลี่ยนชื่อ token กฎจะเลิกตรวจโดยที่ยังขึ้นว่าผ่าน
    const fgHex = resolve(set, fg);
    const bgHex = resolve(set, bg);
    if (!fgHex || !bgHex) {
      fail("nontext-contrast", "nextjs/styles/globals.css", 1, `${what} (${scope}) หาค่าสีของ token ไม่ได้: ${!fgHex ? fg : bg}`);
      continue;
    }
    const r = contrast(fgHex, bgHex);
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
  const documented = new Set();
  // brand.md เขียนแบบ  `--header-line` `#7FA8B0` light / `#6B99A2` dark
  // brand.md เขียนค่าสีไว้ 2 แบบ: ในย่อหน้าอธิบาย และในตารางที่คั่นด้วย |
  // 🔴 เวอร์ชันแรกอ่านได้แบบเดียว คือแบบที่ token ตัวที่เป็นต้นเหตุบังเอิญใช้
  //    ตารางสีหลัก 11 แถวซึ่งไฟล์เรียกว่า "ต้นฉบับเดียว" จึงไม่เคยถูกตรวจเลย
  // 🔴 เวอร์ชันก่อนบังคับให้มีคำว่า dark ต่อท้ายค่าที่สอง ซึ่งมีเฉพาะในย่อหน้า
  //    แถวในตารางเขียนว่า | `--muted` | `#4A6268` | `#9DB6BB` | ไม่มีคำว่า dark
  //    ผลคือค่าโหมดมืด 21 จาก 24 ตัวไม่เคยถูกตรวจเลย ทั้งที่เพิ่งเพิ่มตารางมาเพื่อการนี้
  const DECL = /`(--[\w-]+)`\s*(?:\||\s)\s*`(#[0-9a-fA-F]{3,8})`(?:\s*(?:light|สว่าง))?(?:\s*(?:\/|\|)\s*(?:`(#[0-9a-fA-F]{3,8})`|—)\s*(?:dark|มืด)?)?/g;
  for (const m of brand.matchAll(DECL)) {
    const [, name, lightHex, darkHex] = m;
    const n = brand.slice(0, m.index).split("\n").length;
    // token บางตัวมีค่าสีจริงเฉพาะโหมดมืด (โหมดสว่างชี้ไป token อื่นหรือเป็น transparent)
    // ค่าเดียวที่เอกสารเขียนไว้จึงต้องเทียบกับโหมดมืด ไม่ใช่โหมดสว่าง
    const lightIsHex = /^#[0-9a-fA-F]{3,8}$/.test(light[name] || "");
    if (!lightIsHex && !darkHex && dark[name]) {
      if (dark[name].toLowerCase() !== lightHex.toLowerCase()) {
        fail("spec-drift", "docs/brand.md", n, `${name} (โหมดมืด) เอกสารเขียน ${lightHex} แต่ globals.css ใช้ ${dark[name]}`);
      }
    } else if (lightIsHex && light[name].toLowerCase() !== lightHex.toLowerCase()) {
      fail("spec-drift", "docs/brand.md", n, `${name} เอกสารเขียน ${lightHex} แต่ globals.css ใช้ ${light[name]}`);
    }
    if (darkHex && dark[name] && dark[name].toLowerCase() !== darkHex.toLowerCase()) {
      fail("spec-drift", "docs/brand.md", n, `${name} (โหมดมืด) เอกสารเขียน ${darkHex} แต่ globals.css ใช้ ${dark[name]}`);
    }
    void all;
    documented.add(name);
  }

  // 🔴 กฎนี้เคยจับได้แค่ "เอกสารเขียนไม่ตรง" ไม่เคยจับ "เอกสารไม่ได้เขียนเลย"
  //    ซึ่งเป็นวิธีที่ token ใหม่ทุกตัวหลุดออกจากเอกสารมาตลอด
  const INTERNAL = /^--(space|radius|text|shell|font)/;
  for (const name of Object.keys({ ...light, ...dark })) {
    if (INTERNAL.test(name) || documented.has(name)) continue;
    // ตรวจเฉพาะ token ที่เป็นค่าสีจริง ตัวที่ชี้ไป token อื่นถือว่าเอกสารครอบคลุมแล้ว
    if (!/^#[0-9a-fA-F]{3,8}$/.test({ ...light, ...dark }[name] || "")) continue;
    fail("spec-undocumented", "docs/brand.md", 1, `${name} มีใน globals.css แต่ไม่มีใน brand.md`);
  }
}

if (failures.length === 0) {
  console.log("✅ ผ่านทุกข้อ");
  process.exit(0);
}
console.error(`❌ ไม่ผ่าน ${failures.length} ข้อ\n`);
for (const line of failures) console.error("  " + line);
process.exit(1);
