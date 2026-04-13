import { useState } from "react";
import { Rv } from "../ui/atoms";
import { NavBar } from "../components/NavBar";
import { DownloadModal } from "../components/DownloadModal";

const APPS = [
  {
    id: "klonos",
    label: "KlonOS",
    badge: "FLAGSHIP",
    badgeColor: "var(--green)",
    icon: "📱",
    tagline: "Neuromorphic VPN · Android + iOS + Chrome",
    desc: "A neuromorphic VPN that classifies every network packet on-device using the SNN engine. No servers. No data leaving your device. Glial janitor swarm patrols DOM, Service Worker, and TUN interface simultaneously at three layers.",
    stats: [{ v: "7.83Hz", l: "Schumann lock" }, { v: "27", l: "Tracker sigs" }, { v: "0", l: "External servers" }],
    features: [
      { icon: "⚡", title: "TUN fd handoff", desc: "Rust zero-copy native loop intercepts packets before the kernel." },
      { icon: "🔒", title: "Pascal Ring 0–4", desc: "Five-layer packet classification from kernel ring 0 to user-space ring 4." },
      { icon: "🧠", title: "3-layer swarm patrol", desc: "DOM + Service Worker + TUN monitored simultaneously." },
      { icon: "📦", title: "Multi-platform", desc: "Android APK · Chrome Extension · PWA · Capacitor APK." },
    ],
    platforms: ["Android APK", "Chrome Extension", "iOS PWA", "Capacitor APK"],
    version: "v5.0 Layer 5",
    status: "Live",
  },
  {
    id: "chrome",
    label: "Chrome Extension",
    badge: "BROWSER",
    badgeColor: "var(--cyan)",
    icon: "🌐",
    tagline: "ZeroLag for every website · WebRTC optimizer",
    desc: "Installs in one click. Intercepts WebRTC game traffic, runs the 302-neuron SNN classifier in a dedicated Web Worker, and reroutes UDP packets through the lowest-latency SATS node in your region.",
    stats: [{ v: "<1ms", l: "Worker overhead" }, { v: "WebRTC", l: "Protocol" }, { v: "MV3", l: "Manifest" }],
    features: [
      { icon: "🔧", title: "Manifest V3", desc: "Uses service workers, not background pages. Compliant with Chrome's 2024 MV3 enforcement." },
      { icon: "📡", title: "WebRTC intercept", desc: "Hooks into RTCPeerConnection to reroute ICE candidates through ZeroLag nodes." },
      { icon: "🎮", title: "Game detection", desc: "Automatically activates on Free Fire Web, Garena client, and browser-based games." },
      { icon: "📊", title: "Live ping overlay", desc: "Floating HUD shows real-time ms saved during gaming sessions." },
    ],
    platforms: ["Chrome", "Edge", "Brave"],
    version: "v1.2",
    status: "Live",
  },
  {
    id: "apk",
    label: "Android APK",
    badge: "MOBILE",
    badgeColor: "var(--prime)",
    icon: "🤖",
    tagline: "Native Expo APK · Free Fire · Mobile Legends · PUBG",
    desc: "Native Android application built with Expo and React Native. Requests VPN permission and establishes a TUN interface — no root needed. The Izhikevich kernel runs on-device without any server calls.",
    stats: [{ v: "No Root", l: "Required" }, { v: "TUN", l: "VPN mode" }, { v: "Expo 52", l: "Runtime" }],
    features: [
      { icon: "🔑", title: "VPN Permission", desc: "Uses Android VpnService API — no root, no ADB. Standard permission request." },
      { icon: "🧬", title: "On-device SNN", desc: "Izhikevich kernel runs in JavaScript thread. 302 neurons, 5,806 synapses active during gaming." },
      { icon: "📶", title: "LATAM servers", desc: "Pre-loaded database of São Paulo, Bogotá, Mexico City, and Miami game servers." },
      { icon: "⚡", title: "Free Fire optimized", desc: "Packet signature pre-trained for Free Fire SA servers. Instant routing on launch." },
    ],
    platforms: ["Android 8+"],
    version: "v5.0",
    status: "Beta",
  },
  {
    id: "capacitor",
    label: "Capacitor APK",
    badge: "HYBRID",
    badgeColor: "var(--violet)",
    icon: "⚡",
    tagline: "ClonEngine wrapped · Vulkan SPIR-V · JNI bridge",
    desc: "A Capacitor-wrapped build of ClonEngine with a native Kotlin plugin (KlonosCallosumPlugin) that bridges SPIR-V Vulkan compute shaders via JNI. GPU-accelerated SNN on Android without requiring NDK expertise.",
    stats: [{ v: "SPIR-V", l: "Compute shader" }, { v: "JNI", l: "Kotlin bridge" }, { v: "3,364B", l: "Shader size" }],
    features: [
      { icon: "🔥", title: "Vulkan Compute", desc: "SPIR-V bytecode runs directly on Vulkan — no OpenGL overhead, no driver translation." },
      { icon: "🌉", title: "JNI Bridge", desc: "KlonosCallosumPlugin.kt exposes native Vulkan calls to Capacitor TypeScript layer." },
      { icon: "📟", title: "callosum_jni_cap.cpp", desc: "JNI symbols: KlonosCallosumPlugin_nativeInit, _nativeSpikeStep, _nativeDestroy." },
      { icon: "📦", title: "Build ready", desc: "See BUILD_ANDROID.md for complete Gradle + NDK + Capacitor build instructions." },
    ],
    platforms: ["Android 10+ (Vulkan)"],
    version: "v1.0-cap",
    status: "Build-ready",
  },
  {
    id: "spikeforge",
    label: "SpikeForge SDK",
    badge: "SDK",
    badgeColor: "var(--cyan)",
    icon: "📦",
    tagline: "npm TypeScript SNN package · Drop-in for any project",
    desc: "npm TypeScript package — drop-in SNN engine for any JavaScript or Rust project. Includes Izhikevich neurons, Pascal Cascade, Maya Q20 quantization, and the Schumann scheduler ready to use.",
    stats: [{ v: "npm", l: "Registry" }, { v: "302N", l: "Free tier" }, { v: "139K", l: "Pro neurons" }],
    features: [
      { icon: "🧠", title: "SentinelBrain", desc: "Main orchestrator — wires together NEAT, STBP, R-STDP and the Schumann scheduler." },
      { icon: "⏱️", title: "GammaThetaSchumannScheduler", desc: "Synchronizes three plasticity timescales at 0.4Hz, 6Hz, and 30Hz." },
      { icon: "🔢", title: "VigesimalCodec", desc: "Maya base-20 encoder/decoder — compresses weights to 1 bit using Lloyd-Max optimal step." },
      { icon: "📐", title: "PascalCuller3D", desc: "Five-ring classifier routes packets by geometric Pascal cascade priority." },
    ],
    platforms: ["Node.js", "Browser", "Deno", "Rust (via WASM)"],
    version: "v2.1",
    status: "npm · Apache 2.0",
  },
  {
    id: "neurocalc",
    label: "NeuroCalc",
    badge: "RESEARCH",
    badgeColor: "#c084fc",
    icon: "🔬",
    tagline: "Scientific calculator · 5 unified domains · 100 Lighthouse",
    desc: "Scientific calculator revealing the isomorphic structure between physics, geometry, wave equations, and ClonEngine internals. The same mathematics appears across 5 independent domains.",
    stats: [{ v: "5", l: "Unified domains" }, { v: "440Hz", l: "=56th Schumann" }, { v: "100", l: "Lighthouse score" }],
    features: [
      { icon: "🌊", title: "Snell's Law = Corpus Callosum", desc: "The refraction formula maps exactly to the bilateral coupling model of the corpus callosum in ClonEngine." },
      { icon: "📐", title: "Pascal = Gaussian = GABA", desc: "Pascal Cascade, Gaussian lens optics, and GABA inhibition share the same mathematical kernel." },
      { icon: "🌍", title: "Live Schumann EEG vector", desc: "3D EEG visualization synchronized to Schumann resonance — computed in real time." },
      { icon: "🎵", title: "440Hz = 56th harmonic", desc: "Standard tuning A4 is the 56th Schumann harmonic — confirmed numerically to 6 decimal places." },
    ],
    platforms: ["Web (PWA)", "100 Lighthouse"],
    version: "v1.3",
    status: "Live",
  },
] as const;

type AppId = typeof APPS[number]["id"];

export default function Apps() {
  const [activeApp, setActiveApp] = useState<AppId>("klonos");
  const [dlOpen, setDlOpen] = useState(false);
  const app = APPS.find(a => a.id === activeApp)!;

  return (
    <>
      <NavBar onDownload={() => setDlOpen(true)} />
      <DownloadModal open={dlOpen} onClose={() => setDlOpen(false)} />
      <div className="page-shell">

        {/* ── APP TAB SIDEBAR + CONTENT ── */}
        <div className="wrap apps-layout">

          {/* Sidebar */}
          <div className="apps-sidebar">
            {APPS.map(a => (
              <button
                key={a.id}
                className={`app-tab-btn${activeApp === a.id ? " app-tab-btn-active" : ""}`}
                onClick={() => setActiveApp(a.id)}
              >
                <span className="atb-icon">{a.icon}</span>
                <div className="atb-info">
                  <div className="atb-name">{a.label}</div>
                  <div className="atb-badge" style={{ color: a.badgeColor }}>◈ {a.badge}</div>
                </div>
                <div className={`atb-status${a.status === "Live" ? " atb-live" : ""}`}>
                  {a.status === "Live" ? "●" : "○"} {a.status}
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="app-detail-panel">
            <div className="adp-head">
              <div className="adp-icon">{app.icon}</div>
              <div>
                <div className="adp-badge" style={{ color: app.badgeColor, borderColor: app.badgeColor + "44" }}>◈ {app.badge}</div>
                <h2 className="adp-name">{app.label}</h2>
                <div className="adp-tagline">{app.tagline}</div>
              </div>
              <div className="adp-ver">
                <div className="adp-version">{app.version}</div>
                <div className={`adp-status-pill${app.status === "Live" ? " adp-live" : ""}`}>{app.status}</div>
              </div>
            </div>

            <p className="adp-desc">{app.desc}</p>

            <div className="adp-stats">
              {app.stats.map(s => (
                <div key={s.l} className="adp-stat">
                  <div className="adp-sv" style={{ color: app.badgeColor }}>{s.v}</div>
                  <div className="adp-sl">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="adp-feats">
              {app.features.map(f => (
                <div key={f.title} className="adp-feat">
                  <div className="adp-ficon">{f.icon}</div>
                  <div>
                    <div className="adp-ftitle">{f.title}</div>
                    <div className="adp-fdesc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="adp-platforms">
              <div className="adp-plat-label">Platforms</div>
              <div className="adp-plat-pills">
                {app.platforms.map(p => (
                  <span key={p} className="adp-plat-pill">{p}</span>
                ))}
              </div>
            </div>

            {(app.id === "klonos" || app.id === "apk" || app.id === "capacitor" || app.id === "chrome") && (
              <button className="btn-m adp-dl" onClick={() => setDlOpen(true)}>
                Download {app.label} →
              </button>
            )}
            {app.id === "spikeforge" && (
              <a className="btn-g adp-dl" href="https://www.npmjs.com/package/spikeforge" target="_blank" rel="noreferrer">
                View on npm →
              </a>
            )}
            {app.id === "neurocalc" && (
              <a className="btn-g adp-dl" href="mailto:klonengine@proton.me">
                Request access →
              </a>
            )}
          </div>
        </div>

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
