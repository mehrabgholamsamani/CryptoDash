function Delta({ value, invert }) {
  const isUp = value >= 0;
 
  const good = invert ? !isUp : isUp;

  return (
    <span className={`delta ${good ? "good" : "bad"}`}>
      {isUp ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function StatCard({ title, value, delta, icon, hint, invertDelta = false }) {
  return (
    <div className="card statCard">
      <div className="statTop">
        <div className="statTitle">
          <span className="statIcon" aria-hidden="true">
            {icon}
          </span>
          <div>
            <div className="muted small">{title}</div>
            <div className="statValue">{value}</div>
          </div>
        </div>
        <Delta value={delta} invert={invertDelta} />
      </div>
      <div className="muted small">{hint}</div>
    </div>
  );
}
