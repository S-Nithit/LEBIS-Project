# 2. Requirements

This section lists what LEBIS does (functional requirements) and the standards it
meets while doing it (non-functional requirements). Every requirement names the API
or page that implements it, so each one can be checked against the code.

Everything listed here is implemented and running on the live system, unless it is
marked *(planned)*.

## 2.1 Functional Requirements

### Users and roles

Every functional requirement below is written for one of three kinds of user.

| User | Role in the database | Who they are |
|---|---|---|
| Shop owner on Free | `free` | Every new account. Up to 50 items, 7 days of report history |
| Shop owner on Pro | `pro` | A shop that upgraded through checkout. No item limit, full history, LINE reminders, CSV export |
| LEBIS operator | `admin` | The team running LEBIS. Sees business metrics across all shops |

A new account always starts as `free`. There is no way to sign up as an admin: the
admin account is created when the backend starts, from the `ADMIN_EMAIL` and
`ADMIN_PASSWORD` environment variables. `admin` passes every Pro check as well.

### Accounts and sign-in

| ID | Requirement | Implemented by |
|---|---|---|
| FR-1 | A visitor can create an account with an email, a password of at least 8 characters, a name and an optional shop name | `POST /api/auth/register` · Register page |
| FR-2 | A user can sign in with email and password and receives a signed token | `POST /api/auth/login` |
| FR-3 | "Remember me on this device" keeps the user signed in for 30 days instead of 24 hours | `remember` flag on register and sign-in |
| FR-4 | A wrong email and a wrong password give the same message, so the response does not reveal which emails have accounts | `POST /api/auth/login` returns 401 `invalid_credentials` for both |
| FR-5 | A user can change their name and shop name. Email, password and role cannot be changed through this request | `PATCH /api/auth/me` · Account page |
| FR-6 | A user who forgot their password is shown what they can do next | Forgot-password page. Sending a reset email is *(planned)* |

### Equipment (Workspace page)

| ID | Requirement | Implemented by |
|---|---|---|
| FR-7 | The shop can add an item with a code, a name, a category, how many units it owns and a daily rate. Codes are unique within a shop | `POST /api/items` · 409 `item_code_taken` |
| FR-8 | The shop can search items by name or code, filter by category and by status, and page through the results 20 at a time | `GET /api/items` (`q`, `category`, `status`, `page`, `size` up to 100) |
| FR-9 | The shop can edit an item, but cannot reduce its total below the number currently rented | `PUT /api/items/{id}` · 409 `item_total_below_borrowed` |
| FR-10 | The shop can mark an item as broken, and back to usable. A broken item cannot be rented | `PUT /api/items/{id}` with `status` |
| FR-11 | The shop can delete an item only if it has never been rented. Otherwise the shop is told why and offered "mark as broken" instead, so rental history is never lost | `DELETE /api/items/{id}` · 409 `item_has_history` / `item_has_active_borrows` |
| FR-12 | The page always shows three numbers: units on the shelf, units with customers, and rentals that are overdue | `GET /api/items/summary` |
| FR-13 | A Free shop cannot hold more than 50 items. The page warns the owner when 80% of the limit is used, and the server refuses the 51st item | `POST /api/items` · **403** `item_limit_reached` |

### Rentals (Workspace page)

| ID | Requirement | Implemented by |
|---|---|---|
| FR-14 | The shop can rent out one unit of an item, recording the customer's name, an optional phone number and a due date. The unit leaves the shelf count immediately | `POST /api/borrows` |
| FR-15 | A rental cannot be created for an item that is broken, has no units left, or with a due date in the past | 409 `item_broken` · 409 `item_unavailable` · 422 `due_date_past` |
| FR-16 | The shop can record a return. The unit goes back on the shelf immediately, and the same rental cannot be returned twice | `PUT /api/borrows/{id}/return` · 409 `borrow_already_returned` |
| FR-17 | The shop can list rentals and filter them to active, overdue or returned. Open rentals that are nearly due are shown first | `GET /api/borrows?status=` |

### Reports

| ID | Requirement | Implemented by |
|---|---|---|
| FR-18 | The shop can see every rental in a period, the estimated revenue (daily rate × days rented) and the five items that earned the most | `GET /api/reports/rentals` · Reports page |
| FR-19 | A Free shop sees the last 7 days. Asking for more returns the last 7 days with `limited: true` rather than an error. A Pro shop sees the full history | `GET /api/reports/rentals` |
| FR-20 | A Pro shop can download the rental history as a CSV file that opens correctly in Excel, Thai text included. A Free shop is refused | `GET /api/reports/rentals.csv` · **403** `tier_required` |

### Plans and checkout

| ID | Requirement | Implemented by |
|---|---|---|
| FR-21 | Anyone can compare the Free and Pro plans. Prices and limits come from the server | `GET /api/plans` · Pricing page |
| FR-22 | A Free shop can upgrade to Pro (299 THB) through a simulated checkout with a mock QR code. The server sets the price; the browser never sends an amount | `POST /api/checkout/session` · `POST /api/checkout/confirm` |
| FR-23 | Confirming the same checkout more than once grants Pro once and records one payment | Row locks inside one transaction · 409 `already_pro` · 404 `checkout_not_found` |
| FR-24 | Pro lasts 30 days. An expired subscription returns to Free automatically on the shop's next request, and before the next LINE summary | `get_current_user` · daily LINE job |
| FR-25 | A Pro shop can cancel and return to Free immediately | `POST /api/checkout/cancel` |
| FR-26 | A shop can see its current plan and when it expires | `GET /api/subscription/me` · Settings page |

### LINE reminders (Pro)

The full design is in Section 8.

| ID | Requirement | Implemented by |
|---|---|---|
| FR-27 | A Pro shop can link its LINE account by sending a one-time code to the LEBIS LINE account. The owner never types a LINE user ID | `POST /api/line/link-code` · `POST /api/line/webhook` |
| FR-28 | A Pro shop can send itself a test message | `POST /api/line/test` |
| FR-29 | Every day at 08:00 Bangkok time, each linked Pro shop receives one message listing what is overdue, due today and due tomorrow. A shop with nothing due receives nothing | Background job in `services/line_notify.py` |
| FR-30 | A Free shop cannot link LINE or send messages | **403** `tier_required` on every sending endpoint |

### Admin analytics

| ID | Requirement | Implemented by |
|---|---|---|
| FR-31 | The LEBIS operator can see the number of shops on each plan, the conversion rate, monthly and annual recurring revenue, revenue this month, total rentals, items currently out, and revenue and sign-ups by month | `GET /api/admin/overview` · Admin page |
| FR-32 | Nobody except an admin can open the dashboard or its API | **403** `role_required` for Free and Pro |

### Language

| ID | Requirement | Implemented by |
|---|---|---|
| FR-33 | Every page is available in Thai and English. The language is chosen on the landing page, the sign-in and register pages, or the Account page. The choice is remembered in a cookie, so the server renders every later page in that language from the start | `LanguageToggle` · `lib/i18n.js` |
| FR-34 | Error messages appear in the user's chosen language. The server returns a code, and the page translates it | `detail.code` in every error · `errorMessage()` |

## 2.2 Non-functional Requirements

Each requirement below has a check that fails when it is broken. Section 9 describes
the checks, and Section 9.3 maps every requirement to the test that covers it.

### Security

| ID | Requirement | How it is met | Checked by |
|---|---|---|---|
| NFR-1 | Passwords are never stored or logged in readable form | Hashed with bcrypt and a per-password salt | Code review |
| NFR-2 | Every request that reads or changes shop data proves who sent it | JWT signed with HS256, 24-hour expiry (30 days with "remember me"), verified on every request. The backend refuses to start without `JWT_SECRET` rather than run with a guessable key | Cases 8–10 in Section 9.2 |
| NFR-3 | Every plan limit and every role is enforced by the server, never only by hiding a button | `require_tier("pro")` and `require_role("admin")` on the route itself | Cases 1–7 in Section 9.2 |
| NFR-4 | One shop can never read or change another shop's data | Every SQL statement filters by the signed-in user's `owner_email`. Another shop's id returns 404, which does not confirm the id exists | Case 18 in Section 9.2 |
| NFR-5 | User input can never change the meaning of a database query | Every SQL statement uses named parameters; no query is built by joining strings | Code review |
| NFR-6 | Calls claiming to come from LINE are rejected unless they really do | HMAC-SHA256 signature checked on the raw body (Section 8.7) | Code review · the LINE console's **Verify** button confirms a correctly signed request is accepted |
| NFR-7 | No secret is ever committed to the repository | Tokens, keys and passwords come from environment variables; `.env` is ignored by git | Code review |
| NFR-8 | An exported CSV cannot run a formula when opened in Excel | Any cell starting with `=`, `+`, `-` or `@` is prefixed with `'` | Code review |

### Performance

| ID | Requirement | How it is met |
|---|---|---|
| NFR-9 | Lists stay fast as a shop grows | Item lists are paged, 20 per page and never more than 100 |
| NFR-10 | Finding an item by code does not slow down in proportion to the number of items | Binary search, O(log n). On 1,000 items, all 1,000 lookups took 1.759 ms in total, 12.4 times faster than checking items one by one (Data Structures and Algorithms report, data set D) |
| NFR-11 | The three numbers at the top of the Workspace page load without delaying the page | Measured on a local Docker setup on 4 October: 7 ms median, 27 ms slowest out of 10 requests |
| NFR-12 | Reminders stay within LINE's free message quota | One message per shop per day — about 30 a month per shop, against a quota of 300 (Section 8.8) |

The backend runs on a free hosting tier, so the **first** request after a quiet
period can take several seconds while the server starts. Later requests are not
affected. This is why the presentation checklist opens the site 5 minutes early.

### Mobile use

Shop staff use phones more than computers (Section 1.2), so the phone is the main
target, not an afterthought.

| ID | Requirement | Checked by |
|---|---|---|
| NFR-13 | No page scrolls sideways on a 390 px wide screen | `npm run check:pages` fails otherwise |
| NFR-14 | Every button, link and form field is at least 44 px tall, so it can be pressed with a thumb | `npm run check` fails otherwise |
| NFR-15 | Tables become stacked cards on narrow screens, with every action button still visible | Checked by hand on the Workspace page at 390 px |
| NFR-16 | A form error appears next to the Save button, because on a phone the form is taller than the screen and an error at the top would be out of view | Code review |

### Usability and accessibility

| ID | Requirement | Checked by |
|---|---|---|
| NFR-17 | Failures are shown in the page where they happened and stay until fixed. Toasts are used only for success | `npm run check` fails on an error toast |
| NFR-18 | Every error box offers a way to retry | `npm run check` |
| NFR-19 | A value that is still loading shows a placeholder and is marked `aria-busy`, never a value that will change a moment later. A dash would read as "zero" | `npm run check:pages` fails if visible text changes after loading |
| NFR-20 | Every clickable element can be reached and used with a keyboard | `npm run check` fails on a clickable element that is not a button or link |
| NFR-21 | Colours meet contrast rules and work in dark mode, which follows the device setting | `npm run check` (colour tokens, contrast) · `npm run check:pages` opens every public page in dark mode |
| NFR-22 | Animations stop for users who turn on "reduce motion" on their device | Global CSS rule |

### Data integrity

| ID | Requirement | How it is met |
|---|---|---|
| NFR-23 | Two staff acting on the same item at once cannot rent more units than exist | The item row is locked while a rental or return is saved, in one transaction |
| NFR-24 | Two tabs, or many API calls, adding items at once cannot push a Free shop past 50 | The shop's row in `users` is locked (`SELECT … FOR UPDATE`) before the items are counted, in the same transaction as the insert, so simultaneous requests are handled one at a time |
| NFR-25 | The counts on screen and in the Data Structures and Algorithms report always agree | Both come from the same functions in `backend-api/algorithms/`; there is no second implementation in SQL |

### Maintainability

| ID | Requirement | How it is met |
|---|---|---|
| NFR-26 | The algorithms code runs unchanged outside the web application | Files in `backend-api/algorithms/` import only the Python standard library, so they also run in Google Colab |
| NFR-27 | Team conventions are checked by a program, not by memory | `npm run check` and `npm run check:pages` run before every pull request |

## 2.3 Not implemented

These were considered and are not part of the current system.

| Item | Status |
|---|---|
| Real payments | Out of scope — checkout is simulated (Section 1.5) |
| Messages to the shop's customers | Out of scope — reminders go to the owner (Section 1.5) |
| Several branches or staff accounts under one shop | Out of scope (Section 1.5) |
| Password reset by email | *(planned)* |
| Limiting repeated sign-in attempts | *(planned)* — there is currently no limit on how many times a password can be tried |
| Removing a linked LINE account from the website | *(planned)* — Section 8.10 |

### Known limitations

These are how the current system behaves. They are known and accepted for this version.

| Behaviour | Why it happens |
|---|---|
| Changing an item's daily rate also changes the estimated price of its past rentals, on the Workspace page and in the Reports page | The estimate is calculated from the item's current `daily_rate`; the rate at the time of the rental is not stored |
| The Rentals tab shows at most 100 rentals | The list is capped at 100 and sorted with open rentals first, then by due date, oldest first. A shop with more than 100 returned rentals does not see the most recent returns in the "Returned" filter |
| An item that has been rented can never be deleted, and it still counts towards the 50-item limit of the Free plan | Deleting it would lose rental history (FR-11). It can be marked as broken instead, but it keeps its place in the count |
