// ─── Layer 9: Dashboard — post-auth user control panel ──────────────────────
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSession, signOut } from "@workspace/api-client-react";

const PLAN_META: Record<string, { label: string; color: string; price: string; features: string[] }> = {
  free: {
    label: "FREE",
    color: "var(--green)",
    price: "$0 / forever",
    features: [
      "302N C. elegans connectome",
      "Android APK · Chrome Extension · PWA",
      "3 game profiles",
      "Community support",
    ],
  },
  pro: {
    label: "PRO",
    color: "var(--prime)",
    price: "$4.99 / mo",
    features: [
      "All FREE features",
      "139K Drosophila tier unlocked",
      "Unlimited game profiles",
      "Priority server nodes",
      "Email support",
    ],
  },
  drosophila: {
    label: "DROSOPHILA",
    color: "var(--violet)",
    price: "$99 / mo",
    features: [
      "All PRO features",
      "139,255N full Drosophila connectome",
      "SpikeForge API access",
      "Dedicated node cluster",
      "SLA 99.99% · 24/7 support",
    ],
  },
  enterprise: {
    label: "ENTERPRISE",
    color: "var(--amber)",
    price: "$299 / mo",
    features: [
      "All DROSOPHILA features",
      "On-premise deployment option",
      "Custom connectome training",
      "White-label licensing",
      "Dedicated account manager",
    ],
  },
};

const GAMES = ["Free Fire", "PUBG Mobile", "Mobile Legends", "Valorant", "Fortnite"];

function StatCard({ label, value, sub, color = "var(--cyan)" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="db-stat">
      <div className="db-stat-val" style={{ color }}>{value}</div>
      <div className="db-stat-lbl">{label}</div>
      {sub && <div className="db-stat-sub">{sub}</div>}
    </div>
  );
}

function Passkey({ name, created }: { name: string; created: string }) {
  return (
    <div className="db-pk-row">
      <div className="db-pk-icon">
        <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
          <circle cx="8" cy="8" r="4" stroke="var(--cyan)" strokeWidth="1.5" />
          <path d="M14 8h7M18 6v4M12 12l2 8" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="db-pk-info">
        <div className="db-pk-name">{name}</div>
        <div className="db-pk-date">{created}</div>
      </div>
      <div className="db-pk-badge">ACTIVE</div>
    </div>
  );
}

export function Dashboard() {
  const [, navigate] = useLocation();
  const { data: session, isPending } = useSession();
  const [vpnOn, setVpnOn] = useState(false);
  const [game, setGame] = useState("Free Fire");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      navigate("/");
    }
  }, [isPending, session, navigate]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate("/");
  };

  if (isPending) {
    return (
      <div className="db-loading">
        <div className="db-loader" />
        <span>Authenticating…</span>
      </div>
    );
  }

  if (!session?.user) return null;

  const user = session.user;
  const planKey = (user as Record<string, unknown>).plan as string ?? "free";
  const plan = PLAN_META[planKey] ?? PLAN_META.free;
  const initials = (user.name ?? user.email ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const memberSince = new Date(user.createdAt ?? Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long" });

  return (
    <div className="db-root">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="db-nav">
        <a href="/clonengine/" className="db-nav-logo">
          <div className="nlive" />
          <span className="nlogo-zl">ZERO</span><span className="nlogo-lag">LAG</span>
          <span className="nlogo-tag">by KlonOS</span>
        </a>
        <div className="db-nav-right">
          <div className="db-plan-pill" style={{ borderColor: plan.color, color: plan.color }}>
            {plan.label}
          </div>
          <button className="db-nav-out" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out →"}
          </button>
        </div>
      </nav>

      <div className="db-wrap">

        {/* ── PROFILE ─────────────────────────────────────────────────────── */}
        <div className="db-profile">
          <div className="db-avatar">{initials}</div>
          <div className="db-profile-info">
            <div className="db-pname">{user.name ?? "ZeroLag User"}</div>
            <div className="db-pemail">{user.email}</div>
            <div className="db-pmeta">
              <span className="db-pm-tag">Member since {memberSince}</span>
              <span className="db-pm-sep" />
              <span className="db-pm-plan" style={{ color: plan.color }}>● {plan.label} plan</span>
            </div>
          </div>
          <div className="db-profile-iec">
            <div className="db-iec-label">IEC SCORE</div>
            <div className="db-iec-val">—</div>
            <div className="db-iec-hint">Run benchmark on device</div>
          </div>
        </div>

        {/* ── STATS ───────────────────────────────────────────────────────── */}
        <div className="db-stats">
          <StatCard label="Avg latency saved" value="-44ms" sub="7-day avg" color="var(--green)" />
          <StatCard label="Sessions today" value="0" color="var(--cyan)" />
          <StatCard label="Uptime" value="99.9%" color="var(--prime)" />
          <StatCard label="Devices" value="1" sub="this device" color="var(--violet)" />
          <StatCard label="Packets routed" value="—" color="var(--amber)" />
        </div>

        <div className="db-cols">
          <div className="db-left">

            {/* ── VPN STATUS ──────────────────────────────────────────────── */}
            <div className="db-card">
              <div className="db-card-hd">
                <span className="db-card-title">ZeroLag VPN</span>
                <div
                  className={`db-vpn-toggle ${vpnOn ? "on" : ""}`}
                  onClick={() => setVpnOn(v => !v)}
                  role="switch"
                  aria-checked={vpnOn}
                >
                  <div className="db-vpn-thumb" />
                </div>
              </div>
              <div className={`db-vpn-status ${vpnOn ? "active" : ""}`}>
                <span className="db-vpn-dot" />
                {vpnOn ? "ROUTING ACTIVE · SNN ONLINE" : "STANDBY · NOT ROUTING"}
              </div>
              <div className="db-vpn-row">
                <label className="db-vpn-lbl">Game profile</label>
                <select
                  className="db-vpn-sel"
                  value={game}
                  onChange={e => setGame(e.target.value)}
                >
                  {GAMES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="db-vpn-row">
                <label className="db-vpn-lbl">Server node</label>
                <span className="db-vpn-node">São Paulo · Ring 2 · UDP</span>
              </div>
              {vpnOn && (
                <div className="db-vpn-live">
                  <div className="db-vpn-live-row">
                    <span>Latency to node</span>
                    <span className="db-vl-val" style={{ color: "var(--green)" }}>12ms</span>
                  </div>
                  <div className="db-vpn-live-row">
                    <span>SNN spikes/s</span>
                    <span className="db-vl-val" style={{ color: "var(--cyan)" }}>7,832</span>
                  </div>
                  <div className="db-vpn-live-row">
                    <span>Schumann lock</span>
                    <span className="db-vl-val" style={{ color: "var(--prime)" }}>7.83Hz ✓</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── PLAN ────────────────────────────────────────────────────── */}
            <div className="db-card">
              <div className="db-card-hd">
                <span className="db-card-title">Current plan</span>
                <span className="db-plan-badge" style={{ color: plan.color, borderColor: plan.color }}>
                  {plan.label}
                </span>
              </div>
              <div className="db-plan-price">{plan.price}</div>
              <ul className="db-plan-list">
                {plan.features.map(f => (
                  <li key={f}><span className="db-pl-check" style={{ color: plan.color }}>✓</span>{f}</li>
                ))}
              </ul>
              {planKey === "free" && (
                <a href="/clonengine/#pricing" className="db-upgrade-btn">
                  Upgrade to PRO — $4.99/mo →
                </a>
              )}
              {planKey === "pro" && (
                <a href="/clonengine/#pricing" className="db-upgrade-btn" style={{ "--ub-c": "var(--violet)" } as React.CSSProperties}>
                  Upgrade to DROSOPHILA →
                </a>
              )}
            </div>

          </div>
          <div className="db-right">

            {/* ── DOWNLOADS ───────────────────────────────────────────────── */}
            <div className="db-card">
              <div className="db-card-hd">
                <span className="db-card-title">Downloads</span>
              </div>
              <div className="db-dl-grid">
                {[
                  { icon: "📱", label: "Android APK", sub: "v1.0.0 · arm64-v8a", href: "#" },
                  { icon: "🌐", label: "Chrome Extension", sub: "v1.0.0 · Manifest V3", href: "#" },
                  { icon: "🍎", label: "iOS PWA", sub: "Add to Home Screen", href: "#" },
                  { icon: "⚡", label: "Capacitor APK", sub: "ClonEngine web wrapper", href: "#" },
                ].map(({ icon, label, sub, href }) => (
                  <a key={label} href={href} className="db-dl-item">
                    <div className="db-dl-icon">{icon}</div>
                    <div className="db-dl-info">
                      <div className="db-dl-name">{label}</div>
                      <div className="db-dl-sub">{sub}</div>
                    </div>
                    <div className="db-dl-arrow">↓</div>
                  </a>
                ))}
              </div>
            </div>

            {/* ── SECURITY / PASSKEYS ─────────────────────────────────────── */}
            <div className="db-card">
              <div className="db-card-hd">
                <span className="db-card-title">Security</span>
              </div>
              <div className="db-pk-section">
                <div className="db-pk-ttl">Passkeys</div>
                <Passkey name="This device" created="Registered today" />
                <button className="db-add-pk">
                  <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Add passkey
                </button>
              </div>
              <div className="db-sep" />
              <div className="db-pk-section">
                <div className="db-pk-ttl">Account</div>
                <div className="db-acct-row">
                  <span>Email verified</span>
                  <span className="db-acct-badge ok">✓ Yes</span>
                </div>
                <div className="db-acct-row">
                  <span>Two-factor auth</span>
                  <span className="db-acct-badge">Not set</span>
                </div>
              </div>
              <div className="db-sep" />
              <button className="db-danger-btn" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? "Signing out…" : "Sign out of all devices"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
