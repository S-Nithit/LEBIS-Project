# การนำระบบขึ้นใช้งานจริง (Deployment)

| ส่วน | ที่อยู่ | ทำไม |
|---|---|---|
| Frontend (Next.js) | **Vercel** | เจ้าของ Next.js เอง ต่อ GitHub แล้ว deploy ให้อัตโนมัติทุก push |
| Backend (FastAPI) | **Railway** | รัน Dockerfile ที่มีอยู่แล้วได้ตรงๆ |
| ฐานข้อมูล (PostgreSQL) | **Railway** | อยู่โปรเจกต์เดียวกับ backend คุยกันผ่านเครือข่ายภายใน ไม่ออกอินเทอร์เน็ต |

**ลำดับสำคัญ: ขึ้น Railway ให้เสร็จก่อน** เพราะต้องเอา URL ของ backend ไปตั้งที่ Vercel

> 🔴 ห้ามเขียนค่าจริงของ `JWT_SECRET` รหัสฐานข้อมูล หรือ token ใดๆ
> ลงไฟล์ใน repo ทุกกรณี ค่าเหล่านี้กรอกในหน้าเว็บของ Vercel และ Railway เท่านั้น

---

## ขั้นที่ 1 — ฐานข้อมูลบน Railway

1. สร้างโปรเจกต์ใหม่ที่ [railway.app](https://railway.app) → **New Project**
2. **+ New → Database → Add PostgreSQL**
3. เปิดบริการ Postgres ที่เพิ่งสร้าง → แท็บ **Variables** จะเห็น `DATABASE_URL`
   หน้าตาแบบนี้ (ตัวอย่าง ไม่ใช่ค่าจริง)

   ```
   postgresql://postgres:xxxxxxxx@postgres.railway.internal:5432/railway
   ```

ยังไม่ต้องก๊อปไปไหน ขั้นต่อไปอ้างถึงค่านี้ด้วยการอ้างอิงตัวแปร ไม่ใช่การก๊อปค่า

## ขั้นที่ 2 — backend บน Railway

1. **+ New → GitHub Repo** → เลือก `S-Nithit/LEBIS-Project`
2. ตั้ง **Root Directory** เป็น `backend-api`
   Railway จะเจอ `Dockerfile` ในนั้นแล้ว build ให้เอง ไม่ต้องตั้ง build command
3. แท็บ **Variables** ใส่ตัวแปรตามตารางนี้

   | ตัวแปร | ค่าที่ใส่ | หมายเหตุ |
   |---|---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | อ้างอิงจากบริการ Postgres โดยตรง ไม่ต้องก๊อปรหัสผ่านมาวาง |
   | `JWT_SECRET` | ค่าสุ่มใหม่ 64 ตัวอักษร | **ต้องเป็นคนละค่ากับ `.env` ในเครื่อง** — อ่านเหตุผลข้างล่าง |
   | `SEED_DEMO_ACCOUNTS` | `false` | **สำคัญ** ถ้าลืมตั้ง ระบบจะสร้างบัญชี admin ที่รหัสผ่านอยู่ในโค้ดบนอินเทอร์เน็ต |

   สร้างค่า `JWT_SECRET` ใหม่ด้วยคำสั่งนี้แล้วก๊อปไปวางในช่องของ Railway

   ```bash
   openssl rand -hex 32
   ```

   ไม่ต้องตั้ง `PORT` — Railway กำหนดมาให้เอง และ `Dockerfile` อ่านค่านั้นแล้ว

4. แท็บ **Settings → Networking → Generate Domain** เพื่อขอ URL สาธารณะ
   จะได้หน้าตาประมาณ `https://lebis-api-production.up.railway.app`
5. ตรวจว่าขึ้นจริง — เปิด `<URL>/api/health` ต้องได้

   ```json
   {"status":"ok","message":"backend ทำงานปกติ"}
   ```

   และ `<URL>/docs` ต้องเห็นหน้า Swagger UI

### ทำไม `JWT_SECRET` ตอน production ต้องเป็นค่าใหม่

กุญแจนี้คือสิ่งเดียวที่พิสูจน์ว่า token ใบหนึ่งออกโดยระบบเราจริง ใครถือกุญแจ
สร้าง token ปลอมเป็นผู้ใช้คนไหนก็ได้ รวมถึง `admin`

ค่าใน `.env` บนเครื่องพัฒนาผ่านมือคนหลายคน อยู่ในเครื่องที่ลงโปรแกรมอะไรก็ไม่รู้
และอาจหลุดไปอยู่ในสกรีนช็อตหรือหน้าจอตอนสอนงาน ถ้าใช้ค่าเดียวกัน การรั่วบนเครื่อง
พัฒนาเครื่องใดเครื่องหนึ่ง = ระบบจริงถูกปลอม token ได้ทันที

ค่าที่ตั้งบน Railway ควรถูกสร้างขึ้นที่นั่นครั้งเดียว ไม่ต้องมีใครเก็บสำเนาไว้
ถ้าจำเป็นต้องเปลี่ยน (เช่นสงสัยว่าหลุด) ให้สร้างใหม่แล้ววางทับ ผู้ใช้ทุกคนจะถูก
ให้เข้าสู่ระบบใหม่ ซึ่งเป็นผลที่ถูกต้อง

## ขั้นที่ 3 — frontend บน Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → เลือก repo เดียวกัน
2. ตั้ง **Root Directory** เป็น `nextjs`
   Framework Preset จะขึ้นเป็น Next.js เอง ไม่ต้องแก้ build command
3. **Environment Variables** ใส่ตัวเดียว

   | ตัวแปร | ค่าที่ใส่ |
   |---|---|
   | `BACKEND_URL` | URL ของ backend จากขั้นที่ 2 เช่น `https://lebis-api-production.up.railway.app` |

   ใส่ **ไม่ต้องมี** `/api` ต่อท้าย และไม่ต้องมี `/` ปิดท้าย
   เพราะ `next.config.mjs` ต่อ `/api/:path*` ให้เองอยู่แล้ว

4. กด **Deploy**

> ⚠️ `BACKEND_URL` ถูกอ่านตอน build ไม่ใช่ตอนรัน ถ้าแก้ค่านี้ทีหลัง
> ต้องสั่ง **Redeploy** ค่าใหม่ถึงจะมีผล การกด Save เฉยๆ ไม่พอ

### ไม่ต้องตั้ง CORS และไม่ต้องมี `NEXT_PUBLIC_API_URL`

หน้าเว็บเรียก path สัมพัทธ์เสมอ (`fetch("/api/items")`) แล้ว Next.js ฝั่งเซิร์ฟเวอร์
ส่งต่อไปที่ backend ให้ คำขอจึงไม่เคยข้ามโดเมนในสายตาเบราว์เซอร์ ผลพลอยได้คือ
URL ของ backend ไม่โผล่ในโค้ดฝั่งเบราว์เซอร์เลย

## ขั้นที่ 4 — ตรวจหลัง deploy

| ตรวจอะไร | คาดหวัง |
|---|---|
| เปิดโดเมนของ Vercel | เห็นหน้าเว็บ |
| สมัครสมาชิกใหม่ที่ `/register` | สมัครผ่าน ได้ token กลับมา และถูกพาไปหน้าแรก |
| login ด้วยบัญชีที่เพิ่งสมัคร | ผ่าน |
| login ด้วยรหัสผิด | ขึ้นข้อความผิดพลาด ได้ 401 ไม่ใช่ 500 |
| `<backend>/api/auth/me` โดยไม่ส่ง token | 401 |
| `<backend>/api/health/protected` ด้วย token ของผู้ใช้ทั่วไป | 403 |
| ล็อกของ backend ตอนสตาร์ท | ต้องมีบรรทัด `ข้ามการใส่บัญชีทดสอบ (SEED_DEMO_ACCOUNTS=false)` |
| ลอง login ด้วย `demo@example.com` / `password` | **ต้องไม่ผ่าน** ถ้าผ่านแปลว่าลืมตั้ง `SEED_DEMO_ACCOUNTS=false` |

บรรทัดสุดท้ายสำคัญที่สุดในตาราง — เป็นการตรวจว่าไม่มีบัญชีที่ทุกคนรู้รหัสผ่าน
ค้างอยู่บนระบบจริง

ถ้าเผลอ deploy ไปแล้วโดยยังไม่ได้ปิด ให้ตั้ง `SEED_DEMO_ACCOUNTS=false`
แล้วลบสองบัญชีนั้นทิ้งด้วยมือ (การตั้งค่าอย่างเดียวไม่ลบของที่ถูกสร้างไปแล้ว)

```sql
DELETE FROM users WHERE email IN ('demo@example.com', 'admin@lebis-demo.com');
```

---

## ตารางรวมตัวแปรทั้งหมด

| ตัวแปร | ในเครื่อง | Railway (backend) | Vercel (frontend) |
|---|---|---|---|
| `JWT_SECRET` | ไฟล์ `.env` | ✅ ค่าใหม่ ไม่ซ้ำกับในเครื่อง | — |
| `DATABASE_URL` | ไม่ต้องตั้ง | ✅ `${{Postgres.DATABASE_URL}}` | — |
| `POSTGRES_USER` / `PASSWORD` / `DB` / `HOST` | ตั้งไว้แล้วใน `docker-compose.yaml` | ไม่ต้องตั้ง (ถูก `DATABASE_URL` แทน) | — |
| `SEED_DEMO_ACCOUNTS` | ไม่ต้องตั้ง (ค่าเริ่มต้น `true`) | ✅ `false` | — |
| `PORT` | ไม่ต้องตั้ง | Railway ตั้งให้เอง | — |
| `BACKEND_URL` | ไม่ต้องตั้ง (ใช้ `http://backend-api:8000`) | — | ✅ URL ของ backend |

---

## เรื่องที่ต้องรู้เกี่ยวกับฐานข้อมูลตอน deploy

**ตารางถูกสร้างตอน backend สตาร์ท** `setup_db()` รันทุกครั้งที่สตาร์ทและใช้
`CREATE TABLE IF NOT EXISTS` ทั้งหมด จึงปลอดภัยกับฐานข้อมูลเปล่าของ Railway
ไม่ต้องรัน migration หรือนำเข้าไฟล์ SQL อะไรก่อน

**โปรเจกต์นี้ไม่มีเครื่องมือ migration** ตอนเรียนอยู่ วิธีเปลี่ยนสคีมาคือ
`docker compose down -v` แล้วขึ้นใหม่ ซึ่งลบข้อมูลทิ้งหมด — ทำแบบนั้นกับฐานข้อมูล
จริงไม่ได้ ถ้าต้องแก้สคีมาหลัง deploy แล้ว ให้เพิ่มคำสั่ง `ALTER TABLE ... IF NOT
EXISTS` ต่อท้ายใน `setup_db()` แทนการแก้ `CREATE TABLE` เดิม เพราะ
`CREATE TABLE IF NOT EXISTS` จะข้ามตารางที่มีอยู่แล้ว การแก้บล็อกนั้นไม่มีผลใดๆ
กับฐานข้อมูลที่สร้างตารางไปแล้ว (คอลัมน์ที่เพิ่มทีหลังในตาราง `users` ก็ทำด้วย
วิธีนี้ ดู `ALTER_USERS` ใน `database.py`)

**รันหลายอินสแตนซ์พร้อมกันยังไม่รองรับ** ถ้าขยายเป็นหลายอินสแตนซ์ในอนาคต
สองตัวที่สตาร์ทพร้อมกันอาจสร้างตารางชนกัน ตอนนี้ใช้อินสแตนซ์เดียวจึงไม่มีปัญหา

**ค่าเชื่อมต่อมาจากไหน** `database.py` ใช้ `DATABASE_URL` ก่อนเสมอ ถ้าไม่มี
ค่อยประกอบ URL จาก `POSTGRES_*` แบบที่ compose ใช้ และรองรับทั้ง `postgres://`
กับ `postgresql://` รวมถึงแปลง `sslmode=require` ที่บางผู้ให้บริการติดมาท้าย URL
ให้เป็นรูปที่ asyncpg เข้าใจ

---

## เมื่อ deploy เสร็จแล้ว

ใส่ URL ที่ใช้งานได้จริงลงใน `README.md` แทนคำว่า TBD — โจทย์ระบุว่า
URL ที่เป็น localhost ไม่นับว่าส่งงาน
