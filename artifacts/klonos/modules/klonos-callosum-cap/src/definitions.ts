// definitions.ts — Capacitor Plugin interface for KlonOS Corpus Callosum
// Mirrors the React Native API in @klonos/callosum but uses Capacitor types.

export interface CpuInfo {
  vendor:             string;
  brand:              string;
  lockFree:           boolean;
  architecture:       number; // 0=Other | 1=x86-64 | 2=ARM64
  compatibilityScore: number; // 0–100
}

export interface GpuInfo {
  name:             string;
  available:        boolean;
  compatibleModels: number;
}

export interface CallosumBenchmark {
  stores:     number;
  loads:      number;
  exchanges:  number;
  casSuccess: number;
  casFail:    number;
}

export interface IECResultado {
  opsTotales:    number;
  opsPorSegundo: number;
  latenciaNs:    number;
  iecGlobal:     number; // 0–100
  iecIsosceles:  number; // iecGlobal × 1.15
  iecEquilatero: number; // iecGlobal × 0.85
}

// ─── Plugin interface ─────────────────────────────────────────────────────────

export interface KlonosCallosumPlugin {
  // ── Corpus Callosum — Lock-Free Atomic Canal ─────────────────────
  inyectarAccion(options: { pulse: number }): Promise<void>;
  extraerEstabilidad(): Promise<{ value: number }>;
  obtenerEstado(): Promise<{ value: number }>;
  intercambiarPulso(options: { newPulse: number }): Promise<{ value: number }>;
  barrida(): Promise<void>;
  capturarFrecuencia(): Promise<{ value: number }>;
  leerPulso(): Promise<{ value: number }>;

  // ── Hardware info ────────────────────────────────────────────────
  getCpuInfo(): Promise<CpuInfo>;
  getGpuInfo(): Promise<GpuInfo>;
  getBenchmark(): Promise<CallosumBenchmark>;

  // ── Vulkan Fusion ────────────────────────────────────────────────
  initVulkan(): Promise<{ ok: boolean }>;
  vulkanFusion(options: { leftPulse: number; rightPulse: number }): Promise<{ routingNode: number }>;
  destroyVulkan(): Promise<void>;

  // ── Cerebelo — Motor Geométrico ──────────────────────────────────
  cerebeloDetectarHilos(): Promise<{ value: number }>;
  cerebeloInicializar(options: { hilos: number; duracion: number; ahorro: boolean }): Promise<{ ok: boolean }>;
  cerebeloEjecutar(): Promise<{ ok: boolean }>;
  cerebeloDetener(): Promise<void>;
  cerebeloLiberar(): Promise<void>;
  cerebeloGetResultados(): Promise<IECResultado>;
}
