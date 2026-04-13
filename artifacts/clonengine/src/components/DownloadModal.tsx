import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PLATFORMS = [
  {
    id: "android",
    icon: (
      <svg viewBox="0 0 48 48" width="36" height="36" fill="none">
        <path d="M12 35c0 1.1.9 2 2 2h2v6a2 2 0 004 0v-6h8v6a2 2 0 004 0v-6h2a2 2 0 002-2V18H12v17zm-4-17a2 2 0 00-2 2v10a2 2 0 004 0V20a2 2 0 00-2-2zm32 0a2 2 0 00-2 2v10a2 2 0 004 0V20a2 2 0 00-2-2zM30.5 7.6l2.1-2.1a1 1 0 10-1.4-1.4l-2.4 2.4A11.9 11.9 0 0024 6c-1.3 0-2.6.2-3.8.5L17.8 4.1a1 1 0 10-1.4 1.4l2.1 2.1A11.96 11.96 0 0012 18h24c0-4.2-2.1-7.9-5.5-10.4zM20 14a1 1 0 110-2 1 1 0 010 2zm8 0a1 1 0 110-2 1 1 0 010 2z" fill="#00d4ff"/>
      </svg>
    ),
    badge: "BETA",
    badgeColor: "#ff7a1a",
    name: "Android APK",
    desc: "Native Android app — direct APK install. No Play Store needed. Requires \"Install from unknown sources\" enabled.",
    sub: "Android 7.0+ · ARM64 · ~18MB",
    status: "early-access",
    statusLabel: "Early Access",
    cta: "Request APK Access →",
    ctaHref: "mailto:klonengine@proton.me?subject=ZeroLag%20Android%20APK%20-%20Early%20Access&body=Hello%2C%20I%20want%20early%20access%20to%20the%20ZeroLag%20Android%20APK.%0A%0ADevice%3A%20%0ACountry%3A%20%0AMain%20game%3A%20",
    note: "Send an email — we'll reply with the APK within 24h",
  },
  {
    id: "chrome",
    icon: (
      <svg viewBox="0 0 48 48" width="36" height="36" fill="none">
        <circle cx="24" cy="24" r="10" stroke="#00ff94" strokeWidth="2"/>
        <circle cx="24" cy="24" r="4" fill="#00ff94"/>
        <path d="M24 14h16M14.5 31L6.5 17M33.5 31l-8 13.9" stroke="#00ff94" strokeWidth="2"/>
      </svg>
    ),
    badge: "LIVE",
    badgeColor: "#00ff94",
    name: "Chrome Extension",
    desc: "Install directly from the Chrome Web Store or as a developer build. Works on Chrome, Brave, Edge, Opera.",
    sub: "Chromium 110+ · Manifest V3",
    status: "available",
    statusLabel: "Available Now",
    cta: "Install Developer Build →",
    ctaHref: "mailto:klonengine@proton.me?subject=ZeroLag%20Chrome%20Extension%20-%20Install&body=Hello%2C%20I%20want%20to%20install%20the%20ZeroLag%20Chrome%20Extension.%0A%0ABrowser%3A%20Chrome%20%2F%20Brave%20%2F%20Edge%0AOS%3A%20",
    note: "Chrome Web Store listing coming soon — developer build available now",
  },
  {
    id: "ios",
    icon: (
      <svg viewBox="0 0 48 48" width="36" height="36" fill="none">
        <rect x="12" y="4" width="24" height="40" rx="4" stroke="#ffc300" strokeWidth="2"/>
        <circle cx="24" cy="38" r="2" fill="#ffc300"/>
        <path d="M20 4h8" stroke="#ffc300" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    badge: "PWA",
    badgeColor: "#ffc300",
    name: "iOS PWA",
    desc: "Progressive Web App — runs from Safari on iPhone/iPad. No App Store needed. Add to Home Screen for native-like experience.",
    sub: "iOS 15+ · Safari · iPhone + iPad",
    status: "available",
    statusLabel: "Available Now",
    cta: "Install PWA →",
    ctaHref: "mailto:klonengine@proton.me?subject=ZeroLag%20iOS%20PWA%20-%20Install%20Link&body=Hello%2C%20I%20want%20the%20install%20link%20for%20the%20ZeroLag%20iOS%20PWA.%0A%0ADevice%3A%20iPhone%20%2F%20iPad%0AiOS%20version%3A%20",
    note: "We'll send you the direct install URL for Safari",
  },
];

export function DownloadModal({ open, onClose }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="dlm-overlay" onClick={onClose}>
      <div className="dlm-card" onClick={e => e.stopPropagation()}>
        <button className="dlm-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="dlm-head">
          <div className="dlm-logo">
            <div className="nlive" style={{ marginRight: 8 }} />
            <span className="nlogo-zl">ZERO</span><span className="nlogo-lag">LAG</span>
          </div>
          <h2 className="dlm-title">Get ZeroLag</h2>
          <p className="dlm-sub">Free on all platforms · No credit card · No account required</p>
        </div>

        <div className="dlm-platforms">
          {PLATFORMS.map(p => (
            <div key={p.id} className="dlm-plat">
              <div className="dlm-plat-top">
                <div className="dlm-ico">{p.icon}</div>
                <div className="dlm-plat-info">
                  <div className="dlm-plat-name">{p.name}</div>
                  <div className="dlm-plat-sub">{p.sub}</div>
                </div>
                <div className="dlm-badge" style={{ background: p.badgeColor + "22", color: p.badgeColor, border: `1px solid ${p.badgeColor}55` }}>
                  {p.status === "available" ? "● " : "○ "}{p.statusLabel}
                </div>
              </div>
              <p className="dlm-plat-desc">{p.desc}</p>
              <a href={p.ctaHref} className="dlm-cta" style={{ borderColor: p.badgeColor + "55", color: p.badgeColor }}>
                {p.cta}
              </a>
              <div className="dlm-note">{p.note}</div>
            </div>
          ))}
        </div>

        <div className="dlm-footer">
          <div className="dlm-footer-line">
            <span>Questions?</span>
            <a href="mailto:klonengine@proton.me">klonengine@proton.me</a>
            <span>·</span>
            <span>Juan José Salgado Fuentes · New Orleans</span>
          </div>
          <div className="dlm-footer-note">
            ZeroLag is free forever on 1 device. No VPN logs. No data collection. Open source engine.
          </div>
        </div>
      </div>
    </div>
  );
}
