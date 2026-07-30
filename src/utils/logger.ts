import type { LOG_LEVEL } from '../types/client.js';

let currentLogLevel: LOG_LEVEL = 'INFO';
let isStructuredLogging = true;
let isVerbose = false;

const logLevels: Record<LOG_LEVEL, number> = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 4,
};

export function setup(
    logLevel: LOG_LEVEL = 'INFO',
    structuredLogging = true,
    verbose = false,
) {
    currentLogLevel = logLevel.toUpperCase() as LOG_LEVEL;
    isStructuredLogging = structuredLogging;
    isVerbose = verbose;
}

export function getLogger(name: string) {
    return {
        debug: (message: string, extra = {}) =>
            log('DEBUG', name, message, extra),
        info: (message: string, extra = {}) =>
            log('INFO', name, message, extra),
        warning: (message: string, extra = {}) =>
            log('WARNING', name, message, extra),
        error: (message: string, extra = {}) =>
            log('ERROR', name, message, extra),
        critical: (message: string, extra = {}) =>
            log('CRITICAL', name, message, extra),
    };
}

function log(level: LOG_LEVEL, name: string, message: string, extra = {}) {
    const curLevelVal = logLevels[currentLogLevel] || logLevels.INFO;
    const levelVal = logLevels[level] || logLevels.INFO;

    if (!isVerbose && levelVal < logLevels.WARNING) return;
    if (levelVal < curLevelVal) return;

    if (isStructuredLogging) {
        console.log(
            JSON.stringify({
                timestamp: Date.now(),
                level,
                logger: name,
                message,
                ...extra,
            }),
        );
        return;
    }

    const timestamp = new Date().toISOString();
    const fmted = `${timestamp} [${level}] ${name}: ${message}`;

    switch (level) {
        case 'DEBUG':
        case 'INFO':
            console.log(fmted);
            break;
        case 'WARNING':
            console.warn(fmted);
            break;
        case 'ERROR':
        case 'CRITICAL':
            console.error(fmted);
            break;
        default:
            console.log(fmted);
    }
}

export function logRequest(method: string, url: string, data: unknown) {
    const logger = getLogger('http.request');
    logger.debug(`${method} ${url}`, {
        method,
        url,
        data: typeof data === 'string' ? data : JSON.stringify(data),
    });
}
