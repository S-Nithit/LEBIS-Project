/** @type {import('tailwindcss').Config} */
// ค่าทั้งหมดผูกกลับไปที่ตัวแปรใน styles/globals.css ซึ่งมาจาก docs/brand.md
// อยากเปลี่ยนสีหรือความมนของมุม ให้แก้ที่ globals.css ที่เดียว
module.exports = {
  darkMode: "media", // โหมดมืดตามการตั้งค่าเครื่องของผู้ใช้ (brand.md หัวข้อ 2)
  // ต้องมี lib/ ด้วย ไม่งั้นวันที่มีคลาสไปอยู่ในนั้น Tailwind จะไม่สร้าง CSS ให้
  // แล้วหน้าจะหน้าตาผิดโดยไม่มี error อะไรเลย ซึ่งเป็นอาการที่หาต้นตอยากที่สุด
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
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
        "line-strong": "var(--line-strong)",
        muted: "var(--muted)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        "on-ink": "var(--on-ink)",
        "header-bg": "var(--header-bg)",
        "header-fg": "var(--header-fg)",
        "header-line": "var(--header-line)",
      },
      fontSize: {
        // ขนาดตัวอักษรตามหัวข้อ 3 ของ brand.md — ใช้ชื่อพวกนี้แทนการใส่ px เอง
        eyebrow: ["var(--text-eyebrow)", { lineHeight: "1.4" }],
        label: ["var(--text-label)", { lineHeight: "1.4" }],
        caption: ["var(--text-caption)", { lineHeight: "1.5" }],
        body: ["var(--text-body)", { lineHeight: "1.6" }],
        section: ["var(--text-section)", { lineHeight: "1.3" }],
        title: ["var(--text-page-title)", { lineHeight: "1.2" }],
      },
      borderRadius: {
        control: "var(--radius-control)", // ปุ่ม ช่องกรอก — 8px
        badge: "var(--radius-badge)", // ป้ายสถานะ การ์ดเล็ก — 12px
        card: "var(--radius-card)", // การ์ดใหญ่ แผงเนื้อหา — 20px
      },
      spacing: {
        // ระยะห่างตามหัวข้อ 4 ของ brand.md — มีแค่ 8 ค่านี้
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        7: "var(--space-7)",
        8: "var(--space-8)",
      },
      fontFamily: {
        display: ["Space Grotesk", "Prompt", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["DM Sans", "Prompt", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
