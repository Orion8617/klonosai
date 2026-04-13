// callosum-bridge.ts — Re-export Callosum + Cerebelo for ClonEngine
// In Capacitor APK builds, ClonEngine calls these to reach the native layer.
// In the browser (PWA), the WebPlugin JS fallback runs automatically.
//
// Usage inside ClonEngine:
//   import { Callosum, Cerebelo } from '@workspace/klonos-cap/src/callosum-bridge'

export { Callosum, Cerebelo } from "@klonos/callosum-cap";
export type { CpuInfo, GpuInfo, IECResultado } from "@klonos/callosum-cap";

// ─── ZeroLag device fingerprint ──────────────────────────────────────────────
// Combines IEC score + CPU info into a ZeroLag routing profile.

import { Callosum, Cerebelo } from "@klonos/callosum-cap";
import type { IECResultado } from "@klonos/callosum-cap";

export interface ZeroLagProfile {
  deviceId:     string;  // sha256(vendor + brand + arch)
  iecScore:     number;  // 0–100
  tier:         "free" | "pro" | "drosophila";
  routingBias:  "cpu" | "gpu"; // prefer CPU atomic OR Vulkan GPU routing
  latencyClass: "A" | "B" | "C"; // A<5ms | B<20ms | C>20ms
}

export async function buildZeroLagProfile(): Promise<ZeroLagProfile> {
  const [cpu, iec] = await Promise.all([
    Callosum.getCpuInfo(),
    Cerebelo.inicializar(0, 2)
      .then(() => Cerebelo.ejecutar())
      .catch((): IECResultado => ({
        opsTotales: 0, opsPorSegundo: 0, latenciaNs: 99_000_000,
        iecGlobal: 0, iecIsosceles: 0, iecEquilatero: 0,
      })),
  ]);

  const raw = `${cpu.vendor}|${cpu.brand}|${cpu.architecture}`;
  const deviceId = btoa(raw).slice(0, 32);

  const score = iec.iecGlobal;
  const tier: ZeroLagProfile["tier"] =
    score >= 80 ? "drosophila" : score >= 50 ? "pro" : "free";

  const latencyNs = iec.latenciaNs;
  const latencyClass: ZeroLagProfile["latencyClass"] =
    latencyNs < 5_000_000 ? "A" : latencyNs < 20_000_000 ? "B" : "C";

  return {
    deviceId,
    iecScore:    score,
    tier,
    routingBias: cpu.lockFree ? "cpu" : "gpu",
    latencyClass,
  };
}
