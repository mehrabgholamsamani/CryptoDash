import { formatMoney, formatShortDate } from "../utils/format.js";

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export default function ActivityTable({ rows }) {
  return (
    <div className="tableWrap">
      <table className="table">
        <thead>
          <tr>
            <th>User</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Spend</th>
            <th>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <div className="userCell">
                  <div className="avatar" aria-hidden="true">
                    {r.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="userName">{r.name}</div>
                    <div className="muted small">{r.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <Badge tone={r.plan === "Pro" ? "good" : r.plan === "Team" ? "info" : "neutral"}>
                  {r.plan}
                </Badge>
              </td>
              <td>
                <Badge tone={r.status === "Active" ? "good" : r.status === "Paused" ? "warn" : "bad"}>
                  {r.status}
                </Badge>
              </td>
              <td className="num">{formatMoney(r.spend)}</td>
              <td className="muted">{formatShortDate(r.lastSeen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
