import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import Market from "./pages/Market";
import CoinDetails from "./pages/CoinDetails";
import Watchlist from "./pages/Watchlist";
import Compare from "./pages/Compare";
import Settings from "./pages/Settings";
import Signup from "./pages/Signup";
import useWatchlist from "./hooks/useWatchlist";

const TITLES = {
  market: { title: "Market Overview", subtitle: "Top coins, trends, and key stats." },
  coin: { title: "Coin Details", subtitle: "Price chart, indicators, and coin-specific metrics." },
  watchlist: { title: "Watchlist", subtitle: "Your starred coins (saved locally)." },
  compare: { title: "Compare", subtitle: "Compare multiple coins on the same chart." },
  settings: { title: "Settings", subtitle: "Theme, accent, and preferences." },
};

const DEFAULTS = {
  theme: "light",
  accent: "#5961F5",
  currency: "usd",
  compact: false,
  reduceMotion: false,
  range: "7d",
};

const USER_KEY = "cryptoDash:user:v1";

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeUser(u) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  } catch {}
}

function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
}

function readPref(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function App() {
  const [active, setActive] = useState("market");
  const [coin, setCoin] = useState("bitcoin");

  // ✅ fake signup user
  const [user, setUser] = useState(() => readUser());

  // ✅ single source of truth for watchlist across the whole app
  const watchlistApi = useWatchlist();

  // preferences (persisted)
  const [theme, setTheme] = useState(() => readPref("cryptoDash:theme", DEFAULTS.theme));
  const [accent, setAccent] = useState(() => readPref("cryptoDash:accent", DEFAULTS.accent));
  const [currency, setCurrency] = useState(() => readPref("cryptoDash:currency", DEFAULTS.currency));
  const [compact, setCompact] = useState(() => readPref("cryptoDash:compact", DEFAULTS.compact));
  const [reduceMotion, setReduceMotion] = useState(() =>
    readPref("cryptoDash:reduceMotion", DEFAULTS.reduceMotion)
  );

  // header range (persisted)
  const [range, setRange] = useState(() => readPref("cryptoDash:range", DEFAULTS.range)); // 24h, 7d, 30d, 90d

  // apply theme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-dark", theme === "dark");
    writePref("cryptoDash:theme", theme);
  }, [theme]);

  // apply accent
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    writePref("cryptoDash:accent", accent);
  }, [accent]);

  // apply compact mode
  useEffect(() => {
    document.documentElement.classList.toggle("compact", !!compact);
    writePref("cryptoDash:compact", !!compact);
  }, [compact]);

  // apply reduce-motion
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", !!reduceMotion);
    writePref("cryptoDash:reduceMotion", !!reduceMotion);
  }, [reduceMotion]);

  // persist currency + range
  useEffect(() => {
    writePref("cryptoDash:currency", currency);
  }, [currency]);

  useEffect(() => {
    writePref("cryptoDash:range", range);
  }, [range]);

  const { title: baseTitle, subtitle } = useMemo(() => TITLES[active] ?? TITLES.market, [active]);

  const title = useMemo(() => {
    if (active === "market") {
      const n = String(user?.name || "").trim();
      return n ? `Welcome ${n}` : "Welcome";
    }
    return baseTitle;
  }, [active, baseTitle, user]);

  const resetPrefs = () => {
    setTheme(DEFAULTS.theme);
    setAccent(DEFAULTS.accent);
    setCurrency(DEFAULTS.currency);
    setCompact(DEFAULTS.compact);
    setReduceMotion(DEFAULTS.reduceMotion);
    setRange(DEFAULTS.range);
  };

  const handleSignup = (u) => {
    setUser(u);
    writeUser(u);
    setActive("market");
  };

  const signOut = () => {
    clearUser();
    setUser(null);
    setActive("market");
    setCoin("bitcoin");
  };

  // ✅ Gate the app behind fake signup
  if (!user) {
    return <Signup onSuccess={handleSignup} />;
  }

  return (
    <div className="app">
      <Sidebar
        active={active}
        setActive={setActive}
        coin={coin}
        setCoin={(id) => {
          setCoin(id);
          setActive("coin");
        }}
      />

      <main>
        <div className="pageHeader">
          <div>
            <h1>{title}</h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {subtitle}
            </p>
          </div>

          <div className="headerRight">
            <select
              className="select"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              title="Time range"
            >
              <option value="24h">Past 24h</option>
              <option value="7d">Past 7d</option>
              <option value="30d">Past 30d</option>
              <option value="90d">Past 90d</option>
            </select>

            <button
              className="btnGhost"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              title="Toggle theme"
              type="button"
            >
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </div>

        <div className="grid">
          {active === "market" && (
            <Market
              range={range}
              onSelectCoin={(id) => {
                setCoin(id);
                setActive("coin");
              }}
              watchlistApi={watchlistApi}
            />
          )}

          {active === "coin" && (
            <CoinDetails coinId={coin} range={range} watchlistApi={watchlistApi} />
          )}

          {active === "watchlist" && (
            <Watchlist
              range={range}
              watchlistApi={watchlistApi}
              onSelectCoin={(id) => {
                setCoin(id);
                setActive("coin");
              }}
            />
          )}

          {active === "compare" && <Compare range={range} watchlistApi={watchlistApi} />}

          {active === "settings" && (
            <Settings
              theme={theme}
              setTheme={setTheme}
              accent={accent}
              setAccent={setAccent}
              currency={currency}
              setCurrency={setCurrency}
              compact={compact}
              setCompact={setCompact}
              reduceMotion={reduceMotion}
              setReduceMotion={setReduceMotion}
              resetPrefs={resetPrefs}
              user={user}
              onSignOut={signOut}
            />
          )}
        </div>
      </main>
    </div>
  );
}
