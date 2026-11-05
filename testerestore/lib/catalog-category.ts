interface CategoryNode {
  id: string;
  handle?: string | null;
  parent_category_id?: string | null;
}

/** Include newly created descendants without hard-coding every child handle. */
export function categoryIdsForHandles(categories: CategoryNode[], handles: readonly string[]): string[] {
  const ids = new Set(categories.filter((c) => c.handle && handles.includes(c.handle)).map((c) => c.id));
  let previousSize = -1;
  while (previousSize !== ids.size) {
    previousSize = ids.size;
    for (const category of categories) {
      if (category.parent_category_id && ids.has(category.parent_category_id)) ids.add(category.id);
    }
  }
  return [...ids];
}

/** Categories assigned directly to a product, plus their ancestors. */
export function productCategoryHandles(categories: CategoryNode[], assigned: CategoryNode[]): string[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const handles = new Set<string>();
  const visited = new Set<string>();
  for (const category of assigned) {
    let current: CategoryNode | undefined = byId.get(category.id) ?? category;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.handle) handles.add(current.handle);
      current = current.parent_category_id ? byId.get(current.parent_category_id) : undefined;
    }
  }
  return [...handles];
}
