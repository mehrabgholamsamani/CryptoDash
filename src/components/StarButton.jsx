export default function StarButton({ active, onClick, title }) {
  return (
    <button
      type="button"
      className={`starBtn ${active ? "active" : ""}`}
      onClick={onClick}
      title={title || (active ? "Remove from watchlist" : "Add to watchlist")}
      aria-label={title || "Toggle watchlist"}
    >
      {active ? "★" : "☆"}
    </button>
  );
}
