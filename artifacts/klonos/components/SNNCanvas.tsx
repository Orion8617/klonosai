import React, { useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Platform, Animated } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";

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
}

function hexPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

export function SNNCanvas({ agents, nodePositions, width, height, snnActive }: SNNCanvasProps) {
  if (!snnActive || width === 0 || height === 0) return null;

  const nodeMap = new Map(nodePositions.map((n) => [n.id, n]));

  return (
    <View style={[styles.overlay, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        {agents.map((agent) => {
          const target = agent.targetId ? nodeMap.get(agent.targetId) : null;
          return (
            <React.Fragment key={agent.name}>
              {/* Detection radius */}
              <Circle
                cx={agent.x}
                cy={agent.y}
                r={40}
                stroke={agent.color}
                strokeWidth={0.5}
                strokeDasharray="2 4"
                fill="transparent"
                opacity={0.5}
              />
              {/* Laser line to target */}
              {target && !target.cleaned && (
                <Line
                  x1={agent.x}
                  y1={agent.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={agent.color}
                  strokeWidth={1}
                  opacity={0.4}
                />
              )}
              {/* Spike flash */}
              {agent.spiking && (
                <Circle
                  cx={agent.x}
                  cy={agent.y}
                  r={18}
                  fill="white"
                  opacity={0.6}
                />
              )}
              {/* Hexagonal agent body */}
              <Polygon
                points={hexPoints(agent.x, agent.y, 7)}
                fill={agent.color}
                opacity={0.9}
              />
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
