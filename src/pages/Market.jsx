import { useEffect, useMemo, useState } from "react";
import { fetchWithCache } from "../lib/coingecko";
import MarketMiniCards from "../components/MarketMiniCards";
import MultiCoinLineChart from "../components/MultiCoinLineChart";
import VolumeBarChart from "../components/VolumeBarChart";
import MarketBreadth from "../components/MarketBreadth";
import VolatilitySnapshot from "../components/VolatilitySnapshot";

const TOP_COINS = ["bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano"];

const RANGE_TO_PCT_PARAM = {
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
};

function getChangeForRange(coin, range) {
  if (range === "24h") return coin.price_change_percentage_24h;
  const key = `price_change_percentage_${range}_in_currency`;
  return typeof coin[key] === "number" ? coin[key] : null;
}

function stdDev(nums) {
  if (!nums.length) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

// We compute volatility from a simple price series (numbers)
function computeVolatilityFromSeries(prices) {
  const clean = (prices || []).filter((n) => typeof n === "number" && n > 0);
  if (clean.length < 3) return 0;

  const rets = [];
  for (let i = 1; i < clean.length; i++) rets.push((clean[i] - clean[i - 1]) / clean[i - 1]);
  return stdDev(rets) * 100;
}

export default function Market({ onSelectCoin, range, watchlistApi }) {
  const [coins, setCoins] = useState([]);
  const [loadingCoins, setLoadingCoins] = useState(true);

  // Instead of history market_chart calls, we use sparkline from markets:
  // { coinId: [price, price, ...] }
  const [sparkSeries, setSparkSeries] = useState({});
  const [warning, setWarning] = useState("");
  const [error, setError] = useState(null);

  const [breadthUniverse, setBreadthUniverse] = useState([]);
  const [loadingBreadth, setLoadingBreadth] = useState(true);

  const pctParam = RANGE_TO_PCT_PARAM[range] ?? "24h";

  // 1) Fetch top coins (single request) WITH sparkline
  useEffect(() => {
    let cancelled = false;

    async function loadCoins() {
      try {
        setLoadingCoins(true);
        setError(null);
        setWarning("");

        const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
        url.searchParams.set("vs_currency", "usd");
        url.searchParams.set("ids", TOP_COINS.join(","));
        url.searchParams.set("order", "market_cap_desc");
        url.searchParams.set("per_page", "6");
        url.searchParams.set("page", "1");
        url.searchParams.set("sparkline", "true"); // ✅ key change
        url.searchParams.set("price_change_percentage", "24h,7d,30d,90d");

        const json = await fetchWithCache(url.toString(), 60 * 1000, {
          retries: 1,
          allowStaleOnError: true,
        });

        const ordered = TOP_COINS.map((id) => json.find((x) => x.id === id)).filter(Boolean);

        if (cancelled) return;

        setCoins(ordered);

        // Build series from sparkline (7d only)
        const series = {};
        for (const c of ordered) {
          const arr = c?.sparkline_in_7d?.price;
          if (Array.isArray(arr) && arr.length) series[c.id] = arr;
        }
        setSparkSeries(series);

        // If you choose 24h/30d/90d, we still show the 7d sparkline
        // but we show a small warning so user understands.
        if (range !== "7d") {
          setWarning("Market chart uses 7d sparkline for stability (CoinGecko rate limits heavy chart endpoints).");
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.status === 429 ? "Market API error: 429 (rate limited)" : (e?.message || "Failed to load market data")
          );
        }
      } finally {
        if (!cancelled) setLoadingCoins(false);
      }
    }

    loadCoins();
    return () => { cancelled = true; };
  }, [range]);

  // 2) Breadth universe (top 50) — keep as-is but cache and tolerate limits
  useEffect(() => {
    let cancelled = false;

    async function loadBreadth() {
      try {
        setLoadingBreadth(true);

        const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
        url.searchParams.set("vs_currency", "usd");
        url.searchParams.set("order", "market_cap_desc");
        url.searchParams.set("per_page", "50");
        url.searchParams.set("page", "1");
        url.searchParams.set("sparkline", "false");
        url.searchParams.set("price_change_percentage", pctParam);

        const json = await fetchWithCache(url.toString(), 2 * 60 * 1000, {
          retries: 1,
          allowStaleOnError: true,
        });

        if (!cancelled) setBreadthUniverse(Array.isArray(json) ? json : []);
      } catch (e) {
        if (!cancelled) {
          setWarning((prev) =>
            prev || (e?.status === 429
              ? "Breadth data rate-limited (429). Using cached/partial data."
              : "Breadth data unavailable (cached/partial).")
          );
        }
      } finally {
        if (!cancelled) setLoadingBreadth(false);
      }
    }

    loadBreadth();
    return () => { cancelled = true; };
  }, [pctParam]);

  // ✅ build chart model based on sparkline series
  const chartModel = useMemo(() => {
    // pick a coin with sparkline for label length
    const firstAvail = TOP_COINS.find((id) => Array.isArray(sparkSeries[id]) && sparkSeries[id].length);
    const base = firstAvail ? sparkSeries[firstAvail] : [];

    // sparkline points are evenly spaced over 7d; we can label them roughly
    // keep it simple: show fewer labels by using index-based markers
    const labels = base.map((_, i) => {
      // show label every ~12 points
      if (i % 12 !== 0) return "";
      return "•";
    });

    const seriesByCoin = {};
    for (const id of TOP_COINS) {
      seriesByCoin[id] = (sparkSeries[id] || []).slice(); // numeric series
    }

    return { labels, seriesByCoin };
  }, [sparkSeries]);

  const breadth = useMemo(() => {
    const total = breadthUniverse.length || 0;
    if (!total) return { upPct: 0, downPct: 0, upCount: 0, downCount: 0, total: 0 };

    let upCount = 0;
    let downCount = 0;

    for (const c of breadthUniverse) {
      const ch = getChangeForRange(c, range);
      if (typeof ch !== "number") continue;
      if (ch >= 0) upCount++;
      else downCount++;
    }

    const considered = upCount + downCount;
    const upPct = considered ? (upCount / considered) * 100 : 0;
    const downPct = considered ? (downCount / considered) * 100 : 0;

    return { upPct, downPct, upCount, downCount, total: considered };
  }, [breadthUniverse, range]);

  const volatilityRows = useMemo(() => {
    const rows = TOP_COINS.map((id) => {
      const prices = sparkSeries[id] || [];
      const volPct = computeVolatilityFromSeries(prices);
      const meta = coins.find((c) => c.id === id);

      return { id, name: meta?.name || id, volPct: Number.isFinite(volPct) ? volPct : 0 };
    });

    return rows.sort((a, b) => b.volPct - a.volPct);
  }, [sparkSeries, coins]);

  //  Only show "total error" if the whole page is dead.
  if (error && !coins.length) {
    return (
      <div className="emptyState">
        <b>Couldn’t load Market Overview</b>
        <div className="muted" style={{ marginTop: 6 }}>{error}</div>
        <div className="muted small" style={{ marginTop: 10 }}>
          CoinGecko can rate-limit sometimes. With the proxy, cached data should appear soon.
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      {warning ? (
        <div className="emptyState" style={{ marginBottom: 12 }}>
          <b>Some data is limited</b>
          <div className="muted" style={{ marginTop: 6 }}>{warning}</div>
        </div>
      ) : null}

      {/* Top mini cards */}
      <MarketMiniCards
        coins={coins}
        loading={loadingCoins}
        onSelectCoin={onSelectCoin}
        watchlistApi={watchlistApi}
        range={range}
      />

      {/* Charts row */}
      <div className="marketChartsRow">
        <div className="card" style={{ minHeight: 360 }}>
          <div className="chartTitleRow">
            <div className="chartTitle">Market Overview</div>
            <div className="chartHint">
              Multi-coin trend (uses 7d sparkline for stability)
            </div>
          </div>

          <div style={{ height: 300 }}>
            <MultiCoinLineChart
              labels={chartModel.labels}
              seriesByCoin={chartModel.seriesByCoin}
              loading={loadingCoins}
            />
          </div>
        </div>

        <div className="card" style={{ minHeight: 360 }}>
          <div className="chartTitleRow">
            <div className="chartTitle">Volume</div>
            <div className="chartHint">24h liquidity</div>
          </div>

          <div style={{ height: 300 }}>
            <VolumeBarChart coins={coins} loading={loadingCoins} />
          </div>
        </div>
      </div>

      {/* Analytics row */}
      <div className="analyticsRow">
        <MarketBreadth loading={loadingBreadth} range={range} breadth={breadth} />
        <VolatilitySnapshot loading={loadingCoins} range={range} rows={volatilityRows} />
      </div>

      {/* Table */}
      <div className="card">
        <div className="chartTitleRow">
          <div className="chartTitle">Top Coins</div>
          <div className="chartHint">Click a row for details</div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Coin</th>
              <th>Price</th>
              <th>24h</th>
              <th>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((c) => {
              const ch = c.price_change_percentage_24h;
              const isPos = typeof ch === "number" && ch >= 0;

              return (
                <tr key={c.id} onClick={() => onSelectCoin?.(c.id)}>
                  <td style={{ fontWeight: 900 }}>
                    {c.name}
                    <span className="muted small" style={{ marginLeft: 6 }}>
                      {String(c.symbol || "").toUpperCase()}
                    </span>
                  </td>
                  <td>${Number(c.current_price).toLocaleString()}</td>
                  <td className={isPos ? "pos" : "neg"}>
                    {typeof ch === "number" ? ch.toFixed(2) : "—"}%
                  </td>
                  <td>${Number(c.market_cap).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
