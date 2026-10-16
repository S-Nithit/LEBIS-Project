# Part 1: Inserting and Deleting with a Hash Table (Kim)

*Written by Kim, translated from the Thai original (`kim-hashtable.md`) for this report. All numbers come from `LEBIS_Final.ipynb`.*

## 1.1 The process chosen

A small photography equipment rental shop with one to three staff deals with the same tasks every day:

- A customer asks whether camera CAM-0012 is available, so an item has to be found by its code.
- New stock arrives, so items have to be added, and two items must never share a code.
- Items are rented out and returned, so the number available has to change.
- An item breaks and cannot be repaired, so it has to be removed from the system.

If the items are kept in a plain list, each of these tasks means going through the list one item at a time until the right one is found, and this gets slower as the shop grows. This part therefore covers the Inserting and Deleting algorithm groups, including lookup by code. The hash table is written from scratch and is not a wrapper around Python's `dict`.

## 1.2 Data structure

Each item is stored as a record with 8 fields, the same format used by the whole team:

`code`, `name`, `category`, `total`, `available`, `borrower`, `due_date`, `status`

The system keeps the items in two places at the same time:

```
items = [ {CAM-0001 ...}, {LEN-0002 ...}, ... ]   records, in order
index = HashTable: "CAM-0001" -> 0, "LEN-0002" -> 1   code -> position
```

| Stored as | Lookup by code | Sorting or going through in order |
|---|---|---|
| List only | O(n) | Yes |
| Hash table only | O(1) on average | No, the order is just the order of the buckets |
| List with a hash index | O(1) on average | Yes |

We need both because other parts of the system depend on order. Kul's merge sort sorts rentals by due date, and Neo's binary search finds what is due before a given date. A hash table cannot answer range questions or give items back in order, so the list has to stay. The cost is the memory for one extra table, and the two have to be kept in sync at all times.

## 1.3 The hash table

### Hash function

We use a polynomial rolling hash:

```
h = 0
for every character c in the code:   h = (h × 31 + ord(c)) mod 1,000,000,007
bucket = h mod number_of_buckets
```

The reasons for this choice are:

- The position of each character matters, so `CAM-01` and `CAM-10` end up in different buckets. If we simply added up the character codes, these two would get the same value, and real shop codes look exactly like this.
- 31 is a prime number. It is small enough to multiply quickly but large enough to spread the values out.
- Taking the result modulo a large prime stops the number from growing without limit, which would slow the calculation down.

### Collisions and chaining

A collision happens when two different codes are mapped to the same bucket. Collisions cannot be avoided, since the number of possible codes is unlimited but the number of buckets is not. We handle them with chaining: one bucket can hold several pairs linked together as a chain, and a lookup goes to that bucket and checks the short chain.

### Resizing

When the load factor (the number of items divided by the number of buckets) goes above 0.7, the table doubles its number of buckets and places every item again (rehashing). The load factor is the average length of a chain, so it tells us whether the table is still fast.

- If the threshold is too low, the table is mostly empty, wastes memory and resizes often.
- If it is too high, it saves space, but the chains get long and lookups slow down.

Each resize costs O(n), but it only happens when the amount of data has doubled. Averaged over all inserts, each insert still costs O(1) (amortized O(1)).

## 1.4 Adding, renting, returning and removing

Every function checks its input before changing anything, and if a check fails, the data is left untouched. If the list were changed first and the index update then failed, the two would stop matching for good.

| Function | Rejected when |
|---|---|
| `add_item` | The code already exists, or the quantity is invalid |
| `borrow_item` | The code does not exist, the item is broken, no unit is available, or no renter name is given |
| `return_item` | The code does not exist, or the item is not currently rented |
| `remove_item` | The code does not exist, or some units are still with customers |

To remove an item we use swap-and-pop. Deleting from the middle of a list is O(n), because every item after it has to move up one place, and the positions the index remembers for those items would all become wrong. Instead, we move the last item into the gap, update the index entry for that one item, and drop the last slot. Every step is O(1). The downside is that the order of the list changes, but that is acceptable because any task that needs a particular order sorts the data itself.

## 1.5 Complexity (Big-O)

| Operation | Average | Worst | The worst case happens when |
|---|---|---|---|
| Lookup by code | O(1) | O(n) | Every code lands in the same bucket |
| Insert | O(1) amortized | O(n) | The insert triggers a resize, or a chain is long |
| Delete | O(1) | O(n) | A chain is long |
| Resize | O(n) per resize | O(n) | (always) |

O(1) is the average, not the worst case. If every code were hashed into the same bucket, the table would become one chain of length n, and a lookup would be no better than scanning a list. This can happen when the hash function spreads values badly, when the table never resizes, or when someone deliberately picks codes that all collide. Section 4 of the notebook shows a table that is not allowed to resize, for comparison. Its average chain is 15 items long and its longest is 17, while a table that resizes normally has a longest chain of only 3. The more data is added, the longer the chains in that table get, so in practice it becomes O(n). In other words, the O(1) average depends on having a hash function that spreads values well and on resizing. Without either one, it drops back to O(n).

## 1.6 Test data sets

We use the same `make_dataset()` (written by Neo) as the rest of the team. Every set has at least 10 records, as the assignment requires.

| Set | Size | Characteristics | Used to show |
|---|---|---|---|
| A | 10 | Clean data | Every function works |
| B | 12 | Duplicate names, unique codes | Lookup by code returns the right item |
| C | 10 | Many items out of stock | Status and counting |
| D | 1,000 | Large set | The Big-O difference as the data grows |

## 1.7 Results

We measured three methods on the same data: scanning a list, our hash table, and Python's `dict` as the baseline. Each cell was run 3 times and averaged with `time.perf_counter()`, and the time to prepare the data was not counted. Times are in milliseconds. "Speed-up" is the list scan time divided by our hash table time.

**Table H1. Look up every code once**

| Set | List scan | HashTable | dict | Speed-up |
|---|---:|---:|---:|---:|
| A (10) | 0.004 | 0.015 | 0.001 | 0.3× |
| B (12) | 0.005 | 0.017 | 0.001 | 0.3× |
| C (10) | 0.004 | 0.014 | 0.001 | 0.3× |
| D (1,000) | 21.753 | 1.530 | 0.053 | 14.2× |

**Table H2. Add every record one at a time (every method checks for a duplicate code first)**

| Set | List scan | HashTable | dict | Speed-up |
|---|---:|---:|---:|---:|
| A (10) | 0.004 | 0.042 | 0.002 | 0.1× |
| B (12) | 0.005 | 0.066 | 0.002 | 0.1× |
| C (10) | 0.004 | 0.041 | 0.002 | 0.1× |
| D (1,000) | 20.625 | 5.902 | 0.112 | 3.5× |

**Table H3. Delete every code once**

| Set | List scan | HashTable | dict | Speed-up |
|---|---:|---:|---:|---:|
| A (10) | 0.006 | 0.019 | 0.002 | 0.3× |
| B (12) | 0.005 | 0.020 | 0.001 | 0.3× |
| C (10) | 0.005 | 0.016 | 0.001 | 0.3× |
| D (1,000) | 15.152 | 1.719 | 0.061 | 8.8× |

**Table H4. State of the hash table after inserting the whole set**

| Set | Items | Buckets | Collisions | Resizes | Longest chain | Load factor |
|---|---:|---:|---:|---:|---:|---:|
| A | 10 | 16 | 2 | 1 | 2 | 0.625 |
| B | 12 | 32 | 5 | 2 | 3 | 0.375 |
| C | 10 | 16 | 2 | 1 | 2 | 0.625 |
| D | 1,000 | 2,048 | 374 | 8 | 3 | 0.488 |

### Reading the results

1. On the small sets (A to C) the list scan is faster. Checking 10 items costs less than computing a hash for every lookup. Big-O describes how the time grows as n gets larger. It does not tell us which method wins when n is small, so if we had only measured the small sets we would have reached the wrong conclusion.
2. On set D the hash table is faster at all three tasks. Set D is 100 times larger than set A. The lookup time for the list scan grew about 5,438 times (n lookups, each checking half the list on average, so about n²/2), while the hash table grew about 102 times, in line with n.
3. Inserting has the smallest speed-up (3.5×), because the hash table resized 8 times while the 1,000 records were added. This cost is spread over all the inserts (amortized), so the total still grows with n rather than n².
4. Set D had 374 collisions, but the longest chain was only 3, because the table resized every time the load factor went over 0.7. This shows that collisions are not a problem as long as the chains are kept short.
5. Python's `dict` is faster than ours, about 28 to 29 times for lookup and delete and about 53 times for insert. `dict` resizes itself in C, while ours rehashes one item at a time in Python. Both are O(1), though, so they differ only by a constant factor and grow at the same rate.

The measured times change slightly every time the code is run, but the order of which method is faster stays the same.

## 1.8 Flowcharts

The flowcharts are in `docs/data-course/flowcharts/` as both draw.io and PDF files. The PDFs are also in the team's Drive folder: https://drive.google.com/drive/folders/1r2B5_h15vtCjMgca2rhnYVqcbX1wulWY

1. `flow_kim_1_overview`: an overview of the system, where every command goes through the hash index first
2. `flow_kim_2_insert`: adding an item, including what happens on a collision and when the table resizes
3. `flow_kim_3_delete_return`: removing an item with swap-and-pop, and returning an item

## 1.9 Related files

| File | Description |
|---|---|
| `backend-api/algorithms/hash_table.py` | All of the code, using only the standard library |
| `docs/data-course/LEBIS_Final.ipynb` | The combined notebook of all three members, already run. The numbers in this report come from this file. Colab: https://colab.research.google.com/drive/1K3JSlNVuN-mof98pjE09J_nFKhZEmyV8 |
| `docs/data-course/LEBIS_Kim_HashTable.ipynb` | Kim's own notebook, with more detailed explanations. Its numbers come from a different run, so they should not be mixed with this report. |
| `scripts/data-course-hashtable.py` | Script that measures sets A to D locally |
| `scripts/build-notebooks.py` | Builds the notebooks from the actual files in the repository |
