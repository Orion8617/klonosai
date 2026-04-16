import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { SearchIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface BrowserHeaderProps {
  snnActive: boolean;
  gammaBurst: boolean;
  onToggleSNN: () => void;
}

export function BrowserHeader({ snnActive, gammaBurst, onToggleSNN }: BrowserHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const gammaFlash = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState("");

  const useNative = Platform.OS !== "web";

  useEffect(() => {
    if (snnActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: useNative }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: useNative }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [snnActive]);

  // Gamma burst flicker — más agresivo
  useEffect(() => {
    if (gammaBurst) {
      const flicker = Animated.loop(
        Animated.sequence([
          Animated.timing(gammaFlash, { toValue: 1, duration: 60, useNativeDriver: useNative }),
          Animated.timing(gammaFlash, { toValue: 0, duration: 60, useNativeDriver: useNative }),
          Animated.timing(gammaFlash, { toValue: 0.7, duration: 40, useNativeDriver: useNative }),
          Animated.timing(gammaFlash, { toValue: 0, duration: 100, useNativeDriver: useNative }),
        ])
      );
      flicker.start();
      return () => flicker.stop();
    } else {
      gammaFlash.setValue(0);
    }
  }, [gammaBurst]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const btnColor = gammaBurst
    ? colors.gold
    : snnActive
    ? colors.primary
    : colors.waste;

  const btnLabel = gammaBurst
    ? "GAMMA: 40Hz"
    : snnActive
    ? "SNN: ON"
    : "SNN: OFF";

  return (
    <View style={[styles.container, { paddingTop: topPadding, backgroundColor: colors.card, borderBottomColor: gammaBurst ? colors.gold : colors.border }]}>
      {/* Gamma burst barra superior */}
      {gammaBurst && (
        <Animated.View
          style={[styles.gammaBanner, { backgroundColor: colors.gold, opacity: gammaFlash }]}
        />
      )}

      <View style={styles.inner}>
        <View style={[styles.badge, { borderColor: gammaBurst ? colors.gold : colors.primary }]}>
          <Text style={[styles.badgeText, { color: gammaBurst ? colors.gold : colors.primary, fontFamily: "SpaceMono_400Regular" }]}>K5</Text>
        </View>

        <View style={[styles.urlBar, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Text style={[styles.urlProtocol, { color: colors.mutedForeground, fontFamily: "SpaceMono_400Regular" }]}>
            https://
          </Text>
          <Text style={[styles.urlText, { color: gammaBurst ? colors.gold : colors.primary, fontFamily: "SpaceMono_400Regular" }]} numberOfLines={1}>
            klonos-target-site.com
          </Text>
        </View>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            onPress={onToggleSNN}
            style={[styles.snnBtn, { backgroundColor: btnColor, borderColor: btnColor }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.snnText, { fontFamily: "SpaceMono_400Regular" }]}>
              {btnLabel}
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
  gammaBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
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
