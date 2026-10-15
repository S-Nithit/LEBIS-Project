# Introduction

> Written by the editor (Neo) to set the scene for the three main parts.
> Every number in this report comes from `LEBIS_Final.ipynb`, the combined notebook of all three members, from one single run.

## The system these algorithms serve

LEBIS is a borrow-and-return system for small equipment rental shops with one to three staff, such as camera rental shops.
It runs live at <https://lebis-project.vercel.app>.

A shop like this asks the same questions every day. This report answers **which data structure each question needs, and why**.

| The shop's question | Algorithm group | Author | Part |
|---|---|---|---|
| "Is camera CAM-0012 available?" · receiving stock · removing stock | Inserting · Deleting | Kim — hash table | 1 |
| "The lens I rented before" · "How many are free, how many are overdue?" · "What is due before date X?" | Searching · Counting | Neo — binary search | 2 |
| "Which rental has been out the longest?" · "What is in each category?" | Sorting · Grouping | Kul — merge sort | 3 |

All three parts implement their algorithms by hand. Python's `dict`, `bisect` and `sorted()` are never used to do the work.
They are used only as **baselines**, to show that the hand-written code gives correct results and to explain why the built-ins are faster.

All the code lives in `backend-api/algorithms/` and imports only the Python standard library.
The same files therefore run both in the live web application and in Google Colab without changing a line.

## The shared data sets

Every part measures on the same data from `make_dataset()` in `datasets.py`, so the numbers of the three parts can be compared directly.
The data uses fixed seeds rather than fresh random values, and a fixed reference date `TODAY = 2026-10-01`, so every run produces the same data.

| Set | Size | Duplicate names | Out of stock | Overdue | Broken | Built to prove |
|---|---:|---:|---:|---:|---:|---|
| A | 10 | 0 | 1 | 3 | 1 | Every function works in the normal case |
| B | 12 | 6 | 5 | 4 | 1 | Duplicate names — search by code must return the right item, search by name must return every match |
| C | 10 | 0 | 5 | 4 | 1 | Many items out of stock — status and counting at the edges |
| D | 1,000 | 0 | 288 | 275 | 142 | How the Big-O difference shows when the data grows 100 times |

Every set has at least 10 records, as the assignment requires.
Each record has 8 fields: `code` · `name` · `category` · `total` · `available` · `borrower` · `due_date` · `status`.

## How time was measured

All three parts use the same method — `time.perf_counter()`, run 3 times and averaged, excluding the time spent preparing data. Times are in milliseconds.

The measured times vary slightly with the machine on every run, but **the order of which method is faster does not change**.
For that reason every number in this report comes from the same single run. Numbers from individual members' notebooks must not be mixed in.

## Google Colab

The combined notebook, already run: <https://colab.research.google.com/drive/1K3JSlNVuN-mof98pjE09J_nFKhZEmyV8>

> ⚠️ **Do not press Run all in the shared file.** The saved output is the same run as in this report.
> Running it again changes the times, and the numbers will no longer match the report.
> To try it yourself, make a copy first (File → Save a copy in Drive).

## Course requirements — where to find them

Every algorithm must include five things. This table shows where each one is for each part.

| Requirement | Part 1 (Kim) | Part 2 (Neo) | Part 3 (Kul) |
|---|---|---|---|
| Big-O for time and memory, with an explanation | 1.5 | 2.6 | Part 3 |
| Flowchart | 1.8 · Appendix | 2.9 · Appendix | Part 3 · Appendix |
| Real results on sets A–D | 1.7 | 2.8 | Part 3 |
| Time on set D compared with what Python provides | 1.7 — `dict` | 2.8 — scanning the whole list | Part 3 — `sorted()` |
| Colab link | 1.9 | 2.10 | Colab section above |

All seven flowcharts are collected in the Appendix at the end, in figure order.
