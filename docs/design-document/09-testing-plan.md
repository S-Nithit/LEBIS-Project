# 9. Testing Plan

LEBIS is tested at three levels, following the template: single functions on their
own (unit), the parts of the system working together (integration), and the system
checked against its requirements (user acceptance). Each automated check runs with a
single command.

| Level | Command | What it checks | When it runs |
|---|---|---|---|
| Unit (9.1) | `python3 backend-api/algorithms/search.py` (and `datasets.py`, `sort_group.py`) | Each algorithm function returns the right result | Every change to `backend-api/algorithms/` |
| Integration (9.2) | `node scripts/check-edge-cases.mjs` | The access rules, through the API of the deployed system | The day before and the morning of the presentation |
| Integration (9.2) | `npm run check:pages` | The pages and the API together, in a real browser | Before every pull request |
| Acceptance (9.3) | `npm run check` | Usability rules in the page code that a reviewer would otherwise have to catch by eye | Before every pull request |

There are no unit tests for the API routes; the algorithm functions are
unit-tested. The rules inside the routes are tested through the HTTP API instead
(Section 9.2).

## 9.1 Unit Testing

The search, count and sort code is also the Data Structures and Algorithms
coursework, so each function is tested on its own, without the database or the web
server.

**Self-checks.** `datasets.py`, `search.py` and `sort_group.py` each have a `verify()`
function that runs when the file is executed directly. Each check compares the
hand-written function with a straightforward reference on the same data, and the
file exits with an error if any check fails.

| File | Checks | Examples of what is checked |
|---|---:|---|
| `datasets.py` | 15 | Every set has its planned size and at least 10 records; codes are unique; set A has no duplicate names and set B does; every set contains a broken item and an overdue rental; every record has exactly the 8 fields; the same set is built identically every time |
| `search.py` | 23 | Binary search gives the same answer as a one-by-one scan for every code, for codes that do not exist, for the first and last item, and for an empty or one-item list; name search returns every match, not only the first; each count equals a count done by hand; the range query returns exactly the overdue rentals |
| `sort_group.py` | 17 | Bubble sort and merge sort give the same order as Python's `sorted()`; merge sort keeps equal items in their original order and does not change the input list; every record lands in its own group and none is lost; `group_by_status` always returns all three keys |
| **Total** | **55** | |

**Shared test data.** Every member tests on the same four data sets from
`make_dataset()`, built from fixed seeds so results repeat exactly:

| Set | Size | Built to test |
|---|---|---|
| A | 10 | Basic correctness |
| B | 12 | Duplicate names — name search must return every match, not the first |
| C | 10 | Many items out of stock — counting at the edges |
| D | 1,000 | Growth: how each method's time changes as data grows |

Broken items are placed at every 7th position so that even the small sets contain
one; otherwise the "skip broken items" rule would never be exercised.

**Notebook.** `docs/data-course/LEBIS_Final.ipynb` runs every function on sets A–D
and compares each result with a reference method on the same data. For example,
the range query "everything due before 1 October" returns 275 rentals by binary
search and 275 by a full scan of set D, and the two lists must match. The full
results are in the Data Structures and Algorithms report.

## 9.2 Integration Testing

### Access control — what the lecturer will test live

The presentation on 21 October includes live testing: the lecturer tries actions the
system must refuse. Every case below is enforced **on the server**, so it holds whether
the request comes from the website, from a script, or from the interactive API page
at `/docs`.

The first twelve rows are run automatically by `scripts/check-edge-cases.mjs`
against the deployed system: the website's API, its database and the sign-in tokens
together.

| # | Case | Request | Expected | Why it holds |
|---|---|---|---|---|
| 1 | Free shop adds its 51st item | `POST /api/items` | **403** `item_limit_reached` | The count and the insert run in one transaction, so two tabs adding at the same time cannot both get through |
| 2 | Free shop requests a LINE link code | `POST /api/line/link-code` | **403** `tier_required` | `require_tier("pro")` |
| 3 | Free shop sends a LINE test message | `POST /api/line/test` | **403** `tier_required` | `require_tier("pro")` |
| 4 | Free shop sends a LINE summary | `POST /api/line/digest` | **403** `tier_required` | `require_tier("pro")` |
| 5 | Free shop exports CSV | `GET /api/reports/rentals.csv` | **403** `tier_required` | `require_tier("pro")` |
| 6 | Free shop opens the admin dashboard | `GET /api/admin/overview` | **403** `role_required` | `require_role("admin")` |
| 7 | Pro shop (not admin) opens the admin dashboard | `GET /api/admin/overview` | **403** `role_required` | Pro is a plan, not a role; only `admin` passes |
| 8 | No token, list items | `GET /api/items` | **401** `not_signed_in` | Every data route depends on `get_current_user` |
| 9 | No token, admin dashboard | `GET /api/admin/overview` | **401** | Sign-in is checked before the role |
| 10 | Forged token | `GET /api/items` with a token that was not signed by the server | **401** | The JWT signature is verified on every request |
| 11 | Pro shop exports CSV | `GET /api/reports/rentals.csv` | **200** | Confirms the Pro path still works |
| 12 | Pro shop reads LINE status | `GET /api/line/status` | **200** | Confirms the Pro path still works |

The script also confirms two preconditions, because a case is only meaningful if the
data is set up for it: the Free demo shop must hold exactly 50 items with
`item_limit = 50`, and the Pro demo shop must have a linked LINE account. With the
twelve cases, that makes 14 checks in one run.

The script changes no data. Every request that would write is one that must be
refused; if any of them is accepted, the script reports a failure.

Cases checked by hand on the day:

| # | Case | Expected | Why it holds |
|---|---|---|---|
| 13 | Free shop asks for a report longer than 7 days | **200** with only the last 7 days and `limited: true` | The plan limits history; it does not remove the report (Section 4.3) |
| 14 | Upgrade, then press confirm several times | Pro is granted once; no duplicate payment row | The user row and the pending transaction are locked inside one transaction |
| 15 | Rent an item with no units available | **409** `item_unavailable` | `available` is checked under a row lock before the rental is saved |
| 16 | Rent an item marked broken | **409** `item_broken` | Item status is checked before the rental is saved |
| 17 | Return the same rental twice | **409** `borrow_already_returned` | The item is not added back to the shelf twice |
| 18 | Open another shop's item by id | **404** `item_not_found` | Every query filters by `owner_email`. The answer is 404, not 403, so it does not confirm the item exists |

### Business rules and data integrity

These rules protect the numbers the owner relies on. Each was tested through the API
against a running database before its pull request was opened.

| Rule | Test | Expected |
|---|---|---|
| Item codes are unique within a shop | Add or rename an item to a code the shop already uses | **409** `item_code_taken` |
| An item with rental history cannot be deleted | Delete an item that was rented before | **409** `item_has_history`, with a message suggesting "mark as broken" instead |
| An item that is out cannot be deleted | Delete an item with an open rental | **409** `item_has_active_borrows` |
| Stock cannot drop below what is rented | Lower `total` below the number currently rented | **409** `item_total_below_borrowed` |
| Due dates cannot be in the past | Create a rental with yesterday as the due date | **422** `due_date_past` |
| The item limit comes from the server | `GET /api/items/summary` as Free, then as Pro | `item_limit` is `50` for Free and `null` for Pro |
| Broken items are not "with customers" | A shop with 5 cameras and 4 tripods rents 2 cameras, then marks the tripods broken | `borrowed_units` stays **2**. The previous formula reported 6 |
| Summary counts match the algorithms module | Compare the summary against the SQL it replaced, on normal data and on edge cases (a broken item still holding stock, a rental due today, a rental due yesterday) | Every number identical |

### Pages and API together

`npm run check:pages` runs against the full local system started with
`docker compose up` — the Next.js frontend, the FastAPI backend and PostgreSQL. It
signs in through the real sign-in form with the local example account, then opens
every page in Chromium: four public pages in light and dark mode for three kinds of
visitor, plus every page that requires sign-in. It fails if:

- Sign-in through the form does not reach the Account page.
- The page scrolls sideways at 390 px, the width of a common phone.
- Text changes after the user has already seen it. Sections that are still waiting
  for the API must declare `aria-busy="true"` and show a placeholder, not a value
  that will change.
- The `<html lang>` attribute does not match the language the visitor chose.
- The browser was redirected to a different page, which would make every measurement
  describe the wrong page.
- The page throws a JavaScript error, logs a console error, or the server-rendered
  page does not match what the browser renders (a hydration mismatch).

## 9.3 User Acceptance Testing

### Tested against the requirements

Every requirement in Section 2 is accepted by at least one check. The two tables
below show which one.

**Functional requirements (Section 2.1)**

| Requirements | Accepted when | Checked by |
|---|---|---|
| FR-1 – FR-6 · Accounts | A user can register, sign in and edit their profile; a wrong email and a wrong password give the same answer | `check:pages` signs in through the form on every run · the rest by hand on the live site |
| FR-7 – FR-13 · Equipment | Items can be added, searched, edited, marked broken and deleted only when safe; the three numbers are correct; the 51st Free item is refused | Business-rule tests in 9.2 · case 1 |
| FR-14 – FR-17 · Rentals | A rental moves a unit off the shelf, a return puts it back once, impossible rentals are refused | Cases 15–17 · due-date rule in 9.2 |
| FR-18 – FR-20 · Reports | Free sees 7 days, Pro sees everything; only Pro can export CSV | Cases 5, 11 and 13 |
| FR-21 – FR-26 · Plans and checkout | Upgrading grants Pro once, at the server's price; the plan's limits come from the server; cancelling and expiry return to Free | Case 14 · `item_limit` test in 9.2 · cancel and expiry by code review |
| FR-27 – FR-30 · LINE | Only Pro can link and send; a linked phone receives the message | Cases 2–4 and 12 · test message received on the demo phone, by hand |
| FR-31 – FR-32 · Admin | Only an admin can open the dashboard | Cases 6, 7 and 9 |
| FR-33 – FR-34 · Language | Every page renders in the chosen language from the start | `check:pages` (`<html lang>` for each kind of visitor) |

**Non-functional requirements (Section 2.2)**

| Requirements | Accepted when | Checked by |
|---|---|---|
| NFR-1 – NFR-8 · Security | Server-side checks hold against direct API calls | Cases 1–10 and 18 · code review for hashing, named parameters, secrets and CSV escaping · LINE console **Verify** for the webhook signature |
| NFR-9 – NFR-12 · Performance | Lists are paged; lookups and the summary stay fast | Measured: algorithms notebook (set D) and the summary timing of 4 October (Section 2.2) |
| NFR-13 – NFR-16 · Mobile | Usable on a 390 px phone | `check:pages` (no sideways scroll) · `npm run check` (44 px targets) · by hand (below) |
| NFR-17 – NFR-22 · Usability | Errors stay in the page with a retry; loading is marked; keyboard and dark mode work | `npm run check` · `check:pages` |
| NFR-23 – NFR-25 · Data integrity | Simultaneous actions cannot oversell or overfill; screen and report agree | Case 14 · summary-count comparison in 9.2 |
| NFR-26 – NFR-27 · Maintainability | The algorithms run unchanged in Colab; conventions are checked by a program | `LEBIS_Final.ipynb` runs in Colab · `npm run check` and `npm run check:pages` |

### Usability rules checked automatically

`npm run check` reads the page code and fails on rules the team agreed in
`docs/brand.md`, including:

- An error shown in a toast. Failures must appear in the page, next to the action
  that failed; a toast disappears before a slow reader finishes it.
- A tappable control smaller than 44 px, which is hard to hit with a thumb.
- A colour written directly instead of a theme token, which breaks dark mode.
- A clickable element that is not a button or link, which a keyboard cannot reach.
- An error message that does not offer a way to retry.

### Usability checked by hand

**Mobile.** The Workspace page was checked at 390 px wide. An early version placed
the action buttons in a table column off the right edge of the screen, with nothing
telling the user to scroll; below the `sm` breakpoint the table is now a stack of
cards, with every button on screen.

No survey or usability study with real shop owners has been carried out (Section 9.6).

## 9.4 Presentation-day procedure

From `docs/pitch-checklist.md`.

**20 October (the day before)**

1. Build the final design document: `node scripts/build-design-doc.mjs --final`.
2. Run `DEMO_PASSWORD=… node scripts/check-edge-cases.mjs` against the live system.
   It must report every case as passed. The password is passed through the
   environment and is never written to a file.
3. Full team rehearsal, timed.

**21 October (the morning)**

1. Run the edge-case script again.
2. Open the website 5 minutes early; the server answers slowly to its first request.
3. Sign in to both demo accounts in separate tabs.

| Account | State | Used to show |
|---|---|---|
| `demo-free@lebis-demo.com` | Free · exactly 50 of 50 items | Every case that must be refused |
| `demo-pro@lebis-demo.com` | Pro · LINE linked · 5 rentals overdue | Every Pro feature working |

`demo-free` must not be upgraded before the refusal cases have been shown; once it is
Pro, those cases can no longer be demonstrated.

## 9.5 Results so far

| Date | Level | What was run | Result |
|---|---|---|---|
| 30 Sep | Integration | Summary counts: SQL against the algorithms module, normal data and edge cases | All numbers identical |
| 2 Oct | Integration | `item_limit` through the API as Free and as Pro | `50` and `null` |
| 4 Oct | Integration | Broken-item regression through the API | Old formula 6, new formula 2 (correct) |
| 5 Oct | Integration | `check:pages` four runs in a row | 4 of 4 passed |
| 6 Oct | Integration | `check`, `build`, and `check:pages` three runs in a row after the Settings page was merged | All passed |
| 15 Oct | Integration | `check-edge-cases.mjs` against the deployed system (run by Kim) | 14 of 14 checks passed |
| 16 Oct | Unit | `datasets.py`, `search.py` and `sort_group.py` run directly | All 55 checks passed |

The edge-case script will be run again on 20 and 21 October (Section 9.4).

## 9.6 Known gaps

- **No unit tests for the API routes.** The algorithm functions are unit-tested
  (Section 9.1), but the rules inside the routes are tested through the HTTP API
  only. A failure in a rarely used path would only be found by running that path.
- **No survey or usability study with real users.** Usability is checked against
  the rules in 9.3 and by the team on a phone, not by shop owners.
- **No load testing.** LEBIS targets small shops with one to three staff; it has not
  been measured under many simultaneous users.
- **LINE is tested against the real platform by hand.** There is no automated test
  that a message actually arrives on a phone.
- **No password reset.** The "forgot password" page explains what the user can do,
  but no reset email is sent, so there is nothing to test. *(planned)*
