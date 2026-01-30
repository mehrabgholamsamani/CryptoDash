// api/cg.js
// Vercel Serverless Function: CoinGecko proxy with:
// - allowlist of paths (security)
// - in-memory cache (helps a ton in vercel dev / local)
// - stale fallback on 429/5xx (it keeps the app usable)
// - CDN cache header for production

const CACHE = new Map(); // key -> { t, bodyText, contentType }
const TTL_MS = 60_000; // fresh for 60s
const STALE_MS = 10 * 60_000; // serve stale up to 10 min on 429/5xx

function buildUpstreamUrl(path, qs) {
  const url = new URL("https://api.coingecko.com/api/v3" + path);
  for (const [k, v] of Object.entries(qs || {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  return url;
}

function isAllowedPath(path) {
  const allowedPrefixes = [
    "/ping",
    "/coins/markets",
    "/coins/",
    "/simple/price",
    "/global",
    "/search/trending",
    "/search",
  ];
  return allowedPrefixes.some((p) => path.startsWith(p));
}

export default async function handler(req, res) {
  try {
    const query = req.query || {};
    const { path = "", ...qs } = query;

    const safePath = String(path);

    if (!safePath.startsWith("/")) {
      return res.status(400).json({ error: "Invalid path (must start with /)", path: safePath });
    }

    if (!isAllowedPath(safePath)) {
      return res.status(400).json({ error: "Path not allowed", path: safePath });
    }

    const upstreamUrl = buildUpstreamUrl(safePath, qs);
    const key = upstreamUrl.toString();
    const now = Date.now();
    const hit = CACHE.get(key);


    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=600");


    if (hit && now - hit.t < TTL_MS) {
      res.setHeader("Content-Type", hit.contentType || "application/json");
      res.setHeader("X-Proxy-Cache", "HIT");
      return res.status(200).send(hit.bodyText);
    }

    const upstream = await fetch(key, {
      headers: {
        accept: "application/json",
        "user-agent": "crypto-dashboard-proxy",
      },
    });

    const bodyText = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";

    if (upstream.ok) {
      CACHE.set(key, { t: now, bodyText, contentType });
      res.setHeader("Content-Type", contentType);
      res.setHeader("X-Proxy-Cache", "MISS");
      return res.status(200).send(bodyText);
    }


    if ((upstream.status === 429 || upstream.status >= 500) && hit && now - hit.t < STALE_MS) {
      res.setHeader("Content-Type", hit.contentType || "application/json");
      res.setHeader("X-Proxy-Cache", "STALE");
      return res.status(200).send(hit.bodyText);
    }


    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Proxy-Cache", "BYPASS");
    return res.status(upstream.status).send(bodyText);
  } catch (err) {
    return res.status(500).json({
      error: "Proxy error",
      detail: String(err?.message || err),
    });
  }
}
