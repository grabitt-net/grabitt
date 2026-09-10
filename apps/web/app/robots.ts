import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.grabitt.net'

// While the pre-launch lockdown is on, tell crawlers to stay away entirely so
// the holding page never gets indexed. Once live, allow the public marketplace
// but keep private/functional areas out of the index.
export default function robots(): MetadataRoute.Robots {
  if (process.env.MAINTENANCE_MODE === '1') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  const disallow = ['/admin', '/account', '/api/', '/auth', '/orders', '/profile']
  // Explicitly welcome the major AI/answer-engine crawlers so Grabitt can be
  // read, understood and recommended by ChatGPT, Claude, Perplexity, Gemini,
  // etc. (some are blocked by default on other sites — we opt in).
  const aiBots = [
    'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',       // OpenAI
    'ClaudeBot', 'Claude-Web', 'anthropic-ai',        // Anthropic
    'PerplexityBot', 'Perplexity-User',               // Perplexity
    'Google-Extended',                                // Google (Gemini/AI Overviews)
    'Applebot-Extended',                              // Apple Intelligence
    'CCBot',                                          // Common Crawl (LLM training)
    'Amazonbot', 'Bytespider', 'meta-externalagent',  // Amazon / TikTok / Meta AI
  ]
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...aiBots.map(userAgent => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
