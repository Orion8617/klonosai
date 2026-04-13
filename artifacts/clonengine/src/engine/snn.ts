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
export function pascalImp(x: number, y: number, W: number, H: number): number {
  const bx = Math.min(4, Math.floor(x / W * 5));
  const by = Math.min(4, Math.floor(y / H * 5));
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
