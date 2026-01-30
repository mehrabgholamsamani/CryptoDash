import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

function sma(values, period) {
  const out = Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / period;
    out[i] = avg;
  }
  return out;
}

function ema(values, period) {
  const out = Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev = null;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v !== "number") continue;

    if (prev === null) {
      // seed with SMA at first possible
      if (i >= period - 1) {
        const seed = values.slice(i - period + 1, i + 1);
        if (seed.every((x) => typeof x === "number")) {
          prev = seed.reduce((a, b) => a + b, 0) / period;
          out[i] = prev;
        }
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

function rsi(prices, period = 14) {
  const out = Array(prices.length).fill(null);
  if (prices.length < period + 2) return out;


  const deltas = [];
  for (let i = 1; i < prices.length; i++) deltas.push(prices[i] - prices[i - 1]);

  let gain = 0;
  let loss = 0;

  for (let i = 0; i < period; i++) {
    const d = deltas[i];
    if (d >= 0) gain += d;
    else loss += -d;
  }

  gain /= period;
  loss /= period;

  let rs = loss === 0 ? 100 : gain / loss;
  out[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < prices.length; i++) {
    const d = deltas[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;

    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;

    rs = loss === 0 ? 100 : gain / loss;
    out[i] = 100 - 100 / (1 + rs);
  }

  return out;
}

export default function IndicatorsPanel({ labels, prices }) {
  const clean = prices.filter((n) => typeof n === "number" && n > 0);

  if (clean.length < 60) {
    return (
      <div className="card">
        <div className="chartTitleRow">
          <div className="chartTitle">Indicators</div>
          <div className="chartHint">RSI + MACD</div>
        </div>
        <div className="emptyState">
          <b>Not enough data</b>
          <div className="muted" style={{ marginTop: 6 }}>
            Select a longer range (30d / 90d) to compute indicators more reliably.
          </div>
        </div>
      </div>
    );
  }

  // RSI
  const rsi14 = rsi(prices, 14);
  const rsi70 = prices.map(() => 70);
  const rsi30 = prices.map(() => 30);

  // MACD (12, 26, 9)
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);

  const macdLine = prices.map((_, i) => {
    const a = ema12[i];
    const b = ema26[i];
    return typeof a === "number" && typeof b === "number" ? (a - b) : null;
  });

  const signal = ema(macdLine, 9);

  const hist = macdLine.map((v, i) => {
    const s = signal[i];
    return typeof v === "number" && typeof s === "number" ? (v - s) : null;
  });

  const rsiData = {
    labels,
    datasets: [
      {
        label: "RSI (14)",
        data: rsi14,
        borderColor: "rgba(89,97,245,0.9)",
        backgroundColor: "rgba(89,97,245,0.10)",
        tension: 0.25,
        pointRadius: 0,
        fill: true,
        spanGaps: true,
      },
      {
        label: "70 (Overbought)",
        data: rsi70,
        borderColor: "rgba(220,38,38,0.35)",
        borderDash: [6, 6],
        pointRadius: 0,
      },
      {
        label: "30 (Oversold)",
        data: rsi30,
        borderColor: "rgba(16,185,129,0.35)",
        borderDash: [6, 6],
        pointRadius: 0,
      },
    ],
  };

  const macdData = {
    labels,
    datasets: [
      {
        label: "MACD",
        data: macdLine,
        borderColor: "rgba(94,160,238,0.9)",
        tension: 0.25,
        pointRadius: 0,
        spanGaps: true,
      },
      {
        label: "Signal",
        data: signal,
        borderColor: "rgba(245,158,11,0.9)",
        tension: 0.25,
        pointRadius: 0,
        spanGaps: true,
      },
      {
        label: "Histogram",
        data: hist,
        borderColor: "rgba(148,163,184,0.0)",
        backgroundColor: "rgba(148,163,184,0.35)",
        type: "bar",
        yAxisID: "y",
      },
    ],
  };

  return (
    <div className="card">
      <div className="chartTitleRow">
        <div className="chartTitle">Indicators</div>
        <div className="chartHint">RSI + MACD</div>
      </div>

      <div className="smallChartWrap">
        <Line
          data={rsiData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: {
              x: { ticks: { maxTicksLimit: 6 } },
              y: { min: 0, max: 100 },
            },
          }}
        />
      </div>

      <div className="subtleDivider" />

      <div className="smallChartWrap">
        <Line
          data={macdData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: {
              x: { ticks: { maxTicksLimit: 6 } },
              y: { beginAtZero: true },
            },
          }}
        />
      </div>

      <div className="muted small" style={{ marginTop: 10 }}>
        RSI highlights momentum (70/30 zones). MACD shows trend shifts via MACD vs Signal + histogram.
      </div>
    </div>
  );
}
