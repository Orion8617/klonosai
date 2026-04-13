# ZeroLag Capacitor APK — Build Guide

## Requisitos
- Android Studio Ladybug (2024.2+)
- Android NDK 27+
- Android SDK API 35
- Node.js 20+, pnpm 10+
- `glslangValidator` (ya compilado en Replit — `connectome_fusion.spv` incluido)

## Pasos

### 1. Instalar dependencias
```bash
pnpm install
```

### 2. Build del web (ClonEngine)
```bash
pnpm --filter @workspace/clonengine run build
# Output: artifacts/clonengine/dist/
```

### 3. Sync Capacitor → Android project
```bash
cd artifacts/klonos-cap
npx cap sync android
# Copia dist/ → android/app/src/main/assets/public/
```

### 4. Abrir en Android Studio
```bash
npx cap open android
```

### 5. Build APK (release)
```bash
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Live Reload (desarrollo)
```bash
# Terminal 1 — ClonEngine dev server
pnpm --filter @workspace/clonengine run dev

# Terminal 2 — Capacitor live reload
CAPACITOR_LIVE_URL=http://$(hostname -I | awk '{print $1}'):PORT npx cap run android --livereload
```

## Arquitecturas soportadas
| ABI | Dispositivo | GPU |
|---|---|---|
| arm64-v8a | Todos los Android modernos | Adreno 610–750 |
| x86_64 | Emulador Android Studio | Mesa/Software |

## Notas de firma (Play Store)
1. Generar keystore: `keytool -genkey -v -keystore zerolag-release.jks -alias zerolag -keyalg RSA -keysize 2048 -validity 10000`
2. Reemplazar `signingConfig signingConfigs.debug` en `app/build.gradle`
3. `./gradlew bundleRelease` para AAB (Play Store prefiere AAB sobre APK)
