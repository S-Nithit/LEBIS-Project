# Design Document — วิธีเขียนและรวมเล่ม

เอกสารส่งวันที่ **21 ต.ค.** เป็น PDF เล่มเดียว แต่ละคนเขียนหัวข้อของตัวเองเป็นไฟล์แยก
แล้วคิมรวมเล่มด้วยคำสั่งเดียว (ดูท้ายไฟล์)

## ไฟล์ของแต่ละหัวข้อ

ตั้งชื่อไฟล์**ตามตารางนี้เป๊ะ** สคริปต์รวมเล่มหาไฟล์จากเลขนำหน้า ถ้าตั้งชื่อผิด หัวข้อนั้นจะหายจากเล่ม

| หัวข้อ | ไฟล์ | เจ้าของ | สถานะ |
|---|---|---|---|
| 1. Project Overview | `01-project-overview.md` | Kim | ✅ |
| 2. Requirements (functional + non-functional) | `02-requirements.md` | Neo | ✅ |
| 3. UI/UX Design (Figma wireframes + user flow) | `03-ui-ux-design.md` | Sea | |
| 4. System Design (architecture + ER diagram) | `04-system-design.md` | Kim | ✅ |
| 5. Security Design (JWT, password hashing, RBAC) | `05-security-design.md` | Kul | |
| 6. Monetization & Feature Gating | `06-monetization.md` | Kul | |
| 7. Business Analytics Dashboard | `07-analytics-dashboard.md` | Sea | |
| 8. External System Integration (LINE Messaging API) | `08-external-integration.md` | Neo | ✅ |
| 9. Testing Plan | `09-testing-plan.md` | Neo | ✅ |
| 10. Timeline and Milestones | `10-timeline.md` | Sea | |
| 11. Deployment Plan | `11-deployment-plan.md` | Kim | ✅ |

> ลำดับและชื่อหัวข้อมาจากแผนที่แบ่งงานกันไว้ ก่อนเขียนให้เทียบกับแม่แบบของอาจารย์ใน Notion อีกรอบ
> ถ้าแม่แบบมีหัวข้อย่อยที่บังคับ ต้องมีครบ

## กติกาการเขียน

1. **ภาษาอังกฤษ** ให้ตรงกับ Proposal ที่ส่งไปแล้ว ประโยคสั้น ตรงไปตรงมา
2. **บรรทัดแรกของไฟล์เป็นหัวข้อใหญ่** เช่น `# 2. Requirements` (มี `#` ตัวเดียว)
   หัวข้อย่อยใช้ `##` และ `###`
3. **เขียนเฉพาะสิ่งที่ระบบทำได้จริง** ถ้ายังไม่ได้ทำ ให้เขียนว่า planned หรือไม่ต้องเขียน
   อาจารย์เปิดโค้ดเทียบได้ และจะเทสสดตอนพรีเซนต์
4. **รูปภาพ** เก็บใน `docs/design-document/images/` แล้วอ้างแบบนี้
   `![คำอธิบายรูป](images/ชื่อไฟล์.png)` ใช้ PNG พื้นขาว
   ตัวอย่างอยู่ใน `04-system-design.md`
5. **ตาราง** ใช้รูปแบบ markdown ปกติ `| หัว | หัว |` ได้เลย
6. **โน้ตถึงกันเอง** ให้เขียนขึ้นต้นด้วย `> [Editor's note` เช่น
   `> [Editor's note] รอข้อมูลจากกุล`
   ตอนรวมเล่มฉบับจริง สคริปต์จะไม่ยอมสร้าง PDF ถ้ายังมีโน้ตแบบนี้ค้าง
7. commit ไฟล์ของตัวเองด้วยบัญชีตัวเอง แล้วเปิด PR เหมือนงานโค้ด

## รวมเล่ม (คิมเป็นคนรัน)

```bash
# ฉบับร่าง — ใช้ได้ทุกเมื่อ หัวข้อที่ยังไม่มีจะขึ้นเป็นหน้าว่างบอกว่าใครรับผิดชอบ
node scripts/build-design-doc.mjs

# ฉบับส่งจริง — ไม่ยอมสร้างถ้ายังขาดหัวข้อ ยังมีโน้ตค้าง หรือยังมีช่อง [ ... ] ที่ไม่ได้กรอก
node scripts/build-design-doc.mjs --final
```

- ฉบับร่างออกที่ `docs/design-document/build/` (ไม่ขึ้น git)
- ฉบับจริงออกที่ `docs/design-document/LEBIS_Design_Document.pdf`
- ต้องต่ออินเทอร์เน็ตตอนรัน (โหลดฟอนต์และตัวแปลง markdown)
