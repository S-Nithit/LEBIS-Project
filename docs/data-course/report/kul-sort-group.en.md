# Part 3: Sorting and Grouping with Merge Sort (Kul)

*Written by Kul, translated from the Thai original (`kul-sort-group.md`) for this report. The timing numbers come from sections 4 and 5 of `LEBIS_Final.ipynb`.*

## 3.1 The process chosen

A rental shop with one to three staff also asks questions that Parts 1 and 2 do not answer. These are questions about the stock as a whole:

- "Which rental has been out the longest?" The rentals need to be sorted by due date.
- "Which item is running low and should be restocked first?" The items need to be sorted by how many are available.
- "Which cameras does the shop have, and which lenses?" The items need to be separated by category.
- "What is broken at the moment?" The items need to be separated by status.

This part therefore covers the Sorting and Grouping algorithm groups. Which one we use depends on the kind of field:

| Field | Kind of value | What we do | Why |
|---|---|---|---|
| `due_date` | A date, so one comes before another | Sort | "Out the longest" means the smallest value, so order matters |
| `available` | A whole number | Sort | "Running low" means the smallest value, so order matters |
| `category` | A label, such as camera or lens | Group | A camera does not come before or after a lens. There is no order, the items only need to be kept together |
| `status` | A label: `ok`, `out` or `broken` | Group | Same as above. We want to know what is in each status, not which status comes first |

The algorithm written by hand in this part is merge sort. Python's `sorted()` and `.sort()` are not used to do the work. Bubble sort is also included as a comparison, to show how far apart O(n²) and O(n log n) are as the data grows, and `sorted()` is only used as a baseline.

## 3.2 Data structure

The input is the same 8-field record used by the whole team:

`code`, `name`, `category`, `total`, `available`, `borrower`, `due_date`, `status`

| Function | Takes | Returns |
|---|---|---|
| `bubble_sort`, `merge_sort` | A list of records and a `key` function, like `sorted()` | A new sorted list |
| `sort_by_due_date`, `sort_by_available` | A list of records | A new sorted list |
| `group_by_type`, `group_by_status` | A list of records | A `dict` whose keys are category or status names and whose values are lists of the records in each group |

The functions always return a new list and never change the original, because someone else might be holding the same list. This is the same approach as `sort_by_code` in Neo's `search.py`. It also means the three methods can be timed on the same list, since the first method does not leave the data already sorted and give the next method an unfair advantage.

The file only imports the Python standard library and does not import any other team member's file. All data is passed in as parameters, so the same file runs both in the web application and in Google Colab.

## 3.3 Sorting

### Merge sort: split in half, then merge

```
merge_sort(items, key):
    if len(items) ≤ 1:  return list(items)       ← one item is always sorted (base case)
    middle = len(items) // 2
    left  = merge_sort(items[:middle], key)      ← sort the left half
    right = merge_sort(items[middle:], key)      ← sort the right half
    return _merge(left, right, key)
```

`_merge` combines two sorted lists into one list that is still sorted. It compares the first remaining item on each side and takes the smaller one. When one side runs out, whatever is left on the other side is already in order, so it can be added to the end as it is.

```
i = j = 0, merged = []
while i < len(left) and j < len(right):
    if key(left[i]) <= key(right[j]):   take left[i],  then i += 1
    otherwise:                          take right[j], then j += 1
add left[i:] and right[j:] to the end of merged
```

We wrote it with recursion because splitting in half again and again fits that style naturally. The recursion goes about log₂(n) levels deep, which is about 10 levels for 1,000 records, so there is no risk of a stack overflow.

### Stable sort: why `<=` and not `<`

A sort is stable if items with equal values stay in the same order they were in before sorting.

In `_merge`, the left side always holds the items that came first in the original data. When two values are equal, `<=` takes the item from the left side first, so the original order is kept. If we wrote `<` instead, the right item would be taken first and equal items would swap places for no reason. This one character is what makes our merge sort stable.

In the real system this means rentals due on the same day stay in the order the database returned them (by id), instead of changing places every time the page is opened. `verify()` in the file tests this with equal values and compares the result with `sorted()`, which is stable.

`bubble_sort` is also stable, because it only swaps when the first item is greater than the next one (`>`). Equal values are never swapped.

### Bubble sort: the comparison

```
result = list(items)                       ← copy the list first, so the original is not changed
for each round round_index = 0 … n−1:
    swapped = False
    for i = 0 … n − round_index − 2:
        if key(result[i]) > key(result[i+1]):  swap them, then swapped = True
    if nothing was swapped in this round:  stop    ← the list is already sorted
```

In each round the largest remaining value moves to the end, so the next round can stop one item earlier. Because it stops as soon as a round makes no swaps, data that is already sorted finishes after one round.

### Functions the system calls

| Function | What it does |
|---|---|
| `sort_by_due_date(items)` | Removes records whose `due_date` is `None`, then calls `merge_sort` with `key = due_date`, smallest first. The rental that has been out the longest (the oldest date) ends up at the top |
| `sort_by_available(items)` | The same `merge_sort` with `key = available`. The item with the fewest units left ends up at the top |

`sort_by_due_date` has to remove `None` values first. An item nobody has rented has no due date to sort by, and Python cannot compare `None` with a string (it raises `TypeError` straight away). The result therefore only contains rentals that have a due date, which is 685 of the 1,000 records in set D.

`due_date` is stored as text in the form `YYYY-MM-DD`. Sorted as text, this gives the same order as the real dates (year, then month, then day), so the dates can be compared with `<=` directly without converting them first.

## 3.4 Grouping

Both grouping functions go through the data once and put each record into a bucket according to its key.

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
| Are the keys known in advance? | No. A new key is created the first time a category appears (`setdefault`) | Yes. There are only 3 statuses, all created at the start |
| Keys returned | Only the categories that actually appear in the data | Always all 3 keys, even if a group is empty |
| Unknown values | (not applicable) | Skipped, so nothing breaks |

`group_by_status` always returns all 3 keys for the same reason as Neo's `count_by_status`: code that uses the result does not have to guard every access with `.get()`.

The difference from Neo's `count_by_status` is that `count_by_status` only keeps the number of records, while `group_by_status` keeps the records themselves. It is meant for when we need to know what is in each group, not just how many.

We go through the data once instead of searching one category at a time. If we first searched for all the cameras and then searched again for the lenses, we would read the whole data set once for each category. The team's data has 5 categories, so that would mean reading it 5 times, while putting items into buckets reads it only once however many categories there are.

## 3.5 Complexity (Big-O)

Here n is the number of records, m is the number of rentals that have a `due_date`, and k is the number of categories.

| Function | Time (best) | Time (average) | Time (worst) | Extra memory |
|---|---|---|---|---|
| `bubble_sort` | O(n) | O(n²) | O(n²) | O(n), because it copies the list before sorting |
| `merge_sort` | O(n log n) | O(n log n) | O(n log n) | O(n), plus O(log n) for the stack |
| `sort_by_due_date` | O(n + m log m) | O(n + m log m) | O(n + m log m) | O(m) |
| `sort_by_available` | O(n log n) | O(n log n) | O(n log n) | O(n) |
| `group_by_type`, `group_by_status` | O(n) | O(n) | O(n) | O(n) |
| Searching one category at a time (for comparison) | O(n × k) | O(n × k) | O(n × k) | O(n) |

### Merge sort is O(n log n) in every case

- Number of levels: the list is halved each time until one item is left, n → n/2 → n/4 → … → 1, which takes log₂(n) steps.
- Work per level: across one level, all the `_merge` calls together handle each of the n items exactly once, which is O(n).
- In total this gives O(n) per level × log₂(n) levels = O(n log n).
- There is no separate best or worst case because `merge_sort` always splits at `len(items) // 2` and never checks whether the data is already sorted. Sorted data is still split and merged at every level, so the number of levels is always the same.
- Memory is O(n). `_merge` builds a new `merged` list, and `items[:middle]` and `items[middle:]` copy the data into new lists. At any moment, the lists still in use belong to the levels currently in progress, with sizes n/2 + n/4 + …, which add up to only a few times n. The recursion is log₂(n) levels deep, so the stack is O(log n).

### Bubble sort is O(n²) on average and in the worst case, and O(n) in the best case

- Worst case: the first round compares n−1 pairs, the second compares n−2 pairs, and so on. In total that is (n−1) + (n−2) + … + 1 = n(n−1)/2, which is O(n²).
- Best case: if the data is already sorted, the first round compares n−1 pairs without making any swap, so the loop stops straight away. This is O(n). Without this early stop, bubble sort would always run every round and be O(n²) even on sorted data.
- Memory is O(n), not O(1). The textbook version of bubble sort swaps in place and only needs O(1) extra memory. Our version starts with `result = list(items)`, which copies the whole list so the original is not changed, so it uses O(n) extra memory. The swaps after that are done in place on the copy.

### sort_by_due_date is O(n + m log m)

Removing the `None` values with a list comprehension reads all n records, which is O(n), and produces a new list of m rentals, which is O(m) memory. Calling `merge_sort` on those m rentals is O(m log m), so the total is O(n + m log m). When m is close to n this is the same as O(n log n). In set D, m = 685 and n = 1,000.

### Grouping is O(n)

- Time: there is one pass of `for item in items`, and each record takes a constant amount of work, which is finding its bucket in a `dict` (O(1) on average) and calling `append` (O(1) amortized). So n records take O(n), however many categories there are.
- Memory is O(n). Every record goes into a bucket and none are thrown away, apart from unknown statuses in `group_by_status`. The buckets hold references to the original records rather than copies. This is different from Neo's counting functions, which only need O(1).
- Searching one category at a time reads all n records k times, which is O(n × k). With the team's k = 5, that is five times as much reading as the bucket method.

## 3.6 Test data sets

We use the same `make_dataset()` (written by Neo) as the rest of the team. Every set has at least 10 records, as the assignment requires.

| Set | Size | Characteristics | Used to show |
|---|---|---|---|
| A | 10 | Clean data | Every function works |
| B | 12 | Duplicate names, unique codes | Duplicate names make no difference, because names are not used as a key for sorting or grouping |
| C | 10 | 5 of the 10 items are out of stock | Many records have `available = 0`, so there are many equal values |
| D | 1,000 | Large set, with 685 records that have a `due_date` | The Big-O difference as the data grows |

## 3.7 Results

We measured three methods on the same data: bubble sort, our merge sort, and Python's `sorted()` as the baseline. Each method sorts the whole set once by the `available` field (`report_on_datasets` uses `key = item["available"]`), not by `due_date`. Each cell was run 3 times and averaged with `time.perf_counter()`, and the time to prepare the data was not counted. Times are in milliseconds, and "Speed-up" is the bubble sort time divided by the merge sort time.

**Table M1. Sort the whole set once by `available`**

| Set | Bubble sort | Merge sort | `sorted()` | Speed-up |
|---|---:|---:|---:|---:|
| A (10) | 0.011 | 0.013 | 0.001 | 0.9× |
| B (12) | 0.014 | 0.015 | 0.001 | 0.9× |
| C (10) | 0.008 | 0.013 | 0.001 | 0.6× |
| D (1,000) | 90.516 | 2.619 | 0.124 | 34.6× |

`sort_by_due_date`, which the system actually uses, is only called on rentals that have a `due_date` (685 in set D). The notebook does not time this function on its own, so the numbers in Table M1 are for `merge_sort` on the whole set by `available`.

**Table G1. Grouping by category (`group_by_type`): number of records in each group**

The category values in `datasets.py` are stored in Thai. The column headings give their meaning in English.

| Set | Camera | Lens | Tripod | Light | Microphone | Total |
|---|---:|---:|---:|---:|---:|---:|
| A (10) | 2 | 2 | 2 | 2 | 2 | 10 |
| B (12) | 2 | 4 | 2 | 2 | 2 | 12 |
| C (10) | 2 | 2 | 2 | 2 | 2 | 10 |
| D (1,000) | 200 | 200 | 200 | 200 | 200 | 1,000 |

**Table G2. Grouping by status (`group_by_status`): number of records in each group**

| Set | ok | out | broken | Total |
|---|---:|---:|---:|---:|
| A (10) | 9 | 0 | 1 | 10 |
| B (12) | 7 | 4 | 1 | 12 |
| C (10) | 5 | 4 | 1 | 10 |
| D (1,000) | 616 | 242 | 142 | 1,000 |

The figures for sets A to C come from running `group_by_type` and `group_by_status` on `make_dataset()` in the repository (the seeds are fixed, so the result is the same on every run). The figures for set D match section 4 of the notebook.

### Reading the results

1. On the small sets (A to C), bubble sort is about as fast as merge sort or faster (0.9×, 0.9× and 0.6×). Merge sort has some fixed costs at every level: slicing creates new lists, the function calls itself again, and it builds a new `merged` list. With only 10 records, the real work is smaller than these costs, while bubble sort copies the list once and then swaps in place. Big-O describes how the time grows as n gets larger, not which method wins when n is small, so measuring only the small sets would lead to the wrong conclusion.
2. On set D, merge sort is 34.6 times faster than bubble sort (90.516 compared with 2.619 ms). The data grows 100 times from set A to set D. Bubble sort's time grows from 0.011 to 90.516 ms, which is several thousand times. By the n² theory, 100 times more data should take about 10,000 times as long. Merge sort grows from 0.013 to 2.619 ms, which is in the hundreds, below the 300 times that the n log n theory gives. (The times for the small sets are only a few microseconds, so these ratios are rough and only show the general trend.)
3. `sorted()` is the fastest on every set. On set D it takes 0.124 ms, compared with 2.619 ms for our merge sort. `sorted()` uses Timsort, which is written in C, while our merge sort runs every step as a Python loop. Ours also calls `key()` again on every comparison, whereas `sorted()` works out each key only once per record. Both are still O(n log n), so the difference is a constant factor and not a difference in Big-O. They grow at the same rate as the data gets larger.
4. Grouping does not lose or add any records. Set D splits into 5 categories of 200 each, which is 1,000 in total, and by status into 616 + 242 + 142 = 1,000. The status counts are the same as Neo's `count_by_status` from the same run (Table 2 in the notebook) in all three columns. All of this is done in a single pass over the data. Searching one category at a time would need to read the data 5 times to get the same result.

The measured times change slightly every time the code is run, but the order of which method is faster stays the same.

## 3.8 Working together with Neo's and Kim's parts

Section 5 of the notebook answers a question the shop asks every morning: "Which rentals are overdue, and what is each item?" Answering it needs all three parts, one after another. Each step passes a plain list to the next, and none of us imports anyone else's file.

| Step | Who | What it does | Time |
|---|---|---|---|
| 1 | Kul, `sort_by_due_date` | Sorts the rentals by due date | O(n + m log m) |
| 2 | Neo, `find_due_before` | Takes out every rental due before today using binary search | O(log m + k) |
| 3 | Kim, hash table | Looks up the details of each item by its code | O(1) per item |

On set D, 685 rentals are sorted, and 275 of them are overdue before 2026-10-01. These are exactly the same rentals that a one-by-one scan finds. The notebook cell checks this with an `assert`, so it would fail straight away if the two did not match.

Step 1 has to be correct because Neo's binary search only works on a sorted list. It looks at the middle item and throws away half of the list, assuming that every item in that half is on the same side. If our part sorted the list wrongly, the search would cut off the wrong half and return the wrong rentals, and no error would be raised. This is why `verify()` compares `merge_sort` with `sorted()` and checks that `sort_by_due_date` really sorts from smallest to largest.

In the live web application, `services/inventory.py` calls `sort_by_due_date` in `open_borrows()` to sort the rentals that have not been returned yet (the SQL query does not sort them). The sorted list is then used in two places: Neo's `find_due_before` picks the rentals for the 08:00 LINE summary, and Neo's `count_overdue` counts the overdue rentals for the Workspace page. Step 3, the hash table, is only in the notebook and is not used by the web application.

## 3.9 Limitations

- Merge sort does not take advantage of data that is already sorted. It still splits and merges everything in O(n log n), while the Timsort used by `sorted()` can detect parts that are already in order and skip that work.
- It uses O(n) extra memory, because every level creates new lists by slicing and merging. An in-place sort would not need this.
- `key()` is called on every comparison instead of being worked out once and stored, as `sorted()` does. If the key were expensive to compute, the sort would slow down accordingly.
- `due_date` must be in the format `YYYY-MM-DD`. In another format, such as `DD/MM/YYYY`, comparing the text would give the wrong order without any error, and Neo's binary search would then also give wrong results.
- `sort_by_due_date` only returns rentals that have a `due_date`, so the result has m records rather than n. Whoever calls it needs to know that items nobody has rented are not included.
- `group_by_status` skips unknown statuses without any warning. If the data contains a wrong status, the three groups will add up to fewer records than the total and nothing will report it.
- The groups hold references, not copies, so changing a record inside a group also changes the original record.
- `bubble_sort` (only used for comparison), `sort_by_available`, `group_by_type` and `group_by_status` are not used in the live web application yet. They are only used in the notebook. The web application only uses `sort_by_due_date`.
- We do not have timing numbers for grouping or for `sort_by_due_date`, because the notebook only times sorting the whole set by `available` (Table M1).

## 3.10 Flowcharts

The flowcharts are in `docs/data-course/flowcharts/` as both draw.io and PDF files. The PDFs are also in the team's Drive folder: https://drive.google.com/drive/folders/1r2B5_h15vtCjMgca2rhnYVqcbX1wulWY

6. `flow_kul_6_merge_sort.pdf`: merge sort. It checks the base case, splits the list in half and calls itself on both halves, then runs the `_merge` loop that compares the two front items with `<=` (the part that makes it stable) and adds whatever is left. A box at the side shows `sort_by_due_date`, the entry point the system actually calls, which removes `None` values and passes the result to Neo's `find_due_before`.
7. `flow_kul_7_group.pdf`: the two grouping functions side by side. `group_by_type` creates a new key when it meets a new category, and `group_by_status` creates all 3 keys at the start and skips unknown statuses. Both go through the data once.

The English versions used in this report are `flow_kul_6_merge_sort_eng.pdf` and `flow_kul_7_group_eng.pdf`.

## 3.11 Related files

| File | Description |
|---|---|
| `backend-api/algorithms/sort_group.py` | All of the code, using only the standard library. It can be run on its own with `python3 backend-api/algorithms/sort_group.py`, which runs `verify()` first |
| `backend-api/services/inventory.py` | Where the live web application calls `sort_by_due_date` (in `open_borrows()`) |
| `docs/data-course/LEBIS_Final.ipynb` | The combined notebook of all three members, already run. The numbers in this report come from sections 4 and 5 of this file. Colab: https://colab.research.google.com/drive/1K3JSlNVuN-mof98pjE09J_nFKhZEmyV8 |
| `docs/data-course/flowcharts/flow_kul_6_merge_sort.pdf`, `flow_kul_7_group.pdf` | Both flowcharts, each with a matching `.drawio` file |
| `scripts/build-notebooks.py` | Builds the notebooks from the actual files in the repository |
