# Introduction

This report was put together by Neo from the three parts written by each member. All the numbers in it come from a single run of `LEBIS_Final.ipynb`, the notebook that combines everyone's code.

## The system these algorithms serve

LEBIS is a borrow-and-return system for small equipment rental shops, for example a camera rental shop run by one to three people. It is deployed at <https://lebis-project.vercel.app>.

A shop like this asks the same few questions every day, and each question suits a different data structure. In this report we look at which structure fits which question, and why.

| Question from the shop | Algorithm group | Author | Part |
|---|---|---|---|
| "Is camera CAM-0012 available?", adding new stock, removing stock | Inserting, Deleting | Kim (hash table) | 1 |
| "The lens I rented before", "How many are free and how many are overdue?", "What is due back before date X?" | Searching, Counting | Neo (binary search) | 2 |
| "Which rental has been out the longest?", "What is in each category?" | Sorting, Grouping | Kul (merge sort) | 3 |

Each of us implemented the main algorithm by hand. Python's `dict`, `bisect` and `sorted()` are not used to do the actual work. We only use them as baselines, to check that our results are correct and to compare speed.

All the code is in `backend-api/algorithms/` and imports only the Python standard library, so the same files run in the web application and in Google Colab without any changes.

## The shared data sets

All three parts are measured on the same data from `make_dataset()` in `datasets.py`, so the results can be compared across parts. The data is generated from fixed seeds instead of new random values, and the reference date is fixed at `TODAY = 2026-10-01`, so every run produces exactly the same data.

| Set | Size | Duplicate names | Out of stock | Overdue | Broken | Purpose |
|---|---:|---:|---:|---:|---:|---|
| A | 10 | 0 | 1 | 3 | 1 | Check that every function works in the normal case |
| B | 12 | 6 | 5 | 4 | 1 | Duplicate names: search by code must return the right item, and search by name must return every match |
| C | 10 | 0 | 5 | 4 | 1 | Many items out of stock, to test status and counting at the edges |
| D | 1,000 | 0 | 288 | 275 | 142 | Show how the Big-O difference appears when the data is 100 times larger |

Every set has at least 10 records, as the assignment requires. Each record has 8 fields: `code`, `name`, `category`, `total`, `available`, `borrower`, `due_date` and `status`.

## How time was measured

All three parts use the same method: `time.perf_counter()`, run 3 times and averaged. The time spent preparing the data is not included. Times are in milliseconds.

The exact times change a little from run to run depending on the machine, but the order of which method is faster stays the same. This is why every number in the report comes from the same run. We did not mix in numbers from our individual notebooks.

## Google Colab

The combined notebook, with its saved output: <https://colab.research.google.com/drive/1K3JSlNVuN-mof98pjE09J_nFKhZEmyV8>

Please do not press Run all in the shared notebook. The saved output is the run used in this report, and running it again would change the times so they no longer match. To try the code, make a copy first (File > Save a copy in Drive).

## Course requirements

Each algorithm has to include five things. The table shows the section where each one can be found.

| Requirement | Part 1 (Kim) | Part 2 (Neo) | Part 3 (Kul) |
|---|---|---|---|
| Big-O for time and memory, with an explanation | 1.5 | 2.6 | 3.5 |
| Flowchart | 1.8 and Appendix | 2.9 and Appendix | 3.10 and Appendix |
| Real results on sets A to D | 1.7 | 2.8 | 3.7 |
| Time on set D compared with what Python provides | 1.7 (`dict`) | 2.8 (scanning the whole list) | 3.7 (`sorted()`) |
| Colab link | 1.9 | 2.10 | 3.11 |

The Appendix at the end contains all seven flowcharts in figure order.
