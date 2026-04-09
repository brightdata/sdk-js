import { ScrapeAPI } from './api/unlocker/scrape';
import { ZonesAPI } from './api/zones';
import { ScrapeRouter } from './api/scrape/router';
import { SearchRouter } from './api/search/router';
import { DatasetsClient } from './api/datasets/client';
import { DiscoverService } from './api/discover/service';
import type { DiscoverResult } from './api/discover/result';
import type { DiscoverJob } from './api/discover/job';
import type { DiscoverOptions } from './schemas/discover';
import { ScraperStudioService } from './api/scraperstudio/service';
import { setup as setupLogger, getLogger } from './utils/logger';
import {
    DEFAULT_WEB_UNLOCKER_ZONE,
    DEFAULT_SERP_ZONE,
} from './utils/constants';
import { ValidationError } from './utils/errors';
import { maskKey } from './utils/misc';
import { writeContent, stringifyResults, getFilename } from './utils/files';
import { assertSchema } from './schemas/utils';
import { ScrapeOptionsSchema } from './schemas/request';
import {
    URLParamSchema,
    ApiKeySchema,
    VerboseSchema,
    ClientOptionsSchema,
} from './schemas/client';
import { SaveOptionsSchema } from './schemas/misc';
import { Transport } from './core/transport';
import type { BdClientOptions, SaveOptions } from './types/client';
import type { ZoneInfo } from './types/zones';
import type {
    ScrapeJSONOptions,
    SingleJSONResponse,
    BatchJSONResponse,
    ScrapeOptions,
    SingleRawResponse,
    BatchRawResponse,
    AnyResponse,
} from './types/request';

function defineLazy<T>(obj: object, key: string, factory: () => T): void {
    Object.defineProperty(obj, key, {
        get() {
            const value = factory();
            Object.defineProperty(obj, key, {
                value,
                writable: false,
                configurable: true,
                enumerable: true,
            });
            return value;
        },
        configurable: true,
        enumerable: true,
    });
}

/**
 * Create a new bdclient instance
 *
 * @example
 * ```javascript
 * // Basic usage
 * const client = new bdclient({
 *     api_token: 'your-api-token'
 * });
 *
 * // Advanced configuration
 * const client = new bdclient({
 *     api_token: 'brd-customer-hl_12345-zone-web:abc123',
 *     auto_create_zones: true,
 *     web_unlocker_zone: 'my_web_zone',
 *     serp_zone: 'my_serp_zone',
 *     log_level: 'DEBUG',
 *     verbose: true
 * });
 *
 * // Using environment variables
 * process.env.BRIGHTDATA_API_TOKEN = 'your-key';
 * const client = new bdclient(); // Automatically uses env var
 * ```
 */
export class bdclient {
    private _scrapeAPI: ScrapeAPI | null = null;
    private _discoverService: DiscoverService | null = null;
    private zonesAPI: ZonesAPI;
    private transport: Transport;
    private autoCreateZones: boolean;
    private webUnlockerZone: string;
    private serpZone: string;
    private logger!: ReturnType<typeof getLogger>;
    declare scrape: ScrapeRouter;
    declare search: SearchRouter;
    declare datasets: DatasetsClient;
    declare scraperStudio: ScraperStudioService;

    constructor(options?: BdClientOptions) {
        const opt = assertSchema(
            ClientOptionsSchema,
            options || {},
            'bdclient.options',
        );
        const {
            BRIGHTDATA_API_TOKEN,
            BRIGHTDATA_VERBOSE,
            BRIGHTDATA_WEB_UNLOCKER_ZONE,
            BRIGHTDATA_SERP_ZONE,
        } = process.env;

        const isVerbose = opt.verbose
            ? opt.verbose
            : assertSchema(
                  VerboseSchema,
                  BRIGHTDATA_VERBOSE || '0',
                  'bdclient.options.verbose',
              );

        this.logger = getLogger('client');
        setupLogger(opt.logLevel, opt.structuredLogging, isVerbose);
        this.logger.info('initializing Bright Data SDK client');

        const apiKey = assertSchema(
            ApiKeySchema,
            opt.apiKey || BRIGHTDATA_API_TOKEN,
            'bdclient.options.apiKey',
        );

        this.logger.info(`API key validated successfully: ${maskKey(apiKey)}`);
        this.logger.info('HTTP client configured with secure headers');

        this.transport = new Transport({
            apiKey,
            timeout: opt.timeout,
            rateLimit: opt.rateLimit,
            ratePeriod: opt.ratePeriod,
        });

        this.autoCreateZones = opt.autoCreateZones;
        this.webUnlockerZone =
            opt.webUnlockerZone ||
            BRIGHTDATA_WEB_UNLOCKER_ZONE ||
            DEFAULT_WEB_UNLOCKER_ZONE;
        this.serpZone =
            opt.serpZone || BRIGHTDATA_SERP_ZONE || DEFAULT_SERP_ZONE;

        this.zonesAPI = new ZonesAPI({ transport: this.transport });

        defineLazy(this, 'scrape', () =>
            new ScrapeRouter({ transport: this.transport }),
        );

        defineLazy(this, 'search', () =>
            new SearchRouter({
                transport: this.transport,
                zonesAPI: this.zonesAPI,
                autoCreateZones: this.autoCreateZones,
                zone: this.serpZone,
            }),
        );

        defineLazy(this, 'datasets', () =>
            new DatasetsClient({ transport: this.transport }),
        );

        defineLazy(this, 'scraperStudio', () =>
            new ScraperStudioService({ transport: this.transport }),
        );
    }

    private get scrapeAPI(): ScrapeAPI {
        if (!this._scrapeAPI) {
            this._scrapeAPI = new ScrapeAPI({
                transport: this.transport,
                zonesAPI: this.zonesAPI,
                autoCreateZones: this.autoCreateZones,
                zone: this.webUnlockerZone,
            });
        }
        return this._scrapeAPI;
    }

    private get discoverService(): DiscoverService {
        if (!this._discoverService) {
            this._discoverService = new DiscoverService({
                transport: this.transport,
            });
        }
        return this._discoverService;
    }

    /**
     * Scrape a single URL using Bright Data Web Unlocker API
     *
     * Bypasses anti-bot protection and returns website content
     *
     * @example
     * ```javascript
     * // Simple scraping (returns HTML)
     * const html = await client.scrapeUrl('https://example.com');
     *
     * // Get structured JSON data
     * const data = await client.scrapeUrl('https://example.com', {
     *     format: 'json'
     * });
     *
     * // Advanced options
     * const result = await client.scrapeUrl('https://example.com', {
     *     method: 'GET',                 // 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
     *     country: 'us',                 // 'us' | 'gb' | 'de' | 'jp' etc.
     *     format: 'raw',                 // 'raw' | 'json'
     *     dataFormat: 'markdown',        // 'html' | 'markdown' | 'screenshot'
     *     timeout: 30000,                // 5000-300000 milliseconds
     *     zone: 'my_custom_zone'         // Custom zone name
     * });
     *
     * // E-commerce scraping
     * const productData = await client.scrapeUrl('https://amazon.com/dp/B123', {
     *     format: 'json',
     *     country: 'us'
     * });
     * ```
     */
    // prettier-ignore
    async scrapeUrl(url: string, opts?: ScrapeJSONOptions): Promise<SingleJSONResponse>;
    // prettier-ignore
    async scrapeUrl(url: string, opts?: ScrapeOptions): Promise<SingleRawResponse>;
    // prettier-ignore
    async scrapeUrl(url: string[], opts?: ScrapeJSONOptions): Promise<BatchJSONResponse>;
    // prettier-ignore
    async scrapeUrl(url: string[], opts?: ScrapeOptions): Promise<BatchRawResponse>;
    async scrapeUrl(
        url: string | string[],
        options: ScrapeOptions | ScrapeJSONOptions = {},
    ): Promise<AnyResponse> {
        const label = 'bdclient.scrapeUrl.';
        const safeUrl = assertSchema(URLParamSchema, url, `${label}url`);
        const safeOptions = assertSchema(
            ScrapeOptionsSchema,
            options,
            `${label}options`,
        );

        this.logger.info(
            'starting scrape operation for ' +
                `${Array.isArray(url) ? url.length : 1} URL(s)`,
        );

        return Array.isArray(safeUrl)
            ? this.scrapeAPI.handle(safeUrl, safeOptions)
            : this.scrapeAPI.handle(safeUrl, safeOptions);
    }
    /**
     * Write content to a local file
     *
     * Saves scraped data or search results to disk in various formats
     *
     * @example
     * ```javascript
     * // Save scraped data as JSON
     * const data = await client.scrapeUrl('https://example.com');
     * const filePath = await client.saveResults(data, {
     *     filename: 'scraped_data.json',
     *     format: 'json',
     * });
     *
     * // Auto-generate filename
     * const filePath = await client.saveResults(data);
     * // Creates: brightdata_content_1758705609651.json
     *
     * // Save as plain text
     * const html = await client.scrapeUrl('https://example.com');
     * const txtPath = await client.saveResults(html, {
     *     filename: 'page.txt',
     *     format: 'txt',
     * });
     *
     * // Different formats
     *  await client.saveResults(data, {
     *     filename: 'data.json',
     *     format: 'json', // JSON format
     * });
     *  await client.saveResults(data, {
     *      filename: 'data.txt',
     *      format: 'txt', // Text format
     *  });
     * ```
     */
    async saveResults(content: AnyResponse, options: SaveOptions = {}) {
        if (!content) {
            throw new ValidationError('content is required');
        }

        const { format, filename } = assertSchema(SaveOptionsSchema, options);
        const fname = getFilename(filename, format);
        this.logger.info(`saving ${fname}`);
        const data = stringifyResults(content, format);
        return await writeContent(data, fname);
    }
    /**
     * List all active zones in your Bright Data account
     *
     * Retrieves information about available proxy zones and their status
     *
     * @example
     * ```javascript
     * // List all zones
     * const zones = await client.listZones();
     *
     * // Process zone information
     * for (let zone of zones) {
     *     console.log(`Zone: ${zone.name}`);
     *     console.log(`Type: ${zone.type}`);
     *     console.log(`Status: ${zone.status}`);
     *     console.log(`IPs: ${zone.ips}`);
     *     console.log(`Bandwidth: ${zone.bandwidth}`);
     *     console.log('---');
     * };
     *
     * // Find specific zone
     * const webZone = zones.find(z => z.name === 'web_unlocker_1');
     * if (webZone) {
     *     console.log(`Found zone: ${webZone.name}, Status: ${webZone.status}`);
     * }
     *
     * // Check zone availability
     * const activeZones = zones.filter(z => z.status === 'active');
     * console.log(`Active zones: ${activeZones.length}`);
     * ```
     */
    async listZones(): Promise<ZoneInfo[]> {
        return await this.zonesAPI.listZones();
    }

    /**
     * Search the web with AI-powered relevance ranking.
     * Triggers a search, polls until complete, returns results.
     *
     * @example
     * ```javascript
     * const result = await client.discover('AI trends 2026', {
     *     intent: 'latest technology developments',
     *     includeContent: true,
     * });
     * for (const item of result.data) {
     *     console.log(`[${item.relevance_score}] ${item.title}`);
     * }
     * ```
     */
    async discover(query: string, opts?: DiscoverOptions): Promise<DiscoverResult> {
        return this.discoverService.search(query, opts);
    }

    /**
     * Trigger a discover search and return a job for manual polling.
     *
     * @example
     * ```javascript
     * const job = await client.discoverTrigger('market research SaaS', {
     *     intent: 'competitor pricing',
     * });
     * await job.wait({ timeout: 60_000 });
     * const data = await job.fetch();
     * ```
     */
    async discoverTrigger(query: string, opts?: DiscoverOptions): Promise<DiscoverJob> {
        return this.discoverService.trigger(query, opts);
    }

    async close(): Promise<void> {
        await this.transport.close();
    }

    async [Symbol.asyncDispose](): Promise<void> {
        await this.close();
    }
}
