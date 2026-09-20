// ตัวกลางเรียก API ทุกที่ในเว็บนี้ — หน้าไหนจะคุยกับ backend ให้เรียกผ่านไฟล์นี้
//
// ทำไมต้องมีไฟล์นี้: ถ้าแต่ละหน้าเขียน fetch เองหมด เวลาจะแก้อะไรทีเดียว
// (เช่นเปลี่ยนวิธีแนบ token) ต้องไปแก้ทุกหน้า
//
// path ที่ส่งเข้ามาเป็น path แบบสัมพัทธ์เสมอ เช่น "/api/auth/me"
// Next.js จะ rewrite /api/* ไปที่ FastAPI ให้เอง (ดู next.config.mjs)
// เลยไม่ต้องใส่ http://localhost:8000 และไม่ต้องตั้ง CORS

// ชื่อช่องที่เก็บ token ใน localStorage ของเบราว์เซอร์
const TOKEN_KEY = "token";

// ---------------------------------------------------------------------------
// เก็บ / อ่าน / ลบ token
// localStorage อยู่ในเบราว์เซอร์เท่านั้น ตอน Next.js render ที่ฝั่ง server
// จะไม่มี window เลยต้องเช็ก typeof window ก่อนทุกครั้ง ไม่เช็กแล้วหน้าจะพัง
// ---------------------------------------------------------------------------

export function saveToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// อ่านข้อความ error จาก FastAPI ให้เป็นประโยคที่คนอ่านรู้เรื่อง
//
// FastAPI ตอบ error มา 2 แบบ
//   1) เราโยน HTTPException เอง  ->  { "detail": "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }
//   2) Pydantic ตรวจข้อมูลไม่ผ่าน ->  { "detail": [ { "msg": "...", ... } ] }  (422)
// ---------------------------------------------------------------------------

function readErrorMessage(data, response) {
  const detail = data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    // เอาข้อความของข้อผิดพลาดตัวแรกมาแสดงพอ
    return detail[0].msg || "ข้อมูลที่กรอกไม่ถูกต้อง";
  }

  return `เกิดข้อผิดพลาด (HTTP ${response.status})`;
}

// ---------------------------------------------------------------------------
// ตัวหลัก: apiFetch
//
// ใช้แบบนี้
//   const user = await apiFetch("/api/auth/me");                       // GET
//   await apiFetch("/api/auth/login", { method: "POST", body: {...} }); // POST
//
// body ส่งเป็น object ธรรมดาได้เลย ไม่ต้อง JSON.stringify เอง
// ถ้ามี token อยู่ในเครื่อง จะแนบ header Authorization ให้อัตโนมัติ
// ถ้า backend ตอบไม่ ok จะ throw Error ออกมา -> ฝั่งหน้าเว็บใช้ try/catch รับ
// ---------------------------------------------------------------------------

export async function apiFetch(path, options = {}) {
  const { method = "GET", body, headers = {} } = options;

  const finalHeaders = { ...headers };

  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // อ่าน body เป็น JSON — บาง response ไม่มี body (เช่น 204) เลยต้องกัน error ไว้
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readErrorMessage(data, response));
  }

  return data;
}
