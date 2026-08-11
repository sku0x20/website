// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'https://www.sku20.dev',
    markdown: {
        shikiConfig: {
            theme: 'css-variables',
        },
    },
});
