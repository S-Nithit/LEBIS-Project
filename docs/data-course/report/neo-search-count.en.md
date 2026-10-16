# Part 2: Searching and Counting with Binary Search (Neo)

*Written by Neo. All numbers come from `LEBIS_Final.ipynb`.*

## 2.1 The process chosen

Part 1 answered "where is the item with this code?" with a hash table, which is the fastest option when the exact code is known. In a real shop, though, the questions go further than that:

- A customer may not remember the code and only describe the item, for example "the lens I rented last time". Items then have to be found by part of their name, and names can repeat.
- When the owner opens the system in the morning, they want to know how many units are free, how many are with customers, and how many rentals are overdue.
- Before closing, they may ask what is due back before a certain date. This is a range question, not a lookup of one value.

A hash table cannot answer the last two at all, because it can only work out a position from an exact key. This part therefore covers the Searching and Counting algorithm groups, with binary search written by hand. Python's `bisect` is not used, except as something to compare against.

## 2.2 Data structure and the precondition for searching

The whole team uses the same 8-field record from `make_dataset()`:

`code`, `name`, `category`, `total`, `available`, `borrower`, `due_date`, `status`

Binary search needs one thing that a plain list does not guarantee: the data has to be sorted already. If the list is not sorted by `code`, the search cuts off the wrong half and returns `None` even though the item is in the list. Nothing reports this as an error, so someone would have to spot it by eye. For this reason we provide `sort_by_code()` to call first, and it returns a new list instead of changing the original.

In the live system, the list sorted by `due_date` comes directly from Kul's merge sort (`sort_by_due_date()`). Since our two parts are connected, we agreed that every function returns a new list and never changes a list that someone else is holding.

## 2.3 Three search paths

Which path is used depends on the kind of question, not on which method is fastest.

| Path | Function | Used when | Time |
|---|---|---|---|
| Linear | `linear_search` | The list is not sorted and there is no hash table. Also used as the baseline | O(n) |
| Hash | `hash_lookup` | The exact code is known and Kim's table is available | O(1) on average |
| Binary | `binary_search` | Exact code on a sorted list (the one written by hand in this part) | O(log n) |
| Partial name | `search_by_name` | The customer only remembers the name | O(n) |

Binary search starts by looking at the middle item. If it matches, the search stops. If the target is smaller than the middle item, it has to be in the left half, so the whole right half can be ignored, and the other way round. Each comparison cuts the remaining part in half, which means 1,000 items need only about 10 comparisons, since 2¹⁰ = 1,024.

We wrote it as a loop rather than with recursion. A loop does not use extra stack space, so the memory is O(1) instead of O(log n). The middle is computed as `middle = low + (high - low) // 2` rather than `(low + high) // 2`. This is the usual way to avoid overflow in languages where `int` has a fixed size. Python does not overflow, but we kept the safer form anyway.

`search_by_name` has to return every match, not only the first one, because names really do repeat in a shop. If it returned the first match like `linear_search` does, the user could pick the wrong item without knowing it, rent out the wrong unit, and the other item would quietly drop out of view. Set B was built to test exactly this.

## 2.4 Range questions, where a hash table cannot help

`find_due_before(sorted_by_due, limit_date)` answers "what is due back before date X?".

It uses the same halving idea to find the leftmost position where `due_date >= limit_date`, which takes O(log n), and then takes every item before that position in one block. The total is O(log n + k), where k is the number of results. Those k results have to be copied out whichever method is used.

Note that `high` starts at `len()` and not `len() - 1`, because the answer can be "past the end of the list", meaning no item reaches the limit.

A hash table cannot do this. It only knows which bucket an exact key belongs to and has no idea of "before" or "after", so a range question would mean scanning the whole table in O(n). This is the reason the project still needs binary search even though it already has Kim's hash table.

## 2.5 Counting

The three counting functions have exactly the same structure: one pass over the data. They only differ in the condition they check and in what they add up.

| Function | Counts | Easy to get wrong |
|---|---|---|
| `count_available` | Units free on the shelf | Broken units are not counted. They may still be on the shelf, but they cannot be rented |
| `count_by_status` | Records per status | It always returns all 3 keys, even when a count is 0 |
| `count_overdue` | Rentals past their due date | Returned items have no `due_date`, so they must be skipped first, otherwise Python raises `TypeError` |

All three are O(n), and there is no shortcut. Counting is different from searching because there is no single item to stop at, so every item has to be checked before the total is known. Binary search does not help, since halving needs one target that can be compared as larger or smaller. A hash table does not help either, because it answers "where is this item", not "how many items meet this condition".

`count_by_status` works out all three numbers in one pass instead of three separate loops. The result is the same, but the data is read once instead of three times.

Dates can be compared as plain strings because the format `YYYY-MM-DD` goes from the largest unit to the smallest. For example, `"2026-09-26" < "2026-10-01"` is true both as text and as dates. If the dates were stored as `DD/MM/YYYY`, this would no longer work.

## 2.6 Complexity (Big-O)

| Function | Time | Memory | The worst case happens when |
|---|---|---|---|
| `linear_search` | O(n) | O(1) | The item is not in the list, so every item has to be checked |
| `binary_search` | O(log n) | O(1) | The item is at one end, so all log₂(n) rounds are used |
| `hash_lookup` | O(1) on average | O(n) for the table | Every code lands in the same bucket, which makes it O(n) |
| `search_by_name` | O(n) | O(k) for the results | Every record contains the search term |
| `sort_by_code` | O(n log n) | O(n) | (the same in every case) |
| `find_due_before` | O(log n + k) | O(k) | Every record matches (k = n) |
| `count_available`, `count_by_status`, `count_overdue` | O(n) | O(1) | Every case is the same, there is no shortcut |

Binary search needs only O(1) memory even though it halves the list again and again, because it is a loop and not recursion. It only uses three variables, `low`, `high` and `middle`, no matter how much data there is. A recursive version would use one stack frame per level, so its memory would be O(log n).

## 2.7 Test data sets

The team shares the same `make_dataset()`, which was written as part of this work (`datasets.py`). The reference date is fixed at `TODAY = 2026-10-01`.

| Set | Size | Duplicate names | Out of stock | Overdue | Broken | Used to show |
|---|---:|---:|---:|---:|---:|---|
| A | 10 | 0 | 1 | 3 | 1 | Every function works in the basic case |
| B | 12 | 6 | 5 | 4 | 1 | `search_by_name` returns every match |
| C | 10 | 0 | 5 | 4 | 1 | Counting when many items are out of stock |
| D | 1,000 | 0 | 288 | 275 | 142 | The Big-O difference as the data grows |

The data is generated from fixed seeds instead of new random values, so the numbers in this report come out the same on every run. A broken item is placed at every 7th position so that even the small sets have at least one. Otherwise the "skip broken items" condition in `count_available` would never be tested.

## 2.8 Results

Each cell was run 3 times and averaged with `time.perf_counter()`, the same method used in Parts 1 and 3. The time to prepare the data is not included. Times are in milliseconds, and "Speed-up" is the linear time divided by the binary time.

**Table S1. Look up every code once**

| Set | Size | Linear | Binary | Hash | Speed-up |
|---|---:|---:|---:|---:|---:|
| A | 10 | 0.004 | 0.006 | 0.016 | 0.6× |
| B | 12 | 0.004 | 0.007 | 0.018 | 0.6× |
| C | 10 | 0.003 | 0.006 | 0.015 | 0.6× |
| D | 1,000 | 21.812 | 1.759 | 1.580 | 12.4× |

About the Python baseline in this table: item 4 of `plan.md` gives each member's work a different baseline. It is `dict` for the hash table, `sorted()` for sorting, and scanning the whole list for searching. The Linear column in Table S1 is that baseline, a plain Python loop over the items with no data structure to help it. The Hash column is Kim's `HashTable` from Part 1, included to show where the third method stands on the same data.

Neo's own notebook (`LEBIS_Neo_SearchCount.ipynb`, section 6) also compares against Python's `bisect`. The times are in the same range, and `bisect` is slightly faster because it is written in C, not because its algorithm is better. Those numbers are not in this table because they come from a different run, and numbers from different runs cannot be compared fairly.

**Table S2. Counting results**

| Set | Free on shelf (units) | ok | out | broken | Overdue |
|---|---:|---:|---:|---:|---:|
| A | 24 | 9 | 0 | 1 | 3 |
| B | 14 | 7 | 4 | 1 | 4 |
| C | 10 | 5 | 4 | 1 | 4 |
| D | 1,309 | 616 | 242 | 142 | 275 |

**Table S3. Searching by a duplicated name (set B)**

Searching for `"เลนส์ รุ่นที่ 1"` ("Lens model 1") returns 4 records: `LEN-0001` (0/2, out), `LEN-0002` (3/5, ok), `LEN-0011` (4/5, ok) and `LEN-0012` (0/5, out).

Two of these names match exactly. The other two contain the search term inside a longer name, since "model 11" also contains "model 1". This is the behaviour we want for the search box on the website, because users can type only part of a name and still find the item.

**Table S4. A range question (set D)**

For "which items are due back before 2026-10-01?", binary search finds 275 records and a one-by-one O(n) count also finds 275 records, so the two results are identical.

### Reading the results

1. On the small sets (A to C), linear search is faster than binary search (0.004 compared with 0.006 ms). There is too little data for the halving to make up for the cost of working out the positions. O(log n) does not mean "always faster", it means "grows more slowly", so judging binary search from the small sets alone would be a mistake.
2. On set D, binary search is 12.4 times faster than linear search (21.812 compared with 1.759 ms), and the hash table is 13.8 times faster than linear search (1.580 ms).
3. The growth rates are very close to the theory. The data grows 100 times from A to D, and this test looks up every code, which is n lookups. We would therefore expect:
   - binary: n × O(log n), so it should grow about 100 × 3 = 300 times. It actually grew 1.759 ÷ 0.006 = 293 times.
   - hash: n × O(1), so it should grow about 100 times. It actually grew 1.580 ÷ 0.016 = 99 times.

   Both are close enough to the Big-O prediction that it is unlikely to be a coincidence.
4. Linear search grew less than the theory says. n × O(n) should grow 10,000 times, but we measured 21.812 ÷ 0.004 ≈ 5,453 times. This does not mean the theory is wrong. At n = 10 most of the time goes on fixed costs, such as calling the function and setting up the loop, rather than on the comparisons themselves. The small-set time is therefore too large to divide by, and the ratio comes out smaller. It is the same effect as in point 1, seen from a different side.
5. The hash table and binary search are very close on set D (1.580 compared with 1.759 ms) even though their Big-O classes are different, because log₂(1,000) ≈ 10 is still a small number. The gap would only become clear at a much larger n. In any case, speed was not the reason for choosing binary search. The reason is Table S4, which a hash table cannot answer.
6. There is no speed comparison for counting, because there is nothing to compare it with: every method has to check every item. Table S2 therefore shows that the numbers are correct rather than how long they took.

The measured times change slightly every time the code is run, but the order of which method is faster stays the same.

## 2.9 Flowcharts

The flowcharts are in `docs/data-course/flowcharts/` as both draw.io and PDF files. The PDFs are also in the team's Drive folder: https://drive.google.com/drive/folders/1r2B5_h15vtCjMgca2rhnYVqcbX1wulWY

1. `flow_neo_4_search`: searching, showing all 3 paths, with the binary search loop drawn step by step
2. `flow_neo_5_count`: the 3 counting functions side by side, with the reason all of them are O(n)

## 2.10 Related files

| File | Description |
|---|---|
| `backend-api/algorithms/search.py` | All of the searching and counting code, using only the standard library |
| `backend-api/algorithms/datasets.py` | Data sets A to D, shared by the whole team |
| `docs/data-course/LEBIS_Final.ipynb` | The combined notebook of all three members, already run. The numbers in this report come from this file. Colab: https://colab.research.google.com/drive/1K3JSlNVuN-mof98pjE09J_nFKhZEmyV8 |
| `docs/data-course/LEBIS_Neo_SearchCount.ipynb` | Neo's own notebook, with more detail. Its numbers come from a different run, so they should not be mixed with this report. |
| `scripts/data-course-benchmark.py` | Script that measures sets A to D locally using all three modules together |

## 2.11 This code is used in the live system

The Workspace page of the website shows three numbers, and two of them are calculated directly by functions from this part, through `services/inventory.py`:

- `available_units` comes from `count_available()`
- `overdue_borrows` comes from `count_overdue()`

We chose not to use SQL `COUNT` or `SUM` here, even though they would be faster. Counting a second time in SQL would mean defining "free" and "overdue" in two different places, and sooner or later the two definitions would drift apart without anyone noticing.

Before switching over, we checked that every number stayed the same, both on normal data and on edge cases: a broken item that still had available units, a rental due exactly today, and a rental that became overdue yesterday.

`find_due_before()` also runs every morning at 08:00, when the system sends the shop owner a LINE summary of items due back. The system first sorts the rentals with Kul's merge sort, then uses binary search to take out the overdue rentals together with those due today and tomorrow in one block. This is the same sequence described in the Conclusion.

The one function that is not used on the website is `binary_search()` for lookup by code. The website finds an item by its code through a database index instead, and `binary_search()` is only measured in the notebook, for comparison with Kim's hash table.
