# Intro to the Codebase — Architecture Walkthrough

Welcome. This is a JavaScript/TypeScript SDK wrapping Bright Data's web-scraping, search, and proxy APIs. You won't need to know the product to read the code — what matters is how the code is put together, and that's what this doc covers.

## 30-second overview

The SDK is organized as five concentric rings. Data and control flow outward from the user to the network:

```
┌────────────────────────────────────────────────────────────┐
│ Facade:           bdclient (src/client.ts)                 │  ← the one public class
├────────────────────────────────────────────────────────────┤
│ Feature surfaces: scrape / search / datasets / discover /  │  ← domain-grouped APIs
│                   scraperStudio / browser / zones          │
├────────────────────────────────────────────────────────────┤
│ Async orchestration: *Job classes + polling + Deadline     │  ← long-running operations
├────────────────────────────────────────────────────────────┤
│ Validation / models: zod schemas + Result classes          │  ← boundary + value objects
├────────────────────────────────────────────────────────────┤
│ Transport:        Transport + RateLimiter + undici         │  ← a single shared HTTP client
└────────────────────────────────────────────────────────────┘
```

Everything the user does goes through the `bdclient` facade, which lazily constructs the feature surfaces. All of those share a single `Transport` instance for HTTP, a single rate-limiter, and a single set of auth headers.

## The main abstractions (the nouns you'll see everywhere)

**`bdclient`** (`src/client.ts`). The only class a user instantiates. It reads options + env vars, builds a `Transport`, and lazily materializes every sub-API on first access via a small `defineLazy` helper. Everything else dangles off properties on this object: `client.scrape.linkedin`, `client.search.google`, `client.datasets.amazonProducts`, `client.discover`, `client.scraperStudio`, `client.browser`, `client.listZones()`.

**`Transport`** (`src/core/transport.ts`). The one true HTTP client. It wraps undici with a connection pool, keep-alive, retry interceptor, DNS caching, optional rate-limiter, and a uniform `classifyError` step that turns undici errors into the SDK's own typed error hierarchy. Everything in the codebase that talks HTTP goes through here — there are no stray `fetch` calls.

**`RateLimiter`** (`src/core/rate-limiter.ts`). A token-bucket with a wait queue. `Transport.request` calls `acquire()` before every outbound request. It's optional (off by default); you opt in via `rateLimit` on the client.

**Feature "routers" and "services"**. Each feature family has a small dispatcher class that the client exposes:
- `ScrapeRouter` (`src/api/scrape/router.ts`) — holds one instance per platform scraper (`linkedin`, `amazon`, `instagram`, `facebook`, `tiktok`, `youtube`, `reddit`, `pinterest`, `digikey`, `chatGPT`, `perplexity`) and one `SnapshotAPI` they all share.
- `SearchRouter` — `google / bing / yandex` methods that all delegate to a single `SearchAPI`.
- `DatasetsClient` — 125+ lazy getters, one per pre-collected dataset.
- `DiscoverService`, `ScraperStudioService`, `BrowserService` — standalone feature services.
- `ZonesAPI` — not a router; just a cached API wrapper.

**`*API` classes** (`src/api/**/*.ts`). The workhorses that actually form requests. They fall into two families:
- `RequestAPI` (in `src/api/unlocker/`) — subclassed by `ScrapeAPI` and `SearchAPI`. Synchronous-style endpoints (`POST /request`). Concurrency for arrays is done with `@supercharge/promise-pool`. The base class defines the flow; subclasses override `getURL` and `getMethod` (template method pattern).
- `BaseAPI` (in `src/api/scrape/`) — subclassed by platform scrapers (`LinkedinAPI`, `AmazonAPI`, …) plus `SnapshotAPI`. Async, dataset-oriented endpoints (`POST /datasets/v3/trigger|scrape`). Platform subclasses mostly just wrap `run()` or `orchestrate()` with typed inputs and a hard-coded `datasetId`.

**`*Job` classes** (`ScrapeJob`, `DiscoverJob`, `ScraperStudioJob`). Value-carrying handles to a long-running server-side task. They all share the same shape: an id + triggered-at timestamp, a `status()` / `wait()` / `fetch()` / `toResult()` method triplet (or equivalent), and internal caching of status + results. They are what you get back when you trigger an async operation without orchestrating it.

**`*Result` classes** (`BaseResult`, `ScrapeResult`, `SearchResult`, `DiscoverResult`). The value objects returned from `job.toResult()`. They never throw — failures land in a `success: false` result with `error`, `status`, and timing fields. They serialize cleanly via `toJSON()` and can `save()` themselves to disk.

**`BaseDataset`** (`src/api/datasets/base.ts`). The abstract parent for all 125 dataset classes. Each concrete subclass is literally 3 lines (a hard-coded `datasetId` + `name`). The base class provides `query()`, `sample()`, `getStatus()`, `download()` against the `/datasets/*` endpoints — a classic repository pattern.

**Zod schemas** (`src/schemas/`). The SDK validates at the boundary. Every public method starts with `assertSchema(...)` calls that turn user input into typed, normalized data. Response parsing uses `parseResponse` against response-shape schemas so the server's contract is checked too. `ValidationError` is the single exception type that emerges from these calls.

**Error hierarchy** (`src/utils/errors.ts`). Everything inherits from `BRDError`. Specializations: `ValidationError`, `AuthenticationError`, `ZoneError`, `NetworkError` → `NetworkTimeoutError`, `TimeoutError`, `FSError`, `APIError` (carries `statusCode`), `DataNotReadyError`. `Transport.classifyError` and `throwInvalidStatus` are the two chokepoints that decide which type to throw.

**`Deadline`** (`src/utils/deadline.ts`). A tiny helper wrapping `start + budget` with `.remaining` and `.expired`. It's used by `*Job.toResult()`-style methods to enforce a total time budget across multiple retry attempts — so race-condition retries don't each reset a fresh timeout.

## How the main flows move through the system

### 1) Simple synchronous scrape (Web Unlocker)

```
client.scrapeUrl(url)
  → assertSchema(URLParamSchema / ScrapeOptionsSchema)
  → ScrapeAPI.handle (extends RequestAPI)
      → optionally ZonesAPI.ensureZone (if autoCreateZones)
      → handleSingle or handleBatch (PromisePool, concurrency=10 default)
          → Transport.request(POST /request, body={url, zone, format, method, …})
              → RateLimiter.acquire()
              → undici.request(…)
              → classifyError on failure
          → assertResponse → parse body as text or JSON
  → string | object | array of either
```

Search (`client.search.google(q)`) is the same pipeline — it just uses a different `*API` subclass (`SearchAPI`) that puts the query into a special URL format.

### 2) Async platform scrape (datasets v3)

```
client.scrape.linkedin.profiles(urls)
  → assertSchema
  → LinkedinAPI.orchestrate(input, DATASET_ID.PROFILE)
      → BaseAPI.run(async: true) → POST /datasets/v3/trigger → { snapshot_id }
      → new ScrapeJob(snapshot_id, snapshotOps)
      → job.toResult({ pollTimeout, pollInterval })
          → Deadline(pollTimeout)
          → wait() → pollUntilReady(snapshot_id, SnapshotAPI.getStatus)
              → GET /datasets/v3/progress/{id} every pollInterval
              → resolves when status === 'ready'
          → fetch() → GET /datasets/v3/snapshot/{id}
              → 202 → throw DataNotReadyError → retry inside toResult()
              → parse as JSON
  → ScrapeResult(success=true, data, rowCount, timing…)
```

Raw `collect*` / `discover*` methods (e.g. `client.scrape.linkedin.collectProfiles`) return earlier — they give you a `ScrapeJob` you orchestrate yourself, or sync-mode data if the server completes before the sync timeout. `orchestrate()` is just the "do it all in one call" convenience.

### 3) Discover (AI-powered search)

```
client.discover(query)
  → DiscoverService.search → _trigger → POST /discover → { task_id }
  → new DiscoverJob(task_id, ops)
  → job.toResult()
      → wait() loops GET /discover?task_id=… every 2s until status === 'done'
      → results come back on the status response itself (no separate fetch endpoint)
  → DiscoverResult(success, data=items, totalResults, durationSeconds)
```

Note the subtle difference vs. ScrapeJob: Discover's "done" comes with the payload attached; there's no separate download call.

### 4) Scraper Studio (DCA)

```
client.scraperStudio.run(collector, { input })
  → POST /dca/trigger_immediate?collector=… → { response_id }
  → new ScraperStudioJob(response_id, transport)
  → job.waitAndFetch()
      → loops GET /dca/get_result?response_id=…
      → 202 → DataNotReadyError → sleep → retry (up to Deadline)
      → 200 → parse JSON array, return
  → collected into RunResult[] with per-input success/error tracking
```

### 5) Pre-collected datasets

```
client.datasets.amazonProducts.query({ asin: 'B0…' })
  → BaseDataset.query → POST /datasets/filter → { snapshot_id }
  → client.datasets.amazonProducts.download(snapshot_id)
      → pollUntilReady loops GET /datasets/snapshots/{id} until ready
      → GET /datasets/snapshots/{id}/download → parse JSON array
```

Note the namespace collision worth understanding early: there are **two different "datasets" systems** here. `client.scrape.*` calls Bright Data's `/datasets/v3/` scraper endpoints (you supply inputs, it runs a collector). `client.datasets.*` calls the separate `/datasets/` pre-collected endpoints (you query a pre-existing dataset). They don't share code beyond the transport.

### 6) Browser API

The odd one out: no HTTP call at all. `client.browser.getConnectUrl({ country })` returns a `wss://…` string you feed into Puppeteer/Playwright, which then establishes the actual connection itself. Credentials come from constructor options or `BRIGHTDATA_BROWSERAPI_*` env vars, validated lazily on first access.

## Design patterns in play

- **Facade** — `bdclient` hides five different feature families behind one friendly object.
- **Layered architecture** — User code → feature services/routers → API classes → Transport → undici. No layer skips downward.
- **Template method** — `RequestAPI` (overrides: `getURL`, `getMethod`) and `BaseAPI.run/orchestrate` (subclasses just call it with their `datasetId`).
- **Repository** — `BaseDataset` with ~125 one-liner subclasses, each a repository for a specific remote dataset.
- **Command + Future (Job)** — `ScrapeJob`, `DiscoverJob`, `ScraperStudioJob`. Triggering returns a handle; the handle exposes poll/fetch/result operations. Each of these also has a convenience `toResult()` method that wraps success and failure into a Result value object.
- **Value object** — `BaseResult` hierarchy. Immutable, serializable, never-throws.
- **Dependency injection (constructor)** — APIs receive `{ transport, zonesAPI?, snapshotOps? }` objects; nothing is a global singleton except the log config.
- **Lazy init** — `defineLazy` on `bdclient` (features built on first access, then replaced with the materialized value), plus cache-on-access in `DatasetsClient`.
- **Boundary validation** — schemas live alongside the code that uses them; every public entry point calls `assertSchema(...)`. Responses also get validated, not just inputs.

## Cross-cutting utilities

- `src/utils/polling.ts` — a shared `pollUntilReady(id, getStatus, opts)` primitive with elapsed/deadline/interval logic and status callbacks.
- `src/utils/logger.ts` — process-level config (`setup(...)`) plus named-logger factory; supports both structured-JSON and pretty output; threshold filtered unless `verbose` is set.
- `src/utils/misc.ts` — `sleep`, `parseJSON`, `parseResponse` (schema-checked), `dropEmptyKeys`, `maskKey`, `isStrArray`.
- `src/utils/files.ts` — saving results, generating filenames, streaming snapshot downloads to disk (`routeDownloadStream` is the undici stream factory).
- `src/utils/constants.ts` — endpoint URLs, retry config, default zones. One place to change the API surface.

## Where the architecture is a bit inconsistent

Be aware of these — they're not bugs, but they'll trip you up if you expect uniformity:

1. **Three slightly different polling implementations.** `ScrapeJob.wait` uses the shared `pollUntilReady` helper (ready/failed/error vocabulary). `DiscoverJob.wait` has its own inline loop (status vocabulary: `done` / `error` / `failed`). `ScraperStudioJob.waitAndFetch` has another inline loop (no separate status endpoint — it just retries `fetch` on 202). Different products, different server contracts, but they never got unified behind one abstraction.

2. **Two ways `Job` classes receive their HTTP dependency.** `ScrapeJob` takes a `SnapshotOperations` interface (to avoid a circular import with `SnapshotAPI`, a fact documented in a code comment). `ScraperStudioJob` takes `Transport` directly. `DiscoverJob` takes a `DiscoverOperations` interface. All three solve the same problem three different ways.

3. **`DatasetsClient` is 125 nearly-identical lazy getters.** It's functional but very repetitive. A factory loop would be more compact, but the current approach preserves static types on every property. Expect to scroll a lot in this file.

4. **Two things called "datasets".** See flow #5 above. The naming overlap (scrape.* uses `/datasets/v3/*`, datasets.* uses `/datasets/*`) is an artifact of the underlying product surface.

5. **Cleanup is belt-and-suspenders.** `Transport` registers a `beforeExit` listener that warns if you forgot to `close()`, *and* supports `Symbol.asyncDispose` for `await using`. Both code paths work; they coexist.

6. **Browser API is newly added and narrow.** `src/api/browser/service.ts` only builds a connection URL — no HTTP, no jobs, no results. It's structurally different from every other feature family. (Treat it as a seed, not a pattern.)

## Good first places to read, in order

1. `src/client.ts` — see the lazy wiring and how everything hangs off `bdclient`.
2. `src/core/transport.ts` — understand how every HTTP call is actually made.
3. `src/api/unlocker/request.ts` + `src/api/unlocker/scrape.ts` — the simplest end-to-end flow.
4. `src/api/scrape/base.ts` + `src/api/scrape/job.ts` + `src/api/scrape/snapshot.ts` + `src/api/scrape/linkedin.ts` — the async-job flow, in four concise files.
5. `src/utils/polling.ts` + `src/utils/deadline.ts` + `src/models/result.ts` — the shared vocabulary for async work.
6. `src/schemas/` — skim, don't read. Know the pattern (`assertSchema(SomeSchema, input, label)` at every public entry point); come back when you need a specific one.
7. `src/api/datasets/base.ts` — then `client.ts` and one platform file. That's the whole pre-collected datasets story.

Skip `src/api/datasets/client.ts` and `src/api/datasets/platforms/*` until you need to add or change a dataset — they're extremely formulaic.
