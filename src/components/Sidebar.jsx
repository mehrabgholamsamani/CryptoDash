import { useState } from "react";
import logo from "../assets/logo.png";

const MOBILE_NAV = [
  { id: "market",    icon: "📊", label: "Market"  },
  { id: "coin",      icon: "🪙", label: "Coins"   },
  { id: "watchlist", icon: "⭐", label: "Watch"   },
  { id: "compare",   icon: "⚖️", label: "Compare" },
  { id: "settings",  icon: "⚙️", label: "Settings"},
];

export default function Sidebar({ mobileOpen, setMobileOpen, active, setActive, coin, setCoin }) {
  const [coinOpen, setCoinOpen] = useState(true);

  const topCoins = [
    { id: "bitcoin", label: "Bitcoin" },
    { id: "ethereum", label: "Ethereum" },
    { id: "solana", label: "Solana" },
    { id: "binancecoin", label: "BNB" },
    { id: "ripple", label: "XRP" },
    { id: "cardano", label: "Cardano" },
  ];

  return (
    <>
      {/* ── Mobile top navbar (only visible on small screens via CSS) ── */}
      <nav className="mobileTopNav" aria-label="Mobile navigation">
        <div className="mobileTopNavBrand">
          <img src={logo} alt="CryptoDash" className="mobileTopNavLogo" />
        </div>

        <div className="mobileTopNavItems">
          {MOBILE_NAV.map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              className={`mobileTopNavItem ${active === id ? "active" : ""}`}
              onClick={() => {
                if (id === "coin") {
                  setCoin(coin); // navigate to currently selected coin
                } else {
                  setActive(id);
                }
              }}
            >
              <span className="mobileTopNavIcon">{icon}</span>
              <span className="mobileTopNavLabel">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── Overlay + desktop sidebar (hidden on mobile via CSS) ── */}
      <div className={`sidebarOverlay ${mobileOpen ? "show" : ""}`} onClick={() => setMobileOpen(false)} />
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      {/* BRAND */}
      <div className="brand">
        <button className="sidebarClose" type="button" aria-label="Close menu" title="Close" onClick={() => setMobileOpen(false)}>✕</button>
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
          onClick={() => {
            setActive("market");
            setMobileOpen(false);
          }}
        >
          <span className="navIcon">📊</span>
          Market Overview
        </button>

        {/* COIN DETAILS DROPDOWN */}
        <div className="dropdownWrap">
          <button
            className="dropdownHeader"
            onClick={() => setCoinOpen((v) => !v)}
          >
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="navIcon">🪙</span>
              Coin Details
            </span>
            <span className="muted">{coinOpen ? "▾" : "▸"}</span>
          </button>

          {coinOpen && (
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
                    setMobileOpen(false);
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
          onClick={() => {
            setActive("watchlist");
            setMobileOpen(false);
          }}
        >
          <span className="navIcon">⭐</span>
          Watchlist
        </button>

        <button
          className={`navItem ${active === "compare" ? "active" : ""}`}
          onClick={() => {
            setActive("compare");
            setMobileOpen(false);
          }}
        >
          <span className="navIcon">⚖️</span>
          Compare
        </button>

        <button
          className={`navItem ${active === "settings" ? "active" : ""}`}
          onClick={() => {
            setActive("settings");
            setMobileOpen(false);
          }}
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
    </>
  );
}
