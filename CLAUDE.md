# LEBIS — Lab/Rental Equipment Borrow & Inventory System

> Repo context for Claude Code. Read this before touching anything.

---

## 1. What this project is

LEBIS is a commercial SaaS for **small equipment-rental shops** (camera rental,
tool rental, event-gear rental — typically 1–3 staff) who currently track stock
on paper or in a shared Excel file.

It solves three concrete pains:

1. They don't know what is on the shelf right now.
2. They lose track of who borrowed what, and chase returns too late — lost items
   cost real money.
3. They don't know which items actually earn.

LEBIS keeps every item in a database, links it to a customer and a due date, and
pushes a LINE reminder before the due date.

### This repo serves TWO university courses at once

| Course | What it grades | Where it lives in this repo |
|---|---|---|
| **AdvCompro** | The commercial product: full stack, business logic, monetization | the whole repo |
| **Data Structures & Algorithms** | Hand-written algorithms + Big-O proof | `backend/app/algorithms/` only |

The algorithms are written **once**, live in the backend, and are re-exported to
a Colab notebook for the Data course. Never fork them into a second copy.

---

## 2. Tech stack (fixed by the assignment — do not substitute)

- **Backend:** Python 3.11+ / FastAPI / Pydantic
- **Database:** PostgreSQL
- **Frontend:** Next.js (App Router) + shadcn/ui + Tailwind
- **Auth:** JWT, bcrypt password hashing
- **External API:** LINE Messaging API (overdue reminders)
- **Local dev:** Docker Compose
- **Deploy:** Vercel (frontend) + Railway/Render (backend + Postgres)

Base template: the course-provided `acpapp` boilerplate.

Do not propose swapping any of these. A substitution fails the assignment even if
it is technically better.

---

## 3. Repo layout

```
lebis/
├── CLAUDE.md                  ← this file
├── README.md                  ← must read as a PRODUCT LANDING PAGE (graded)
├── docker-compose.yml
├── .env.example               ← committed; real .env is NOT
├── .gitignore                 ← must contain .env
├── .vscode/
│   ├── extensions.json        ← team extension list, auto-prompts on open
│   └── settings.json
│
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py            FastAPI entry, router registration, CORS
│   │   ├── core/
│   │   │   ├── config.py      env settings via pydantic-settings
│   │   │   ├── security.py    JWT encode/decode, bcrypt hash/verify
│   │   │   └── deps.py        get_current_user, require_role() dependencies
│   │   ├── db/
│   │   │   ├── session.py     engine + session factory
│   │   │   └── models.py      SQLAlchemy models (6 tables)
│   │   ├── schemas/           Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── auth.py        KIM
│   │   │   ├── items.py       NEO
│   │   │   ├── borrows.py     NEO
│   │   │   ├── billing.py     KUL
│   │   │   ├── users.py       SEA
│   │   │   └── admin.py       SEA
│   │   ├── services/
│   │   │   ├── inventory.py   wraps algorithms/ for the API layer
│   │   │   ├── billing.py     tier upgrade/downgrade logic
│   │   │   └── line_notify.py LINE Messaging API client   KIM
│   │   └── algorithms/        ← DATA COURSE. PURE PYTHON ONLY.
│   │       ├── hash_table.py      KIM  — HashTable class
│   │       ├── search.py          NEO  — linear/binary/hash search + counts
│   │       ├── sort_group.py      KUL  — bubble/merge sort + grouping
│   │       └── datasets.py        NEO  — make_dataset() for sets A–D
│   └── tests/
│
├── frontend/
│   ├── package.json
│   ├── app/
│   │   ├── page.tsx           landing                 SEA
│   │   ├── (auth)/            login, register         KIM
│   │   ├── workspace/         items + borrows CRUD    NEO
│   │   ├── pricing/           plans + checkout        KUL
│   │   ├── settings/          profile, LINE link      SEA
│   │   └── admin/             analytics dashboard     SEA
│   ├── components/
│   │   └── ui/                shadcn components (generated, don't hand-edit)
│   └── lib/
│       ├── api.ts             fetch wrapper, attaches JWT
│       └── auth.ts            client-side session helpers
│
└── docs/
    ├── design-document/       AdvCompro deliverable (11 sections → PDF)
    ├── data-course/
    │   ├── plan.md            work split for the Data course
    │   ├── flowcharts/        draw.io exports (PDF)
    │   └── LEBIS_Final.ipynb  copy of the Colab notebook
    └── architecture.md
```

---

## 4. Database schema (6 tables)

```
users
  id PK, email UNIQUE, password_hash, name, shop_name,
  role ENUM('admin','free','pro') DEFAULT 'free',
  line_user_id NULLABLE, created_at

items
  id PK, owner_id FK→users.id, code, name, category,
  total INT, available INT, status ENUM('ok','out','broken'),
  daily_rate NUMERIC, created_at
  UNIQUE (owner_id, code)

borrows
  id PK, item_id FK→items.id, user_id FK→users.id,
  customer_name, customer_phone,
  borrowed_at, due_date, returned_at NULLABLE,
  status ENUM('active','returned','overdue')

subscriptions
  id PK, user_id FK→users.id, tier ENUM('free','pro'),
  started_at, expires_at, status ENUM('active','cancelled','expired')

transactions
  id PK, user_id FK→users.id, subscription_id FK→subscriptions.id,
  amount NUMERIC, method, status ENUM('pending','paid','failed'), paid_at

notifications
  id PK, user_id FK→users.id, borrow_id FK→borrows.id,
  channel DEFAULT 'line', sent_at, status
```

`items.code` is unique **per owner**, not globally — a shop's own item codes must
not collide with another shop's.

---

## 5. Business rules (these carry the AdvCompro grade)

### Tiers

| | Free | Pro — 299 THB/month |
|---|---|---|
| Shops | 1 | 1 |
| Items | max 50 | unlimited |
| LINE reminders | ✗ | ✓ |
| Report history | last 7 days | full |
| CSV export | ✗ | ✓ |

### Enforcement — non-negotiable

Tier limits are enforced **server-side**, in FastAPI dependencies. Hiding a button
in the frontend is not enforcement. The instructor will test edge cases live:

- A `free` user calling `POST /items` with 50 items already → **403**
- A `free` user calling any LINE-notify endpoint → **403**
- A `free` user calling `GET /admin/*` → **403**

Every gated route declares its requirement explicitly, e.g.
`Depends(require_tier("pro"))` / `Depends(require_role("admin"))`.

### Checkout flow (simulated — no real money)

`POST /checkout/session` → mock QR / Stripe test mode →
`POST /checkout/confirm` → writes `transactions` + `subscriptions` rows →
updates `users.role` to `pro` → the very next API call sees the new permissions.

---

## 6. The Data-course constraint — read before editing `algorithms/`

Files under `backend/app/algorithms/` **must import nothing but the Python
standard library.** No FastAPI, no SQLAlchemy, no Pydantic, no project-relative
imports.

Why: the same file is pasted into Google Colab and must run standalone there. Any
framework import breaks the Colab notebook and forces the algorithms to be written
twice — which defeats the entire reason the two courses share one project.

They take and return plain `dict` and `list`. The adapter layer that maps database
rows to those plain structures lives in `services/inventory.py`, never in
`algorithms/`.

Each of the three algorithm files is one person's graded work:

- `hash_table.py` — **Kim**. Hand-written hash table: own hash function, collision
  handling via chaining, `_resize()` at load factor > 0.7. Must NOT just wrap
  Python's `dict`.
- `search.py` — **Neo**. Hand-written binary search (no `bisect`), plus linear
  search, hash lookup, and the `count_*` functions.
- `sort_group.py` — **Kul**. Hand-written bubble sort and merge sort (no
  `sorted()` in the implementations — only as a benchmark baseline), plus grouping.

Do not "improve" these by replacing them with standard-library equivalents. The
hand-written implementation *is* the deliverable.

---

## 7. Ownership map

Four contributors. Individual grades are adjusted from commit history, so do not
write code into another member's files.

| Person | Backend | Frontend | Also owns |
|---|---|---|---|
| **Kim** (lead) | `core/`, `db/`, `routers/auth.py`, `services/line_notify.py`, `algorithms/hash_table.py` | `app/(auth)/` | repo setup, docker, schema, deployment, PR review |
| **Neo** | `routers/items.py`, `routers/borrows.py`, `algorithms/search.py`, `algorithms/datasets.py` | `app/workspace/` | LINE API doc section, testing plan |
| **Kul** | `routers/billing.py`, `services/billing.py`, `algorithms/sort_group.py` | `app/pricing/` | tier enforcement, security + monetization doc |
| **Sea** | `routers/users.py`, `routers/admin.py` | `app/page.tsx`, `app/settings/`, `app/admin/` | Figma wireframes, analytics doc |

Sea carries three frontend pages because Sea is the only member **not** enrolled in
the Data course. Across both courses the workload evens out.

If a change needs to touch someone else's file, say so instead of editing it
silently — it belongs in their PR, not ours.

---

## 8. Kim's scope in detail

Kim is the only member who has built this stack before; the other three start from
zero. So Kim's week 1 is deliberately solo: build the skeleton and one complete
reference page, then everyone else copies that pattern.

### Phase 1 — skeleton (21–23 Sep)

- [ ] Create the private GitHub repo, invite Neo, Kul, Sea, and the TA when asked
- [ ] `docker-compose.yml` bringing up FastAPI + PostgreSQL + Next.js in one command
- [ ] All 6 tables defined in `db/models.py` with foreign keys, plus migrations
- [ ] `.env.example` committed; real `.env` in `.gitignore`
- [ ] `.vscode/extensions.json` + `settings.json` so teammates get one-click setup
- [ ] README skeleton
- [ ] Everyone can run `docker compose up` and see both localhost:3000 and
      localhost:8000/docs

### Phase 2 — reference implementation (24–27 Sep)

- [ ] `core/security.py` — JWT issue/verify, bcrypt hash/verify
- [ ] `core/deps.py` — `get_current_user()`, `require_role()`, `require_tier()`
- [ ] `routers/auth.py` — register, login, me
- [ ] `frontend/app/(auth)/` — login + register pages using shadcn form components
- [ ] `frontend/lib/api.ts` — fetch wrapper that attaches the JWT
- [ ] 27 Sep: walk the whole auth path line by line with the team on a call.
      One hour of this is worth more than ten hours of tutorials for them.

### Phase 3 — Kim's own features (28 Sep – 12 Oct)

- [ ] `algorithms/hash_table.py` + its benchmark against `dict` and list scan
- [ ] `services/line_notify.py` — LINE Messaging API push client
- [ ] Daily job scanning `borrows` for due/overdue rows → queue notifications
- [ ] Gate the LINE feature behind the `pro` tier
- [ ] Deploy: frontend to Vercel, backend + Postgres to Railway/Render
- [ ] Put the live URL in the README (a localhost URL does not satisfy the brief)

### Ongoing

- [ ] Review and merge every PR into `dev`
- [ ] Resolve conflicts when three beginners touch nearby files
- [ ] Assemble `LEBIS_Final.ipynb` from the three algorithm modules

### Doc sections Kim writes

1. Project Overview · 4. System Design (architecture + ER diagram) ·
11. Deployment Plan

---

## 9. Conventions

### Git

- Branches: `main` (protected) ← `dev` ← `feature/<name>-<page>`
  e.g. `feature/neo-workspace`
- Never push directly to `main`
- PR into `dev`, Kim reviews
- Every member commits under their own GitHub account — `git config user.email`
  must match their GitHub email, or the commit is not attributed to them and
  their individual grade suffers
- Small, frequent commits over one large end-of-project commit

### Code

- Backend: snake_case, type hints on every route handler, Pydantic schemas for all
  request and response bodies — never return raw ORM objects
- Frontend: Server Components by default; add `"use client"` only where state or
  effects are needed
- shadcn components are generated with `npx shadcn@latest add <name>` — do not
  hand-edit files in `components/ui/`
- Every mutating action shows a toast on success and on error
- All pages must work at phone width

### Security

- No secrets in the repo, ever. `.env` stays in `.gitignore`
- Passwords hashed with bcrypt, never stored or logged in plain text
- Authorization checks live in FastAPI dependencies, not in route bodies

---

## 10. Commands

```bash
# bring the whole stack up
docker compose up

# backend only, hot reload
cd backend && uvicorn app.main:app --reload

# frontend only
cd frontend && npm run dev

# add a shadcn component
cd frontend && npx shadcn@latest add button

# run backend tests
cd backend && pytest

# open a psql shell inside the db container
docker compose exec db psql -U postgres -d lebis
```

- Frontend: http://localhost:3000
- API docs (Swagger UI, use this instead of Postman): http://localhost:8000/docs

---

## 11. Deadlines

### AdvCompro — weekly progress submissions

| Date | Due |
|---|---|
| 23 Sep | Proposal |
| 30 Sep | 2–3 pages, or 40% complete |
| 7 Oct | 4–6 pages, or 70% complete |
| 14 Oct | Progress video — whole app working |
| 21 Oct | Full Design Document (PDF) + 3-minute demo video |

Final deliverables: Design Document PDF · private repo with landing-page README and
a live URL · 3-minute YouTube demo (all four members on camera, no URLs shown) ·
on-stage pitch with live edge-case testing.

### Data Structures & Algorithms

| Date | Due |
|---|---|
| 18 Oct | Final report — flowchart PDF + code and results + Colab link |
| 25 Oct | 30-minute YouTube presentation |

### The real risk

The three beginners cannot start writing features until Kim's reference page lands
on 27 Sep — leaving three days before the 30 Sep 40% checkpoint. The mitigation is
that every member must have `docker compose up` working by 23 Sep. Setup failures
discovered on 28 Sep sink the milestone.

---

## 12. Working with Claude Code on this repo

- Default to the file layout in §3. If something must go elsewhere, say why.
- Never edit `algorithms/` in a way that introduces a non-stdlib import (§6).
- Never edit another member's files (§7) without flagging it.
- Never write real secrets into any committed file.
- Prefer changes scoped to one owner's area so they map cleanly onto one PR.
- When generating a route, generate its Pydantic schemas and its auth dependency
  in the same change — a route without an explicit authorization check is a bug
  here, not a TODO.
