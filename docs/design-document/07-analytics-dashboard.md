# 7. Business Analytics Dashboard

The Admin Dashboard (`/admin`) shows how LEBIS is doing as a business on one page. Every number and both charts come from a single API call, `GET /api/admin/overview`.

## Purpose

The dashboard is used by the **system administrator only**. It supports decisions such as:

| Question | Metric that answers it |
|---|---|
| Is the user base growing? | Total shops, new sign-ups per month |
| Is the Free plan convincing shops to pay? | Free → Pro conversion rate |
| How much predictable income does LEBIS have? | MRR and ARR |
| How much money actually came in each month? | Monthly revenue chart |
| Are shops actually using the system day to day? | Total rentals, items currently out |

### Access control

- **Server side (the real gate):** every route in `routes/admin.py` uses `Depends(require_role("admin"))`. A Free or Pro account calling `/api/admin/overview` receives `403 Forbidden` with the code `role_required`. This was tested by calling the endpoint with a non-admin token.
- **Client side (convenience only):** the "Admin" item in the navigation menu is shown only to admin accounts. A non-admin who opens `/admin` directly sees a "you don't have access to this page" message instead of a blank page.

Hiding the menu item is not treated as security; access is enforced by the API.

## Key Metrics

The page shows four stat cards.

### Total shops (Free / Pro)

The number of shop accounts, split by plan. Counts users whose role is `free` or `pro`; admin accounts are excluded because they are not shops.

### Free → Pro conversion rate

```
conversion_rate = pro_count / (free_count + pro_count)
```

The share of shops currently on the Pro plan.

### MRR and ARR

**MRR (Monthly Recurring Revenue)** is the income LEBIS can expect every month from subscriptions that are currently running. It is not the money collected in a given month.

```
active_subscriptions = COUNT(subscriptions
                             WHERE status = 'active'
                               AND expires_at > NOW())
MRR = active_subscriptions × Pro monthly price
ARR = MRR × 12
```

- **Counted from the `subscriptions` table, not from `users.role`.** A role can be changed directly in the database (for example during testing) without a real subscription behind it, so counting subscriptions means MRR only includes paid, unexpired plans.
- **The Pro price is read from `PLANS["pro"]["price"]` in `routes/billing.py`,** the same value checkout uses, so the price is defined in one place.
- **ARR (Annual Recurring Revenue)** is the yearly run-rate if current subscriptions continue.

### Total rentals

The number of rental records across all shops, with the number of items currently out with customers (rentals not yet returned) shown underneath.

## Visualizations

| Metric | Chart type |
|---|---|
| Total shops, conversion rate, MRR / ARR, total rentals | Stat cards (number with a supporting line) |
| Revenue per month, last 6 months | Line chart |
| New sign-ups per month by plan, last 6 months | Grouped bar chart (Free vs Pro) |

### Monthly revenue (line chart)

The money actually collected each month:

```
revenue(month) = SUM(transactions.amount
                     WHERE status = 'paid'
                       AND paid_at falls in that month)
```

Only `paid` transactions count; `pending` and `failed` are ignored. MRR and monthly revenue are deliberately separate: MRR is recurring income the business can rely on, monthly revenue is cash received. They differ when shops subscribe or cancel partway through a month.

### New sign-ups by plan (bar chart)

New shop accounts per month, split into Free and Pro, based on the month each account was created.

**Known limitation:** the `users` table stores only the current role, not a history of plan changes. A shop that signed up on Free and upgraded later is counted as a Pro sign-up in the month it registered.

### How the charts are built

- Both charts cover the last 6 months including the current month. Months are grouped in Thailand time (`Asia/Bangkok`), and months with no data appear as zero instead of being skipped.
- Charts are hand-written SVG; no charting library was added to the project.
- Colors come from the project's CSS variables, so the charts follow light and dark mode.
- Each chart has an SVG `<title>`, and every value is also listed as text under the chart.
- Tested at 320 px and 390 px screen widths.

## Data Sources

All metrics are returned by `GET /api/admin/overview` (admin only). The SQL lives in `queries/admin.py` and the response shape is defined by the Pydantic model `AdminOverviewResponse`.

| Metric | Table | Rule |
|---|---|---|
| Total shops, Free / Pro counts | `users` | `role IN ('free', 'pro')` |
| Conversion rate | `users` | `pro_count / total_shops` |
| MRR / ARR | `subscriptions` | `status = 'active' AND expires_at > NOW()`, × Pro price |
| Revenue this month, revenue chart | `transactions` | `status = 'paid'`, grouped by month of `paid_at` |
| New sign-ups chart | `users` | grouped by month of `create_at`, split by role |
| Total rentals | `borrows` | all rows |
| Items currently out | `borrows` | `returned_at IS NULL` |
