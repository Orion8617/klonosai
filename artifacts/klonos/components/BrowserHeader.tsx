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

interface BrowserHeaderProps {
  snnActive: boolean;
  onToggleSNN: () => void;
}

export function BrowserHeader({ snnActive, onToggleSNN }: BrowserHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const useNative = Platform.OS !== "web";

  useEffect(() => {
    if (snnActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: useNative }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: useNative }),
        ])
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: useNative }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 800, useNativeDriver: useNative }),
        ])
      );
      pulse.start();
      glow.start();
      return () => {
        pulse.stop();
        glow.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [snnActive]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding, backgroundColor: colors.card }]}>
      <View style={styles.inner}>
        <View style={[styles.badge, { borderColor: colors.primary }]}>
          <Text style={[styles.badgeText, { color: colors.primary, fontFamily: "SpaceMono_400Regular" }]}>K5</Text>
        </View>

        <View style={[styles.urlBar, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Text style={[styles.urlProtocol, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
            https://
          </Text>
          <Text style={[styles.urlText, { color: colors.primary, fontFamily: "SpaceMono_400Regular" }]} numberOfLines={1}>
            klonos-target-site.com
          </Text>
        </View>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPress={onToggleSNN}
            style={[
              styles.snnBtn,
              {
                backgroundColor: snnActive ? colors.primary : colors.waste,
                borderColor: snnActive ? colors.primary : colors.waste,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text style={[styles.snnText, { fontFamily: "SpaceMono_400Regular" }]}>
              {snnActive ? "SNN: ON" : "SNN: OFF"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,200,150,0.1)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  urlBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  urlProtocol: {
    fontSize: 11,
    opacity: 0.6,
  },
  urlText: {
    fontSize: 12,
    flex: 1,
  },
  snnBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  snnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#000000",
  },
});
