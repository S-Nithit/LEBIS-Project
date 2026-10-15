#!/usr/bin/env node
// รวมรายงานวิชา Data Structures & Algorithms เป็น PDF เล่มเดียว
//
//   node scripts/build-data-report.mjs           ฉบับร่าง ส่วนที่ยังไม่มีขึ้นเป็นหน้าบอกว่ารอใคร
//   node scripts/build-data-report.mjs --final   ฉบับส่งจริง ขาดอะไรสักอย่างจะไม่ยอมสร้าง
//
// รูปแบบเล่มตามรายงานแลปของคณะ: ปกภาษาอังกฤษมีตราสถาบัน · ทุกหน้ามีกรอบ ·
// ตัวอักษรดำ หัวข้อตัวหนา · รูปมีคำบรรยายใต้ภาพ "รูปที่ N: ..."
//
// ต้องมี
//   - playwright ใน nextjs/ (ตัวเดียวกับ check-pages.mjs) — แปลงหน้า HTML เป็น PDF
//   - Python + PyMuPDF (pip install pymupdf) — วาดกรอบ ใส่เลขหน้า และวาง flowchart ลงหน้า
//     ทำใน Python เพราะ Node ไม่มีตัวจัดการ PDF ติดมา และไม่อยากเพิ่ม dependency ให้ nextjs/
//   - อินเทอร์เน็ตตอนรัน (โหลดฟอนต์ Sarabun และ marked)
//
// ข้อมูลหน้าปกอยู่ใน docs/data-course/report/cover.json
import { readFileSync, readdirSync, mkdirSync, existsSync, writeFileSync, renameSync, rmSync } from "node:fs";
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
  ["00-intro", "Introduction", "Neo (editor)"],
  ["kim-", "Part 1 — Insert / Delete · Hash Table", "Kim"],
  ["neo-", "Part 2 — Search / Count · Binary Search", "Neo"],
  ["kul-", "Part 3 — Sort / Group · Merge Sort", "Kul"],
  ["99-summary", "Conclusion — Three Algorithms Working Together", "Neo (editor)"],
];
const OWNER = { kim: "Kim", neo: "Neo", kul: "Kul" };

const problems = [];
// ไม่บล็อกฉบับจริง แต่ต้องบอกให้เห็น — เช่นไฟล์ของคนอื่นที่แก้แทนไม่ได้ในวันส่ง
const warnings = [];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------------------
// หน้าปก
// ---------------------------------------------------------------------------

const cover = JSON.parse(readFileSync(join(REPORT_DIR, "cover.json"), "utf8"));
// รหัสวิชาไม่บังคับ — ไม่กรอกก็ขึ้นแค่ชื่อวิชา
for (const key of ["instructor", "submitted"]) {
  if (!String(cover[key] || "").trim()) problems.push(`cover.json ยังไม่ได้กรอก "${key}"`);
}
// ช่องที่ยังว่าง ฉบับร่างโชว์เป็นแถบเหลืองให้เห็นชัดว่าต้องกรอก ไม่ใช่ปล่อยว่างเงียบๆ
const field = (value, label) => (String(value || "").trim() ? esc(value) : `<span class="todo">[${label}]</span>`);

const sealPath = join(REPORT_DIR, "assets", "kmitl-seal.png");
if (!existsSync(sealPath)) problems.push("ไม่พบตราสถาบัน docs/data-course/report/assets/kmitl-seal.png");
const seal = existsSync(sealPath) ? `data:image/png;base64,${readFileSync(sealPath).toString("base64")}` : "";

// ---------------------------------------------------------------------------
// อ่านไฟล์แต่ละส่วน
// ---------------------------------------------------------------------------

const files = readdirSync(REPORT_DIR).filter((f) => f.endsWith(".md"));
const parts = [];

const THAI = /[฀-๿]/;

for (const [prefix, title, owner] of SECTIONS) {
  // เล่มนี้เป็นภาษาอังกฤษ — ถ้ามีฉบับแปล xxx.en.md ใช้ตัวนั้น ต้นฉบับ xxx.md เก็บไว้เหมือนเดิม
  const all = files.filter((f) => f.startsWith(prefix));
  const matches = all.filter((f) => !all.includes(f.replace(/\.md$/, ".en.md")));
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
  // ฉบับแปลยังมีไทยได้ถ้าเป็นค่าจริงในข้อมูล (เช่นชื่ออุปกรณ์ที่ใช้ค้นหา) — เตือนเฉพาะไฟล์ที่ยังไม่แปล
  if (!file.endsWith(".en.md") && THAI.test(text)) warnings.push(`${file} ยังมีภาษาไทยอยู่ — เล่มนี้เป็นภาษาอังกฤษ ควรมีฉบับแปล ${file.replace(/(\.en)?\.md$/, ".en.md")}`);
  const heading = (text.match(/^# (.+)$/m) || [null, title])[1];
  parts.push({ title: heading, owner, markdown: text });
}

// ---------------------------------------------------------------------------
// flowchart — เรียงตามเลขภาพ (1–3 Kim · 4–5 Neo · 6–7 Kul)
// เล่มนี้เป็นภาษาอังกฤษ ภาพไหนมีฉบับ _eng ใช้ตัวนั้น ไม่มีก็ใช้ฉบับไทยแล้วเตือน
// ---------------------------------------------------------------------------

const flowAll = existsSync(FLOW_DIR)
  ? readdirSync(FLOW_DIR)
      .map((f) => f.match(/^flow_(kim|neo|kul)_(\d+)_(.+)\.pdf$/))
      .filter(Boolean)
  : [];
const flowFiles = [...new Set(flowAll.map((m) => Number(m[2])))]
  .sort((a, b) => a - b)
  .map((n) => {
    const same = flowAll.filter((m) => Number(m[2]) === n);
    const eng = same.find((m) => m[3].endsWith("_eng"));
    if (eng) return eng;
    const th = same.find((m) => !m[3].endsWith("_eng"));
    warnings.push(`${th[0]} ยังไม่มีฉบับภาษาอังกฤษ (…_eng.pdf) — ใช้ฉบับไทยไปก่อน`);
    return th;
  });

for (const n of [1, 2, 3, 4, 5, 6, 7]) {
  if (!flowFiles.some((m) => Number(m[2]) === n)) {
    problems.push(`ไม่พบ flowchart ภาพที่ ${n} (flow_<ชื่อ>_${n}_….pdf) ใน docs/data-course/flowcharts/`);
  }
}

// อ่านชื่อภาพ (จากหัวเรื่อง "Flowchart N — ..." ที่เขียนไว้ในไฟล์) และจำนวนหน้า ด้วย PyMuPDF
// ห้ามนับหน้าจากโครงไฟล์เอง — ไฟล์ที่ export แบบบีบอัดจะนับได้ 1 หน้าเสมอ
// แล้วสคริปต์จะหยิบแค่หน้าแรก ซึ่งอาจเป็นหน้าที่เกือบว่าง
function flowInfo(path, fallback) {
  const py = `import sys, re, json, fitz
d = fitz.open(sys.argv[1])
title = None
for p in d:
    for b in p.get_text("blocks"):
        t = " ".join(b[4].split())
        m = re.search(r"Flowchart\\s*\\d+\\s*[—–-]\\s*(.+)", t)
        if m:
            title = m.group(1); break
    if title: break
sys.stdout.buffer.write(json.dumps({"title": title, "pages": d.page_count}).encode("utf-8"))`;
  for (const exe of ["python3", "python"]) {
    const run = spawnSync(exe, ["-c", py, path], { encoding: "utf8" });
    if (run.status === 0 && run.stdout.trim()) {
      const info = JSON.parse(run.stdout.trim());
      return { title: info.title || fallback, pages: info.pages || 1 };
    }
  }
  return { title: fallback, pages: 1 };
}

const figures = [];
for (const m of flowFiles) {
  const [file, who, n] = m;
  const path = join(FLOW_DIR, file);
  const { title, pages } = flowInfo(path, file);
  if (pages > 1) warnings.push(`${file} มี ${pages} หน้า — ควร export จาก draw.io ให้เหลือหน้าเดียว (ภาพล้นกระดาษ) ตอนนี้ใส่ครบทุกหน้าไว้ก่อน`);
  for (let k = 0; k < pages; k += 1) {
    figures.push({ file, path, page: k, number: Number(n), owner: OWNER[who], title, of: pages, k: k + 1 });
  }
}

if (FINAL && problems.length) {
  console.error("❌ ยังรวมเล่มฉบับจริงไม่ได้\n");
  for (const p of problems) console.error("  - " + p);
  console.error("\nลองดูฉบับร่างได้ด้วย: node scripts/build-data-report.mjs");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// ประกอบหน้า HTML
// ---------------------------------------------------------------------------

const coverHtml = `
<section class="cover">
  <p class="inst">${esc(cover.institution)}<br>${esc(cover.school)}</p>
  ${seal ? `<img class="seal" src="${seal}" alt="">` : ""}
  <p class="course">${String(cover.course_code || "").trim() ? `${esc(cover.course_code)} - ` : ""}${esc(cover.course_name)}</p>
  <p class="rtitle">${esc(cover.report_title)}${FINAL ? "" : " (Draft)"}</p>
  <p class="instructed"><b>INSTRUCTED BY:</b> ${field(cover.instructor, "INSTRUCTOR NAME")}</p>
  <table class="who">
    <tr><td class="lab">NAME</td><td class="lab">STUDENT ID</td></tr>
    ${cover.members.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.id)}</td></tr>`).join("")}
    <tr><td class="lab gap">DATE OF SUB.:</td><td class="gap">${field(cover.submitted, "DATE")}</td></tr>
  </table>
</section>`;

const tocHtml = `
<section class="toc"><h2>Contents</h2><ol>
  ${parts.map((p) => `<li>${esc(p.title)}${p.missing ? ' <span class="todo">(not submitted yet)</span>' : ""}</li>`).join("")}
  <li>Appendix — Flowcharts</li>
</ol></section>`;

const appendixHtml = `
<h1>Appendix — Flowcharts</h1>
<p>All flowcharts in the report, in figure order, one per page. The draw.io sources and PDFs are in <code>docs/data-course/flowcharts/</code>.</p>
<table><thead><tr><th>Figure</th><th>Subject</th><th>Author</th></tr></thead><tbody>
${flowFiles.map((m) => {
  const f = figures.find((x) => x.file === m[0]);
  return `<tr><td>${f.number}</td><td>${esc(f.title)}</td><td>${f.owner}</td></tr>`;
}).join("")}
</tbody></table>
${figures.map((f, i) => `
<section class="figpage">
  <span class="slot">FIGSLOT-${String(i).padStart(2, "0")}-END</span>
  <p class="caption">Figure ${f.number}: ${esc(f.title)} (${f.owner})${f.of > 1 ? ` — page ${f.k} of ${f.of}` : ""}</p>
</section>`).join("")}`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<style>
  /* กรอบของแต่ละหน้าวาดทีหลังด้วย PyMuPDF ห่างขอบกระดาษ 12 มม.
     เนื้อหาเว้นจากขอบกระดาษ 22 มม. จึงอยู่ในกรอบโดยมีที่ว่างรอบด้าน 10 มม. */
  @page { size: A4; margin: 22mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Times, "Sarabun", serif; font-size: 12pt; line-height: 1.5; color: #000; }
  /* padding-top: สระและวรรณยุกต์ไทยที่อยู่เหนือบรรทัดยื่นออกนอกกล่อง ถ้าไม่เว้นที่
     ตรงขึ้นหน้าใหม่ จะถูกพิมพ์ไปค้างเป็นจุดเล็กๆ ท้ายหน้าก่อนหน้า */
  h1 { font-size: 16pt; font-weight: 700; margin: 0 0 10pt; padding-top: 8pt; page-break-before: always; }
  h2 { font-size: 13pt; font-weight: 700; margin: 16pt 0 6pt; }
  h3 { font-size: 12pt; font-weight: 700; margin: 12pt 0 4pt; }
  /* หัวข้อและชื่อตารางต้องไม่ค้างอยู่ท้ายหน้า แล้วปล่อยให้เนื้อหาของมันไปขึ้นหน้าถัดไป */
  h2, h3, h4 { break-after: avoid; }
  p:has(> strong:only-child) { break-after: avoid; }
  p, li { margin: 4pt 0; } ul, ol { padding-left: 20pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 10.5pt; page-break-inside: avoid; }
  th, td { border: 0.75pt solid #6b6b6b; padding: 3pt 6pt; text-align: left; vertical-align: top; }
  th { background: #e9e9e9; font-weight: 700; }
  code { font-family: "Courier New", Consolas, monospace; font-size: 10pt; }
  pre { background: #f3f3f3; border: 0.5pt solid #cfcfcf; padding: 6pt 8pt; white-space: pre-wrap; page-break-inside: avoid; }
  pre code { font-size: 9.5pt; }
  blockquote { border-left: 2pt solid #9a9a9a; margin: 8pt 0; padding: 1pt 10pt; color: #333; font-style: italic; }
  a { color: #000; }
  .todo { background: #fff1a8; color: #7a5b00; padding: 0 3pt; font-style: normal; }

  .cover { height: 245mm; display: flow-root; text-align: center; position: relative; page-break-after: always; }
  .cover .inst { margin: 4mm 0 0; font-size: 12pt; line-height: 1.35; }
  .cover .seal { width: 62mm; height: 62mm; margin: 9mm auto 10mm; display: block; }
  .cover .course { font-size: 13pt; font-weight: 700; text-decoration: underline; margin: 0 0 3mm; }
  .cover .rtitle { font-size: 12pt; margin: 0; }
  .cover .instructed { text-align: left; margin: 16mm 0 0; font-size: 12pt; }
  .cover .who { width: auto; margin: 18mm 0 0 auto; border: none; font-size: 12pt; page-break-inside: avoid; }
  .cover .who td { border: none; padding: 1pt 0 1pt 14pt; text-align: right; }
  .cover .who .lab { font-weight: 700; }
  .cover .who .gap { padding-top: 6pt; }

  .toc h2 { font-size: 16pt; margin-top: 0; }
  .toc li { margin: 6pt 0; }

  /* หน้ารูป: เว้นที่ว่างไว้ให้ PyMuPDF วาง flowchart ลงไป แล้วใส่คำบรรยายไว้ล่างสุด */
  .figpage { height: 245mm; page-break-before: always; display: flex; flex-direction: column; justify-content: space-between; }
  .figpage .slot { color: #fff; font-size: 5pt; line-height: 1; }
  .figpage .caption { text-align: center; font-style: italic; color: #555; font-size: 11pt; margin: 0; }
</style></head><body>${coverHtml}${tocHtml}<div id="doc"></div>
<script id="parts" type="application/json">${JSON.stringify(parts).replace(/</g, "\\u003c")}</script>
<script id="appendix" type="text/html">${appendixHtml.replace(/<\/script/g, "<\\/script")}</script>
<script>
  const parts = JSON.parse(document.getElementById("parts").textContent);
  document.getElementById("doc").innerHTML = parts.map((p) => p.missing
    ? '<h1>' + p.title + '</h1><p><span class="todo">Not submitted yet — author: ' + p.owner + '</span></p>'
    : marked.parse(p.markdown)).join("") + document.getElementById("appendix").innerHTML;
  document.fonts.ready.then(() => { document.body.dataset.ready = "1"; });
</script></body></html>`;

// ---------------------------------------------------------------------------
// พิมพ์เป็น PDF
// ---------------------------------------------------------------------------

const requireFromWeb = createRequire(join(ROOT, "nextjs", "package.json"));
const pw = await import(pathToFileURL(requireFromWeb.resolve("playwright")).href);
const chromium = pw.chromium ?? pw.default?.chromium;

const outDir = FINAL ? COURSE_DIR : join(REPORT_DIR, "build");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, FINAL ? "LEBIS_Data_Report.pdf" : "LEBIS_Data_Report_DRAFT.pdf");
const raw = out + ".raw.pdf";

if (!FINAL) writeFileSync(join(outDir, "preview.html"), html);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await page.pdf({ path: raw, format: "A4", printBackground: true, margin: { top: "22mm", bottom: "22mm", left: "22mm", right: "22mm" } });
await browser.close();

// ---------------------------------------------------------------------------
// วางรูป วาดกรอบ ใส่เลขหน้า
// ---------------------------------------------------------------------------

const FINISH = `
import sys, json, fitz
raw, out = sys.argv[1], sys.argv[2]
figures = json.loads(sys.stdin.read())
doc = fitz.open(raw)
MM = 72 / 25.4
FRAME = 12 * MM      # กรอบห่างขอบกระดาษ
CONTENT = 22 * MM    # เนื้อหาเริ่มที่ระยะนี้ ตรงกับ @page margin ใน HTML
CAPTION = 14 * MM    # เว้นแถบล่างไว้ให้คำบรรยายรูป

sources = {}
placed = 0
for i, fig in enumerate(figures):
    marker = "FIGSLOT-%02d-END" % i
    for pno in range(doc.page_count):
        page = doc[pno]
        hits = page.search_for(marker)
        if not hits:
            continue
        for r in hits:
            page.add_redact_annot(r, fill=(1, 1, 1))
        page.apply_redactions()
        W, H = page.rect.width, page.rect.height
        slot = fitz.Rect(CONTENT, CONTENT, W - CONTENT, H - CONTENT - CAPTION)
        src = sources.get(fig["path"]) or fitz.open(fig["path"])
        sources[fig["path"]] = src
        page.show_pdf_page(slot, src, fig["page"], keep_proportion=True)
        placed += 1
        break

for pno in range(doc.page_count):
    page = doc[pno]
    W, H = page.rect.width, page.rect.height
    page.draw_rect(fitz.Rect(FRAME, FRAME, W - FRAME, H - FRAME), color=(0, 0, 0), width=0.8)
    if pno > 0:  # ปกไม่มีเลขหน้า
        text = str(pno + 1)
        width = fitz.get_text_length(text, fontname="tiro", fontsize=10)
        page.insert_text(((W - width) / 2, H - FRAME / 2 + 3), text, fontname="tiro", fontsize=10, color=(0.25, 0.25, 0.25))

doc.save(out, garbage=3, deflate=True)
print(json.dumps({"pages": doc.page_count, "placed": placed}))
`;

let result = null;
for (const exe of ["python3", "python"]) {
  const run = spawnSync(exe, ["-c", FINISH, raw, out], {
    input: JSON.stringify(figures.map((f) => ({ path: f.path, page: f.page }))),
    encoding: "utf8",
  });
  if (run.status === 0) {
    result = JSON.parse(run.stdout.trim().split("\n").pop());
    break;
  }
  if (run.stderr && !/not found|ไม่พบ|No module named|is not recognized/i.test(run.stderr)) {
    console.error(run.stderr);
  }
}

if (!result) {
  // ไม่มี PyMuPDF — ยังได้เล่มที่ไม่มีกรอบ ไม่มี flowchart ฉบับร่างพอใช้ดูเนื้อหาได้
  if (FINAL) {
    rmSync(raw, { force: true });
    console.error("❌ ต้องมี Python และ PyMuPDF (pip install pymupdf) ฉบับส่งจริงต้องมีกรอบและ flowchart ครบ");
    process.exit(1);
  }
  renameSync(raw, out);
  problems.push("ไม่มี PyMuPDF — ฉบับร่างนี้ไม่มีกรอบหน้าและยังไม่ได้วาง flowchart (pip install pymupdf)");
} else {
  rmSync(raw, { force: true });
  if (result.placed !== figures.length) {
    problems.push(`วาง flowchart ได้ ${result.placed} จาก ${figures.length} หน้า`);
  }
}

console.log(`✅ สร้างแล้ว ${relative(ROOT, out)}${result ? ` · ${result.pages} หน้า · flowchart ${result.placed} หน้า` : ""}`);
if (problems.length) {
  console.log(`\nยังขาด ${problems.length} อย่างก่อนส่งจริง:`);
  for (const p of problems) console.log("  - " + p);
}
if (warnings.length) {
  console.log(`\n⚠️  ควรแก้ (ไม่บล็อกการสร้างฉบับจริง):`);
  for (const w of warnings) console.log("  - " + w);
}
