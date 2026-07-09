<img width="1300" height="200" alt="sdk-banner(1)" src="https://github.com/user-attachments/assets/c4a7857e-10dd-420b-947a-ed2ea5825cb8" />

<h3>Bright Data JavaScript SDK providing easy and scalable methods for scraping, web search, datasets, and more.</h3>

## Installation [![@latest](https://img.shields.io/npm/v/@brightdata/sdk.svg)](https://www.npmjs.com/package/@brightdata/sdk)

```bash
npm install @brightdata/sdk
```

## Quick start

### 1. [Signup](https://brightdata.com/cp) and get your API token

### 2. Initialize the client

```javascript
import { bdclient } from '@brightdata/sdk';

const client = new bdclient({
    apiKey: '[your_api_token]', // or set BRIGHTDATA_API_TOKEN env variable
});
```

### 3. Launch your first request

```javascript
// Scrape a webpage
const html = await client.scrapeUrl('https://example.com');
console.log(html);

// Search the web
const results = await client.search.google('pizza restaurants', { country: 'us' });
console.log(results);
```

Don't forget to close when done:

```javascript
await client.close();
```

## Features

- **Web Scraping** — Scrape any website using anti-bot detection bypass and proxy support
- **Search Engine Results** — Google, Bing, and Yandex search with batch support
- **Platform Scrapers** — Structured data collection from LinkedIn, Amazon, Instagram, TikTok, YouTube, Reddit, and more
- **Discover API** — AI-powered web search with intent-based relevance ranking
- **Scraper Studio** — Trigger and fetch results from custom scrapers built in Bright Data's Scraper Studio
- **Browser API** — CDP WebSocket URLs for connecting Playwright, Puppeteer, or Selenium to Bright Data's cloud browsers
- **Datasets** — Access 126 pre-built datasets across dozens of platforms with query/download support
- **Parallel Processing** — Concurrent processing for multiple URLs or queries
- **Robust Error Handling** — Typed error classes with retry logic
- **Zone Management** — Automatic zone creation and management
- **Multiple Output Formats** — HTML, JSON, Markdown, and screenshots
- **Dual Build** — Both ESM and CommonJS supported
- **TypeScript** — Fully typed API with overloaded signatures
- **Subpath Exports** — Tree-shakeable imports via `@brightdata/sdk/scrapers`, `@brightdata/sdk/search`, `@brightdata/sdk/datasets`

## Usage

### Scrape websites

```javascript
// Single URL — returns HTML string by default
const html = await client.scrapeUrl('https://example.com');

// Multiple URLs (parallel processing)
const results = await client.scrapeUrl([
    'https://example1.com',
    'https://example2.com',
]);

// Get markdown content
const md = await client.scrapeUrl('https://example.com', {
    dataFormat: 'markdown',
});

// Get structured JSON
const data = await client.scrapeUrl('https://example.com', {
    format: 'json',
});

// Take a screenshot
const screenshot = await client.scrapeUrl('https://example.com', {
    dataFormat: 'screenshot',
});

// Full options
const result = await client.scrapeUrl('https://example.com', {
    format: 'raw',            // 'raw' (default) or 'json'
    dataFormat: 'html',       // 'html' (default), 'markdown' (alias: 'md'), 'screenshot'
    country: 'gb',            // two-letter country code
    method: 'GET',            // HTTP method
});
```

### Search engines

```javascript
// Google search
const results = await client.search.google('pizza restaurants');

// Bing search
const results = await client.search.bing('pizza restaurants');

// Yandex search
const results = await client.search.yandex('pizza restaurants');

// Batch search (parallel)
const results = await client.search.google(['pizza', 'sushi', 'tacos']);

// With options
const results = await client.search.google('pizza', {
    country: 'gb',
    format: 'json',
});
```
> **Note:** If `country` is not specified, requests exit through an arbitrary
> proxy location, so results may be geo-located to an unexpected country.
> Always pass `country` when you need consistent, localized results.

### Platform scrapers

Collect structured data from popular platforms. Each platform supports sync collection (`collect*`) and async orchestrated scraping (trigger, poll, download).

```javascript
// LinkedIn profiles
const data = await client.scrape.linkedin.collectProfiles(
    ['https://www.linkedin.com/in/satyanadella/'],
    { format: 'json' },
);

// Amazon products
const data = await client.scrape.amazon.collectProducts(
    ['https://www.amazon.com/dp/B0D77BX8Y4'],
    { format: 'json' },
);

// Instagram profiles
const data = await client.scrape.instagram.collectProfiles(
    ['https://www.instagram.com/natgeo/'],
    { format: 'json' },
);

// TikTok profiles
const data = await client.scrape.tiktok.collectProfiles(
    ['https://www.tiktok.com/@tiktok'],
    { format: 'json' },
);

// YouTube videos
const data = await client.scrape.youtube.collectVideos(
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    { format: 'json' },
);

// Reddit posts
const data = await client.scrape.reddit.collectPosts(
    ['https://www.reddit.com/r/technology/top/'],
    { format: 'json' },
);
```

**Orchestrated scraping** (async trigger → poll → download):

```javascript
const result = await client.scrape.linkedin.profiles(
    ['https://www.linkedin.com/in/satyanadella/'],
    { pollInterval: 5000, pollTimeout: 180_000 },
);
console.log(result.data);    // structured data
console.log(result.status);  // 'ready'
console.log(result.rowCount);
```

**Available platforms:** `linkedin`, `amazon`, `instagram`, `tiktok`, `youtube`, `reddit`, `facebook`, `pinterest`, `chatGPT`, `digikey`, `perplexity`

### Discover API

AI-powered web search with relevance ranking based on intent.

`discover()` resolves to a `DiscoverResult` wrapper (not a bare array). The items
are on `result.data` (or its alias `result.results`), and the result is iterable.
On failure `result.success` is `false`, `result.error` carries the reason, and
`result.data` / `result.results` stay an empty array — so iterating never throws.

```javascript
// Basic search
const result = await client.discover('artificial intelligence trends 2026');

if (!result.success) {
    console.error('discover failed:', result.error);
} else {
    console.log(result.results); // [{ link, title, description, relevance_score }, ...]
    for (const item of result) {
        console.log(`[${item.relevance_score}] ${item.title}`);
    }
}

// With intent for semantic ranking
const result = await client.discover('Tesla battery technology', {
    intent: 'recent breakthroughs in EV battery chemistry',
});

// With filtering and localization
const result = await client.discover('sustainable fashion brands', {
    intent: 'eco-friendly clothing companies',
    filterKeywords: ['sustainability', 'eco-friendly', 'organic'],
    country: 'us',
    numResults: 10,
});

// Include full page content
const result = await client.discover('python asyncio tutorial', {
    includeContent: true,
    numResults: 3,
});

// Manual trigger/poll/fetch
const job = await client.discoverTrigger('market research SaaS', {
    intent: 'competitor pricing strategies',
});
await job.wait({ timeout: 60_000 });
const data = await job.fetch();
```

### Scraper Studio

Trigger and fetch results from your custom scrapers built in [Scraper Studio](https://brightdata.com/cp/data_collector).

```javascript
// Orchestrated — trigger + poll + return results
const results = await client.scraperStudio.run('c_your_collector_id', {
    input: { url: 'https://example.com/product/1' },
});
// results: RunResult[] — one per input with { input, data, error, responseId, elapsedMs }

// Multiple inputs (processed sequentially)
const results = await client.scraperStudio.run('c_your_collector_id', {
    input: [
        { url: 'https://example.com/product/1' },
        { url: 'https://example.com/product/2' },
    ],
});

// Manual control — trigger, then poll yourself
const job = await client.scraperStudio.trigger('c_your_collector_id', {
    url: 'https://example.com/product/1',
});
const data = await job.waitAndFetch();

// Check job status (by job ID from the dashboard)
const status = await client.scraperStudio.status('j_abc123');
console.log(status.status); // 'queued' | 'running' | 'done' | 'failed'
```

### Browser API

Build CDP WebSocket URLs for connecting Playwright, Puppeteer, or Selenium to Bright Data's cloud browsers. Credentials come from `browserUsername`/`browserPassword` options or `BRIGHTDATA_BROWSERAPI_USERNAME`/`BRIGHTDATA_BROWSERAPI_PASSWORD` env vars.

```javascript
// Get a connection URL
const url = client.browser.getConnectUrl();

// Geo-target the browser with a 2-letter country code
const usUrl = client.browser.getConnectUrl({ country: 'us' });

// Connect with Playwright
import { chromium } from 'playwright';
const browser = await chromium.connectOverCDP(url);
const page = await browser.newPage();
await page.goto('https://example.com');
const html = await page.content();
await browser.close();
```

### Datasets

Access 126 pre-built datasets for querying and downloading structured data snapshots.

```javascript
const ds = client.datasets;

// List all datasets available on your account
const list = await ds.list();

// Get field metadata for a dataset
const meta = await ds.instagramProfiles.getMetadata();
console.log(meta.fields); // [{ name, type, description }, ...]

// Query a dataset (triggers a snapshot)
const snapshotId = await ds.instagramProfiles.query(
    { url: 'https://www.instagram.com/natgeo/' },
    { records_limit: 10 },
);

// Check snapshot status
const status = await ds.instagramProfiles.getStatus(snapshotId);
console.log(status.status); // 'running' | 'ready' | ...

// Download when ready
const rows = await ds.instagramProfiles.download(snapshotId);
```

**Available datasets:**

| Platform | Datasets |
|----------|----------|
| LinkedIn | `linkedinProfiles`, `linkedinCompanies` |
| Amazon | `amazonProducts`, `amazonReviews`, `amazonSellers`, `amazonBestSellers`, `amazonProductsSearch`, `amazonProductsGlobal`, `amazonWalmart` |
| Instagram | `instagramProfiles`, `instagramPosts`, `instagramComments`, `instagramReels` |
| TikTok | `tiktokProfiles`, `tiktokPosts`, `tiktokComments`, `tiktokShop` |
| X/Twitter | `xTwitterPosts`, `xTwitterProfiles` |

### Saving results

```javascript
const data = await client.scrapeUrl('https://example.com');
const filePath = await client.saveResults(data, {
    filename: 'results.json',
    format: 'json',
});
console.log(`Saved to: ${filePath}`);
```

## Configuration

### API Token

Get your API token from [Bright Data Control Panel](https://brightdata.com/cp/setting/users?=).

### Environment Variables

```env
BRIGHTDATA_API_TOKEN=your_api_token                  # BRIGHTDATA_API_KEY also accepted
BRIGHTDATA_WEB_UNLOCKER_ZONE=your_web_unlocker_zone  # Optional
BRIGHTDATA_SERP_ZONE=your_serp_zone                  # Optional
BRIGHTDATA_BROWSERAPI_USERNAME=your_browser_username # Optional, for Browser API
BRIGHTDATA_BROWSERAPI_PASSWORD=your_browser_password # Optional, for Browser API
BRIGHTDATA_VERBOSE=1                                  # Optional, enable verbose logging
```
> **Tip:** When loading these from a `.env` file with `node --env-file=.env`,
> note that variables already set in your shell take precedence over the file.

### Client Options

```javascript
const client = new bdclient({
    apiKey: 'string',           // API token (or use BRIGHTDATA_API_TOKEN env var)
    timeout: 120000,            // Request timeout in ms (1000–300000)
    autoCreateZones: true,      // Auto-create zones if they don't exist
    webUnlockerZone: 'string',  // Custom web unlocker zone name
    serpZone: 'string',         // Custom SERP zone name
    logLevel: 'INFO',           // 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
    structuredLogging: true,    // Use structured JSON logging
    verbose: false,             // Enable verbose logging
    rateLimit: 0,               // Max requests per period (0 = unlimited)
    ratePeriod: 1000,           // Rate limit period in ms
});
```

### Resource Cleanup

The client maintains HTTP connections. Always close when done:

```javascript
await client.close();

// Or use Symbol.asyncDispose (TypeScript 5.2+)
await using client = new bdclient();
```

### Constants

| Constant               | Default  | Description                    |
| ---------------------- | -------- | ------------------------------ |
| `DEFAULT_CONCURRENCY`  | `10`     | Max parallel tasks             |
| `DEFAULT_TIMEOUT`      | `120000` | Request timeout (milliseconds) |
| `MAX_RETRIES`          | `3`      | Retry attempts on failure      |
| `RETRY_BACKOFF_FACTOR` | `1.5`    | Exponential backoff multiplier |

### Zone Management

```javascript
const zones = await client.listZones();
console.log(`Found ${zones.length} zones`);
```

## Subpath Exports

For tree-shaking or importing only what you need:

```javascript
import { ScrapeRouter, LinkedinAPI } from '@brightdata/sdk/scrapers';
import { SearchRouter } from '@brightdata/sdk/search';
import { DatasetsClient, BaseDataset } from '@brightdata/sdk/datasets';
```

## Error Handling

The SDK exports typed error classes that extend `BRDError`:

```javascript
import { bdclient, ValidationError, AuthenticationError, BRDError } from '@brightdata/sdk';

try {
    const result = await client.scrapeUrl('https://example.com');
} catch (error) {
    if (error instanceof ValidationError) {
        console.error('Invalid input:', error.message);
    } else if (error instanceof AuthenticationError) {
        console.error('Auth failed:', error.message);
    } else if (error instanceof BRDError) {
        console.error('SDK error:', error.message);
    }
}
```

**Error types:** `ValidationError`, `AuthenticationError`, `ZoneError`, `NetworkError`, `NetworkTimeoutError`, `TimeoutError`, `APIError`, `DataNotReadyError`, `FSError`

## Troubleshooting

### Windows & corporate networks

| Problem | Fix |
|---|---|
| `npm.ps1 cannot be loaded because running scripts is disabled` (PowerShell) | Use **cmd** instead of PowerShell, or run `npm.cmd <command>`, or run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`. If overridden by Group Policy, contact your IT team. |
| `SELF_SIGNED_CERT_IN_CHAIN` during `npm install` | Your network uses SSL inspection. Point npm to your corporate root certificate: `npm config set cafile "C:\path\to\corporate-root.cer"` |
| Certificate errors at runtime | Set the env variable `NODE_EXTRA_CA_CERTS=C:\path\to\corporate-root.cer` so Node trusts your corporate certificate. |

### AuthenticationError: invalid API key

If you get this error, check the following in order:

1. **Verify the token itself** works, outside the SDK:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.brightdata.com/zone/get_active_zones
   ```
   If this fails, generate a new API key with **admin** permissions in the
   [control panel](https://brightdata.com/cp/setting/users). Note the SDK needs
   an account-level API token — not a zone password.
2. **Check for shell overrides.** Environment variables set in your shell take
   precedence over `.env` files loaded with `node --env-file=.env`. Run
   `set BRIGHTDATA` (Windows) or `env | grep BRIGHTDATA` (macOS/Linux) and clear
   any leftover values.
3. **Check your `.env` file:** no quotes, no spaces around `=`, no trailing
   whitespace, and the token copied exactly (including dashes). Prefer LF line
   endings.
4. **Print what actually loaded:**
   ```js
   console.log(JSON.stringify(process.env.BRIGHTDATA_API_TOKEN));
   ```
   Hidden characters like `\r` will be visible in the output.

## Support

For any issues, contact [Bright Data support](https://brightdata.com/contact), or open an issue in this repository.

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
