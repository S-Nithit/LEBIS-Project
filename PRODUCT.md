# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the owner or staff of a small equipment-rental shop in Thailand — camera
rental, tool rental, event-gear rental — typically a team of 1–3 people who today
track stock on paper or in a shared spreadsheet. They are not technical.

Confirmed usage scene (from the owner, this session): **both** contexts are real
and daily. At the shop counter they work on a phone, one hand free, customer
standing in front of them, handing equipment over or taking it back. In the back
office they sit at a laptop entering a batch of items and reading reports. Neither
context is secondary.

Secondary: a platform administrator (role `admin`) who opens an internal dashboard.

## Product Purpose

Keep a rental shop's stock, borrowers, and due dates in one place so the shop
knows what is on the shelf, who has what, and what is overdue — and gets a LINE
reminder before an item becomes a loss. Success is a shop that stops losing items
and stops guessing what is available.

## Positioning

Built around the borrow record, not the product catalogue: every item is linked to
a customer, a due date, and a reminder that fires before the date passes. General
inventory tools track quantity; LEBIS tracks quantity *and* who is holding it.

## Operating Context

- Items are identified by a shop-defined code (`CAM-01`). Codes are unique within
  one shop, not globally.
- A borrow record ties one item to one customer name, phone, and due date, and is
  closed when the item is returned.
- Reminders go out over LINE, the messaging app Thai shops already use with
  customers. Paid tier only.
- Free tier: 50 items, 7 days of report history, no LINE reminders, no CSV export.
  Pro tier: 299 THB/month, unlimited items, full history, reminders, export.
- Tier and role limits are enforced server-side in FastAPI dependencies.

## Capabilities and Constraints

- Stack is fixed by the course: Next.js Pages Router in plain JavaScript,
  Tailwind, shadcn-style components already in `nextjs/components/ui/`, FastAPI,
  PostgreSQL with raw SQL. No TypeScript, no App Router, no ORM.
- Live: https://lebis-project.vercel.app · API https://lebis-project-production.up.railway.app
- Auth is JWT; the token lives in `localStorage` under the key `token`.
- **Language: the interface must support Thai and English with a control the user
  can press to switch** (confirmed this session). Thai copy must read like a
  person wrote it — polite, complete sentences, no clipped fragments, no invented
  jargon.
- Four contributors own separate files; `pages/index.js`, `settings.js`, and
  `admin.js` belong to another member and must not be edited by this work.
- Team: three of the four are writing web code for the first time. Shared code
  must stay simple enough for them to copy without help, with Thai comments.

## Brand Commitments

- Product name: **LEBIS**.
- Requested tone (owner, this session): a business tool that reads as
  trustworthy — explicitly not a toy or a consumer-playful app.
- No logo, wordmark, brand palette, or typeface has been chosen yet. Nothing
  existing constrains the visual system.

## Evidence on Hand

- Working product: authentication, registration, tier and role gates, live on the
  URLs above. Two seeded accounts exist for development only.
- Item, borrow, billing, and admin features are not built yet — they belong to
  other members and land later. Do not present them as finished.
- No customers, revenue, testimonials, or usage numbers exist. None may be
  invented anywhere in the interface.

## Product Principles

1. The shelf count and the due date are the two facts the shop opens the app for;
   everything else is secondary to those.
2. One hand, standing up, at a counter is a first-class scene — not a scaled-down
   version of the desktop layout.
3. Limits are enforced on the server; the interface explains a limit rather than
   hiding the control that hits it.
4. Thai first, English available: both languages are real, neither is a machine
   translation of the other.
5. Shared code is read by beginners, so obvious beats clever.

## Accessibility & Inclusion

Viewed on phones at the counter and laptops in the office; contrast must hold in
daylight at the shop front. Screens are viewed in person and through a recorded
video, not a projector.
