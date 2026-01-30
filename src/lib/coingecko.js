export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const memCache = new Map();
const inFlight = new Map();

function hashKey(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function makeStorageKey(url) {
  return `cg_cache:v3:${hashKey(url)}`;
}

function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function canUseWindow() {
  return typeof window !== "undefined" && typeof window.location?.origin === "string";
}

function toProxyUrl(inputUrl) {
  const s = String(inputUrl || "");

  if (s.startsWith("/api/cg")) return s;

  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const u = new URL(s);

      const isCoinGecko =
        (u.hostname.includes("coingecko.com") || u.hostname.includes("api.coingecko.com")) &&
        u.pathname.startsWith("/api/v3/");

      if (!isCoinGecko) return s;

      const path = u.pathname.replace("/api/v3", "");
      const proxy = new URL("/api/cg", canUseWindow() ? window.location.origin : "http://localhost");
      proxy.searchParams.set("path", path);
      u.searchParams.forEach((v, k) => proxy.searchParams.set(k, v));
      return proxy.pathname + proxy.search;
    }

    if (s.startsWith("/")) {
      const base = canUseWindow() ? window.location.origin : "http://localhost";
      const u = new URL(s, base);

      const rel = u.pathname.startsWith("/api/v3/") ? u.pathname.replace("/api/v3", "") : u.pathname;

      const looksLikeCg =
        rel.startsWith("/coins/") ||
        rel.startsWith("/coins") ||
        rel.startsWith("/simple/") ||
        rel.startsWith("/global") ||
        rel.startsWith("/search");

      if (!looksLikeCg) return s;

      const proxy = new URL("/api/cg", base);
      proxy.searchParams.set("path", rel);
      u.searchParams.forEach((v, k) => proxy.searchParams.set(k, v));
      return proxy.pathname + proxy.search;
    }
  } catch {}

  return s;
}

function toDirectCoinGeckoUrl(inputUrl) {
  const s = String(inputUrl || "");

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  try {
    if (s.startsWith("/api/cg")) {
      const base = canUseWindow() ? window.location.origin : "http://localhost";
      const u = new URL(s, base);
      const path = u.searchParams.get("path") || "";
      u.searchParams.delete("path");

      const direct = new URL(`https://api.coingecko.com/api/v3${path}`);
      u.searchParams.forEach((v, k) => direct.searchParams.set(k, v));
      return direct.toString();
    }

    if (s.startsWith("/api/v3/") || s.startsWith("/coins") || s.startsWith("/simple") || s.startsWith("/global") || s.startsWith("/search")) {
      const base = "https://api.coingecko.com/api/v3";
      return s.startsWith("/api/v3/") ? `https://api.coingecko.com${s}` : `${base}${s}`;
    }
  } catch {}

  return s;
}

async function fetchJson(url, { signal } = {}) {
  const res = await fetch(url, {
    signal,
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export async function fetchWithCache(inputUrl, ttlOrOpts = 10 * 60 * 1000, maybeOpts = {}) {
  const ttlMs = typeof ttlOrOpts === "number" ? ttlOrOpts : 10 * 60 * 1000;
  const opts = typeof ttlOrOpts === "object" ? ttlOrOpts : maybeOpts;

  const {
    signal,
    retries = 2,
    retryDelayMs = 850,
    allowStaleOnError = true,
  } = opts || {};

  const primaryUrl = toProxyUrl(inputUrl);
  const fallbackUrl = toDirectCoinGeckoUrl(primaryUrl);

  const key = makeStorageKey(primaryUrl);
  const now = Date.now();

  const mem = memCache.get(key);
  if (mem && typeof mem.t === "number" && now - mem.t < ttlMs) return mem.v;

  const stored = readStorage(key);
  const hasStored = stored && typeof stored.t === "number" && "v" in stored;
  if (hasStored && now - stored.t < ttlMs) {
    memCache.set(key, stored);
    return stored.v;
  }

  if (inFlight.has(key)) return inFlight.get(key);

  const p = (async () => {
    let lastErr = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const json = await fetchJson(primaryUrl, { signal });
        const payload = { t: Date.now(), v: json, url: primaryUrl };
        memCache.set(key, payload);
        writeStorage(key, payload);
        return json;
      } catch (e) {
        lastErr = e;

        if (e?.name === "AbortError") throw e;

        const status = e?.status;

        if (status === 404 && fallbackUrl && fallbackUrl !== primaryUrl) {
          try {
            const json = await fetchJson(fallbackUrl, { signal });
            const payload = { t: Date.now(), v: json, url: primaryUrl, direct: fallbackUrl };
            memCache.set(key, payload);
            writeStorage(key, payload);
            return json;
          } catch (e2) {
            lastErr = e2;
          }
        }

        const isRetryable =
          status === 429 || (typeof status === "number" && status >= 500) || status == null;

        if (attempt < retries && isRetryable) {
          const jitter = Math.floor(Math.random() * 200);
          await sleep(retryDelayMs * (attempt + 1) + jitter);
          continue;
        }

        break;
      }
    }

    if (allowStaleOnError && hasStored) {
      memCache.set(key, stored);
      return stored.v;
    }

    throw lastErr || new Error("Request failed");
  })();

  inFlight.set(key, p);

  try {
    return await p;
  } finally {
    inFlight.delete(key);
  }
}

export function clearCoinGeckoCache() {
  try {
    const prefix = "cg_cache:v3:";
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) localStorage.removeItem(k);
    }
  } catch {}
  memCache.clear();
  inFlight.clear();
}
