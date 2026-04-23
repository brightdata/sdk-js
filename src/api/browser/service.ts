import { assertSchema } from '../../schemas/utils';
import { BrowserConnectOptionsSchema } from '../../schemas/browser';
import type { BrowserConnectOptions } from '../../schemas/browser';

export class BrowserService {
    static readonly DEFAULT_HOST = 'brd.superproxy.io';
    static readonly DEFAULT_PORT = 9222;

    private readonly username: string;
    private readonly password: string;
    private readonly host: string;
    private readonly port: number;

    constructor(opts: {
        username: string;
        password: string;
        host?: string;
        port?: number;
    }) {
        this.username = opts.username;
        this.password = opts.password;
        this.host = opts.host ?? BrowserService.DEFAULT_HOST;
        this.port = opts.port ?? BrowserService.DEFAULT_PORT;
    }

    getConnectUrl(opts?: BrowserConnectOptions): string {
        const safeOpts = assertSchema(
            BrowserConnectOptionsSchema,
            opts ?? {},
            'browser.getConnectUrl',
        );

        let username = this.username;
        if (safeOpts.country) {
            username = `${username}-country-${safeOpts.country}`;
        }

        return `wss://${encodeURIComponent(username)}:${encodeURIComponent(this.password)}@${this.host}:${this.port}`;
    }
}
