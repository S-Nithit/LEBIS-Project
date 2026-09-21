/** @type {import('next').NextConfig} */

// ปลายทางของการ rewrite /api/* — หน้าเว็บเรียก path สัมพัทธ์เสมอ (เช่น /api/items)
// แล้ว Next.js ส่งต่อไปให้ FastAPI ฝั่งเซิร์ฟเวอร์ จึงไม่ต้องตั้ง CORS
// และไม่มี URL ของ backend โผล่ในเบราว์เซอร์
//
// ตอนรันในเครื่อง: ไม่ต้องตั้งอะไร ใช้ค่า fallback ซึ่งเป็นชื่อ service ใน compose
// ตอน deploy:     ตั้ง BACKEND_URL ที่ Vercel ให้ชี้ไป URL ของ backend บน Railway
//                 ของโปรเจกต์นี้คือ https://lebis-project-production.up.railway.app
//                 (ไม่ต้องมี /api ต่อท้าย และไม่ต้องมี / ปิดท้าย)
//
// ⚠️ ค่านี้ถูกอ่านตอน build ไม่ใช่ตอนรัน ถ้าแก้ BACKEND_URL ที่ Vercel
//    ต้อง redeploy ใหม่ ค่าถึงจะมีผล
const BACKEND_URL = process.env.BACKEND_URL || "http://backend-api:8000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
