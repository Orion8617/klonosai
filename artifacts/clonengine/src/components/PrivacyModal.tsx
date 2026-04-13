import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PrivacyModal({ open, onClose }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
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
      <div className="priv-card" onClick={e => e.stopPropagation()}>
        <button className="dlm-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="priv-body">
          <div className="priv-logo">
            <div className="nlive" style={{ marginRight: 8 }} />
            <span className="nlogo-zl">ZERO</span><span className="nlogo-lag">LAG</span>
          </div>

          <h1 className="priv-h1">Privacy Policy</h1>
          <p className="priv-date">Last updated: April 13, 2026</p>

          <p className="priv-intro">
            ZeroLag by KlonOS is developed by Juan José Salgado Fuentes ("we", "us", "our").
            This privacy policy explains what data we collect, how we use it, and your rights under
            applicable law — including Brazil's LGPD (Lei Geral de Proteção de Dados) and the
            GDPR as applied to Latin American users.
          </p>

          <h2 className="priv-h2">1. Who we are</h2>
          <p className="priv-p">
            ZeroLag is a gaming VPN service powered by a neuromorphic AI engine (SNN — Spiking Neural
            Network) trained on the C. elegans connectome. The service routes game network packets to
            reduce latency. It is operated by Juan José Salgado Fuentes, New Orleans, USA.
            Contact: <a href="mailto:klonengine@proton.me" className="priv-link">klonengine@proton.me</a>
          </p>

          <h2 className="priv-h2">2. Data we collect</h2>
          <p className="priv-p"><strong>We collect the minimum possible.</strong></p>
          <table className="priv-table">
            <thead>
              <tr><th>Data</th><th>Why</th><th>Stored?</th></tr>
            </thead>
            <tbody>
              <tr><td>Email address (optional)</td><td>Early access requests, product updates you opt into</td><td>Yes, until you unsubscribe</td></tr>
              <tr><td>Game packets in transit</td><td>Routing to lower-latency nodes in real time</td><td>No — never logged, never stored</td></tr>
              <tr><td>Ping metrics per session (optional)</td><td>Show you your latency improvement on screen</td><td>Local device only — not sent to us</td></tr>
              <tr><td>Crash logs (optional, opt-in)</td><td>Fix bugs in the app</td><td>Anonymized, 30-day retention max</td></tr>
            </tbody>
          </table>
          <p className="priv-p priv-strong">
            We do <strong>NOT</strong> collect: IP addresses for logging purposes, browsing history,
            game scores, personal messages, payment data (handled by Stripe/processors directly),
            device identifiers for tracking, or any data sold to third parties. Ever.
          </p>

          <h2 className="priv-h2">3. VPN tunnel — what we see</h2>
          <p className="priv-p">
            ZeroLag operates a TUN-layer VPN on your device. Game packets are classified by the SNN
            engine entirely <strong>on your device</strong> — the AI runs locally. Packets are forwarded
            to the optimal routing node without being inspected, stored, or analyzed by our servers.
            We operate a <strong>strict no-logs policy</strong>: no connection timestamps, no IP addresses,
            no session durations are recorded at the server level.
          </p>
          <p className="priv-p">
            The SNN classification runs at the TUN interface on your hardware only. No biometric or
            behavioral data is transmitted. The Schumann resonance scheduler (7.83 Hz) and all AI
            inference run in-process on your device.
          </p>

          <h2 className="priv-h2">4. Third-party services</h2>
          <p className="priv-p">
            We use the following third-party processors, each with their own privacy policies:
          </p>
          <ul className="priv-ul">
            <li><strong>Stripe</strong> — payment processing (Pro / Drosophila / Enterprise plans). We never see or store card numbers. Stripe's policy: stripe.com/privacy</li>
            <li><strong>Google Fonts</strong> — font delivery on this website only. Fonts are loaded over HTTPS. See Google's policy at policies.google.com</li>
          </ul>
          <p className="priv-p">We do not use Google Analytics, Facebook Pixel, Hotjar, FullStory, or any behavioral tracking tool on this site.</p>

          <h2 className="priv-h2">5. Cookies</h2>
          <p className="priv-p">
            This website uses no tracking cookies. We use one functional session cookie if you log into a paid account, which expires when you close your browser. No advertising cookies. No analytics cookies.
          </p>

          <h2 className="priv-h2">6. Data retention</h2>
          <p className="priv-p">
            Email addresses for early-access lists: retained until you unsubscribe or request deletion.
            Paid account data: retained for the duration of your subscription + 90 days for legal/billing reasons.
            All other data: not retained (see Section 2).
          </p>

          <h2 className="priv-h2">7. Your rights (LGPD, GDPR)</h2>
          <p className="priv-p">Under Brazil's LGPD and the GDPR, you have the right to:</p>
          <ul className="priv-ul">
            <li><strong>Access</strong> — request a copy of all data we hold about you</li>
            <li><strong>Correction</strong> — correct inaccurate data</li>
            <li><strong>Deletion</strong> — request erasure of your data ("right to be forgotten")</li>
            <li><strong>Portability</strong> — receive your data in a machine-readable format</li>
            <li><strong>Objection</strong> — object to processing based on legitimate interests</li>
            <li><strong>Withdrawal of consent</strong> — unsubscribe from communications at any time</li>
          </ul>
          <p className="priv-p">
            To exercise any right, email <a href="mailto:klonengine@proton.me" className="priv-link">klonengine@proton.me</a> with the subject "Privacy Request". We will respond within 15 business days.
          </p>

          <h2 className="priv-h2">8. Children's privacy</h2>
          <p className="priv-p">
            ZeroLag is not directed at children under 13. We do not knowingly collect data from minors. If you believe a minor has provided us data, contact us immediately and we will delete it.
          </p>

          <h2 className="priv-h2">9. Security</h2>
          <p className="priv-p">
            All data in transit uses TLS 1.3. Stored email addresses are encrypted at rest. We undergo periodic security reviews. The ZeroLag SNN engine is open-source and auditable.
          </p>

          <h2 className="priv-h2">10. Changes to this policy</h2>
          <p className="priv-p">
            If we make material changes, we will notify users by email (if you have subscribed) and update the "Last updated" date above. Continued use of the service after changes constitutes acceptance.
          </p>

          <h2 className="priv-h2">11. Contact</h2>
          <p className="priv-p">
            Data controller: Juan José Salgado Fuentes<br/>
            Email: <a href="mailto:klonengine@proton.me" className="priv-link">klonengine@proton.me</a><br/>
            Company: KlonOS / ZeroLag<br/>
            Location: New Orleans, USA
          </p>

          <div className="priv-footer">
            This policy was last reviewed April 13, 2026 and applies to all ZeroLag products: Android APK, Chrome Extension, iOS PWA, and web services.
          </div>
        </div>
      </div>
    </div>
  );
}
