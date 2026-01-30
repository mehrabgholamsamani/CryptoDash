import { useMemo } from "react";

function buildPath(points, w, h, pad = 18) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = Math.max(1, max - min);

  const step = (w - pad * 2) / (points.length - 1);

  const toXY = (v, i) => {
    const x = pad + i * step;
    const t = (v - min) / span; // 0..1
    const y = h - pad - t * (h - pad * 2);
    return [x, y];
  };

  const xy = points.map(toXY);

  let d = `M ${xy[0][0]} ${xy[0][1]}`;
  for (let i = 1; i < xy.length; i++) {
    const [x, y] = xy[i];
    const [px, py] = xy[i - 1];
    const cx = (px + x) / 2;
    d += ` Q ${cx} ${py} ${x} ${y}`;
  }

  const area =
    d +
    ` L ${xy[xy.length - 1][0]} ${h - pad}` +
    ` L ${xy[0][0]} ${h - pad} Z`;

  return { d, area, min, max };
}

export default function RevenueChart({ series }) {
  const w = 720;
  const h = 220;

  const { d, area, min, max } = useMemo(() => buildPath(series, w, h), [series]);

  return (
    <div className="chartWrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img" aria-label="Revenue chart">
        <defs>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopOpacity="0.35" />
            <stop offset="100%" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid */}
        <g className="gridLines">
          {[40, 80, 120, 160].map((y) => (
            <line key={y} x1="18" x2={w - 18} y1={y} y2={y} />
          ))}
        </g>

        <path className="area" d={area} fill="url(#fillGrad)" />
        <path className="line" d={d} />

        <text className="axisLabel" x="18" y="22">
          {Math.round(max).toLocaleString()}
        </text>
        <text className="axisLabel" x="18" y={h - 10}>
          {Math.round(min).toLocaleString()}
        </text>
      </svg>

      <div className="chartLegend muted small">
        <span>• Revenue</span>
        <span>• Smoothed line</span>
        <span>• SVG so it’s lightweight</span>
      </div>
    </div>
  );
}
