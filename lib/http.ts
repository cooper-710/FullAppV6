import { setTimeout as delay } from 'timers/promises';

type FetchOpts = {
  timeoutMs?: number;
  retries?: number;
  ttlMs?: number;
  headers?: Record<string, string>;
  cacheKey?: string;
};

const mem = new Map<string, { t: number; v: any }>();

export async function httpJSON<T = any>(url: string, opts: FetchOpts = {}): Promise<T> {
  const { timeoutMs = 12000, retries = 2, ttlMs = 60000, headers = {}, cacheKey } = opts;
  const key = cacheKey ?? `${url}|${JSON.stringify(headers)}`;
  const hit = mem.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(to);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      mem.set(key, { t: Date.now(), v: json });
      return json;
    } catch (err) {
      clearTimeout(to);
      lastErr = err;
      if (i < retries) await delay(300 * (i + 1));
    }
  }
  throw lastErr;
}
