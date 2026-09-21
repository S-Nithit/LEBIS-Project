// การ์ด — พื้นขาว ขอบ 1px มุมมน 20px (docs/brand.md หัวข้อ 4)
//
// วิธีใช้
//   import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
//
//   <Card>
//     <CardHeader>
//       <CardTitle>อุปกรณ์ที่ถูกยืมอยู่</CardTitle>
//       <CardDescription>รายการที่ยังไม่ได้คืน</CardDescription>
//     </CardHeader>
//     <CardContent>...</CardContent>
//   </Card>
//
// 🔴 ห้ามใส่เงาให้การ์ดธรรมดา และห้ามมีแถบสีขอบการ์ด (ข้อห้ามใน brand.md)
//    เงาใช้เฉพาะของที่ลอยอยู่จริง เช่นกล่องโต้ตอบหรือเมนูที่กางลงมา

import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-card border border-line bg-surface", className)}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1 p-5", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("t-section", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("t-caption", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
