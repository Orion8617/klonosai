// ─── Layer 7: PingMeter — Before/After latency HUD ───────────────────────────
import { useCallback, useEffect, useState } from "react";

export function PingMeter() {
  const [active, setActive] = useState(false);
  const [ping,   setPing]   = useState(127);
  const [loss,   setLoss]   = useState(18);

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
