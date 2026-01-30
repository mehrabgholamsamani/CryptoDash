import { useEffect, useMemo, useRef, useState } from "react";
import { fetchWithCache, sleep } from "../lib/coingecko";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

const WATCHLIST_KEY = "cryptoDash:watchlist:v1";

const RANGE_TO_DAYS = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const COLORS = ["#5961F5", "#14B8A6", "#F59E0B", "#A855F7", "#EC4899", "#5EA0EE"];

function readWatchlistIds() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return Array.from(
      new Set(arr.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim().toLowerCase()))
    );
  } catch {
    return [];
  }
}



function formatUSD(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1000) return `$${Math.round(n).toLocaleString()}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(6)}`;
}

function formatPct(n) {
  if (!Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function calcPctSeries(values) {
  const first = values.find((v) => Number.isFinite(v) && v > 0);
  if (!Number.isFinite(first) || first <= 0) return values.map(() => null);
  return values.map((v) => {
    if (!Number.isFinite(v) || v <= 0) return null;
    return ((v / first) - 1) * 100;
  });
}

function safeForLog(values) {
  return values.map((v) => (Number.isFinite(v) && v > 0 ? v : null));
}

function labelFromTs(ts, range) {
  const d = new Date(ts);
  return range === "24h"
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString();
}

function minPositiveFromDatasets(datasets) {
  const all = [];
  for (const ds of datasets) {
    for (const v of ds.data || []) {
      if (Number.isFinite(v) && v > 0) all.push(v);
    }
  }
  return all.length ? Math.min(...all) : undefined;
}

function stdDev(nums) {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function computeVolatilityFromPrices(pricePairs) {
  const prices = pricePairs.map((p) => p[1]).filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length < 3) return 0;
  const rets = [];
  for (let i = 1; i < prices.length; i++) rets.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  return stdDev(rets) * 100;
}

function computeMaxDrawdown(pricePairs) {
  const prices = pricePairs.map((p) => p[1]).filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length < 2) return 0;
  let peak = prices[0];
  let maxDD = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (p - peak) / peak; // negative
    if (dd < maxDD) maxDD = dd;
  }
  return Math.abs(maxDD) * 100;
}

function startEndReturn(pricePairs) {
  const prices = pricePairs.map((p) => p[1]).filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length < 2) return { start: null, end: null, retPct: null };
  const start = prices[0];
  const end = prices[prices.length - 1];
  const retPct = ((end / start) - 1) * 100;
  return { start, end, retPct };
}

function Skeleton({ h = 260 }) {
  return <div className="skeleton skel-chart" style={{ height: h }} />;
}

export default function Compare({ range = "7d" }) {
  const days = RANGE_TO_DAYS[range] ?? 7;

  const [watchIds, setWatchIds] = useState(() => readWatchlistIds());
  const [selected, setSelected] = useState(() => readWatchlistIds().slice(0, 3));

  const [mode, setMode] = useState("pct"); // pct | price
  const [logScale, setLogScale] = useState(false);

  const [meta, setMeta] = useState([]); // markets meta for selected
  const [history, setHistory] = useState({}); // {id: [[ts, price], ...]}

  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");

  // keep previous successful history/meta so UI doesn't "die"
  const lastGoodRef = useRef({ meta: [], history: {} });

  const abortRef = useRef(null);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === WATCHLIST_KEY) {
        const ids = readWatchlistIds();
        setWatchIds(ids);
        setSelected((prev) => {
          const keep = prev.filter((id) => ids.includes(id));
          return keep.length ? keep : ids.slice(0, 3);
        });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (mode !== "price") setLogScale(false);
  }, [mode]);

  useEffect(() => {
    if (!selected.length) return;

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setWarning("");

      try {
        // tiny stagger (helps with burst clicking)
        await sleep(180);

        // 1) meta in ONE request
        const marketsUrl = new URL("https://api.coingecko.com/api/v3/coins/markets");
        marketsUrl.searchParams.set("vs_currency", "usd");
        marketsUrl.searchParams.set("ids", selected.join(","));
        marketsUrl.searchParams.set("order", "market_cap_desc");
        marketsUrl.searchParams.set("per_page", "250");
        marketsUrl.searchParams.set("page", "1");
        marketsUrl.searchParams.set("sparkline", "false");
        marketsUrl.searchParams.set("price_change_percentage", "24h,7d,30d,90d");

        const markets = await fetchWithCache(marketsUrl.toString(), { signal: ac.signal });
        if (cancelled) return;

        const byId = new Map((Array.isArray(markets) ? markets : []).map((x) => [x.id, x]));
        const orderedMeta = selected.map((id) => byId.get(id)).filter(Boolean);
        setMeta(orderedMeta);


        const results = await Promise.allSettled(
          selected.map(async (id) => {
            const chartUrl = new URL(`https://api.coingecko.com/api/v3/coins/${id}/market_chart`);
            chartUrl.searchParams.set("vs_currency", "usd");
            chartUrl.searchParams.set("days", String(days));
            const json = await fetchWithCache(chartUrl.toString(), { signal: ac.signal });
            return [id, Array.isArray(json?.prices) ? json.prices : []];
          })
        );

        if (cancelled) return;

        const ok = {};
        const missingIds = [];

        for (const r of results) {
          if (r.status === "fulfilled") {
            const [id, prices] = r.value;
            if (prices.length) ok[id] = prices;
          }
        }

        selected.forEach((id) => {
          if (!ok[id]) missingIds.push(id);
        });

        const hasAny = Object.keys(ok).length > 0;
        if (hasAny) {
          setHistory(ok);
          lastGoodRef.current = { meta: orderedMeta, history: ok };
        } else {
          // keep last good data if current load totally fails
          setMeta(lastGoodRef.current.meta);
          setHistory(lastGoodRef.current.history);
        }

        if (missingIds.length) {
          setWarning(
            `Some series couldn't load (likely rate limit). Missing: ${missingIds.join(", ")}. Showing what’s available.`
          );
        }
      } catch (e) {
        if (e?.name === "AbortError") return;

        setMeta(lastGoodRef.current.meta);
        setHistory(lastGoodRef.current.history);

        setWarning(
          e?.status === 429
            ? "Rate limit (429). Try again in ~30–60s or compare fewer coins."
            : "Couldn’t load compare data right now."
        );

        if (e?.status === 429) {
          await sleep(900);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [selected.join(","), days]);

  const selectableCoins = useMemo(() => watchIds, [watchIds]);

  const seriesAvailableIds = useMemo(() => {
    return selected.filter((id) => Array.isArray(history[id]) && history[id].length);
  }, [selected, history]);

  //Comparison Graph
  const chartPack = useMemo(() => {
    const firstId = seriesAvailableIds[0];
    if (!firstId) return { data: null, options: null };

    const base = history[firstId];
    const labels = base.map((p) => labelFromTs(p[0], range));

    const datasets = seriesAvailableIds.map((id, idx) => {
      const arr = history[id] || [];
      const raw = arr.map((p) => p[1]);
      const name = meta.find((m) => m.id === id)?.name || id;

      let data = raw;
      if (mode === "pct") data = calcPctSeries(raw);
      if (mode === "price" && logScale) data = safeForLog(raw);

      return {
        label: name,
        data,
        borderColor: COLORS[idx % COLORS.length],
        backgroundColor: "rgba(0,0,0,0)",
        tension: 0.28,
        pointRadius: 0,
        borderWidth: 2.5,
        spanGaps: true,
      };
    });

    const canUseLog =
      mode === "price" &&
      logScale &&
      datasets.some((ds) => (ds.data || []).some((v) => Number.isFinite(v) && v > 0));

    const minPositive = canUseLog ? minPositiveFromDatasets(datasets) : undefined;

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { boxWidth: 10, boxHeight: 10 } },
        tooltip: { mode: "index", intersect: false },
      },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { ticks: { maxTicksLimit: 8 } },
        y: {
          type: canUseLog ? "logarithmic" : "linear",
          min: canUseLog ? minPositive : undefined,
          ticks: {
            callback: (v) => (mode === "pct" ? `${Number(v).toFixed(1)}%` : formatUSD(Number(v))),
          },
        },
      },
    };

    return { data: { labels, datasets }, options };
  }, [history, meta, range, mode, logScale, seriesAvailableIds]);

  //Comparison Table (works even with partial history) 
  const compareRows = useMemo(() => {
    return selected.map((id) => {
      const m = meta.find((x) => x.id === id);
      const pairs = history[id] || [];

      const { start, end, retPct } = startEndReturn(pairs);
      const volPct = computeVolatilityFromPrices(pairs);
      const ddPct = computeMaxDrawdown(pairs);

      return {
        id,
        name: m?.name || id,
        symbol: m?.symbol ? String(m.symbol).toUpperCase() : "",
        price: Number.isFinite(m?.current_price) ? m.current_price : null,
        ch24: typeof m?.price_change_percentage_24h === "number" ? m.price_change_percentage_24h : null,
        start,
        end,
        retPct,
        volPct,
        ddPct,
        hasHistory: pairs.length > 0,
      };
    });
  }, [selected, meta, history]);

  const limitNote = selected.length > 4 ? "Select up to 4 coins for stability." : "";

  const toggleCoin = (id) => {
    setSelected((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  if (!watchIds.length) {
    return (
      <div className="emptyState">
        <b>No watchlist found</b>
        <div className="muted" style={{ marginTop: 6 }}>
          Star some coins first, then Compare will load them automatically.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="tableToolbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div className="muted small" style={{ fontWeight: 900 }}>
            Compare from Watchlist • Range: <b>{range}</b>
          </div>

          <div className="toggleGroup">
            <button
              className={`toggleBtn ${mode === "pct" ? "active" : ""}`}
              onClick={() => setMode("pct")}
              type="button"
            >
              % Performance
            </button>
            <button
              className={`toggleBtn ${mode === "price" ? "active" : ""}`}
              onClick={() => setMode("price")}
              type="button"
            >
              Price
            </button>
          </div>

          <label
            className="checkPill"
            style={{ opacity: mode === "price" ? 1 : 0.4 }}
            title={mode === "price" ? "Use log scale" : "Log scale only works in Price mode"}
          >
            <input
              type="checkbox"
              checked={logScale}
              disabled={mode !== "price"}
              onChange={(e) => setLogScale(e.target.checked)}
            />
            Log scale
          </label>

          {limitNote ? <span className="muted small">{limitNote}</span> : null}
        </div>

        <button
          className="btnPrimary"
          onClick={() => setSelected((prev) => [...prev])}
          disabled={loading}
          title="Refresh compare data"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {warning ? (
        <div className="emptyState" style={{ marginTop: 12 }}>
          <b>Some data is limited</b>
          <div className="muted" style={{ marginTop: 6 }}>{warning}</div>
        </div>
      ) : null}

      {/* Picker */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="chartTitleRow">
          <div className="chartTitle">Pick coins (from your Watchlist)</div>
          <div className="chartHint">Max 4 selected (keeps API stable)</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          {selectableCoins.map((id) => {
            const active = selected.includes(id);
            const m = meta.find((x) => x.id === id);
            return (
              <button
                key={id}
                type="button"
                className={`toggleBtn ${active ? "active" : ""}`}
                onClick={() => toggleCoin(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 12px",
                  borderRadius: 14,
                }}
                title={active ? "Remove from compare" : "Add to compare"}
              >
                <span style={{ fontWeight: 950 }}>
                  {m?.name || id}
                  <span className="muted small" style={{ marginLeft: 8 }}>
                    {m?.symbol ? String(m.symbol).toUpperCase() : ""}
                  </span>
                </span>
                <span style={{ fontWeight: 950 }}>{active ? "✓" : "+"}</span>
              </button>
            );
          })}
        </div>

        <div className="muted small" style={{ marginTop: 10 }}>
          Tip: Keep 2–4 coins selected. More coins = more API calls = higher chance of 429.
        </div>
      </div>

      {/* FEATURE 1: Graph */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="chartTitleRow">
          <div className="chartTitle">Comparison Chart</div>
          <div className="chartHint">{mode === "pct" ? "Normalized performance" : "Raw price"}</div>
        </div>

        <div className="chartWrapTall" style={{ marginTop: 10 }}>
          {loading ? (
            <Skeleton h={320} />
          ) : !chartPack.data ? (
            <div className="emptyState">
              <b>No chart data yet</b>
              <div className="muted" style={{ marginTop: 6 }}>
                Select 2–4 coins. If rate-limited, wait ~30–60s and refresh.
              </div>
            </div>
          ) : (
            <Line data={chartPack.data} options={chartPack.options} />
          )}
        </div>

        {seriesAvailableIds.length > 0 && seriesAvailableIds.length < selected.length ? (
          <div className="muted small" style={{ marginTop: 10 }}>
            Showing chart for: <b>{seriesAvailableIds.join(", ")}</b>. Some selected coins didn’t return history.
          </div>
        ) : null}
      </div>

      {/* FEATURE 2: Comparison Table */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="chartTitleRow">
          <div className="chartTitle">Comparison Summary</div>
          <div className="chartHint">Returns + risk (range: {range})</div>
        </div>

        <div className="tableWrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Coin</th>
                <th>Current</th>
                <th>24h</th>
                <th>Start</th>
                <th>End</th>
                <th>Return</th>
                <th>Volatility</th>
                <th>Max DD</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((r) => {
                const chPos = typeof r.ch24 === "number" && r.ch24 >= 0;
                const retPos = typeof r.retPct === "number" && r.retPct >= 0;

                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 900 }}>
                      {r.name}
                      <span className="muted small" style={{ marginLeft: 8 }}>
                        {r.symbol}
                      </span>
                    </td>

                    <td>{formatUSD(r.price)}</td>

                    <td className={chPos ? "pos" : "neg"}>
                      {typeof r.ch24 === "number" ? formatPct(r.ch24) : "—"}
                    </td>

                    <td>{formatUSD(r.start)}</td>
                    <td>{formatUSD(r.end)}</td>

                    <td className={retPos ? "pos" : "neg"}>
                      {typeof r.retPct === "number" ? formatPct(r.retPct) : "—"}
                    </td>

                    <td>{Number.isFinite(r.volPct) ? `${r.volPct.toFixed(2)}%` : "—"}</td>
                    <td>{Number.isFinite(r.ddPct) ? `${r.ddPct.toFixed(2)}%` : "—"}</td>

                    <td>
                      {r.hasHistory ? (
                        <span className="muted small">OK</span>
                      ) : (
                        <span className="muted small">No history</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && compareRows.every((r) => !r.hasHistory) ? (
                <tr>
                  <td colSpan={9}>
                    <div className="emptyState" style={{ margin: 10 }}>
                      <b>No history returned</b>
                      <div className="muted" style={{ marginTop: 6 }}>
                        CoinGecko likely rate-limited these requests. Wait ~30–60s and refresh.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="muted small" style={{ marginTop: 10 }}>
          Volatility is computed from simple returns across the selected range. Max DD = max peak-to-trough drawdown.
        </div>
      </div>
    </div>
  );
}
