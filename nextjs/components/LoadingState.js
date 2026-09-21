// กล่องที่แสดงระหว่างรอข้อมูลจาก API
// เป็นแถวเปล่าที่ค่อยๆ กะพริบ (skeleton) ไม่ใช่วงกลมหมุน ตาม docs/brand.md
//
// วิธีใช้
//   import { LoadingState } from "@/components/LoadingState";
//
//   if (loading) return <LoadingState />;
//   if (loading) return <LoadingState rows={6} />;
//
// ใช้ความสูงใกล้เคียงกับตารางจริง หน้าจะได้ไม่กระโดดตอนข้อมูลมาถึง

import { useLanguage } from "@/lib/useLanguage";

export function LoadingState({ rows = 4, label }) {
  const { t } = useLanguage();

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-card border border-line bg-surface p-5"
    >
      <p className="t-caption mb-4">{label || t("state.loading")}</p>

      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="h-4 w-24 animate-pulse rounded-control bg-line" />
            <span className="h-4 flex-1 animate-pulse rounded-control bg-line" />
            <span className="hidden h-4 w-20 animate-pulse rounded-control bg-line sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
