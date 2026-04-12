import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface DOMNodeData {
  id: string;
  isWaste: boolean;
  depth: number;
  cleaned: boolean;
  cleanedBy?: string;
  ramWeight: number;
}

interface DOMNodeCardProps {
  node: DOMNodeData;
  onLayout?: (id: string, x: number, y: number, width: number, height: number) => void;
}

export function DOMNodeCard({ node, onLayout }: DOMNodeCardProps) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const cleanAnim = useRef(new Animated.Value(0)).current;

  const prevCleaned = useRef(false);

  const useNative = Platform.OS !== "web";

  useEffect(() => {
    if (node.cleaned && !prevCleaned.current) {
      prevCleaned.current = true;
      Animated.parallel([
        Animated.timing(cleanAnim, { toValue: 1, duration: 400, useNativeDriver: useNative }),
        Animated.timing(fadeAnim, { toValue: 0.25, duration: 600, useNativeDriver: useNative }),
        Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: useNative, damping: 8 }),
      ]).start();
    }
  }, [node.cleaned]);

  const borderColor = node.cleaned
    ? colors.primary
    : node.isWaste
    ? colors.waste
    : colors.border;

  const bgColor = node.cleaned
    ? "transparent"
    : node.isWaste
    ? colors.wasteBackground
    : "rgba(22,32,24,0.6)";

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor,
          backgroundColor: bgColor,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      onLayout={(e) => {
        if (onLayout) {
          const { x, y, width, height } = e.nativeEvent.layout;
          onLayout(node.id, x, y, width, height);
        }
      }}
    >
      {node.cleaned ? (
        <Text style={[styles.cleanedLabel, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
          [LIMPIO] Nodo desreferenciado por {node.cleanedBy ?? "SNN"}
        </Text>
      ) : node.isWaste ? (
        <>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors.waste }]} />
            <Text style={[styles.wasteTitle, { color: colors.waste, fontFamily: "SpaceMono_400Regular" }]}>
              ANOMALÍA PASCAL
            </Text>
          </View>
          <Text style={[styles.wasteBody, { color: colors.waste, fontFamily: "SpaceMono_400Regular" }]}>
            Script huérfano detectado. Profundidad: {node.depth}
          </Text>
          <Text style={[styles.ramLabel, { color: `${colors.waste}80`, fontFamily: "SpaceMono_400Regular" }]}>
            {node.ramWeight.toFixed(2)} MB heap
          </Text>
        </>
      ) : (
        <>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
            <Text style={[styles.legitTitle, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
              NODO LEGÍTIMO
            </Text>
          </View>
          <Text style={[styles.legitBody, { color: `${colors.mutedForeground}90`, fontFamily: "SpaceMono_400Regular" }]}>
            Contenido DOM estándar.
          </Text>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    minHeight: 56,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  wasteTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  wasteBody: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  ramLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  legitTitle: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  legitBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  cleanedLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
});
