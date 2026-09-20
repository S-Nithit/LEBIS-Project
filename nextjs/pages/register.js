// หน้าสมัครสมาชิก
//
// ทางเดินของข้อมูลทั้งเส้น อ่านจากบนลงล่างได้เลย
//   1. ผู้ใช้พิมพ์ในฟอร์ม  -> เก็บไว้ใน state (useState) ของหน้านี้
//   2. กดปุ่มสมัคร        -> handleSubmit()
//   3. validate ฝั่งหน้าเว็บ (กันพิมพ์ผิดเบื้องต้น ไม่ใช่การกันจริง)
//   4. apiFetch("/api/auth/register")  -> FastAPI: routes/auth.py -> register()
//   5. backend hash รหัสผ่าน แล้ว INSERT ลงตาราง users
//   6. backend คืน JWT กลับมา -> saveToken() เก็บลง localStorage
//   7. พาไปหน้าแรก
//
// 🔴 validate ในไฟล์นี้เป็นแค่ความสะดวกของผู้ใช้ ตัวที่กันจริงคือ Pydantic
// กับ dependency ที่ฝั่ง backend เพราะคนแก้ JavaScript ในเบราว์เซอร์ได้

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "sonner";

import { apiFetch, saveToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Register() {
  const router = useRouter();

  // 1) ช่องในฟอร์ม — 1 ช่อง 1 state อ่านง่ายกว่าเก็บรวมเป็น object เดียว
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // 3) ตรวจข้อมูลก่อนส่ง — คืนข้อความ error ถ้าเจอปัญหา คืน null ถ้าผ่าน
  function findProblem() {
    if (!email.includes("@")) return "อีเมลไม่ถูกต้อง";
    if (name.trim().length === 0) return "กรุณากรอกชื่อ";
    if (password.length < 8) return "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร";
    if (password !== confirmPassword) return "รหัสผ่านสองช่องไม่ตรงกัน";
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault(); // กันเบราว์เซอร์ refresh หน้าเองตามพฤติกรรมเดิมของฟอร์ม

    const problem = findProblem();
    if (problem) {
      toast.error(problem);
      return;
    }

    setLoading(true);

    try {
      // 4) ยิงไป backend — ถ้า backend ตอบ error apiFetch จะ throw ให้ catch ข้างล่างรับ
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: {
          email,
          password,
          name,
          // ช่องนี้ไม่บังคับ ถ้าเว้นว่างส่ง null ไปแทนสตริงว่าง
          shop_name: shopName.trim() === "" ? null : shopName,
        },
      });

      // 6) เก็บ JWT ที่ backend ส่งมา หน้าอื่นจะหยิบไปใช้ต่อผ่าน apiFetch
      saveToken(data.access_token);

      toast.success("สมัครสมาชิกสำเร็จ ยินดีต้อนรับ");
      router.replace("/"); // 7) replace ไม่ push เพื่อไม่ให้กด back กลับมาหน้าสมัครได้
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false); // ปลดล็อกปุ่มทั้งกรณีสำเร็จและกรณีพลาด
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>สมัครสมาชิก</CardTitle>
          <CardDescription>
            เปิดใช้งาน LEBIS ฟรี จัดการอุปกรณ์ได้ถึง 50 ชิ้น
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                อีเมล
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                ชื่อผู้ใช้
              </label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="ชื่อที่ให้ระบบเรียก"
                autoComplete="name"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="shopName" className="text-sm font-medium">
                ชื่อร้าน <span className="text-muted-foreground">(ไม่บังคับ)</span>
              </label>
              <Input
                id="shopName"
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
                placeholder="เช่น นิธิศ เช่ากล้อง"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                รหัสผ่าน
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                ยืนยันรหัสผ่าน
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              มีบัญชีอยู่แล้ว?{" "}
              <Link href="/login" className="font-medium underline">
                เข้าสู่ระบบ
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
