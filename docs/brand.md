# LEBIS — Brand & Design Tokens

This file is the single source of truth for how LEBIS looks. The design system
in the app is built from it, and every page must follow it.

---

## 1. The logo

The mark is a **tag** — the paper tag a rental shop ties to every item. The hole
in the tag is amber and is the only accent in the mark. It carries the meaning of
the product: everything in this shop is tagged, tracked, and comes back.

### Rules

- The mark is always drawn as a **stroke outline**, never filled solid.
- The hole is always the amber accent, never the same colour as the outline.
- On light backgrounds the outline is `--ink`. On dark backgrounds it is white.
  The hole stays amber in both cases.
- Minimum size 18px. Below 32px use the thicker favicon variant.
- Clear space around the mark on all sides is at least 25% of its height.
- Never rotate, stretch, add a gradient, add a shadow, or put the mark inside a
  circle.
- The wordmark is set in Space Grotesk 600 with `letter-spacing: 0.06em`, always
  in capitals: `LEBIS`. It is HTML text, not an image, so it stays selectable.
- In the horizontal lockup the mark's height equals the cap height of the
  wordmark plus about 45%; the gap between them is about 30% of the mark's width.

### Files to create under `nextjs/public/`

**`logo-mark.svg`** — for light backgrounds

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" role="img" aria-label="LEBIS">
  <path d="M27.4 4.5H40.5a3 3 0 0 1 3 3v13.1a3 3 0 0 1-.88 2.12L24.72 40.62a3 3 0 0 1-4.24 0L7.38 27.52a3 3 0 0 1 0-4.24L25.28 5.38a3 3 0 0 1 2.12-.88Z" stroke="#0F3B43" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="35.2" cy="12.8" r="3.4" fill="#E09540"/>
</svg>
```

**`logo-mark-inverse.svg`** — for the dark app header

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" role="img" aria-label="LEBIS">
  <path d="M27.4 4.5H40.5a3 3 0 0 1 3 3v13.1a3 3 0 0 1-.88 2.12L24.72 40.62a3 3 0 0 1-4.24 0L7.38 27.52a3 3 0 0 1 0-4.24L25.28 5.38a3 3 0 0 1 2.12-.88Z" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="35.2" cy="12.8" r="3.4" fill="#E09540"/>
</svg>
```

**`favicon.svg`** — thicker strokes so it survives 16–32px

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" role="img" aria-label="LEBIS">
  <path d="M27.4 4.5H40.5a3 3 0 0 1 3 3v13.1a3 3 0 0 1-.88 2.12L24.72 40.62a3 3 0 0 1-4.24 0L7.38 27.52a3 3 0 0 1 0-4.24L25.28 5.38a3 3 0 0 1 2.12-.88Z" stroke="#0F3B43" stroke-width="4.2" stroke-linejoin="round"/>
  <circle cx="35.2" cy="12.8" r="4.4" fill="#E09540"/>
</svg>
```

Also create a React component `nextjs/components/Logo.js` that takes a `size`
prop and a `variant` prop of `"light"` or `"dark"`, and renders the mark inline
as SVG plus the wordmark as text. Every page uses that component — nobody
re-draws the logo by hand.

---

## 2. Colour

| Token | Hex | Where it is used |
|---|---|---|
| `--ink` | `#0F3B43` | Primary text, the app header, primary buttons, the logo outline |
| `--ink-2` | `#1A5A66` | Raised surfaces on dark, avatar placeholders, hover on `--ink` |
| `--amber` | `#E09540` | The accent. The logo hole, one highlight per screen, Pro badges |
| `--amber-text` | `#B4761F` | Amber used as **text** or as a small label. The raw amber fails contrast on white |
| `--paper` | `#F7F9F9` | Page background |
| `--surface` | `#FFFFFF` | Cards, tables, inputs |
| `--line` | `#DCE6E7` | Borders and dividers |
| `--muted` | `#4A6268` | Secondary text, captions, table headers |
| `--success` | `#2F7D5D` | Available, returned |
| `--warning` | `#B4761F` | Due soon, running low |
| `--danger` | `#B3453B` | Overdue, broken, destructive actions |

Rules

- Amber is an accent, not a theme. One amber element per screen is usually
  enough. If a screen is more than 10% amber, something is wrong.
- Never put `--amber` text on white. Use `--amber-text`.
- All body text must reach 4.5:1 against its background. Large text at 24px and
  above may go to 3:1.
- Define every colour as a CSS variable on `:root` in `globals.css`. No page may
  write a hex value of its own.
- Support a dark mode by redefining the same variables under
  `@media (prefers-color-scheme: dark)`. Nothing else changes.

---

## 3. Type

Two faces, both from Google Fonts.

- **Space Grotesk** — the logo, page titles, section headings, numbers in the
  dashboard. Weights 500 and 600.
- **DM Sans** — body text, labels, table cells, buttons. Weights 400 and 500.

| Role | Size | Weight | Face |
|---|---|---|---|
| Page title | 32px | 600 | Space Grotesk |
| Section heading | 20px | 600 | Space Grotesk |
| Big number (dashboard) | 40px | 600 | Space Grotesk |
| Body | 15px | 400 | DM Sans |
| Label / table header | 13px | 500 | DM Sans |
| Caption | 13px | 400 | DM Sans, `--muted` |
| Eyebrow | 12px | 600 | Space Grotesk, `letter-spacing: 0.18em`, uppercase |

Never use Inter, Roboto, or Arial.

---

## 4. Shape and space

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64. Nothing in between.
- Border radius: 8px for inputs and buttons, 12px for small cards and badges,
  20px for large cards and panels.
- Borders are 1px `--line`. Do not use shadows for ordinary cards; a card is a
  white surface with a border. Shadows are only for things that float, such as a
  dialog or a dropdown.
- No accent stripe down the edge of a card, and no coloured bar across the top of
  a section. These read as filler.
- No gradients anywhere.

---

## 5. Components every page shares

Build these once and let all four members use them.

- `AppShell` — the dark header with the logo on the left, the current user and a
  sign-out button on the right, and the page content below on `--paper`.
- `PageHeader` — page title plus one line of description, and a slot on the
  right for the main action button.
- `EmptyState` — an outlined icon, one line of explanation, and one button.
  Every list must have one; a blank table is a bug.
- `LoadingState` — skeleton rows, not a spinner.
- `StatusBadge` — a small pill using the status colours above.
- `Card` — white surface, 1px border, 20px radius.

Each component file carries a short Thai comment at the top saying how to use it,
because three of the four members are writing their first web app.

---

## 6. Behaviour

- Every action that changes data shows a toast on success and on failure.
- Every page works at 390px wide. Tables become stacked cards on phones.
- Touch targets are at least 44px tall.
- Use real `<button>`, `<a href>`, `<input>` and `<label>` elements. Never put a
  click handler on a `div`.
- Icon-only buttons carry an `aria-label`.
