// ─── Layer 2: Orbital Node Data (SATS) ───────────────────────────────────────
// 24 SNN satellite nodes — 4 rings (equatorial → polar), 6 nodes each.
// Each ring drives 6 Izhikevich neurons (ni = neuron index 0..23).
//
// Orbital parameters (ECI geometry):
//   inc   — inclination (rad)
//   raan  — right ascension of ascending node (rad)
//   speed — visual angular velocity (rad/frame)
//   rMult — orbit radius as multiple of globe radius
//   l     — color lane: true=orange (#ff7a1a), false=cyan (#00d4ff)
//   angle — current argument of latitude (rad, mutable)
//   ni    — SNN neuron index (0..23)

export interface Sat {
  inc: number; raan: number; speed: number; rMult: number;
  l: boolean; angle: number; ni: number;
}

export const SATS: Sat[] = [
  // Ring 0 — low equatorial (inc ~10°), orange
  { inc:0.17, raan:0.00, speed:0.0090, rMult:1.68, l:true,  angle:0.00, ni:0  },
  { inc:0.17, raan:0.00, speed:0.0090, rMult:1.68, l:true,  angle:1.05, ni:1  },
  { inc:0.17, raan:0.00, speed:0.0090, rMult:1.68, l:true,  angle:2.09, ni:2  },
  { inc:0.17, raan:0.00, speed:0.0090, rMult:1.68, l:true,  angle:3.14, ni:3  },
  { inc:0.17, raan:0.00, speed:0.0090, rMult:1.68, l:true,  angle:4.19, ni:4  },
  { inc:0.17, raan:0.00, speed:0.0090, rMult:1.68, l:true,  angle:5.24, ni:5  },
  // Ring 1 — mid inclination (inc ~36°), cyan
  { inc:0.62, raan:1.57, speed:0.0070, rMult:1.98, l:false, angle:0.00, ni:6  },
  { inc:0.62, raan:1.57, speed:0.0070, rMult:1.98, l:false, angle:1.05, ni:7  },
  { inc:0.62, raan:1.57, speed:0.0070, rMult:1.98, l:false, angle:2.09, ni:8  },
  { inc:0.62, raan:1.57, speed:0.0070, rMult:1.98, l:false, angle:3.14, ni:9  },
  { inc:0.62, raan:1.57, speed:0.0070, rMult:1.98, l:false, angle:4.19, ni:10 },
  { inc:0.62, raan:1.57, speed:0.0070, rMult:1.98, l:false, angle:5.24, ni:11 },
  // Ring 2 — high inclination (inc ~62°), orange
  { inc:1.08, raan:3.14, speed:0.0055, rMult:2.28, l:true,  angle:0.00, ni:12 },
  { inc:1.08, raan:3.14, speed:0.0055, rMult:2.28, l:true,  angle:1.05, ni:13 },
  { inc:1.08, raan:3.14, speed:0.0055, rMult:2.28, l:true,  angle:2.09, ni:14 },
  { inc:1.08, raan:3.14, speed:0.0055, rMult:2.28, l:true,  angle:3.14, ni:15 },
  { inc:1.08, raan:3.14, speed:0.0055, rMult:2.28, l:true,  angle:4.19, ni:16 },
  { inc:1.08, raan:3.14, speed:0.0055, rMult:2.28, l:true,  angle:5.24, ni:17 },
  // Ring 3 — near-polar (inc ~79°), cyan
  { inc:1.38, raan:4.71, speed:0.0042, rMult:2.58, l:false, angle:0.00, ni:18 },
  { inc:1.38, raan:4.71, speed:0.0042, rMult:2.58, l:false, angle:1.05, ni:19 },
  { inc:1.38, raan:4.71, speed:0.0042, rMult:2.58, l:false, angle:2.09, ni:20 },
  { inc:1.38, raan:4.71, speed:0.0042, rMult:2.58, l:false, angle:3.14, ni:21 },
  { inc:1.38, raan:4.71, speed:0.0042, rMult:2.58, l:false, angle:4.19, ni:22 },
  { inc:1.38, raan:4.71, speed:0.0042, rMult:2.58, l:false, angle:5.24, ni:23 },
];
