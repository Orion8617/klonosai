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
  wastePressure: number;
  ramRecovered: number;
  phaseLock: boolean;
  gammaBurst: boolean;
  onInjectWaste: () => void;
  onExportPWA: () => void;
}

export function TelemetryFooter({
  wasteScore,
  wastePressure,
  ramRecovered,
  phaseLock,
  gammaBurst,
  onInjectWaste,
  onExportPWA,
}: TelemetryFooterProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const glitchAnim = useRef(new Animated.Value(1)).current;
  const gammaAnim = useRef(new Animated.Value(0)).current;

  const useNative = Platform.OS !== "web";

  // Pulsador del Phase-Lock / Gamma label
  useEffect(() => {
    const speed = gammaBurst ? 60 : phaseLock ? 150 : 600;
    const glitch = Animated.loop(
      Animated.sequence([
        Animated.timing(glitchAnim, { toValue: 1, duration: speed * 2, useNativeDriver: useNative }),
        Animated.timing(glitchAnim, { toValue: 0.25, duration: speed, useNativeDriver: useNative }),
        Animated.timing(glitchAnim, { toValue: 1, duration: speed, useNativeDriver: useNative }),
      ])
    );
    glitch.start();
    return () => glitch.stop();
  }, [phaseLock, gammaBurst]);

  // Gamma burst glow en el borde superior del footer
  useEffect(() => {
    if (gammaBurst) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(gammaAnim, { toValue: 1, duration: 200, useNativeDriver: useNative }),
          Animated.timing(gammaAnim, { toValue: 0.2, duration: 200, useNativeDriver: useNative }),
        ])
      );
      glow.start();
      return () => glow.stop();
    } else {
      gammaAnim.setValue(0);
    }
  }, [gammaBurst]);

  const scoreColor = gammaBurst
    ? colors.gold
    : wasteScore > 50
    ? colors.waste
    : colors.primary;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const freqLabel = gammaBurst ? "GAMMA BURST: 40Hz" : "PHASE-LOCK: 7.83Hz";
  const freqColor = gammaBurst ? colors.gold : colors.primary;

  return (
    <View style={[styles.container, {
      backgroundColor: colors.muted,
      borderTopColor: gammaBurst ? colors.gold : colors.border,
      paddingBottom: bottomPad,
    }]}>
      {/* Gamma burst top glow bar */}
      {gammaBurst && (
        <Animated.View style={[styles.gammaBar, { backgroundColor: colors.gold, opacity: gammaAnim }]} />
      )}

      <View style={styles.topRow}>
        <Text style={[styles.swarmLabel, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
          SNN HOUSEKEEPER SWARM
        </Text>
        <Animated.Text style={[styles.phaseLock, { color: freqColor, opacity: glitchAnim, fontFamily: "SpaceMono_400Regular" }]}>
          {freqLabel}
        </Animated.Text>
      </View>

      <View style={styles.grid}>
        {/* Waste Score + Pascal Pressure */}
        <View style={[styles.metric, { backgroundColor: colors.card, borderColor: gammaBurst ? colors.gold : colors.border }]}>
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
            <View style={[styles.progressFill, { width: `${wasteScore}%`, backgroundColor: scoreColor }]} />
          </View>
          {/* Pascal deviation pressure */}
          <Text style={[styles.pressureLabel, { color: `${scoreColor}90`, fontFamily: "SpaceMono_400Regular" }]}>
            Δ PASCAL: {wastePressure}
            {wastePressure > 50 ? " ⚡STBP" : ""}
          </Text>
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
          <Text style={[styles.quantLabel, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
            STBP: {wastePressure > 50 ? "AGRESIVO" : "NOMINAL"}
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
  gammaBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
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
    minHeight: 96,
  },
  metricLabel: {
    fontSize: 8,
    letterSpacing: 1,
    marginBottom: 2,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 30,
  },
  heapValue: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  scoreMax: {
    fontSize: 11,
    marginBottom: 2,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  pressureLabel: {
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: 3,
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
