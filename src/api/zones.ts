import { getLogger } from '../utils/logger';
import { API_ENDPOINT } from '../utils/constants';
import { parseJSON } from '../utils/misc';
import { Transport, assertResponse } from '../core/transport';
import { ZoneError, BRDError } from '../utils/errors';
import type { ZoneInfo, ZoneInfoResponse } from '../types/zones';

const logger = getLogger('api.zones');

interface ZoneCreationOpts {
    type?: ZoneInfo['type'];
    domain_whitelist?: string;
    ips_type?: 'shared' | 'dedicated' | 'selective';
    bandwidth?: 'bandwidth' | 'unlimited';
    ip_alloc_preset?: 'shared_block' | 'shared_res_block';
    ips?: number;
    country?: string;
    country_city?: string;
    mobile?: boolean;
    city?: boolean;
    asn?: boolean;
    vip?: boolean;
    vips_type?: 'shared' | 'domain';
    vips?: number;
    vip_country?: string;
    vip_country_city?: string;
    pool_ip_type?: string;
    ub_premium?: boolean;
    solve_captcha_disable?: boolean;
    custom_headers?: boolean;
}

export interface ZonesAPIOpts {
    transport: Transport;
}

interface EnsureZoneOpts {
    type: ZoneInfo['type'];
}

type ZonesCache = Record<string, ZoneInfo>;

export class ZonesAPI {
    private transport: Transport;
    private cachedZones: ZonesCache | null = null;

    constructor(opts: ZonesAPIOpts) {
        this.transport = opts.transport;
    }

    async listZones(): Promise<ZoneInfo[]> {
        logger.info('fetching list of active zones');

        const response = await this.transport.request(
            API_ENDPOINT.ZONE_LIST,
            {},
        );

        const responseTxt = await assertResponse(response);
        const zones = parseJSON<ZoneInfoResponse[]>(responseTxt);

        logger.info(`found ${zones.length} active zones`);

        return zones.map((zone) => ({
            name: zone.zone || zone.name,
            type: zone.zone_type || zone.type,
            status: zone.status,
            ips: zone.ips || 0,
            bandwidth: zone.bandwidth || 0,
            created: zone.created_at || zone.created,
        }));
    }

    async ensureZone(name: string, opts: EnsureZoneOpts) {
        const fullName = `zone <${name}> (${opts.type})`;
        logger.info(`checking if ${fullName} exists`);

        const meta = await this.getZone(name);

        if (!meta) {
            logger.info(`${fullName} is not found`);
            await this.createZone(name, { type: opts.type });
            return;
        }

        if (meta.type === opts.type) {
            return void logger.info(`${fullName} already exists`);
        }

        throw new ZoneError(
            `zone <${name}> already exists, but type is not matching:` +
                ` received "${meta.type}", expected: "${opts.type}"`,
        );
    }

    private async createZone(name: string, opt: ZoneCreationOpts = {}) {
        let { type: zoneType = 'static' } = opt;
        logger.info(`creating zone: ${name} (type: ${zoneType})`);

        const isSerp = zoneType === 'serp';

        if (isSerp) {
            zoneType = 'unblocker';
        }

        const zoneData = {
            zone: {
                name: name,
                type: zoneType,
            },
            plan: {
                type: zoneType,
                serp: isSerp,
                domain_whitelist: opt.domain_whitelist || '',
                ips_type: opt.ips_type || 'shared',
                bandwidth: opt.bandwidth || 'bandwidth',
                ip_alloc_preset: opt.ip_alloc_preset || 'shared_block',
                ips: opt.ips || 0,
                country: opt.country || '',
                country_city: opt.country_city || '',
                mobile: opt.mobile || false,
                city: opt.city || false,
                asn: opt.asn || false,
                vip: opt.vip || false,
                vips_type: opt.vips_type || 'shared',
                vips: opt.vips || 0,
                vip_country: opt.vip_country || '',
                vip_country_city: opt.vip_country_city || '',
                pool_ip_type: opt.pool_ip_type || '',
                ub_premium: opt.ub_premium || false,
                solve_captcha_disable: opt.solve_captcha_disable !== false,
            },
        };

        try {
            const response = await this.transport.request(API_ENDPOINT.ZONE, {
                method: 'POST',
                body: JSON.stringify(zoneData),
            });

            const responseTxt = await assertResponse(response);

            logger.info(`successfully created zone: ${name}`);
            this.invalidateCache();

            return parseJSON<ZoneInfoResponse>(responseTxt);
        } catch (e: unknown) {
            if (e instanceof BRDError) throw e;
            throw new ZoneError(
                `failed to create zone ${name}: ${(e as Error).message}`,
            );
        }
    }

    private async getZone(name: string): Promise<ZoneInfo | void> {
        logger.debug(`retrieving zone data: ${name}`);
        await this.ensureCache();
        return this.cachedZones?.[name];
    }

    private async ensureCache() {
        if (this.cachedZones) return;

        const zones = await this.listZones();
        this.cachedZones = zones.reduce((acc, zone) => {
            acc[zone.name] = zone;
            return acc;
        }, {} as ZonesCache);
    }

    private invalidateCache() {
        this.cachedZones = null;
    }
}
