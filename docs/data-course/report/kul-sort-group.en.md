# Part 3 — Sorting and Grouping with a Hand-Written Merge Sort (Kul)

> English translation of `kul-sort-group.md`, Kul's section. The content, analysis and numbers are Kul's; only the language has changed.
> Every timing number comes from `LEBIS_Final.ipynb` (the combined notebook of all three members), sections 4 and 5, committed in the repository — the same file linked from Colab.

## 3.1 The process chosen

A rental shop with one to three staff asks another kind of question that Parts 1 and 2 do not answer: questions about the stock **as a whole**.

- *"Which rental has been out the longest?"* — rentals have to be sorted by due date.
- *"Which item is running low and needs restocking first?"* — items have to be sorted by how many are available.
- *"Which cameras does the shop have? Which lenses?"* — items have to be separated by category.
- *"What is broken right now?"* — items have to be separated by status.

This part therefore chooses the **Sorting** and **Grouping** algorithm groups, split by the kind of field.

| Field | Kind of value | What is done | Why |
|---|---|---|---|
| `due_date` | A date — one comes before another | **Sort** | "Out the longest" is the smallest value, so order matters |
| `available` | A whole number — more or fewer | **Sort** | "Running low" is the smallest value, so order matters |
| `category` | A label, such as camera · lens | **Group** | A camera does not come before or after a lens; there is no order to sort by, the items only need to be kept together |
| `status` | A label: `ok` · `out` · `broken` | **Group** | The same — the question is what each status contains, not which status comes first |

The hand-written algorithm in this part is **merge sort**; Python's `sorted()` and `.sort()` are not used to do the work.
**Bubble sort** is written as a comparison, to show how far apart O(n²) and O(n log n) are as the data grows.
`sorted()` is used only as a comparison (baseline).

## 3.2 Data structure

The input is the same 8-field record used by the whole team.

`code` · `name` · `category` · `total` · `available` · `borrower` · `due_date` · `status`

| Function | Takes | Returns |
|---|---|---|
| `bubble_sort` · `merge_sort` | A list of records and a `key` function, as `sorted()` does | **A new list**, sorted |
| `sort_by_due_date` · `sort_by_available` | A list of records | A new list, sorted |
| `group_by_type` · `group_by_status` | A list of records | A `dict` — the keys are category or status names, the values are lists of the records in that group |

**A new list is always returned and the original is never changed**, because someone else may hold the same list
(the same as `sort_by_code` in Neo's `search.py`). This also allows the three methods to be timed on one list:
the first method does not leave the data sorted and give the next one an advantage.

The file imports only the Python standard library and no team member's file; all data comes in through parameters.
The same file therefore runs both in the live web application and in Google Colab.

## 3.3 Sorting

### Merge sort — split in half, then merge

```
merge_sort(items, key):
    if len(items) ≤ 1:  return list(items)       ← a single item is always sorted (base case)
    middle = len(items) // 2
    left  = merge_sort(items[:middle], key)      ← call itself on the left half
    right = merge_sort(items[middle:], key)      ← call itself on the right half
    return _merge(left, right, key)
```

`_merge` combines two sorted lists into one list that is still sorted. It compares the front item of each side
and takes the smaller one first. When one side runs out, the rest of the other side is already sorted, so it is appended as it is.

```
i = j = 0 · merged = []
while i < len(left) and j < len(right):
    if key(left[i]) <= key(right[j]):   take left[i],  then i += 1
    otherwise:                          take right[j], then j += 1
append left[i:] and right[j:] to merged
```

It is written as recursion because repeated halving fits that form naturally.
The depth is about log₂(n) levels — about 10 levels for 1,000 records, so there is no risk of stack overflow.

### Stable sort — why `<=` and not `<`

A stable sort is one where **items with equal values stay in their original order**.

In `_merge`, the left side always holds the items that came first in the original data. When the values are equal, `<=` takes the left item first,
so the original order is kept. With `<`, the right item would be taken first, and equal items would swap places for no reason.
This single character is the one thing that makes this merge sort stable.

The effect in the real system: rentals due on the same day stay in the order the database returned them (by id),
instead of swapping around every time the page is opened. `verify()` in the file checks this with equal values
and compares the result with `sorted()`, which is stable.

`bubble_sort` is stable as well, because it swaps only when the first item is **greater** than the next (`>`); equal values are not swapped.

### Bubble sort — the comparison

```
result = list(items)                       ← copy the list first; the original is not changed
for each round round_index = 0 … n−1:
    swapped = False
    for i = 0 … n − round_index − 2:
        if key(result[i]) > key(result[i+1]):  swap, then swapped = True
    if no swap happened in this round:  stop    ← already sorted; no need to continue
```

In each round the largest remaining value moves to the end, so the next round is one item shorter.
Stopping when no swap happens means data that is already sorted finishes in one round.

### Functions the system calls

| Function | What it does |
|---|---|
| `sort_by_due_date(items)` | Removes records whose `due_date` is `None`, then calls `merge_sort` with `key = due_date`, smallest first, so the rental out the longest (the oldest date) is at the top |
| `sort_by_available(items)` | The same `merge_sort`, with only `key = available` changed; the item with the fewest left is at the top |

Why `sort_by_due_date` has to remove `None`: an item nobody has rented has no due date to sort by in the first place,
and Python cannot compare `None` with text (it raises `TypeError` at once).
The result therefore contains only rentals that have a due date — **685 of the 1,000 records** in set D.

`due_date` is stored as text in the form `YYYY-MM-DD`, which sorts as text in the same order as the real dates
(year first, then month, then day), so it can be compared with `<=` directly, without converting it to a date first.

## 3.4 Grouping

Both functions pass over the data **once** and drop each record into a bucket by its key.

```
group_by_type(items):
    groups = {}
    for each item:
        groups.setdefault(category, []).append(item)
    return groups

group_by_status(items):
    groups = {"ok": [], "out": [], "broken": []}
    for each item:
        if status is in groups:  groups[status].append(item)
    return groups
```

| | `group_by_type` | `group_by_status` |
|---|---|---|
| Keys known in advance? | No — a new key is created as soon as a new category appears (`setdefault`) | Yes — there are only 3 statuses, all created up front |
| Keys returned | Only the categories actually found in the data | Always all 3 keys, even if a group is empty |
| Unknown values | — | Skipped; nothing breaks |

`group_by_status` always returns all 3 keys, for the same reason as Neo's `count_by_status`:
code that uses the result does not have to guard every access with `.get()`.

It differs from Neo's `count_by_status` in that the latter keeps only **counts**, while `group_by_status` keeps **whole records**.
It is used when the question is "what is there", not just "how many".

**Why one pass, not a search per category** — searching only for cameras first, then searching again for lenses,
reads the whole data again once per category. The team's data has 5 categories, so it would be read 5 times.
The bucket method reads it once, however many categories there are.

## 3.5 Complexity (Big-O)

n = number of records · m = number of rentals with a `due_date` · k = number of categories

| Function | Time, best | Time, average | Time, worst | Extra memory |
|---|---|---|---|---|
| `bubble_sort` | O(n) | O(n²) | O(n²) | **O(n)** — copies the list before sorting |
| `merge_sort` | O(n log n) | O(n log n) | O(n log n) | O(n) + stack O(log n) |
| `sort_by_due_date` | O(n + m log m) | O(n + m log m) | O(n + m log m) | O(m) |
| `sort_by_available` | O(n log n) | O(n log n) | O(n log n) | O(n) |
| `group_by_type` · `group_by_status` | O(n) | O(n) | O(n) | O(n) |
| Searching one category at a time (comparison) | O(n × k) | O(n × k) | O(n × k) | O(n) |

### Merge sort — O(n log n) in every case

- **How many levels** — halving every time until one item is left, n → n/2 → n/4 → … → 1, takes log₂(n) steps.
- **Work per level** — at one level, all the `_merge` calls together take each of the n items exactly once = O(n).
- **Total** — O(n) per level × log₂(n) levels = **O(n log n)**.
- **Why there is no best or worst case** — `merge_sort` always splits at `len(items) // 2` and never checks whether the data is already sorted.
  Sorted data is still split and merged at every level, so the number of levels is the same in every case.
- **Memory O(n)** — `_merge` creates a new `merged` list, and `items[:middle]` · `items[middle:]` copy the data into new lists.
  At any moment, the lists still in use belong to the levels nested at that point, of sizes n/2 + n/4 + …, which add up to only a few times n,
  so the memory is O(n). The recursion is nested log₂(n) levels deep, a stack of O(log n).

### Bubble sort — O(n²) average and worst, O(n) best

- **Worst** — round 1 compares n−1 pairs, round 2 compares n−2 pairs … in total (n−1) + (n−2) + … + 1 = n(n−1)/2 = **O(n²)**.
- **Best** — when the data is already sorted, the first round compares n−1 pairs with no swap at all, the stop condition triggers, and it ends = **O(n)**.
  Without this stop condition, bubble sort would always run every round, O(n²) even on sorted data.
- **Memory O(n), not O(1)** — textbook bubble sort swaps in place and needs O(1) extra memory,
  but the version in this code starts with `result = list(items)`, copying the whole list first so the original is not changed, so it uses **O(n)** extra memory.
  The swaps after that happen in place on the copy.

### sort_by_due_date — O(n + m log m)

Removing `None` with a list comprehension reads all n records = O(n) and produces a new list of m rentals = O(m) memory.
Calling `merge_sort` on the m rentals = O(m log m), giving **O(n + m log m)** in total.
When m is close to n this is O(n log n) — set D has m = 685 out of n = 1,000.

### Grouping — O(n)

- **Time** — one pass of `for item in items`, with constant work per record: finding the bucket in a `dict` (O(1) on average) and `append` (O(1) amortized).
  n records therefore take **O(n)**, whatever the number of categories.
- **Memory O(n)** — every record goes into some bucket and none is discarded (except unknown statuses in `group_by_status`).
  The buckets hold **references** to the original records, not copies — unlike Neo's counting, which uses O(1).
- **Searching one category at a time** — reads all n records k times = **O(n × k)**. With the team's k = 5, that is 5 times the reading of the bucket method.

## 3.6 Test data sets

The same `make_dataset()` by Neo is used across the team. Every set has at least 10 records, as the assignment requires.

| Set | Size | Characteristics | Used to prove |
|---|---|---|---|
| A | 10 | Clean data | Every function works |
| B | 12 | Duplicate names, unique codes | Duplicate names make no difference, because names are not used as a key for sorting or grouping |
| C | 10 | 5 of 10 items out of stock | Many records share `available = 0` — the case with many equal values |
| D | 1,000 | Large set · 685 records with a `due_date` | The Big-O difference as data grows |

## 3.7 Results

Three methods are measured on the same data — bubble sort, the hand-written merge sort, and Python's `sorted()` (the baseline).
**Each method sorts the whole set once by the `available` field** (`report_on_datasets` uses `key = item["available"]`), not by `due_date`.
Each cell is run 3 times and averaged with `time.perf_counter()`; time spent preparing data is excluded.
Times are in milliseconds · "Speed-up" = bubble sort time ÷ merge sort time.

**Table M1 — Sort the whole set once by `available`**

| Set | Bubble sort | Merge sort | `sorted()` | Speed-up |
|---|---:|---:|---:|---:|
| A (10) | 0.011 | 0.013 | 0.001 | 0.9× |
| B (12) | 0.014 | 0.015 | 0.001 | 0.9× |
| C (10) | 0.008 | 0.013 | 0.001 | 0.6× |
| D (1,000) | 90.516 | 2.619 | 0.124 | **34.6×** |

`sort_by_due_date`, which the system really uses, is called only on rentals that have a `due_date` (685 in set D).
The notebook does not time this function separately, so the numbers in Table M1 are the time of `merge_sort` on the whole set by `available`.

**Table G1 — Grouping by category (`group_by_type`): number of records in each group**

The category values are stored in Thai in `datasets.py`; the column headings give their English meaning.

| Set | Camera | Lens | Tripod | Light | Microphone | Total |
|---|---:|---:|---:|---:|---:|---:|
| A (10) | 2 | 2 | 2 | 2 | 2 | 10 |
| B (12) | 2 | 4 | 2 | 2 | 2 | 12 |
| C (10) | 2 | 2 | 2 | 2 | 2 | 10 |
| D (1,000) | 200 | 200 | 200 | 200 | 200 | 1,000 |

**Table G2 — Grouping by status (`group_by_status`): number of records in each group**

| Set | ok | out | broken | Total |
|---|---:|---:|---:|---:|
| A (10) | 9 | 0 | 1 | 10 |
| B (12) | 7 | 4 | 1 | 12 |
| C (10) | 5 | 4 | 1 | 10 |
| D (1,000) | 616 | 242 | 142 | 1,000 |

> Sets A–C come from running `group_by_type` / `group_by_status` on `make_dataset()` in the repository (fixed seeds, the same result on every run) · set D matches section 4 of the notebook.

### Reading the results

1. **On the small sets (A–C) bubble sort is faster than or about the same as merge sort** (0.9× · 0.9× · 0.6×).
   Merge sort has a fixed cost at every level — slicing creates new lists, it calls itself again, and it creates a new `merged` list.
   At 10 records the real work is smaller than these costs, while bubble sort copies the list once and then swaps in place.
   Big-O describes behaviour as n grows; it does not say who wins at small n. Measuring only the small sets would lead to the wrong conclusion.
2. **On set D merge sort is 34.6 times faster than bubble sort** (90.516 against 2.619 ms).
   The data grows 100 times from set A. Bubble sort's time grows from 0.011 to 90.516 ms — several thousand times;
   by the n² theory, data that grows 100 times should take about 10,000 times as long.
   Merge sort grows from 0.013 to 2.619 ms — in the hundreds, below the 300 times that the n log n theory gives.
   (The small sets' times are in microseconds, so these ratios are rough and show only the trend.)
3. **`sorted()` is the fastest on every set** — on set D it takes 0.124 ms against 2.619 ms for the hand-written merge sort.
   `sorted()` is Timsort written in C, while our merge sort runs every step as a Python loop
   and calls `key()` again on every comparison, whereas `sorted()` computes each key once per record.
   Both are O(n log n), however; the difference is a **constant factor, not Big-O** — they grow at the same rate as the data grows.
4. **Grouping loses no records and adds none** — set D splits into 5 categories of 200 each, 1,000 in total,
   and by status into 616 + 242 + 142 = 1,000, every record accounted for.
   The status counts match Neo's `count_by_status` from the same run (Table 2 in the notebook) in all three columns.
   All of this comes from a single pass over the data; searching one category at a time would read the data 5 times for the same result.

The measured times vary with the machine on every run, but the order of which method is faster does not change.

## 3.8 Working with Neo's and Kim's parts

Section 5 of the notebook answers the question the shop asks every morning: **"Which rentals are overdue, and what is each item?"**
It needs all three parts in sequence. Each step passes a plain list to the next, and nobody imports anyone else's file.

| Step | Who | What it does | Time |
|---|---|---|---|
| 1 | Kul — `sort_by_due_date` | Sorts the rentals by due date | O(n + m log m) |
| 2 | Neo — `find_due_before` | Cuts out every rental due before today with binary search | O(log m + k) |
| 3 | Kim — hash table | Looks up each item's details by its code | O(1) per item |

Result on set D: **685 rentals** sorted · **275 overdue before 2026-10-01, exactly the same rentals as a one-by-one scan**
(the cell checks this with an `assert` and fails immediately if they differ).

**Why step 1 must be right** — Neo's binary search works only on a sorted list.
It looks at the middle item and discards half, trusting that every item in that half is on the same side.
If this part sorted wrongly, the halving would cut the wrong side and return the wrong rentals **with no error at all**.
This is why `verify()` compares `merge_sort` with `sorted()` and checks that `sort_by_due_date` really sorts smallest first.

**In the live web application** — `services/inventory.py` calls `sort_by_due_date` in `open_borrows()` to sort the rentals not yet returned
(the SQL does not sort them). The sorted list is then used in two places: Neo's `find_due_before` picks the rentals for the 08:00 LINE summary,
and Neo's `count_overdue` counts the overdue rentals for the Workspace page. Step 3 (the hash table) is in the notebook, not in the web application.

## 3.9 Limitations

- **Merge sort does not adapt to the data** — data that is already sorted is still split and merged in full, O(n log n),
  unlike the Timsort in `sorted()`, which detects runs that are already sorted and skips that work.
- **It uses O(n) extra memory** — every level creates new lists by slicing and merging, unlike an in-place sort.
- **`key()` is called on every comparison** instead of being computed once and kept, as `sorted()` does. An expensive key makes it slower accordingly.
- **`due_date` must be in the form `YYYY-MM-DD`** — in another form, such as `DD/MM/YYYY`, comparing the text gives the wrong order
  with no error, and Neo's binary search would then be wrong as well.
- **`sort_by_due_date` returns only rentals with a `due_date`** — the result has m records, not n; the caller must know that items nobody has rented are not in it.
- **`group_by_status` silently skips unknown statuses** — if the data has a wrong status, the three groups add up to fewer than the total, with no warning.
- **Groups hold references, not copies** — changing a record in a group changes the original record too.
- **Not yet used in the live web application:** `bubble_sort` (for comparison only) · `sort_by_available` · `group_by_type` · `group_by_status`
  — these are used only in the notebook; the web application uses only `sort_by_due_date`.
- **There are no timing numbers for grouping or for `sort_by_due_date`** — the notebook times only sorting the whole set by `available` (Table M1).

## 3.10 Flowcharts

In `docs/data-course/flowcharts/`, as both draw.io and PDF files · the PDFs are also in the team folder: https://drive.google.com/drive/folders/1r2B5_h15vtCjMgca2rhnYVqcbX1wulWY

6. `flow_kul_6_merge_sort.pdf` — merge sort: check the base case → split in half and call itself on both sides →
   the `_merge` loop that compares the two heads with `<=` (the point that makes it stable) → append what is left,
   with a box showing the entry point the system really calls, `sort_by_due_date` (remove `None`, then hand the result to Neo's `find_due_before`).
7. `flow_kul_7_group.pdf` — the two kinds of grouping side by side: `group_by_type`, which creates a new key when it meets a new category,
   and `group_by_status`, which creates all 3 keys up front and skips unknown statuses. Both pass over the data once.

The English versions used in this report are `flow_kul_6_merge_sort_eng.pdf` and `flow_kul_7_group_eng.pdf`.

## 3.11 Related files

| File | What it is |
|---|---|
| `backend-api/algorithms/sort_group.py` | All the code; standard library only · runs on its own with `python3 backend-api/algorithms/sort_group.py` (runs `verify()` first every time) |
| `backend-api/services/inventory.py` | Where the live web application calls `sort_by_due_date` (`open_borrows()`) |
| `docs/data-course/LEBIS_Final.ipynb` | The combined, already-run notebook of all three members — the numbers in this report come from this file (sections 4 and 5) · **Colab:** https://colab.research.google.com/drive/1K3JSlNVuN-mof98pjE09J_nFKhZEmyV8 |
| `docs/data-course/flowcharts/flow_kul_6_merge_sort.pdf` · `flow_kul_7_group.pdf` | Both flowcharts (each with a matching `.drawio` file) |
| `scripts/build-notebooks.py` | Builds the notebooks from the real files in the repository |
