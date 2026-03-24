import { z } from 'zod';

export const AmazonCollectProductsFilterSchema = z.object({
    url: z.string().min(1),
    zipcode: z.string().optional(),
    language: z.string().optional(),
}).strict();

export type AmazonCollectProductsFilter = z.infer<typeof AmazonCollectProductsFilterSchema>;

export const AmazonCollectReviewsFilterSchema = z.object({
    url: z.string().min(1),
    reviews_to_not_include: z.array(z.string()).optional(),
}).strict();

export type AmazonCollectReviewsFilter = z.infer<typeof AmazonCollectReviewsFilterSchema>;

export const AmazonCollectSearchFilterSchema = z.object({
    url: z.string().min(1),
    keyword: z.string().min(1),
    pages_to_search: z.number().optional(),
}).strict();

export type AmazonCollectSearchFilter = z.infer<typeof AmazonCollectSearchFilterSchema>;

export const AmazonDiscoverProductsByBSUrlFilterSchema = z.object({
    category_url: z.string().min(1),
    collect_child_categories: z.boolean().optional(),
}).strict();

export type AmazonDiscoverProductsByBSUrlFilter = z.infer<typeof AmazonDiscoverProductsByBSUrlFilterSchema>;

export const AmazonDiscoverProductsByCategoryURLFilterSchema = z.object({
    url: z.string().min(1),
    sort_by: z.string().optional(),
    zipcode: z.string().optional(),
}).strict();

export type AmazonDiscoverProductsByCategoryURLFilter = z.infer<typeof AmazonDiscoverProductsByCategoryURLFilterSchema>;

export const AmazonDiscoverProductsByKeywordFilterSchema = z.object({
    keyword: z.string().min(1),
}).strict();

export type AmazonDiscoverProductsByKeywordFilter = z.infer<typeof AmazonDiscoverProductsByKeywordFilterSchema>;

export const AmazonDiscoverProductsByUPCFilterSchema = z.object({
    upc: z.string().min(1),
}).strict();

export type AmazonDiscoverProductsByUPCFilter = z.infer<typeof AmazonDiscoverProductsByUPCFilterSchema>;
