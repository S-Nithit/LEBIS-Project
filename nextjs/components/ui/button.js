// ปุ่มมาตรฐานของ LEBIS
//
// วิธีใช้
//   import { Button } from "@/components/ui/button";
//
//   <Button>บันทึก</Button>                          ปุ่มหลัก — มีได้หน้าละ 1 ปุ่ม
//   <Button variant="secondary">ยกเลิก</Button>       ปุ่มรอง
//   <Button variant="ghost" size="sm">แก้ไข</Button>   ปุ่มเล็กในแถวตาราง
//   <Button variant="danger">ลบอุปกรณ์</Button>        ปุ่มที่ทำแล้วย้อนยาก
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
