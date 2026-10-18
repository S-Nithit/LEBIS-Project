# 1. Project Overview

**Project name:** LEBIS — Lab & Rental Equipment Borrow and Inventory System

**Live system:** <https://lebis-project.vercel.app>

**Team members:** Nithit Srisengsuwanchai (Kim) · Intuch Srisawat (Neo) ·
Issaree Ausavapirom (Kul) · Pongsicha Seesavat (Sea). Responsibilities are in
Section 1.8.

## 1.1 Objective

LEBIS is a web application for small equipment-rental shops. It shows what is on
the shelf, who has each item and when it is due back, and reminds the owner on
LINE before an item is late. Its primary goal is to cut the money a shop loses to
late and lost items. It is intended for owners and staff of rental shops with one
to three people who track their stock on paper or in a shared Excel file today.

## 1.2 Target user persona

**Who:** the owner of a small rental shop with one to three staff — camera rental,
tool rental or event equipment rental. They use a phone more than a computer, they
do not have an IT person, and they will not pay for software that takes a week to
set up.

Their pain points, and how LEBIS resolves each one:

| Pain point | What it costs the shop | How LEBIS resolves it |
|---|---|---|
| **The owner does not know what is on the shelf right now.** | A customer asks for an item and someone has to walk to the shelf to check | The Workspace page always shows three numbers: on the shelf, with customers, and overdue |
| **Nobody remembers who took what.** | Late items are noticed by accident. Some come back days late, and some never come back | Every rental records the customer, phone number and due date. Pro shops get one LINE summary at 08:00 listing what is overdue, due today and due tomorrow |
| **The owner cannot tell which items earn.** | The shop cannot decide what to buy more of | The Reports page ranks items by estimated revenue and keeps the rental history; Pro shops can export it as CSV |

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

**In scope** — seven pages, each backed by its own API:

| Page | Purpose |
|---|---|
| Landing | Explains the product and the pricing to a first-time visitor |
| Sign in / register | Account creation and JWT sign-in |
| Workspace | Items, rentals and returns — the page staff use all day |
| Reports | Which items earn, rental history, CSV export for Pro |
| Pricing and checkout | Compare Free and Pro, upgrade through a simulated payment |
| Settings | Shop profile, LINE account linking, current plan |
| Admin analytics | Business metrics for the LEBIS operator, visible to admins only |

**Out of scope**

- Real payments. Checkout is simulated; no money moves.
- Messages to the shop's customers. Reminders go to the shop owner, who knows the
  customer and decides how to follow up.
- Multiple branches per shop and staff accounts under one shop.

## 1.6 Competitor comparison

A small rental shop has two kinds of alternative to LEBIS: the free tools it already
uses, and rental-management software built for larger businesses.

| | Paper notebook | Excel / Google Sheets | Booqable | EZRentOut | **LEBIS** |
|---|---|---|---|---|---|
| Type | Manual | General spreadsheet | Rental software (international) | Rental software (international) | Rental software for small Thai shops |
| Monthly cost | Free | Free | 35 per month, or 29 per month billed yearly; no free plan (14-day trial) | USD 59 per month for the entry plan; no free plan | **Free** up to 50 items · **Pro 299 THB** |
| Shows what is on the shelf right now | No — someone checks the shelf | Only if every rental is typed in and the sheet is built for it | Yes | Yes | Yes — three live numbers on the Workspace page |
| Reminds the shop before an item is due | No | No | Email templates for reminders | Not confirmed | **One LINE summary every morning** (Pro) |
| Thai language | — | Yes | Not in the website's language list | Not confirmed | Thai and English |
| Setup | None | The shop builds its own sheet | Store setup aimed at online booking | Order and asset setup for teams | Add items, then rent out |

Prices were checked on 18 October 2026 and can change. Booqable's price comes from
its own pricing page, which shows no currency symbol; third-party listings give the
same figures in US dollars. EZRentOut's price comes from its Capterra listing, because
the vendor's pricing page did not load its plan details when checked.

**What the international tools do better.** Between them they offer online booking
stores, payment processing, barcode labels and support for several locations. LEBIS
does none of these (Section 1.5). They suit rental businesses with a website and a
team.

**Where LEBIS fits.** The target shop has one to three staff, works on a phone, and
talks to its customers on LINE. The free tools cost nothing but cannot show live
stock or warn the owner before a return is late. The international tools can, but
charge a monthly fee from the first day with no free plan, and neither Booqable's
pricing page nor EZRentOut's listing mentions LINE. LEBIS covers that gap: a free tier large enough to run the whole
shop, live counts of what is out, and the reminder delivered in the app the owner
already checks every morning.

Sources (checked 18 October 2026):
Booqable pricing — <https://booqable.com/pricing/> ·
EZRentOut on Capterra — <https://www.capterra.com/p/134914/EZRentOut/pricing/>

## 1.7 Technology

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

The merge sort, binary search and counting code used by the backend is the same
code submitted for the Data Structures and Algorithms course. It lives in one
folder, `backend-api/algorithms/`, and uses only the Python standard library so it
also runs unchanged in Google Colab. The hash table in the same folder is measured
in the course notebook and is not used by the web application (Section 4.1).

## 1.8 Team members

| Member | Responsibility |
|---|---|
| Nithit Srisengsuwanchai (Kim) | Team lead. Project setup, database, sign-in, LINE integration, deployment |
| Intuch Srisawat (Neo) | Workspace page — items and rental records |
| Issaree Ausavapirom (Kul) | Pricing and checkout page — Free and Pro limits |
| Pongsicha Seesavat (Sea) | Landing page, settings page, admin dashboard |

Each member owns their pages from the API to the user interface, so every member
has commits on both the backend and the frontend.
