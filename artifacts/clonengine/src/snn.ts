export interface Neuron {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  v: number;
  u: number;
  f: number;
  l: boolean;
}

export interface Synapse {
  a: number;
  b: number;
  w: number;
}

export function izhi(n: Neuron, I: number): boolean {
  const th = n.l ? 25.5 : 34.5;
  n.v += 0.5 * (0.04 * n.v * n.v + 5 * n.v + 140 - n.u + I);
  n.u += 0.5 * 0.02 * (0.2 * n.v - n.u);
  n.v += 0.5 * (0.04 * n.v * n.v + 5 * n.v + 140 - n.u + I);
  n.u += 0.5 * 0.02 * (0.2 * n.v - n.u);
  if (n.v >= th) {
    n.v = -65;
    n.u += 8;
    n.f = 12;
    return true;
  }
  if (n.f > 0) n.f--;
  return false;
}
