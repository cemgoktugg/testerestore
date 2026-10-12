import { buildLlmsTxt } from '../../lib/llms';

/**
 * /llms.txt — AI asistanları için sitenin özeti (https://llmstxt.org).
 * Her istekte canlı veriden üretilir (build sırasında backend kapalıysa
 * ürünsüz cache'lenmesin diye).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(await buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
