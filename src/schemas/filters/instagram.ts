import { z } from 'zod';

export const InstagramDiscoverPostsByProfileURLFilterSchema = z.object({
    url: z.string().min(1),
    num_of_posts: z.number().optional(),
    posts_to_not_include: z.array(z.string()).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    post_type: z.enum(['post', 'reel']).optional(),
}).strict();

export type InstagramDiscoverPostsByProfileURLFilter = z.infer<typeof InstagramDiscoverPostsByProfileURLFilterSchema>;

export const InstagramDiscoverReelsByProfileURLFilterSchema = z.object({
    url: z.string().min(1),
    num_of_posts: z.number().optional(),
    posts_to_not_include: z.array(z.string()).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
}).strict();

export type InstagramDiscoverReelsByProfileURLFilter = z.infer<typeof InstagramDiscoverReelsByProfileURLFilterSchema>;
