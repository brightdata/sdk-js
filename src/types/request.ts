import type { BRDError } from '../utils/errors';

export type {
    FetchingOptions,
    RequestOptions,
    ScrapeOptions,
    SearchOptions,
    SearchEngine,
} from '../schemas/request';

// Re-derive intersection types from re-exported bases
import type { RequestOptions } from '../schemas/request';

export interface RequestJSONOptions extends RequestOptions {
    format: 'json';
}

export type ScrapeJSONOptions = RequestOptions & RequestJSONOptions;
export type SearchJSONOptions = RequestOptions & RequestJSONOptions;

export type SingleRawResponse = string;
export interface SingleJSONResponse {
    status_code: number;
    headers: Record<string, string>;
    body: string;
}

export type BatchJSONResponse = Array<SingleJSONResponse | BRDError>;
export type BatchRawResponse = Array<SingleRawResponse | BRDError>;

export type SingleResponse = SingleRawResponse | SingleJSONResponse;
export type BatchResponse = BatchRawResponse | BatchJSONResponse;
export type AnyResponse = SingleResponse | BatchResponse;
