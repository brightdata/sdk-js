export { CrawlerService } from './service.js';
export { CrawlResult } from './result.js';
export type { CrawlRecord, CrawlResultFields } from './result.js';

// CrawlJob is an alias for ScrapeJob — the snapshot-job wrapper is generic.
// Re-exported under the crawler name so porters from Python keep the same vocabulary.
export { ScrapeJob as CrawlJob } from '../scrape/job.js';
