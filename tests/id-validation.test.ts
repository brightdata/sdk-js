import { describe, expect, test, vi, beforeEach } from 'vitest';
import { SnapshotAPI } from '../src/api/scrape/snapshot';
import { DatasetsClient } from '../src/api/datasets/client';
import { CrawlerService } from '../src/api/crawler/service';
import { ScraperStudioService } from '../src/api/scraperstudio/service';
import { Transport } from '../src/core/transport';
import { ValidationError } from '../src/utils/errors';
import { SafeIdSchema } from '../src/schemas/shared';
import { SnapshotIdSchema } from '../src/schemas/datasets';

// An identifier is an opaque token interpolated into a request URL path. These
// tests pin the invariant that a non-opaque id is refused before any request is
// issued, at every entry point that puts an id into a path. Framed around the
// invariant, not any particular input.

// Non-opaque ids: anything carrying path or query semantics.
const NON_OPAQUE = [
    '../../../zone/get_active_zones',
    '..%2f..%2f..%2finternal%2fecho',
    'a/b',
    'a\\b',
    'a?x=1',
    'a#frag',
    'a b', // internal whitespace is not trimmed away
];

// Real, opaque ids (a strict subset of the allowlist).
const OPAQUE = [
    's_m4x7enmven8djfqak',
    'gd_l7q7dkf244hwjntr0',
    'snap_123',
    'c_mycollector',
    'resp_abc123',
];

describe('SafeIdSchema / SnapshotIdSchema — shape', () => {
    test('rejects non-opaque ids', () => {
        for (const id of NON_OPAQUE) {
            expect(SafeIdSchema.safeParse(id).success, id).toBe(false);
            expect(SnapshotIdSchema.safeParse(id).success, id).toBe(false);
        }
    });

    test('rejects the empty string', () => {
        expect(SafeIdSchema.safeParse('').success).toBe(false);
    });

    test('accepts real opaque ids', () => {
        for (const id of OPAQUE) {
            expect(SafeIdSchema.safeParse(id).success, id).toBe(true);
            expect(SnapshotIdSchema.safeParse(id).success, id).toBe(true);
        }
    });

    test('surrounding whitespace is trimmed, then validated', () => {
        // A padded but otherwise-opaque id normalizes to the opaque form.
        expect(SafeIdSchema.parse('  s_abc  ')).toBe('s_abc');
        // Trimming cannot rescue an id whose non-whitespace part is non-opaque.
        expect(SafeIdSchema.safeParse('  ../x  ').success).toBe(false);
    });

    test('SnapshotIdSchema still enforces its 3-char minimum', () => {
        expect(SnapshotIdSchema.safeParse('ab').success).toBe(false);
        // …but SafeIdSchema alone accepts a 2-char opaque id.
        expect(SafeIdSchema.safeParse('ab').success).toBe(true);
    });
});

// A fake transport whose request/stream must never be reached for a bad id.
const mockTransport = {
    request: vi.fn(),
    stream: vi.fn(),
} as unknown as Transport;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('no request is issued for a non-opaque id — throw surface', () => {
    const BAD = '../../../zone/get_active_zones';

    test('SnapshotAPI.getStatus / fetch / download / cancel', async () => {
        const api = new SnapshotAPI({ transport: mockTransport });
        await expect(api.getStatus(BAD)).rejects.toThrow(ValidationError);
        await expect(api.fetch(BAD)).rejects.toThrow(ValidationError);
        await expect(api.download(BAD)).rejects.toThrow(ValidationError);
        await expect(api.cancel(BAD)).rejects.toThrow(ValidationError);
        expect(mockTransport.request).not.toHaveBeenCalled();
        expect(mockTransport.stream).not.toHaveBeenCalled();
    });

    test('BaseDataset.getStatus / download (via DatasetsClient)', async () => {
        const client = new DatasetsClient({ transport: mockTransport });
        await expect(client.amazonProducts.getStatus(BAD)).rejects.toThrow(
            ValidationError,
        );
        await expect(client.amazonProducts.download(BAD)).rejects.toThrow(
            ValidationError,
        );
        expect(mockTransport.request).not.toHaveBeenCalled();
    });

    test('CrawlerService.status', async () => {
        const crawler = new CrawlerService({
            transport: mockTransport,
            snapshotOps: new SnapshotAPI({ transport: mockTransport }),
        });
        await expect(crawler.status(BAD)).rejects.toThrow(ValidationError);
        expect(mockTransport.request).not.toHaveBeenCalled();
    });

    test('ScraperStudioService.status', async () => {
        const studio = new ScraperStudioService({ transport: mockTransport });
        await expect(studio.status(BAD)).rejects.toThrow(ValidationError);
        expect(mockTransport.request).not.toHaveBeenCalled();
    });
});

describe('no request is issued for a non-opaque id — swallowed surface', () => {
    const BAD = '../../../zone/get_active_zones';

    // CrawlerService.download routes the id through ScrapeJob.toResult(), which by
    // contract never throws — it returns a failed result. The security property
    // (no request issued) must still hold, and the failure must surface as
    // success:false rather than a thrown error. (Orchestrated scrape.<platform>.*
    // methods take URLs, not raw snapshot ids, so they only ever receive
    // server-issued ids; crawler.download is the representative swallow surface.)
    test('CrawlerService.download returns success:false and issues no request', async () => {
        const crawler = new CrawlerService({
            transport: mockTransport,
            snapshotOps: new SnapshotAPI({ transport: mockTransport }),
        });
        const result = await crawler.download(BAD);
        expect(result.success).toBe(false);
        expect(mockTransport.request).not.toHaveBeenCalled();
        expect(mockTransport.stream).not.toHaveBeenCalled();
    });
});
