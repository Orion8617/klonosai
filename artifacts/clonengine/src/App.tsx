// ─── Layer 8: App — Layout composer (imports from all layers) ────────────────
//
//  Layer 0  tokens.ts              ← TICKER_ITEMS
//  Layer 1  engine/snn.ts          ← Izhikevich + SpikeForge pipeline
//  Layer 2  engine/orbital.ts      ← SATS (24 orbital nodes)
//  Layer 3  canvas/HeroCanvas.tsx  ← wireframe globe animation
//  Layer 4  canvas/SciCanvas.tsx   ← SNN hexagonal canvas
//  Layer 5  ui/atoms.tsx           ← BenchBar · Counter · Rv
//  Layer 6  data/games.tsx         ← GAMES_DATA
//  Layer 7  sections/PingMeter.tsx ← latency HUD
//  Layer 8  App.tsx                ← this file: Nav + sections + footer

import { useEffect, useState } from "react";
import { TICKER_ITEMS }   from "./tokens";
import { HeroCanvas }     from "./canvas/HeroCanvas";
import { SciCanvas }      from "./canvas/SciCanvas";
import { BenchBar, Counter, Rv } from "./ui/atoms";
import { GAMES_DATA }     from "./data/games";
import { PingMeter }         from "./sections/PingMeter";
import { EngineProfiler }    from "./sections/EngineProfiler";
import { DownloadModal }     from "./components/DownloadModal";
import { PrivacyModal }      from "./components/PrivacyModal";

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [sciSpk,   setSciSpk]   = useState(0);
  const [dlOpen,   setDlOpen]   = useState(false);
  const [privOpen, setPrivOpen] = useState(false);

  const openDL   = (e: React.MouseEvent) => { e.preventDefault(); setDlOpen(true); };
  const openPriv = (e: React.MouseEvent) => { e.preventDefault(); setPrivOpen(true); };

  useEffect(() => {
    // Custom cursor — orange crosshair
    const cur   = document.createElement("div"); cur.id = "cursor";
    cur.innerHTML = `<svg viewBox="0 0 12 12" width="12" height="12"><polygon points="6,0 11,9 6,7 1,9" fill="#ff7a1a"/></svg>`;
    const trail = document.createElement("div"); trail.id = "cursor-trail";
    document.body.appendChild(cur); document.body.appendChild(trail);
    let mx = 0, my = 0;
    const mm = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      cur.style.left = mx + "px"; cur.style.top = my + "px";
      setTimeout(() => { trail.style.left = mx + "px"; trail.style.top = my + "px"; }, 80);
    };
    document.addEventListener("mousemove", mm);
    const scroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => { cur.remove(); trail.remove(); document.removeEventListener("mousemove", mm); window.removeEventListener("scroll", scroll); };
  }, []);

  return (
    <>
      <DownloadModal open={dlOpen}   onClose={() => setDlOpen(false)} />
      <PrivacyModal  open={privOpen} onClose={() => setPrivOpen(false)} />

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav id="nav" className={scrolled ? "scrolled" : ""}>
        <div className="nav-in">
          <a href="#" className="nav-logo">
            <div className="nlive" />
            <span className="nlogo-zl">ZERO</span><span className="nlogo-lag">LAG</span>
            <span className="nlogo-tag">by KlonOS</span>
          </a>
          <ul className="nav-links">
            <li><a href="#games">Games</a></li>
            <li><a href="#how">How it works</a></li>
            <li><a href="#products">Products</a></li>
            <li><a href="#benchmarks">Benchmarks</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#pricing" className="nav-cta">Kill my lag →</a></li>
          </ul>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
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
                <a href="#games" className="btn-g">See supported games ↓</a>
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

      {/* ── SOCIAL PROOF STRIP ────────────────────────────────────────────── */}
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

      {/* ── PING KILLER RANKING ───────────────────────────────────────────── */}
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
          ✓ ZeroLag removes <strong>44ms</strong> of ping — {Math.round(44/28*100-100)}% more than ExitLag, {Math.round(44/15*100-100)}% more than NoPing. Measured on Free Fire SA servers from São Paulo. Higher = better.
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

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how">
        <div className="wrap">
          <Rv cls="sh">
            <div className="sb">Architecture</div>
            <h2 className="stitle display">Three mechanisms.<br /><em>One biological brain.</em></h2>
            <p className="ssub">NEAT, STBP, and R-STDP run simultaneously at three biological timescales — all coordinated by the Schumann resonance scheduler at 7.83Hz.</p>
          </Rv>
          <Rv cls="pipe">
            <div className="ps"><div className="pn">01 · WInik cycle</div><div className="pt2">NEAT Topology</div><p className="pd2">Evolves which neurons connect. Adds and removes synapses over evolutionary timescales. Runs on the WInik cycle — every 20 Schumann pulses (~2.5s).</p></div>
            <div className="ps"><div className="pn">02 · Theta 6Hz</div><div className="pt2">STBP Weights</div><p className="pd2">Surrogate backprop trains synaptic weights. h'(u) = max(0,1−|u/Vth|) — the triangular surrogate gradient enables biologically-plausible differentiation through spike events.</p></div>
            <div className="ps"><div className="pn">03 · Gamma 30Hz</div><div className="pt2">R-STDP Online</div><p className="pd2">Reward-modulated spike-timing plasticity adapts without labels. Dopamine gates the eligibility traces. No labeled data required after convergence.</p></div>
            <div className="ps"><div className="pn">04 · 7.83Hz</div><div className="pt2">Schumann Sync</div><p className="pd2">All three mechanisms synchronize at 7.83Hz — Earth's Schumann resonance, the same frequency band as hippocampal theta in memory consolidation.</p></div>
          </Rv>
          <Rv cls="sh" style={{ marginBottom: 32 }}>
            <div className="sb">Maintenance Swarm</div>
            <h2 className="stitle display" style={{ fontSize: 36 }}>The glial <em>janitor squad</em></h2>
            <p className="ssub">Four specialized mini-SNNs — Podador, Drenador, Regulador, Schumann — patrol your network and DOM simultaneously. Biologically inspired by astrocytes, the brain's maintenance cells.</p>
          </Rv>
          <div className="agents">
            {[
              { color: "#00ff94", name: "PODADOR",   type: "RS · Right Hemisphere · Analytic",    desc: "Regular Spiking. Slow sustained bursts. Hunts heavy third-party scripts by Pascal Cascade priority — highest RAM weight attacked first." },
              { color: "#22d3ee", name: "DRENADOR",  type: "FS · Left Hemisphere · Reactive",     desc: "Fast Spiking. Short rapid bursts. Targets advertising iframes — detected by cross-origin geometry and ring 4 Pascal classification." },
              { color: "#f5c842", name: "REGULADOR", type: "CH · Right Hemisphere · Analytic",    desc: "Chattering. Repetitive bursts. Identifies telemetry and analytics payloads — 27 tracker signatures from Google Analytics to FullStory." },
              { color: "#9b5de5", name: "SCHUMANN",  type: "IB · Left Hemisphere · Synchronizer", desc: "Intrinsic Burst. Pacemaker of the squad. Bilateral coupling κ=0.30 synchronizes the other three at 7.83Hz. The coordination layer." },
            ].map(({ color, name, type, desc }, i) => (
              <Rv key={name} cls={`d${i + 1} agent`} style={{ "--ac": color } as React.CSSProperties}>
                <div className="astr" style={{ background: color }} />
                <div className="aico">
                  <svg viewBox="0 0 44 44" fill="none">
                    <polygon points="22,2 40,12 40,32 22,42 4,32 4,12" stroke={color} strokeWidth="1.5" opacity=".7" />
                    <circle cx="22" cy="22" r="6" fill={color} opacity=".9" />
                    <circle cx="22" cy="22" r="11" stroke={color} strokeWidth=".5" strokeDasharray="2 3" opacity=".35" />
                  </svg>
                </div>
                <div className="aname" style={{ color }}>{name}</div>
                <div className="atype">{type}</div>
                <p className="adesc">{desc}</p>
              </Rv>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ─────────────────────────────────────────────────────── */}
      <section id="products">
        <div className="wrap">
          <Rv cls="sh">
            <div className="sb">Products</div>
            <h2 className="stitle display">One engine.<br /><em>Four verticals.</em></h2>
            <p className="ssub">The same ClonEngine biological core powering network security, industrial AI, developer tooling, and scientific research.</p>
          </Rv>
          <div className="prods">
            <Rv cls="prod feat">
              <div className="pbadge" style={{ background: "rgba(0,255,148,.1)", color: "var(--green)", border: "1px solid rgba(0,255,148,.2)" }}>◈ FLAGSHIP</div>
              <div className="pname">KlonOS</div>
              <p className="pdesc">A neuromorphic VPN that classifies every network packet on-device using the SNN engine. No servers. No data leaving your device. Glial janitor swarm patrols DOM, Service Worker, and TUN interface simultaneously at three layers.</p>
              <div className="pstats"><div><div className="psv">7.83Hz</div><div className="psl">Schumann lock</div></div><div><div className="psv">27</div><div className="psl">Tracker sigs</div></div><div><div className="psv">0</div><div className="psl">External servers</div></div></div>
              <ul className="plist"><li>TUN fd handoff → Rust zero-copy native loop</li><li>Pascal Ring 0–4 packet classification</li><li>3-layer simultaneous swarm patrol</li><li>Android APK · Chrome Extension · PWA</li></ul>
            </Rv>
            <Rv cls="prod d1">
              <div className="pbadge" style={{ background: "rgba(34,211,238,.08)", color: "var(--cyan)", border: "1px solid rgba(34,211,238,.15)" }}>◈ SDK</div>
              <div className="pname">SpikeForge</div>
              <p className="pdesc">npm TypeScript package — drop-in SNN engine for any JavaScript or Rust project. Includes Izhikevich neurons, Pascal Cascade, Maya Q20 quantization, and the Schumann scheduler ready to use.</p>
              <div className="pstats"><div><div className="psv">npm</div><div className="psl">Registry</div></div><div><div className="psv">302N</div><div className="psl">Free tier</div></div><div><div className="psv">139K</div><div className="psl">Pro neurons</div></div></div>
              <ul className="plist"><li>SentinelBrain · GammaThetaSchumannScheduler</li><li>VigesimalCodec · PascalCuller3D</li><li>TypeScript + WASM · Apache 2.0</li></ul>
            </Rv>
            <Rv cls="prod">
              <div className="pbadge" style={{ background: "rgba(245,200,66,.08)", color: "var(--amber)", border: "1px solid rgba(245,200,66,.15)" }}>◈ INDUSTRIAL</div>
              <div className="pname">ClonEngine SDK</div>
              <p className="pdesc">Rust library for embedded industrial deployment. 18.6 KB. Runs on ARM Cortex without internet. 98.4% F1-Macro on AI4I 2020 predictive maintenance — beating MLPs with 31× less memory.</p>
              <div className="pstats"><div><div className="psv">18.6KB</div><div className="psl">Model size</div></div><div><div className="psv">98.4%</div><div className="psl">F1-Macro</div></div><div><div className="psv">3ep</div><div className="psl">Convergence</div></div></div>
              <ul className="plist"><li>Zero GPU · Zero cloud · Offline-capable</li><li>NEAT + STBP + R-STDP in Rust 2021</li><li>Maya vigesimal quantization (1B/weight)</li></ul>
            </Rv>
            <Rv cls="prod d1">
              <div className="pbadge" style={{ background: "rgba(155,93,229,.08)", color: "var(--violet)", border: "1px solid rgba(155,93,229,.15)" }}>◈ RESEARCH</div>
              <div className="pname">NeuroCalc</div>
              <p className="pdesc">Scientific calculator revealing the isomorphic structure between physics, geometry, wave equations, and ClonEngine internals. The same mathematics appears across 5 independent domains.</p>
              <div className="pstats"><div><div className="psv">5</div><div className="psl">Unified domains</div></div><div><div className="psv">440Hz</div><div className="psl">=56th Schumann</div></div><div><div className="psv">100</div><div className="psl">Lighthouse score</div></div></div>
              <ul className="plist"><li>Snell's Law = Corpus Callosum model</li><li>Pascal Cascade = Gaussian lens = GABA</li><li>Live Schumann 3D EEG vector</li></ul>
            </Rv>
          </div>
        </div>
      </section>

      {/* ── GAMES ─────────────────────────────────────────────────────────── */}
      <section id="games">
        <div className="wrap">
          <Rv cls="sh">
            <div className="sb">Compatible Games</div>
            <h2 className="stitle display">Zero lag.<br /><em>Every game.</em></h2>
            <p className="ssub">ZeroLag intercepts every game packet at the TUN layer before it reaches your ISP and routes it through the fastest Pascal Ring path. The SNN engine learns each game's traffic signature in real time — no config needed.</p>
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
              <a href="#products" className="btn-g">View all products ↓</a>
            </div>
          </Rv>
        </div>
      </section>

      {/* ── SCIENCE ───────────────────────────────────────────────────────── */}
      <section id="science">
        <div className="wrap">
          <div className="scilay">
            <Rv cls="scivis">
              <SciCanvas onSpk={setSciSpk} />
              <div className="sciov"><div className="scilive">C.ELEGANS 302N · HEXAGONAL TOPOLOGY · LIVE</div></div>
              <div id="sci-hud">
                <div className="sci-hud-row">
                  <span className="sci-hud-lbl">SPIKES</span>
                  <span className="sci-hud-val sci-hud-green">{sciSpk > 0 ? sciSpk.toLocaleString() : "—"}</span>
                </div>
                <div className="sci-hud-div" />
                <div className="sci-hud-row">
                  <span className="sci-hud-lbl">C. ELEGANS</span>
                  <span className="sci-hud-val sci-hud-orange">302 N</span>
                </div>
                <div className="sci-hud-row">
                  <span className="sci-hud-lbl">DROSOPHILA</span>
                  <span className="sci-hud-val sci-hud-violet">139,255 N</span>
                </div>
                <div className="sci-hud-row">
                  <span className="sci-hud-lbl">SCALE</span>
                  <span className="sci-hud-val sci-hud-violet">×433</span>
                </div>
              </div>
            </Rv>
            <Rv cls="d2">
              <div className="sb">The science</div>
              <h2 className="stitle display" style={{ fontSize: 42 }}>Biology as<br /><em>architecture</em></h2>
              <div className="scipts">
                <div className="scipt"><div className="spn">302</div><div><div className="sptit">Real connectome — not inspired by, IS biology</div><p className="spdesc">Every connection from Varshney et al. 2011 (WormAtlas) — the complete C. elegans wiring measured synapse by synapse. 5,806 biological synapses. No synthetic topology.</p></div></div>
                <div className="scipt"><div className="spn">3 Hz</div><div><div className="sptit">Three learning timescales simultaneously</div><p className="spdesc">NEAT at WInik (~0.4Hz), STBP at Theta (6Hz), R-STDP at Gamma (30Hz). No other SNN implementation runs all three concurrently on biological topology.</p></div></div>
                <div className="scipt"><div className="spn">1/9.5</div><div><div className="sptit">Lloyd-Max optimal vigesimal quantizer</div><p className="spdesc">VIGESIMAL_WEIGHT = 1/9.5 is the Lloyd-Max optimal step for 20 discrete levels, independently derived from Maya base-20 mathematics. First in scientific literature.</p></div></div>
              </div>
            </Rv>
          </div>
          <Rv cls="d2"><EngineProfiler /></Rv>
        </div>
      </section>

      {/* ── BENCHMARKS ────────────────────────────────────────────────────── */}
      <section id="benchmarks">
        <div className="wrap">
          <Rv cls="sh">
            <div className="sb">Benchmarks · No cherry-picking</div>
            <h2 className="stitle display">Real numbers.<br /><em>CPU only.</em></h2>
            <p className="ssub">All results on standard CPU. No GPU. No server processing. Production-verified on the AI4I 2020 dataset.</p>
          </Rv>
          <div className="blay">
            <Rv cls="bc">
              <div className="bct">AI4I 2020 · Industrial Predictive Maintenance · 6-class F1-Macro</div>
              <div className="br"><span className="bl">XGBoost (Kaggle SOTA)</span><div className="bri"><BenchBar w={99.1} color="#3f3f5a" /><span className="bv d">99.1%</span></div></div>
              <div className="br"><span className="bl">Standard MLP (50+ epochs)</span><div className="bri"><BenchBar w={98.2} color="#3f3f5a" /><span className="bv d">98.2%</span></div></div>
              <div className="br" style={{ background: "rgba(0,255,148,.04)", margin: "0 -36px", padding: "11px 36px", borderRadius: 4 }}>
                <span className="bl w">★ ClonEngine STBP · C.elegans 302N · 3 epochs</span>
                <div className="bri"><BenchBar w={98.4} color="var(--green)" /><span className="bv w">98.4%</span></div>
              </div>
              <div className="br"><span className="bl">R-STDP unsupervised baseline</span><div className="bri"><BenchBar w={16.2} color="#3f3f5a" /><span className="bv d">16.2%</span></div></div>
              <div className="bhl">
                <div className="bhlt">Footprint comparison</div>
                <div className="bhlg">
                  <div><div className="bhlv">18.6KB</div><div className="bhll">ClonEngine</div></div>
                  <div><div className="bhlv" style={{ color: "var(--muted)", fontSize: 16 }}>109KB</div><div className="bhll">ANN baseline</div></div>
                  <div><div className="bhlv" style={{ color: "var(--muted)", fontSize: 16 }}>583KB</div><div className="bhll">SNN baseline</div></div>
                </div>
              </div>
            </Rv>
            <Rv cls="bc d1">
              <div className="bct">NeuroBench v1.0 · Algorithm Track · Nature Comm Feb 2025</div>
              <div className="br"><span className="bl w">Connection Sparsity</span><div className="bri"><BenchBar w={93.6} color="var(--green)" /><span className="bv w">93.6%</span></div></div>
              <div className="br"><span className="bl">SNN baseline (NeuroBench official)</span><div className="bri"><BenchBar w={0} color="#3f3f5a" /><span className="bv d">0.0%</span></div></div>
              <div className="br"><span className="bl w">Operations type</span><span className="bv w">ACs only</span></div>
              <div className="br"><span className="bl w">GPU required</span><span className="bv w">None</span></div>
              <div className="br"><span className="bl w">Pong perfect draw (generation)</span><span className="bv w">7,133+</span></div>
              <div className="br"><span className="bl w">Cerebelo vs WORM baseline</span><span className="bv w">+15%</span></div>
              <div className="br"><span className="bl">DVS128 · SHD · GSC official</span><span className="bv d">pending</span></div>
              <div className="bhl" style={{ background: "rgba(155,93,229,.06)", borderColor: "rgba(155,93,229,.2)" }}>
                <div className="bhlt" style={{ color: "var(--violet)" }}>First biological connectome on NeuroBench</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>No other NeuroBench submission uses a real biological wiring diagram. Connection Sparsity 93.6% vs 0.0% in all official baselines — because ClonEngine uses biology.</div>
              </div>
            </Rv>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing">
        <div className="wrap">
          <Rv cls="sh" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 72px" }}>
            <div className="sb">Pricing</div>
            <h2 className="stitle display">Kill your ping.<br /><em>Choose your plan.</em></h2>
            <p className="ssub">Solo player, squad grinder, researcher, or gaming café owner — there's a plan for you. No tricks, no confusion.</p>
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
                <li><span className="ok" style={{ color: "#c084fc" }}>✓</span><span>All 12 games + beta game support</span></li>
                <li><span className="no">—</span><span style={{ opacity: .35 }}>White-label / café dashboard (Enterprise)</span></li>
              </ul>
              <a href="mailto:klonengine@proton.me" className="pbtn" style={{ background: "rgba(155,93,229,.15)", border: "1px solid rgba(155,93,229,.45)", color: "#c084fc", marginTop: 28 }}>Get Drosophila →</a>
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
                <li><span className="ok">✓</span><span>Ping reports per player / per PC</span></li>
                <li><span className="ok">✓</span><span>API access — connect to your billing system</span></li>
                <li><span className="ok">✓</span><span>Dedicated support + 99.9% uptime guarantee</span></li>
                <li><span className="ok">✓</span><span>Custom server routing for your city / region</span></li>
                <li><span className="ok">✓</span><span>Free onboarding call included</span></li>
              </ul>
              <a href="mailto:klonengine@proton.me" className="pbtn pbtn-g">Talk to us →</a>
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
              <p className="ftag">Gaming VPN powered by a 302-neuron AI engine trained on real biology. Kill your ping on Free Fire, Mobile Legends and PUBG — free, on Android, Chrome & iOS. Built in New Orleans.</p>
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
              <div className="fch">Games</div>
              <ul className="flinks">
                <li><a href="#games">Free Fire</a></li>
                <li><a href="#games">Mobile Legends</a></li>
                <li><a href="#games">PUBG Mobile</a></li>
                <li><a href="#games">All 12 games →</a></li>
              </ul>
            </div>
            <div>
              <div className="fch">Company</div>
              <ul className="flinks">
                <li><a href="#how">About ZeroLag</a></li>
                <li><a href="mailto:klonengine@proton.me">Contact us</a></li>
                <li><a href="#pricing">Cibercafé / Enterprise</a></li>
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
