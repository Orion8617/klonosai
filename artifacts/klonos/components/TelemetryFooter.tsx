import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface TelemetryFooterProps {
  wasteScore: number;
  ramRecovered: number;
  phaseLock: boolean;
  onInjectWaste: () => void;
  onExportPWA: () => void;
}

export function TelemetryFooter({
  wasteScore,
  ramRecovered,
  phaseLock,
  onInjectWaste,
  onExportPWA,
}: TelemetryFooterProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const glitchAnim = useRef(new Animated.Value(1)).current;

  const useNative = Platform.OS !== "web";

  useEffect(() => {
    const glitch = Animated.loop(
      Animated.sequence([
        Animated.timing(glitchAnim, { toValue: 1, duration: phaseLock ? 300 : 800, useNativeDriver: useNative }),
        Animated.timing(glitchAnim, { toValue: 0.35, duration: phaseLock ? 100 : 400, useNativeDriver: useNative }),
        Animated.timing(glitchAnim, { toValue: 1, duration: phaseLock ? 200 : 600, useNativeDriver: useNative }),
      ])
    );
    glitch.start();
    return () => glitch.stop();
  }, [phaseLock]);

  const scoreColor = wasteScore > 50 ? colors.waste : colors.primary;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.muted, borderTopColor: colors.border, paddingBottom: bottomPad }]}>
      <View style={styles.topRow}>
        <Text style={[styles.swarmLabel, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
          SNN HOUSEKEEPER SWARM
        </Text>
        <Animated.Text style={[styles.phaseLock, { color: colors.primary, opacity: glitchAnim, fontFamily: "SpaceMono_400Regular" }]}>
          PHASE-LOCK: 7.83Hz
        </Animated.Text>
      </View>

      <View style={styles.grid}>
        {/* Waste Score */}
        <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
            WASTE SCORE
          </Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, { color: scoreColor, fontFamily: "SpaceMono_400Regular" }]}>
              {wasteScore}
            </Text>
            <Text style={[styles.scoreMax, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
              /100
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: "#000" }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${wasteScore}%`, backgroundColor: scoreColor },
              ]}
            />
          </View>
        </View>

        {/* Heap Recovered */}
        <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
            HEAP RECUPERADO
          </Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.heapValue, { color: colors.accent, fontFamily: "SpaceMono_400Regular" }]}>
              {ramRecovered.toFixed(1)}
            </Text>
            <Text style={[styles.scoreMax, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
              MB
            </Text>
          </View>
          <Text style={[styles.quantLabel, { color: colors.primary, fontFamily: "SpaceMono_400Regular" }]}>
            Vigesimal Quantization
          </Text>
        </View>

        {/* Controls */}
        <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
            DEPLOYMENT
          </Text>
          <TouchableOpacity
            style={[styles.ctaBtn, { borderColor: colors.primary, backgroundColor: "rgba(0,200,150,0.1)" }]}
            onPress={onExportPWA}
            activeOpacity={0.7}
          >
            <Text style={[styles.ctaText, { color: colors.primary, fontFamily: "SpaceMono_400Regular" }]}>
              EXPORT PWA
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctaBtn, { borderColor: colors.waste, backgroundColor: colors.wasteBackground, marginTop: 4 }]}
            onPress={onInjectWaste}
            activeOpacity={0.7}
          >
            <Text style={[styles.ctaText, { color: colors.waste, fontFamily: "SpaceMono_400Regular" }]}>
              INJECT WASTE
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  swarmLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
  },
  phaseLock: {
    fontSize: 9,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    gap: 6,
  },
  metric: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    justifyContent: "space-between",
    minHeight: 90,
  },
  metricLabel: {
    fontSize: 8,
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  },
  heapValue: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  scoreMax: {
    fontSize: 11,
    marginBottom: 3,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  quantLabel: {
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  ctaBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
