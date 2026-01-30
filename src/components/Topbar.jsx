export default function Topbar({ query, setQuery, theme, setTheme, range, setRange }) {
  return (
    <header className="topbar">
      <div className="topLeft">
        <h1>Dashboard</h1>
        <p className="muted">A clean starter you can actually extend.</p>
      </div>

      <div className="topRight">
        <div className="search">
          <span className="searchIcon">🔎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            aria-label="Search users"
          />
        </div>

        <select className="select" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="7d">Last 7d</option>
          <option value="30d">Last 30d</option>
          <option value="90d">Last 90d</option>
        </select>

        <button
          className="btn"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          title="Toggle theme"
        >
          {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>
    </header>
  );
}
