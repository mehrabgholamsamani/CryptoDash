import { useState } from "react";
import logo from "../assets/logo.png";

export default function Sidebar({ active, setActive, coin, setCoin }) {
  const [open, setOpen] = useState(true);

  const topCoins = [
    { id: "bitcoin", label: "Bitcoin" },
    { id: "ethereum", label: "Ethereum" },
    { id: "solana", label: "Solana" },
    { id: "binancecoin", label: "BNB" },
    { id: "ripple", label: "XRP" },
    { id: "cardano", label: "Cardano" },
  ];

  return (
    <aside className="sidebar">
      {/* BRAND */}
      <div className="brand">
        <img src={logo} alt="CryptoDash logo" className="brandLogo" />
        <div>
          <div className="brandName">CryptoDash</div>
          <div className="brandTag small">Markets, made clear.</div>
        </div>
      </div>

      {/* NAV */}
      <nav className="nav">
        <button
          className={`navItem ${active === "market" ? "active" : ""}`}
          onClick={() => setActive("market")}
        >
          <span className="navIcon">📊</span>
          Market Overview
        </button>

        {/* COIN DETAILS DROPDOWN */}
        <div className="dropdownWrap">
          <button
            className="dropdownHeader"
            onClick={() => setOpen((v) => !v)}
          >
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="navIcon">🪙</span>
              Coin Details
            </span>
            <span className="muted">{open ? "▾" : "▸"}</span>
          </button>

          {open && (
            <div className="dropdownList">
              {topCoins.map((c) => (
                <button
                  key={c.id}
                  className={`subItem ${
                    active === "coin" && coin === c.id ? "active" : ""
                  }`}
                  onClick={() => {
                    setCoin(c.id);
                    setActive("coin");
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className={`navItem ${active === "watchlist" ? "active" : ""}`}
          onClick={() => setActive("watchlist")}
        >
          <span className="navIcon">⭐</span>
          Watchlist
        </button>

        <button
          className={`navItem ${active === "compare" ? "active" : ""}`}
          onClick={() => setActive("compare")}
        >
          <span className="navIcon">⚖️</span>
          Compare
        </button>

        <button
          className={`navItem ${active === "settings" ? "active" : ""}`}
          onClick={() => setActive("settings")}
        >
          <span className="navIcon">⚙️</span>
          Settings
        </button>
      </nav>

      {/* FOOTER */}
      <div className="sidebarBottom">
        <div className="miniCard">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Tip</div>
          <div className="muted small">
            click on setting and create your preferred theme
          </div>
        </div>
      </div>
    </aside>
  );
}
