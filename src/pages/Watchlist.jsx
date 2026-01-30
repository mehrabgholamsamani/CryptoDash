import { fetchWithCache, sleep } from "../lib/coingecko";
import { useEffect, useMemo, useRef, useState } from "react";

function formatUSD(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1000) return `$${Math.round(n).toLocaleString()}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(6)}`;
}



export default function Watchlist({ watchlistApi, onSelectCoin }) {
  // ✅ sanitize IDs: no nulls, no duplicates, limit length
  const ids = useMemo(() => {
    const raw = watchlistApi?.watchlist || [];
    const clean = raw
      .filter((x) => typeof x === "string" && x.trim().length)
      .map((x) => x.trim().toLowerCase());
    return Array.from(new Set(clean)).slice(0, 60);
  }, [watchlistApi?.watchlist]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ non-blocking message (banner style)
  const [warning, setWarning] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("mcap"); // mcap, price, change, vol
  const [sortDir, setSortDir] = useState("desc");

  const abortRef = useRef(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let data = rows;

    if (needle) {
      data = data.filter((r) => {
        const hay = `${r.name} ${r.symbol}`.toLowerCase();
        return hay.includes(needle);
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;

    const pick = (r) => {
      if (sortKey === "price") return r.current_price;
      if (sortKey === "change") return r.price_change_percentage_24h;
      if (sortKey === "vol") return r.total_volume;
      return r.market_cap;
    };

    return [...data].sort((a, b) => {
      const av = pick(a);
      const bv = pick(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    });
  }, [rows, q, sortKey, sortDir]);

  async function load({ force = false } = {}) {
    if (!ids.length) {
      setRows([]);
      setWarning("");
      setLastUpdated(null);
      return;
    }

    // cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setWarning("");

    try {
      const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
      url.searchParams.set("vs_currency", "usd");
      url.searchParams.set("ids", ids.join(","));
      url.searchParams.set("order", "market_cap_desc");
      url.searchParams.set("per_page", "250");
      url.searchParams.set("page", "1");
      url.searchParams.set("sparkline", "false");
      url.searchParams.set("price_change_percentage", "24h");

      // ✅ Force bypass: add a cache-buster if requested
      if (force) url.searchParams.set("_t", String(Date.now()));

      const json = await fetchJson(url.toString(), { signal: ac.signal });

      // preserve order of ids (optional)
      const byId = new Map((Array.isArray(json) ? json : []).map((x) => [x.id, x]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

      setRows(ordered);
      setLastUpdated(new Date());
    } catch (e) {
      // ✅ If aborted, ignore
      if (e?.name === "AbortError") return;

      // ✅ Keep old rows, show warning banner instead of "dead watchlist"
      if (e?.status === 429) {
        setWarning("Rate limit (429). Watchlist will refresh automatically when available — try again in ~30–60s.");
      } else {
        setWarning("Couldn’t refresh watchlist right now. Showing last loaded data.");
      }

      // Optional: tiny auto-retry for 429 (once)
      if (e?.status === 429) {
        await sleep(900);
        try {
          if (!ac.signal.aborted) {
            const retryUrl = new URL("https://api.coingecko.com/api/v3/coins/markets");
            retryUrl.searchParams.set("vs_currency", "usd");
            retryUrl.searchParams.set("ids", ids.join(","));
            retryUrl.searchParams.set("order", "market_cap_desc");
            retryUrl.searchParams.set("per_page", "250");
            retryUrl.searchParams.set("page", "1");
            retryUrl.searchParams.set("sparkline", "false");
            retryUrl.searchParams.set("price_change_percentage", "24h");
            retryUrl.searchParams.set("_t", String(Date.now()));

            const json2 = await fetchJson(retryUrl.toString(), { signal: ac.signal });
            const byId2 = new Map((Array.isArray(json2) ? json2 : []).map((x) => [x.id, x]));
            const ordered2 = ids.map((id) => byId2.get(id)).filter(Boolean);

            setRows(ordered2);
            setLastUpdated(new Date());
            setWarning("");
          }
        } catch {
          // ignore retry failure
        }
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }

  // ✅ Debounce fetching when user stars/unstars quickly
  useEffect(() => {
    let t = null;
    t = setTimeout(() => load({ force: false }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  // UI empty state
  if (!ids.length) {
    return (
      <div className="emptyState">
        <b>No coins in your watchlist yet</b>
        <div className="muted" style={{ marginTop: 6 }}>
          Star coins from <b>Market Overview</b> or <b>Coin Details</b>.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="tableToolbar">
        <input
          className="input"
          placeholder="Search watchlist…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select className="select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="mcap">Sort: Market Cap</option>
          <option value="price">Sort: Price</option>
          <option value="change">Sort: 24h %</option>
          <option value="vol">Sort: Volume</option>
        </select>

        <button className="btnGhost" onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}>
          {sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
        </button>

        <button className="btnPrimary" onClick={() => load({ force: true })} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>

        <button className="btnGhost" onClick={() => watchlistApi?.clear?.()} title="Clear all">
          Clear
        </button>
      </div>

      {/* warning banner  */}
      {warning && (
        <div className="emptyState" style={{ marginTop: 12 }}>
          <b>Watchlist update issue</b>
          <div className="muted" style={{ marginTop: 6 }}>{warning}</div>
        </div>
      )}

      {lastUpdated && (
        <div className="muted small" style={{ marginTop: 10 }}>
          Last updated: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      <div className="tableWrap" style={{ marginTop: 10 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Coin</th>
              <th>Price</th>
              <th>24h %</th>
              <th>Volume</th>
              <th>Market Cap</th>
              <th style={{ width: 180 }}></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => {
              const pos = typeof r.price_change_percentage_24h === "number" && r.price_change_percentage_24h >= 0;

              return (
                <tr key={r.id}>
                  <td>
                    <div className="coinCell">
                      <img className="coinImg" src={r.image} alt="" />
                      <div>
                        <div className="coinName">{r.name}</div>
                        <div className="muted small">{String(r.symbol).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>

                  <td><b>{formatUSD(r.current_price)}</b></td>

                  <td className={pos ? "pos" : "neg"}>
                    <b>
                      {typeof r.price_change_percentage_24h === "number"
                        ? r.price_change_percentage_24h.toFixed(2)
                        : "—"}%
                    </b>
                  </td>

                  <td>{formatUSD(r.total_volume)}</td>
                  <td>{formatUSD(r.market_cap)}</td>

                  <td>
                    <div className="rowActions">
                      <button className="btnGhost" onClick={() => onSelectCoin?.(r.id)}>
                        Open
                      </button>
                      <button
                        className="btnGhost"
                        onClick={() => watchlistApi?.remove?.(r.id)}
                        title="Remove"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* If API is limited AND rows are empty, at least  show something helpful */}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={6}>
                  <div className="emptyState" style={{ margin: 10 }}>
                    <b>No data loaded yet</b>
                    <div className="muted" style={{ marginTop: 6 }}>
                      This can happen if CoinGecko rate-limits. Click Refresh in 30–60s.
                    </div>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
