import { useMemo, useState } from "react";
import { clearCoinGeckoCache } from "../lib/coingecko";

const ACCENTS = [
  { name: "Indigo", value: "#5961F5" },
  { name: "Purple", value: "#7C3AED" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Orange", value: "#F59E0B" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Slate", value: "#64748B" },
];

export default function Settings({
  theme,
  setTheme,
  accent,
  setAccent,
  currency,
  setCurrency,
  compact,
  setCompact,
  reduceMotion,
  setReduceMotion,
  onReset,
  user,
  onSignOut,
}) {
  const [saved, setSaved] = useState("");

  const previewStyle = useMemo(
    () => ({ borderColor: accent, boxShadow: `0 0 0 3px ${accent}22` }),
    [accent]
  );

  const pingSaved = (msg) => {
    setSaved(msg);
    window.clearTimeout(pingSaved._t);
    pingSaved._t = window.setTimeout(() => setSaved(""), 1400);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Appearance */}
      <div className="card">
        <div className="chartTitleRow">
          <div className="chartTitle">Appearance</div>
          <div className="chartHint">Theme + layout</div>
        </div>

        <div className="settingsGrid" style={{ marginTop: 12 }}>
          <div className="settingsItem">
            <div>
              <div className="settingsLabel">Theme</div>
              <div className="muted small">Light / Dark</div>
            </div>

            <div className="toggleGroup">
              <button
                className={`toggleBtn ${theme === "light" ? "active" : ""}`}
                type="button"
                onClick={() => {
                  setTheme("light");
                  pingSaved("Theme saved");
                }}
              >
                ☀️ Light
              </button>
              <button
                className={`toggleBtn ${theme === "dark" ? "active" : ""}`}
                type="button"
                onClick={() => {
                  setTheme("dark");
                  pingSaved("Theme saved");
                }}
              >
                🌙 Dark
              </button>
            </div>
          </div>

          <div className="settingsItem">
            <div>
              <div className="settingsLabel">Compact mode</div>
              <div className="muted small">Tighter spacing</div>
            </div>

            <label className="checkPill">
              <input
                type="checkbox"
                checked={!!compact}
                onChange={(e) => {
                  setCompact(e.target.checked);
                  pingSaved("Layout saved");
                }}
              />
              Compact
            </label>
          </div>

          <div className="settingsItem">
            <div>
              <div className="settingsLabel">Reduce motion</div>
              <div className="muted small">Accessibility-friendly</div>
            </div>

            <label className="checkPill">
              <input
                type="checkbox"
                checked={!!reduceMotion}
                onChange={(e) => {
                  setReduceMotion(e.target.checked);
                  pingSaved("Motion saved");
                }}
              />
              Reduce
            </label>
          </div>

          <div className="settingsItem">
            <div>
              <div className="settingsLabel">Currency</div>
              <div className="muted small">Display preference</div>
            </div>

            <select
              className="select"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                pingSaved("Currency saved");
              }}
              title="Currency"
            >
              <option value="usd">USD ($)</option>
              <option value="eur">EUR (€)</option>
              <option value="gbp">GBP (£)</option>
            </select>
          </div>
        </div>

        {saved ? (
          <div className="muted small" style={{ marginTop: 10 }}>
             {saved}
          </div>
        ) : null}
      </div>

      {/* Accent */}
      <div className="card">
        <div className="chartTitleRow">
          <div className="chartTitle">Accent color</div>
          <div className="chartHint">Personalize the UI</div>
        </div>

        <div className="accentPreview" style={{ marginTop: 12 }}>
          <div className="accentChip" style={previewStyle}>
            <div className="accentDot" style={{ background: accent }} />
            <div>
              <div style={{ fontWeight: 900 }}>Current accent</div>
              <div className="muted small">{accent}</div>
            </div>
          </div>

          <div className="accentSwatches">
            {ACCENTS.map((c) => {
              const active = c.value.toLowerCase() === String(accent).toLowerCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  className={`swatch ${active ? "active" : ""}`}
                  title={c.name}
                  onClick={() => {
                    setAccent(c.value);
                    pingSaved("Accent saved");
                  }}
                  style={{ background: c.value }}
                />
              );
            })}
          </div>
        </div>

        <div className="muted small" style={{ marginTop: 10 }}>
          Accent updates instantly and is saved locally.
        </div>
      </div>

      {/* Reset */}
      <div className="card">
        <div className="chartTitleRow">
          <div className="chartTitle">Reset</div>
          <div className="chartHint">Back to defaults</div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btnPrimary" onClick={onReset} type="button">
            Reset preferences
          </button>
          <button
            className="btnGhost"
            onClick={() => {
              clearCoinGeckoCache();
              pingSaved("API cache cleared");
            }}
            type="button"
          >
            Clear API cache
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="card">
        <div className="chartTitleRow">
          <div className="chartTitle">Account</div>
          <div className="chartHint">Session</div>
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          Signed in as <b>{user?.name}</b>
          {user?.email ? ` (${user.email})` : ""}
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btnGhost" onClick={onSignOut} type="button">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
