import { useState } from "react";
import { NavBar } from "../components/NavBar";

const TABS = ["Changelog", "Architecture", "API Reference", "Build Guide"] as const;
type Tab = typeof TABS[number];

const CHANGELOG = [
  {
    version: "v5.0",
    date: "2026-04-13",
    tag: "LATEST",
    tagColor: "var(--green)",
    title: "Layer 5 — Capacitor APK + Azure CI/CD",
    items: [
      "KlonosCallosumPlugin.kt — Kotlin JNI bridge to SPIR-V Vulkan compute shaders",
      "callosum_jni_cap.cpp — JNI symbols: nativeInit, nativeSpikeStep, nativeDestroy",
      "SPIR-V compiled shader copied (3,364 bytes) to Capacitor Android assets",
      "Azure Static Web Apps deployed — klonosengine.com live with SSL",
      "GitHub Actions CI/CD — auto-deploy on push to main branch",
      "Custom domain www.klonosengine.com → Azure SWA (CNAME active)",
      "TypeScript 0 errors — CryptoPayModal EthProv type fixed, atoms.tsx null guard",
    ]
  },
  {
    version: "v4.2",
    date: "2026-04-10",
    tag: "STABLE",
    tagColor: "var(--cyan)",
    title: "Layer 9 — Dashboard + better-auth passkeys",
    items: [
      "Dashboard.tsx — post-auth panel: profile, stats, VPN toggle, plan display",
      "main.tsx Router with wouter — /dashboard route wired",
      "@better-auth/passkey integration — WebAuthn biometric login",
      "BiometricLoginModal component — TouchID/FaceID/FIDO2 support",
      "CryptoPayModal — SOL + ETH payment with on-chain verification",
      "API Server express v5 + better-auth session endpoints",
    ]
  },
  {
    version: "v4.0",
    date: "2026-04-07",
    tag: "STABLE",
    tagColor: "var(--cyan)",
    title: "Layer 8 — Landing redesign + pricing",
    items: [
      "Full landing page redesign with Antonio/Space Grotesk typography system",
      "VS strip — ZeroLag vs ExitLag / WTFast / Mudfish / NoPing comparison",
      "Pricing section — Free / Pro $4.99 / Drosophila $99 / Enterprise $299",
      "EngineProfiler — live CPU benchmark C.elegans 302N vs Drosophila 139K",
      "HeroCanvas — wireframe globe WebGL animation",
      "SciCanvas — hexagonal SNN topology real-time visualization",
      "PingMeter — animated latency HUD component",
      "Ticker strip with LATAM gaming data",
    ]
  },
  {
    version: "v3.5",
    date: "2026-03-28",
    tag: "STABLE",
    tagColor: "var(--cyan)",
    title: "Layer 7 — SpikeForge SDK + ClonEngine Rust",
    items: [
      "SpikeForge npm package — TypeScript SNN engine drop-in",
      "SentinelBrain orchestrator wiring NEAT + STBP + R-STDP",
      "GammaThetaSchumannScheduler — three-timescale sync",
      "VigesimalCodec — Maya base-20 Lloyd-Max quantization",
      "PascalCuller3D — five-ring packet classifier",
      "ClonEngine Rust library — 18.6KB ARM Cortex embedded SNN",
      "AI4I 2020 benchmark — 98.4% F1-Macro in 3 epochs",
    ]
  },
  {
    version: "v3.0",
    date: "2026-03-15",
    tag: "STABLE",
    tagColor: "var(--cyan)",
    title: "Layer 6 — Chrome Extension MV3",
    items: [
      "Manifest V3 Chrome Extension — service worker based",
      "WebRTC intercept via RTCPeerConnection hooks",
      "Free Fire Web + Garena client automatic detection",
      "Live ping overlay HUD — floating ms counter",
      "SATS orbital node selection — 24 nodes LATAM region",
    ]
  },
  {
    version: "v2.0",
    date: "2026-02-20",
    tag: "STABLE",
    tagColor: "var(--cyan)",
    title: "Layer 5 — Expo Mobile APK",
    items: [
      "Expo 52 React Native Android APK",
      "VpnService TUN interface — no root required",
      "Izhikevich kernel on-device — 302 neurons, 5,806 synapses",
      "LATAM server database pre-loaded: SP, Bogotá, CDMX, Miami",
      "Free Fire SA packet signature pre-training complete",
    ]
  },
  {
    version: "v1.0",
    date: "2026-01-10",
    tag: "INITIAL",
    tagColor: "var(--muted)",
    title: "Layer 1 — Izhikevich RK2 Engine",
    items: [
      "Core Izhikevich RK2 integration kernel",
      "C. elegans 302-neuron connectome from Varshney et al. 2011",
      "5,806 biological synapses loaded from WormAtlas dataset",
      "NEAT topology evolution — WInik cycle (~0.4Hz)",
      "R-STDP reward-modulated plasticity baseline",
      "Schumann 7.83Hz bilateral coupling κ=0.30",
    ]
  },
];

const API_ENDPOINTS = [
  { method: "POST", path: "/api/auth/sign-in/passkey", auth: false, desc: "Initiate WebAuthn passkey authentication (FIDO2/Touch ID)" },
  { method: "POST", path: "/api/auth/sign-up/email", auth: false, desc: "Register new account with email + password" },
  { method: "GET",  path: "/api/auth/session", auth: true,  desc: "Get current session — returns user object and plan" },
  { method: "POST", path: "/api/auth/sign-out", auth: true,  desc: "Invalidate current session token" },
  { method: "GET",  path: "/api/ping",          auth: false, desc: "Health check — returns { ok: true, ms: number }" },
  { method: "GET",  path: "/api/nodes",          auth: true,  desc: "List available SATS routing nodes for current region" },
  { method: "POST", path: "/api/verify-tx",      auth: true,  desc: "Verify SOL/ETH payment on-chain and activate plan" },
];

const ARCH_LAYERS = [
  { layer: "L0", name: "tokens.ts", color: "var(--muted)", desc: "Design tokens — TICKER_ITEMS, color palette, typography scale" },
  { layer: "L1", name: "engine/snn.ts", color: "var(--green)", desc: "Izhikevich RK2 kernel — izhi(), SpikeForge pipeline, neuron types" },
  { layer: "L2", name: "engine/orbital.ts", color: "var(--cyan)", desc: "SATS orbital nodes — 24 nodes, LATAM region database" },
  { layer: "L3", name: "canvas/HeroCanvas.tsx", color: "var(--prime)", desc: "Wireframe globe WebGL animation — Three.js particle system" },
  { layer: "L4", name: "canvas/SciCanvas.tsx", color: "var(--prime)", desc: "Hexagonal SNN topology — live spike visualization" },
  { layer: "L5", name: "ui/atoms.tsx", color: "var(--amber)", desc: "BenchBar · Counter · Rv — intersection-observer animated atoms" },
  { layer: "L6", name: "data/games.tsx", color: "var(--amber)", desc: "GAMES_DATA — 12 games, latency benchmarks, SVG icons" },
  { layer: "L7", name: "sections/PingMeter.tsx", color: "var(--violet)", desc: "Latency HUD — animated real-time ms display component" },
  { layer: "L8", name: "App.tsx", color: "var(--cyan)", desc: "Landing page composer — Nav + Hero + Games + Pricing + Footer" },
  { layer: "L9", name: "pages/Dashboard.tsx", color: "var(--green)", desc: "Post-auth panel — profile, VPN toggle, plan management, passkeys" },
];

export default function Docs() {
  const [tab, setTab] = useState<Tab>("Changelog");

  return (
    <>
      <NavBar />
      <div className="page-shell">

        {/* ── TAB BAR ── */}
        <div className="inner-tabs-bar inner-tabs-top">
          <div className="wrap">
            <div className="inner-tabs-header">
              <div className="itb-title">Docs <em>&amp; Revision Control</em></div>
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

        {/* ── CHANGELOG ── */}
        {tab === "Changelog" && (
          <div className="wrap eng-section">
            <div className="changelog">
              {CHANGELOG.map((entry, i) => (
                <div key={entry.version} className={`cl-entry${i === 0 ? " cl-latest" : ""}`}>
                  <div className="cl-left">
                    <div className="cl-ver">{entry.version}</div>
                    <div className="cl-date">{entry.date}</div>
                    <div className="cl-tag" style={{ color: entry.tagColor, borderColor: entry.tagColor + "44" }}>
                      {entry.tag}
                    </div>
                    {i < CHANGELOG.length - 1 && <div className="cl-line" />}
                  </div>
                  <div className="cl-right">
                    <div className="cl-title">{entry.title}</div>
                    <ul className="cl-items">
                      {entry.items.map(item => (
                        <li key={item}><span className="cl-dot" style={{ color: entry.tagColor }}>◈</span>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ARCHITECTURE ── */}
        {tab === "Architecture" && (
          <div className="wrap eng-section">
            <div className="sb" style={{ marginBottom: 24 }}>Layer System — 10 Architectural Layers</div>
            <div className="arch-table">
              {ARCH_LAYERS.map(({ layer, name, color, desc }) => (
                <div key={layer} className="arch-row">
                  <div className="arch-layer" style={{ color }}>{layer}</div>
                  <div className="arch-name"><code>{name}</code></div>
                  <div className="arch-desc">{desc}</div>
                </div>
              ))}
            </div>

            <div className="sb" style={{ marginTop: 48, marginBottom: 24 }}>File Tree — Key Paths</div>
            <pre className="code-block">{`artifacts/
├── clonengine/          ← Landing page (React + Vite)
│   └── src/
│       ├── engine/      ← Izhikevich SNN kernel
│       ├── canvas/      ← WebGL visualizations
│       ├── sections/    ← PingMeter, EngineProfiler
│       ├── pages/       ← Dashboard, Engineering, Apps, Docs
│       └── components/  ← Modals, NavBar
├── api-server/          ← Express v5 + better-auth
├── klonos/              ← Expo React Native APK
├── klonos-ext/          ← Chrome Extension MV3
└── klonos-cap/          ← Capacitor Android APK
    └── android/
        ├── KlonosCallosumPlugin.kt
        └── jni/callosum_jni_cap.cpp`}</pre>
          </div>
        )}

        {/* ── API REFERENCE ── */}
        {tab === "API Reference" && (
          <div className="wrap eng-section">
            <div className="sb" style={{ marginBottom: 8 }}>Base URL</div>
            <pre className="code-block" style={{ marginBottom: 32 }}>{`Production: https://api.klonosengine.com
Development: http://localhost:8080`}</pre>
            <div className="sb" style={{ marginBottom: 16 }}>Authentication</div>
            <p style={{ color: "var(--muted)", marginBottom: 32, lineHeight: 1.7 }}>
              Session-based auth via HTTP-only cookie. Obtain a session by calling <code>/api/auth/sign-in/passkey</code> or <code>/api/auth/sign-up/email</code>. All endpoints marked <span style={{ color: "var(--green)" }}>Auth: required</span> need a valid session cookie.
            </p>
            <div className="api-table">
              {API_ENDPOINTS.map(ep => (
                <div key={ep.path} className="api-row">
                  <div className={`api-method api-${ep.method.toLowerCase()}`}>{ep.method}</div>
                  <code className="api-path">{ep.path}</code>
                  <div className={`api-auth${ep.auth ? " api-auth-req" : ""}`}>
                    {ep.auth ? "Auth: required" : "Public"}
                  </div>
                  <div className="api-desc">{ep.desc}</div>
                </div>
              ))}
            </div>

            <div className="sb" style={{ marginTop: 40, marginBottom: 16 }}>Example — Session check</div>
            <pre className="code-block">{`curl https://api.klonosengine.com/api/auth/session \\
  -H "Cookie: better-auth.session_token=YOUR_TOKEN"

// Response
{
  "user": {
    "id": "usr_01HXYZ",
    "email": "user@example.com",
    "name": "Juan",
    "plan": "pro"
  },
  "session": {
    "expiresAt": "2026-05-13T00:00:00Z"
  }
}`}</pre>
          </div>
        )}

        {/* ── BUILD GUIDE ── */}
        {tab === "Build Guide" && (
          <div className="wrap eng-section">
            <div className="sb" style={{ marginBottom: 8 }}>Prerequisites</div>
            <pre className="code-block" style={{ marginBottom: 32 }}>{`Node.js 22+    pnpm 10+    Android Studio (Capacitor APK)
Java 17+       NDK 26.1   Expo CLI (EAS Build for Expo APK)`}</pre>

            <div className="sb" style={{ marginBottom: 16 }}>1. Clone and install</div>
            <pre className="code-block">{`git clone https://github.com/Orion8617/klonosai.git
cd klonosai
pnpm install`}</pre>

            <div className="sb" style={{ marginTop: 32, marginBottom: 16 }}>2. Run development servers</div>
            <pre className="code-block">{`# Landing page (ClonEngine)
pnpm --filter @workspace/clonengine run dev

# API server
pnpm --filter @workspace/api-server run dev

# Expo mobile (Android/iOS emulator or device)
pnpm --filter @workspace/klonos run dev

# Chrome Extension (watch mode)
pnpm --filter @workspace/klonos-ext run dev`}</pre>

            <div className="sb" style={{ marginTop: 32, marginBottom: 16 }}>3. Build Expo APK</div>
            <pre className="code-block">{`cd artifacts/klonos
eas build --platform android --profile preview
# Output: .apk file, sideloadable without Play Store`}</pre>

            <div className="sb" style={{ marginTop: 32, marginBottom: 16 }}>4. Build Capacitor APK</div>
            <pre className="code-block">{`# See BUILD_ANDROID.md for full instructions
cd artifacts/klonos-cap
pnpm build
npx cap sync android

# Open in Android Studio
npx cap open android
# Build → Generate Signed APK → Release

# NDK settings (app/build.gradle)
android {
  defaultConfig {
    externalNativeBuild {
      cmake { cppFlags "-std=c++17" }
    }
  }
}`}</pre>

            <div className="sb" style={{ marginTop: 32, marginBottom: 16 }}>5. Deploy to Azure</div>
            <pre className="code-block">{`# Frontend auto-deploys via GitHub Actions on push
git push origin main

# Manual SWA deploy
npx @azure/static-web-apps-cli deploy \\
  artifacts/clonengine/dist/public \\
  --deployment-token YOUR_TOKEN \\
  --env production

# API deploy (requires az CLI + Container Apps env)
az containerapp up \\
  --name klonosai-api \\
  --resource-group klonosai-rg \\
  --environment klonosai-env \\
  --source artifacts/api-server`}</pre>
          </div>
        )}

        <footer>
          <div className="wrap">
            <div className="fbot" style={{ justifyContent: "center" }}>
              <div className="fcopy">© 2026 ZeroLag by KlonOS · Docs v5.0 · Last updated 2026-04-13</div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
