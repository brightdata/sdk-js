# Bright Search: 40-case live catalog

The catalog is adapted from the Python project's `tests/live/bright_search_cases.json`
as inspected on 2026-11-12. Its source hash and the adaptations are recorded in the
JSON file. The runner exercises the built JavaScript SDK with fake transport only
during preflight, and the real public client when explicitly run with `--live`.
Both paths use `search.business.companies()`, `search.business.people()`, and
`search.ecommerce.products()`, matching the Python namespace grouping.

| Group | Cases | HTTP attempts in one complete pass |
| --- | ---: | ---: |
| smoke | 7 | 7 |
| edge | 5 | 4 |
| extended | 28 | 23 |
| All | **40** | **34** |

The forty cases contain thirty expected successful pages, four expected HTTP 400
responses and six local validation cases. Local-negative cases have HTTP dispatch
blocked, so a validation regression fails without sending a request. Other cases
enforce the expected endpoint, POST and the SDK's single-attempt policy before
dispatch. The hard request cap defaults to forty; no retry or repeat loop exists.

## Differences from Python

- The three Python synchronous cases exercise the CommonJS client in JavaScript.
  Other cases use ESM. This SDK exposes asynchronous JavaScript methods.
- The 201-character natural-language query expects a remote HTTP 400 here. The
  JavaScript SDK forwards strings unchanged because the guide does not define a
  Unicode counting unit. This adds one HTTP attempt versus Python's 33.
- The catalog's `ecommerce` category calls `client.search.ecommerce.products()`, which targets
  `/search/ecommerce`; its default source is `retail_products_live`.
- HTTP 400 is an SDK `ValidationError` with HTTP context. The runner distinguishes
  that remote error from a local `ValidationError` with no response context.

The current [pagination contract](https://docs.brightdata.com/products/business-search/pagination)
requires `offset + limit <= 100` for Instant and Smart. Ludicrous allows offset
1000 and limit 100. Those valid boundaries and their invalid combinations are in
the catalog. Source/endpoint changes also have evidence in the Python project's
November 11 reports: the older E-commerce cases failed with HTTP 400, followed by
successful `/search/ecommerce` cases returning `retail_products_live`.

## Run

Use a Node patch supported by the installed Undici (the implementation was checked
on Node 22.23.4), and build first:

```sh
npm run build
node tests/live/run-bright-search.mjs
```

The second command validates and previews all forty cases without constructing an
authenticated client or making HTTP calls. Build smoke tests use localhost only.

Run one complete live pass using the SDK's normal environment/CLI credentials:

```sh
node tests/live/run-bright-search.mjs --live --max-requests 40 --keep-going
```

`--keep-going` records later scenarios after unexpected contract/server failures.
Authentication failures (401/403) and rate limits (429) always stop the run. There
is no retry. Without `--keep-going`, the first unexpected failure stops it.
The maximum applies to HTTP dispatch attempts, including attempts with an ambiguous
network outcome, not only observed responses. Calls are sequential, with 500 ms
between them. Debug/benchmark controls and unrelated SDK services are excluded.

Use `--group smoke`, `--group edge`, `--group extended`, or repeated `--case ID`
arguments for a subset. `--timeout-ms` defaults to 30000 and `--delay-ms` to 500.
Each invocation is a new run with a new budget; running subsets and then the full
catalog makes additional requests.

## Results

Reports are written to a new timestamped file in `tests/live/results/` (ignored by
Git), or a new `--output PATH`. Existing reports are never overwritten. A report
is checkpointed after every case and at shutdown, including failures. It contains
request IDs, statuses, latency, returned field names, counts, coverage, paging,
case definitions, configuration hash and SDK/Git/runtime metadata. It omits entity
records and redacts the configured API token from strings before saving.

Counts distinguish forty selected cases from dispatched requests, observed HTTP
responses and local validation passes. Empty pages and partial coverage stay
visible. Missing projected fields produce an unqualified note; failed minimum
record expectations are failures. Case timings include network, provider work and
SDK handling; forty different cases are not forty samples of one latency metric.
No percentile, SLA, fixed records or stable cross-page ordering is claimed.

The twelve existing optional integration tests in `tests/integration/` cover five
SERP, four Web Unlocker and three Crawler scenarios. They remain separate: replacing
them with Bright Search cases would remove coverage for those other features.
The ordinary `npm test` run does not execute this live runner.
