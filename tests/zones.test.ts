import type { Dispatcher } from 'undici';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZonesAPI } from '../src/api/zones';
import { Transport } from '../src/core/transport';
import { APIError, ZoneError } from '../src/utils/errors';

const mockTransport = {
    request: vi.fn(),
    stream: vi.fn(),
} as unknown as Transport;

function mockRequest(statusCode: number, body: string) {
    vi.mocked(mockTransport.request).mockResolvedValue({
        statusCode,
        headers: {},
        body: { text: () => Promise.resolve(body) },
    } as unknown as Dispatcher.ResponseData);
}

const ZONE_RESPONSE = [
    {
        zone: 'zone_a',
        zone_type: 'static',
        status: 'active',
        ips: 5,
        bandwidth: 100,
        created_at: '2024-01-01',
    },
    {
        name: 'zone_b',
        type: 'unblocker',
        status: 'active',
        ips: 0,
        bandwidth: 0,
        created: '2024-06-01',
    },
];

describe('ZonesAPI', () => {
    let api: ZonesAPI;

    beforeEach(() => {
        vi.clearAllMocks();
        api = new ZonesAPI({ transport: mockTransport });
    });

    describe('listZones', () => {
        it('returns parsed zone list', async () => {
            mockRequest(200, JSON.stringify(ZONE_RESPONSE));

            const zones = await api.listZones();
            expect(zones).toHaveLength(2);
        });

        it('maps zone/zone_type fields correctly', async () => {
            mockRequest(200, JSON.stringify(ZONE_RESPONSE));

            const zones = await api.listZones();
            expect(zones[0].name).toBe('zone_a');
            expect(zones[0].type).toBe('static');
            expect(zones[0].ips).toBe(5);
        });

        it('maps name/type fallback fields', async () => {
            mockRequest(200, JSON.stringify(ZONE_RESPONSE));

            const zones = await api.listZones();
            expect(zones[1].name).toBe('zone_b');
            expect(zones[1].type).toBe('unblocker');
        });

        it('HTTP error throws APIError', async () => {
            mockRequest(500, 'Internal Server Error');
            await expect(api.listZones()).rejects.toThrow(APIError);
        });
    });

    describe('ensureZone', () => {
        it('zone exists with correct type — no creation', async () => {
            mockRequest(200, JSON.stringify(ZONE_RESPONSE));

            await api.ensureZone('zone_a', { type: 'static' });
            // listZones called once (for cache), no createZone call
            expect(mockTransport.request).toHaveBeenCalledTimes(1);
        });

        it('zone exists with wrong type — throws ZoneError', async () => {
            mockRequest(200, JSON.stringify(ZONE_RESPONSE));

            await expect(
                api.ensureZone('zone_a', { type: 'unblocker' }),
            ).rejects.toThrow(ZoneError);
        });

        it('zone does not exist — calls createZone', async () => {
            // First call: listZones
            vi.mocked(mockTransport.request)
                .mockResolvedValueOnce({
                    statusCode: 200,
                    headers: {},
                    body: { text: () => Promise.resolve(JSON.stringify(ZONE_RESPONSE)) },
                } as unknown as Dispatcher.ResponseData)
                // Second call: createZone
                .mockResolvedValueOnce({
                    statusCode: 200,
                    headers: {},
                    body: { text: () => Promise.resolve(JSON.stringify({ zone: 'new_zone' })) },
                } as unknown as Dispatcher.ResponseData);

            await api.ensureZone('new_zone', { type: 'static' });
            // listZones + createZone = 2 calls
            expect(mockTransport.request).toHaveBeenCalledTimes(2);
        });
    });
});
