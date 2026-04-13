// web.ts — Browser/PWA fallback for KlonosCallosum Capacitor Plugin
// Used when running ClonEngine in a desktop browser (no native layer).
// CPU-only JS approximations — same logic as linearFallback() in @klonos/callosum.

import { WebPlugin } from "@capacitor/core";
import type { KlonosCallosumPlugin, CpuInfo, GpuInfo, CallosumBenchmark, IECResultado } from "./definitions";

const MAYA_BASE  = 20;
const LEFT_GAIN  = 0.85;
const RIGHT_GAIN = 1.15;
const NEURONS    = 302;

export class KlonosCallosumWeb extends WebPlugin implements KlonosCallosumPlugin {
  private _state:  bigint = 0n;
  private _stable: bigint = 0n;

  async inyectarAccion(options: { pulse: number }): Promise<void> {
    this._state = BigInt(Math.floor(options.pulse)) ^ this._state;
  }

  async extraerEstabilidad(): Promise<{ value: number }> {
    return { value: Number(this._stable & 0xffffffffffn) };
  }

  async obtenerEstado(): Promise<{ value: number }> {
    return { value: Number(this._state & 0xffffffffffn) };
  }

  async intercambiarPulso(options: { newPulse: number }): Promise<{ value: number }> {
    const old = Number(this._state & 0xffffffffffn);
    this._state = BigInt(Math.floor(options.newPulse));
    return { value: old };
  }

  async barrida(): Promise<void> {
    this._state  = 0n;
    this._stable = 0n;
  }

  async capturarFrecuencia(): Promise<{ value: number }> {
    return { value: Number(this._state & BigInt(MAYA_BASE - 1)) };
  }

  async leerPulso(): Promise<{ value: number }> {
    return { value: Number(this._state & 0xffffffffffn) };
  }

  async getCpuInfo(): Promise<CpuInfo> {
    return {
      vendor:             "Web",
      brand:              navigator.userAgent.slice(0, 64),
      lockFree:           typeof SharedArrayBuffer !== "undefined",
      architecture:       0,
      compatibilityScore: typeof SharedArrayBuffer !== "undefined" ? 60 : 30,
    };
  }

  async getGpuInfo(): Promise<GpuInfo> {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) as string : "Unknown";
    return { name, available: !!gl, compatibleModels: !!gl ? 1 : 0 };
  }

  async getBenchmark(): Promise<CallosumBenchmark> {
    return { stores: 0, loads: 0, exchanges: 0, casSuccess: 0, casFail: 0 };
  }

  async initVulkan(): Promise<{ ok: boolean }> {
    // WebGPU approximation if available
    const ok = "gpu" in navigator;
    return { ok };
  }

  async vulkanFusion(options: { leftPulse: number; rightPulse: number }): Promise<{ routingNode: number }> {
    const { leftPulse, rightPulse } = options;
    let best = 0, bestVal = -Infinity;
    for (let i = 0; i < NEURONS; i++) {
      const lD  = ((leftPulse  >> (i % 20)) & 0x1f) / 31;
      const rD  = ((rightPulse >> (i % 20)) & 0x1f) / 31;
      const pos = (i % MAYA_BASE) / MAYA_BASE;
      const w   = 1.0 + pos * 0.1;
      const raw = (lD * LEFT_GAIN + rD * RIGHT_GAIN + 0.0039) * w;
      const act = raw / (1 + Math.abs(raw) * MAYA_BASE);
      if (act > bestVal) { bestVal = act; best = i; }
    }
    return { routingNode: best };
  }

  async destroyVulkan(): Promise<void> { /* no-op */ }

  async cerebeloDetectarHilos(): Promise<{ value: number }> {
    return { value: Math.max(1, (navigator.hardwareConcurrency ?? 2) >> 1) };
  }

  async cerebeloInicializar(_o: { hilos: number; duracion: number; ahorro: boolean }): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async cerebeloEjecutar(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async cerebeloDetener(): Promise<void> { /* no-op */ }

  async cerebeloLiberar(): Promise<void> { /* no-op */ }

  async cerebeloGetResultados(): Promise<IECResultado> {
    // JS microbenchmark — Heron's formula on 99 triangles
    const t0 = performance.now();
    let ops = 0;
    const end = t0 + 500; // 500ms
    while (performance.now() < end) {
      for (let i = 0; i < 99; i++) {
        const a = 3 + i * 0.1, b = 4 + i * 0.07, c = 5 + i * 0.05;
        const s = (a + b + c) / 2;
        Math.sqrt(s * (s - a) * (s - b) * (s - c));
      }
      ops += 99;
    }
    const elapsed = (performance.now() - t0) / 1000;
    const opsSeg  = ops / elapsed;
    const iec     = Math.min(100, (opsSeg / 80_000_000) * 100);
    return {
      opsTotales:    ops,
      opsPorSegundo: opsSeg,
      latenciaNs:    (1 / opsSeg) * 1e9,
      iecGlobal:     iec,
      iecIsosceles:  iec * 1.15,
      iecEquilatero: iec * 0.85,
    };
  }
}
