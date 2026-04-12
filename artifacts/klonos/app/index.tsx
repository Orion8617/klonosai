import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";

import { BrowserHeader } from "@/components/BrowserHeader";
import { DOMNodeCard, DOMNodeData } from "@/components/DOMNodeCard";
import { SNNCanvas, AgentState, NodePosition } from "@/components/SNNCanvas";
import { TelemetryFooter } from "@/components/TelemetryFooter";
import { useColors } from "@/hooks/useColors";

const AGENT_DEFS = [
  { name: "Podador", color: "#00C896" },
  { name: "Drenador", color: "#0096C8" },
  { name: "Regulador", color: "#C89600" },
  { name: "Schumann", color: "#FFFFFF" },
];

const SCHUMANN_MS = 1000 / 7.83;

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

function computeWasteScore(nodes: DOMNodeData[]): number {
  const active = nodes.filter((n) => n.isWaste && !n.cleaned).length;
  return Math.min(100, active * 8);
}

export default function KlonOSScreen() {
  const colors = useColors();
  const [snnActive, setSnnActive] = useState(false);
  const [nodes, setNodes] = useState<DOMNodeData[]>(generateInitialNodes);
  const [totalRamRecovered, setTotalRamRecovered] = useState(0);
  const [phaseLock, setPhaseLock] = useState(false);

  const nodeLayoutsRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(
    new Map()
  );
  const scrollOffsetRef = useRef(0);
  const viewportLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const agentsRef = useRef<AgentState[]>(
    AGENT_DEFS.map((a, i) => ({
      name: a.name,
      color: a.color,
      x: 100 + i * 60,
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

  // Build NodePosition array for canvas from layout cache
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

  // SNN agent loop
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSNNTick = useCallback(() => {
    if (!snnActiveRef.current) return;

    setPhaseLock(true);
    setTimeout(() => setPhaseLock(false), 100);

    const currentNodes = nodesRef.current;
    const activeWaste = currentNodes.filter((n) => n.isWaste && !n.cleaned);

    const updatedAgents = agentsRef.current.map((agent) => {
      const newAgent = { ...agent, spiking: false };

      // Find target
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

      // Move toward target
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

          if (dist > 8) {
            newAgent.x += (dx / dist) * 12;
            newAgent.y += (dy / dist) * 12;
          } else {
            // SPIKE: clean the node
            newAgent.spiking = true;
            const nid = newAgent.targetId;

            // Schedule state update outside of this call
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
        // Patrol random
        newAgent.x += (Math.random() - 0.5) * 6;
        newAgent.y += (Math.random() - 0.5) * 6;

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
      intervalRef.current = setInterval(runSNNTick, SCHUMANN_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPhaseLock(false);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [snnActive, runSNNTick]);

  // Rebuild positions whenever nodes or scroll changes
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
      // Reposition agents to center of viewport
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
      "En un entorno de producción, esto generaría manifest.json y sw.js para instalar KlonOS como PWA nativa en Android."
    );
  }, []);

  const handleNodeLayout = useCallback(
    (id: string, x: number, y: number, width: number, height: number) => {
      nodeLayoutsRef.current.set(id, { x, y, w: width, h: height });
      rebuildPositions();
    },
    [rebuildPositions]
  );

  const wasteScore = computeWasteScore(nodes);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BrowserHeader snnActive={snnActive} onToggleSNN={handleToggleSNN} />

      {/* Main viewport */}
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

        {/* SNN Canvas overlay */}
        <SNNCanvas
          agents={agentStates}
          nodePositions={nodePositions}
          width={canvasSize.width}
          height={canvasSize.height}
          snnActive={snnActive}
        />
      </View>

      <TelemetryFooter
        wasteScore={wasteScore}
        ramRecovered={totalRamRecovered}
        phaseLock={phaseLock}
        onInjectWaste={handleInjectWaste}
        onExportPWA={handleExportPWA}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  viewport: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 20,
    marginBottom: 12,
    lineHeight: 28,
  },
  pageDesc: {
    fontSize: 11,
    lineHeight: 18,
    marginBottom: 20,
  },
  nodesContainer: {
    gap: 0,
  },
});
