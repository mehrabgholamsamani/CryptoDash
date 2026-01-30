import { useEffect, useMemo, useState } from "react";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

const NOTICE_KEY = "cryptoDash:noticeDismissed:v1";

export default function Signup({ onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const [showNotice, setShowNotice] = useState(true);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(NOTICE_KEY) === "1";
      if (dismissed) setShowNotice(false);
    } catch {}
  }, []);

  const dismissNotice = () => {
    setShowNotice(false);
    try {
      localStorage.setItem(NOTICE_KEY, "1");
    } catch {}
  };

  const canSubmit = useMemo(() => {
    return name.trim().length >= 2 && isValidEmail(email) && pw.length >= 6;
  }, [name, email, pw]);

  const submit = (e) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) return setError("Name must be at least 2 characters.");
    if (!isValidEmail(cleanEmail)) return setError("Enter a valid email.");
    if (pw.length < 6) return setError("Password must be at least 6 characters.");

    // By The Way This Is A Fake Sign Up
    onSuccess?.({
      name: cleanName,
      email: cleanEmail,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="authPage">
      {showNotice && (
        <div className="authNoticeBar">
          <div className="authNoticeInner">
            <div className="authNoticeText">
              <div className="authNoticeTitle">Heads up about data reliability</div>
              <div className="authNoticeBody">
                CoinGecko’s free API is unfortunately very rate-limited, so some charts/metrics may occasionally load from cache or fail
                temporarily. I couldnt efford to get Premium as it is very expensive. Thanks for understanding. &#10084;
              </div>
            </div>

            <button
              type="button"
              className="authNoticeClose"
              onClick={dismissNotice}
              aria-label="Dismiss notice"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="authCenter">
        <div className="card authCard">
          <div className="chartTitleRow" style={{ marginBottom: 14 }}>
            <div className="chartTitle">Sign up</div>
            <div className="chartHint">Create your profile to continue</div>
          </div>

          {error ? (
            <div className="emptyState" style={{ marginBottom: 12 }}>
              <b>Fix this</b>
              <div className="muted" style={{ marginTop: 6 }}>
                {error}
              </div>
            </div>
          ) : null}

          <form onSubmit={submit} className="authForm">
            <label className="authLabel">
              <div className="muted small">Name</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mehrab"
                autoComplete="name"
              />
            </label>

            <label className="authLabel">
              <div className="muted small">Email</div>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="authLabel">
              <div className="muted small">Password</div>
              <input
                className="input"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
              />
            </label>

            <button className="btn btnPrimary" type="submit" disabled={!canSubmit}>
              Sign up
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
