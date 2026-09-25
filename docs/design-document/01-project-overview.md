# 1. Project Overview

**LEBIS — Lab & Rental Equipment Borrow and Inventory System**
Live system: <https://lebis-project.vercel.app>

## 1.1 The problem

Small rental shops still track their stock on paper or in one shared Excel file.
This causes three problems that cost them money every week.

1. **The owner does not know what is on the shelf right now.** A customer asks for
   an item and someone has to walk to the shelf to check.
2. **Nobody remembers who took what.** When an item is late, the shop usually
   notices by accident. Some items come back days late, and some never come back.
3. **The owner cannot tell which items earn.** There is no record of how often
   each item goes out, so the shop cannot decide what to buy more of.

## 1.2 Who the product is for

The owner of a small rental shop with one to three staff — camera rental, tool
rental or event equipment rental. They use a phone more than a computer, they do
not have an IT person, and they will not pay for software that takes a week to set up.

## 1.3 What LEBIS does

The shop adds every item once, with a code, a category, how many it owns and a
daily rate. When a customer rents something, staff record the customer's name and
the due date. LEBIS then keeps three numbers on screen at all times: how many
items are on the shelf, how many are with customers, and how many are overdue.
Recording a return puts the item back on the shelf count immediately.

Every morning at 08:00, LEBIS sends the owner one LINE message listing what is
overdue, what is due today and what is due tomorrow. The owner can chase customers
before an item is late, instead of after.

## 1.4 How the product makes money

| | Free | Pro — 299 THB / month |
|---|---|---|
| Items | up to 50 | no limit |
| Daily LINE reminder | no | yes |
| Report history | last 7 days | full history |
| CSV export | no | yes |

The LINE reminder is the feature a shop is willing to pay for. One lost camera
costs more than a year of the subscription. The free tier is large enough for a
shop to run its real stock through LEBIS before deciding to pay.

Every limit is enforced by the server, not by hiding buttons. A Free account that
calls the API directly to add a 51st item, or to trigger a LINE reminder, receives
**403 Forbidden**.

## 1.5 Scope

**In scope** — six pages, each backed by its own API:

| Page | Purpose |
|---|---|
| Landing | Explains the product and the pricing to a first-time visitor |
| Sign in / register | Account creation and JWT sign-in |
| Workspace | Items, rentals and returns — the page staff use all day |
| Pricing and checkout | Compare Free and Pro, upgrade through a simulated payment |
| Settings | Shop profile, LINE account linking, current plan |
| Admin analytics | Business metrics for the LEBIS operator, visible to admins only |

**Out of scope**

- Real payments. Checkout is simulated; no money moves.
- Messages to the shop's customers. Reminders go to the shop owner, who knows the
  customer and decides how to follow up.
- Multiple branches per shop and staff accounts under one shop.

## 1.6 Technology

The project extends the `acpapp` boilerplate provided by the course and keeps its
stack unchanged.

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (Pages Router, JavaScript), Tailwind CSS, shadcn-style components |
| Backend | Python, FastAPI (async) |
| Database | PostgreSQL 13, raw SQL with named parameters through the `databases` library |
| Authentication | JWT, passwords hashed with bcrypt |
| External service | LINE Messaging API |
| Hosting | Vercel (frontend), Railway (backend and database) |

The search, count and hash-table code used by the backend is the same code
submitted for the Data Structures and Algorithms course. It lives in one folder,
`backend-api/algorithms/`, and uses only the Python standard library so it also
runs unchanged in Google Colab.

## 1.7 Team

| Member | Responsibility |
|---|---|
| Nithit Srisengsuwanchai (Kim) | Team lead. Project setup, database, sign-in, LINE integration, deployment |
| Intuch Srisawat (Neo) | Workspace page — items and rental records |
| Issaree Ausavapirom (Kul) | Pricing and checkout page — Free and Pro limits |
| [ full name ] (Sea) | Landing page, settings page, admin dashboard |

Each member owns their pages from the API to the user interface, so every member
has commits on both the backend and the frontend.
