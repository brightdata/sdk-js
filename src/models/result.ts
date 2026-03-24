import { writeContent } from '../utils/files';

export interface BaseResultFields<T = unknown> {
    success: boolean;
    data?: T | null;
    error?: string | null;
    cost?: number | null;
    triggerSentAt?: Date | null;
    dataFetchedAt?: Date | null;
}

export class BaseResult<T = unknown> {
    readonly success: boolean;
    readonly data: T | null;
    readonly error: string | null;
    readonly cost: number | null;
    readonly triggerSentAt: Date | null;
    readonly dataFetchedAt: Date | null;

    constructor(fields: BaseResultFields<T>) {
        this.success = fields.success;
        this.data = fields.data ?? null;
        this.error = fields.error ?? null;
        this.cost = fields.cost ?? null;
        this.triggerSentAt = fields.triggerSentAt ?? null;
        this.dataFetchedAt = fields.dataFetchedAt ?? null;
    }

    elapsedMs(): number | null {
        if (this.triggerSentAt && this.dataFetchedAt) {
            return this.dataFetchedAt.getTime() - this.triggerSentAt.getTime();
        }
        return null;
    }

    getTimingBreakdown(): Record<string, unknown> {
        return {
            totalElapsedMs: this.elapsedMs(),
            triggerSentAt: this.triggerSentAt?.toISOString() ?? null,
            dataFetchedAt: this.dataFetchedAt?.toISOString() ?? null,
        };
    }

    toJSON(): Record<string, unknown> {
        return {
            success: this.success,
            data: this.data,
            error: this.error,
            cost: this.cost,
            triggerSentAt: this.triggerSentAt?.toISOString() ?? null,
            dataFetchedAt: this.dataFetchedAt?.toISOString() ?? null,
            elapsedMs: this.elapsedMs(),
        };
    }

    toDict(): Record<string, unknown> {
        return this.toJSON();
    }

    async save(
        filepath: string,
        format: 'json' | 'txt' = 'json',
    ): Promise<string> {
        const content =
            format === 'json'
                ? JSON.stringify(this.toJSON(), null, 2)
                : String(this.data);
        return writeContent(content, filepath);
    }

    toString(): string {
        const status = this.success ? 'success' : 'error';
        const cost = this.cost != null ? `$${this.cost.toFixed(4)}` : 'N/A';
        const elapsed =
            this.elapsedMs() != null
                ? `${this.elapsedMs()!.toFixed(0)}ms`
                : 'N/A';
        return `<${this.constructor.name} ${status} cost=${cost} elapsed=${elapsed}>`;
    }
}

export interface ScrapeResultFields<T = unknown> extends BaseResultFields<T> {
    url?: string;
    status?: 'ready' | 'error' | 'timeout' | 'in_progress';
    snapshotId?: string | null;
    platform?: string | null;
    method?: string | null;
    rowCount?: number | null;
}

export class ScrapeResult<T = unknown> extends BaseResult<T> {
    readonly url: string;
    readonly status: 'ready' | 'error' | 'timeout' | 'in_progress';
    readonly snapshotId: string | null;
    readonly platform: string | null;
    readonly method: string | null;
    readonly rowCount: number | null;

    constructor(fields: ScrapeResultFields<T>) {
        super(fields);
        this.url = fields.url ?? '';
        this.status = fields.status ?? 'ready';
        this.snapshotId = fields.snapshotId ?? null;
        this.platform = fields.platform ?? null;
        this.method = fields.method ?? null;
        this.rowCount = fields.rowCount ?? null;
    }

    override toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            url: this.url,
            status: this.status,
            snapshotId: this.snapshotId,
            platform: this.platform,
            method: this.method,
            rowCount: this.rowCount,
        };
    }

    override toString(): string {
        const base = super.toString();
        const urlPreview =
            this.url.length > 50 ? this.url.slice(0, 50) + '...' : this.url;
        const platform = this.platform ? ` platform=${this.platform}` : '';
        return `<ScrapeResult ${base} url=${urlPreview}${platform}>`;
    }
}

export interface SearchResultFields<T = unknown> extends BaseResultFields<T> {
    query?: string;
    searchEngine?: string | null;
    totalFound?: number | null;
    country?: string | null;
    page?: number | null;
}

export class SearchResult<T = unknown> extends BaseResult<T> {
    readonly query: string;
    readonly searchEngine: string | null;
    readonly totalFound: number | null;
    readonly country: string | null;
    readonly page: number | null;

    constructor(fields: SearchResultFields<T>) {
        super(fields);
        this.query = fields.query ?? '';
        this.searchEngine = fields.searchEngine ?? null;
        this.totalFound = fields.totalFound ?? null;
        this.country = fields.country ?? null;
        this.page = fields.page ?? null;
    }

    override toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            query: this.query,
            searchEngine: this.searchEngine,
            totalFound: this.totalFound,
            country: this.country,
            page: this.page,
        };
    }

    override toString(): string {
        const base = super.toString();
        const queryPreview =
            this.query.length > 50
                ? this.query.slice(0, 50) + '...'
                : this.query;
        const engine = this.searchEngine ? ` engine=${this.searchEngine}` : '';
        return `<SearchResult ${base} query=${queryPreview}${engine}>`;
    }
}
