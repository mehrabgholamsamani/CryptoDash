import { fetchWithCache } from "./coingecko";

export function cg(path, params = {}, ttlMs, opts) {

  const url = new URL("https://api.coingecko.com/api/v3" + path);

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  
  return fetchWithCache(url.toString(), ttlMs, opts);
}
