import { Loader2 } from 'lucide-react';

/**
 * Route-seviyesi yükleme durumu. Server component'ler veri çekerken kullanıcı
 * boş ekran yerine markalı bir yükleme göstergesi görür.
 */
export default function Loading() {
  return (
    <main className="flex-1 min-h-[60vh] flex items-center justify-center bg-background">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </main>
  );
}
