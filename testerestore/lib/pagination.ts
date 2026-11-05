export interface PageResult<T> {
  items: T[];
  count?: number;
}

/** Follow the server's count, including when its effective page size is smaller. */
export async function collectAllPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<PageResult<T>>,
  pageSize = 100,
): Promise<T[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) throw new Error("Geçersiz sayfa boyutu.");
  const items: T[] = [];
  let offset = 0;
  while (true) {
    const page = await fetchPage(offset, pageSize);
    if (!page.items.length) {
      if (page.count !== undefined && offset < page.count) {
        throw new Error("Liste tamamlanamadı. Lütfen tekrar deneyin.");
      }
      return items;
    }
    items.push(...page.items);
    offset += page.items.length;
    if (page.count !== undefined ? offset >= page.count : page.items.length < pageSize) {
      return items;
    }
  }
}

export function parsePage(value: string | null | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
