# Part 1 — Inserting and Deleting with a Hand-Written Hash Table (Kim)

> English translation of `kim-hashtable.md`, which was written by Kim. The content, analysis and numbers are Kim's; only the language has changed.
> Every number comes from `LEBIS_Final.ipynb` (the combined notebook of all three members), committed in the repository — the same file linked from Colab.
> If the notebook is run again, replace whole tables with numbers from that run; never mix two runs.

## 1.1 The process chosen

A photography equipment rental shop with one to three staff repeats the same questions every day.

- A customer asks *"Is camera CAM-0012 available?"* — an item has to be found by its code.
- New stock arrives — an item has to be added, and codes must never repeat.
- Items are rented out and returned — the available count has to change.
- An item breaks beyond repair — it has to be removed from the system.

If items are kept in a plain list, every question means scanning one item at a time until a match is found, and the more stock there is, the slower it gets.
This part therefore chooses the **Inserting** and **Deleting** algorithm groups (including lookup by code),
and implements the hash table entirely by hand rather than wrapping Python's `dict`.

## 1.2 Data structure

Each item is stored as a record with 8 fields, shared by the whole team.

`code` · `name` · `category` · `total` · `available` · `borrower` · `due_date` · `status`

The system keeps items **in two places side by side**.

```
items = [ {CAM-0001 ...}, {LEN-0002 ...}, ... ]   records, in order
index = HashTable: "CAM-0001" -> 0 · "LEN-0002" -> 1   code -> position
```

| Stored as | Lookup by code | Sorting or walking in order |
|---|---|---|
| List only | O(n) | Yes |
| Hash table only | O(1) average | No — the order is the order of the buckets |
| **List + hash index** | **O(1) average** | **Yes** |

Both are needed because other parts of the system need order: Kul's merge sort
sorts rentals by due date, and Neo's binary search finds what is due before a given date.
A hash table cannot answer range or ordered questions at all, so the list cannot be dropped.
The price is the memory for one extra table, and the need to keep the two in step at all times.

## 1.3 The hash table

### Hash function

A **polynomial rolling hash** is used.

```
h = 0
for every character c in the code:   h = (h × 31 + ord(c)) mod 1,000,000,007
bucket = h mod number_of_buckets
```

- **Character position matters** — `CAM-01` and `CAM-10` land in different buckets.
  Simply adding the character codes would give these two the same value, and this is the code format shops really use.
- **Base 31** is prime — small enough to multiply quickly, large enough to spread the values.
- **Taking the result modulo a large prime** stops the number growing without limit and slowing down the calculation.

### Collisions and chaining

A collision is when two different codes hash to the same bucket. It cannot be avoided, because codes are unlimited but buckets are not.
**Chaining** is used — one bucket holds several pairs linked as a chain. A lookup goes to that bucket and scans the short chain.

### Resizing

When the **load factor** (number of items ÷ number of buckets) exceeds **0.7**, the number of buckets doubles and every item is placed again (rehash).
The load factor is the average chain length, so it is the number that says whether the table is still fast.

- Too low — the table is sparse, wastes memory, and resizes often.
- Too high — saves space, but chains get long and lookups slow down.

A resize costs O(n) each time, but it only happens when the data has doubled.
Averaged over every insert, the cost is therefore still O(1) (amortized O(1)).

## 1.4 Adding, renting, returning and removing

Every function validates first and changes data only if validation passes.
If the list were changed and the index update then failed, the two would be out of step forever.

| Function | Rejected when |
|---|---|
| `add_item` | Duplicate code · invalid quantity |
| `borrow_item` | Unknown code · item broken · no unit available · no renter name |
| `return_item` | Unknown code · item not currently rented |
| `remove_item` | Unknown code · units still with customers |

**Swap-and-pop removal** — removing from the middle of a list directly is O(n), because every later item has to shift,
and the positions the index remembers for them all become wrong. Instead, the last item is moved into the removed position,
only that moved item's index entry is updated, and the last slot is dropped. Every step is O(1).
The price is that the order of the list changes, which is acceptable because any task that needs order sorts the data itself.

## 1.5 Complexity (Big-O)

| Operation | Average | Worst | Worst case happens when |
|---|---|---|---|
| Lookup by code | O(1) | O(n) | Every code lands in the same bucket |
| Insert | O(1) amortized | O(n) | The insert triggers a resize, or a chain is long |
| Delete | O(1) | O(n) | A chain is long |
| Resize | O(n) per resize | O(n) | — |

**Why O(1) is the average and not the worst case** — if every code hashed to the same bucket, the table would be a single chain of length n,
and a lookup would become a one-by-one scan, just like a list. This can happen when the hash function spreads values poorly, when the table never resizes,
or when someone deliberately chooses codes that all collide. Section 4 of the notebook shows a table that is not allowed to resize, for comparison:
the average chain is 15 items long and the longest is 17 (a normally resizing table's longest chain is only 3).
The more data is added, the longer the chains grow with n, which is O(n) in practice. In short, O(1) is not free:
it comes from a well-spread hash function together with resizing; without either one, it degrades to O(n).

## 1.6 Test data sets

The same `make_dataset()` by Neo is used across the team. Every set has at least 10 records, as the assignment requires.

| Set | Size | Characteristics | Used to prove |
|---|---|---|---|
| A | 10 | Clean data | Every function works |
| B | 12 | Duplicate names, unique codes | Lookup by code returns the right item |
| C | 10 | Many items out of stock | Status and counting |
| D | 1,000 | Large set | The Big-O difference as data grows |

## 1.7 Results

Three methods are measured on the same data — a list scan, the hand-written hash table, and Python's `dict` (the baseline).
Each cell is run 3 times and averaged with `time.perf_counter()`; time spent preparing data is excluded.
Times are in milliseconds · "Speed-up" = list scan time ÷ hand-written hash table time.

**Table H1 — Look up every code once**

| Set | List scan | HashTable | dict | Speed-up |
|---|---:|---:|---:|---:|
| A (10) | 0.004 | 0.015 | 0.001 | 0.3× |
| B (12) | 0.005 | 0.017 | 0.001 | 0.3× |
| C (10) | 0.004 | 0.014 | 0.001 | 0.3× |
| D (1,000) | 21.753 | 1.530 | 0.053 | **14.2×** |

**Table H2 — Add every record one at a time (every method checks for a duplicate code first)**

| Set | List scan | HashTable | dict | Speed-up |
|---|---:|---:|---:|---:|
| A (10) | 0.004 | 0.042 | 0.002 | 0.1× |
| B (12) | 0.005 | 0.066 | 0.002 | 0.1× |
| C (10) | 0.004 | 0.041 | 0.002 | 0.1× |
| D (1,000) | 20.625 | 5.902 | 0.112 | **3.5×** |

**Table H3 — Delete every code once**

| Set | List scan | HashTable | dict | Speed-up |
|---|---:|---:|---:|---:|
| A (10) | 0.006 | 0.019 | 0.002 | 0.3× |
| B (12) | 0.005 | 0.020 | 0.001 | 0.3× |
| C (10) | 0.005 | 0.016 | 0.001 | 0.3× |
| D (1,000) | 15.152 | 1.719 | 0.061 | **8.8×** |

**Table H4 — Hash table state after inserting the whole set**

| Set | Items | Buckets | Collisions | Resizes | Longest chain | Load factor |
|---|---:|---:|---:|---:|---:|---:|
| A | 10 | 16 | 2 | 1 | 2 | 0.625 |
| B | 12 | 32 | 5 | 2 | 3 | 0.375 |
| C | 10 | 16 | 2 | 1 | 2 | 0.625 |
| D | 1,000 | 2,048 | 374 | 8 | 3 | 0.488 |

### Reading the results

1. **On the small sets (A–C) the list scan is faster** — scanning 10 items costs less than computing a hash each time.
   Big-O describes behaviour as n grows; it does not say who wins at small n. Measuring only the small sets would lead to the wrong conclusion.
2. **On set D the hash table wins all three tasks** — the data grows 100 times from set A.
   Lookup time with a list scan grows about 5,438 times (n lookups, each scanning half the list on average = n²/2),
   while the hash table grows about 102 times, in proportion to n only.
3. **Inserting wins by the smallest margin (3.5×)** because the hash table spends time resizing 8 times while inserting 1,000 records.
   This cost is spread across the whole set (amortized), so it still grows with n, not n².
4. **Many collisions, but short chains** — set D has 374 collisions, yet the longest chain is only 3, because the table resizes every time the load factor exceeds 0.7.
   This is evidence that collisions are not a problem as long as chains are not allowed to grow long.
5. **Python's `dict` is faster than ours** — about 28–29 times for lookup and delete, and about 53 times for insert
   (`dict` resizes itself in C, while ours rehashes one item at a time in Python).
   Both are O(1), however; they differ by a constant factor and grow at the same rate.

The measured times vary with the machine on every run, but the order of which method is faster does not change.

## 1.8 Flowcharts

In `docs/data-course/flowcharts/`, as both draw.io and PDF files · the PDFs are also in the team folder: https://drive.google.com/drive/folders/1r2B5_h15vtCjMgca2rhnYVqcbX1wulWY

1. `flow_kim_1_overview` — system overview: every command goes through the hash index first
2. `flow_kim_2_insert` — adding an item, including the paths for a collision and for resizing
3. `flow_kim_3_delete_return` — swap-and-pop removal, and returning an item

## 1.9 Related files

| File | What it is |
|---|---|
| `backend-api/algorithms/hash_table.py` | All the code; standard library only |
| `docs/data-course/LEBIS_Final.ipynb` | The combined, already-run notebook of all three members — the numbers in this report come from this file · **Colab:** https://colab.research.google.com/drive/1K3JSlNVuN-mof98pjE09J_nFKhZEmyV8 |
| `docs/data-course/LEBIS_Kim_HashTable.ipynb` | Kim's own notebook, with more detailed explanations (its numbers are from a different run; do not mix them) |
| `scripts/data-course-hashtable.py` | Script that measures sets A–D locally |
| `scripts/build-notebooks.py` | Builds the notebooks from the real files in the repository |
