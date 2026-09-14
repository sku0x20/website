import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        tags: z.array(z.string()),
        image: z.string().optional(),
    }),
});

const slides = defineCollection({
    loader: glob({ pattern: '**/slides.md', base: './slides' }),
    schema: z.object({
        title: z.string(),
        subtitle: z.string().optional(),
        description: z.string().optional(),
        date: z.string(),
        tags: z.array(z.string()).default([]),
    }),
});

export const collections = { blog, slides };
