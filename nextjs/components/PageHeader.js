// หัวข้อของหน้า พร้อมคำอธิบายหนึ่งบรรทัด และช่องวางปุ่มหลักด้านขวา
//
// วิธีใช้
//   import { PageHeader } from "@/components/PageHeader";
//
//   <PageHeader
//     title="อุปกรณ์ทั้งหมด"
//     description="รายการอุปกรณ์ทุกชิ้นของร้าน พร้อมจำนวนที่ยังอยู่บนชั้น"
//     action={<Button>เพิ่มอุปกรณ์</Button>}
//   />
//
// ทุกหน้าควรขึ้นต้นด้วย component ตัวนี้ หน้าตาจะได้เป็นชุดเดียวกันทั้งเว็บ
// บนจอมือถือปุ่มจะตกลงไปอยู่ใต้หัวข้อเอง ไม่ต้องทำอะไรเพิ่ม

export function PageHeader({ title, description, action }) {
  return (
    <header className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="t-page-title">{title}</h1>
        {description ? <p className="t-caption mt-2">{description}</p> : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
