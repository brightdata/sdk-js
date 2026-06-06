import { BaseResult, type BaseResultFields } from '../../models/result';

export interface CrawlRecord {
    url?: string;
    markdown?: string;
    html2text?: string;
    page_html?: string;
    [key: string]: unknown;
}

export interface CrawlResultFields extends BaseResultFields<CrawlRecord[]> {
    pageCount?: number | null;
    snapshotId?: string | null;
}

export class CrawlResult extends BaseResult<CrawlRecord[]> {
    readonly pageCount: number | null;
    readonly snapshotId: string | null;

    constructor(fields: CrawlResultFields) {
        super(fields);
        this.pageCount = fields.pageCount ?? null;
        this.snapshotId = fields.snapshotId ?? null;
    }

    override toJSON(): Record<string, unknown> {
        return {
            ...super.toJSON(),
            pageCount: this.pageCount,
            snapshotId: this.snapshotId,
        };
    }

    override toString(): string {
        const base = super.toString();
        const sid = this.snapshotId
            ? ` snapshot_id=${this.snapshotId.slice(0, 12)}...`
            : '';
        const pages = this.pageCount != null ? ` pages=${this.pageCount}` : '';
        return `<CrawlResult ${base}${pages}${sid}>`;
    }
}
