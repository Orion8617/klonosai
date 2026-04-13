# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Auth System (`artifacts/api-server`)

**better-auth v1.6.2** — unified auth at `/api/auth/*`
- Email + Password via `better-auth`  
- Passkey (WebAuthn) via `@better-auth/passkey`
- Google + GitHub OAuth (enabled via env vars `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`)
- Sessions in PostgreSQL (Drizzle adapter)  
- DB tables: `user`, `session`, `account`, `verification`, `passkey` (pushed via `pnpm --filter @workspace/db push`)
- Frontend client: `lib/api-client-react/src/auth-client.ts` (exports `authClient`, `signIn`, `signOut`, `signUp`, `useSession`)
- Mobile UI: `artifacts/klonos/components/AuthModal.tsx` (email/password + passkey button)

## Capacitor APK Stack (`artifacts/klonos-cap`)

**Capacitor v7** wrapping ClonEngine (React web → native APK)
- `capacitor.config.ts` — `webDir` points to `artifacts/clonengine/dist/`  
- `android/` — Gradle project: `compileSdk 35`, `minSdk 24` (Vulkan), ABI: `arm64-v8a + x86_64`  
- `android/app/src/main/java/app/klonos/cap/MainActivity.kt` — extends `BridgeActivity`, registers `KlonosCallosumPlugin`
- **Package**: `com.klonos.zerolag`  
- **Build guide**: `artifacts/klonos-cap/BUILD_ANDROID.md`

### `@klonos/callosum-cap` — Capacitor Plugin (`artifacts/klonos/modules/klonos-callosum-cap`)

Capacitor port of `@klonos/callosum` (React Native → `@PluginMethod`)
| File | Role |
|------|------|
| `src/definitions.ts` | TypeScript Plugin interface |
| `src/index.ts` | `registerPlugin()` bridge + `Callosum` + `Cerebelo` exports |
| `src/web.ts` | Browser JS fallback (Heron benchmark, WebGPU vulkan stub) |
| `android/.../KlonosCallosumPlugin.kt` | `@CapacitorPlugin` + `@PluginMethod` (ported from RN module) |
| `android/.../callosum_jni_cap.cpp` | JNI bridge (`KlonosCallosumPlugin_nativeXxx` symbols) |
| `android/.../CMakeLists.txt` | Shared CPP from `klonos-callosum`, adds `callosum_jni_cap.cpp` |
| `android/src/main/assets/shaders/connectome_fusion.spv` | Compiled SPIR-V (3,364 bytes) |

**`buildZeroLagProfile()`** in `src/callosum-bridge.ts` — auto-detects device tier (free/pro/drosophila) from IEC score.

## ClonEngine — ZeroLag Landing Page (`artifacts/clonengine`)

AutoCAD-style layer architecture — each file has one responsibility:

| Layer | File | Responsibility |
|-------|------|----------------|
| 0 | `src/tokens.ts` | Global constants (TICKER_ITEMS) |
| 1 | `src/engine/snn.ts` | Izhikevich SNN + SpikeForge pipeline (izhi, pascalImp, lodR, constants) |
| 2 | `src/engine/orbital.ts` | 24 orbital satellite nodes (SATS: Sat[]) |
| 3 | `src/canvas/HeroCanvas.tsx` | Wireframe Earth + SNN orbital animation |
| 4 | `src/canvas/SciCanvas.tsx` | C. elegans hexagonal SNN visualization |
| 5 | `src/ui/atoms.tsx` | Reusable UI atoms: BenchBar, Counter, Rv |
| 6 | `src/data/games.tsx` | Game cards data (GAMES_DATA) |
| 7 | `src/sections/PingMeter.tsx` | Before/After latency HUD |
| 8 | `src/App.tsx` | Layout composer — imports all layers |

**Key engine constants:** BILATERAL_K=0.30, THETA_PERIOD=10, PASCAL_CULL=0.06  
**SNN:** 302 Izhikevich neurons, 700 synapses, Schumann 7.83Hz scheduler  
**Globe:** 24 satellites in 4 ECI orbital rings, SpikeForge batch renderer  
**No external fetches** — static orbital data, no CORS issues
