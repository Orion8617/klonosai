// AuthModal.tsx — ZeroLag unified login / registro
// Soporta: Email + Contraseña | Passkey (WebAuthn)

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

// ─── API base (same host, /api/auth) ─────────────────────────────────────────
function getApiBase(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}/api/auth`;
  }
  return "http://localhost:3001/api/auth";
}

// ─── Minimal fetch helpers (no bundler dependency on better-auth client) ──────
async function apiPost(path: string, body: object) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? data?.error ?? "Error del servidor");
  return data;
}

async function apiGet(path: string) {
  const res = await fetch(`${getApiBase()}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Error del servidor");
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = "login" | "register";

export interface AuthUser {
  id:    string;
  name:  string;
  email: string;
  plan:  string;
}

interface AuthModalProps {
  visible:   boolean;
  onClose:   () => void;
  onSuccess: (user: AuthUser) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const useNative = Platform.OS !== "web";

  const [mode,     setMode]     = useState<Mode>("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const handleShow = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: useNative }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: useNative }),
    ]).start();
  }, []);

  const reset = () => {
    setName(""); setEmail(""); setPassword(""); setError(null); setLoading(false);
  };

  const handleClose = () => {
    reset();
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    onClose();
  };

  // ── Email / Password ─────────────────────────────────────────────────────
  const handleEmailAuth = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Email y contraseña son requeridos.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        if (!name.trim()) { setError("Nombre requerido."); setLoading(false); return; }
        await apiPost("/sign-up/email", { name: name.trim(), email: email.trim(), password });
      }
      const data = await apiPost("/sign-in/email", { email: email.trim(), password });
      const me = await apiGet("/get-session");
      onSuccess({
        id:    me?.session?.userId ?? data?.user?.id ?? "",
        name:  me?.user?.name ?? name,
        email: me?.user?.email ?? email,
        plan:  me?.user?.plan ?? "free",
      });
      handleClose();
    } catch (e: any) {
      setError(e.message ?? "Error al autenticar.");
    } finally {
      setLoading(false);
    }
  };

  const styles = makeStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={handleShow}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.kavWrapper}
        >
          <Animated.View
            style={[
              styles.sheet,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              { paddingBottom: insets.bottom + 24 },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.logo}>⚡ ZeroLag</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={12}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>
                {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
              </Text>
              <Text style={styles.subtitle}>
                {mode === "login"
                  ? "Accede a tu red neuromorfica ZeroLag"
                  : "Únete al ecosistema ZeroLag"}
              </Text>

              {/* Tab switch */}
              <View style={styles.tabs}>
                {(["login", "register"] as Mode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.tab, mode === m && styles.tabActive]}
                    onPress={() => { setMode(m); setError(null); }}
                  >
                    <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                      {m === "login" ? "Entrar" : "Registrarse"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form */}
              {mode === "register" && (
                <View style={styles.field}>
                  <Text style={styles.label}>Nombre</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Juan Zerolag"
                    placeholderTextColor={colors.mutedForeground}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    selectionColor={colors.primary}
                  />
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  selectionColor={colors.primary}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleEmailAuth}
                  selectionColor={colors.primary}
                />
              </View>

              {/* Error */}
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* CTA */}
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleEmailAuth}
                disabled={loading}
                activeOpacity={0.82}
              >
                {loading
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : (
                    <Text style={styles.btnText}>
                      {mode === "login" ? "Entrar →" : "Crear Cuenta →"}
                    </Text>
                  )
                }
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o continúa con</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialGrid}>
                <TouchableOpacity
                  style={styles.socialBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    const base = getApiBase();
                    if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
                      window.location.href = `${base}/sign-in/social?provider=google`;
                    } else {
                      setError("Google login no soportado en este entorno nativo de prueba.");
                    }
                  }}
                >
                  <Text style={styles.socialIcon}>G</Text>
                  <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    const base = getApiBase();
                    if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
                      window.location.href = `${base}/sign-in/social?provider=microsoft`;
                    } else {
                      setError("Microsoft login no soportado en este entorno nativo de prueba.");
                    }
                  }}
                >
                  <Text style={styles.socialIcon}>M</Text>
                  <Text style={styles.socialText}>Microsoft</Text>
                </TouchableOpacity>
              </View>


              <View style={[styles.socialGrid, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.socialBtn, { flex: 1, marginRight: 0 }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    const base = getApiBase();
                    if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
                      window.location.href = `${base}/sign-in/social?provider=github`;
                    } else {
                      setError("GitHub login no soportado en este entorno nativo de prueba.");
                    }
                  }}
                >
                  <Text style={styles.socialIcon}>🐙</Text>
                  <Text style={styles.socialText}>GitHub</Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o usar biométricos</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Passkey CTA */}
              <TouchableOpacity
                style={styles.passkeyBtn}
                activeOpacity={0.8}
                onPress={() => setError("Passkey disponible en la app nativa o interfaz web completa.")}
              >
                <Text style={styles.passkeyIcon}>🔑</Text>
                <Text style={styles.passkeyText}>
                  {mode === "login" ? "Entrar con Passkey" : "Registrar Passkey"}
                </Text>
              </TouchableOpacity>

              {/* Footer */}
              <Text style={styles.footerNote}>
                Al continuar aceptas los{" "}
                <Text style={styles.footerLink}>Términos de Servicio</Text>
                {" y la "}
                <Text style={styles.footerLink}>Política de Privacidad</Text>
                {" de ZeroLag."}
              </Text>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(c: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.72)",
      justifyContent: "flex-end",
    },
    kavWrapper: { width: "100%" },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius:  24,
      borderTopRightRadius: 24,
      paddingHorizontal:    24,
      paddingTop:           24,
      maxHeight:            "90%",
    },
    header: {
      flexDirection:  "row",
      justifyContent: "space-between",
      alignItems:     "center",
      marginBottom:   16,
    },
    logo: {
      fontFamily: "SpaceMono_400Regular",
      fontSize:   16,
      color:      c.primary,
      letterSpacing: 1.5,
    },
    closeBtn: {
      fontSize: 18,
      color:    c.mutedForeground,
      padding:  4,
    },
    title: {
      fontSize:      26,
      fontWeight:    "700",
      color:         c.cardForeground,
      marginBottom:  4,
    },
    subtitle: {
      fontSize:     13,
      color:        c.mutedForeground,
      marginBottom: 20,
    },
    tabs: {
      flexDirection: "row",
      backgroundColor: c.muted,
      borderRadius:    12,
      padding:          4,
      marginBottom:    20,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      alignItems:      "center",
      borderRadius:    9,
    },
    tabActive: {
      backgroundColor: c.primary,
    },
    tabText: {
      fontSize:   14,
      fontWeight: "600",
      color:      c.mutedForeground,
    },
    tabTextActive: {
      color: c.primaryForeground,
    },
    field: { marginBottom: 14 },
    label: {
      fontSize:     12,
      color:        c.mutedForeground,
      marginBottom:  6,
      fontWeight:   "600",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    input: {
      backgroundColor: c.input,
      borderRadius:     12,
      paddingHorizontal: 14,
      paddingVertical:   13,
      color:             c.foreground,
      fontSize:          15,
      borderWidth:        1,
      borderColor:       c.border,
    },
    errorBox: {
      backgroundColor: "rgba(224,90,58,0.12)",
      borderRadius:    10,
      padding:         12,
      marginBottom:    12,
      borderWidth:      1,
      borderColor:     c.destructive,
    },
    errorText: {
      color:    c.destructive,
      fontSize: 13,
    },
    btn: {
      backgroundColor: c.primary,
      borderRadius:    14,
      paddingVertical: 15,
      alignItems:      "center",
      marginTop:        4,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: {
      color:      c.primaryForeground,
      fontWeight: "700",
      fontSize:    16,
      letterSpacing: 0.4,
    },
    divider: {
      flexDirection:  "row",
      alignItems:     "center",
      marginVertical: 18,
    },
    dividerLine: {
      flex:            1,
      height:          1,
      backgroundColor: c.border,
    },
    dividerText: {
      marginHorizontal: 12,
      color:            c.mutedForeground,
      fontSize:         12,
    },
    socialGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    socialBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingVertical: 12,
      backgroundColor: c.card,
      marginRight: 10,
    },
    socialIcon: {
      fontSize: 16,
      marginRight: 8,
      fontWeight: 'bold',
      color: c.foreground,
    },
    socialText: {
      color: c.foreground,
      fontWeight: "600",
      fontSize: 14,
    },
    passkeyBtn: {
      flexDirection:    "row",
      alignItems:       "center",
      justifyContent:   "center",
      borderWidth:       1,
      borderColor:      c.border,
      borderRadius:     14,
      paddingVertical:  13,
      backgroundColor:  c.secondary,
      marginBottom:     16,
    },
    passkeyIcon: { fontSize: 18, marginRight: 10 },
    passkeyText: {
      color:      c.secondaryForeground,
      fontWeight: "600",
      fontSize:    15,
    },
    footerNote: {
      textAlign:  "center",
      fontSize:    11,
      color:       c.mutedForeground,
      lineHeight:  16,
      marginTop:    4,
    },
    footerLink: {
      color:      c.accent,
      fontWeight: "600",
    },
  });
}
