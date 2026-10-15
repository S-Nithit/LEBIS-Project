#!/usr/bin/env node
// รวมรายงานวิชา Data Structures & Algorithms เป็น PDF เล่มเดียว
//
//   node scripts/build-data-report.mjs           ฉบับร่าง ส่วนที่ยังไม่มีขึ้นเป็นหน้าบอกว่ารอใคร
//   node scripts/build-data-report.mjs --final   ฉบับส่งจริง ขาดอะไรสักอย่างจะไม่ยอมสร้าง
//
// ทำตามแบบ scripts/build-design-doc.mjs ของ Kim ทุกอย่าง (marked + Sarabun + playwright)
// สองเล่มจะได้หน้าตาเป็นชุดเดียวกัน และคนที่เคยใช้ตัวนั้นใช้ตัวนี้ได้ทันที
//
// ต่างจากตัวนั้นสองอย่าง
//   1. เป็นภาษาไทย
//   2. ต่อหน้า flowchart PDF ทั้งหมดไว้ท้ายเล่ม เพราะวิชากำหนดว่าทุกอัลกอริทึมต้องมี flowchart
//      การต่อ PDF ใช้ PyMuPDF (pip install pymupdf) เพราะ Node ไม่มีตัวต่อ PDF ติดมา
//      และไม่อยากเพิ่ม dependency ให้ nextjs/ เพื่อเอกสารเล่มเดียว
import { readFileSync, readdirSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const COURSE_DIR = join(ROOT, "docs", "data-course");
const REPORT_DIR = join(COURSE_DIR, "report");
const FLOW_DIR = join(COURSE_DIR, "flowcharts");
const FINAL = process.argv.includes("--final");

// ลำดับในเล่ม — 00 กับ 99 ผู้รวมเล่มเขียน ที่เหลือแต่ละคนเขียนส่วนของตัวเอง
// หาไฟล์จากคำนำหน้าชื่อ คนเขียนตั้งชื่อต่อท้ายได้อิสระ เช่น kim-hashtable.md
const SECTIONS = [
  ["00-intro", "บทนำ", "Neo (ผู้รวมเล่ม)"],
  ["kim-", "ส่วนที่ 1 — Insert / Delete · ตารางแฮช", "Kim"],
  ["neo-", "ส่วนที่ 2 — Search / Count · binary search", "Neo"],
  ["kul-", "ส่วนที่ 3 — Sort / Group · merge sort", "Kul"],
  ["99-summary", "สรุป — สามอัลกอริทึมทำงานต่อกัน", "Neo (ผู้รวมเล่ม)"],
];

const TEAM = [
  ["Nithit Srisengsuwanchai (Kim)", "68011411", "Insert / Delete — ตารางแฮช"],
  ["Intuch Srisawat (Neo)", "68011345", "Search / Count — binary search · ชุดข้อมูล A–D · รวมเล่ม"],
  ["Issaree Ausavapirom (Kul)", "68011346", "Sort / Group — merge sort"],
  ["Pongsicha Seesavat (Sea)", "68011483", "—"],
];

const problems = [];

// ---------------------------------------------------------------------------
// อ่านไฟล์แต่ละส่วน
// ---------------------------------------------------------------------------

const files = readdirSync(REPORT_DIR).filter((f) => f.endsWith(".md"));
const parts = [];

for (const [prefix, title, owner] of SECTIONS) {
  const matches = files.filter((f) => f.startsWith(prefix));
  if (matches.length > 1) problems.push(`มีไฟล์ขึ้นต้นด้วย "${prefix}" มากกว่าหนึ่งไฟล์: ${matches.join(", ")}`);
  const file = matches[0];
  if (!file) {
    problems.push(`ขาด ${title} (${owner}) — ต้องมีไฟล์ ${prefix}….md ใน docs/data-course/report/`);
    parts.push({ missing: true, title, owner });
    continue;
  }
  const text = readFileSync(join(REPORT_DIR, file), "utf8");
  if (/^> \[Editor's note/m.test(text)) problems.push(`${file} ยังมี [Editor's note] ค้าง`);
  const blank = text.match(/\[ ?(TBD|TODO|ใส่ตัวเลข|รอผล)[^\]]*\]/i);
  if (blank) problems.push(`${file} ยังมีช่องที่ไม่ได้กรอก: ${blank[0]}`);
  const heading = (text.match(/^# (.+)$/m) || [null, title])[1];
  parts.push({ title: heading, owner, markdown: text });
}

// flowchart เรียงตามเลขภาพ (1–3 Kim · 4–5 Neo · 6–7 Kul) ไม่เอาไฟล์ _eng
const flowcharts = existsSync(FLOW_DIR)
  ? readdirSync(FLOW_DIR)
      .map((f) => f.match(/^flow_(kim|neo|kul)_(\d+)_(.+)\.pdf$/))
      .filter((m) => m && !m[3].endsWith("_eng"))
      .sort((a, b) => Number(a[2]) - Number(b[2]))
      .map((m) => m[0])
  : [];

for (const n of [1, 2, 3, 4, 5, 6, 7]) {
  if (!flowcharts.some((f) => f.match(new RegExp(`^flow_[a-z]+_${n}_`)))) {
    problems.push(`ไม่พบ flowchart ภาพที่ ${n} (flow_<ชื่อ>_${n}_….pdf) ใน docs/data-course/flowcharts/`);
  }
}

if (FINAL && problems.length) {
  console.error("❌ ยังรวมเล่มฉบับจริงไม่ได้\n");
  for (const p of problems) console.error("  - " + p);
  console.error("\nลองดูฉบับร่างได้ด้วย: node scripts/build-data-report.mjs");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// ประกอบหน้า HTML แล้วสั่งพิมพ์เป็น PDF
// ---------------------------------------------------------------------------

const today = new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

const cover = `
<section class="cover">
  <p class="eyebrow">Data Structures &amp; Algorithms · Project Report</p>
  <h1 class="title">LEBIS</h1>
  <p class="subtitle">อัลกอริทึมของระบบยืม–คืนอุปกรณ์สำหรับร้านให้เช่า</p>
  <p class="kind">รายงานฉบับสมบูรณ์${FINAL ? "" : " — ฉบับร่าง"}</p>
  <table class="team"><thead><tr><th>ชื่อ</th><th>รหัสนักศึกษา</th><th>รับผิดชอบ</th></tr></thead>
  <tbody>${TEAM.map(([n, id, r]) => `<tr><td>${n}</td><td>${id}</td><td>${r}</td></tr>`).join("")}</tbody></table>
  <p class="date">${today}</p>
</section>
<section class="toc"><h2>สารบัญ</h2><ol>
  ${parts.map((p) => `<li>${p.title}${p.missing ? ' <span class="missing">(ยังไม่มี)</span>' : ""}</li>`).join("")}
  <li>ภาคผนวก — Flowchart ${flowcharts.length} ภาพ</li>
</ol></section>`;

const appendix = `
<h1>ภาคผนวก — Flowchart</h1>
<p>Flowchart ของทั้งเล่ม เรียงตามเลขภาพ ต้นฉบับ draw.io และ PDF อยู่ใน <code>docs/data-course/flowcharts/</code></p>
<table><thead><tr><th>ภาพ</th><th>ไฟล์</th><th>ส่วน</th></tr></thead><tbody>
${flowcharts.map((f) => {
  const [, who, n] = f.match(/^flow_(kim|neo|kul)_(\d+)_/);
  const part = { kim: "1 — Kim", neo: "2 — Neo", kul: "3 — Kul" }[who];
  return `<tr><td>${n}</td><td><code>${f}</code></td><td>${part}</td></tr>`;
}).join("")}
</tbody></table>
<p>หน้าถัดไปเป็นภาพทั้ง ${flowcharts.length} ภาพ ภาพละหนึ่งหน้า</p>`;

const html = `<!doctype html><html lang="th"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<style>
  @page { size: A4; margin: 20mm 18mm 22mm; }
  body { font-family: "Sarabun", sans-serif; font-size: 11pt; line-height: 1.6; color: #1b2a2e; }
  h1 { font-size: 20pt; margin: 0 0 10pt; page-break-before: always; border-bottom: 2px solid #12383e; padding-bottom: 4pt; }
  h2 { font-size: 14pt; margin: 18pt 0 6pt; } h3 { font-size: 12pt; margin: 14pt 0 4pt; }
  p, li { margin: 4pt 0; } ul, ol { padding-left: 18pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #c9d3d5; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #eef3f4; }
  code { font-family: Menlo, Consolas, monospace; font-size: 9pt; background: #f1f4f5; padding: 0 2pt; border-radius: 2pt; }
  pre { background: #f1f4f5; padding: 8pt; border-radius: 4pt; white-space: pre-wrap; page-break-inside: avoid; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #e09540; margin: 8pt 0; padding: 2pt 10pt; color: #5b6b6f; }
  .cover { text-align: center; padding-top: 55mm; }
  .cover .eyebrow { letter-spacing: .08em; text-transform: uppercase; color: #5b6b6f; }
  .cover .title { font-size: 40pt; border: none; page-break-before: avoid; margin: 8pt 0 0; }
  .cover .subtitle { font-size: 14pt; margin: 0; } .cover .kind { font-size: 13pt; margin: 18pt 0 30pt; font-weight: 600; }
  .cover .team { width: 92%; margin: 0 auto; } .cover .date { margin-top: 20pt; color: #5b6b6f; }
  .toc { page-break-before: always; } .toc h2 { font-size: 18pt; }
  .missing { color: #b85450; }
</style></head><body>${cover}<div id="doc"></div>
<script id="parts" type="application/json">${JSON.stringify(parts).replace(/</g, "\\u003c")}</script>
<script id="appendix" type="text/html">${appendix.replace(/<\/script/g, "<\\/script")}</script>
<script>
  const parts = JSON.parse(document.getElementById("parts").textContent);
  document.getElementById("doc").innerHTML = parts.map((p) => p.missing
    ? '<h1>' + p.title + '</h1><p class="missing">ยังไม่ได้ส่ง — ผู้รับผิดชอบ: ' + p.owner + '</p>'
    : marked.parse(p.markdown)).join("") + document.getElementById("appendix").innerHTML;
  document.fonts.ready.then(() => { document.body.dataset.ready = "1"; });
</script></body></html>`;

const requireFromWeb = createRequire(join(ROOT, "nextjs", "package.json"));
const pw = await import(pathToFileURL(requireFromWeb.resolve("playwright")).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const outDir = FINAL ? COURSE_DIR : join(REPORT_DIR, "build");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, FINAL ? "LEBIS_Data_Report.pdf" : "LEBIS_Data_Report_DRAFT.pdf");

if (!FINAL) writeFileSync(join(outDir, "preview.html"), html);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await page.pdf({
  path: out, format: "A4", printBackground: true, displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  // ไม่ใส่ "/ จำนวนหน้าทั้งหมด" เพราะ Chromium นับก่อนต่อหน้า flowchart
  // เล่มจริงจะยาวกว่าตัวเลขที่พิมพ์ไว้ คนอ่านจะนึกว่าหน้าหายไป
  footerTemplate: `<div style="font-size:8pt;width:100%;text-align:center;color:#5b6b6f">LEBIS · รายงานวิชา Data Structures &amp; Algorithms${FINAL ? "" : " (ฉบับร่าง)"} · หน้า <span class="pageNumber"></span></div>`,
  margin: { top: "20mm", bottom: "22mm", left: "18mm", right: "18mm" },
});
await browser.close();

// ---------------------------------------------------------------------------
// ต่อหน้า flowchart ท้ายเล่ม
// ---------------------------------------------------------------------------

const MERGE = `
import sys, fitz
out, rest = sys.argv[1], sys.argv[2:]
doc = fitz.open(out)
for path in rest:
    with fitz.open(path) as extra:
        doc.insert_pdf(extra)
doc.save(out, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
print(doc.page_count)
`;

let merged = false;
let pages = "?";
if (flowcharts.length) {
  const paths = flowcharts.map((f) => join(FLOW_DIR, f));
  for (const py of ["python3", "python"]) {
    const run = spawnSync(py, ["-c", MERGE, out, ...paths], { encoding: "utf8" });
    if (run.status === 0) {
      merged = true;
      pages = run.stdout.trim();
      break;
    }
  }
  if (!merged) {
    const msg = "ต่อหน้า flowchart ไม่ได้ — ต้องมี Python และ PyMuPDF (pip install pymupdf)";
    if (FINAL) {
      console.error(`❌ ${msg}\nฉบับส่งจริงต้องมี flowchart อยู่ในเล่ม`);
      process.exit(1);
    }
    problems.push(msg);
  }
}

console.log(`✅ สร้างแล้ว ${relative(ROOT, out)}${merged ? ` · ${pages} หน้า รวม flowchart ${flowcharts.length} ภาพ` : ""}`);
if (problems.length) {
  console.log(`\nยังขาด ${problems.length} อย่างก่อนส่งจริง:`);
  for (const p of problems) console.log("  - " + p);
}
