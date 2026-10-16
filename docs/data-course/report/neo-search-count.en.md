# Part 2 — Searching and Counting with a Hand-Written Binary Search (Neo)

> English version of `neo-search-count.md`.
> Every number comes from `LEBIS_Final.ipynb` (the combined notebook of all three members), committed in the repository — the same file linked from Colab.

## 2.1 The process chosen

The previous part solved "where is the item with this code?" with a hash table, which is the fastest answer when the exact code is known.
The questions a shop really asks go further than that.

- A customer cannot remember the code and only gives a name: *"the lens I rented last time"* — items must be found by part of their name, and names can repeat.
- The owner opens the system in the morning — they need to know **how many units are free, how many are with customers, and how many rentals are overdue**.
- Before closing — they need to know *"what is due back before date X?"*, which is a **range** question, not a single value.

A hash table cannot answer the last two at all, because a hash works out a position only from an exact key.
This part therefore chooses the **Searching** and **Counting** algorithm groups, with binary search written entirely by hand.
Python's `bisect` is not used, except as a baseline for comparison.

## 2.2 Data structure and the precondition for searching

The whole team uses the same 8-field record from `make_dataset()`.

`code` · `name` · `category` · `total` · `available` · `borrower` · `due_date` · `status`

Binary search needs one thing a plain list does not have: **the data must already be sorted**.

> 🔴 If the list is not sorted by `code`, the halving cuts off the wrong side and **returns `None` even though the item is there**.
> No error reports this mistake; someone would have to notice it by eye.
> That is why `sort_by_code()` is provided to be called first, and why it returns a new list instead of changing the original.

In the live system, the list sorted by `due_date` comes straight from **Kul's merge sort** (`sort_by_due_date()`).
The two pieces of work connect, so we agreed that every function returns a new list and never changes a list someone else holds.

## 2.3 Three search paths

The path is chosen by **the kind of question**, not by which method is fastest.

| Path | Function | Used when | Time |
|---|---|---|---|
| Linear | `linear_search` | Not sorted, no hash table; used as the baseline | O(n) |
| Hash | `hash_lookup` | The exact code is known and Kim's table is available | O(1) average |
| **Binary** | **`binary_search`** | **Exact code on a sorted list — the hand-written one** | **O(log n)** |
| Partial name | `search_by_name` | The customer only remembers the name | O(n) |

**How binary search works** — look at the middle item first. If it matches, stop. If the target is smaller than the middle, it must be in the left half,
so the whole right half is discarded, and vice versa. **Every comparison halves what is left to examine.**
1,000 items therefore need only about 10 comparisons, because 2¹⁰ = 1,024.

It is written as a loop rather than recursion, because a loop uses no extra stack space, **so memory is O(1), not O(log n)**.
It uses `middle = low + (high - low) // 2` instead of `(low + high) // 2`, the standard way to avoid overflow
in languages where `int` has a fixed size (Python does not overflow, but the correct form is kept).

**`search_by_name` must return every match, not just the first**, because names really do repeat in a shop.
Returning the first match, as `linear_search` does, would give the user the wrong item without them knowing — renting out the wrong unit,
while the other item silently disappears from the system. Set B was built specifically to prove this.

## 2.4 Range questions — where a hash table cannot help

`find_due_before(sorted_by_due, limit_date)` answers *"what is due back before date X?"*

It uses halving to find the leftmost position where `due_date >= limit_date` in O(log n), then takes every item before it in one block,
for a total of **O(log n + k)**, where k is the number of answers — which have to be copied out whatever method is used.

Note that `high` starts at `len()` rather than `len() - 1`, because the answer may be "past the end", meaning that no item reaches the limit.

**A hash table cannot do this.** A hash only knows which bucket an exact key is in; it has no idea of "before" or "after".
A range question would have to scan the whole table, which is O(n) — **this is why the project still needs binary search
even though it already has Kim's hash table**.

## 2.5 Counting

Three functions share exactly the same structure: one pass over the data, differing only in the condition and in what is added.

| Function | Counts | Easy to get wrong |
|---|---|---|
| `count_available` | **Units** free on the shelf | Broken units do not count — they may sit on the shelf, but cannot be rented |
| `count_by_status` | **Records** per status | Always returns all 3 keys, even when a value is 0 |
| `count_overdue` | Rentals past their due date | Returned items have no `due_date` and must be skipped first, otherwise `TypeError` |

**All three are O(n) and there is no shortcut** — counting differs from searching in that there is no "right one" to stop at.
Every item has to be examined before the number is known. Binary search cannot help, because halving needs a single target
that can be compared as greater or smaller, and a hash table only answers "where is this one", not "how many meet the condition".

`count_by_status` produces all three numbers in a single pass rather than three separate loops — the same result, reading the data three times less.

**Dates can be compared as plain strings**, because `YYYY-MM-DD` runs from the largest unit to the smallest.
`"2026-09-26" < "2026-10-01"` is true both as text and as dates — stored as `DD/MM/YYYY`, this would stop being true at once.

## 2.6 Complexity (Big-O)

| Function | Time | Memory | Worst case happens when |
|---|---|---|---|
| `linear_search` | O(n) | O(1) | The item is not there at all, so every item must be checked |
| **`binary_search`** | **O(log n)** | **O(1)** | The item is at the very edge, using all log₂(n) rounds |
| `hash_lookup` | O(1) average | O(n) for the table | Every code lands in the same bucket, making it O(n) |
| `search_by_name` | O(n) | O(k) for the results | Every record contains the search term |
| `sort_by_code` | O(n log n) | O(n) | — |
| **`find_due_before`** | **O(log n + k)** | O(k) | Every record matches (k = n) |
| `count_available` · `count_by_status` · `count_overdue` | O(n) | O(1) | Every case is the same; there is no shortcut |

**Why binary search uses O(1) memory even though it halves repeatedly** — because it is a loop, not recursion.
It uses only three variables, `low`, `high` and `middle`, however much data there is.
A recursive version would use one stack frame per level, making memory O(log n).

## 2.7 Test data sets

The team shares the same `make_dataset()`, written in this part (`datasets.py`), with the reference date fixed at `TODAY = 2026-10-01`.

| Set | Size | Duplicate names | Out of stock | Overdue | Broken | Used to prove |
|---|---:|---:|---:|---:|---:|---|
| A | 10 | 0 | 1 | 3 | 1 | Every function works in the basic case |
| B | 12 | 6 | 5 | 4 | 1 | `search_by_name` must return every match |
| C | 10 | 0 | 5 | 4 | 1 | Counting when many items are out of stock |
| D | 1,000 | 0 | 288 | 275 | 142 | The Big-O difference as data grows |

The data uses fixed seeds rather than fresh random values, **so the numbers in this report repeat on every run**.
A broken item is placed at every 7th position so that each small set has at least one; otherwise the
"skip broken items" condition in `count_available` would never be tested.

## 2.8 Results

Each cell is run 3 times and averaged with `time.perf_counter()`, the same method as Parts 1 and 3.
Time spent preparing data is excluded. Times are in milliseconds · "Speed-up" = linear time ÷ binary time.

**Table S1 — Look up every code once**

| Set | Size | Linear | Binary | Hash | Speed-up |
|---|---:|---:|---:|---:|---:|
| A | 10 | 0.004 | 0.006 | 0.016 | 0.6× |
| B | 12 | 0.004 | 0.007 | 0.018 | 0.6× |
| C | 10 | 0.003 | 0.006 | 0.015 | 0.6× |
| D | 1,000 | 21.812 | 1.759 | 1.580 | **12.4×** |

**The Python baseline in this table** — item 4 of `plan.md` assigns a different baseline to each member's work:
`dict` for the hash table · `sorted()` for sorting · **scanning the whole list for searching**.
The linear column in Table S1 is that baseline — a plain Python loop over the items, with no data structure to help.
The hash column is Kim's `HashTable` from Part 1, included to show where the third method stands on the same data.

Neo's own notebook (`LEBIS_Neo_SearchCount.ipynb`, section 6) also measures against Python's `bisect`.
The times are of the same order; `bisect` is slightly faster because it is written in C, not because its algorithm is better.
**Those numbers are not included in this table**, because they come from a different run, and mixed numbers cannot be compared.

**Table S2 — Counting results**

| Set | Free on shelf (units) | ok | out | broken | Overdue |
|---|---:|---:|---:|---:|---:|
| A | 24 | 9 | 0 | 1 | 3 |
| B | 14 | 7 | 4 | 1 | 4 |
| C | 10 | 5 | 4 | 1 | 4 |
| D | 1,309 | 616 | 242 | 142 | 275 |

**Table S3 — Searching by a duplicated name (set B)**

Searching for `"เลนส์ รุ่นที่ 1"` ("Lens model 1") returns **4 records** — `LEN-0001` (0/2, out) · `LEN-0002` (3/5, ok) · `LEN-0011` (4/5, ok) · `LEN-0012` (0/5, out)

Of these, 2 names match exactly. The others contain the search term inside their names — *"model 11"* contains *"model 1"*.
**This is the right behaviour for the search box on the website**, because users can type part of a name and still find it.

**Table S4 — A range question (set D)**

*"Which items are due back before 2026-10-01?"* — binary search finds **275 records** · a one-by-one O(n) count finds **275 records** → **identical**

### Reading the results

1. **On the small sets (A–C), linear is faster than binary** (0.004 vs 0.006 ms) — there is too little data for halving
   to repay the cost of computing positions. **O(log n) does not mean always faster; it means growing more slowly.**
   Concluding from the small sets that binary search is worse would be the wrong conclusion.
2. **On set D, binary is 12.4 times faster than linear** (21.812 vs 1.759 ms), and hash is 13.8 times faster than linear (1.580 ms).
3. **The growth rates match the theory almost exactly** — the data grows 100 times from A to D, and this measurement looks up every code,
   that is, n lookups, so we expect:
   - binary: n × O(log n) → should grow 100 × 3 = **300 times** · measured 1.759 ÷ 0.006 = **293 times**
   - hash: n × O(1) → should grow **100 times** · measured 1.580 ÷ 0.016 = **99 times**

   Both match what Big-O predicts, closely enough that it is not a coincidence.
4. **Linear grows less than the theory says** — n × O(n) should grow 10,000 times, but it measured 21.812 ÷ 0.004 ≈ 5,453 times.
   This is not because the theory is wrong: at n = 10, most of the time goes on fixed costs (calling the function, setting up the loop)
   rather than on actual comparisons, so the divisor is too large, **which makes the ratio look smaller**.
   This is the same reason as point 1, seen from another angle.
5. **Hash and binary are very close on set D** (1.580 vs 1.759 ms), even though their Big-O classes differ,
   because log₂(1,000) ≈ 10 is still a small number. The difference would become clear only at much larger n.
   **But speed is not the reason binary search was chosen** — the reason is Table S4, which a hash table cannot answer.
6. **Counting has no speed comparison table**, because there is no other method to compare with: every method has to examine every item.
   Table S2 therefore reports the correctness of the numbers, not their times.

The measured times vary with the machine on every run, but the order of which method is faster does not change.

## 2.9 Flowcharts

In `docs/data-course/flowcharts/`, as both draw.io and PDF files · the PDFs are also in the team folder: https://drive.google.com/drive/folders/1r2B5_h15vtCjMgca2rhnYVqcbX1wulWY

1. `flow_neo_4_search` — searching, showing all 3 paths, with the binary search loop drawn step by step
2. `flow_neo_5_count` — the 3 counting functions side by side, with the reason all of them are O(n)

## 2.10 Related files

| File | What it is |
|---|---|
| `backend-api/algorithms/search.py` | All the searching and counting code; standard library only |
| `backend-api/algorithms/datasets.py` | Data sets A–D shared by the whole team |
| `docs/data-course/LEBIS_Final.ipynb` | The combined, already-run notebook of all three members — the numbers in this report come from this file · **Colab:** https://colab.research.google.com/drive/1K3JSlNVuN-mof98pjE09J_nFKhZEmyV8 |
| `docs/data-course/LEBIS_Neo_SearchCount.ipynb` | Neo's own notebook, with more detail (its numbers are from a different run; do not mix them) |
| `scripts/data-course-benchmark.py` | Script that measures sets A–D locally, combining all three modules |

## 2.11 This code runs in the live system, not just for the assignment

The Workspace page of the website shows three numbers, and two of them call functions from this part directly, through `services/inventory.py`.

- `available_units` ← `count_available()`
- `overdue_borrows` ← `count_overdue()`

SQL `COUNT`/`SUM`, which would be faster, is deliberately not used. Counting a second time in SQL
would mean defining "free" and "overdue" in two places, **and one day the two would disagree without anyone noticing**.

Before switching, we proved that every number stayed the same, on normal data and on edge cases
(a broken item still holding available units · a rental due exactly today · a rental that became overdue yesterday).

`find_due_before()` runs every morning at 08:00 in the summary of items due back that the system sends the shop owner on LINE.
The system first sorts the rentals with Kul's merge sort, then uses binary search to take out the overdue rentals, those due today
and those due tomorrow in one block — the same sequence described in the Conclusion of this report.

**What is not in the website** is `binary_search()` for lookup by code. The website uses a database index to find an item by its code instead;
`binary_search()` is measured in the notebook only, for comparison with Kim's hash table.
