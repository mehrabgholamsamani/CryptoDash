export default function MarketBreadth({ loading, range, breadth }) {
  if (loading) return <div className="skeleton skel-chart" style={{ height: 170 }} />;

  const { upPct, downPct, upCount, downCount, total } = breadth;

  return (
    <div className="card">
      <div className="chartTitleRow">
        <div className="metricTitle">Market Breadth</div>
        <div className="metricSub">{range} • Advancers vs Decliners</div>
      </div>

      <div className="breadthStats">
        <span className="statPill">▲ Up: {upPct.toFixed(0)}% ({upCount})</span>
        <span className="statPill">▼ Down: {downPct.toFixed(0)}% ({downCount})</span>
        <span className="statPill">Universe: {total} coins</span>
      </div>

      <div
        className="breadthBar"
        style={{ gridTemplateColumns: `${upPct}fr ${downPct}fr` }}
        aria-label="Market breadth bar"
      >
        <div className="breadthUp" />
        <div className="breadthDown" />
      </div>

      <div className="muted small" style={{ marginTop: 10 }}>
        Breadth helps confirm trends: strong moves usually have many coins participating.
      </div>
    </div>
  );
}
