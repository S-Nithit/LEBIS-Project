/** @type {import('tailwindcss').Config} */
// ค่าทั้งหมดผูกกลับไปที่ตัวแปรใน styles/globals.css ซึ่งมาจาก docs/brand.md
// อยากเปลี่ยนสีหรือความมนของมุม ให้แก้ที่ globals.css ที่เดียว
module.exports = {
  darkMode: "media", // โหมดมืดตามการตั้งค่าเครื่องของผู้ใช้ (brand.md หัวข้อ 2)
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        amber: "var(--amber)",
        "amber-text": "var(--amber-text)",
        paper: "var(--paper)",
        surface: "var(--surface)",
        line: "var(--line)",
        muted: "var(--muted)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        "on-ink": "var(--on-ink)",
      },
      borderRadius: {
        control: "var(--radius-control)", // ปุ่ม ช่องกรอก — 8px
        badge: "var(--radius-badge)", // ป้ายสถานะ การ์ดเล็ก — 12px
        card: "var(--radius-card)", // การ์ดใหญ่ แผงเนื้อหา — 20px
      },
      spacing: {
        // ระยะห่างตามหัวข้อ 4 ของ brand.md — มีแค่ 8 ค่านี้
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "24px",
        6: "32px",
        7: "48px",
        8: "64px",
      },
      fontFamily: {
        display: ["Space Grotesk", "Prompt", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["DM Sans", "Prompt", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
