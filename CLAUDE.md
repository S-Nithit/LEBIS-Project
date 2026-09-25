# LEBIS — Lab/Rental Equipment Borrow & Inventory System

> Repo context for Claude Code. Read this before touching anything.
> This project is built **on top of the `acpapp` boilerplate** provided by the
> course (https://github.com/syanyong/acpapp). Its structure and libraries are
> the baseline — extend them, do not replace them.

---

## 1. What this project is

LEBIS is a commercial SaaS for **small equipment-rental shops** (camera rental,
tool rental, event-gear rental — typically 1–3 staff) who currently track stock
on paper or in a shared Excel file.

It solves three concrete pains:

1. They don't know what is on the shelf right now.
2. They lose track of who borrowed what and chase returns too late — lost items
   cost real money.
3. They don't know which items actually earn.

LEBIS keeps every item in a database, links it to a customer and a due date, and
pushes a LINE reminder before the due date.

### This repo serves TWO university courses at once

| Course | What it grades | Where it lives |
|---|---|---|
| **AdvCompro** | The commercial product: full stack, business logic, monetization | the whole repo |
| **Data Structures & Algorithms** | Hand-written algorithms + Big-O proof | `backend-api/algorithms/` only |

The algorithms are written **once**, live in the backend, and are copied into a
Colab notebook for the Data course. Never fork them into a second copy.

---

## 2. Tech stack — inherited from the boilerplate, do not substitute

- **Backend:** Python / FastAPI, async, run as `uvicorn app:app`
- **Database:** PostgreSQL 13, accessed with the **`databases`** library over
  **asyncpg**, using **raw SQL with named parameters** — there is no ORM in this
  project. Do not introduce SQLAlchemy ORM models.
- **Frontend:** Next.js **Pages Router**, plain **JavaScript** (not TypeScript),
  shadcn-style components in `nextjs/components/ui/`, Tailwind
- **API calls:** Next.js rewrites `/api/*` to the FastAPI container, so frontend
  code calls relative URLs (`fetch("/api/items")`). **No CORS config and no
  `NEXT_PUBLIC_API_URL` are needed.**
- **Passwords:** `bcrypt` called directly (already used by the boilerplate).
  Never add `passlib` — it clashes with modern bcrypt versions.
- **Local dev:** Docker Compose — all three services (`nextjs`, `backend-api`,
  `db`) run together
- **External API:** LINE Messaging API (overdue reminders)
- **Deploy:** Vercel (frontend) + Railway/Render (backend + Postgres)

Do not propose swapping any of these. A substitution fails the assignment even if
it is technically better, and the grading criteria explicitly reward leveraging
the provided boilerplate.

### Local port note

The developer's machine already runs other Postgres containers on **5432**. In
`docker-compose.yaml` the db service must publish **`"5433:5432"`**. Only the host
port changes — services inside the compose network still reach Postgres at
`db:5432`, so `POSTGRES_HOST=db` stays as is.

---

## 3. Repo layout

Boilerplate files are marked ⭑ — they already exist; extend rather than rewrite.

```
LEBIS-Project/
├── CLAUDE.md
├── README.md                      must read as a PRODUCT LANDING PAGE (graded)
├── docker-compose.yaml         ⭑  (note: .yaml, not .yml)
├── .gitignore
├── .vscode/
│   ├── extensions.json
│   └── settings.json
│
├── backend-api/
│   ├── app.py                  ⭑  FastAPI entry, lifecycle, router registration
│   ├── database.py             ⭑  connection + setup_db() + query helpers
│   ├── requirements.txt        ⭑
│   ├── Dockerfile              ⭑
│   ├── routes/
│   │   ├── auth.py             ⭑  KIM — extend with register + JWT
│   │   ├── items.py               NEO
│   │   ├── borrows.py             NEO
│   │   ├── billing.py             KUL
│   │   ├── users.py               SEA
│   │   └── admin.py               SEA
│   ├── queries/                   raw-SQL functions, one module per domain
│   │   ├── items.py               NEO
│   │   ├── borrows.py             NEO
│   │   ├── billing.py             KUL
│   │   ├── admin.py               SEA
│   │   └── inventory.py           KIM — read-only SQL feeding services/inventory.py
│   ├── services/
│   │   ├── security.py            KIM — JWT, bcrypt, role/tier dependencies
│   │   ├── inventory.py           KIM — maps DB rows to plain dict/list, calls algorithms/
│   │   └── line_notify.py         KIM — LINE Messaging API client
│   └── algorithms/                ← DATA COURSE. PURE PYTHON, STDLIB ONLY.
│       ├── hash_table.py          KIM
│       ├── search.py              NEO
│       ├── sort_group.py          KUL
│       └── datasets.py            NEO
│
├── nextjs/
│   ├── package.json            ⭑
│   ├── Dockerfile              ⭑
│   ├── components.json         ⭑
│   ├── tailwind.config.js      ⭑
│   ├── styles/globals.css      ⭑
│   ├── components/ui/          ⭑  shadcn-style components (generated)
│   ├── lib/
│   │   ├── utils.js            ⭑
│   │   └── api.js                 fetch wrapper, attaches the JWT
│   └── pages/
│       ├── _app.js             ⭑
│       ├── index.js            ⭑  landing — SEA rebuilds this
│       ├── login.js            ⭑  KIM extends
│       ├── register.js            KIM
│       ├── workspace.js           NEO
│       ├── pricing.js             KUL
│       ├── settings.js            SEA
│       └── admin.js               SEA
│
└── docs/
    ├── design-document/           AdvCompro deliverable (11 sections → PDF)
    ├── data-course/
    │   ├── plan.md
    │   ├── flowcharts/            draw.io exports (PDF)
    │   └── LEBIS_Final.ipynb      copy of the Colab notebook
    └── architecture.md
```

---

## 4. Database — raw SQL, extended from the boilerplate

The boilerplate ships **one** table created inside `setup_db()` in `database.py`:

```sql
users (email PK, password, token, create_at)
```

LEBIS extends this to **6 tables**. Add them as further `CREATE TABLE IF NOT
EXISTS` statements in `setup_db()`, in the same raw-SQL style — do not swap in an
ORM.

`users` is extended in place. Keep `email` as the primary key so the existing
auth code and the demo account keep working; add the new columns alongside.

```sql
users (
  email       VARCHAR(255) PRIMARY KEY,
  password    TEXT NOT NULL,              -- bcrypt hash
  token       TEXT,
  name        VARCHAR(120),
  shop_name   VARCHAR(120),
  role        VARCHAR(10) NOT NULL DEFAULT 'free',   -- admin | free | pro
  line_user_id VARCHAR(64),
  create_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

items (
  id          SERIAL PRIMARY KEY,
  owner_email VARCHAR(255) NOT NULL REFERENCES users(email),
  code        VARCHAR(32)  NOT NULL,
  name        VARCHAR(160) NOT NULL,
  category    VARCHAR(60)  NOT NULL,
  total       INT NOT NULL DEFAULT 1,
  available   INT NOT NULL DEFAULT 1,
  status      VARCHAR(10) NOT NULL DEFAULT 'ok',     -- ok | out | broken
  daily_rate  NUMERIC(10,2) NOT NULL DEFAULT 0,
  create_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_email, code)
)

borrows (
  id             SERIAL PRIMARY KEY,
  item_id        INT NOT NULL REFERENCES items(id),
  owner_email    VARCHAR(255) NOT NULL REFERENCES users(email),
  customer_name  VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(32),
  borrowed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date       TIMESTAMPTZ NOT NULL,
  returned_at    TIMESTAMPTZ,
  status         VARCHAR(10) NOT NULL DEFAULT 'active'  -- active|returned|overdue
)

subscriptions (
  id          SERIAL PRIMARY KEY,
  user_email  VARCHAR(255) NOT NULL REFERENCES users(email),
  tier        VARCHAR(10) NOT NULL DEFAULT 'pro',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'active'    -- active|cancelled|expired
)

transactions (
  id              SERIAL PRIMARY KEY,
  user_email      VARCHAR(255) NOT NULL REFERENCES users(email),
  subscription_id INT REFERENCES subscriptions(id),
  amount          NUMERIC(10,2) NOT NULL,
  method          VARCHAR(40) NOT NULL DEFAULT 'mock_qr',
  status          VARCHAR(10) NOT NULL DEFAULT 'pending',  -- pending|paid|failed
  paid_at         TIMESTAMPTZ
)

notifications (
  id         SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL REFERENCES users(email),
  borrow_id  INT NOT NULL REFERENCES borrows(id),
  channel    VARCHAR(20) NOT NULL DEFAULT 'line',
  sent_at    TIMESTAMPTZ,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending'
)
```

`items.code` is unique **per shop**, not globally — two shops must be able to use
the same item code.

`setup_db()` runs on every startup and is idempotent, so schema changes take
effect after `docker compose down -v && docker compose up --build`. There is no
migration tool in this project and none should be added during the course.

### Query style

Every query lives in `backend-api/queries/<domain>.py`, uses the shared
`database` object from `database.py`, and passes named parameters. Never build
SQL by string concatenation with user input.

```python
from database import database

async def get_items_by_owner(owner_email: str):
    return await database.fetch_all(
        "SELECT * FROM items WHERE owner_email = :owner_email ORDER BY code",
        {"owner_email": owner_email},
    )
```

---

## 5. Business rules (these carry the AdvCompro grade)

### Tiers

| | Free | Pro — 299 THB/month |
|---|---|---|
| Items | max 50 | unlimited |
| LINE reminders | ✗ | ✓ |
| Report history | last 7 days | full |
| CSV export | ✗ | ✓ |

### Enforcement — non-negotiable

Tier limits are enforced **server-side**, as FastAPI dependencies. Hiding a button
in the frontend is not enforcement. The instructor tests edge cases live:

- A `free` user calling `POST /api/items` with 50 items already → **403**
- A `free` user calling any LINE-notify endpoint → **403**
- A non-admin calling `GET /api/admin/*` → **403**

Gated routes declare the requirement explicitly, e.g.
`Depends(require_tier("pro"))` / `Depends(require_role("admin"))`, defined in
`backend-api/services/security.py`.

### Checkout flow (simulated — no real money)

`POST /api/checkout/session` → mock QR / Stripe test mode →
`POST /api/checkout/confirm` → inserts `transactions` + `subscriptions` rows →
updates `users.role` to `pro` → the next API call sees the new permissions.

### Auth note

The boilerplate stores an opaque `token` on the users row. LEBIS moves to **JWT**:
`services/security.py` issues and verifies the token, and the `users.token` column
is kept for compatibility with the boilerplate's demo login but is not the source
of truth.

---

## 6. The Data-course constraint — read before editing `algorithms/`

Files under `backend-api/algorithms/` **must import nothing but the Python
standard library.** No FastAPI, no `databases`, no Pydantic, no project-relative
imports.

Why: the same file is pasted into Google Colab and must run standalone there. Any
framework import breaks the notebook and forces the algorithms to be written
twice — defeating the reason the two courses share one project.

They take and return plain `dict` and `list`. The adapter that converts database
rows into those plain structures lives in `services/inventory.py`, never in
`algorithms/`.

Each of the three algorithm files is one person's graded work:

- `hash_table.py` — **Kim**. Hand-written hash table: own hash function, collision
  handling via chaining, `_resize()` at load factor > 0.7. Must NOT wrap Python's
  `dict`.
- `search.py` — **Neo**. Hand-written binary search (no `bisect`), plus linear
  search, hash lookup, and the `count_*` functions.
- `sort_group.py` — **Kul**. Hand-written bubble sort and merge sort (no
  `sorted()` inside the implementations — only as a benchmark baseline), plus
  grouping.
- `datasets.py` — **Neo**. `make_dataset()` producing test sets A–D
  (10 clean / 12 with duplicate names / 10 with zero stock / 1,000 large).

Do not "improve" these by replacing them with standard-library equivalents. The
hand-written implementation *is* the deliverable.

---

## 7. Ownership map

Four contributors. Individual grades are adjusted from commit history, so do not
write code into another member's files.

| Person | Backend | Frontend | Also owns |
|---|---|---|---|
| **Kim** (lead) | `database.py` schema, `routes/auth.py`, `services/security.py`, `services/line_notify.py`, `services/inventory.py` + `queries/inventory.py`, `algorithms/hash_table.py` | `pages/login.js`, `pages/register.js` | repo setup, docker, deployment, PR review |
| **Neo** | `routes/items.py`, `routes/borrows.py`, `queries/items.py`, `queries/borrows.py`, `algorithms/search.py`, `algorithms/datasets.py` | `pages/workspace.js` | LINE API doc section, testing plan |
| **Kul** | `routes/billing.py`, `queries/billing.py`, tier enforcement, `algorithms/sort_group.py` | `pages/pricing.js` | security + monetization doc sections |
| **Sea** | `routes/users.py`, `routes/admin.py`, `queries/admin.py` | `pages/index.js`, `pages/settings.js`, `pages/admin.js` | Figma wireframes, analytics doc |

Sea carries three frontend pages because Sea is the only member **not** enrolled in
the Data course. Across both courses the workload evens out.

If a change needs to touch someone else's file, say so instead of editing it
silently — it belongs in their PR.

---

## 8. Kim's scope in detail

Kim is the only member who has built this stack before; the other three start from
zero. Kim's first week is deliberately solo: get the boilerplate running, extend
the schema, and finish one complete reference page for the others to copy.

### Phase 1 — boilerplate running and schema extended (21–23 Sep)

- [ ] Bring the `acpapp` boilerplate into this repo as the base
- [ ] Change the db port mapping to `5433:5432`
- [ ] `.gitignore` covering `.env`, `__pycache__`, `.venv`, `node_modules`,
      `.next`, `.DS_Store`
- [ ] Extend `setup_db()` with all 6 tables from §4
- [ ] `.vscode/extensions.json` + `settings.json`
- [ ] README skeleton written as a product landing page
- [ ] Everyone can run `docker compose up --build` and reach localhost:3000 and
      localhost:8000/docs

### Phase 2 — reference implementation (24–27 Sep)

- [ ] `services/security.py` — JWT issue/verify, bcrypt helpers,
      `get_current_user()`, `require_role()`, `require_tier()`
- [ ] `routes/auth.py` — extend the boilerplate login with register + me + JWT
- [ ] `pages/register.js`, and `pages/login.js` reworked to store the JWT
- [ ] `lib/api.js` — fetch wrapper that attaches the JWT to `/api/*` calls
- [ ] 27 Sep: walk the whole auth path line by line with the team on a call.
      One hour of this is worth more than ten hours of tutorials for them.

### Phase 3 — Kim's own features (28 Sep – 12 Oct)

- [ ] `algorithms/hash_table.py` + benchmark against `dict` and a list scan
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
- Never push directly to `main`; PR into `dev`, Kim reviews
- Every member commits under their own GitHub account — `git config user.email`
  must match their GitHub email, or the commit is not attributed to them and their
  individual grade suffers
- Small, frequent commits over one large end-of-project commit

### Code

- Backend: async throughout (the `databases` library is async). Type hints on
  route handlers. Pydantic models for request and response bodies — never return a
  raw database row object.
- Every route is registered on the `/api` prefix so the Next.js rewrite reaches it.
- Frontend: Pages Router, plain JavaScript. One page per file under `pages/`.
- Reuse the shadcn components already in `nextjs/components/ui/`; add more with
  the shadcn CLI rather than hand-writing them.
- Every mutating action shows a toast on success. Failures are shown in the page
  at the point of failure (under the field, or in a form-level alert beside the
  submit button), never in a toast — see the amendment in `docs/brand.md` §6.
- All pages must work at phone width.
- The team is three first-time web developers: keep functions short, and add brief
  Thai comments where a beginner would get stuck.

### Security

- No secrets in the repo. `.env` stays in `.gitignore`.
- Passwords hashed with bcrypt, never stored or logged in plain text.
- Authorization checks live in FastAPI dependencies, not inline in route bodies.
- All SQL uses named parameters — never string concatenation with user input.

---

## 10. Commands

```bash
# bring the whole stack up (frontend, backend and db together)
docker compose up --build

# reset the database after a schema change in setup_db()
docker compose down -v && docker compose up --build

# open a psql shell inside the db container
docker compose exec db psql -U temp -d advcompro

# list tables
docker compose exec db psql -U temp -d advcompro -c "\dt"

# add a shadcn component
cd nextjs && npx shadcn@latest add button
```

- Frontend: http://localhost:3000
- API docs (Swagger UI — use this instead of Postman): http://localhost:8000/docs
- Postgres from a GUI client on the host: **port 5433**, user `temp`, password
  `temp`, database `advcompro`

Demo account inherited from the boilerplate: `demo@example.com` / `password`.

If Next.js hot reload does not pick up file changes inside Docker, set
`WATCHPACK_POLLING=true` in the `nextjs` service environment rather than moving
the frontend out of compose.

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
on 27 Sep — leaving three days before the 30 Sep 40% checkpoint. Mitigation: every
member must have `docker compose up --build` working by 23 Sep. Setup failures
discovered on 28 Sep sink the milestone.

---

## 12. Working with Claude Code on this repo

- The boilerplate's structure and libraries are the baseline. Extend `app.py`,
  `database.py` and `routes/` — do not restructure them into a different layout,
  and do not introduce an ORM, TypeScript, or the App Router.
- Never edit `algorithms/` in a way that introduces a non-stdlib import (§6).
- Never edit another member's files (§7) without flagging it.
- Never write real secrets into any committed file.
- Prefer changes scoped to one owner's area so they map cleanly onto one PR.
- When generating a route, generate its Pydantic models and its authorization
  dependency in the same change — a route without an explicit authorization check
  is a bug here, not a TODO.
- Kim's own PRs: merge them yourself once every test in the task passes.
- Other members' PRs: never merge — Kim reviews first.
