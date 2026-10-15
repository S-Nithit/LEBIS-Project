# 9. Testing Plan

LEBIS is tested in four layers. Each layer catches a kind of mistake the others
cannot see, and each one can be run with a single command.

| Layer | Command | What it checks | When it runs |
|---|---|---|---|
| Algorithm self-checks | `python3 backend-api/algorithms/search.py` (and `datasets.py`, `sort_group.py`) | The Data Structures and Algorithms code returns correct results | Every change to `backend-api/algorithms/` |
| Code conventions | `npm run check` | Rules in the page code that a reviewer would otherwise have to catch by eye | Before every pull request |
| Rendered pages | `npm run check:pages` | Opens every page in a real browser and checks what the user actually sees | Before every pull request |
| Live edge cases | `node scripts/check-edge-cases.mjs` | The access rules, against the deployed system | The day before and the morning of the presentation |

There is no automated backend unit-test suite. The backend rules are tested through
the HTTP API instead — by the edge-case script and by the manual checks recorded in
each pull request (Section 9.6).

## 9.1 Access control — what the lecturer will test live

The presentation on 21 October includes live testing: the lecturer tries actions the
system must refuse. Every case below is enforced **on the server**, so it holds whether
the request comes from the website, from a script, or from the interactive API page
at `/docs`.

The first twelve rows are run automatically by `scripts/check-edge-cases.mjs`.

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
`item_limit = 50`, and the Pro demo shop must have a linked LINE account.

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

## 9.2 Business rules and data integrity

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

## 9.3 Algorithm correctness

The search, count, hash-table and sort code is also the Data Structures and Algorithms
coursework, so it is tested on its own, without the database.

- **Self-checks.** `datasets.py`, `search.py` and `sort_group.py` each have a `verify()`
  function that runs when the file is executed directly. Each check compares the
  hand-written function with a straightforward reference on the same data.
- **Shared test data.** Every member measures on the same four data sets from
  `make_dataset()`, built from fixed seeds so results repeat exactly:

  | Set | Size | Built to test |
  |---|---|---|
  | A | 10 | Basic correctness |
  | B | 12 | Duplicate names — name search must return every match, not the first |
  | C | 10 | Many items out of stock — counting at the edges |
  | D | 1,000 | Growth: how each method's time changes as data grows |

  Broken items are placed at every 7th position so that even the small sets contain
  one, otherwise the "skip broken items" rule would never be exercised.
- **Cross-checks.** `scripts/data-course-benchmark.py` runs the three modules together.
  For example, the range query "everything due before 1 October" returns 275 rentals
  by binary search and 275 by a full scan of set D, and the two lists must match.

## 9.4 Frontend and usability

**`npm run check`** reads the page code and fails on rules the team agreed in
`docs/brand.md`, including:

- An error shown in a toast. Failures must appear in the page, next to the action
  that failed; a toast disappears before a slow reader finishes it.
- A tappable control smaller than 44 px, which is hard to hit with a thumb.
- A colour written directly instead of a theme token, which breaks dark mode.
- A clickable element that is not a button or link, which a keyboard cannot reach.
- An error message that does not offer a way to retry.

**`npm run check:pages`** opens every page in Chromium — four public pages in light
and dark mode for three kinds of visitor, plus every page that requires sign-in — and
fails if:

- The page scrolls sideways at 390 px, the width of a common phone.
- Text changes after the user has already seen it. Sections that are still loading
  must declare `aria-busy="true"` and show a placeholder, not a value that will change.
- The `<html lang>` attribute does not match the language the visitor chose.
- The browser was redirected to a different page, which would make every measurement
  describe the wrong page.

**Mobile, by hand.** The Workspace page was checked at 390 px wide. An early version
placed the action buttons in a table column off the right edge of the screen, with
nothing telling the user to scroll; below the `sm` breakpoint the table is now a
stack of cards, with every button on screen.

## 9.5 Presentation-day procedure

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

## 9.6 Results so far

| Date | What was run | Result |
|---|---|---|
| 30 Sep | Summary counts: SQL against the algorithms module, normal data and edge cases | All numbers identical |
| 2 Oct | `item_limit` through the API as Free and as Pro | `50` and `null` |
| 4 Oct | Broken-item regression through the API | Old formula 6, new formula 2 (correct) |
| 5 Oct | `check:pages` four runs in a row | 4 of 4 passed |
| 6 Oct | `check`, `build`, and `check:pages` three runs in a row after the Settings page was merged | All passed |

`check-edge-cases.mjs` needs the demo password and runs against the deployed system;
its results will be recorded on 20 and 21 October.

## 9.7 Known gaps

- **No backend unit tests.** Rules are tested through the HTTP API. A failure in a
  rarely used path would only be found by running that path.
- **No load testing.** LEBIS targets small shops with one to three staff; it has not
  been measured under many simultaneous users.
- **LINE is tested against the real platform by hand.** There is no automated test
  that a message actually arrives on a phone.
- **No password reset.** The "forgot password" page explains what the user can do,
  but no reset email is sent, so there is nothing to test. *(planned)*
