import { formatMoney, formatShortDateTime } from "../utils/format.js";

export default function Transactions({ items }) {
  return (
    <div className="txList">
      {items.map((t) => (
        <div className="txRow" key={t.id}>
          <div className="txLeft">
            <div className="txIcon" aria-hidden="true">
              {t.type === "invoice" ? "🧾" : t.type === "refund" ? "↩️" : "🛒"}
            </div>
            <div>
              <div className="txTitle">
                {t.title} <span className="muted small">· {t.user}</span>
              </div>
              <div className="muted small">{formatShortDateTime(t.date)}</div>
            </div>
          </div>
          <div className={`txAmount ${t.amount < 0 ? "neg" : "pos"}`}>
            {t.amount < 0 ? "-" : ""}{formatMoney(Math.abs(t.amount))}
          </div>
        </div>
      ))}
    </div>
  );
}
