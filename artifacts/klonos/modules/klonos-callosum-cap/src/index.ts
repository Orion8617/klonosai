// @klonos/callosum-cap — Capacitor Plugin TypeScript Bridge
// Usage: import { Callosum, Cerebelo } from '@klonos/callosum-cap'

import { registerPlugin } from "@capacitor/core";
import type { KlonosCallosumPlugin, IECResultado } from "./definitions";
export type { CpuInfo, GpuInfo, CallosumBenchmark, IECResultado, KlonosCallosumPlugin } from "./definitions";

// Register the native plugin — name must match @CapacitorPlugin(name = "KlonosCallosum") in Kotlin
const KlonosCallosum = registerPlugin<KlonosCallosumPlugin>("KlonosCallosum", {
  // Web fallback — runs in browser / ClonEngine dev mode
  web: () => import("./web").then(m => new m.KlonosCallosumWeb()),
});

// ─── Callosum — Lock-Free Atomic Canal ───────────────────────────────────────

export const Callosum = {
  inyectarAccion(pulse: number): Promise<void> {
    return KlonosCallosum.inyectarAccion({ pulse });
  },

  extraerEstabilidad(): Promise<number> {
    return KlonosCallosum.extraerEstabilidad().then(r => r.value);
  },

  obtenerEstado(): Promise<number> {
    return KlonosCallosum.obtenerEstado().then(r => r.value);
  },

  intercambiarPulso(newPulse: number): Promise<number> {
    return KlonosCallosum.intercambiarPulso({ newPulse }).then(r => r.value);
  },

  barrida(): Promise<void> {
    return KlonosCallosum.barrida();
  },

  capturarFrecuencia(): Promise<number> {
    return KlonosCallosum.capturarFrecuencia().then(r => r.value);
  },

  leerPulso(): Promise<number> {
    return KlonosCallosum.leerPulso().then(r => r.value);
  },

  getCpuInfo() {
    return KlonosCallosum.getCpuInfo();
  },

  getGpuInfo() {
    return KlonosCallosum.getGpuInfo();
  },

  getBenchmark() {
    return KlonosCallosum.getBenchmark();
  },

  initVulkan(): Promise<boolean> {
    return KlonosCallosum.initVulkan().then(r => r.ok);
  },

  vulkanFusion(leftPulse: number, rightPulse: number): Promise<number> {
    return KlonosCallosum.vulkanFusion({ leftPulse, rightPulse }).then(r => r.routingNode);
  },

  destroyVulkan(): Promise<void> {
    return KlonosCallosum.destroyVulkan();
  },
};

// ─── Cerebelo — Motor Geométrico ─────────────────────────────────────────────

export const Cerebelo = {
  detectarHilos(): Promise<number> {
    return KlonosCallosum.cerebeloDetectarHilos().then(r => r.value);
  },

  inicializar(hilos = 0, duracion = 5, ahorro = false): Promise<boolean> {
    return KlonosCallosum.cerebeloInicializar({ hilos, duracion, ahorro }).then(r => r.ok);
  },

  async ejecutar(): Promise<IECResultado> {
    await KlonosCallosum.cerebeloEjecutar();
    return KlonosCallosum.cerebeloGetResultados();
  },

  detener(): Promise<void> {
    return KlonosCallosum.cerebeloDetener();
  },

  getResultados(): Promise<IECResultado> {
    return KlonosCallosum.cerebeloGetResultados();
  },

  liberar(): Promise<void> {
    return KlonosCallosum.cerebeloLiberar();
  },
};
