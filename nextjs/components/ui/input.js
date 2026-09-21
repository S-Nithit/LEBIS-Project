// ช่องกรอกมาตรฐานของ LEBIS
//
// ปกติไม่ต้องเรียกตัวนี้ตรงๆ ให้ใช้ <FormField> ซึ่งมีป้ายกำกับให้พร้อม
//   import { FormField } from "@/components/FormField";
//
// ความสูง 44px มุมมน 8px ตาม docs/brand.md

import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => (
  <input ref={ref} type={type} className={cn("field-input", className)} {...props} />
));
Input.displayName = "Input";

export { Input };
