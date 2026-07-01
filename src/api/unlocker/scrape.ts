import type { ScrapeOptions } from '../../types/request.js';
import { RequestAPI, type RequestAPIOptions } from './request.js';

export class ScrapeAPI extends RequestAPI {
    constructor(opts: RequestAPIOptions) {
        super(opts);
        this.name = 'scrape';
        this.zoneType = 'unblocker';
        this.init();
    }

    protected override getURL(content: string) {
        return content;
    }

    protected override getMethod(opt: ScrapeOptions) {
        return opt.method;
    }
}
