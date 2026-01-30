import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Filler,
  Legend,
  LogarithmicScale,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Filler,
  Legend,
  LogarithmicScale
);

const COLORS = {
  bitcoin: "#5961F5",
  ethereum: "#5EA0EE",
  solana: "#EC4899",
  binancecoin: "#F59E0B",
  ripple: "#10B981",
  cardano: "#8B5CF6",
};

function titleCase(id) {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function toIndexed100(series) {
  if (!Array.isArray(series) || series.length === 0) return [];
  const base = series.find((v) => typeof v === "number" && v > 0);
  if (!base) return series.map(() => null);
  return series.map((v) => (typeof v === "number" ? (v / base) * 100 : null));
}

function sanitizeForLog(series) {
  return (series || []).map((v) => (typeof v === "number" && v > 0 ? v : null));
}

function getMinPositiveAll(seriesByCoin) {
  let min = Infinity;
  for (const pts of Object.values(seriesByCoin || {})) {
    for (const v of pts || []) {
      if (typeof v === "number" && v > 0 && v < min) min = v;
    }
  }
  return Number.isFinite(min) ? min : null;
}

function formatUSD(n) {
  if (!Number.isFinite(n)) return "";
  if (n >= 1000) return `$${Math.round(n).toLocaleString()}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

export default function MultiCoinLineChart({
  seriesByCoin,
  labels,
  loading,
  mode = "perf",    
  logScale = false,  
}) {
  if (loading) return <div className="skeleton skel-chart" />;

  const minPositive = getMinPositiveAll(seriesByCoin);
  const canUseLog = mode === "price" && logScale && minPositive !== null;

  const datasets = Object.entries(seriesByCoin || {}).map(([id, points]) => {
    let data;

    if (mode === "perf") {
      data = toIndexed100(points);
    } else {
      data = canUseLog ? sanitizeForLog(points) : points;
    }

    return {
      label: titleCase(id),
      data,
      borderColor: COLORS[id] || "#5961F5",
      backgroundColor: "transparent",
      tension: 0.35,
      pointRadius: 0,
      borderWidth: 2,
      spanGaps: true,
    };
  });

  return (
    <Line
      data={{ labels, datasets }}
      options={{
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
            ticks:
              mode === "perf"
                ? { callback: (v) => `${Number(v).toFixed(0)}` }
                : {
                    callback: (v) => formatUSD(Number(v)),
                  },
            title: {
              display: true,
              text: mode === "perf" ? "Indexed (100 = start)" : "Price (USD)",
            },
          },
        },
      }}
    />
  );
}
