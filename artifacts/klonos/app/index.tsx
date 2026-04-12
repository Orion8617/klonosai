import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";

import { BrowserHeader } from "@/components/BrowserHeader";
import { DOMNodeCard, DOMNodeData } from "@/components/DOMNodeCard";
import { SNNCanvas, AgentState, NodePosition } from "@/components/SNNCanvas";
import { TelemetryFooter } from "@/components/TelemetryFooter";
import { useColors } from "@/hooks/useColors";

// ═══════════════════════════════════════════════════════
// WASM CORE — Traducción directa del módulo Rust
// fn swarm_auto_maintenance(metrics: SystemMetrics)
// ═══════════════════════════════════════════════════════

/** Base vigesimal (base-20) — umbral biológico de presión Pascal */
const VIGESIMAL_WEIGHT = 50;

/** Frecuencia Schumann (reposo): 7.83 Hz → ~127ms/pulso */
const SCHUMANN_MS = 1000 / 7.83;

/** Ráfaga Gamma (alerta alta): 40 Hz → ~25ms/pulso */
const GAMMA_BURST_MS = 1000 / 40;

/** Velocidad base del agente en reposo Schumann */
const BASE_AGENT_SPEED = 12;

/**
 * calculate_pascal_deviation(dom_depth_map)
 * Calcula la presión de desviación Pascal ponderando la profundidad
 * de cada nodo activo. Nodos más profundos = mayor entropía.
 */
function calculatePascalDeviation(nodes: DOMNodeData[]): number {
  const activeWaste = nodes.filter((n) => n.isWaste && !n.cleaned);
  if (activeWaste.length === 0) return 0;
  const totalDepthWeight = activeWaste.reduce(
    (sum, n) => sum + n.ramWeight * (1 + n.depth / 20),
    0
  );
  return Math.min(100, totalDepthWeight * 3);
}

/**
 * adjust_swarm_sensitivity(waste_pressure)
 * STBP: si el sistema se ensucia rápido, la cuadrilla baja su umbral
 * de disparo y se vuelve más agresiva.
 * Retorna: { speed, arrivalThreshold }
 */
function adjustSwarmSensitivity(wastePressure: number): {
  speed: number;
  arrivalThreshold: number;
} {
  const aggressionFactor = 1 + (wastePressure / 100) * 2.5;
  const speed = BASE_AGENT_SPEED * aggressionFactor;
  const arrivalThreshold = Math.max(3, 10 - (wastePressure / 100) * 7);
  return { speed, arrivalThreshold };
}

// ═══════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════

const AGENT_DEFS = [
  { name: "Podador", color: "#00C896" },
  { name: "Drenador", color: "#0096C8" },
  { name: "Regulador", color: "#C89600" },
  { name: "Schumann", color: "#FFFFFF" },
];

let nodeIdCounter = 0;
function createNode(isWaste: boolean): DOMNodeData {
  nodeIdCounter++;
  return {
    id: `node-${nodeIdCounter}`,
    isWaste,
    depth: Math.floor(Math.random() * 20),
    cleaned: false,
    ramWeight: Math.random() * 2 + 0.5,
  };
}

function generateInitialNodes(): DOMNodeData[] {
  const nodes: DOMNodeData[] = [];
  for (let i = 0; i < 16; i++) {
    nodes.push(createNode(Math.random() > 0.6));
  }
  return nodes;
}

// ═══════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════

export default function KlonOSScreen() {
  const colors = useColors();
  const [snnActive, setSnnActive] = useState(false);
  const [nodes, setNodes] = useState<DOMNodeData[]>(generateInitialNodes);
  const [totalRamRecovered, setTotalRamRecovered] = useState(0);
  const [phaseLock, setPhaseLock] = useState(false);
  const [gammaBurst, setGammaBurst] = useState(false);
  const [wastePressure, setWastePressure] = useState(0);

  const nodeLayoutsRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(
    new Map()
  );
  const scrollOffsetRef = useRef(0);
  const viewportLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const gammaBurstRef = useRef(false);

  const agentsRef = useRef<AgentState[]>(
    AGENT_DEFS.map((a) => ({
      name: a.name,
      color: a.color,
      x: 100,
      y: 200,
      targetId: null,
      spiking: false,
    }))
  );
  const [agentStates, setAgentStates] = useState<AgentState[]>(agentsRef.current);

  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const snnActiveRef = useRef(snnActive);
  useEffect(() => {
    snnActiveRef.current = snnActive;
  }, [snnActive]);

  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);

  const rebuildPositions = useCallback(() => {
    const positions: NodePosition[] = [];
    const scroll = scrollOffsetRef.current;
    const vpX = viewportLayoutRef.current.x;
    const vpY = viewportLayoutRef.current.y;

    nodesRef.current.forEach((n) => {
      const layout = nodeLayoutsRef.current.get(n.id);
      if (layout) {
        positions.push({
          id: n.id,
          x: vpX + layout.x + layout.w / 2,
          y: vpY + layout.y + layout.h / 2 - scroll,
          cleaned: n.cleaned,
        });
      }
    });
    setNodePositions(positions);
  }, []);

  // ─────────────────────────────────────────────────────
  // swarm_auto_maintenance — lógica central WASM
  // ─────────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSNNTick = useCallback(() => {
    if (!snnActiveRef.current) return;

    setPhaseLock(true);
    setTimeout(() => setPhaseLock(false), 80);

    const currentNodes = nodesRef.current;
    const activeWaste = currentNodes.filter((n) => n.isWaste && !n.cleaned);

    // calculate_pascal_deviation
    const pressure = calculatePascalDeviation(currentNodes);
    setWastePressure(Math.round(pressure));

    // swarm_auto_maintenance: check umbral biológico
    const inGamma = pressure > VIGESIMAL_WEIGHT;
    if (inGamma !== gammaBurstRef.current) {
      gammaBurstRef.current = inGamma;
      setGammaBurst(inGamma);

      // execute_distributed_cleanup → cambiar frecuencia del intervalo
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(
        runSNNTick,
        inGamma ? GAMMA_BURST_MS : SCHUMANN_MS
      );

      if (Platform.OS !== "web" && inGamma) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }

    // adjust_swarm_sensitivity → velocidad y umbral adaptativos (STBP)
    const { speed, arrivalThreshold } = adjustSwarmSensitivity(pressure);

    const updatedAgents = agentsRef.current.map((agent) => {
      const newAgent = { ...agent, spiking: false };

      // Buscar objetivo más cercano si no tiene uno activo
      if (!newAgent.targetId || !activeWaste.find((w) => w.id === newAgent.targetId)) {
        if (activeWaste.length > 0) {
          const nodePos = nodeLayoutsRef.current;
          const scroll = scrollOffsetRef.current;
          const vpX = viewportLayoutRef.current.x;
          const vpY = viewportLayoutRef.current.y;

          let closest: DOMNodeData | null = null;
          let closestDist = Infinity;
          for (const w of activeWaste) {
            const layout = nodePos.get(w.id);
            if (!layout) continue;
            const tx = vpX + layout.x + layout.w / 2;
            const ty = vpY + layout.y + layout.h / 2 - scroll;
            const dist = Math.hypot(tx - newAgent.x, ty - newAgent.y);
            if (dist < closestDist) {
              closestDist = dist;
              closest = w;
            }
          }
          if (closest) newAgent.targetId = closest.id;
        } else {
          newAgent.targetId = null;
        }
      }

      // Movimiento con velocidad STBP adaptativa
      if (newAgent.targetId) {
        const targetNode = activeWaste.find((w) => w.id === newAgent.targetId);
        const layout = targetNode ? nodeLayoutsRef.current.get(targetNode.id) : null;
        if (layout) {
          const scroll = scrollOffsetRef.current;
          const vpX = viewportLayoutRef.current.x;
          const vpY = viewportLayoutRef.current.y;
          const tx = vpX + layout.x + layout.w / 2;
          const ty = vpY + layout.y + layout.h / 2 - scroll;
          const dx = tx - newAgent.x;
          const dy = ty - newAgent.y;
          const dist = Math.hypot(dx, dy);

          if (dist > arrivalThreshold) {
            // STBP: velocidad dinámica según presión Pascal
            newAgent.x += (dx / dist) * speed;
            newAgent.y += (dy / dist) * speed;
          } else {
            // SPIKE — limpieza del nodo
            newAgent.spiking = true;
            const nid = newAgent.targetId;

            setTimeout(() => {
              setNodes((prev) => {
                const idx = prev.findIndex((n) => n.id === nid);
                if (idx === -1 || prev[idx].cleaned) return prev;
                const updated = [...prev];
                const ram = updated[idx].ramWeight;
                updated[idx] = { ...updated[idx], cleaned: true, cleanedBy: newAgent.name };
                setTotalRamRecovered((r) => r + ram);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                return updated;
              });
            }, 0);

            newAgent.targetId = null;
          }
        } else {
          newAgent.targetId = null;
        }
      } else {
        // Patrulla aleatoria — más activa en Gamma
        const jitter = inGamma ? 10 : 4;
        newAgent.x += (Math.random() - 0.5) * jitter;
        newAgent.y += (Math.random() - 0.5) * jitter;

        const vp = viewportLayoutRef.current;
        newAgent.x = Math.max(20, Math.min(vp.width - 20, newAgent.x));
        newAgent.y = Math.max(20, Math.min(vp.height - 20, newAgent.y));
      }

      return newAgent;
    });

    agentsRef.current = updatedAgents;
    setAgentStates([...updatedAgents]);
    rebuildPositions();
  }, [rebuildPositions]);

  useEffect(() => {
    if (snnActive) {
      gammaBurstRef.current = false;
      intervalRef.current = setInterval(runSNNTick, SCHUMANN_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPhaseLock(false);
      setGammaBurst(false);
      gammaBurstRef.current = false;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [snnActive, runSNNTick]);

  useEffect(() => {
    rebuildPositions();
  }, [nodes, rebuildPositions]);

  const handleToggleSNN = useCallback(() => {
    const next = !snnActive;
    setSnnActive(next);
    if (next) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      const vp = viewportLayoutRef.current;
      const cx = vp.width / 2;
      const cy = vp.height / 2;
      agentsRef.current = AGENT_DEFS.map((a) => ({
        name: a.name,
        color: a.color,
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 80,
        targetId: null,
        spiking: false,
      }));
      setAgentStates([...agentsRef.current]);
    }
  }, [snnActive]);

  const handleInjectWaste = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setNodes((prev) => {
      const added: DOMNodeData[] = [];
      for (let i = 0; i < 4; i++) added.push(createNode(true));
      return [...prev, ...added];
    });
  }, []);

  const handleExportPWA = useCallback(() => {
    Alert.alert(
      "Export PWA Assets",
      "En producción esto generaría manifest.json y sw.js para instalar KlonOS como PWA nativa en Android."
    );
  }, []);

  const handleNodeLayout = useCallback(
    (id: string, x: number, y: number, width: number, height: number) => {
      nodeLayoutsRef.current.set(id, { x, y, w: width, h: height });
      rebuildPositions();
    },
    [rebuildPositions]
  );

  const wasteScore = Math.round(
    Math.min(100, nodes.filter((n) => n.isWaste && !n.cleaned).length * 8)
  );

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrowserHeader
        snnActive={snnActive}
        onToggleSNN={handleToggleSNN}
        gammaBurst={gammaBurst}
      />

      <View
        style={styles.viewport}
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          viewportLayoutRef.current = { x, y, width, height };
          setCanvasSize({ width, height });
          rebuildPositions();
        }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            rebuildPositions();
          }}
          scrollEventThrottle={16}
        >
          <Text style={[styles.pageTitle, { color: colors.white, fontFamily: "Inter_700Bold" }]}>
            Trident Terra — Informe Operativo
          </Text>
          <Text style={[styles.pageDesc, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
            Este entorno simula un DOM complejo. Los nodos rojos representan
            acumulación de basura (Desviación del Campo Pascal), fugas de
            memoria o scripts de telemetría pesados.
          </Text>

          <View style={styles.nodesContainer}>
            {nodes.map((node) => (
              <DOMNodeCard
                key={node.id}
                node={node}
                onLayout={handleNodeLayout}
              />
            ))}
          </View>
        </ScrollView>

        <SNNCanvas
          agents={agentStates}
          nodePositions={nodePositions}
          width={canvasSize.width}
          height={canvasSize.height}
          snnActive={snnActive}
          gammaBurst={gammaBurst}
        />
      </View>

      <TelemetryFooter
        wasteScore={wasteScore}
        wastePressure={wastePressure}
        ramRecovered={totalRamRecovered}
        phaseLock={phaseLock}
        gammaBurst={gammaBurst}
        onInjectWaste={handleInjectWaste}
        onExportPWA={handleExportPWA}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  viewport: { flex: 1, position: "relative", overflow: "hidden" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 20, marginBottom: 12, lineHeight: 28 },
  pageDesc: { fontSize: 11, lineHeight: 18, marginBottom: 20 },
  nodesContainer: { gap: 0 },
});
