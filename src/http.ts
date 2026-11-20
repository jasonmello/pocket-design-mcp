const UA = "pocket-design-mcp";

export async function getText(url: string, timeoutMs = 15000): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} at ${url.replace(/key=[^&]+/, "key=***")}`);
  return res.text();
}

export async function getJson<T>(url: string, timeoutMs?: number): Promise<T> {
  return JSON.parse(await getText(url, timeoutMs)) as T;
}

// Simple in-memory cache (lives as long as the server runs).
const cache = new Map<string, Promise<unknown>>();
export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const p = load().catch((e) => {
      cache.delete(key);
      throw e;
    });
    cache.set(key, p);
  }
  return cache.get(key) as Promise<T>;
}
