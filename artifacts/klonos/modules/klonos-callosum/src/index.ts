// index.ts
// TypeScript API — KlonOS Corpus Callosum Native Module
// Usage: import { Callosum } from '@klonos/callosum'

import { NativeModules, Platform } from 'react-native';

const { KlonosCallosum } = NativeModules;

// ─── Type definitions ─────────────────────────────────────────────

export interface CpuInfo {
  vendor: string;
  brand: string;
  lockFree: boolean;
  architecture: 0 | 1 | 2;   // 0=Other, 1=x86-64, 2=ARM64
  compatibilityScore: number; // 0–100
}

export interface GpuInfo {
  name: string;
  available: boolean;
  compatibleModels: number;
}

export interface CallosumBenchmark {
  stores: number;
  loads: number;
  exchanges: number;
  casSuccess: number;
  casFail: number;
}

// ─── Module not available guard ───────────────────────────────────

function assertAvailable() {
  if (!KlonosCallosum) {
    throw new Error(
      'KlonosCallosum native module not found. ' +
      'Ensure the native module is linked via expo prebuild and ' +
      'the app was built with a Development Build (not Expo Go).'
    );
  }
}

// ─── Callosum — Lock-Free Atomic Canal ───────────────────────────

export const Callosum = {
  /**
   * Left Hemisphere injection (reactive, x0.85).
   * Stores pulse into the atomic canal with memory_order_release.
   */
  inyectarAccion(pulse: number): void {
    assertAvailable();
    KlonosCallosum.inyectarAccion(pulse);
  },

  /**
   * Right Hemisphere extraction (analytical, x1.15).
   * Reads canal with memory_order_acquire.
   */
  extraerEstabilidad(): Promise<number> {
    assertAvailable();
    return KlonosCallosum.extraerEstabilidad();
  },

  /**
   * Read current canal state (relaxed — no sync guarantee).
   */
  obtenerEstado(): Promise<number> {
    assertAvailable();
    return KlonosCallosum.obtenerEstado();
  },

  /**
   * Atomic exchange: writes new_pulse, returns old value.
   */
  intercambiarPulso(newPulse: number): Promise<number> {
    assertAvailable();
    return KlonosCallosum.intercambiarPulso(newPulse);
  },

  /**
   * Maya Sweep — clears the atomic canal and resets all benchmark counters.
   * Inspired by the vigesimal zero (shell glyph) on Stela A, Copán.
   */
  barridaMaya(): Promise<void> {
    assertAvailable();
    return KlonosCallosum.barrida();
  },

  /**
   * Capture instantaneous silicon clock delta (RDTSC / cntvct_el0).
   * Maya vigesimal frequency measurement.
   */
  capturarFrecuencia(): Promise<number> {
    assertAvailable();
    return KlonosCallosum.capturarFrecuencia();
  },

  /**
   * Read raw hardware counter (RDTSC on x86, cntvct_el0 on ARM64).
   */
  leerPulsoHardware(): Promise<number> {
    assertAvailable();
    return KlonosCallosum.leerPulso();
  },
};

// ─── Hardware Info ────────────────────────────────────────────────

export const Hardware = {
  getCpuInfo(): Promise<CpuInfo> {
    assertAvailable();
    return KlonosCallosum.getCpuInfo();
  },

  getGpuInfo(): Promise<GpuInfo> {
    assertAvailable();
    return KlonosCallosum.getGpuInfo();
  },

  getBenchmark(): Promise<CallosumBenchmark> {
    assertAvailable();
    return KlonosCallosum.getBenchmark();
  },
};

// ─── Vulkan Fusion ────────────────────────────────────────────────
//
// Two-step integration with the Corpus Callosum:
//
//   1. Left hemisphere calls Callosum.inyectarAccion(leftPulse)
//   2. Right hemisphere calls Callosum.extraerEstabilidad() → rightPulse
//   3. VulkanFusion.dispatch(leftPulse, rightPulse) → routingNodeIndex
//
// The Vulkan compute shader (connectome_fusion.comp / .spv) runs the
// 302-neuron C. elegans connectome in ~0.8ms on an Adreno 619 GPU.

export const VulkanFusion = {
  /**
   * Initialize Vulkan compute pipeline and load the connectome shader.
   * Must be called once before dispatch().
   * Returns false if Vulkan is unavailable — use CPU linear fallback.
   */
  async init(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    assertAvailable();
    return KlonosCallosum.initVulkan();
  },

  /**
   * Dispatch the connectome fusion computation.
   * leftPulse:  output of inyectarAccion / left hemisphere signal
   * rightPulse: output of extraerEstabilidad / right hemisphere signal
   * Returns: optimal ZeroLag routing node index [0..301]
   */
  dispatch(leftPulse: number, rightPulse: number): Promise<number> {
    assertAvailable();
    return KlonosCallosum.vulkanFusion(leftPulse, rightPulse);
  },

  /**
   * Release Vulkan resources. Call on app unmount / background.
   */
  destroy(): Promise<void> {
    assertAvailable();
    return KlonosCallosum.destroyVulkan();
  },

  /**
   * CPU linear fallback — pure JS implementation.
   * Used when Vulkan is unavailable (emulators, very old devices < API 24).
   * ~8ms on Snapdragon 665 vs ~0.8ms Vulkan — acceptable for PRO tier only.
   */
  linearFallback(leftPulse: number, rightPulse: number): number {
    const NEURONS = 302;
    const LEFT_GAIN  = 0.85;
    const RIGHT_GAIN = 1.15;
    const MAYA_BASE  = 20;

    let bestNode = 0;
    let bestVal  = -Infinity;

    for (let i = 0; i < NEURONS; i++) {
      const lDigit = ((leftPulse  >> (i % 20)) & 0x1f) / 31;
      const rDigit = ((rightPulse >> (i % 20)) & 0x1f) / 31;
      const pos    = (i % MAYA_BASE) / MAYA_BASE;
      const weight = 1.0 + pos * 0.1;
      const raw    = (lDigit * LEFT_GAIN + rDigit * RIGHT_GAIN + 0.0039) * weight;
      const act    = raw / (1 + Math.abs(raw) * MAYA_BASE);
      if (act > bestVal) { bestVal = act; bestNode = i; }
    }
    return bestNode;
  },
};
