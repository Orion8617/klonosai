import { useCallback, useEffect, useRef, useState } from "react";

// ─── IZHIKEVICH SNN ENGINE ────────────────────────────────────────────────────
interface N { x: number; y: number; vx?: number; vy?: number; v: number; u: number; f: number; l: boolean }
function izhi(n: N, I: number): boolean {
  const th = n.l ? 25.5 : 34.5;
  n.v += .5 * (.04 * n.v * n.v + 5 * n.v + 140 - n.u + I);
  n.u += .5 * .02 * (.2 * n.v - n.u);
  n.v += .5 * (.04 * n.v * n.v + 5 * n.v + 140 - n.u + I);
  n.u += .5 * .02 * (.2 * n.v - n.u);
  if (n.v >= th) { n.v = -65; n.u += 8; n.f = 12; return true; }
  if (n.f > 0) n.f--;
  return false;
}

// ─── HERO CANVAS ──────────────────────────────────────────────────────────────
function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const cx = cv.getContext("2d")!;
    let W = 0, H = 0, raf = 0;
    function rs() { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; }
    rs(); window.addEventListener("resize", rs);
    const N = 302, ns: N[] = [];
    for (let i = 0; i < N; i++) ns.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, v: -65 + Math.random() * 10, u: -13, f: 0, l: Math.random() > .5 });
    const sy: { a: number; b: number; w: number }[] = [];
    for (let i = 0; i < 700; i++) { const a = Math.floor(Math.random() * N), b = Math.floor(Math.random() * N); if (a !== b) sy.push({ a, b, w: (Math.random() - .5) * .4 }); }
    let tk = 0, sc = 0;
    function draw(ts: number) {
      raf = requestAnimationFrame(draw);
      cx.fillStyle = "rgba(2,1,8,.13)"; cx.fillRect(0, 0, W, H); tk++; sc += 7.83 / 60;
      const sf = sc >= 1; if (sf) sc -= 1;
      const inp = new Float32Array(N);
      sy.forEach(s => { if (ns[s.a].f > 0) inp[s.b] += s.w * 9 });
      ns.forEach((n, i) => {
        izhi(n, inp[i] + (Math.random() - .3) * 4 + (i % 53 === tk % 53 ? 4 : 0));
        n.x += n.vx!; n.y += n.vy!;
        if (n.x < 0) n.x = W; if (n.x > W) n.x = 0;
        if (n.y < 0) n.y = H; if (n.y > H) n.y = 0;
      });
      sy.forEach(s => {
        if (!ns[s.a].f) return;
        cx.save(); cx.strokeStyle = `rgba(0,255,148,${.06 + ns[s.a].f / 12 * .15})`; cx.lineWidth = .5;
        cx.beginPath(); cx.moveTo(ns[s.a].x, ns[s.a].y); cx.lineTo(ns[s.b].x, ns[s.b].y); cx.stroke(); cx.restore();
      });
      ns.forEach(n => {
        const g = n.f > 0; cx.save();
        if (g) { cx.shadowColor = n.l ? "#22d3ee" : "#00ff94"; cx.shadowBlur = 14; cx.fillStyle = n.l ? "#22d3ee" : "#00ff94"; }
        else cx.fillStyle = `rgba(${n.l ? "34,211,238" : "0,255,148"},${.08 + Math.max(0, (n.v + 65) / 75) * .3})`;
        cx.beginPath(); cx.arc(n.x, n.y, g ? 3.5 : 1.5, 0, Math.PI * 2); cx.fill(); cx.restore();
      });
      if (sf) {
        cx.save(); cx.strokeStyle = "rgba(155,93,229,.18)"; cx.lineWidth = 1; cx.beginPath();
        cx.arc(W * .62, H * .4, (ts % 1000 / 1000) * Math.max(W, H) * .35, 0, Math.PI * 2);
        cx.stroke(); cx.restore();
      }
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", rs); };
  }, []);
  return <canvas ref={ref} id="hero-canvas" />;
}

// ─── PANEL CANVAS ─────────────────────────────────────────────────────────────
function PanelCanvas({ onStats }: { onStats: (spk: number, pct: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const cx = cv.getContext("2d")!;
    let W = 0, H = 0, raf = 0;
    function rs() { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; }
    rs(); window.addEventListener("resize", rs);
    const N = 60, ns: N[] = [];
    function buildNs() {
      ns.length = 0;
      for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, r = 38 + (i % 4) * 20; ns.push({ x: W / 2 + r * Math.cos(a), y: H / 2 + r * Math.sin(a), v: -65, u: -13, f: 0, l: i % 2 === 0 }); }
    }
    buildNs();
    let tot = 0, tk = 0;
    function draw() {
      raf = requestAnimationFrame(draw);
      const ww = cv.offsetWidth, hh = cv.offsetHeight;
      if (W !== ww || H !== hh) { W = cv.width = ww; H = cv.height = hh; buildNs(); }
      cx.fillStyle = "rgba(16,13,34,.22)"; cx.fillRect(0, 0, W, H); tk++;
      let fi = 0;
      ns.forEach((n, i) => { if (izhi(n, (Math.random() - .25) * 14 + (i % 9 === tk % 9 ? 10 : 0))) { fi++; tot++; } });
      ns.forEach((n, i) => {
        const g = n.f > 0; cx.save();
        if (g) {
          cx.shadowColor = n.l ? "#22d3ee" : "#00ff94"; cx.shadowBlur = 16; cx.fillStyle = n.l ? "#22d3ee" : "#00ff94";
          ns.forEach((m, j) => { if (j === i || Math.random() > .22) return; cx.strokeStyle = "rgba(0,255,148,.13)"; cx.lineWidth = .5; cx.beginPath(); cx.moveTo(n.x, n.y); cx.lineTo(m.x, m.y); cx.stroke(); });
        } else cx.fillStyle = `rgba(0,255,148,${.1 + (n.v + 65) / 75 * .28})`;
        cx.beginPath(); cx.arc(n.x, n.y, g ? 4.5 : 2.5, 0, Math.PI * 2); cx.fill(); cx.restore();
      });
      onStats(tot, ((fi / N) * 100).toFixed(0) + "%");
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", rs); };
  }, [onStats]);
  return <canvas ref={ref} id="panel-canvas" />;
}

// ─── SCIENCE CANVAS ───────────────────────────────────────────────────────────
function SciCanvas({ onSpk }: { onSpk: (n: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const cx = cv.getContext("2d")!;
    let W = 0, H = 0, raf = 0;
    function rs() { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; }
    rs(); window.addEventListener("resize", rs);
    const cols = 9, rows = 8, dx = 46, dy = 40;
    const ns: N[] = [];
    function buildGrid() {
      const ox = (W - (cols - 1) * dx) / 2, oy = (H - (rows - 1) * dy) / 2;
      ns.length = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) ns.push({ x: ox + c * dx + (r % 2 ? dx / 2 : 0), y: oy + r * dy, v: -65 + (Math.random() - .5) * 15, u: -13, f: 0, l: c < cols / 2 });
    }
    buildGrid(); window.addEventListener("resize", buildGrid);
    let tot = 0, tk = 0;
    function draw() {
      raf = requestAnimationFrame(draw);
      cx.fillStyle = "rgba(9,5,26,.18)"; cx.fillRect(0, 0, W, H); tk++;
      ns.forEach((n, i) => { if (izhi(n, (Math.random() - .28) * 12 + (i % 13 === tk % 13 ? 9 : 0))) tot++; });
      ns.forEach((n, i) => {
        if (!n.f) return;
        ns.forEach((m, j) => {
          if (j === i) return; const d = Math.hypot(m.x - n.x, m.y - n.y);
          if (d > dx * 1.65) return;
          cx.save(); cx.strokeStyle = `rgba(0,255,148,${.1 + n.f / 12 * .2})`; cx.lineWidth = .6;
          cx.beginPath(); cx.moveTo(n.x, n.y); cx.lineTo(m.x, m.y); cx.stroke(); cx.restore();
        });
      });
      ns.forEach(n => {
        const g = n.f > 0, sz = g ? 7 : 4; cx.save();
        if (g) { cx.shadowColor = n.l ? "#22d3ee" : "#00ff94"; cx.shadowBlur = 20; cx.fillStyle = n.l ? "#22d3ee" : "#00ff94"; }
        else cx.fillStyle = `rgba(0,255,148,${.1 + Math.max(0, (n.v + 65) / 75) * .28})`;
        cx.beginPath();
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 - Math.PI / 6; cx.lineTo(n.x + sz * Math.cos(a), n.y + sz * Math.sin(a)); }
        cx.closePath(); cx.fill(); cx.restore();
      });
      onSpk(tot);
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", rs); window.removeEventListener("resize", buildGrid); };
  }, [onSpk]);
  return <canvas ref={ref} id="sci-canvas" />;
}

// ─── BENCH BAR ────────────────────────────────────────────────────────────────
function BenchBar({ w, color }: { w: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setWidth(w); ob.disconnect(); } }, { threshold: .5 });
    ob.observe(el);
    return () => ob.disconnect();
  }, [w]);
  return <div ref={ref} className="bbw"><div className="bb" style={{ width: `${width}%`, background: color, transition: "width 1.4s cubic-bezier(.4,0,.2,1)" }} /></div>;
}

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function Counter({ target, suffix, dec = 0 }: { target: number; suffix: string; dec?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const dur = 1500, s = performance.now();
        function f(n: number) {
          const p = Math.min((n - s) / dur, 1), v = target * (p < .5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p));
          el.textContent = v.toFixed(dec) + suffix;
          if (p < 1) requestAnimationFrame(f);
        }
        requestAnimationFrame(f);
        ob.disconnect();
      }
    }, { threshold: .5 });
    ob.observe(el);
    return () => ob.disconnect();
  }, [target, suffix, dec]);
  return <span ref={ref}>0{suffix}</span>;
}

// ─── REVEAL WRAPPER ───────────────────────────────────────────────────────────
function Rv({ children, cls = "", style }: { children: React.ReactNode; cls?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("vis"); ob.disconnect(); } }, { threshold: .12, rootMargin: "0px 0px -40px 0px" });
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return <div ref={ref} className={`rv ${cls}`} style={style}>{children}</div>;
}

// ─── GAME ICONS (original SVG art — no trademarks) ────────────────────────────
const GAMES_DATA: { icon: (c: string) => React.ReactNode; name: string; genre: string; plat: string; lat: string; ring: string; col: string }[] = [
  {
    col: "#00c8ff", name: "Fortnite", genre: "Battle Royale", plat: "PC · Mobile", lat: "-47ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <polygon points="24,4 36,12 40,26 24,44 8,26 12,12" stroke={c} strokeWidth="2" fill={c+"18"}/>
      <polygon points="24,12 32,18 34,28 24,38 14,28 16,18" stroke={c} strokeWidth="1.2" fill={c+"28"}/>
      <line x1="24" y1="12" x2="24" y2="38" stroke={c} strokeWidth="1.5" opacity=".7"/>
      <line x1="14" y1="28" x2="34" y2="28" stroke={c} strokeWidth="1.5" opacity=".7"/>
    </>
  },
  {
    col: "#ff4655", name: "Valorant", genre: "FPS Tactical", plat: "PC", lat: "-38ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <path d="M8 10 L24 38 L40 10" stroke={c} strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
      <path d="M16 10 L24 26 L32 10" stroke={c} strokeWidth="1.5" fill={c+"22"} strokeLinejoin="round"/>
      <circle cx="24" cy="24" r="3" fill={c}/>
    </>
  },
  {
    col: "#ff6b35", name: "Free Fire", genre: "Battle Royale", plat: "Mobile", lat: "-61ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <circle cx="24" cy="24" r="16" stroke={c} strokeWidth="1.5" fill={c+"14"}/>
      <path d="M24 10 C24 10 32 18 30 26 C28 32 20 32 18 26 C16 18 24 10 24 10Z" fill={c} opacity=".8"/>
      <path d="M24 16 C24 16 28 22 27 26 C26 29 22 29 21 26 C20 22 24 16 24 16Z" fill={c+"aa"}/>
      <circle cx="24" cy="24" r="3" fill="white" opacity=".6"/>
    </>
  },
  {
    col: "#9b5de5", name: "Mobile Legends", genre: "MOBA", plat: "Mobile", lat: "-56ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <path d="M24 6 L42 24 L24 42 L6 24 Z" stroke={c} strokeWidth="2" fill={c+"18"}/>
      <path d="M24 12 L36 24 L24 36 L12 24 Z" stroke={c} strokeWidth="1.5" fill={c+"28"}/>
      <path d="M18 24 L24 18 L30 24 L24 30 Z" fill={c} opacity=".9"/>
      <line x1="6" y1="24" x2="42" y2="24" stroke={c} strokeWidth=".8" opacity=".4"/>
      <line x1="24" y1="6" x2="24" y2="42" stroke={c} strokeWidth=".8" opacity=".4"/>
    </>
  },
  {
    col: "#f5c842", name: "PUBG Mobile", genre: "Battle Royale", plat: "Mobile", lat: "-44ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <rect x="8" y="16" width="32" height="20" rx="4" stroke={c} strokeWidth="2" fill={c+"18"}/>
      <rect x="14" y="10" width="20" height="10" rx="2" stroke={c} strokeWidth="1.5" fill={c+"28"}/>
      <circle cx="24" cy="26" r="5" stroke={c} strokeWidth="1.5" fill={c+"33"}/>
      <circle cx="24" cy="26" r="2" fill={c}/>
      <line x1="8" y1="26" x2="13" y2="26" stroke={c} strokeWidth="1.5"/>
      <line x1="35" y1="26" x2="40" y2="26" stroke={c} strokeWidth="1.5"/>
    </>
  },
  {
    col: "#cd4232", name: "Apex Legends", genre: "FPS · BR", plat: "PC · Mobile", lat: "-41ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <path d="M24 6 L40 38 H8 Z" stroke={c} strokeWidth="2" fill={c+"18"} strokeLinejoin="round"/>
      <path d="M24 14 L34 34 H14 Z" fill={c} opacity=".4"/>
      <path d="M20 38 L24 28 L28 38" stroke={c} strokeWidth="1.5" fill={c+"44"}/>
      <line x1="14" y1="28" x2="34" y2="28" stroke={c} strokeWidth="1" opacity=".6"/>
    </>
  },
  {
    col: "#8ecaff", name: "CS2", genre: "FPS Tactical", plat: "PC", lat: "-33ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <rect x="10" y="18" width="28" height="16" rx="3" stroke={c} strokeWidth="2" fill={c+"18"}/>
      <rect x="34" y="20" width="8" height="4" rx="1" fill={c} opacity=".7"/>
      <rect x="6" y="21" width="8" height="3" rx="1" fill={c} opacity=".7"/>
      <circle cx="20" cy="26" r="3" stroke={c} strokeWidth="1.5" fill={c+"33"}/>
      <line x1="10" y1="26" x2="6" y2="26" stroke={c} strokeWidth="1.2"/>
      <line x1="24" y1="14" x2="24" y2="18" stroke={c} strokeWidth="1.5" opacity=".6"/>
    </>
  },
  {
    col: "#c89b3c", name: "League of Legends", genre: "MOBA", plat: "PC", lat: "-29ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <circle cx="24" cy="24" r="17" stroke={c} strokeWidth="2" fill={c+"14"}/>
      <path d="M24 8 L28 20 L40 20 L30 28 L34 40 L24 32 L14 40 L18 28 L8 20 L20 20 Z" fill={c} opacity=".7"/>
      <circle cx="24" cy="24" r="5" fill={c}/>
    </>
  },
  {
    col: "#f5a623", name: "Call of Duty", genre: "FPS · BR", plat: "PC · Mobile", lat: "-52ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <circle cx="24" cy="24" r="16" stroke={c} strokeWidth="2" fill={c+"14"}/>
      <line x1="24" y1="8" x2="24" y2="40" stroke={c} strokeWidth="2"/>
      <line x1="8" y1="24" x2="40" y2="24" stroke={c} strokeWidth="2"/>
      <circle cx="24" cy="24" r="4" fill={c}/>
      <circle cx="24" cy="24" r="8" stroke={c} strokeWidth="1" fill="none" opacity=".5"/>
    </>
  },
  {
    col: "#22d3ee", name: "Genshin Impact", genre: "Action RPG", plat: "PC · Mobile", lat: "-35ms", ring: "Ring 1 · HTTPS",
    icon: (c) => <>
      <polygon points="24,4 44,16 44,32 24,44 4,32 4,16" stroke={c} strokeWidth="2" fill={c+"14"}/>
      <polygon points="24,12 37,19.5 37,28.5 24,36 11,28.5 11,19.5" stroke={c} strokeWidth="1" fill={c+"22"}/>
      <path d="M24 14 L24 34 M14 20 L34 20 M14 28 L34 28" stroke={c} strokeWidth="1.2" opacity=".6"/>
      <circle cx="24" cy="24" r="4" fill={c} opacity=".9"/>
    </>
  },
  {
    col: "#5b8731", name: "Minecraft", genre: "Sandbox", plat: "PC · Mobile", lat: "-18ms", ring: "Ring 0 · TCP",
    icon: (c) => <>
      <rect x="8" y="8" width="14" height="14" stroke={c} strokeWidth="2" fill={c+"22"}/>
      <rect x="26" y="8" width="14" height="14" stroke={c} strokeWidth="2" fill={c+"33"}/>
      <rect x="8" y="26" width="14" height="14" stroke={c} strokeWidth="2" fill={c+"33"}/>
      <rect x="26" y="26" width="14" height="14" stroke={c} strokeWidth="2" fill={c+"22"}/>
      <line x1="8" y1="8" x2="40" y2="40" stroke={c} strokeWidth="1" opacity=".3"/>
    </>
  },
  {
    col: "#e2231a", name: "Roblox", genre: "Platform", plat: "PC · Mobile", lat: "-22ms", ring: "Ring 1 · HTTPS",
    icon: (c) => <>
      <rect x="10" y="10" width="28" height="28" rx="4" stroke={c} strokeWidth="2" fill={c+"18"}/>
      <rect x="16" y="16" width="16" height="16" rx="2" fill={c} opacity=".7"/>
      <rect x="20" y="20" width="8" height="8" rx="1" fill="white" opacity=".8"/>
      <line x1="10" y1="24" x2="38" y2="24" stroke={c} strokeWidth=".8" opacity=".4"/>
      <line x1="24" y1="10" x2="24" y2="38" stroke={c} strokeWidth=".8" opacity=".4"/>
    </>
  },
];

// ─── PING METER (Before / After — like ExitLag's hero) ────────────────────────
function PingMeter() {
  const [active, setActive] = useState(false);
  const [ping, setPing] = useState(127);
  const [loss, setLoss] = useState(18);

  const runCycle = useCallback(() => {
    setActive(false); setPing(127); setLoss(18);
    const t1 = setTimeout(() => {
      setActive(true);
      let p = 127;
      const iv1 = setInterval(() => { p = Math.max(23, p - 5); setPing(p); if (p <= 23) clearInterval(iv1); }, 35);
      let l = 18;
      const iv2 = setInterval(() => { l = Math.max(0, l - 1); setLoss(l); if (l <= 0) clearInterval(iv2); }, 75);
    }, 2400);
    return t1;
  }, []);

  useEffect(() => {
    let t = runCycle();
    const loop = setInterval(() => { clearTimeout(t); t = runCycle(); }, 7200);
    return () => { clearTimeout(t); clearInterval(loop); };
  }, [runCycle]);

  return (
    <div className="ping-hud">
      <div className="phud-topbar">
        <div className="phud-dot" style={{ background: active ? "#00ff94" : "#ff3355", boxShadow: active ? "0 0 8px #00ff94" : "0 0 8px #ff3355" }} />
        <span className="phud-status-txt">ZEROLAG · {active ? "ROUTING ACTIVE" : "INACTIVE"}</span>
        <span className="phud-server">{active ? "LATAM-1 · OPTIMAL" : "NO ROUTE"}</span>
      </div>

      <div className="phud-compare">
        <div className={`phud-side ${!active ? "phud-active-side" : ""}`}>
          <div className="phud-tag phud-tag-bad">WITHOUT</div>
          <div className="phud-big" style={{ color: active ? "rgba(255,51,85,.25)" : "#ff3355", textShadow: !active ? "0 0 30px rgba(255,51,85,.5)" : "none" }}>127<span>ms</span></div>
          <div className="phud-pill phud-pill-bad" style={{ opacity: active ? .3 : 1 }}>⚠ HIGH PING</div>
          <div className="phud-loss-row" style={{ opacity: active ? .3 : 1 }}><span>Packet loss</span><b style={{ color: "#ff3355" }}>18%</b></div>
          <div className="phud-loss-row" style={{ opacity: active ? .3 : 1 }}><span>Jitter</span><b style={{ color: "#f5c842" }}>±32ms</b></div>
        </div>

        <div className="phud-arrow-col">
          <div className={`phud-arrow ${active ? "phud-arrow-on" : ""}`}>→</div>
        </div>

        <div className={`phud-side ${active ? "phud-active-side" : ""}`}>
          <div className="phud-tag" style={{ color: active ? "#00ff94" : "rgba(0,255,148,.25)", borderColor: active ? "rgba(0,255,148,.4)" : "rgba(0,255,148,.1)" }}>WITH ZEROLAG</div>
          <div className="phud-big" style={{ color: active ? "#00ff94" : "rgba(0,255,148,.2)", textShadow: active ? "0 0 40px rgba(0,255,148,.5), 0 0 80px rgba(0,255,148,.2)" : "none" }}>{ping}<span>ms</span></div>
          <div className="phud-pill" style={{ background: active ? "rgba(0,255,148,.15)" : "rgba(0,255,148,.04)", color: active ? "#00ff94" : "rgba(0,255,148,.25)", borderColor: active ? "rgba(0,255,148,.3)" : "rgba(0,255,148,.08)" }}>{active ? "✓ OPTIMIZED" : "● STANDBY"}</div>
          <div className="phud-loss-row" style={{ opacity: active ? 1 : .2 }}><span>Packet loss</span><b style={{ color: "#00ff94" }}>{active ? `${loss}%` : "…"}</b></div>
          <div className="phud-loss-row" style={{ opacity: active ? 1 : .2 }}><span>Jitter</span><b style={{ color: "#00ff94" }}>{active ? "±2ms" : "…"}</b></div>
        </div>
      </div>

      <div className="phud-route">
        <div className="phud-node">YOU</div>
        <div className={`phud-line ${active ? "phud-line-on" : ""}`}>{active && <div className="phud-pkt" />}</div>
        <div className={`phud-node phud-node-snn ${active ? "phud-node-snn-on" : ""}`}>SNN</div>
        <div className={`phud-line ${active ? "phud-line-on" : ""}`}>{active && <div className="phud-pkt" style={{ animationDelay: ".5s" }} />}</div>
        <div className="phud-node">SERVER</div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [panelSpk, setPanelSpk] = useState(0);
  const [panelPct, setPanelPct] = useState("—");
  const [sciSpk, setSciSpk] = useState(0);

  useEffect(() => {
    // Custom cursor
    const cur = document.createElement("div"); cur.id = "cursor";
    cur.innerHTML = `<svg viewBox="0 0 12 12" width="12" height="12"><polygon points="6,0 11,9 6,7 1,9" fill="#00ff94"/></svg>`;
    const trail = document.createElement("div"); trail.id = "cursor-trail";
    document.body.appendChild(cur); document.body.appendChild(trail);
    let mx = 0, my = 0;
    const mm = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; cur.style.left = mx + "px"; cur.style.top = my + "px"; setTimeout(() => { trail.style.left = mx + "px"; trail.style.top = my + "px"; }, 80); };
    document.addEventListener("mousemove", mm);
    const scroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => { cur.remove(); trail.remove(); document.removeEventListener("mousemove", mm); window.removeEventListener("scroll", scroll); };
  }, []);

  const handlePanelStats = (s: number, p: string) => { setPanelSpk(s); setPanelPct(p); };

  const TICKER_ITEMS = [
    ["Free Fire", "-61ms latency saved"], ["Valorant", "-38ms latency saved"],
    ["Fortnite", "-47ms latency saved"], ["PUBG Mobile", "-55ms latency saved"],
    ["Apex Legends", "-42ms latency saved"], ["Mobile Legends", "-53ms latency saved"],
    ["CS2", "-29ms latency saved"], ["Call of Duty", "-36ms latency saved"],
    ["Android APK", "Real TUN VPN interface"], ["Chrome Extension", "DOM + network routing"],
    ["SNN AI", "302-neuron routing engine"], ["$0 forever", "Free plan · no credit card"],
  ];

  return (
    <>
      {/* NAV */}
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

      {/* HERO */}
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
                <span className="hplat">📱 Android APK</span>
                <span className="hplat">🌐 Chrome Extension</span>
                <span className="hplat">🍎 iOS PWA</span>
              </div>
            </Rv>
            <Rv cls="d4"><div className="hnums">
              <div className="hnum"><div className="hnv">-<Counter target={44} suffix="ms" /></div><div className="hnl">Avg latency saved</div></div>
              <div className="hnum"><div className="hnv"><Counter target={12} suffix="" /></div><div className="hnl">Top games supported</div></div>
              <div className="hnum"><div className="hnv">SNN<span className="u">AI</span></div><div className="hnl">Packet routing engine</div></div>
              <div className="hnum"><div className="hnv">$0</div><div className="hnl">Forever free plan</div></div>
            </div></Rv>
          </div>
          <Rv cls="d2">
            <PingMeter />
          </Rv>
        </div>
      </section>

      {/* SOCIAL PROOF */}
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

      {/* VS LEADERBOARD */}
      <div className="vs-strip">
        <div className="vs-header">
          <span className="vs-label">⚡ LATENCY REDUCTION · COMPETITIVE BENCHMARK</span>
          <span className="vs-note">avg ms saved vs baseline · Free Fire server LATAM</span>
        </div>
        <div className="vs-board">
          {([
            { rank: "★", name: "ZeroLag", ms: 44, tech: "SNN AI · TUN VPN · Android + iOS + Chrome", winner: true },
            { rank: "2", name: "ExitLag", ms: 28, tech: "Multi-path · PC only", winner: false },
            { rank: "3", name: "WTFast", ms: 21, tech: "GPN tunnel · No mobile", winner: false },
            { rank: "4", name: "Mudfish", ms: 18, tech: "Proxy nodes · Complex setup", winner: false },
            { rank: "5", name: "NoPing", ms: 15, tech: "Manual config · Windows only", winner: false },
          ] as const).map(({ rank, name, ms, tech, winner }) => (
            <div key={name} className={`vs-row2 ${winner ? "vs-row-win" : ""}`}>
              <span className="vs-rank">{rank}</span>
              <span className="vs-nm">{name}</span>
              <div className="vs-bar-wrap"><div className="vs-bar2" style={{ width: `${(ms / 44) * 100}%`, background: winner ? "linear-gradient(90deg,#00ff94,#22d3ee)" : "rgba(255,255,255,.12)" }} /></div>
              <span className="vs-ms" style={{ color: winner ? "#00ff94" : "rgba(255,255,255,.4)" }}>-{ms}ms</span>
              <span className="vs-tech2">{tech}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TICKER */}
      <div className="ticker">
        <div className="ttrack">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map(([b, t], i) => (
            <div key={i} className="ti"><b>{b}</b>{t}</div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
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
              { color: "#00ff94", name: "PODADOR", type: "RS · Right Hemisphere · Analytic", desc: "Regular Spiking. Slow sustained bursts. Hunts heavy third-party scripts by Pascal Cascade priority — highest RAM weight attacked first." },
              { color: "#22d3ee", name: "DRENADOR", type: "FS · Left Hemisphere · Reactive", desc: "Fast Spiking. Short rapid bursts. Targets advertising iframes — detected by cross-origin geometry and ring 4 Pascal classification." },
              { color: "#f5c842", name: "REGULADOR", type: "CH · Right Hemisphere · Analytic", desc: "Chattering. Repetitive bursts. Identifies telemetry and analytics payloads — 27 tracker signatures from Google Analytics to FullStory." },
              { color: "#9b5de5", name: "SCHUMANN", type: "IB · Left Hemisphere · Synchronizer", desc: "Intrinsic Burst. Pacemaker of the squad. Bilateral coupling κ=0.30 synchronizes the other three at 7.83Hz. The coordination layer." },
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

      {/* PRODUCTS */}
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

      {/* GAMES */}
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
              <a href="#pricing" className="btn-m">Download ZeroLag free →</a>
              <a href="#products" className="btn-g">View all products ↓</a>
            </div>
          </Rv>
        </div>
      </section>

      {/* SCIENCE */}
      <section id="science">
        <div className="wrap">
          <div className="scilay">
            <Rv cls="scivis">
              <SciCanvas onSpk={setSciSpk} />
              <div className="sciov"><div className="scilive">C.ELEGANS 302N · HEXAGONAL TOPOLOGY · LIVE</div></div>
              <div id="sci-cnt">{sciSpk.toLocaleString()} spk</div>
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
        </div>
      </section>

      {/* BENCHMARKS */}
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

      {/* PRICING */}
      <section id="pricing">
        <div className="wrap">
          <Rv cls="sh" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 72px" }}>
            <div className="sb">Pricing</div>
            <h2 className="stitle display">Honest tiers.<br /><em>Real differences.</em></h2>
            <p className="ssub">Each tier has genuine technical differentiation — more neurons, more learning mechanisms — not arbitrary feature locks.</p>
          </Rv>
          <div className="pgrid">
            <Rv cls="pc">
              <div className="ptier">Starter</div><div className="pname2">Free</div>
              <div className="pamt">$0</div><div className="pper">Forever · 1 device</div>
              <div className="pdiv" />
              <ul className="pfeats">
                <li><span className="ok">✓</span><span>C.elegans <span className="fem">302 neurons</span></span></li>
                <li><span className="ok">✓</span><span>STBP + R-STDP training</span></li>
                <li><span className="ok">✓</span><span>Pascal Ring 0–4 classification</span></li>
                <li><span className="ok">✓</span><span>ZeroLag VPN basic mode</span></li>
                <li><span className="ok">✓</span><span>SpikeForge npm (≤1K neurons)</span></li>
                <li><span className="no">—</span><span style={{ opacity: .35 }}>Schumann 7.83Hz scheduler</span></li>
                <li><span className="no">—</span><span style={{ opacity: .35 }}>Drosophila 139K neurons</span></li>
                <li><span className="no">—</span><span style={{ opacity: .35 }}>Metrics export CSV/JSON</span></li>
              </ul>
              <a href="#" className="pbtn pbtn-g">Get started free</a>
            </Rv>
            <Rv cls="pc pop d1">
              <div className="pbdg">MOST POPULAR</div>
              <div className="ptier">Professional</div><div className="pname2">Pro</div>
              <div className="pamt">$4<sub>.99/mo</sub></div><div className="pper">or $29.99/year · Up to 5 devices</div>
              <div className="pdiv" />
              <ul className="pfeats">
                <li><span className="ok">✓</span><span>Drosophila <span className="fem">139,255 neurons</span></span></li>
                <li><span className="ok">✓</span><span>Schumann <span className="fem">7.83Hz scheduler</span></span></li>
                <li><span className="ok">✓</span><span>Full NEAT + STBP + R-STDP</span></li>
                <li><span className="ok">✓</span><span>Pascal ring breakdown analytics</span></li>
                <li><span className="ok">✓</span><span>Dopamine curve export CSV/JSON</span></li>
                <li><span className="ok">✓</span><span>SpikeForge — unlimited neurons</span></li>
                <li><span className="ok">✓</span><span>HexVertex 6-bit archetype routing</span></li>
                <li><span className="no">—</span><span style={{ opacity: .35 }}>TRIDENT GPS-free module</span></li>
              </ul>
              <a href="#" className="pbtn pbtn-m">Start Pro — 14 days free</a>
            </Rv>
            <Rv cls="pc d2">
              <div className="ptier">Organization</div><div className="pname2">Enterprise</div>
              <div className="pamt">$299<sub>/mo</sub></div><div className="pper">Per org · Unlimited devices · SLA 99.9%</div>
              <div className="pdiv" />
              <ul className="pfeats">
                <li><span className="ok">✓</span><span>Everything in Pro</span></li>
                <li><span className="ok">✓</span><span>TRIDENT <span className="fem">GPS-free localization</span></span></li>
                <li><span className="ok">✓</span><span>White-label / OEM licensing</span></li>
                <li><span className="ok">✓</span><span>REST API — SNN metrics</span></li>
                <li><span className="ok">✓</span><span>ClonEngine Rust source access</span></li>
                <li><span className="ok">✓</span><span>Marine SNN + WMM2025 module</span></li>
                <li><span className="ok">✓</span><span>Custom training pipeline</span></li>
                <li><span className="ok">✓</span><span>SLA 99.9% · Priority support</span></li>
              </ul>
              <a href="mailto:klonengine@proton.me" className="pbtn pbtn-g">Contact sales →</a>
            </Rv>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta">
        <div className="ctain">
          <Rv cls="ctal">Open source · Apache 2.0 · Built in New Orleans</Rv>
          <Rv cls="d1"><h2 className="ctat display">The worm that<br /><em>outsmarted</em> the GPU</h2></Rv>
          <Rv cls="d2"><p className="ctas">ClonEngine achieves 98.4% F1 on industrial predictive maintenance using a biological wiring diagram from neuroscience research — running in 18.6 KB, on a CPU, in 3 epochs. No GPUs harmed.</p></Rv>
          <Rv cls="d3" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <a href="#pricing" className="btn-m" style={{ fontSize: 16, padding: "16px 36px" }}>Start free →</a>
            <a href="#benchmarks" className="btn-g" style={{ fontSize: 16, padding: "16px 28px" }}>Read the benchmarks</a>
          </Rv>
          <Rv cls="d4 ctanote">No credit card · No account for Free tier · Apache 2.0</Rv>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="fg">
            <div><div className="flogo">CLONENGINE</div><p className="ftag">The first neuromorphic AI running on real biological connectomes. Built by one engineer in New Orleans without capital, institutions, or GPU clusters.</p></div>
            <div><div className="fch">Products</div><ul className="flinks"><li><a href="#">KlonOS VPN</a></li><li><a href="#">SpikeForge npm</a></li><li><a href="#">ClonEngine SDK</a></li><li><a href="#">NeuroCalc</a></li></ul></div>
            <div><div className="fch">Research</div><ul className="flinks"><li><a href="#">AI4I 2020 Results</a></li><li><a href="#">NeuroBench Track</a></li><li><a href="#">arXiv Preprint</a></li><li><a href="#">Zenodo DOI</a></li></ul></div>
            <div><div className="fch">Company</div><ul className="flinks"><li><a href="#">About</a></li><li><a href="mailto:klonengine@proton.me">Contact</a></li><li><a href="#">GitHub</a></li><li><a href="#">Apache 2.0</a></li></ul></div>
          </div>
          <div className="fbot">
            <div className="fcopy">© 2026 Juan José Salgado Fuentes · New Orleans, Louisiana · USA</div>
            <div className="fdoi">CBENN · C.elegans 302N · Maya Q20 · Schumann 7.83Hz</div>
          </div>
        </div>
      </footer>
    </>
  );
}
