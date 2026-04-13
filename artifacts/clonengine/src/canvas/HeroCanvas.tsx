// ─── Layer 3: HeroCanvas — Wireframe Earth + SNN Orbital Nodes ───────────────
// Inputs:  engine/snn (Neuron, izhi, pascalImp, BILATERAL_K, THETA_PERIOD)
//          engine/orbital (SATS)
// Output:  <canvas id="hero-canvas"> full-bleed background animation
import { useEffect, useRef } from "react";
import { Neuron, izhi, pascalImp, vigesimal, BILATERAL_K, THETA_PERIOD } from "../engine/snn";
import { SATS } from "../engine/orbital";

export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const cx = cv.getContext("2d")!;
    let W = 0, H = 0, raf = 0;
    function rs() { if (!cv) return; W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; }
    rs(); window.addEventListener("resize", rs);

    // 302-neuron SNN (C. elegans connectome scale)
    const NN = 302;
    const snn: Neuron[] = [];
    for (let i = 0; i < NN; i++) snn.push({ x: 0, y: 0, v: -65 + Math.random() * 10, u: -13, f: 0, l: Math.random() > .5 });
    const sy: { a: number; b: number; w: number }[] = [];
    for (let i = 0; i < 700; i++) {
      const a = Math.floor(Math.random() * NN), b = Math.floor(Math.random() * NN);
      if (a !== b) sy.push({ a, b, w: (Math.random() - .5) * .4 });
    }

    // Theta scheduler — recomputes Pascal weights every THETA_PERIOD frames
    const pw = new Float32Array(NN);
    let thetaPhase = 0;
    function thetaRecompute() { for (let i = 0; i < NN; i++) pw[i] = pascalImp(W * .5, H * .5, W, H); }
    thetaRecompute();

    // Globe + Schumann state
    let globeRot = 0, tk = 0, sc = 0;

    // ECI projection — full orbital mechanics (inclination + RAAN)
    function eciPt(inc: number, raan: number, u: number, rMult: number) {
      const GR = Math.min(W, H) * 0.20, r = GR * rMult;
      const GX = W * 0.60, GY = H * 0.46;
      const ex = r * (Math.cos(u) * Math.cos(raan) - Math.sin(u) * Math.sin(raan) * Math.cos(inc));
      const ey = r * (Math.cos(u) * Math.sin(raan) + Math.sin(u) * Math.cos(raan) * Math.cos(inc));
      const ez = r * Math.sin(u) * Math.sin(inc);
      const ex2 = ex * Math.cos(globeRot) + ey * Math.sin(globeRot);
      const ey2 = -ex * Math.sin(globeRot) + ey * Math.cos(globeRot);
      return { sx: GX + ex2, sy: GY - ez, depth: ey2 / r };
    }

    // Sphere surface projection — lat/lon → screen (globe wireframe)
    function spherePt(lat: number, lon: number) {
      const GR = Math.min(W, H) * 0.20;
      const GX = W * 0.60, GY = H * 0.46;
      const x3 = GR * Math.cos(lat) * Math.cos(lon + globeRot);
      const y3 = GR * Math.sin(lat);
      const z3 = GR * Math.cos(lat) * Math.sin(lon + globeRot);
      return { sx: GX + x3, sy: GY - y3, depth: z3 / GR };
    }

    // SpikeForge edge buckets — reused every frame (no allocation)
    const oBkt = new Map<number, number[]>();
    const cBkt = new Map<number, number[]>();
    const STEPS = 64;

    function draw(ts: number) {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      cx.fillStyle = "rgba(2,12,24,.13)"; cx.fillRect(0, 0, W, H);
      tk++;

      // Stage 4: Schumann 7.83Hz pulse + Theta 6Hz scheduler
      sc += 7.83 / 60; const sf = sc >= 1; if (sf) sc -= 1;
      thetaPhase++; if (thetaPhase >= THETA_PERIOD) { thetaPhase = 0; thetaRecompute(); }
      globeRot += 0.0028;

      // SNN step — synaptic propagation + Izhikevich dynamics
      const inp = new Float32Array(NN);
      for (let i = 0; i < sy.length; i++) { const s = sy[i]; if (snn[s.a].f > 0) inp[s.b] += s.w * 9; }
      for (let i = 0; i < NN; i++) {
        const n = snn[i];
        const I = inp[i] + (Math.random() - .3) * 4 + (i % 53 === tk % 53 ? 4 : 0);
        if (n.f === 0 && n.v < -62 && Math.abs(I) < 1.5) { n.v += .04 * n.v * n.v * .002 + I * .04; }
        else { izhi(n, I); }
      }

      // Advance orbital angles
      for (let si = 0; si < SATS.length; si++) SATS[si].angle += SATS[si].speed;

      const GR = Math.min(W, H) * 0.20, GX = W * 0.60, GY = H * 0.46;

      // Globe wireframe — 5 latitude rings + 8 meridians, front/back depth split
      cx.lineWidth = 0.5;
      for (const lat of [-1.05, -0.52, 0, 0.52, 1.05]) {
        cx.strokeStyle = "rgba(0,212,255,0.13)"; cx.beginPath();
        for (let j = 0; j <= STEPS; j++) {
          const p = spherePt(lat, (j / STEPS) * Math.PI * 2);
          if (p.depth >= 0) { if (j === 0 || spherePt(lat, ((j-1)/STEPS)*Math.PI*2).depth < 0) cx.moveTo(p.sx, p.sy); else cx.lineTo(p.sx, p.sy); }
        }
        cx.stroke();
        cx.strokeStyle = "rgba(0,212,255,0.035)"; cx.beginPath();
        for (let j = 0; j <= STEPS; j++) {
          const p = spherePt(lat, (j / STEPS) * Math.PI * 2);
          if (p.depth < 0) { if (j === 0 || spherePt(lat, ((j-1)/STEPS)*Math.PI*2).depth >= 0) cx.moveTo(p.sx, p.sy); else cx.lineTo(p.sx, p.sy); }
        }
        cx.stroke();
      }
      for (let li = 0; li < 8; li++) {
        const lon0 = (li / 8) * Math.PI * 2;
        cx.strokeStyle = "rgba(0,212,255,0.10)"; cx.beginPath();
        for (let j = 0; j <= STEPS; j++) {
          const lat = -Math.PI / 2 + (j / STEPS) * Math.PI;
          const p = spherePt(lat, lon0);
          if (p.depth >= 0) { if (j === 0 || spherePt(-Math.PI/2+((j-1)/STEPS)*Math.PI, lon0).depth < 0) cx.moveTo(p.sx, p.sy); else cx.lineTo(p.sx, p.sy); }
        }
        cx.stroke();
        cx.strokeStyle = "rgba(0,212,255,0.030)"; cx.beginPath();
        for (let j = 0; j <= STEPS; j++) {
          const lat = -Math.PI / 2 + (j / STEPS) * Math.PI;
          const p = spherePt(lat, lon0);
          if (p.depth < 0) { if (j === 0 || spherePt(-Math.PI/2+((j-1)/STEPS)*Math.PI, lon0).depth >= 0) cx.moveTo(p.sx, p.sy); else cx.lineTo(p.sx, p.sy); }
        }
        cx.stroke();
      }

      // ECI orbital rings — one ring per satellite (shares inc/raan within ring)
      cx.lineWidth = 0.4;
      for (let si = 0; si < SATS.length; si++) {
        const s = SATS[si], col = s.l ? "255,122,26" : "0,212,255";
        cx.strokeStyle = `rgba(${col},0.05)`; cx.beginPath();
        for (let j = 0; j <= STEPS; j++) {
          const p = eciPt(s.inc, s.raan, (j / STEPS) * Math.PI * 2, s.rMult);
          if (j === 0) cx.moveTo(p.sx, p.sy); else cx.lineTo(p.sx, p.sy);
        }
        cx.stroke();
      }

      // SpikeForge — batch edges by alpha bucket (Stage 3: Vigesimal quantisation)
      oBkt.clear(); cBkt.clear();
      for (let si = 0; si < SATS.length; si++) {
        const s = SATS[si], ni = s.ni;
        if (!snn[ni].f) continue;
        const pa = eciPt(s.inc, s.raan, s.angle, s.rMult);

        // Ground link — satellite → globe surface intercept
        const dx = GX - pa.sx, dy = GY - pa.sy, d = Math.hypot(dx, dy);
        const gsx = pa.sx + dx * (1 - GR / d), gsy = pa.sy + dy * (1 - GR / d);
        const alpha1 = vigesimal(.08 + snn[ni].f / 12 * .14);
        const bkt1 = s.l ? oBkt : cBkt;
        let arr1 = bkt1.get(alpha1); if (!arr1) { arr1 = []; bkt1.set(alpha1, arr1); }
        arr1.push(pa.sx, pa.sy, gsx, gsy);

        // Inter-satellite links (§10 Bilateral coupling)
        for (let sj = si + 1; sj < SATS.length; sj++) {
          const s2 = SATS[sj]; if (!snn[s2.ni].f) continue;
          const pb = eciPt(s2.inc, s2.raan, s2.angle, s2.rMult);
          if (Math.hypot(pb.sx - pa.sx, pb.sy - pa.sy) > GR * 3.8) continue;
          let ea = vigesimal(.07 + snn[ni].f / 12 * .11);
          if (s.l !== s2.l) ea = vigesimal(ea * BILATERAL_K);
          if (ea < 0.04) continue;
          const bkt2 = s.l ? oBkt : cBkt;
          let arr2 = bkt2.get(ea); if (!arr2) { arr2 = []; bkt2.set(ea, arr2); }
          arr2.push(pa.sx, pa.sy, pb.sx, pb.sy);
        }
      }
      cx.lineWidth = 0.7;
      oBkt.forEach((segs, a) => { cx.strokeStyle = `rgba(255,122,26,${a})`; cx.beginPath(); for (let i = 0; i < segs.length; i += 4) { cx.moveTo(segs[i], segs[i+1]); cx.lineTo(segs[i+2], segs[i+3]); } cx.stroke(); });
      cBkt.forEach((segs, a) => { cx.strokeStyle = `rgba(0,212,255,${a})`; cx.beginPath(); for (let i = 0; i < segs.length; i += 4) { cx.moveTo(segs[i], segs[i+1]); cx.lineTo(segs[i+2], segs[i+3]); } cx.stroke(); });

      // Satellite nodes — glow when firing, depth-scaled dot when idle
      cx.shadowBlur = 0;
      for (let si = 0; si < SATS.length; si++) {
        const s = SATS[si], ni = s.ni;
        const p = eciPt(s.inc, s.raan, s.angle, s.rMult);
        const hexCol = s.l ? "#ff7a1a" : "#00d4ff";
        const rgbCol = s.l ? "255,122,26" : "0,212,255";
        if (snn[ni].f > 0) {
          cx.shadowColor = hexCol; cx.shadowBlur = 10;
          cx.fillStyle = hexCol;
          cx.beginPath(); cx.arc(p.sx, p.sy, 2.8, 0, Math.PI * 2); cx.fill();
          cx.shadowBlur = 0;
        } else {
          const depthR = Math.max(0.8, 1.4 + p.depth * 0.6);
          const op = .10 + Math.max(0, (snn[ni].v + 65) / 75) * .20;
          cx.fillStyle = `rgba(${rgbCol},${op.toFixed(2)})`;
          cx.beginPath(); cx.arc(p.sx, p.sy, depthR, 0, Math.PI * 2); cx.fill();
        }
      }

      // Schumann pulse ring — amber ring expands from globe center at 7.83Hz
      if (sf) {
        cx.strokeStyle = "rgba(255,195,0,.10)"; cx.lineWidth = 1;
        cx.beginPath();
        cx.arc(GX, GY, GR + (ts % 1000 / 1000) * Math.min(W, H) * 0.32, 0, Math.PI * 2);
        cx.stroke();
      }
    }

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", rs); };
  }, []);

  return <canvas ref={ref} id="hero-canvas" />;
}
