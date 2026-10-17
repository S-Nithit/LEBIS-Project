# Conclusion: Three Algorithms Working Together

This conclusion was written by Neo as the editor and summarises the three parts above. All the numbers come from `LEBIS_Final.ipynb`.

## One question that needs all three parts

Every morning the shop needs to know which rentals are overdue and what each of those items is. None of the three algorithms can answer this alone. It takes three steps, and each step passes its result to the next.

| Step | Who | What it does | Time |
|---|---|---|---|
| 1 | Kul (merge sort) | Sorts all rentals by due date | O(n log n) |
| 2 | Neo (binary search) | Takes out every rental due before today in one block | O(log n + k) |
| 3 | Kim (hash table) | Looks up each item's details by its code | O(1) per item |

Set D has 685 rentals. These three steps find 275 rentals that were overdue before 2026-10-01, and they are exactly the same rentals that a full one-by-one scan finds.

Each step passes a plain list to the next one, and none of us imports anyone else's code. If one of us changed the format of the data being passed on, this notebook cell would fail straight away, so it works both as an example of how the parts are used and as a test that they still fit together.

The live web application uses the first two steps in the same order. Every morning at 08:00 it sorts the rentals with merge sort, uses binary search to find what is due, and sends the shop owner a summary on LINE. It does not need step 3, because it reads each item's details from the database.

## Main results

The table compares each hand-written algorithm with the simplest method that does the same job, on set D (1,000 records).

| Part | Task | Simple method | Hand-written | Speed-up | Python's built-in (baseline) |
|---|---|---|---|---:|---|
| 1 (Kim) | Look up every code once | List scan 21.753 ms | Hash table 1.530 ms | 14.2× | `dict` 0.053 ms |
| 2 (Neo) | Look up every code once | One-by-one scan 21.812 ms | Binary search 1.759 ms | 12.4× | Scanning the whole list (the simple method column) |
| 3 (Kul) | Sort the whole set once | Bubble sort 90.516 ms | Merge sort 2.619 ms | 34.6× | `sorted()` 0.124 ms |

## Complexity of every algorithm in the report

| Part | Algorithm | Time (average) | Time (worst) | Memory |
|---|---|---|---|---|
| 1 | Lookup, insert and delete with the hash table | O(1) | O(n) | O(n) |
| 2 | Binary search | O(log n) | O(log n) | O(1) |
| 2 | Range query `find_due_before` | O(log n + k) | O(log n + k) | O(k) |
| 2 | Counting (`count_*`) | O(n) | O(n) | O(1) |
| 3 | Merge sort | O(n log n) | O(n log n) | O(n) |
| 3 | Grouping (`group_by_*`) | O(n) | O(n) | O(n) |

The reasoning behind each value is explained in the Big-O section of the matching part.

## What we found across all three parts

On small data, the simple method wins. All three parts saw this on sets A to C (10 to 12 records): the list scan beat the hash table, the one-by-one scan beat binary search, and bubble sort was as fast as merge sort or faster. With so few items, the fixed cost of the clever part (hashing, finding the middle, splitting the list) is larger than the actual work. Big-O tells us which method grows more slowly, not which one is faster for every n. If we had only measured the small sets, all three parts would have come to the wrong conclusion.

On large data, the Big-O difference shows up clearly in the measurements. From set A to set D the data grows 100 times. The test in Part 2 looks up every code in the set, so it makes n lookups, not one. Binary search grew 293 times, close to the 300 times predicted for n lookups at O(log n) each (100 × 3), and the hash table grew 99 times, close to the 100 times predicted for n lookups at O(1) each. A single lookup grows much less: about 3 times for binary search, and not at all for the hash table.

Python's built-in tools were faster than our versions because they are written in C, not because they use a better algorithm. On set D, `dict` and `sorted()` were many times faster than our hash table and our merge sort. They are in the same Big-O class, though, so they grow at the same rate as the data and differ only by a constant factor. (Neo's own notebook also compared `bisect` with our binary search, and `bisect` was only slightly faster.)

No single data structure can answer every question. A hash table is the fastest when the exact code is known, but it cannot answer range questions and has no order. A sorted list can answer range questions, but it has to be sorted first, which is what merge sort is for. This is why the inventory in our notebook keeps both and picks one depending on the question. In the web application, the database index plays the role of the hash table when an item is looked up by its code.
