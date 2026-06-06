export { CrawlerService } from './service';
export { CrawlResult } from './result';
export type { CrawlRecord, CrawlResultFields } from './result';

// CrawlJob is an alias for ScrapeJob — the snapshot-job wrapper is generic.
// Re-exported under the crawler name so porters from Python keep the same vocabulary.
export { ScrapeJob as CrawlJob } from '../scrape/job';
