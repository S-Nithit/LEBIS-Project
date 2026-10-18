# 6. Monetization & Feature Gating

## 6.1 Business model

LEBIS is sold as a **monthly subscription** with two tiers: a free tier that runs a
small shop completely, and a Pro tier at **299 THB per month**.

The free tier exists so that a shop can move its real stock from paper or Excel into
LEBIS and use it every day before paying anything. Shops upgrade when they reach the
point where LEBIS saves them money: more than 50 items, or wanting a reminder before
an item comes back late.

The feature held back for Pro is the **LINE reminder**, because it is the one a shop is
most willing to pay for. One camera body that never comes back costs more than a
year of Pro (12 × 299 = 3,588 THB). Payment in this project is simulated; no money
moves (Section 6.3).

## 6.2 Tier definitions

| | Free | Pro |
|---|---|---|
| Price | 0 THB | **299 THB per month** |
| Items | Up to **50** | No limit |
| Rentals, returns, live counts on the Workspace page | Yes | Yes |
| Rental report history | Last **7 days** | Full history |
| Export the report as CSV | No | Yes |
| LINE account link and daily 08:00 summary | No | Yes |

The limits are defined once, in `PLANS` in `backend-api/routes/billing.py`, and the
pricing page reads them from `GET /api/plans`. Admin accounts are not customers: they
have every feature and cannot buy a plan.

## 6.3 Payment and checkout flow

The checkout is a **mock QR payment**: the page shows a QR code that is clearly marked
as a simulation and is not a real PromptPay code. Everything the server does with it is
real — the transaction and subscription rows, the role change, and the checks that
stop double payment.

1. On the pricing page, the owner of a Free shop clicks **Upgrade to Pro**.
2. The page calls `POST /api/checkout/session` with `{"tier": "pro"}`.
   - In one database transaction, the server locks the shop's row in `users`, checks
     the shop is not already Pro, marks any older unpaid checkout of the same shop as
     `failed`, and inserts a new `transactions` row with status `pending` and amount
     **299** — the amount always comes from the server, never from the browser.
   - It returns the new row's id as `checkout_id`.
   - Refused cases: a tier other than `pro` (**400** `invalid_plan`), an admin account
     (**403** `admin_cannot_subscribe`), a shop that is already Pro (**409**
     `already_pro`).
3. The page shows the mock QR code and the amount, 299 THB.
4. The owner clicks **I've paid**. The page calls `POST /api/checkout/confirm` with
   `{"checkout_id": …, "method": "mock_qr"}`.
5. In one database transaction, the server:
   - locks the shop's row in `users` and refuses if it is already Pro (**409**);
   - looks for a `pending` transaction with this id **that belongs to this shop**,
     locking it — another shop's id, an old `failed` id or an id already paid all
     return **404** `checkout_not_found`;
   - inserts a `subscriptions` row: tier `pro`, status `active`, ending **30 days**
     later;
   - marks the transaction `paid` and links it to the subscription;
   - sets `users.role` to `pro`.
6. The page shows a success message and opens the account page. Because the role is
   read from the database on every request (Section 5.1), the very next request
   already has Pro permissions — no sign-out is needed.

Because both steps lock the shop's row first, requests from the same shop run one at a
time. Sending the confirm request several times at once upgrades the shop only once
and records one payment.

**Cancelling.** `POST /api/checkout/cancel` marks the active subscription `cancelled`,
marks any unpaid checkout `failed`, and sets the role back to `free` immediately.

**Expiry.** When a subscription passes its end date, the next request from that shop
(and the daily LINE job) marks it `expired` and sets the role back to `free`. Items
added while on Pro are kept; the shop simply cannot add a new item until it is under
50 again or upgrades.

## 6.4 Enforcement

Every limit is enforced by the backend. The frontend hides or disables controls only
to explain the limit to the user; calling the API directly gets the same answer.

| Limit | Where it is enforced | Free shop gets |
|---|---|---|
| CSV export | `require_tier("pro")` dependency on `GET /api/reports/rentals.csv` | **403** `tier_required` |
| LINE link, test message, summary | `require_tier("pro")` on `POST /api/line/link-code`, `/test` and `/digest` | **403** `tier_required` |
| 50 items | `POST /api/items` locks the shop's row, counts its items, and refuses the 51st | **403** `item_limit_reached` |
| 7 days of report history | `GET /api/reports/rentals` cuts any longer range to 7 days and returns `limited: true` | 200, last 7 days only |

The role that these checks use comes from the `users` table, loaded by
`get_current_user` on every request (Section 5.1). Free < Pro < Admin, so an admin
passes every Pro check.

These cases are tested against the live system before every presentation with
`scripts/check-edge-cases.mjs`: a Free shop adding a 51st item, asking for a LINE link
code, sending a LINE test or summary, and exporting a CSV all return 403 (Section 9.2).

## 6.5 Limitations

- Payment is simulated. Connecting a real gateway (Stripe or PromptPay) would replace
  steps 3–4 only; the transaction, subscription and locking logic would stay the same.
- A Pro shop cannot renew before its 30 days end; it buys again after it returns to
  Free.
- Cancelling takes effect immediately, and unused days are not refunded.
