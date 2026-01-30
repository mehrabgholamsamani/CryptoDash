function riskLevel(volPct) {
  if (volPct < 2.5) return { label: "Low", cls: "riskLow" };
  if (volPct < 5.0) return { label: "Medium", cls: "riskMed" };
  return { label: "High", cls: "riskHigh" };
}

export default function VolatilitySnapshot({ loading, range, rows }) {
  if (loading) return <div className="skeleton skel-chart" style={{ height: 170 }} />;

  const max = Math.max(...rows.map((r) => r.volPct), 1);

  return (
    <div className="card">
      <div className="chartTitleRow">
        <div className="metricTitle">Volatility & Risk</div>
        <div className="metricSub">{range} • Std. dev of returns</div>
      </div>

      <div className="volList">
        {rows.map((r) => {
          const width = Math.min(100, (r.volPct / max) * 100);
          const risk = riskLevel(r.volPct);

          return (
            <div key={r.id} className="volRow">
              <div className="volName">
                {r.name}
                <span className={`riskTag ${risk.cls}`}>{risk.label}</span>
              </div>

              <div className="volBarTrack">
                <div className="volBarFill" style={{ width: `${width}%` }} />
              </div>

              <div className="volValue">{r.volPct.toFixed(2)}%</div>
            </div>
          );
        })}
      </div>

      <div className="muted small" style={{ marginTop: 10 }}>
        Higher volatility = higher risk. Useful for position sizing and comparing assets.
      </div>
    </div>
  );
}
