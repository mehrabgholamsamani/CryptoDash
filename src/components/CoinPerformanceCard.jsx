function stdDev(nums) {
  if (!nums.length) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function computeReturns(prices) {
  const out = [];
  for (let i = 1; i < prices.length; i++) {
    out.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return out;
}

function maxDrawdown(prices) {
  let peak = -Infinity;
  let maxDD = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = (p - peak) / peak; // negative
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD * 100; // %
}

export default function CoinPerformanceCard({ prices, ma20, current }) {
  const clean = prices.filter((n) => typeof n === "number" && n > 0);
  if (clean.length < 5) {
    return (
      <div className="metricBox">
        <div className="metricLabel">Performance & Risk</div>
        <div className="metricValue">—</div>
        <div className="metricTiny">Not enough data.</div>
      </div>
    );
  }

  const first = clean[0];
  const last = clean[clean.length - 1];
  const rangeReturn = ((last / first) - 1) * 100;

  const rets = computeReturns(clean);
  const vol = stdDev(rets) * 100;

  const dd = maxDrawdown(clean);

  const ma20Last = Array.isArray(ma20) ? ma20[ma20.length - 1] : null;
  const aboveMA = typeof current === "number" && typeof ma20Last === "number" ? current > ma20Last : null;

  return (
    <div className="metricBox">
      <div className="metricLabel">Performance & Risk</div>

      <div className="metricValue">
        {rangeReturn >= 0 ? "▲" : "▼"} {Math.abs(rangeReturn).toFixed(2)}%
      </div>

      <div className="metricTiny" style={{ marginTop: 8 }}>
        Volatility: <b>{vol.toFixed(2)}%</b> • Max DD: <b>{dd.toFixed(2)}%</b>
      </div>

      <div className="metricTiny" style={{ marginTop: 6 }}>
        Trend:{" "}
        {aboveMA === null ? (
          "—"
        ) : aboveMA ? (
          <span className="pos" style={{ fontWeight: 900 }}>Above MA20</span>
        ) : (
          <span className="neg" style={{ fontWeight: 900 }}>Below MA20</span>
        )}
      </div>
    </div>
  );
}
