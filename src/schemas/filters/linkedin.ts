import { z } from 'zod';

export const LinkedinProfileFilterSchema = z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
}).strict();

export type LinkedinProfileFilter = z.infer<typeof LinkedinProfileFilterSchema>;

export const LinkedinJobFilterSchema = z.object({
    location: z.string().min(1),
    keyword: z.string().optional(),
    country: z.string().optional(),
    time_range: z.enum(['Past 24 hours', 'Past week', 'Past month', 'Any time']).optional(),
    job_type: z.enum(['Full-time', 'Part-time', 'Contract', 'Temporary', 'Volunteer']).optional(),
    experience_level: z.enum([
        'Internship',
        'Entry level',
        'Associate',
        'Mid-Senior level',
        'Director',
        'Executive',
    ]).optional(),
    remote: z.enum(['On-site', 'Remote', 'Hybrid']).optional(),
    company: z.string().optional(),
    location_radius: z.enum([
        'Exact location',
        '5 miles (8 km)',
        '10 miles (16 km)',
        '25 miles (40 km)',
        '50 miles (80 km)',
    ]).optional(),
    selective_search: z.boolean().optional(),
}).strict();

export type LinkedinJobFilter = z.infer<typeof LinkedinJobFilterSchema>;
