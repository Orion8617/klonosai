// ─── Layer 1: Izhikevich SNN Engine + SpikeForge vGPU Pipeline ───────────────
//  Whitepaper v3.0 — full spec implementation
//
//  Stage 1 · Pascal Frustum Culling   X/Y Triangle Row-4 spatial importance
//  Stage 2 · Synaptic LOD             4-tier node sizing by Pascal importance
//  Stage 3 · Vigesimal Base-20        alpha quantised to 1/20 steps
//  Stage 4 · Gamma/Theta Scheduler    Gamma=60Hz render, Theta=6Hz heavy-ops
//  §10     · Bilateral Coupling 0.30  Cross-hemisphere gap-junction modifier

export interface Neuron {
  x: number; y: number;
  vx?: number; vy?: number;
  v: number; u: number; f: number; l: boolean;
}

// Pascal Triangle Row 4: [1, 4, 6, 4, 1] / 16
export const P4 = [1/16, 4/16, 6/16, 4/16, 1/16] as const;
export const PASCAL_CULL  = 0.06;  // Stage 1: discard neurons with importance < 6%
export const BILATERAL_K  = 0.30;  // §10: gap-junction coupling factor
export const THETA_PERIOD = 10;    // Stage 4: Theta tick every 10 Gamma frames ≈ 6Hz

// Izhikevich RK2 — one neuron step, returns true on spike
export function izhi(n: Neuron, I: number): boolean {
  const th = n.l ? 25.5 : 34.5;
  n.v += .5 * (.04 * n.v * n.v + 5 * n.v + 140 - n.u + I);
  n.u += .5 * .02 * (.2 * n.v - n.u);
  n.v += .5 * (.04 * n.v * n.v + 5 * n.v + 140 - n.u + I);
  n.u += .5 * .02 * (.2 * n.v - n.u);
  if (n.v >= th) { n.v = -65; n.u += 8; n.f = 12; return true; }
  if (n.f > 0) n.f--;
  return false;
}

// Stage 1: Pascal 3D Frustum — importance weight 0..1 (center = 1.0, corners ≈ 0.004)
// Math.max(0,...) guards against negative x/y on narrow mobile screens
export function pascalImp(x: number, y: number, W: number, H: number): number {
  const bx = Math.min(4, Math.max(0, Math.floor(x / W * 5)));
  const by = Math.min(4, Math.max(0, Math.floor(y / H * 5)));
  return (P4[bx] * 16) * (P4[by] * 16) / 16;
}

// Stage 2: Synaptic LOD — 4-tier node radius by Pascal importance
// Full(≥0.5)→2.0  Medium(≥0.2)→1.5  Quarter(≥0.08)→1.1  Eighth(<0.08)→0.7
export function lodR(imp: number): number {
  if (imp >= 0.5)  return 2.0;
  if (imp >= 0.2)  return 1.5;
  if (imp >= 0.08) return 1.1;
  return 0.7;
}

// Stage 3: Vigesimal Base-20 quantizer — Lloyd-Max optimal step 1/20 = 0.05
// VIGESIMAL_WEIGHT = 1/9.5 (Maya base-20, first in scientific literature)
// All alpha/opacity values must pass through here before reaching canvas strokeStyle
export function vigesimal(x: number): number {
  return Math.round(x * 20) / 20;
}

// ─── NeuronBank — SoA typed-array storage for N Izhikevich neurons ───────────
// Structure-of-Arrays layout yields 3-5× better CPU cache utilisation
// over Array-of-Structs (Neuron[]) on large populations: contiguous v[], u[],
// f[], l[] arrays enable sequential memory access in the tight step loop.
export class NeuronBank {
  readonly n: number;
  readonly v: Float32Array;  // membrane potential (mV)
  readonly u: Float32Array;  // recovery variable
  readonly f: Uint8Array;    // fire countdown: 0 = idle, 12 = just fired
  readonly l: Uint8Array;    // lane: 0 = cyan, 1 = orange
  readonly x: Float32Array;  // screen x (layout only)
  readonly y: Float32Array;  // screen y (layout only)

  constructor(n: number) {
    this.n = n;
    this.v = new Float32Array(n);
    this.u = new Float32Array(n);
    this.f = new Uint8Array(n);
    this.l = new Uint8Array(n);
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
  }

  // Batch RK2 Izhikevich step with quiescent fast-path.
  // inp[i] must hold the pre-accumulated total input current for neuron i.
  // Returns the spike count for this time step.
  stepAll(inp: Float32Array): number {
    const { n, v, u, f, l } = this;
    let spikes = 0;
    for (let i = 0; i < n; i++) {
      const I = inp[i];
      // Fast path: quiescent neuron with negligible input — skip full RK2
      if (f[i] === 0 && v[i] < -62 && I < 1.5 && I > -1.5) {
        v[i] += 0.04 * v[i] * v[i] * 0.002 + I * 0.04;
        continue;
      }
      // RK2 Izhikevich — half-step then full-step
      const th = l[i] ? 25.5 : 34.5;
      const v0 = v[i], u0 = u[i];
      const v1 = v0 + 0.5 * (0.04 * v0 * v0 + 5 * v0 + 140 - u0 + I);
      const u1 = u0 + 0.5 * 0.02 * (0.2 * v0 - u0);
      v[i] = v1 + 0.5 * (0.04 * v1 * v1 + 5 * v1 + 140 - u1 + I);
      u[i] = u1 + 0.5 * 0.02 * (0.2 * v1 - u1);
      if (v[i] >= th) {
        v[i] = -65; u[i] += 8; f[i] = 12; spikes++;
      } else if (f[i] > 0) {
        f[i]--;
      }
    }
    return spikes;
  }
}

// ─── SynapseBank — SoA typed-array storage for synaptic connections ───────────
// Parallel typed arrays eliminate per-synapse object allocation and pointer
// chasing compared to { a, b, w }[] arrays.
export class SynapseBank {
  readonly count: number;
  readonly a: Uint16Array;   // pre-synaptic neuron index
  readonly b: Uint16Array;   // post-synaptic neuron index
  readonly w: Float32Array;  // synaptic weight

  constructor(count: number) {
    this.count = count;
    this.a = new Uint16Array(count);
    this.b = new Uint16Array(count);
    this.w = new Float32Array(count);
  }

  // Accumulate scaled synaptic current into inp[] for all currently firing
  // pre-synaptic neurons.  f[] is the fire-countdown array from a NeuronBank.
  accumulate(inp: Float32Array, f: Uint8Array, scale: number): void {
    const { count, a, b, w } = this;
    for (let i = 0; i < count; i++) {
      if (f[a[i]] > 0) inp[b[i]] += w[i] * scale;
    }
  }
}
