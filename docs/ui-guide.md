# คู่มือหน้าตาเว็บ LEBIS

อ่านก่อนเริ่มเขียนหน้าของตัวเอง ใช้เวลาประมาณ 5 นาที
มาตรฐานทั้งหมดมาจาก [docs/brand.md](brand.md) — ไฟล์นี้คือวิธีเอาไปใช้จริงในโค้ด

หน้าตัวอย่างที่ทำเสร็จแล้วคือ `nextjs/pages/login.js` กับ `nextjs/pages/register.js`
เปิดคู่กับคู่มือนี้แล้วก็อปโครงไปใช้ได้เลย

---

## กฎ 4 ข้อ

1. **ห้ามใส่ค่าสีเอง** ไม่ว่าจะเป็น `text-blue-600`, `bg-[#0F3B43]` หรือ `style={{ color: "..." }}`
   ให้ใช้ชื่อสีของระบบเท่านั้น (ตารางข้างล่าง) เพราะสีของระบบสลับโหมดมืดให้เอง
   ถ้าใส่ค่าสีเอง โหมดมืดจะพัง
2. **ห้ามตั้งขนาดตัวอักษรเอง** ใช้คลาส `t-page-title` `t-section` `t-body` `t-label` `t-caption` `t-eyebrow`
3. **ข้อความทุกคำต้องผ่าน `t()`** เพราะเว็บนี้มีสองภาษา (ดูหัวข้อ "ข้อความสองภาษา")
4. **ข้อผิดพลาดต้องบอกใต้ช่องที่ผิดเสมอ** ไม่ใช่บอกผ่าน toast อย่างเดียว
   เพราะ toast ไม่ได้บอกว่าช่องไหนผิดและหายไปเอง (ดูหัวข้อ "บอกข้อผิดพลาดให้ถูกวิธี")

---

## โครงหน้าที่ถูกต้อง

```jsx
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { useLanguage } from "@/lib/useLanguage";

export default function Workspace() {
  const { user, loading, logout } = useAuth({ redirectTo: "/login" });
  const { t } = useLanguage();

  if (loading) return null;

  return (
    <AppShell user={user} onLogout={logout}>
      <PageHeader
        title={t("workspace.title")}
        description={t("workspace.subtitle")}
        action={<Button>{t("workspace.addItem")}</Button>}
      />

      {/* 3 สถานะที่ทุกหน้าต้องมี: กำลังโหลด / ยังไม่มีข้อมูล / มีข้อมูล */}
      {itemsLoading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("workspace.emptyTitle")}
          description={t("workspace.emptyBody")}
          action={<Button>{t("workspace.addItem")}</Button>}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("workspace.listTitle")}</CardTitle>
          </CardHeader>
          <CardContent>{/* ตารางของคุณ */}</CardContent>
        </Card>
      )}
    </AppShell>
  );
}
```

`AppShell` จัดการแถบหัวเว็บ โลโก้ ชื่อผู้ใช้ ป้ายแพ็กเกจ ปุ่มสลับภาษา
ปุ่มออกจากระบบ ความกว้างเนื้อหา และระยะขอบบนมือถือให้หมดแล้ว

---

## component กลางที่มีให้ใช้

| ตัว | ไฟล์ | ใช้ตอนไหน |
|---|---|---|
| `Logo` | `components/Logo.js` | โลโก้ทุกที่ — **ห้ามวาดเองหรือใส่รูปเอง** |
| `AppShell` | `components/AppShell.js` | ครอบทุกหน้าที่ต้องเข้าสู่ระบบก่อน |
| `PageHeader` | `components/PageHeader.js` | หัวข้อหน้า + คำอธิบาย + ปุ่มหลักของหน้า |
| `EmptyState` | `components/EmptyState.js` | ยังไม่มีข้อมูลในหน้านั้น |
| `LoadingState` | `components/LoadingState.js` | ระหว่างรอข้อมูลจาก API (แถวเปล่ากะพริบ ไม่ใช่วงกลมหมุน) |
| `StatusBadge` | `components/StatusBadge.js` | ป้ายสถานะเม็ดเล็ก |
| `Card` | `components/ui/card.js` | กล่องเนื้อหา พื้นขาว ขอบ 1px มุมมน 20px |
| `Button` | `components/ui/button.js` | ปุ่มทุกชนิด |
| `FormField` | `components/FormField.js` | ช่องกรอก 1 ช่อง พร้อมป้ายกำกับ |
| `LanguageToggle` | `components/LanguageToggle.js` | ปุ่มสลับภาษา (อยู่ใน AppShell แล้ว) |
| `AuthLayout` | `components/AuthLayout.js` | เฉพาะหน้าเข้าสู่ระบบ/สมัครสมาชิก |

ทุกไฟล์มีคอมเมนต์ภาษาไทยบอกวิธีใช้อยู่บรรทัดแรกๆ เปิดไฟล์อ่านได้เลย

### ตัวอย่างที่ใช้บ่อย

```jsx
<Logo />                                   {/* โลโก้บนพื้นอ่อน */}
<Logo variant="dark" size={26} />          {/* โลโก้บนแถบหัวเว็บสีเข้ม */}

<Button>บันทึก</Button>                     {/* ปุ่มหลัก — หน้าละ 1 ปุ่มพอ */}
<Button variant="secondary">ยกเลิก</Button>
<Button variant="ghost" size="sm">แก้ไข</Button>
<Button variant="danger">ลบอุปกรณ์</Button>

<StatusBadge tone="success">ว่าง</StatusBadge>
<StatusBadge tone="warning">ใกล้ครบกำหนด</StatusBadge>
<StatusBadge tone="danger">เกินกำหนด</StatusBadge>
<StatusBadge tone="accent">Pro</StatusBadge>
```

---

## บอกข้อผิดพลาดให้ถูกวิธี

ทุกหน้าที่มีฟอร์มทำเหมือนกันหมด 3 ขั้น

```jsx
import { apiFetch, errorMessage } from "@/lib/api";

const [errors, setErrors] = useState({});

// 1) ตรวจ "ทุกช่องพร้อมกัน" คืน object ที่ key คือ id ของช่องที่ผิด
//    อย่าหยุดที่ช่องแรกที่ผิด ไม่งั้นผู้ใช้ต้องกดส่งหลายรอบกว่าจะรู้ครบ
function validate() {
  const found = {};
  if (!email.includes("@")) found.email = t("validate.email");
  if (password.length < 8) found.password = t("validate.passwordShort");
  return found;
}

async function handleSubmit(event) {
  event.preventDefault();

  const found = validate();
  setErrors(found);
  if (Object.keys(found).length > 0) {
    toast.error(t("error.summary"));
    // 2) พาโฟกัสไปช่องแรกที่ผิด ผู้ใช้จะได้ไม่ต้องไล่หาเอง
    document.getElementById(Object.keys(found)[0])?.focus();
    return;
  }

  try {
    await apiFetch("/api/items", { method: "POST", body: {...} });
    toast.success(t("items.created"));
  } catch (error) {
    // 3) แปลรหัสข้อผิดพลาดจาก backend เป็นภาษาที่ผู้ใช้เลือกอยู่
    //    🔴 ห้ามใช้ error.message ตรงๆ เพราะอาจเป็นภาษาไทยเสมอ
    //       หรือเป็นข้อความของเบราว์เซอร์อย่าง "Failed to fetch"
    toast.error(errorMessage(error, t));
  }
}
```

แล้วส่งข้อความเข้า `FormField` ผ่าน prop `error` และส่ง `onClearError` ไปด้วย
เพื่อให้ข้อความหายทันทีที่ผู้ใช้เริ่มแก้ — ตัว component จัดการที่เหลือให้หมด
ทั้งกรอบแดง ข้อความใต้ช่อง และการบอกโปรแกรมอ่านหน้าจอ

```jsx
<FormField
  id="email"
  label={t("items.email")}
  error={errors.email}
  onClearError={clearError}   // function (field) => ล้าง errors[field]
  ...
/>
```

**ข้อผิดพลาดที่ไม่ได้ผิดที่ช่องใดช่องหนึ่ง** (เน็ตหลุด เซิร์ฟเวอร์ล่ม) ห้ามไปทำ
กรอบแดงให้ช่องที่กรอกถูกอยู่แล้ว ให้ส่งเข้า `formError` ของ `AuthLayout`
หรือวาง `<p role="alert" className="form-error">` ไว้เหนือปุ่มส่งในหน้าของคุณ

ฟอร์มทุกอันใส่ `noValidate` ด้วย เพื่อปิดกล่องเตือนของเบราว์เซอร์
ซึ่งขึ้นเป็นภาษาของเบราว์เซอร์ ไม่ใช่ภาษาที่ผู้ใช้เลือกในเว็บเรา

**เพิ่มข้อความผิดพลาดใหม่จาก backend:** ให้ backend ส่ง
`detail={"code": "ชื่อรหัส", "message": "..."}` แล้วเติมคีย์ `error.ชื่อรหัส`
ทั้งใน th และ en ที่ `lib/i18n.js`

ช่องที่เป็น `type="password"` จะมีปุ่ม แสดง/ซ่อน ให้อัตโนมัติ ไม่ต้องทำเอง

---

## ชื่อสีของระบบ

| ใช้กับอะไร | เขียนว่า |
|---|---|
| พื้นหลังของหน้า | `bg-paper` |
| พื้นการ์ดและตาราง | `bg-surface` |
| พื้นช่องกรอก (จมลงจากการ์ดหนึ่งระดับ) | `bg-paper` |
| ตัวอักษรหลัก แถบหัวเว็บ ปุ่มหลัก | `text-ink` · `bg-ink` |
| ตัวอักษรรอง คำบรรยาย หัวคอลัมน์ | `text-muted` |
| เส้นขอบ เส้นคั่น | `border-line` |
| สีเน้น (รูของแท็ก ป้าย Pro) | `bg-amber` · `text-amber-text` (อำพันที่อ่านออกบนพื้นขาว) |
| ว่าง / คืนแล้ว | `text-success` |
| ใกล้ครบกำหนด | `text-warning` |
| เกินกำหนด / ปุ่มลบ | `text-danger` |

ค่าจริงทั้งหมดอยู่ใน `nextjs/styles/globals.css` ซึ่งลอกมาจากตารางใน `docs/brand.md`

**ข้อห้ามที่ brand.md ย้ำ** ห้ามไล่สี (gradient) · ห้ามมีแถบสีตรงขอบการ์ดหรือคาดหัวการ์ด ·
ห้ามใช้ฟอนต์ Inter, Roboto, Arial · ห้ามเอาสีอำพันดิบ `--amber` มาเป็นตัวอักษรบนพื้นขาว
(ใช้ `text-amber-text` แทน) · ห้ามใส่เงาให้การ์ดธรรมดา เงาใช้เฉพาะของที่ลอยจริงเช่นเมนูที่กางลงมา

### ความมนของมุม

`rounded-control` 8px สำหรับปุ่มและช่องกรอก · `rounded-badge` 12px สำหรับป้ายและการ์ดเล็ก ·
`rounded-card` 20px สำหรับการ์ดใหญ่และแผงเนื้อหา — มีแค่ 3 ค่านี้ ห้ามเพิ่มค่าที่ 4

### ระยะห่าง

ใช้ได้แค่ 8 ค่า: `1`=4px `2`=8px `3`=12px `4`=16px `5`=24px `6`=32px `7`=48px `8`=64px
เช่น `gap-4` `p-5` `mt-6` — ห้ามใช้ค่าอื่นอย่าง `p-7` แบบ Tailwind ปกติ เพราะถูกทับไว้แล้ว

---

## ข้อความสองภาษา

ข้อความทุกคำอยู่ใน `nextjs/lib/i18n.js` ที่เดียว ทั้งไทยและอังกฤษ

```jsx
import { useLanguage } from "@/lib/useLanguage";

const { t } = useLanguage();
<h1>{t("workspace.title")}</h1>
```

เพิ่มข้อความใหม่:

1. เปิด `lib/i18n.js`
2. เติมคีย์ใหม่ใน `th` **และ** `en` ให้ครบทั้งคู่ ตั้งชื่อแบบ `ชื่อหน้า.สิ่งที่พูดถึง`
3. ถ้าลืมเติมภาษาใดภาษาหนึ่ง หน้าเว็บจะโชว์ชื่อคีย์ออกมาเลย จะได้เห็นทันที

**ภาษาไทยต้องอ่านเหมือนคนพิมพ์** สุภาพ เป็นประโยคเต็ม ไม่ห้วน

| ❌ อย่าเขียน | ✅ เขียนแบบนี้ |
|---|---|
| กรอกอีเมล | กรุณากรอกอีเมลของคุณ |
| รหัสผิด | อีเมลหรือรหัสผ่านไม่ถูกต้อง |
| ไม่มีของ | ยังไม่มีอุปกรณ์ในระบบ |
| error | เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง |

---

## จอมือถือ

ทุกหน้าต้องใช้งานได้ที่ความกว้าง 390px เพราะเจ้าของร้านใช้มือถือหน้าร้านจริง

- เรียงคอลัมน์เดียวก่อน แล้วค่อยขยายด้วย `sm:` `md:` เช่น `grid gap-5 sm:grid-cols-2`
- ปุ่มและช่องกรอกสูง 44px อยู่แล้ว อย่าทำให้เตี้ยลง
- ตารางหลายคอลัมน์บนมือถือให้เปลี่ยนเป็นการ์ดเรียงลงมา หรืออย่างน้อยครอบด้วย
  `<div className="overflow-x-auto">` ไม่งั้นทั้งหน้าจะเลื่อนซ้ายขวาได้

---

## เช็กก่อนเปิด PR

- [ ] ไม่มีค่าสีเขียนเองในไฟล์ของคุณ — `grep -nE "#[0-9a-fA-F]{6}|text-\[|bg-\[" pages/ของคุณ.js`
- [ ] ข้อความทุกคำผ่าน `t()` และเติมครบทั้ง th และ en
- [ ] หน้ามีครบ 3 สถานะ: กำลังโหลด / ไม่มีข้อมูล / มีข้อมูล
- [ ] ทุกการกดที่เปลี่ยนข้อมูลมี toast ทั้งตอนสำเร็จและตอนพลาด
- [ ] ข้อผิดพลาดของฟอร์มขึ้นใต้ช่องที่ผิด ไม่ใช่แค่ toast
- [ ] ข้อความผิดพลาดจาก backend ผ่าน `errorMessage(error, t)` ไม่ใช่ `error.message`
- [ ] เปิดที่ 390px แล้วไม่มีอะไรล้นออกนอกจอ
- [ ] ลองสลับเป็นโหมดมืดแล้วยังอ่านออกทุกบรรทัด
- [ ] โลโก้เรียกผ่าน `<Logo />` ไม่ได้วาดเองหรือใส่รูปเอง
