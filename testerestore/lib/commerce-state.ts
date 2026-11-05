interface BladeSelection {
  blade_type: string;
  width_mm: number;
  thickness_mm: number;
  tooth_pitch?: string | null;
  length_mm: number;
  quantity?: number;
}

/** A quote can be used only for the exact selection and quantity it priced. */
export function bladeQuoteMatches(quote: BladeSelection | null, selection: BladeSelection) {
  return !!quote && quote.blade_type === selection.blade_type &&
    quote.width_mm === selection.width_mm && quote.thickness_mm === selection.thickness_mm &&
    (quote.tooth_pitch || null) === (selection.tooth_pitch || null) &&
    quote.length_mm === selection.length_mm && (quote.quantity ?? 1) === (selection.quantity ?? 1);
}

/** Serialize cart writes; a failed write must not poison later operations. */
export function createMutationQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = tail.then(operation);
    tail = next.then(() => undefined, () => undefined);
    return next;
  };
}
