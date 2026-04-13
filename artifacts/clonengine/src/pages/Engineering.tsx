import { useState } from "react";
import { SciCanvas } from "../canvas/SciCanvas";
import { BenchBar, Rv } from "../ui/atoms";
import { EngineProfiler } from "../sections/EngineProfiler";
import { NavBar } from "../components/NavBar";

const TABS = ["Architecture", "Neuroscience", "Benchmarks", "Innovation"] as const;
type Tab = typeof TABS[number];

export default function Engineering() {
  const [tab, setTab] = useState<Tab>("Architecture");
  const [sciSpk, setSciSpk] = useState(0);

  return (
    <>
      <NavBar />
      <div className="page-shell">

        {/* ── TAB BAR ── */}
        <div className="inner-tabs-bar inner-tabs-top">
          <div className="wrap">
            <div className="inner-tabs-header">
              <div className="itb-title">Engineering <em>&amp; Innovation</em></div>
              <div className="inner-tabs">
                {TABS.map(t => (
                  <button
                    key={t}
                    className={`inner-tab${tab === t ? " inner-tab-active" : ""}`}
                    onClick={() => setTab(t)}
                  >{t}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ARCHITECTURE ── */}
        {tab === "Architecture" && (
          <section className="wrap eng-section">
            <Rv cls="sh">
              <div className="sb">Three-timescale plasticity</div>
              <h2 className="stitle display">One biological brain.<br /><em>Three mechanisms.</em></h2>
              <p className="ssub">NEAT, STBP, and R-STDP run simultaneously at three biological timescales — coordinated by the Schumann resonance scheduler at 7.83Hz.</p>
            </Rv>
            <Rv cls="pipe">
              <div className="ps"><div className="pn">01 · WInik cycle</div><div className="pt2">NEAT Topology</div><p className="pd2">Evolves which neurons connect. Adds and removes synapses over evolutionary timescales. Runs every 20 Schumann pulses (~2.5s).</p></div>
              <div className="ps"><div className="pn">02 · Theta 6Hz</div><div className="pt2">STBP Weights</div><p className="pd2">Surrogate backprop trains synaptic weights. h′(u) = max(0,1−|u/Vth|) — the triangular surrogate gradient enables biologically-plausible differentiation through spike events.</p></div>
              <div className="ps"><div className="pn">03 · Gamma 30Hz</div><div className="pt2">R-STDP Online</div><p className="pd2">Reward-modulated spike-timing plasticity adapts without labels. Dopamine gates the eligibility traces. No labeled data required after convergence.</p></div>
              <div className="ps"><div className="pn">04 · 7.83Hz</div><div className="pt2">Schumann Sync</div><p className="pd2">All three mechanisms synchronize at Earth's Schumann resonance — the same frequency band as hippocampal theta in memory consolidation.</p></div>
            </Rv>

            <Rv cls="sh" style={{ marginTop: 64, marginBottom: 32 }}>
              <div className="sb">Glial maintenance swarm</div>
              <h2 className="stitle display" style={{ fontSize: 38 }}>Four agents.<br /><em>Zero latency overhead.</em></h2>
              <p className="ssub">Biologically inspired by astrocytes — four specialized mini-SNNs patrol your network and DOM simultaneously.</p>
            </Rv>
            <div className="agents">
              {[
                { color: "#00ff94", name: "PODADOR",   type: "RS · Right Hemisphere · Analytic",    desc: "Regular Spiking. Hunts heavy third-party scripts by Pascal Cascade priority — highest RAM weight attacked first." },
                { color: "#22d3ee", name: "DRENADOR",  type: "FS · Left Hemisphere · Reactive",     desc: "Fast Spiking. Targets advertising iframes — detected by cross-origin geometry and ring 4 Pascal classification." },
                { color: "#f5c842", name: "REGULADOR", type: "CH · Right Hemisphere · Analytic",    desc: "Chattering. Identifies telemetry and analytics payloads — 27 tracker signatures from Google Analytics to FullStory." },
                { color: "#9b5de5", name: "SCHUMANN",  type: "IB · Left Hemisphere · Synchronizer", desc: "Intrinsic Burst pacemaker. Bilateral coupling κ=0.30 synchronizes the other three at 7.83Hz." },
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

            {/* Kernel spec table */}
            <div className="eng-spec-table" style={{ marginTop: 64 }}>
              <div className="sb" style={{ marginBottom: 16 }}>Izhikevich RK2 Kernel — Parameter Reference</div>
              <table className="spec-tbl">
                <thead><tr><th>Parameter</th><th>Value</th><th>Biological Meaning</th></tr></thead>
                <tbody>
                  {[
                    ["a", "0.02 (RS) / 0.1 (FS)", "Recovery time constant"],
                    ["b", "0.2", "Sensitivity of u to v"],
                    ["c", "−65 mV", "After-spike reset voltage"],
                    ["d", "8 (RS) / 2 (FS)", "After-spike adaptation"],
                    ["Vth", "30 mV", "Spike threshold"],
                    ["VIGESIMAL_WEIGHT", "1/9.5", "Lloyd-Max optimal Maya base-20 step"],
                    ["κ (bilateral)", "0.30", "Schumann bilateral coupling strength"],
                    ["f_schumann", "7.83 Hz", "Earth Schumann resonance sync frequency"],
                  ].map(([p, v, m]) => (
                    <tr key={p as string}><td className="spec-param"><code>{p}</code></td><td className="spec-val">{v}</td><td className="spec-meaning">{m}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── NEUROSCIENCE ── */}
        {tab === "Neuroscience" && (
          <section className="wrap eng-section">
            <div className="scilay">
              <Rv cls="scivis">
                <SciCanvas onSpk={setSciSpk} />
                <div className="sciov"><div className="scilive">C.ELEGANS 302N · HEXAGONAL TOPOLOGY · LIVE</div></div>
                <div id="sci-hud">
                  <div className="sci-hud-row"><span className="sci-hud-lbl">SPIKES</span><span className="sci-hud-val sci-hud-green">{sciSpk > 0 ? sciSpk.toLocaleString() : "—"}</span></div>
                  <div className="sci-hud-div" />
                  <div className="sci-hud-row"><span className="sci-hud-lbl">C. ELEGANS</span><span className="sci-hud-val sci-hud-orange">302 N</span></div>
                  <div className="sci-hud-row"><span className="sci-hud-lbl">DROSOPHILA</span><span className="sci-hud-val sci-hud-violet">139,255 N</span></div>
                  <div className="sci-hud-row"><span className="sci-hud-lbl">SCALE</span><span className="sci-hud-val sci-hud-violet">×433</span></div>
                </div>
              </Rv>
              <Rv cls="d2">
                <div className="sb">The science</div>
                <h2 className="stitle display" style={{ fontSize: 42 }}>Biology as<br /><em>architecture</em></h2>
                <div className="scipts">
                  <div className="scipt"><div className="spn">302</div><div><div className="sptit">Real connectome — not inspired by, IS biology</div><p className="spdesc">Every connection from Varshney et al. 2011 (WormAtlas) — the complete C. elegans wiring measured synapse by synapse. 5,806 biological synapses.</p></div></div>
                  <div className="scipt"><div className="spn">3 Hz</div><div><div className="sptit">Three learning timescales simultaneously</div><p className="spdesc">NEAT at WInik (~0.4Hz), STBP at Theta (6Hz), R-STDP at Gamma (30Hz). No other SNN implementation runs all three concurrently.</p></div></div>
                  <div className="scipt"><div className="spn">1/9.5</div><div><div className="sptit">Lloyd-Max optimal vigesimal quantizer</div><p className="spdesc">VIGESIMAL_WEIGHT = 1/9.5 is the Lloyd-Max optimal step for 20 discrete levels, independently derived from Maya base-20 mathematics. First in scientific literature.</p></div></div>
                </div>
              </Rv>
            </div>
            <Rv cls="d2" style={{ marginTop: 48 }}><EngineProfiler /></Rv>
          </section>
        )}

        {/* ── BENCHMARKS ── */}
        {tab === "Benchmarks" && (
          <section className="wrap eng-section">
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
                <div className="bhl" style={{ background: "rgba(155,93,229,.06)", borderColor: "rgba(155,93,229,.2)" }}>
                  <div className="bhlt" style={{ color: "var(--violet)" }}>First biological connectome on NeuroBench</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>No other NeuroBench submission uses a real biological wiring diagram. Connection Sparsity 93.6% vs 0.0% in all official baselines.</div>
                </div>
              </Rv>
            </div>
          </section>
        )}

        {/* ── INNOVATION ── */}
        {tab === "Innovation" && (
          <section className="wrap eng-section">
            <Rv cls="sh">
              <div className="sb">Unique Technical Contributions</div>
              <h2 className="stitle display">First in literature.<br /><em>Independently verifiable.</em></h2>
              <p className="ssub">Five claims that no other published SNN implementation makes simultaneously.</p>
            </Rv>
            <div className="innov-grid">
              {[
                {
                  num: "01",
                  color: "var(--prime)",
                  title: "Real Biological Connectome",
                  detail: "Uses the actual C. elegans wiring from Varshney et al. 2011 — 302 neurons, 5,806 synapses, measured one by one. No synthetic approximation.",
                  tag: "FIRST · NeuroBench 2025"
                },
                {
                  num: "02",
                  color: "var(--cyan)",
                  title: "Maya Vigesimal Quantization",
                  detail: "VIGESIMAL_WEIGHT = 1/9.5 is the Lloyd-Max optimal step for 20 discrete levels, independently rediscovered from Maya base-20 mathematics. 1 bit per weight storage.",
                  tag: "ORIGINAL MATH · 1 bit/weight"
                },
                {
                  num: "03",
                  color: "var(--green)",
                  title: "Three-Timescale Simultaneous Plasticity",
                  detail: "NEAT at ~0.4Hz, STBP at 6Hz (Theta), R-STDP at 30Hz (Gamma) — all three running concurrently on the same biological topology. No other implementation does this.",
                  tag: "UNIQUE · No prior art"
                },
                {
                  num: "04",
                  color: "var(--amber)",
                  title: "Schumann Resonance Synchronization",
                  detail: "All three plasticity mechanisms lock to Earth's 7.83Hz Schumann resonance — the same frequency as hippocampal theta during memory consolidation. Bilateral coupling κ=0.30.",
                  tag: "7.83Hz · Earth resonance"
                },
                {
                  num: "05",
                  color: "var(--violet)",
                  title: "18.6KB Embedded SNN",
                  detail: "Full NEAT + STBP + R-STDP on ARM Cortex, 18.6KB model size — 31× smaller than ANN baseline, 5× smaller than competing SNN implementations. Runs offline.",
                  tag: "18.6KB · ARM Cortex · Offline"
                },
                {
                  num: "06",
                  color: "#00ff94",
                  title: "SPIR-V Callosum JNI Layer",
                  detail: "Vulkan compute shaders (SPIR-V) bridged via JNI to Android — the KlonosCallosumPlugin runs GPU compute on mobile without OpenGL overhead. 3,364-byte compiled bytecode.",
                  tag: "ANDROID · Vulkan SPIR-V"
                },
              ].map(({ num, color, title, detail, tag }) => (
                <div key={num} className="innov-card" style={{ "--ic": color } as React.CSSProperties}>
                  <div className="innov-num" style={{ color }}>{num}</div>
                  <div className="innov-title">{title}</div>
                  <p className="innov-detail">{detail}</p>
                  <div className="innov-tag" style={{ color, borderColor: color + "44" }}>{tag}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer>
          <div className="wrap">
            <div className="fbot" style={{ justifyContent: "center" }}>
              <div className="fcopy">© 2026 ZeroLag by KlonOS · Juan José Salgado Fuentes</div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
