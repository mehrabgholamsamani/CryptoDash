import { useMemo, useRef, useState } from "react";

export default function MarketMiniCards({ coins, loading }) {
  const scrollerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, startScrollLeft: 0 });

  const shown = useMemo(() => coins ?? [], [coins]);

  const onMouseDown = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    setDragging(true);
    el.classList.add("dragging");
    dragState.current.startX = e.pageX;
    dragState.current.startScrollLeft = el.scrollLeft;
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    const el = scrollerRef.current;
    if (!el) return;
    e.preventDefault();
    const dx = e.pageX - dragState.current.startX;
    el.scrollLeft = dragState.current.startScrollLeft - dx;
  };

  const endDrag = () => {
    const el = scrollerRef.current;
    if (el) el.classList.remove("dragging");
    setDragging(false);
  };

  if (loading) {
    return (
      <div
        className="marketTopScroller"
        ref={scrollerRef}
        aria-label="Loading coins"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton skel-card coinCardFixed" />
        ))}
      </div>
    );
  }

  return (
    <div
      className="marketTopScroller"
      ref={scrollerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      role="region"
      aria-label="Top coins"
      title="Drag to scroll"
    >
      {shown.map((c) => {
        const ch = c.price_change_percentage_24h;
        const isPos = typeof ch === "number" && ch >= 0;

        return (
          <div key={c.id} className="card coinCard coinCardFixed">
            <div className="coinLogo">
              <img src={c.image} alt={`${c.name} logo`} />
            </div>

            <div className="coinMeta">
              <div className="coinNameRow">
                <div className="coinName">{c.name}</div>
                <div className="coinSymbol">{String(c.symbol || "").toUpperCase()}</div>
              </div>

              <div className="coinPriceRow">
                <div className="coinPrice">
                  ${Number(c.current_price).toLocaleString()}
                </div>

                <span className={`changePill ${isPos ? "pos" : "neg"}`}>
                  {isPos ? "▲" : "▼"}{" "}
                  {typeof ch === "number" ? ch.toFixed(2) : "—"}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
