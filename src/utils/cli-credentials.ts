import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** How the client's API token was obtained — reported in the User-Agent. */
export type AuthSource = 'param' | 'env' | 'cli_credentials';

/**
 * Location of the Bright Data CLI's stored credentials, per platform.
 *
 * Mirrors the CLI's own resolver exactly (`bd-cli/src/utils/credentials.ts`
 * `get_config_dir`), so the SDK reads from wherever `brightdata login` wrote:
 *   - Windows: `homedir()/AppData/Roaming/brightdata-cli` (NOT `%APPDATA%` —
 *     the two diverge under folder redirection / roaming profiles).
 *   - macOS:   `homedir()/Library/Application Support/brightdata-cli`
 *   - Linux/other: `homedir()/.config/brightdata-cli` (no `XDG_CONFIG_HOME` —
 *     the CLI hardcodes `~/.config`, so honoring XDG here would diverge).
 * Only `credentials.json` is ever read; `config.json` is never touched.
 */
function getCliCredentialsPath(): string {
    const home = homedir();
    switch (process.platform) {
        case 'win32':
            return join(
                home,
                'AppData',
                'Roaming',
                'brightdata-cli',
                'credentials.json',
            );
        case 'darwin':
            return join(
                home,
                'Library',
                'Application Support',
                'brightdata-cli',
                'credentials.json',
            );
        default: // linux and others
            return join(home, '.config', 'brightdata-cli', 'credentials.json');
    }
}

/**
 * Read the API token the Bright Data CLI stored after `brightdata login`.
 * Returns the trimmed key, or `null` when unavailable (missing file, bad JSON,
 * no permission, or an empty/non-string key) — never throws. Read-only.
 */
export function readCliCredentials(): string | null {
    try {
        const parsed = JSON.parse(
            readFileSync(getCliCredentialsPath(), 'utf8'),
        ) as { api_key?: unknown };
        const key = parsed.api_key;
        return typeof key === 'string' && key.trim() ? key.trim() : null;
    } catch {
        return null; // missing file, bad JSON, no permission — all mean "not available"
    }
}
