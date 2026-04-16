// ─── Layer 8: App — Landing page (shorter) ───────────────────────────────────
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { TICKER_ITEMS }   from "./tokens";
import { HeroCanvas }     from "./canvas/HeroCanvas";
import { Counter, Rv }    from "./ui/atoms";
import { GAMES_DATA }     from "./data/games";
import { PingMeter }      from "./sections/PingMeter";
import { NavBar }         from "./components/NavBar";
import { DownloadModal }  from "./components/DownloadModal";
import { PrivacyModal }   from "./components/PrivacyModal";
import { CryptoPayModal } from "./components/CryptoPayModal";

export default function App() {
  const [dlOpen,     setDlOpen]     = useState(false);
  const [privOpen,   setPrivOpen]   = useState(false);
  const [cryptoOpen, setCryptoOpen] = useState(false);
  const [cryptoPlan, setCryptoPlan] = useState("Pro");
  const [, navigate] = useLocation();

  const openDL    = (e: React.MouseEvent) => { e.preventDefault(); setDlOpen(true); };
  const openPriv  = (e: React.MouseEvent) => { e.preventDefault(); setPrivOpen(true); };
  const openCrypto = (plan: string) => (e: React.MouseEvent) => { e.preventDefault(); setCryptoPlan(plan); setCryptoOpen(true); };

  useEffect(() => {
    if (cryptoOpen && (window as any).paypal) {
      document.getElementById("paypal-button-container")!.innerHTML = "";
      let planId = "P-17M15335A8501272JLXLLNKI"; // Mock ID
      if (cryptoPlan === "Pro") planId = "YOUR_PRO_PLAN_ID";
      if (cryptoPlan === "Drosophila") planId = "YOUR_DRO_PLAN_ID";

      (window as any).paypal.Buttons({
        createSubscription: function(data: any, actions: any) {
          return actions.subscription.create({ 'plan_id': planId });
        },
        onApprove: function(data: any, actions: any) {
          alert('You have successfully subscribed to ' + data.subscriptionID);
          setCryptoOpen(false);
        }
      }).render('#paypal-button-container');
    }
  }, [cryptoOpen, cryptoPlan]);


  useEffect(() => {

  }, []);

  return (
    <>
      <DownloadModal  open={dlOpen}     onClose={() => setDlOpen(false)} />
      <PrivacyModal   open={privOpen}   onClose={() => setPrivOpen(false)} />
      <CryptoPayModal open={cryptoOpen} plan={cryptoPlan} onClose={() => setCryptoOpen(false)} />

      <NavBar onDownload={() => setDlOpen(true)} />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section id="hero">
        <HeroCanvas />
        <div className="hero-in">
          <div>
            <Rv cls="htag">
              <span className="htag-icon">🎮</span>
              <div className="htag-d" />
              GAMING VPN · NEUROMORPHIC AI · ANDROID + CHROME + iOS
            </Rv>
            <Rv cls="d1"><h1 className="ht display">
              <span className="t1">Destroy</span>
              <span className="t2">high ping.</span>
              <span className="t3">Win more.</span>
            </h1></Rv>
            <Rv cls="d2"><p className="hp">
              <strong>ZeroLag</strong> routes your game packets through a 302-neuron AI engine — trained on real biology — directly to the fastest server node. <strong>Free Fire, Valorant, PUBG, Fortnite.</strong> Works on Android, Chrome &amp; iOS. <strong>No config. No GPU. No excuses.</strong>
            </p></Rv>
            <Rv cls="d3">
              <div className="hbtns">
                <a href="#pricing" className="btn-m">Get ZeroLag free →</a>
                <a href="/engineering" className="btn-g" onClick={e => { e.preventDefault(); navigate("/engineering"); }}>How it works ↓</a>
              </div>
              <div className="hplatforms">
                <button className="hplat" onClick={openDL}>📱 Android APK</button>
                <button className="hplat" onClick={openDL}>🌐 Chrome Extension</button>
                <button className="hplat" onClick={openDL}>🍎 iOS PWA</button>
              </div>
            </Rv>
            <Rv cls="d4"><div className="hnums">
              <div className="hnum"><div className="hnv">-<Counter target={44} suffix="ms" /></div><div className="hnl">Avg latency saved</div></div>
              <div className="hnum"><div className="hnv"><Counter target={12} suffix="" /></div><div className="hnl">Top games supported</div></div>
              <div className="hnum"><div className="hnv">SNN<span className="u">AI</span></div><div className="hnl">Packet routing engine</div></div>
              <div className="hnum"><div className="hnv">$0</div><div className="hnl">Forever free plan</div></div>
            </div></Rv>
          </div>
          <Rv cls="d2"><PingMeter /></Rv>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ─────────────────────────────────────────────── */}
      <div className="social-strip">
        <div className="ss-item"><span className="ss-num">-44ms</span><span className="ss-lbl">Avg latency saved</span></div>
        <div className="ss-sep" />
        <div className="ss-item"><span className="ss-num">12</span><span className="ss-lbl">Top games</span></div>
        <div className="ss-sep" />
        <div className="ss-item"><span className="ss-num">$0</span><span className="ss-lbl">Forever free</span></div>
        <div className="ss-sep" />
        <div className="ss-item"><span className="ss-num">3</span><span className="ss-lbl">Platforms</span></div>
        <div className="ss-sep" />
        <div className="ss-item"><span className="ss-num">302N</span><span className="ss-lbl">AI neurons</span></div>
      </div>

      {/* ── VS STRIP ──────────────────────────────────────────────────────── */}
      <div className="vs-strip">
        <div className="vs-header">
          <div className="vs-header-left">
            <span className="vs-label">⚡ PING KILLER RANKING</span>
            <span className="vs-note">How many milliseconds each tool removes from your ping · Free Fire LATAM servers</span>
          </div>
          <div className="vs-legend">
            <span className="vs-leg-bar" style={{ background: "linear-gradient(90deg,var(--prime),var(--amber))" }} />
            <span className="vs-leg-txt">MORE BAR = MORE PING REMOVED = BETTER</span>
          </div>
        </div>
        <div className="vs-winner-card">
          <div className="vs-winner-left">
            <div className="vs-winner-rank"><span className="vs-crown">👑</span><span className="vs-rank-num">#1</span></div>
            <div className="vs-winner-info">
              <div className="vs-winner-name">ZeroLag <span className="vs-winner-tag">by KlonOS</span></div>
              <div className="vs-winner-tech">SNN AI · TUN VPN · Android + iOS + Chrome · FREE</div>
            </div>
          </div>
          <div className="vs-winner-right">
            <div className="vs-winner-bar-wrap">
              <div className="vs-winner-bar" />
              <div className="vs-winner-bar-label">100% — best result</div>
            </div>
            <div className="vs-winner-num"><span className="vs-win-big">44</span><span className="vs-win-unit">ms removed</span></div>
          </div>
        </div>
        <div className="vs-comp-header"><span className="vs-comp-label">COMPETITORS — removing less ping than ZeroLag</span></div>
        <div className="vs-board">
          {([
            { rank: "2", name: "ExitLag",  ms: 28, tech: "Multi-path · PC only · paid",       pct: 64 },
            { rank: "3", name: "WTFast",   ms: 21, tech: "GPN tunnel · No mobile · paid",      pct: 48 },
            { rank: "4", name: "Mudfish",  ms: 18, tech: "Proxy nodes · Complex setup · paid", pct: 41 },
            { rank: "5", name: "NoPing",   ms: 15, tech: "Manual config · Windows only · paid",pct: 34 },
          ] as const).map(({ rank, name, ms, tech, pct }) => (
            <div key={name} className="vs-row2">
              <span className="vs-rank">{rank}</span>
              <span className="vs-nm">{name}</span>
              <div className="vs-bar-wrap"><div className="vs-bar2" style={{ width: `${pct}%`, background: "rgba(200,223,240,.14)" }} /></div>
              <div className="vs-ms-wrap"><span className="vs-ms-num">{ms}ms</span><span className="vs-ms-removed">removed</span></div>
              <span className="vs-tech2">{tech}</span>
            </div>
          ))}
        </div>
        <div className="vs-footnote">
          ✓ ZeroLag removes <strong>44ms</strong> of ping — {Math.round(44/28*100-100)}% more than ExitLag, {Math.round(44/15*100-100)}% more than NoPing. Measured on Free Fire SA servers from São Paulo.
        </div>
      </div>

      {/* ── TICKER ────────────────────────────────────────────────────────── */}
      <div className="ticker">
        <div className="ttrack">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map(([b, t], i) => (
            <div key={i} className="ti"><b>{b}</b>{t}</div>
          ))}
        </div>
      </div>

      {/* ── QUICK LINKS ─────────────────────────────────────────────────────  */}
      <div className="quick-links-strip">
        <div className="wrap">
          <div className="ql-label">Explore KlonOS</div>
          <div className="ql-cards">
            <a href="/engineering" className="ql-card" onClick={e => { e.preventDefault(); navigate("/engineering"); }}>
              <div className="ql-icon">⚙️</div>
              <div className="ql-name">Engineering</div>
              <div className="ql-sub">Architecture · Benchmarks · Innovation</div>
            </a>
            <a href="/apps" className="ql-card" onClick={e => { e.preventDefault(); navigate("/apps"); }}>
              <div className="ql-icon">📦</div>
              <div className="ql-name">Apps</div>
              <div className="ql-sub">KlonOS · Chrome · APK · Capacitor · SDK</div>
            </a>
            <a href="/docs" className="ql-card" onClick={e => { e.preventDefault(); navigate("/docs"); }}>
              <div className="ql-icon">📋</div>
              <div className="ql-name">Docs</div>
              <div className="ql-sub">Changelog · API · Build guide</div>
            </a>
          </div>
        </div>
      </div>

      {/* ── GAMES ─────────────────────────────────────────────────────────── */}
      <section id="games">
        <div className="wrap">
          <Rv cls="sh">
            <div className="sb">Compatible Games</div>
            <h2 className="stitle display">Zero lag.<br /><em>Every game.</em></h2>
            <p className="ssub">ZeroLag intercepts every game packet at the TUN layer before it reaches your ISP and routes it through the fastest Pascal Ring path.</p>
          </Rv>
          <div className="games-strip">
            <div className="gs-badge"><span className="gsbdot" />LIVE · SNN PACKET ROUTING ACTIVE</div>
            <div className="gs-stats">
              <div className="gss"><span>Avg Latency Saved</span><b>-44ms</b></div>
              <div className="gss"><span>Packets Classified</span><b>Ring 2 · UDP</b></div>
              <div className="gss"><span>Schumann Lock</span><b>7.83Hz ✓</b></div>
            </div>
          </div>
          <div className="games-grid">
            {GAMES_DATA.map(({ icon, name, genre, plat, lat, ring, col }, i) => (
              <Rv key={name} cls={`d${(i % 4) + 1} gcard`} style={{ "--gc": col } as React.CSSProperties}>
                <div className="gcard-top">
                  <div className="gico-wrap" style={{ background: col + "18", border: `1px solid ${col}33` }}>
                    <svg viewBox="0 0 48 48" width="48" height="48" fill="none">{icon(col)}</svg>
                  </div>
                  <div className="glat" style={{ color: col }}>{lat}</div>
                </div>
                <div className="gname">{name}</div>
                <div className="gmeta">{genre} · <span>{plat}</span></div>
                <div className="gring">{ring}</div>
                <div className="gbar"><div className="gfill" style={{ width: `${Math.abs(parseInt(lat)) / 70 * 100}%`, background: col }} /></div>
              </Rv>
            ))}
          </div>
          <Rv cls="d2 games-cta">
            <p className="gcta-note">Works out of the box on Android APK · Chrome Extension · iOS PWA · No configuration required</p>
            <div className="gcta-btns">
              <a href="#" className="btn-m" onClick={openDL}>Download ZeroLag free →</a>
              <a href="/apps" className="btn-g" onClick={e => { e.preventDefault(); navigate("/apps"); }}>View all products ↓</a>
            </div>
          </Rv>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing">
        <div className="wrap">
          <Rv cls="sh" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 72px" }}>
            <div className="sb">Pricing</div>
            <h2 className="stitle display">Kill your ping.<br /><em>Choose your plan.</em></h2>
            <p className="ssub">Solo player, squad grinder, researcher, or gaming café owner — there's a plan for you.</p>
          </Rv>
          <div className="pgrid">
            <Rv cls="pc">
              <div className="ptier">Solo Player</div>
              <div className="pname2">Free</div>
              <div className="pamt">$0</div>
              <div className="pper">Forever free · 1 device · No card needed</div>
              <div className="pdiv" />
              <ul className="pfeats">
                <li><span className="ok">✓</span><span><span className="fem">Kill lag immediately</span> — install and play</span></li>
                <li><span className="ok">✓</span><span>Android APK + Chrome Extension + iOS PWA</span></li>
                <li><span className="ok">✓</span><span>AI routing engine <span className="fem">(302-neuron SNN)</span></span></li>
                <li><span className="ok">✓</span><span>Free Fire · Mobile Legends · PUBG Mobile</span></li>
                <li><span className="ok">✓</span><span>Real-time ping display on screen</span></li>
                <li><span className="ok">✓</span><span>LATAM server database pre-loaded</span></li>
                <li><span className="no">—</span><span style={{ opacity: .35 }}>Multi-hop AI routing (Pro)</span></li>
                <li><span className="no">—</span><span style={{ opacity: .35 }}>5-device squad mode (Pro)</span></li>
              </ul>
              <a href="#" className="pbtn pbtn-g" onClick={openDL}>Get ZeroLag free →</a>
            </Rv>

            <Rv cls="pc pop d1">
              <div className="pbdg">MOST POPULAR</div>
              <div className="ptier">Ranked Grinder</div>
              <div className="pname2">Pro</div>
              <div className="pamt">$4<sub>.99/mo</sub></div>
              <div className="pper">or $29.99/year · Up to 5 devices</div>
              <div className="pdiv" />
              <ul className="pfeats">
                <li><span className="ok">✓</span><span>Everything in Free</span></li>
                <li><span className="ok">✓</span><span><span className="fem">Enhanced AI routing</span> — multi-hop paths</span></li>
                <li><span className="ok">✓</span><span>Less jitter, steadier ping under load</span></li>
                <li><span className="ok">✓</span><span><span className="fem">12 games</span> — Valorant, COD, Fortnite + more</span></li>
                <li><span className="ok">✓</span><span>5 devices — share with your squad or family</span></li>
                <li><span className="ok">✓</span><span>Live analytics — ms saved per game session</span></li>
                <li><span className="ok">✓</span><span>Priority server queue at peak hours</span></li>
                <li><span className="no">—</span><span style={{ opacity: .35 }}>Drosophila 139K engine (Science)</span></li>
              </ul>
              <a href="#" className="pbtn pbtn-m" onClick={openDL}>Start Pro — 14 days free</a>
              <a href="#" className="pbtn-crypto" onClick={openCrypto("Pro")}>◈ Pay with Crypto (SOL · ETH)</a>
            </Rv>

            <Rv cls="pc d2">
              <div className="pbadge" style={{ background: "rgba(155,93,229,.12)", color: "#c084fc", border: "1px solid rgba(155,93,229,.35)" }}>◈ SCIENCE</div>
              <div className="ptier">Researcher · Developer</div>
              <div className="pname2">Drosophila</div>
              <div className="pamt" style={{ color: "#c084fc", textShadow: "0 0 28px rgba(155,93,229,.5)" }}>$99<sub>/mo</sub></div>
              <div className="pper">or $799/year · Up to 10 devices</div>
              <div className="pdiv" />
              <ul className="pfeats">
                <li><span className="ok" style={{ color: "#c084fc" }}>✓</span><span>Everything in Pro</span></li>
                <li><span className="ok" style={{ color: "#c084fc" }}>✓</span><span><span className="fem">139,255-neuron Drosophila engine</span> — 433× C. elegans</span></li>
                <li><span className="ok" style={{ color: "#c084fc" }}>✓</span><span><span className="fem">Schumann 7.83Hz lock</span> — full sync mode active</span></li>
                <li><span className="ok" style={{ color: "#c084fc" }}>✓</span><span><span className="fem">Export CSV</span> — every session, every ms saved</span></li>
                <li><span className="ok" style={{ color: "#c084fc" }}>✓</span><span>10 devices · NEAT topology evolution on</span></li>
                <li><span className="ok" style={{ color: "#c084fc" }}>✓</span><span>Raw SNN telemetry dashboard</span></li>
              </ul>
              <a href="mailto:klonengine@proton.me" className="pbtn" style={{ background: "rgba(155,93,229,.15)", border: "1px solid rgba(155,93,229,.45)", color: "#c084fc", marginTop: 28 }}>Get Drosophila →</a>
              <a href="#" className="pbtn-crypto" onClick={openCrypto("Drosophila")} style={{ borderColor: "rgba(192,132,252,.35)", color: "rgba(192,132,252,.8)" }}>◈ Pay with Crypto (SOL · ETH)</a>
            </Rv>

            <Rv cls="pc d3">
              <div className="ptier">Cibercafé · Esports Org</div>
              <div className="pname2">Enterprise</div>
              <div className="pamt">$299<sub>/mo</sub></div>
              <div className="pper">Unlimited seats · All your PCs + phones · SLA 99.9%</div>
              <div className="ent-who">
                <div className="ent-who-title">This plan is for</div>
                <div className="ent-who-items">
                  <span>🖥️ Gaming cafés / cibercafés</span>
                  <span>🏆 Esports teams & orgs</span>
                  <span>🎮 Tournament organizers</span>
                  <span>🏠 Gaming bootcamp houses</span>
                </div>
              </div>
              <div className="pdiv" />
              <ul className="pfeats">
                <li><span className="ok">✓</span><span>Everything in Pro on <span className="fem">unlimited devices</span></span></li>
                <li><span className="ok">✓</span><span><span className="fem">Central dashboard</span> — manage every seat at once</span></li>
                <li><span className="ok">✓</span><span>White-label — show <span className="fem">your café's logo</span>, not ours</span></li>
                <li><span className="ok">✓</span><span>API access — connect to your billing system</span></li>
                <li><span className="ok">✓</span><span>Dedicated support + 99.9% uptime guarantee</span></li>
                <li><span className="ok">✓</span><span>Custom server routing for your city / region</span></li>
                <li><span className="ok">✓</span><span>Free onboarding call included</span></li>
              </ul>
              <a href="mailto:klonengine@proton.me" className="pbtn pbtn-g">Talk to us →</a>
              <a href="#" className="pbtn-crypto" onClick={openCrypto("Enterprise")}>◈ Pay with Crypto (SOL · ETH)</a>
            </Rv>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section id="cta">
        <div className="ctain">
          <Rv cls="ctal">Free · No card · Works in 60 seconds</Rv>
          <Rv cls="d1"><h2 className="ctat display">Stop losing games<br /><em>to bad internet.</em></h2></Rv>
          <Rv cls="d2"><p className="ctas">Your rivals aren't better than you. They just have lower ping. Install ZeroLag free and find out exactly how many milliseconds you've been losing.</p></Rv>
          <Rv cls="d3" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <a href="#pricing" className="btn-m" style={{ fontSize: 16, padding: "16px 36px" }}>Get ZeroLag free →</a>
            <a href="#games"   className="btn-g" style={{ fontSize: 16, padding: "16px 28px" }}>See supported games ↓</a>
          </Rv>
          <Rv cls="d4 ctanote">No credit card · No account needed · Android + Chrome + iOS</Rv>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer>
        <div className="wrap">
          <div className="fg">
            <div>
              <div className="flogo">ZEROLAG</div>
              <p className="ftag">Gaming VPN powered by a 302-neuron AI engine trained on real biology. Kill your ping on Free Fire, Mobile Legends and PUBG — free, on Android, Chrome & iOS.</p>
            </div>
            <div>
              <div className="fch">Download</div>
              <ul className="flinks">
                <li><a href="#" onClick={openDL}>Android APK</a></li>
                <li><a href="#" onClick={openDL}>Chrome Extension</a></li>
                <li><a href="#" onClick={openDL}>iOS PWA</a></li>
                <li><a href="#" onClick={openDL}>Windows (beta)</a></li>
              </ul>
            </div>
            <div>
              <div className="fch">Explore</div>
              <ul className="flinks">
                <li><a href="/engineering" onClick={e => { e.preventDefault(); navigate("/engineering"); }}>Engineering</a></li>
                <li><a href="/apps"        onClick={e => { e.preventDefault(); navigate("/apps"); }}>All Apps</a></li>
                <li><a href="/docs"        onClick={e => { e.preventDefault(); navigate("/docs"); }}>Documentation</a></li>
                <li><a href="/dashboard"   onClick={e => { e.preventDefault(); navigate("/dashboard"); }}>Dashboard</a></li>
              </ul>
            </div>
            <div>
              <div className="fch">Company</div>
              <ul className="flinks">
                <li><a href="mailto:klonengine@proton.me">Contact us</a></li>
                <li><a href="#pricing">Enterprise / Cibercafé</a></li>
                <li><a href="#" onClick={openPriv}>Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="fbot">
            <div className="fcopy">© 2026 ZeroLag by KlonOS · Juan José Salgado Fuentes · New Orleans, Louisiana</div>
            <div className="fdoi">SNN · 302N · LATAM Optimized · Free Forever</div>
          </div>
        </div>
      </footer>
    </>
  );
}
