// ตัวกลางเรียก API ทุกที่ในเว็บนี้ — หน้าไหนจะคุยกับ backend ให้เรียกผ่านไฟล์นี้
//
// ทำไมต้องมีไฟล์นี้: ถ้าแต่ละหน้าเขียน fetch เองหมด เวลาจะแก้อะไรทีเดียว
// (เช่นเปลี่ยนวิธีแนบ token) ต้องไปแก้ทุกหน้า
//
// path ที่ส่งเข้ามาเป็น path แบบสัมพัทธ์เสมอ เช่น "/api/auth/me"
// Next.js จะ rewrite /api/* ไปที่ FastAPI ให้เอง (ดู next.config.mjs)
// เลยไม่ต้องใส่ URL ของ backend และไม่ต้องตั้ง CORS

export const TOKEN_KEY = "token";

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
// ข้อผิดพลาดของ LEBIS
//
// backend ส่ง "รหัสข้อผิดพลาด" มาด้วย เช่น invalid_credentials
// หน้าเว็บเอารหัสนั้นไปแปลเป็นภาษาที่ผู้ใช้เลือกอยู่ ด้วย errorMessage()
// ข้อความจาก backend จึงไม่ถูกเอาไปโชว์ตรงๆ (ไม่งั้นคนเลือก EN จะเจอข้อความไทย)
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(code, { status = 0, field = null, fallback = "" } = {}) {
    super(fallback || code);
    this.name = "ApiError";
    this.code = code; // เช่น "invalid_credentials" · "network" · "server"
    this.status = status;
    this.field = field; // ชื่อช่องที่ผิด ถ้า backend บอกมา เช่น "password"
  }
}

// แปลงสิ่งที่ backend ส่งกลับมาให้เป็นรหัสข้อผิดพลาดหนึ่งตัว
function readErrorCode(data, response) {
  const detail = data?.detail;

  // แบบใหม่: { "detail": { "code": "...", "message": "..." } }
  if (detail && typeof detail === "object" && !Array.isArray(detail) && detail.code) {
    return detail.code;
  }

  // Pydantic ตรวจข้อมูลไม่ผ่าน จะส่ง list กลับมาพร้อมสถานะ 422
  if (Array.isArray(detail)) return "invalid_input";

  if (response.status === 401) return "invalid_credentials";
  if (response.status === 409) return "email_taken";
  if (response.status === 403) return "forbidden";
  if (response.status >= 500) return "server";

  return "unknown";
}

// แปลงรหัสข้อผิดพลาดเป็นประโยคในภาษาที่ผู้ใช้เลือก
//
//   import { errorMessage } from "@/lib/api";
//   catch (error) { setFormError(errorMessage(error, t)); }
//
// 🔴 ความล้มเหลวขึ้นในหน้า ตรงจุดที่ล้มเหลว ไม่ใช่ toast (docs/brand.md หัวข้อ 6)
//    toast หายเองใน 4 วินาที คนที่อ่านภาษาไทยช้ากว่านั้นจะไม่ทันเห็นว่าพังเพราะอะไร
//    toast มีไว้บอก "สำเร็จแล้ว" เท่านั้น
//
// 🔴 หน้าเว็บต้องเรียกตัวนี้เสมอ ห้ามเอา error.message ไปโชว์ตรงๆ
//    เพราะข้อความดิบอาจเป็นภาษาไทยเสมอ หรือเป็นข้อความของเบราว์เซอร์
//    อย่าง "Failed to fetch" ซึ่งเจ้าของร้านอ่านไม่รู้เรื่อง
export function errorMessage(error, t) {
  const code = error?.code || "unknown";
  const key = `error.${code}`;
  const text = t(key);

  // หาไม่เจอในคลังคำแปล translate() จะคืนชื่อคีย์กลับมา แปลว่าเรายังไม่ได้เขียนคำนี้
  return text === key ? t("error.unknown") : text;
}

// backend เรียกชื่อช่องแบบ shop_name แต่ id ของ <input> ในหน้าเว็บเป็น shopName
// ถ้าไม่แปลง ข้อความผิดพลาดจะไปแปะช่องที่ไม่มีอยู่จริง = ผู้ใช้กดส่งแล้วเหมือนหน้าเว็บค้าง
export function fieldToInputId(field) {
  if (!field) return field;
  return field.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
}

// ---------------------------------------------------------------------------
// ตัวหลัก: apiFetch
//
//   const user = await apiFetch("/api/auth/me");                        // GET
//   await apiFetch("/api/auth/login", { method: "POST", body: {...} }); // POST
//
// body ส่งเป็น object ธรรมดาได้เลย ไม่ต้อง JSON.stringify เอง
// ถ้ามี token อยู่ในเครื่อง จะแนบ header Authorization ให้อัตโนมัติ
// ถ้าไม่สำเร็จจะ throw ApiError -> ฝั่งหน้าเว็บใช้ try/catch รับ
// ---------------------------------------------------------------------------

export async function apiFetch(path, options = {}) {
  const { method = "GET", body, headers = {} } = options;

  const finalHeaders = { ...headers };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";

  const token = getToken();
  if (token) finalHeaders["Authorization"] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      // ตัดการรอที่ 15 วินาที ไม่งั้นสัญญาณอ่อนๆ หน้าร้านจะทำให้ปุ่มค้าง
      // เป็น "กำลังเข้าสู่ระบบ..." ไปเรื่อยๆ โดยไม่มีอะไรเกิดขึ้น
      signal: AbortSignal.timeout(15000),
    });
  } catch (networkError) {
    // เน็ตหลุด หรือเซิร์ฟเวอร์ไม่ตอบ — เกิดบ่อยมากเวลาใช้มือถือหน้าร้าน
    throw new ApiError("network", { fallback: "network error" });
  }

  // อ่าน body เป็น JSON — บาง response ไม่มี body (เช่น 204) เลยต้องกัน error ไว้
  // ถ้าอ่าน body ค้าง (หัวข้อความมาแล้วแต่เนื้อไม่มา) ให้ถือว่าเป็นปัญหาเครือข่าย
  // ไม่งั้นปุ่มจะค้างเป็น "กำลังโหลด..." ไปตลอดโดยไม่มีอะไรบอกผู้ใช้
  let data;
  try {
    data = await response.json();
  } catch (bodyError) {
    if (bodyError?.name === "TimeoutError" || bodyError?.name === "AbortError") {
      throw new ApiError("network", { fallback: "body timeout" });
    }
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(readErrorCode(data, response), {
      status: response.status,
      field: data?.detail?.field ?? null,
      fallback: `HTTP ${response.status}`,
    });
  }

  return data;
}
