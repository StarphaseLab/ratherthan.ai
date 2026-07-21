import adapter from '@sveltejs/adapter-cloudflare'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // platformProxy makes `vite dev` serve real local D1/KV via miniflare,
    // so local development needs no Cloudflare account at all.
    adapter: adapter({
      platformProxy: { configPath: 'wrangler.jsonc' },
    }),
  },
}

export default config
