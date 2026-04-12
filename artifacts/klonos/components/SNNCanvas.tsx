import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Line, Polygon, Defs, RadialGradient, Stop } from "react-native-svg";

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  cleaned: boolean;
}

export interface AgentState {
  name: string;
  color: string;
  x: number;
  y: number;
  targetId: string | null;
  spiking: boolean;
}

interface SNNCanvasProps {
  agents: AgentState[];
  nodePositions: NodePosition[];
  width: number;
  height: number;
  snnActive: boolean;
  gammaBurst: boolean;
}

function hexPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

export function SNNCanvas({
  agents,
  nodePositions,
  width,
  height,
  snnActive,
  gammaBurst,
}: SNNCanvasProps) {
  if (!snnActive || width === 0 || height === 0) return null;

  const nodeMap = new Map(nodePositions.map((n) => [n.id, n]));

  return (
    <View style={[styles.overlay, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="spikeGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="white" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {agents.map((agent) => {
          const target = agent.targetId ? nodeMap.get(agent.targetId) : null;
          // En modo Gamma el radio de detección se amplía
          const detectionRadius = gammaBurst ? 60 : 40;
          const agentSize = gammaBurst ? 9 : 7;

          return (
            <React.Fragment key={agent.name}>
              {/* Campo Pascal de detección */}
              <Circle
                cx={agent.x}
                cy={agent.y}
                r={detectionRadius}
                stroke={agent.color}
                strokeWidth={gammaBurst ? 1 : 0.5}
                strokeDasharray={gammaBurst ? "4 2" : "2 4"}
                fill="transparent"
                opacity={gammaBurst ? 0.7 : 0.45}
              />

              {/* Línea láser hacia objetivo */}
              {target && !target.cleaned && (
                <Line
                  x1={agent.x}
                  y1={agent.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={agent.color}
                  strokeWidth={gammaBurst ? 1.5 : 1}
                  opacity={gammaBurst ? 0.7 : 0.4}
                  strokeDasharray={gammaBurst ? "none" : "none"}
                />
              )}

              {/* Flash de spike */}
              {agent.spiking && (
                <Circle
                  cx={agent.x}
                  cy={agent.y}
                  r={gammaBurst ? 28 : 18}
                  fill="url(#spikeGlow)"
                  opacity={0.8}
                />
              )}

              {/* Cuerpo hexagonal del agente */}
              <Polygon
                points={hexPoints(agent.x, agent.y, agentSize)}
                fill={agent.color}
                opacity={gammaBurst ? 1 : 0.9}
                stroke={gammaBurst ? agent.color : "transparent"}
                strokeWidth={gammaBurst ? 1.5 : 0}
              />

              {/* Aura externa en modo Gamma */}
              {gammaBurst && (
                <Polygon
                  points={hexPoints(agent.x, agent.y, agentSize + 4)}
                  fill="transparent"
                  stroke={agent.color}
                  strokeWidth={0.8}
                  opacity={0.35}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
  },
});
