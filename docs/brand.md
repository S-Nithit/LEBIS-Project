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
| `--amber-text` | `#99641A` | Amber used as **text** or as a small label. The raw amber fails contrast on white |
| `--paper` | `#F7F9F9` | Page background |
| `--surface` | `#FFFFFF` | Cards, tables, inputs |
| `--line` | `#DCE6E7` | Borders and dividers |
| `--muted` | `#4A6268` | Secondary text, captions, table headers |
| `--success` | `#2F7D5D` | Available, returned |
| `--warning` | `#99641A` | Due soon, running low |
| `--danger` | `#B3453B` | Overdue, broken, destructive actions |

> **Amended 21 Sep 2569 — `--amber-text` and `--warning` moved from `#B4761F` to `#99641A`.**
> `#B4761F` measures 3.78:1 on white, which passes only for text at 24px and above.
> Both tokens are used for 13px labels and badges, so the original value contradicted
> the 4.5:1 rule three lines below this table. `#99641A` is the same hue at 5.01:1.
> The dark theme keeps its lighter amber, which already passed.
>
> **Also added for contrast reasons, all derived from the palette above:**
> `--line-strong` `#7D9094` light / `#729298` dark — **the boundary of any control a
> user can operate** (inputs, secondary buttons, the reveal pill), because `--line`
> measures 1.27:1 and WCAG 1.4.11 wants 3:1. `--line` stays for dividers and card
> edges, which carry no such requirement.
> *(Widened 21 Sep 2569 from "input borders only" — the narrower wording left
> secondary buttons failing the same criterion the token was introduced to satisfy.)*
>
> **Amendment — 21 Sep 2569 · badge text.** `--amber-text` `#99641A` and the
> success green are specified against **white**. A status badge does not sit on
> white: it sits on an 8% tint of its own hue, which lifts the background and drops
> the measured ratio to 4.53:1 and 4.51:1 — passing, but by less than rounding.
> Badge text therefore uses its own darker pair, `--badge-warning-text` `#8A5915`
> and `--badge-success-text` `#256A4C`, measured at 5.40:1 and 5.85:1 on the tint.
> `--amber-text` itself is unchanged and stays pinned for text on white.
> `--primary-border` `#2E8C9C` — dark mode only, the 1px edge on the primary
> button, which otherwise sits at 1.8:1 against the card.
> `--header-line` `#4A7D86` light / `#3F6D76` dark — the outline of buttons that
> sit on the dark app header.
> None of these is ever used as a text colour or as a fill.

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

> **Amendment — 21 Sep 2569 · Thai text.** Space Grotesk and DM Sans carry no Thai
> glyphs, and LEBIS is a Thai-first product. Thai is set in **Prompt**, self-hosted
> from `nextjs/public/Prompt/`, listed after DM Sans in the body stack so Latin
> characters still fall to DM Sans. Prompt is not a third brand voice and is never
> chosen for Latin text; it exists so a Thai sentence is not rendered in whatever
> the operating system happens to install. Recorded here because the rule above is
> absolute and this is a real exception to it — an exception nobody wrote down is
> indistinguishable from a mistake.

---

## 4. Shape and space

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64. Nothing in between.

> **Amendment — 21 Sep 2569 · where the scale does not apply.** "Nothing in
> between" governs **layout** — gaps, padding, margins. It does not govern the
> intrinsic size of a control, which is set by the touch target and by the glyph
> inside it, not by the rhythm of the page. The values currently outside the scale
> are all of that kind: the 22px checkbox box and its 6px radius (a 12px radius on a
> 22px square reads as a circle), the 44px control height that WCAG 2.5.8 fixes, the
> 76px reveal button sized to the longest word it must hold in either language, and
> the 1.625rem page-title line height, which is a type metric. Anything that
> positions one element relative to another still comes from the scale. Written down
> because three colour deviations were amended here and six geometry deviations were
> not — a spec that is enforced on one axis and ignored on another teaches the team
> that it is decorative.
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

> **Amended 21 Sep 2569 — failures moved out of toasts.**
> The original rule ("a toast on success and on failure") was written before the
> interface had an inline error layer. A toast names no field, disappears after a
> few seconds, and on a five-field form leaves the reader to map a sentence onto a
> control from memory. Success still toasts: it needs no action and no location.

- Every action that changes data shows a toast on **success**.
- Failures are shown **in the page, at the point of failure** — under the field the
  backend names, or in a form-level alert beside the submit button — not in a toast.
- Every page works at 390px wide. Tables become stacked cards on phones.
- Touch targets are at least 44px tall.
- Use real `<button>`, `<a href>`, `<input>` and `<label>` elements. Never put a
  click handler on a `div`.
- Icon-only buttons carry an `aria-label`.
