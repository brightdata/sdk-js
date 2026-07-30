// Scraper platform API: ScrapeRouter, ScrapeJob, results, platform filter types.
// Usage: import { ScrapeRouter, ScrapeJob } from '@brightdata/sdk/scrapers'

export { ScrapeJob } from './api/scrape/job.js';
export { ScrapeRouter } from './api/scrape/router.js';
export { ScrapeResult } from './models/result.js';
export type { ScrapeResultFields } from './models/result.js';
export type * from './types/datasets.js';
