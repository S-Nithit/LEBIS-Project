# 11. Deployment Plan

The full step-by-step setup, including every screen to click, is in
`docs/deployment.md`. This section describes the plan and the reasons behind it.

## 11.1 Environments

| | Local development | Production |
|---|---|---|
| Frontend | Docker Compose, <http://localhost:3000> | Vercel — <https://lebis-project.vercel.app> |
| Backend | Docker Compose, <http://localhost:8000> | Railway — <https://lebis-project-production.up.railway.app> |
| Database | PostgreSQL 13 in Docker, host port 5433 | PostgreSQL on Railway, private network to the backend |
| Demo accounts | Seeded automatically | **Disabled** (`SEED_DEMO_ACCOUNTS=false`) |

One command starts the whole local stack: `docker compose up --build`.

## 11.2 From commit to production

```
feature/<name>-<page>  →  pull request  →  dev  →  automatic deploy
                                                    ├─ Vercel builds the frontend
                                                    └─ Railway builds the backend
dev  →  main   once, at final submission
```

- Nobody pushes to `main`. Each member works on a feature branch and opens a pull
  request into `dev`; the team lead reviews and merges.
- Vercel and Railway both watch `dev`. A merge into `dev` deploys both sides
  without any manual step.
- Before asking for a merge, the author runs `npm run check` (project conventions)
  and `npm run check:pages` (renders every page in a real browser at phone width,
  in light and dark mode, signed in and signed out) and reports the result in the
  pull request. These run on the author's machine; there is no CI server.

## 11.3 Configuration and secrets

Secrets never enter the repository. Locally they live in a `.env` file that git
ignores; in production they are set in the Railway and Vercel dashboards.

| Variable | Where | Purpose |
|---|---|---|
| `JWT_SECRET` | Railway | Signs sign-in tokens. Production uses a different value from local development |
| `DATABASE_URL` | Railway | Provided by the Railway PostgreSQL service |
| `SEED_DEMO_ACCOUNTS` | Railway | `false`, so no account with a published password exists in production |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Railway | The operator account for the admin dashboard |
| `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` | Railway | Sending LINE messages and verifying webhooks |
| `LINE_ADD_FRIEND_URL` | Railway | Add-friend link for the LEBIS Official Account, shown on the settings page |
| `LINE_DAILY_JOB` | Railway | `off` pauses the 08:00 summary; unset or any other value runs it. Paused between test rounds to save the 300-message monthly quota |
| `BACKEND_URL` | Vercel | Where the `/api/*` rewrite forwards requests |

The system starts without the LINE variables. LINE endpoints then answer
`503 line_not_configured` and the daily job skips sending, so a missing LINE
setting cannot take the rest of the product down.

**LINE in production.** The LEBIS Official Account (`@128pwqpa`, free Thai plan,
300 push messages a month) is connected to the production backend. Its webhook
points at `https://lebis-project-production.up.railway.app/api/line/webhook`, and
LINE's webhook test returns 200, which shows the backend verified LINE's signature.
On 3 October 2026 the full path was tested on production: a Pro account
received a link code, the code was sent in the chat, and the account replied that
the shop was linked. The test message and the daily summary then arrived on the
phone.

## 11.4 Database changes

`setup_db()` runs on every backend start. It creates missing tables and adds
missing columns with `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`,
so running it twice is safe. A deploy that adds a column therefore needs no manual
step. The project uses no migration tool, and none is planned during the course.

## 11.5 Checks after every deploy

| Check | Expected |
|---|---|
| `GET /api/health` | `200 {"status": "ok"}` |
| Open the Vercel domain | The site loads |
| Register, then sign in with the new account | Both succeed |
| Sign in with `demo@example.com` | **Fails** — demo accounts must not exist in production |
| Free account: `POST /api/items` with 50 items already stored | **403** |
| Free account: `POST /api/line/digest` | **403** |
| Pro account linked to LINE: `POST /api/line/test` | The message arrives in LINE |
| Non-admin account (Free or Pro): `GET /api/admin/overview` | **403** |
| No token, or a forged token | **401** |
| Register through the Vercel domain, then look for the row in Railway's database | The row exists — proves the rewrite reaches the production backend |

## 11.6 Rolling back

Revert the bad commit on `dev` and push. Both platforms deploy the reverted code
automatically, which keeps the repository and production in the same state.
Because `setup_db()` only adds tables and columns, older code keeps working on a
newer schema.

## 11.7 Monitoring

- `GET /api/health` confirms the backend is running and reachable.
- Railway keeps the backend logs, including the result of each daily LINE job.
- Each commit on GitHub shows the deploy status from both Vercel and Railway.

## 11.8 Problems met in production, and what changed

**Deploys were silently blocked for three days.** On Vercel's free plan, a
deployment is only built when the commit's author has access to the Vercel
project. After a git configuration change, commits were authored with an email not
linked to that project. Vercel marked each one "Deployment was blocked", the site
kept serving the last good build, and nothing on the site itself showed an error.
The cause was found through the deploy status GitHub stores for each commit.
Commits are now authored with the account linked to Vercel, and the deploy status
of every merge is checked, not only the site.

**Brief 502 errors during deploys.** Railway reports a deploy as successful slightly
before the new container accepts requests. A health check sent at that moment
returned 502 and then recovered within seconds. Post-deploy checks wait for
`/api/health` to return 200 before testing anything else.
