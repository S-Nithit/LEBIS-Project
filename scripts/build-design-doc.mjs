#!/usr/bin/env node
// รวม Design Document ทุกหัวข้อเป็น PDF เล่มเดียว — วิธีใช้อยู่ใน docs/design-document/README.md
//
//   node scripts/build-design-doc.mjs           ฉบับร่าง หัวข้อที่ขาดขึ้นเป็นหน้าบอกว่ารอใคร
//   node scripts/build-design-doc.mjs --final   ฉบับส่งจริง ขาดอะไรสักอย่างจะไม่ยอมสร้าง
//
// ใช้ playwright ที่ติดตั้งอยู่ใน nextjs/ อยู่แล้ว (ตัวเดียวกับ check-pages.mjs)
// แปลง markdown ด้วย marked และฟอนต์ Sarabun ที่โหลดจากเน็ตตอนรัน

import { readFileSync, readdirSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOC_DIR = join(ROOT, "docs", "design-document");
const FINAL = process.argv.includes("--final");

// ลำดับหัวข้อตามแผนงาน — ถ้าแม่แบบของอาจารย์ต่างออกไป แก้ตรงนี้ที่เดียว
const SECTIONS = [
  [1, "Project Overview", "Kim"],
  [2, "Requirements", "Neo"],
  [3, "UI/UX Design", "Sea"],
  [4, "System Design", "Kim"],
  [5, "Security Design", "Kul"],
  [6, "Monetization & Feature Gating", "Kul"],
  [7, "Business Analytics Dashboard", "Sea"],
  [8, "External System Integration", "Neo"],
  [9, "Testing Plan", "Neo"],
  [10, "Timeline and Milestones", "Sea"],
  [11, "Deployment Plan", "Kim"],
];

const TEAM = [
  ["Nithit Srisengsuwanchai", "68011411", "Team lead · setup, sign-in, LINE integration, deployment"],
  ["Intuch Srisawat", "68011345", "Workspace — items and rental records"],
  ["Issaree Ausavapirom", "68011346", "Pricing and checkout — Free and Pro limits"],
  ["Pongsicha Seesavat", "68011483", "Landing, settings, admin dashboard"],
];

// ---------------------------------------------------------------------------
// อ่านไฟล์แต่ละหัวข้อ
// ---------------------------------------------------------------------------

function findSectionFiles() {
  const files = readdirSync(DOC_DIR).filter((f) => /^\d\d-.+\.md$/.test(f));
  const byNumber = new Map();
  for (const f of files) byNumber.set(Number(f.slice(0, 2)), f);
  return byNumber;
}

// รูปฝังลงในเอกสารตรงๆ PDF จะได้ไม่ต้องพึ่งไฟล์ข้างนอก
function embedImages(markdown) {
  return markdown.replace(/\]\((images\/[^)\s]+\.png)\)/g, (whole, path) => {
    const full = join(DOC_DIR, path);
    if (!existsSync(full)) {
      problems.push(`หารูปไม่เจอ: ${path}`);
      return whole;
    }
    return `](data:image/png;base64,${readFileSync(full).toString("base64")})`;
  });
}

const problems = [];
const found = findSectionFiles();
const parts = [];

for (const [number, title, owner] of SECTIONS) {
  const file = found.get(number);
  if (!file) {
    problems.push(`ขาดหัวข้อ ${number}. ${title} (${owner}) — ต้องมีไฟล์ ${String(number).padStart(2, "0")}-….md`);
    parts.push({ missing: true, number, title, owner });
    continue;
  }
  const text = readFileSync(join(DOC_DIR, file), "utf8");
  if (/^> \[Editor's note/m.test(text)) problems.push(`${file} ยังมี [Editor's note] ค้าง`);
  const blank = text.match(/\[ ?(full name|ID|TBD|TODO)[^\]]*\]/i);
  if (blank) problems.push(`${file} ยังมีช่องที่ไม่ได้กรอก: ${blank[0]}`);
  parts.push({ number, title, owner, markdown: embedImages(text) });
}

if (FINAL && problems.length) {
  console.error("❌ ยังรวมเล่มฉบับจริงไม่ได้\n");
  for (const p of problems) console.error("  - " + p);
  console.error("\nลองดูฉบับร่างได้ด้วย: node scripts/build-design-doc.mjs");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// ประกอบหน้า HTML แล้วสั่งพิมพ์เป็น PDF
// ---------------------------------------------------------------------------

const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const cover = `
<section class="cover">
  <p class="eyebrow">Advanced Computer Programming · Mini Project</p>
  <h1 class="title">LEBIS</h1>
  <p class="subtitle">Lab &amp; Rental Equipment Borrow and Inventory System</p>
  <p class="kind">Design Document${FINAL ? "" : " — DRAFT"}</p>
  <table class="team"><thead><tr><th>Name</th><th>Student ID</th><th>Responsibility</th></tr></thead>
  <tbody>${TEAM.map(([n, id, r]) => `<tr><td>${n}</td><td>${id}</td><td>${r}</td></tr>`).join("")}</tbody></table>
  <p class="date">${today}</p>
</section>
<section class="toc"><h2>Contents</h2><ol>
  ${SECTIONS.map(([n, t]) => `<li>${t}</li>`).join("")}
</ol></section>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<style>
  @page { size: A4; margin: 20mm 18mm 22mm; }
  body { font-family: "Sarabun", sans-serif; font-size: 11pt; line-height: 1.55; color: #1b2a2e; }
  h1 { font-size: 20pt; margin: 0 0 10pt; page-break-before: always; border-bottom: 2px solid #12383e; padding-bottom: 4pt; }
  h2 { font-size: 14pt; margin: 18pt 0 6pt; } h3 { font-size: 12pt; margin: 14pt 0 4pt; }
  p, li { margin: 4pt 0; } ul, ol { padding-left: 18pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #c9d3d5; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #eef3f4; }
  code { font-family: Menlo, "Sarabun", monospace; font-size: 9pt; background: #f1f4f5; padding: 0 2pt; border-radius: 2pt; }
  pre { background: #f1f4f5; padding: 8pt; border-radius: 4pt; white-space: pre-wrap; page-break-inside: avoid; }
  pre code { background: none; padding: 0; }
  img { max-width: 100%; display: block; margin: 8pt auto; page-break-inside: avoid; }
  blockquote { border-left: 3px solid #e09540; margin: 8pt 0; padding: 2pt 10pt; color: #5b6b6f; }
  .cover { text-align: center; padding-top: 60mm; }
  .cover .eyebrow { letter-spacing: .08em; text-transform: uppercase; color: #5b6b6f; }
  .cover .title { font-size: 40pt; border: none; page-break-before: avoid; margin: 8pt 0 0; }
  .cover .subtitle { font-size: 14pt; margin: 0; } .cover .kind { font-size: 13pt; margin: 18pt 0 30pt; font-weight: 600; }
  .cover .team { width: 88%; margin: 0 auto; } .cover .date { margin-top: 20pt; color: #5b6b6f; }
  .toc { page-break-before: always; } .toc h2 { font-size: 18pt; }
  .missing { color: #b85450; }
</style></head><body>${cover}<div id="doc"></div>
<script id="parts" type="application/json">${JSON.stringify(parts).replace(/</g, "\\u003c")}</script>
<script>
  const parts = JSON.parse(document.getElementById("parts").textContent);
  document.getElementById("doc").innerHTML = parts.map((p) => p.missing
    ? '<h1>' + p.number + '. ' + p.title + '</h1><p class="missing">Not written yet — owner: ' + p.owner + '</p>'
    : marked.parse(p.markdown)).join("");
  document.fonts.ready.then(() => { document.body.dataset.ready = "1"; });
</script></body></html>`;

const requireFromWeb = createRequire(join(ROOT, "nextjs", "package.json"));
const pw = await import(pathToFileURL(requireFromWeb.resolve("playwright")).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const outDir = FINAL ? DOC_DIR : join(DOC_DIR, "build");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, FINAL ? "LEBIS_Design_Document.pdf" : "LEBIS_Design_Document_DRAFT.pdf");

// ฉบับร่างเก็บหน้า HTML ไว้ด้วย เปิดดูในเบราว์เซอร์ได้เลยโดยไม่ต้องเปิด PDF
if (!FINAL) writeFileSync(join(outDir, "preview.html"), html);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await page.pdf({
  path: out, format: "A4", printBackground: true, displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="font-size:8pt;width:100%;text-align:center;color:#5b6b6f">LEBIS Design Document${FINAL ? "" : " (draft)"} · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
  margin: { top: "20mm", bottom: "22mm", left: "18mm", right: "18mm" },
});
await browser.close();

console.log(`✅ สร้างแล้ว ${out.replace(ROOT + "/", "")}`);
if (problems.length) {
  console.log(`\nยังขาด ${problems.length} อย่างก่อนส่งจริง:`);
  for (const p of problems) console.log("  - " + p);
}
