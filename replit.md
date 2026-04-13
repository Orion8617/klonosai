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
