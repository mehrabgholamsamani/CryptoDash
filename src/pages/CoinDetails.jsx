import { useEffect, useMemo, useState } from "react";
import CoinPerformanceCard from "../components/CoinPerformanceCard";
import TokenomicsDonut from "../components/TokenomicsDonut";
import IndicatorsPanel from "../components/IndicatorsPanel";
import StarButton from "../components/StarButton";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";

import { fetchWithCache, sleep } from "../lib/coingecko";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip,
  Filler,
  Legend
);

const RANGE_TO_DAYS = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function ChartSkeleton() {
  return <div className="skeleton skel-chart" />;
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

function formatNumber(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return Math.round(n).toLocaleString();
}

function sma(values, period) {
  const out = Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    out[i] = avg;
  }
  return out;
}

function safeForLog(arr) {
  return arr.map((v) => (typeof v === "number" && v > 0 ? v : null));
}

export default function CoinDetails({ coinId, range, watchlistApi }) {
  const [coin, setCoin] = useState(null);

  // chart prices
  const [prices, setPrices] = useState([]); // [[ts, price]]
  const [loadingCoin, setLoadingCoin] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);

  const [warning, setWarning] = useState("");

  const [showMA, setShowMA] = useState(true);
  const [logScale, setLogScale] = useState(false);

  const days = RANGE_TO_DAYS[range] ?? 7;

  useEffect(() => {
    if (!coinId) return;

    let cancelled = false;
    setLoadingCoin(true);
    setWarning("");

    async function loadCoin() {
      try {
        await sleep(80);
        if (cancelled) return;

        const coinUrl = new URL(`https://api.coingecko.com/api/v3/coins/${coinId}`);
        coinUrl.searchParams.set("localization", "false");
        coinUrl.searchParams.set("tickers", "false");
        coinUrl.searchParams.set("market_data", "true");
        coinUrl.searchParams.set("community_data", "false");
        coinUrl.searchParams.set("developer_data", "false");
        coinUrl.searchParams.set("sparkline", "false");

        const coinJson = await fetchWithCache(coinUrl.toString(), 5 * 60 * 1000, {
          retries: 1,
          allowStaleOnError: true,
        });

        if (cancelled) return;
        setCoin(coinJson);
      } catch (e) {
        if (!cancelled) {
          setWarning(
            e?.status === 429
              ? "Rate limit hit. Showing cached/partial data if available."
              : "Couldn’t load full coin details right now."
          );
          // basically this doesnt nuke existing coin data, i had issues with it before
        }
      } finally {
        if (!cancelled) setLoadingCoin(false);
      }
    }

    loadCoin();
    return () => {
      cancelled = true;
    };
  }, [coinId]);

  // 2) Load chart (heavy) — delay + much longer TTL, and don't kill the page if it fails, also i had issues with this before
  useEffect(() => {
    if (!coinId) return;

    let cancelled = false;
    setLoadingChart(true);

    async function loadChart() {
      try {
        //  delay prevents burst + lets UI render coin info first
        await sleep(350);
        if (cancelled) return;

        const chartUrl = new URL(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`);
        chartUrl.searchParams.set("vs_currency", "usd");
        chartUrl.searchParams.set("days", String(days));

        const chartJson = await fetchWithCache(chartUrl.toString(), 15 * 60 * 1000, {
          retries: 1,
          allowStaleOnError: true,
        });

        if (cancelled) return;

        const p = Array.isArray(chartJson?.prices) ? chartJson.prices : [];
        setPrices(p);
        if (!p.length) {
          setWarning((w) => w || "Chart data is currently unavailable (cached may appear later).");
        }
      } catch (e) {
        if (!cancelled) {
          setWarning((w) =>
            w ||
            (e?.status === 429
              ? "Chart rate-limited. Showing coin metrics without the chart (cached chart may appear later)."
              : "Chart unavailable right now. Metrics still shown.")
          );
          //  Don’t wipe existing prices; keep whatever was last loaded
        }
      } finally {
        if (!cancelled) setLoadingChart(false);
      }
    }

    loadChart();
    return () => {
      cancelled = true;
    };
  }, [coinId, days]);

  const derived = useMemo(() => {
    const md = coin?.market_data;

    const current = md?.current_price?.usd;
    const change24h = md?.price_change_percentage_24h;
    const high24h = md?.high_24h?.usd;
    const low24h = md?.low_24h?.usd;

    const mcap = md?.market_cap?.usd;
    const vol = md?.total_volume?.usd;
    const volToMcap =
      Number.isFinite(vol) && Number.isFinite(mcap) && mcap > 0 ? vol / mcap : null;

    const ath = md?.ath?.usd;
    const athChange = md?.ath_change_percentage?.usd;

    const circ = md?.circulating_supply;
    const total = md?.total_supply;
    const max = md?.max_supply;

    const supplyPct =
      Number.isFinite(circ) && Number.isFinite(max) && max > 0 ? (circ / max) * 100 : null;

    const series = prices.map((p) => p[1]).filter((v) => typeof v === "number");
    const rangeHigh = series.length ? Math.max(...series) : null;
    const rangeLow = series.length ? Math.min(...series) : null;

    return {
      current,
      change24h,
      high24h,
      low24h,
      mcap,
      vol,
      volToMcap,
      ath,
      athChange,
      circ,
      total,
      max,
      supplyPct,
      rangeHigh,
      rangeLow,
    };
  }, [coin, prices]);

  const chart = useMemo(() => {
    const labels = prices.map((p) => {
      const d = new Date(p[0]);
      return range === "24h"
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString();
    });

    const raw = prices.map((p) => p[1]);
    const priceData = logScale ? safeForLog(raw) : raw;

    // MA computed on raw (numbers only) this part was mostly written by claude code
    const rawNums = raw.filter((v) => typeof v === "number");
    const ma20 = sma(rawNums, 20);
    const ma50 = sma(rawNums, 50);

    const series = rawNums;
    const hi = series.length ? Math.max(...series) : null;
    const lo = series.length ? Math.min(...series) : null;

    const hiLine = hi ? raw.map(() => hi) : raw.map(() => null);
    const loLine = lo ? raw.map(() => lo) : raw.map(() => null);

    const datasets = [
      {
        label: "Price",
        data: priceData,
        borderColor: "#5961F5",
        backgroundColor: "rgba(89,97,245,0.14)",
        tension: 0.35,
        fill: true,
        pointRadius: 0,
        spanGaps: true,
      },
      {
        label: "Range High",
        data: hiLine,
        borderColor: "rgba(94,160,238,0.85)",
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        spanGaps: true,
      },
      {
        label: "Range Low",
        data: loLine,
        borderColor: "rgba(94,160,238,0.55)",
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        spanGaps: true,
      },
    ];

    if (showMA) {
      datasets.push(
        {
          label: "MA20",
          data: ma20,
          borderColor: "rgba(16,185,129,0.85)",
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
          fill: false,
          spanGaps: true,
        },
        {
          label: "MA50",
          data: ma50,
          borderColor: "rgba(245,158,11,0.85)",
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 0,
          fill: false,
          spanGaps: true,
        }
      );
    }

    const hasPositive = raw.some((v) => typeof v === "number" && v > 0);
    const canUseLog = logScale && hasPositive;
    const minPositive = hasPositive
      ? Math.min(...raw.filter((v) => typeof v === "number" && v > 0))
      : undefined;

    return {
      labels,
      raw,
      ma20,
      data: { labels, datasets },
      options: {
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
            ticks: { callback: (v) => formatUSD(Number(v)) },
          },
        },
      },
    };
  }, [prices, range, showMA, logScale]);

  const name = coin?.name || coinId;
  const symbol = coin?.symbol ? String(coin.symbol).toUpperCase() : "";
  const logo = coin?.image?.small || coin?.image?.thumb;

  const changePos = typeof derived.change24h === "number" && derived.change24h >= 0;


  return (
    <>
      <div className="coinDetailsLayout">
        <div className="card">
          {warning && (
            <div className="emptyState" style={{ marginBottom: 12 }}>
              <b>Some data is limited</b>
              <div className="muted" style={{ marginTop: 6 }}>{warning}</div>
            </div>
          )}

          <div className="coinHeaderRow">
            <div className="coinTitleBlock">
              <div className="coinTitleLogo">
                {logo ? <img src={logo} alt={`${name} logo`} /> : "🪙"}
              </div>

              <div className="coinTitleText">
                <h2>
                  {name}{" "}
                  <span className="muted small" style={{ marginLeft: 8 }}>
                    {symbol} • {range}
                  </span>
                </h2>
                <div className="mutedLine">
                  Current: <span className="coinPriceBig">{formatUSD(derived.current)}</span>{" "}
                  <span className={changePos ? "pos" : "neg"} style={{ marginLeft: 8 }}>
                    {typeof derived.change24h === "number" ? (changePos ? "▲" : "▼") : ""}{" "}
                    {typeof derived.change24h === "number" ? derived.change24h.toFixed(2) : "—"}%
                    {" "} (24h)
                  </span>
                </div>
              </div>
            </div>

            <div className="toggleRow">
              <div className="toggleGroup" aria-label="Overlays">
                <button
                  className={`toggleBtn ${showMA ? "active" : ""}`}
                  onClick={() => setShowMA((v) => !v)}
                  type="button"
                >
                  MA20/50
                </button>
              </div>

              <label className="checkPill" title="Log scale helps compare wide ranges">
                <input
                  type="checkbox"
                  checked={logScale}
                  onChange={(e) => setLogScale(e.target.checked)}
                />
                Log scale
              </label>

              <StarButton
                active={watchlistApi?.isWatched?.(coinId)}
                onClick={() => watchlistApi?.toggleWatch?.(coinId)}
                title="Toggle watchlist"
              />
            </div>
          </div>

          <div className="kpiRow">
            <span className="kpiPill">Range High: {formatUSD(derived.rangeHigh)}</span>
            <span className="kpiPill">Range Low: {formatUSD(derived.rangeLow)}</span>
            <span className="kpiPill">24h High: {formatUSD(derived.high24h)}</span>
            <span className="kpiPill">24h Low: {formatUSD(derived.low24h)}</span>
          </div>

          <div className="chartWrapTall" style={{ marginTop: 12 }}>
            {/* to show chart only if we have data; otherwise skeleton or message */}
            {loadingChart ? (
              <ChartSkeleton />
            ) : prices.length ? (
              <Line data={chart.data} options={chart.options} />
            ) : (
              <div className="emptyState">
                <b>Chart unavailable</b>
                <div className="muted" style={{ marginTop: 6 }}>
                  CoinGecko rate-limits chart endpoints sometimes. Metrics still work.
                </div>
              </div>
            )}
          </div>

          <div className="muted small" style={{ marginTop: 10 }}>
            Key levels are computed from the selected range. MA20/MA50 help spot trend + momentum.
          </div>
        </div>

        <div className="card">
          <div className="chartTitleRow">
            <div className="chartTitle">Market Metrics</div>
            <div className="chartHint">Context for traders</div>
          </div>

          {loadingCoin ? (
            <div className="skeleton skel-chart" style={{ height: 260 }} />
          ) : (
            <div className="metricsStack">
              <div className="metricsGrid">
                <div className="metricBox">
                  <div className="metricLabel">Market Cap</div>
                  <div className="metricValue">{formatUSD(derived.mcap)}</div>
                </div>

                <div className="metricBox">
                  <div className="metricLabel">24h Volume</div>
                  <div className="metricValue">{formatUSD(derived.vol)}</div>
                </div>

                <div className="metricBox">
                  <div className="metricLabel">Vol / MCap</div>
                  <div className="metricValue">
                    {Number.isFinite(derived.volToMcap) ? derived.volToMcap.toFixed(3) : "—"}
                  </div>
                  <div className="metricTiny">Liquidity proxy</div>
                </div>

                <div className="metricBox">
                  <div className="metricLabel">Supply (Circulating)</div>
                  <div className="metricValue">{formatNumber(derived.circ)}</div>
                  <div className="metricTiny">
                    Max: {formatNumber(derived.max)}{" "}
                    {Number.isFinite(derived.supplyPct) ? `(${derived.supplyPct.toFixed(0)}%)` : ""}
                  </div>
                </div>

                <div className="metricBox">
                  <div className="metricLabel">All-Time High</div>
                  <div className="metricValue">{formatUSD(derived.ath)}</div>
                  <div
                    className={`metricTiny ${
                      typeof derived.athChange === "number" && derived.athChange < 0 ? "neg" : "pos"
                    }`}
                  >
                    {typeof derived.athChange === "number"
                      ? `${derived.athChange.toFixed(2)}% from ATH`
                      : "—"}
                  </div>
                </div>

                <div className="metricBox">
                  <div className="metricLabel">24h Range</div>
                  <div className="metricValue">
                    {formatUSD(derived.low24h)} → {formatUSD(derived.high24h)}
                  </div>
                  <div className="metricTiny">High / Low</div>
                </div>
              </div>

              <CoinPerformanceCard prices={chart.raw} ma20={chart.ma20} current={derived.current} />
            </div>
          )}

          <div className="muted small" style={{ marginTop: 12 }}>
            Uses CoinGecko market_data + derived analytics (liquidity, volatility, drawdown).
          </div>
        </div>
      </div>

      <div className="coinDetailsExtras">
        <TokenomicsDonut
          circulating={derived.circ}
          total={derived.total}
          max={derived.max}
          priceUsd={derived.current}
        />
        <IndicatorsPanel labels={chart.labels} prices={chart.raw} />
      </div>
    </>
  );
}
