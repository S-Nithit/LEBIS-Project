# 10. Timeline and Milestones

LEBIS was built by a team of four between 21 September and 21 October 2026. Each feature was developed on its own branch and merged into `dev` through a pull request reviewed by the team lead. The dates below are taken from the repository's commit and merge history.

## Team

| Member | Responsibilities |
|---|---|
| Nithit Srisengsuwanchai (Kim, team lead) | Project setup, database, authentication, LINE notifications, reports and CSV export, deployment, pull request review |
| Intuch Srisawat (Neo) | Inventory and rental API, Workspace page |
| Issaree Ausavapirom (Kul) | Billing API, checkout security, Pricing page with mock QR checkout |
| Pongsicha Seesavat (Sea) | Figma wireframes, Landing page, Settings page, Admin dashboard and API |

## Development Phases

| Phase | Dates | Deliverables | Owner |
|---|---|---|---|
| 1. Planning and foundation | 21–23 Sep | Proposal; project scaffolding on the course boilerplate; database schema (6 tables); architecture document; shared UI component system following `docs/brand.md` | Kim |
| 2. Authentication and deployment | 21 Sep | Register, login and `/me` with JWT (PR #1); admin account from environment variables; live deployment on Vercel and Railway | Kim |
| 3. Core CRUD features | 21–25 Sep | Inventory and rental API; Workspace page to add items, rent out and return (PR #3, merged 25 Sep) | Neo |
| 4. Notifications and reports | 25–29 Sep | LINE daily summary, LINE account linking by code, Pro-only gating (25 Sep); rental reports, CSV export, automatic Pro expiry (29 Sep) | Kim |
| 5. Billing | 28 Sep–1 Oct | Billing endpoints for plans, checkout and subscription (28 Sep); fixes for checkout replay and double-confirm (29–30 Sep); merged as PR #5 (1 Oct) | Kul |
| 6. Design and Landing page | 28 Sep–1 Oct | Figma wireframes; Landing page in Thai and English, mobile header fix (PR #4, merged 1 Oct) | Sea |
| 7. Monetization and account settings | 2–6 Oct | 50-item Free limit enforced on the server (2 Oct); Settings page for LINE linking and plan management (PR #10, merged 6 Oct); Pricing page with mock QR checkout (PR #9 and #13, merged 6 Oct) | Neo, Sea, Kul, Kim |
| 8. Admin dashboard | 5–12 Oct | Admin API gated by `require_role("admin")`, stat cards, SVG revenue and sign-up charts, Pydantic response model (PR #14, merged 12 Oct) | Sea |
| 9. Testing and demo | 12–15 Oct | End-to-end checks on the live site; progress video (14 Oct); 3-minute demo video (15 Oct); edge-case check script and presentation checklist (15 Oct) | All |
| 10. Documentation and delivery | 15–21 Oct | Design Document sections from each member; combined PDF (20 Oct); submission and presentation (21 Oct) | All |

## 10.1 Milestones

| Date | Milestone |
|---|---|
| 21 Sep | Database design complete (6 tables) |
| 21 Sep | Authentication complete (PR #1) and first live deployment |
| 23 Sep | Proposal submitted |
| 25 Sep | Workspace (core CRUD) merged (PR #3) |
| 25 Sep | LINE daily summary and account linking working |
| 30 Sep | Progress check 1 (40%): sign up / log in and Workspace live; Landing page in review |
| 1 Oct | Landing page and billing API merged (PR #4, #5) |
| 3 Oct | LINE notifications connected on the live site |
| 6 Oct | Settings and Pricing pages merged (PR #9, #10, #13) |
| 7 Oct | Progress check 2 (70%) |
| 12 Oct | Admin dashboard merged (PR #14): all planned pages complete |
| 14 Oct | Progress video: full application working end to end |
| 15 Oct | 3-minute demo video submitted |
| 21 Oct | Design Document submitted and final presentation |

## Workflow

- **Branches:** `main` holds the submitted version, `dev` collects finished work, and each feature has its own branch (for example `feature/neo-workspace`, `feature/kul-pricing`, `feature/sea-admin`).
- **Pull requests:** every feature reached `dev` through a pull request (PR #1 to #15) reviewed by the team lead before merging.
- **Automated checks:** `npm run check` (code conventions) and `npm run check:pages` (each page opened in a browser at mobile and desktop sizes) had to pass before a pull request was opened.
