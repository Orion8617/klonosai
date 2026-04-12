import { useState, useEffect, useRef, useCallback } from "react";

const SCHUMANN_MS = 127;
const GAMMA_MS = 25;
const VIGESIMAL_WEIGHT = 50;

type Agent = { name: string; color: string; x: number; y: number; spiking: boolean };
type SNNDecision = { targets: Array<{ x: number; y: number; waste_type: string; cleanup_spike: boolean }> };

const AGENTS: Agent[] = [
  { name: "PODADOR", color: "#00C896", x: 0, y: 0, spiking: false },
  { name: "DRENADOR", color: "#0096C8", x: 0, y: 0, spiking: false },
  { name: "REGULADOR", color: "#C89600", x: 0, y: 0, spiking: false },
  { name: "SCHUMANN", color: "#C8C8C8", x: 0, y: 0, spiking: false },
];

function calculatePascalDeviation(wasteScore: number): number {
  return Math.floor((wasteScore / 100) * 80 + Math.random() * 20);
}

function injectWasteMessage(tabId: number) {
  chrome?.tabs?.sendMessage(tabId, { type: "INJECT_WASTE" });
}

function sendSNNCommand(tabId: number, enabled: boolean) {
  chrome?.tabs?.sendMessage(tabId, { type: enabled ? "SNN_ON" : "SNN_OFF" });
}

async function queryMetrics(tabId: number): Promise<{ wasteScore: number; heapRecovered: number; totalPurged: number; wasteCount: number; gammaBurst: boolean }> {
  return new Promise((resolve) => {
    try {
      chrome?.tabs?.sendMessage(tabId, { type: "GET_METRICS" }, (resp) => {
        if (chrome?.runtime?.lastError || !resp) {
          resolve({ wasteScore: 0, heapRecovered: 0, totalPurged: 0, wasteCount: 0, gammaBurst: false });
        } else {
          resolve(resp);
        }
      });
    } catch {
      resolve({ wasteScore: 0, heapRecovered: 0, totalPurged: 0, wasteCount: 0, gammaBurst: false });
    }
  });
}

export default function App() {
  const [snnActive, setSnnActive] = useState(false);
  const [wasteScore, setWasteScore] = useState(72);
  const [heapRecovered, setHeapRecovered] = useState(0);
  const [totalPurged, setTotalPurged] = useState(0);
  const [wasteCount, setWasteCount] = useState(0);
  const [pressure, setPressure] = useState(0);
  const [gammaBurst, setGammaBurst] = useState(false);
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [tabId, setTabId] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [tick, setTick] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const getChromeTab = async () => {
      try {
        const [tab] = await chrome?.tabs?.query({ active: true, currentWindow: true });
        if (tab?.id) {
          setTabId(tab.id);
          setConnected(true);
        }
      } catch {
        setConnected(false);
      }
    };
    getChromeTab();
  }, []);

  const generateSNNDecision = useCallback((): SNNDecision => {
    const agentSpeed = gammaBurst ? 3.5 : 1.0;
    return {
      targets: AGENTS.map((_, i) => ({
        x: Math.random() * 320,
        y: Math.random() * 400,
        waste_type: Math.random() > 0.5 ? "script_orphan" : "telemetry_leak",
        cleanup_spike: Math.random() < (gammaBurst ? 0.8 : 0.3) * agentSpeed,
      })),
    };
  }, [gammaBurst]);

  useEffect(() => {
    if (!snnActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const ms = gammaBurst ? GAMMA_MS : SCHUMANN_MS;
    intervalRef.current = setInterval(async () => {
      frameRef.current++;
      setTick((t) => t + 1);

      const newPressure = calculatePascalDeviation(wasteScore);
      setPressure(newPressure);

      const shouldGamma = newPressure > VIGESIMAL_WEIGHT;
      setGammaBurst(shouldGamma);

      const decision = generateSNNDecision();
      setAgents((prev) =>
        prev.map((a, i) => ({
          ...a,
          x: decision.targets[i].x,
          y: decision.targets[i].y,
          spiking: decision.targets[i].cleanup_spike,
        }))
      );

      if (decision.targets.some((t) => t.cleanup_spike)) {
        setHeapRecovered((h) => Math.min(h + 0.08 * (shouldGamma ? 2 : 1), 9999));
        setWasteScore((w) => Math.max(w - 0.5 * (shouldGamma ? 1.5 : 1), 0));
      }

      if (tabId && frameRef.current % 3 === 0) {
        const metrics = await queryMetrics(tabId);
        setWasteScore(metrics.wasteScore || 0);
        setHeapRecovered(metrics.heapRecovered || 0);
        setTotalPurged(metrics.totalPurged || 0);
        setWasteCount(metrics.wasteCount || 0);
        if (metrics.gammaBurst !== undefined) setGammaBurst(metrics.gammaBurst);
      }
    }, ms);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [snnActive, gammaBurst, wasteScore, tabId, generateSNNDecision]);

  const toggleSNN = () => {
    const next = !snnActive;
    setSnnActive(next);
    if (tabId) sendSNNCommand(tabId, next);
    if (!next) {
      setGammaBurst(false);
      setPressure(0);
      setAgents(AGENTS.map((a) => ({ ...a, x: 0, y: 0, spiking: false })));
    }
  };

  const injectWaste = () => {
    setWasteScore((w) => Math.min(w + 15, 100));
    if (tabId) injectWasteMessage(tabId);
  };

  const pct = Math.round((wasteScore / 100) * 100);
  const barColor = wasteScore > 70 ? "#E05A3A" : wasteScore > 40 ? "#C89600" : "#00C896";

  return (
    <div
      className="flex flex-col"
      style={{
        width: 380,
        minHeight: 540,
        background: "#0D1A0F",
        fontFamily: "'Space Mono', monospace",
        color: "#00C896",
        border: "1px solid rgba(0,200,150,0.25)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(0,200,150,0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#0B1610",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "#00C896",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 11,
              color: "#0D1A0F",
            }}
          >
            K5
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>KLONOS LAYER 5.0</div>
            <div style={{ fontSize: 8, color: "#4A8060", letterSpacing: 1 }}>SOVEREIGN SNN HOUSEKEEPER</div>
          </div>
        </div>
        <div
          style={{
            fontSize: 9,
            color: connected ? "#00C896" : "#E05A3A",
            letterSpacing: 1,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: connected ? "#00C896" : "#E05A3A",
            }}
          />
          {connected ? "PÁGINA ACTIVA" : "SIN PÁGINA"}
        </div>
      </div>

      <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(0,200,150,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 9, letterSpacing: 2, color: "#4A8060" }}>WASTE SCORE</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: barColor }}>
            {wasteScore.toFixed(0)}
            <span style={{ fontSize: 11, color: "#4A8060" }}>/100</span>
          </span>
        </div>
        <div style={{ height: 4, background: "#0B1610", borderRadius: 2, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: barColor,
              transition: "width 0.3s, background 0.5s",
              borderRadius: 2,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9 }}>
          <span style={{ color: "#4A8060" }}>
            WASTE NODES: <span style={{ color: wasteCount > 10 ? "#E05A3A" : "#00C896" }}>{wasteCount}</span>
          </span>
          <span style={{ color: "#4A8060" }}>
            FASE: <span style={{ color: gammaBurst ? "#C89600" : "#00C896" }}>{gammaBurst ? "40Hz ⚡" : "7.83Hz"}</span>
          </span>
        </div>
      </div>

      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(0,200,150,0.15)" }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#4A8060", marginBottom: 8 }}>PATRULLA SNN</div>
        <div style={{ position: "relative", height: 120, background: "#080F09", borderRadius: 4, overflow: "hidden" }}>
          <svg width="100%" height="120" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,200,150,0.05)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {agents.map((a, i) =>
              snnActive ? (
                <g key={i} transform={`translate(${(a.x / 380) * 350},${(a.y / 400) * 110})`}>
                  {a.spiking && (
                    <circle cx="5" cy="5" r="10" fill="none" stroke={a.color} strokeWidth="1" opacity="0.4" />
                  )}
                  <polygon
                    points="5,0 9.33,2.5 9.33,7.5 5,10 0.67,7.5 0.67,2.5"
                    fill={a.color}
                    opacity={a.spiking ? 1 : 0.7}
                    style={{ filter: a.spiking ? `drop-shadow(0 0 4px ${a.color})` : "none" }}
                  />
                </g>
              ) : null
            )}
            {!snnActive && (
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="rgba(0,200,150,0.2)" fontSize="10" fontFamily="Space Mono">
                SNN INACTIVA
              </text>
            )}
          </svg>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {agents.map((a, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: snnActive && a.spiking ? a.color : "transparent",
                  border: `1px solid ${a.color}`,
                  borderRadius: 1,
                  transition: "background 0.1s",
                  transform: "rotate(45deg)",
                }}
              />
              <div style={{ fontSize: 7, color: a.color, letterSpacing: 0.5 }}>{a.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(0,200,150,0.15)" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <div style={{ flex: 1, background: "#080F09", borderRadius: 3, padding: "6px 8px" }}>
            <div style={{ fontSize: 8, letterSpacing: 1, color: "#4A8060", marginBottom: 2 }}>HEAP RECUPERADO</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#00C896" }}>
              {heapRecovered.toFixed(1)}<span style={{ fontSize: 9, color: "#4A8060" }}>MB</span>
            </div>
          </div>
          <div style={{ flex: 1, background: "#080F09", borderRadius: 3, padding: "6px 8px" }}>
            <div style={{ fontSize: 8, letterSpacing: 1, color: "#4A8060", marginBottom: 2 }}>NODOS PURGADOS</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E05A3A" }}>
              {totalPurged}<span style={{ fontSize: 9, color: "#4A8060" }}> nodos</span>
            </div>
          </div>
          <div style={{ flex: 1, background: "#080F09", borderRadius: 3, padding: "6px 8px" }}>
            <div style={{ fontSize: 8, letterSpacing: 1, color: "#4A8060", marginBottom: 2 }}>EN COLA</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: wasteCount > 10 ? "#C89600" : "#00C896" }}>
              {wasteCount}<span style={{ fontSize: 9, color: "#4A8060" }}> waste</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#4A8060", marginBottom: 4 }}>
          <span>STBP: <span style={{ color: pressure > VIGESIMAL_WEIGHT ? "#C89600" : "#00C896" }}>{pressure > VIGESIMAL_WEIGHT ? "AGRESIVO" : "NOMINAL"}</span></span>
          <span>∆ PASCAL: <span style={{ color: pressure > VIGESIMAL_WEIGHT ? "#C89600" : "#00C896" }}>{pressure}</span></span>
        </div>
        {gammaBurst && (
          <div
            style={{
              padding: "4px 8px",
              background: "rgba(200,150,0,0.1)",
              border: "1px solid rgba(200,150,0,0.4)",
              borderRadius: 3,
              fontSize: 9,
              color: "#C89600",
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            ⚡ MODO GAMMA BURST ACTIVO — 40Hz
          </div>
        )}
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={toggleSNN}
          style={{
            width: "100%",
            padding: "10px",
            background: snnActive
              ? gammaBurst
                ? "rgba(200,150,0,0.12)"
                : "rgba(0,200,150,0.1)"
              : "transparent",
            border: `1px solid ${snnActive ? (gammaBurst ? "#C89600" : "#00C896") : "rgba(0,200,150,0.3)"}`,
            color: snnActive ? (gammaBurst ? "#C89600" : "#00C896") : "rgba(0,200,150,0.6)",
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: 2,
            cursor: "pointer",
            borderRadius: 3,
            fontWeight: 700,
            transition: "all 0.2s",
          }}
        >
          {snnActive ? (gammaBurst ? "■ GAMMA: 40Hz" : "■ SNN: ON — 7.83Hz") : "▶ ACTIVAR SNN"}
        </button>
        <button
          onClick={injectWaste}
          style={{
            width: "100%",
            padding: "8px",
            background: "rgba(224,90,58,0.1)",
            border: "1px solid rgba(224,90,58,0.4)",
            color: "#E05A3A",
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 2,
            cursor: "pointer",
            borderRadius: 3,
          }}
        >
          INJECT WASTE
        </button>
      </div>

      <div
        style={{
          padding: "6px 14px",
          borderTop: "1px solid rgba(0,200,150,0.1)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 8,
          color: "#2A5040",
        }}
      >
        <span>JUAN JOSÉ SALGADO FUENTES</span>
        <span style={{ color: snnActive ? "#00C896" : "#2A5040" }}>
          {snnActive ? `TICK #${tick}` : "STANDBY"}
        </span>
      </div>
    </div>
  );
}
