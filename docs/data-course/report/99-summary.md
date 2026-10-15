# Conclusion — Three Algorithms Working Together

> Written by the editor (Neo), summarising the three parts above. Every number comes from `LEBIS_Final.ipynb`.

## One question that needs all three members

Every morning the shop asks: **"Which rentals are overdue, and what is each item?"**
No single algorithm can answer this alone. It takes three steps, each handing its result to the next.

| Step | Who | What it does | Time |
|---|---|---|---|
| 1 | Kul — merge sort | Sorts every rental by due date | O(n log n) |
| 2 | Neo — binary search | Cuts out every rental due before today in one block | O(log n + k) |
| 3 | Kim — hash table | Looks up each item's details by its code | O(1) per item |

Set D has **685 rentals**. These three steps find **275 rentals overdue before 2026-10-01**,
**exactly the same rentals as a full one-by-one scan**.

Each step passes a plain list to the next, and nobody imports anyone else's code.
If one member changed the format of the data they hand on, this notebook cell would fail immediately,
so it serves both as an example of use and as a test that the three parts still fit together.

The live web application uses the same sequence. Every morning at 08:00 it sorts the rentals with merge sort,
then uses binary search to find what is due, and sends the shop owner a summary on LINE.

## Key numbers of the report

Each hand-written algorithm against the simplest method that does the same job, on set D (1,000 records).

| Part | Task | Simple method | Hand-written | Speed-up | Python's own (baseline) |
|---|---|---|---|---:|---|
| 1 — Kim | Look up every code once | List scan 21.753 ms | Hash table 1.530 ms | **14.2×** | `dict` 0.053 ms |
| 2 — Neo | Look up every code once | One-by-one scan 21.812 ms | Binary search 1.759 ms | **12.4×** | Scanning the whole list (the "simple method" column) |
| 3 — Kul | Sort the whole set once | Bubble sort 90.516 ms | Merge sort 2.619 ms | **34.6×** | `sorted()` 0.124 ms |

## Complexity of every algorithm in the report

| Part | Algorithm | Time (average) | Time (worst) | Memory |
|---|---|---|---|---|
| 1 | Lookup · insert · delete with the hash table | O(1) | O(n) | O(n) |
| 2 | Binary search | O(log n) | O(log n) | O(1) |
| 2 | Range query `find_due_before` | O(log n + k) | O(log n + k) | O(k) |
| 2 | Counting (`count_*`) | O(n) | O(n) | O(1) |
| 3 | Merge sort | O(n log n) | O(n log n) | O(n) |
| 3 | Grouping (`group_by_*`) | O(n) | O(n) | O(n) |

The reasoning behind each value is in the Big-O section of that part.

## What all three parts found

**1. On small data, the simple method wins.**
All three parts saw the same thing on sets A–C (10–12 records): a list scan beat the hash table,
a one-by-one scan beat binary search, and bubble sort matched or beat merge sort.
When n is small, the fixed cost of the clever part (hashing, finding the middle, splitting) outweighs the real work.
Big-O tells us what **grows more slowly**, not what is **faster at every n**.
Measuring only the small sets would lead to the wrong conclusion in all three parts.

**2. On large data, the Big-O difference shows up in the measurements.**
From set A to set D the data grows 100 times. Part 2 measured binary search growing 293 times,
close to the 300 times O(log n) predicts, and the hash table growing 99 times, close to the predicted 100.

**3. Python's built-ins beat every hand-written version — because of C, not because of the algorithm.**
`dict`, `sorted()` and `bisect` are written in C, so they are many times faster than the same idea written in Python.
They are in the same Big-O class, however: they grow at the same rate as the data grows, and differ only by a constant factor.

**4. No single data structure answers every question.**
A hash table is fastest when the exact code is known, but it cannot answer range questions and cannot be sorted.
A sorted list answers range questions, but it has to be sorted first, which is merge sort's job.
The real system therefore keeps both, and chooses by the kind of question being asked.
