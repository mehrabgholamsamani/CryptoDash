import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function formatNumber(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return Math.round(n).toLocaleString();
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

const centerTextPlugin = (text, color = "rgba(15,23,42,0.85)") => ({
  id: "centerText",
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const { left, right, top, bottom } = chartArea;
    const x = (left + right) / 2;
    const y = (top + bottom) / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.font = "900 16px system-ui";
    ctx.fillText(text, x, y);
    ctx.restore();
  },
});

function scarcityLabel(pctCirc) {
  if (!Number.isFinite(pctCirc)) return { label: "Unknown", tone: "muted" };
  if (pctCirc >= 90) return { label: "High scarcity", tone: "pos" };
  if (pctCirc >= 60) return { label: "Medium scarcity", tone: "muted" };
  return { label: "Low scarcity", tone: "neg" };
}

export default function TokenomicsDonut({
  circulating,
  total,
  max,
  priceUsd, 
}) {
  const cap =
    Number.isFinite(max) && max > 0
      ? max
      : Number.isFinite(total) && total > 0
      ? total
      : null;

  const circ = Number.isFinite(circulating) && circulating > 0 ? circulating : null;

  if (!circ) {
    return (
      <div className="card">
        <div className="chartTitleRow">
          <div className="chartTitle">Tokenomics</div>
          <div className="chartHint">Supply breakdown</div>
        </div>
        <div className="emptyState">
          <b>Not enough supply data</b>
          <div className="muted" style={{ marginTop: 6 }}>
            CoinGecko didn’t return supply fields for this asset.
          </div>
        </div>
      </div>
    );
  }

  const hasCap = cap !== null && cap >= circ;
  const remaining = hasCap ? Math.max(0, cap - circ) : null;

  const pctCirc = hasCap && cap > 0 ? (circ / cap) * 100 : null;
  const pctRemaining = hasCap && cap > 0 ? 100 - pctCirc : null;


  const fdv = Number.isFinite(priceUsd) && hasCap ? priceUsd * cap : null;
  const mcapApprox = Number.isFinite(priceUsd) ? priceUsd * circ : null;

  const scarcity = scarcityLabel(pctCirc);

  const labels = hasCap ? ["Circulating", "Remaining"] : ["Circulating", "Uncapped / Unknown"];
  const values = hasCap ? [circ, remaining] : [circ, 1];

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: hasCap
        ? ["#14B8A6", "#CBD5E1"]
        : ["#14B8A6", "#E5E7EB"],

        hoverBackgroundColor: hasCap
        ? ["#0D9488", "#94A3B8"]
        : ["#0D9488", "#CBD5E1"],
        borderColor: "rgba(255,255,255,0.9)",
        borderWidth: 2,
        spacing: 3,
        cutout: "72%",
        hoverOffset: 8,
      },
    ],
  };

  const centerText = pctCirc !== null ? `${pctCirc.toFixed(0)}%` : "—";

  return (
    <div className="card">
      <div className="chartTitleRow">
        <div className="chartTitle">Tokenomics</div>
        <div className="chartHint">Supply breakdown</div>
      </div>

      <div className="smallChartWrapTall">
        <Doughnut
          data={data}
          plugins={[centerTextPlugin(centerText)]}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.label}: ${formatNumber(Number(ctx.raw))}`,
                },
              },
            },
          }}
        />
      </div>

      <div className="subtleDivider" />


      <div className="metricsGrid" style={{ marginTop: 4 }}>
        <div className="metricBox" style={{ padding: 10 }}>
          <div className="metricLabel">Circulating</div>
          <div className="metricValue">{formatNumber(circulating)}</div>
          <div className="metricTiny">
            {pctCirc !== null ? `${pctCirc.toFixed(1)}% of cap` : "—"}
          </div>
        </div>

        <div className="metricBox" style={{ padding: 10 }}>
          <div className="metricLabel">Remaining</div>
          <div className="metricValue">{hasCap ? formatNumber(remaining) : "—"}</div>
          <div className="metricTiny">
            {pctRemaining !== null ? `${pctRemaining.toFixed(1)}% left` : "No max supply"}
          </div>
        </div>

        <div className="metricBox" style={{ padding: 10 }}>
          <div className="metricLabel">Est. MCap (current)</div>
          <div className="metricValue">{formatUSD(mcapApprox)}</div>
          <div className="metricTiny">Price × circulating</div>
        </div>

        <div className="metricBox" style={{ padding: 10 }}>
          <div className="metricLabel">Est. FDV</div>
          <div className="metricValue">{formatUSD(fdv)}</div>
          <div className="metricTiny">Price × max</div>
        </div>
      </div>

      <div className="muted small" style={{ marginTop: 10 }}>
        Scarcity:{" "}
        <span className={scarcity.tone} style={{ fontWeight: 900 }}>
          {scarcity.label}
        </span>
        {!hasCap && <span> • Max supply unknown</span>}
      </div>
    </div>
  );
}
