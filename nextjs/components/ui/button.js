// ปุ่มมาตรฐานของ LEBIS
//
// วิธีใช้
//   import { Button } from "@/components/ui/button";
//
//   <Button>บันทึก</Button>                          ปุ่มหลัก — 1 ปุ่มต่อ "ส่วน" ของหน้า
//                                                   (หัวข้อหน้า / กล่องว่าง / กล่องโต้ตอบ)
//                                                   หน้าที่เป็นรายการข้อมูลล้วนๆ อาจไม่มีปุ่มหลัก
//                                                   ระดับหน้าเลย — ดู docs/brand.md หัวข้อ 5
//   <Button variant="secondary">ยกเลิก</Button>       ปุ่มรอง
//   <Button variant="secondary" size="sm">แก้ไข</Button>  ปุ่มเล็กในแถวตาราง
//   <Button variant="danger">ลบอุปกรณ์</Button>        ปุ่มที่ทำแล้วย้อนยาก
//   <Button variant="onDark">ออกจากระบบ</Button>       ปุ่มบนแถบหัวเว็บสีหมึก
//   <Button asChild><Link href="/x">ไปหน้า x</Link></Button>
//
// ความสูง 44px มุมมน 8px ตาม docs/brand.md — ห้ามแก้สีหรือขนาดในหน้าตัวเอง

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  onDark: "btn-on-dark", // ปุ่มที่วางบนแถบหัวเว็บสีหมึก
};

const Button = React.forwardRef(
  ({ className, variant = "primary", size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn("btn", VARIANTS[variant] || VARIANTS.primary, size === "sm" && "btn-sm", className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
