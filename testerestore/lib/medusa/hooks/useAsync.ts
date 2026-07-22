"use client";

import { useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface AsyncOpts {
  /** Provide to enable in-memory caching + in-flight dedup for this key. */
  cacheKey?: string;
  /** Cache freshness window in ms (default 60s). */
  ttl?: number;
}

// Client-side navigasyonlar arası paylaşılan hafif cache + eşzamanlı istek
// birleştirme (dedup). Sadece cacheKey verilen çağrılar için devreye girer;
// cacheKey'siz çağrılar eskisiyle bire bir aynı davranır.
const _cache = new Map<string, { data: unknown; ts: number }>();
const _inflight = new Map<string, Promise<unknown>>();
const DEFAULT_TTL = 60_000;

/**
 * Tiny async data hook with cancellation, optional caching + dedup.
 *
 * The `tick` ref guards against race conditions when deps change while a
 * fetch is in flight. With `opts.cacheKey`, a fresh cached value is served
 * without a refetch, and concurrent identical fetches share one promise.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: ReadonlyArray<any> = [],
  opts: AsyncOpts = {}
): AsyncState<T> & { refetch: () => void } {
  const { cacheKey, ttl = DEFAULT_TTL } = opts;

  // Seed initial state from a fresh cache hit → no skeleton flash on revisit.
  const seeded = cacheKey ? _cache.get(cacheKey) : undefined;
  const seededFresh = seeded && Date.now() - seeded.ts < ttl;

  const [state, setState] = useState<AsyncState<T>>(
    seededFresh
      ? { data: seeded!.data as T, loading: false, error: null }
      : { data: null, loading: true, error: null }
  );
  const [refetchTick, setRefetchTick] = useState(0);
  const tick = useRef(0);

  useEffect(() => {
    const myTick = ++tick.current;
    let cancelled = false;

    // Fresh cache → serve immediately, skip network (unless manual refetch).
    if (cacheKey && refetchTick === 0) {
      const c = _cache.get(cacheKey);
      if (c && Date.now() - c.ts < ttl) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ data: c.data as T, loading: false, error: null });
        return;
      }
    }

    setState((s) => (s.loading ? s : { ...s, loading: true, error: null }));

    // Dedup concurrent identical fetches by cacheKey.
    let p: Promise<T>;
    if (cacheKey) {
      const existing = _inflight.get(cacheKey) as Promise<T> | undefined;
      if (existing) {
        p = existing;
      } else {
        p = fn();
        _inflight.set(cacheKey, p as Promise<unknown>);
      }
    } else {
      p = fn();
    }

    p.then((data) => {
      if (cacheKey) {
        _cache.set(cacheKey, { data, ts: Date.now() });
        _inflight.delete(cacheKey);
      }
      if (cancelled || tick.current !== myTick) return;
      setState({ data, loading: false, error: null });
    }).catch((err: unknown) => {
      if (cacheKey) _inflight.delete(cacheKey);
      if (cancelled || tick.current !== myTick) return;
      const e = err instanceof Error ? err : new Error(String(err));
      setState({ data: null, loading: false, error: e });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refetchTick]);

  return {
    ...state,
    refetch: () => {
      if (cacheKey) _cache.delete(cacheKey);
      setRefetchTick((n) => n + 1);
    },
  };
}
