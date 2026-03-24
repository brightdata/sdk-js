import { z } from 'zod';

export const FacebookCollectUserPostsFilterSchema = z.object({
    url: z.string().min(1),
    num_of_posts: z.number().optional(),
    posts_to_not_include: z.array(z.string()).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    include_profile_data: z.boolean().optional(),
}).strict();

export type FacebookCollectUserPostsFilter = z.infer<typeof FacebookCollectUserPostsFilterSchema>;

export const FacebookCollectGroupPostsFilterSchema = z.object({
    url: z.string().min(1),
    num_of_posts: z.number().optional(),
    posts_to_not_include: z.array(z.string()).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
}).strict();

export type FacebookCollectGroupPostsFilter = z.infer<typeof FacebookCollectGroupPostsFilterSchema>;

export const FacebookCollectPostCommentsFilterSchema = z.object({
    url: z.string().min(1),
    get_all_replies: z.boolean().optional(),
    limit_records: z.number().optional(),
    comments_sort: z.string().optional(),
}).strict();

export type FacebookCollectPostCommentsFilter = z.infer<typeof FacebookCollectPostCommentsFilterSchema>;

export const FacebookCompanyReviewsFilterSchema = z.object({
    url: z.string().min(1),
    num_of_reviews: z.number().optional(),
}).strict();

export type FacebookCompanyReviewsFilter = z.infer<typeof FacebookCompanyReviewsFilterSchema>;

export const FacebookDiscoverPostsByUserNameFilterSchema = z.object({
    user_name: z.string().min(1),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    include_profile_data: z.boolean().optional(),
}).strict();

export type FacebookDiscoverPostsByUserNameFilter = z.infer<typeof FacebookDiscoverPostsByUserNameFilterSchema>;

export const FacebookDiscoverMarketplaceItemsByKeywordFilterSchema = z.object({
    keyword: z.string().min(1),
    city: z.string().optional(),
    radius: z.number().optional(),
    date_listed: z.enum(['Last 24 hours', 'Last 7 days', 'Last 30 days', 'All']).optional(),
}).strict();

export type FacebookDiscoverMarketplaceItemsByKeywordFilter = z.infer<typeof FacebookDiscoverMarketplaceItemsByKeywordFilterSchema>;

export const FacebookDiscoverMarketplaceItemsByURLFilterSchema = z.object({
    url: z.string().min(1),
}).strict();

export type FacebookDiscoverMarketplaceItemsByURLFilter = z.infer<typeof FacebookDiscoverMarketplaceItemsByURLFilterSchema>;

export const FacebookDiscoverEventsByURLFilterSchema = z.object({
    url: z.string().min(1),
}).strict();

export type FacebookDiscoverEventsByURLFilter = z.infer<typeof FacebookDiscoverEventsByURLFilterSchema>;

export const FacebookDiscoverEventsByVenueFilterSchema = z.object({
    url: z.string().min(1),
    upcoming_events_only: z.boolean().optional(),
}).strict();

export type FacebookDiscoverEventsByVenueFilter = z.infer<typeof FacebookDiscoverEventsByVenueFilterSchema>;
