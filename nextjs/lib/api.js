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

// token ที่เก็บไว้ยังมีอายุอยู่ไหม — อ่านวันหมดอายุ (exp) จากตัว token เอง ไม่ต้องถามเซิร์ฟเวอร์
// ใช้ตอนหน้าเข้าสู่ระบบ/สมัครจะบอกว่า "เครื่องนี้ยังเข้าสู่ระบบอยู่"
// token หมดอายุหรืออ่านไม่ออก = ไม่ได้เข้าสู่ระบบอยู่แล้ว ห้ามบอกว่ายังเข้าอยู่
// (ลายเซ็นยังต้องตรวจที่เซิร์ฟเวอร์เหมือนเดิม ตัวนี้ใช้แค่ตัดสินว่าจะโชว์ข้อความไหม)
export function hasLiveToken() {
  const token = getToken();
  if (!token) return false;
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch (error) {
    return false;
  }
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

// รวมสัญญาณหยุดหลายตัวเป็นตัวเดียว (ตัวตัดเวลา + ปุ่มยกเลิกของผู้ใช้)
// AbortSignal.any มีเฉพาะเบราว์เซอร์ใหม่ จึงต้องมีทางถอยเหมือนกับ AbortSignal.timeout
function combineSignals(a, b) {
  const list = [a, b].filter(Boolean);
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  if (typeof AbortSignal !== "undefined" && AbortSignal.any) return AbortSignal.any(list);
  // เบราว์เซอร์เก่า: ทำเองด้วยมือ
  const controller = new AbortController();
  for (const item of list) {
    if (item.aborted) controller.abort();
    else item.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export async function apiFetch(path, options = {}) {
  const { method = "GET", body, headers = {}, signal } = options;

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
      //
      // 🔴 ต้องเช็กก่อนว่าเบราว์เซอร์รู้จัก AbortSignal.timeout ไหม
      //    Safari ต่ำกว่า 16 · Chrome ต่ำกว่า 103 · Samsung Internet ต่ำกว่า 21 ไม่มีตัวนี้
      //    ถ้าเรียกตรงๆ มันจะโยน TypeError ซึ่งตกลงไปใน catch ข้างล่างที่เขียนไว้ว่า
      //    "เน็ตหลุด" ผลคือ ทุกคำขอในระบบล้มเหลวเหมือนกันหมดตลอดไป และหน้าจอ
      //    บอกเจ้าของร้านว่าให้ไปตรวจสัญญาณอินเทอร์เน็ตที่ใช้งานได้ปกติอยู่
      //    วัดจริง: เข้าสู่ระบบด้วยรหัสที่ถูกต้อง พังใน 2568ms โดยไม่มี error ใน console เลย
      //
      //    ไม่มีตัวตัดเวลา ดีกว่าไม่มีระบบให้ใช้
      //    และถ้าหน้าเว็บส่ง signal ของตัวเองมา (ปุ่มยกเลิก) ให้รวมกับตัวตัดเวลา
      //    อันไหนมาก่อนก็หยุดด้วยอันนั้น
      signal: combineSignals(
        typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
        signal
      ),
    });
  } catch (networkError) {
    // ผู้ใช้กดยกเลิกเอง ไม่ใช่ความผิดพลาด ต้องแยกออกจาก "เน็ตหลุด"
    // ไม่งั้นกดยกเลิกแล้วจะได้กล่องแดงบอกว่าให้ไปตรวจสัญญาณอินเทอร์เน็ต
    if (signal?.aborted) throw new ApiError("cancelled", { fallback: "cancelled" });
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

// ---------------------------------------------------------------------------
// ดาวน์โหลดไฟล์ เช่น CSV — แนบ token แบบเดียวกับ apiFetch แต่คืนเป็นไฟล์แทน JSON
//
//   await apiDownload("/api/reports/rentals.csv", "lebis-rentals.csv");
//
// ทำไมไม่ใช้ <a href="/api/..." download> ธรรมดา
//   ลิงก์ธรรมดาแนบ header Authorization ไม่ได้ เซิร์ฟเวอร์จะตอบ 401 แล้วเบราว์เซอร์
//   ดาวน์โหลดไฟล์ข้อความ error มาให้แทน ผู้ใช้เปิดดูแล้วงงว่าทำไมไม่ใช่ตาราง
//   จึงโหลดเป็น blob เอง แล้วสั่งให้เบราว์เซอร์บันทึก
// ผิดพลาด = throw ApiError เหมือน apiFetch หน้าเว็บจับด้วย errorMessage() ได้เหมือนเดิม
// ---------------------------------------------------------------------------

export async function apiDownload(path, fallbackName) {
  const token = getToken();
  let response;
  try {
    response = await fetch(path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // ไฟล์ใหญ่กว่าคำขอปกติ จึงรอนานกว่าได้ แต่ก็ต้องมีเพดาน ไม่งั้นปุ่มค้างตลอดไป
      signal:
        typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined,
    });
  } catch (networkError) {
    throw new ApiError("network", { fallback: "network error" });
  }

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch (bodyError) {
      data = null;
    }
    throw new ApiError(readErrorCode(data, response), { status: response.status, fallback: `HTTP ${response.status}` });
  }

  const blob = await response.blob();
  // ใช้ชื่อไฟล์ที่เซิร์ฟเวอร์ตั้งให้ (มีวันที่ในชื่อ) ถ้าอ่านไม่ได้ค่อยใช้ชื่อสำรอง
  const disposition = response.headers.get("Content-Disposition") || "";
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] || fallbackName;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // คืนหน่วยความจำ — รอให้เบราว์เซอร์เริ่มบันทึกก่อนค่อยทิ้ง
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}
