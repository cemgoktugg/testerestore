import { buildLlmsFullTxt } from '../../lib/llms';

/** /llms-full.txt — tüm kategori, ürün ve rehber içeriğinin tam metni (AI asistanları için). */
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(await buildLlmsFullTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
