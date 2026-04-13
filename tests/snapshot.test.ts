import type { Dispatcher } from 'undici';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { SnapshotAPI } from '../src/api/scrape/snapshot';
import { Transport } from '../src/core/transport';
import {
    APIError,
    DataNotReadyError,
    ValidationError,
} from '../src/utils/errors';

vi.mock('../src/utils/files', () => ({
    getFilename: vi.fn((_name: unknown, format: string) => `test.${format}`),
    getAbsAndEnsureDir: vi.fn((filename: string) => Promise.resolve(`/tmp/${filename}`)),
    routeDownloadStream: vi.fn(),
}));

const mockTransport = {
    request: vi.fn(),
    stream: vi.fn(),
} as unknown as Transport;

function mockRequest(statusCode: number, body: string) {
    vi.mocked(mockTransport.request).mockResolvedValue({
        statusCode,
        headers: {},
        trailers: {},
        opaque: null,
        context: {},
        body: {
            text: () => Promise.resolve(body),
        },
    } as unknown as Dispatcher.ResponseData);
}

describe('SnapshotAPI.fetch', () => {
    let api: SnapshotAPI;

    beforeEach(() => {
        vi.clearAllMocks();
        api = new SnapshotAPI({ transport: mockTransport });
    });

    test('fetch returns parsed JSON data', async () => {
        const mockData = [{ title: 'Product A', price: 29.99 }];
        mockRequest(200, JSON.stringify(mockData));
        const result = await api.fetch('snap_123', { format: 'json' });
        expect(result).toEqual(mockData);
    });

    test('fetch returns raw text for non-json format', async () => {
        mockRequest(200, 'col1,col2\nval1,val2');
        const result = await api.fetch('snap_123', { format: 'csv' });
        expect(result).toBe('col1,col2\nval1,val2');
    });

    test('fetch throws DataNotReadyError on 202', async () => {
        mockRequest(202, 'not ready');
        await expect(api.fetch('snap_123', { format: 'json' })).rejects.toThrow(
            DataNotReadyError,
        );
    });

    test('fetch throws on 4xx/5xx', async () => {
        mockRequest(500, 'Internal Server Error');
        await expect(api.fetch('snap_123')).rejects.toThrow(APIError);
    });

    test('fetch validates snapshot id', async () => {
        await expect(api.fetch('ab')).rejects.toThrow(ValidationError);
    });

    test('fetch defaults to json format', async () => {
        const mockData = [{ id: 1 }];
        mockRequest(200, JSON.stringify(mockData));
        await api.fetch('snap_123');
        expect(mockTransport.request).toHaveBeenCalledWith(
            expect.stringContaining('snap_123'),
            expect.objectContaining({
                query: expect.objectContaining({ format: 'json' }),
            }),
        );
    });
});

describe('SnapshotAPI.getStatus', () => {
    let api: SnapshotAPI;

    beforeEach(() => {
        vi.clearAllMocks();
        api = new SnapshotAPI({ transport: mockTransport });
    });

    test('returns parsed status response', async () => {
        const statusData = { status: 'ready', snapshot_id: 'snap_123', dataset_id: 'ds_1' };
        mockRequest(200, JSON.stringify(statusData));

        const result = await api.getStatus('snap_123');
        expect(result).toEqual(statusData);
    });

    test('calls correct status endpoint', async () => {
        mockRequest(200, JSON.stringify({ status: 'running', snapshot_id: 'snap_123', dataset_id: 'ds_1' }));
        await api.getStatus('snap_123');

        expect(mockTransport.request).toHaveBeenCalledWith(
            expect.stringContaining('snap_123'),
            expect.anything(),
        );
    });

    test('rejects invalid snapshot ID', async () => {
        await expect(api.getStatus('ab')).rejects.toThrow(ValidationError);
    });

    test('HTTP error throws APIError', async () => {
        mockRequest(500, 'Internal Server Error');
        await expect(api.getStatus('snap_123')).rejects.toThrow(APIError);
    });
});

describe('SnapshotAPI.download', () => {
    let api: SnapshotAPI;

    beforeEach(() => {
        vi.clearAllMocks();
        api = new SnapshotAPI({ transport: mockTransport });
    });

    test('success returns filename', async () => {
        vi.mocked(mockTransport.stream).mockResolvedValue({} as Dispatcher.StreamData);

        const result = await api.download('snap_123', { format: 'json', statusPolling: false });
        expect(result).toBe('/tmp/test.json');
    });

    test('calls transport.stream with correct URL', async () => {
        vi.mocked(mockTransport.stream).mockResolvedValue({} as Dispatcher.StreamData);

        await api.download('snap_123', { format: 'csv', statusPolling: false });
        expect(mockTransport.stream).toHaveBeenCalledWith(
            expect.stringContaining('snap_123'),
            expect.anything(),
            expect.anything(),
        );
    });

    test('rejects invalid snapshot ID', async () => {
        await expect(api.download('ab')).rejects.toThrow(ValidationError);
    });
});

describe('SnapshotAPI.cancel', () => {
    let api: SnapshotAPI;

    beforeEach(() => {
        vi.clearAllMocks();
        api = new SnapshotAPI({ transport: mockTransport });
    });

    test('calls transport.request with POST', async () => {
        mockRequest(200, 'ok');

        await api.cancel('snap_123');
        expect(mockTransport.request).toHaveBeenCalledWith(
            expect.stringContaining('snap_123'),
            expect.objectContaining({ method: 'POST' }),
        );
    });

    test('rejects invalid snapshot ID', async () => {
        await expect(api.cancel('ab')).rejects.toThrow(ValidationError);
    });

    test('HTTP error throws APIError', async () => {
        mockRequest(500, 'Internal Server Error');
        await expect(api.cancel('snap_123')).rejects.toThrow(APIError);
    });
});
