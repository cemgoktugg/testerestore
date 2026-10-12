import { Loader2 } from 'lucide-react';

/**
 * Segment yükleme göstergesi. KÖKE (app/loading.tsx) KONMAZ: kök loading tüm
 * sayfaları streaming'e sokar ve notFound() 404 yerine 200 döner (soft-404).
 * Sadece useSearchParams kullanan, indekslenmeyen segmentlerde re-export edilir.
 */
export default function RouteLoading() {
  return (
    <main className="flex-1 min-h-[60vh] flex items-center justify-center bg-background">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </main>
  );
}
