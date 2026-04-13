/**
 * TRIDENT v1.0 — GPS-Free Positioning Engine
 * Three fusion layers: LTE Timing Advance, WMM2025 Magnetic Fingerprinting, Haversine dead-reckoning
 * Sources: ITU-R P.525-4, 3GPP TS 36.213/36.214, COST-231, NOAA WMM2025
 * Extensions: GDOP Geometric Dilution of Precision, Vigesimal Base-20 coordinate compression
 */

const C_MS    = 299792458   // m/s
const R_EARTH = 6371        // km

// ── Haversine ──────────────────────────────────────────────────────────────────
export function haversineKm(lat1, lon1, lat2, lon2) {
  const dL = (lat2 - lat1) * Math.PI / 180
  const dO = (lon2 - lon1) * Math.PI / 180
  const a  = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dO/2)**2
  return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── 1. Free-Space Path Loss — ITU-R P.525-4 ───────────────────────────────────
// FSPL(dB) = 20·log₁₀(d) + 20·log₁₀(f) − 147.55  (d in m, f in Hz)
export function fspl(distanceM, frequencyHz) {
  if (distanceM <= 0 || frequencyHz <= 0) return 0
  return 20 * Math.log10(distanceM) + 20 * Math.log10(frequencyHz) - 147.55
}

// ── 2. Indoor WiFi — Log-distance model (IEEE 802.11) ─────────────────────────
// PL(d) = PL(d₀) + 10·n·log₁₀(d/d₀) + Xσ
export function indoorWifiPathLoss(distanceM, n = 3.0, d0 = 1, shadowingDb = 5) {
  if (distanceM <= 0) return 0
  return fspl(d0, 2.4e9) + 10 * n * Math.log10(distanceM / d0) + shadowingDb
}

// ── 3. COST-231 Hata Urban — COST Telecommunications R&D 231 ──────────────────
// LU(dB) = 46.3 + 33.9·log₁₀(f) − 13.82·log₁₀(hb) − a(hm) + (44.9 − 6.55·log₁₀(hb))·log₁₀(d) + C
export function cost231Hata(distKm, freqMHz = 1800, hBaseM = 30, hMobileM = 1.5, largeCity = false) {
  if (distKm <= 0) return 0
  const aMobile = 3.2 * (Math.log10(11.75 * hMobileM)) ** 2 - 4.97
  return (
    46.3 + 33.9 * Math.log10(freqMHz) - 13.82 * Math.log10(hBaseM) - aMobile +
    (44.9 - 6.55 * Math.log10(hBaseM)) * Math.log10(distKm) + (largeCity ? 3 : 0)
  )
}

// ── 4. RSRP — 3GPP TS 36.214 §5.1.1 ─────────────────────────────────────────
// RSRP(dBm) = RSSI − 10·log₁₀(N·12)
export function rsrpFromRssi(rssiDbm, numRb = 100) {
  return rssiDbm - 10 * Math.log10(numRb * 12)
}

// ── 5. RSRQ — 3GPP TS 36.214 §5.1.3 ─────────────────────────────────────────
// RSRQ(dB) = 10·log₁₀(N · RSRP_linear / RSSI_linear)
export function rsrq(rsrpDbm, rssiDbm, numRb = 100) {
  return 10 * Math.log10(
    numRb * Math.pow(10, rsrpDbm / 10) / Math.pow(10, rssiDbm / 10)
  )
}

// ── 6. LTE Timing Advance → Distance — 3GPP TS 36.213 §4.2.3 ─────────────────
// Each TA step = 16·Ts = 16/(30,720,000)s; d = TA × T_TA × c / 2
// Resolution: 78.125 m per TA step; max range: ~100 km (TA 1282)
export function timingAdvanceToDistance(ta) {
  return (ta * (16 / 30720000) * C_MS) / 2   // metres
}

// ── 6b. Altitude correction for drone TA — 3D slant → horizontal distance ─────
// When a drone flies at altitude, TA includes both horizontal and vertical distance:
//   d_slant = √(d_horizontal² + Δz²)
// Invert to recover the true horizontal distance:
//   d_horizontal = √(d_slant² − Δz²)
// If Δz ≥ d_slant (degenerate geometry), returns d_slant unchanged.
// droneAlt, towerAlt in metres (AGL or ASL, consistent basis).
export function correctTaForAltitude(taDistance, droneAlt = 0, towerAlt = 0) {
  const deltaZ = Math.abs(droneAlt - towerAlt)
  if (deltaZ <= 0) return taDistance
  const dHorizSq = taDistance * taDistance - deltaZ * deltaZ
  if (dHorizSq <= 0) return taDistance   // ΔZ ≥ d_slant — use slant as fallback
  return Math.sqrt(dHorizSq)
}

// ── 7. RSSI → Distance — Log-distance inversion ────────────────────────────────
// d = d₀ × 10^((RSSI_ref − RSSI) / (10·n))
export function rssiToDistance(rssiDbm, rssiRefDbm = -40, n = 2.5, d0 = 1) {
  return d0 * Math.pow(10, (rssiRefDbm - rssiDbm) / (10 * n))
}

// ── 8. TRILATERATION — Least-squares from 3+ range rings ─────────────────────
// Requires 3+ anchors for proper trilateration (over-determined system).
// Callers with 1-2 anchors should use single-ring or two-ring fallback.
export function trilateratePosition(anchors, maxIter = 300, tolerance = 0.05) {
  if (!anchors?.length || anchors.length < 3) return null

  let estLat = anchors.reduce((s, a) => s + a.lat, 0) / anchors.length
  let estLon = anchors.reduce((s, a) => s + a.lon, 0) / anchors.length
  let lr = 0.005, velLat = 0, velLon = 0

  for (let iter = 0; iter < maxIter; iter++) {
    let gradLat = 0, gradLon = 0, totalErr = 0
    for (const a of anchors) {
      const d = haversineKm(estLat, estLon, a.lat, a.lon)
      if (d < 0.001) continue
      const err = d - a.distKm
      totalErr += Math.abs(err)
      gradLat  += err * (estLat - a.lat) / d
      gradLon  += err * (estLon - a.lon) / d
    }
    const norm = Math.sqrt(gradLat**2 + gradLon**2)
    if (norm < 1e-14) break
    velLat = 0.85 * velLat - lr * gradLat / norm
    velLon = 0.85 * velLon - lr * gradLon / norm
    estLat += velLat
    estLon += velLon
    if (totalErr / anchors.length < tolerance) break
    lr *= 0.995
  }

  const residuals      = anchors.map(a => Math.abs(haversineKm(estLat, estLon, a.lat, a.lon) - a.distKm))
  const uncertaintyKm  = residuals.reduce((s, v) => s + v, 0) / residuals.length

  return {
    lat:           parseFloat(estLat.toFixed(5)),
    lon:           parseFloat(estLon.toFixed(5)),
    uncertaintyKm: parseFloat(Math.max(0.1, uncertaintyKm).toFixed(2)),
    residualsKm:   residuals.map(r => parseFloat(r.toFixed(2))),
    method:        'LTE-TRILATERATION'
  }
}

// ── 9. WMM MAGNETIC FINGERPRINT MATCH ────────────────────────────────────────
// Match observed {declination, inclination, intensity} against WMM reference grid.
// Passive (no transmitter), cannot be jammed. Accuracy: ±30–150 km with 4° grid.
export function magneticFingerprintMatch(wmmGrid, observed) {
  if (!wmmGrid?.length || !observed) return null
  const has = {
    decl:  observed.declination != null,
    incl:  observed.inclination != null,
    intns: observed.intensity   != null,
  }
  if (!has.decl && !has.incl && !has.intns) return null

  let bestScore = Infinity, bestPoint = null

  for (const ref of wmmGrid) {
    let score = 0, dims = 0
    if (has.decl  && ref.decl      != null) { score += Math.abs(observed.declination - ref.decl) * 8.0; dims++ }
    if (has.incl  && ref.incl      != null) { score += Math.abs(observed.inclination - ref.incl) * 5.0; dims++ }
    if (has.intns && ref.intensity != null) { score += Math.abs(observed.intensity - ref.intensity) / 200.0; dims++ }
    if (dims > 0 && score < bestScore) { bestScore = score; bestPoint = { lat: ref.lat, lon: ref.lon } }
  }

  if (!bestPoint) return null
  return {
    lat:           parseFloat(bestPoint.lat.toFixed(4)),
    lon:           parseFloat(bestPoint.lon.toFixed(4)),
    uncertaintyKm: parseFloat(Math.min(200, Math.max(5, bestScore * 20)).toFixed(1)),
    matchScore:    parseFloat(bestScore.toFixed(3)),
    method:        'WMM-MAGNETIC-FINGERPRINT'
  }
}

// ── PRE-COMPUTED WMM2025 CARIBBEAN GRID ───────────────────────────────────────
// NOAA WMM2025, epoch 2026.0 — 26 reference points, 10–35°N, 60–105°W
export const WMM_CARIBBEAN_GRID = [
  { lat: 15.5, lon: -87.1, decl: -0.82, incl: 46.15, intensity: 41125 },  // Honduras central
  { lat: 14.0, lon: -87.5, decl: -1.10, incl: 44.80, intensity: 40780 },
  { lat: 13.5, lon: -85.0, decl: -1.80, incl: 44.20, intensity: 40500 },
  { lat: 16.0, lon: -90.0, decl: -0.50, incl: 47.00, intensity: 41400 },
  { lat: 15.0, lon: -84.0, decl: -2.20, incl: 45.30, intensity: 40920 },
  { lat: 18.0, lon: -75.0, decl: -5.20, incl: 50.80, intensity: 42800 },  // Caribbean
  { lat: 20.0, lon: -78.0, decl: -4.10, incl: 52.50, intensity: 44100 },
  { lat: 17.0, lon: -83.0, decl: -1.50, incl: 48.20, intensity: 41900 },
  { lat: 16.0, lon: -72.0, decl: -7.30, incl: 50.10, intensity: 42200 },
  { lat: 22.0, lon: -82.0, decl: -2.80, incl: 55.40, intensity: 46200 },
  { lat: 19.5, lon: -70.0, decl: -8.10, incl: 52.00, intensity: 43500 },
  { lat: 13.0, lon: -80.0, decl: -2.90, incl: 42.80, intensity: 39800 },
  { lat: 28.5, lon: -90.5, decl: -1.30, incl: 60.50, intensity: 48200 },  // Gulf of Mexico
  { lat: 25.0, lon: -90.0, decl: -1.80, incl: 57.20, intensity: 46800 },
  { lat: 29.0, lon: -94.0, decl: -0.80, incl: 61.80, intensity: 49100 },
  { lat: 27.0, lon: -97.0, decl:  0.40, incl: 59.90, intensity: 48500 },
  { lat: 24.0, lon: -83.0, decl: -3.20, incl: 56.40, intensity: 46100 },
  { lat: 30.0, lon: -87.5, decl: -1.90, incl: 62.30, intensity: 49700 },
  { lat: 26.0, lon: -96.0, decl:  0.10, incl: 58.50, intensity: 47800 },
  { lat: 23.0, lon: -87.5, decl: -2.10, incl: 55.00, intensity: 45500 },
  { lat: 25.8, lon: -80.2, decl: -6.40, incl: 57.50, intensity: 46400 },  // Florida
  { lat: 30.5, lon: -81.5, decl: -5.80, incl: 63.50, intensity: 50100 },
  { lat: 28.0, lon: -82.5, decl: -5.30, incl: 60.80, intensity: 48600 },
  { lat: 10.0, lon: -74.0, decl: -8.60, incl: 38.20, intensity: 37400 },  // Colombia/Venezuela
  { lat: 12.0, lon: -69.0, decl:-10.30, incl: 40.50, intensity: 38100 },
  { lat: 11.0, lon: -85.0, decl: -1.20, incl: 40.10, intensity: 38700 },
]

// ── HAVERSINE DEAD-RECKONING FALLBACK LAYER ───────────────────────────────────
// When only last-known AIS position is available, treat it as a low-confidence fix.
// live AIS → ±2 km (terrestrial), satellite AIS → ±15 km, SIM → ±40 km
export function buildHaversineLayer(vessel) {
  const lat = vessel?.lat ?? vessel?.position?.lat
  const lon = vessel?.lon ?? vessel?.position?.lon
  if (lat == null || lon == null) return null

  let uncertaintyKm
  if (vessel.live === true && vessel.source?.includes('LIVE')) {
    uncertaintyKm = 2
  } else if (vessel.source?.includes('SAT')) {
    uncertaintyKm = 15
  } else {
    uncertaintyKm = 40   // SIM or unknown — low confidence
  }

  return {
    lat:           parseFloat(parseFloat(lat).toFixed(5)),
    lon:           parseFloat(parseFloat(lon).toFixed(5)),
    uncertaintyKm,
    method:        'HAVERSINE-LAST-KNOWN'
  }
}

// ── TRIDENT FUSION — Inverse-variance weighted centroid ───────────────────────
// weight_i = 1/σ²_i; fused = Σ(w·pos) / Σw; σ_fused = √(1/Σw)
export function tridentFusion(layers = {}) {
  const active = []
  if (layers.lte        && layers.lte.lat        != null) active.push({ ...layers.lte,        name: 'LTE-TA' })
  if (layers.wmm        && layers.wmm.lat        != null) active.push({ ...layers.wmm,        name: 'WMM-MAG' })
  if (layers.haversine  && layers.haversine.lat  != null) active.push({ ...layers.haversine,  name: 'HAVERSINE' })
  if (layers.tdoa       && layers.tdoa.lat       != null) active.push({ ...layers.tdoa,       name: 'SATNOGS-TDOA' })

  if (!active.length) return null

  let sumW = 0, wLat = 0, wLon = 0
  for (const L of active) {
    const sigma = Math.max(0.1, L.uncertaintyKm)
    const w     = 1 / (sigma * sigma)
    sumW += w; wLat += w * L.lat; wLon += w * L.lon
  }

  const fusedLat  = wLat / sumW
  const fusedLon  = wLon / sumW
  const fusedSigma = Math.sqrt(1 / sumW)
  const confidence = parseFloat(
    Math.min(1, (active.length / 3) * Math.exp(-fusedSigma / 100)).toFixed(3)
  )

  return {
    lat:           parseFloat(fusedLat.toFixed(4)),
    lon:           parseFloat(fusedLon.toFixed(4)),
    uncertaintyKm: parseFloat(fusedSigma.toFixed(1)),
    confidence,
    layersActive:  active.map(l => l.name),
    layers: active.map(l => ({
      name: l.name, lat: l.lat, lon: l.lon, uncertaintyKm: l.uncertaintyKm
    })),
    method: 'TRIDENT-FUSION'
  }
}

// ── Build LTE layer from cell tower observations ───────────────────────────────
// 1 anchor  → single-ring (position = tower, uncertainty = distance)
// 2 anchors → midpoint of two intersections, higher uncertainty
// 3+ anchors → full trilateration (least-squares gradient descent)
// droneAltM — optional drone altitude above ground (metres). When provided with
//   TA measurements, applies correctTaForAltitude() to convert 3D slant distance
//   to 2D horizontal distance before trilateration.
export function buildLteLayer(towers, droneAltM = 0) {
  if (!towers?.length) return null

  const towerAlt = 0   // towers are assumed ground-level (0 m AGL)
  const anchors = []
  for (const t of towers) {
    let distM = null
    if (t.ta != null) {
      const slantM = timingAdvanceToDistance(t.ta)
      distM = (droneAltM > 0)
        ? correctTaForAltitude(slantM, droneAltM, towerAlt)
        : slantM
    } else if (t.rssi != null) {
      distM = rssiToDistance(t.rssi, t.rssiRefDbm ?? -40, t.n ?? 2.5)
    }
    if (distM != null && distM > 0 && Number.isFinite(distM)) {
      anchors.push({ lat: t.lat, lon: t.lon, distKm: distM / 1000 })
    }
  }
  if (!anchors.length) return null

  // 1 anchor: single-ring — position = tower, uncertainty = radius
  if (anchors.length === 1) {
    return { lat: anchors[0].lat, lon: anchors[0].lon, uncertaintyKm: anchors[0].distKm, method: 'LTE-SINGLE-RING' }
  }

  // 2 anchors: weighted midpoint — not true trilateration, higher uncertainty
  if (anchors.length === 2) {
    const w0 = 1 / (anchors[0].distKm ** 2)
    const w1 = 1 / (anchors[1].distKm ** 2)
    const sumW = w0 + w1
    return {
      lat: parseFloat(((w0 * anchors[0].lat + w1 * anchors[1].lat) / sumW).toFixed(5)),
      lon: parseFloat(((w0 * anchors[0].lon + w1 * anchors[1].lon) / sumW).toFixed(5)),
      uncertaintyKm: parseFloat(((anchors[0].distKm + anchors[1].distKm) / 2).toFixed(2)),
      method: 'LTE-TWO-RING'
    }
  }

  // 3+ anchors: proper trilateration
  return trilateratePosition(anchors)
}

// ── GDOP — Geometric Dilution of Precision ─────────────────────────────────────
// Ported from Python reference: triangulation_engine.py lines 128–152
// Uses flat-earth Cartesian projection (km) around the target point.
// H_i = [dx_i/r_i, dy_i/r_i] (unit vector from target to anchor i)
// GDOP = √(trace(H^T·H)⁻¹) — measures geometric spread quality of anchors.
// < 2: EXCELLENT · 2–5: GOOD · 5–10: POOR · > 10: CRITICAL · returns 99 on degeneracy
//
// Signature: computeGDOP(anchors, targetLat, targetLon)
//   anchors   — array of { lat, lon } tower positions (3+ required; < 3 returns 99)
//   targetLat — fused latitude estimate (degrees)
//   targetLon — fused longitude estimate (degrees)
//
// Typical call site:  computeGDOP(validAnchors, fusion.lat, fusion.lon)
export function computeGDOP(anchors, targetLat, targetLon) {
  if (!anchors || anchors.length < 3) return 99.0
  const cosLat = Math.cos(targetLat * Math.PI / 180)
  const KM_PER_DEG = 111.32

  let H00 = 0, H01 = 0, H10 = 0, H11 = 0
  for (const a of anchors) {
    const dx = (a.lat - targetLat) * KM_PER_DEG
    const dy = (a.lon - targetLon) * KM_PER_DEG * cosLat
    const r  = Math.sqrt(dx * dx + dy * dy) || 0.001  // km; minimum 1 m
    const ux = dx / r
    const uy = dy / r
    H00 += ux * ux
    H01 += ux * uy
    H10 += uy * ux
    H11 += uy * uy
  }
  const det = H00 * H11 - H01 * H10
  if (Math.abs(det) < 1e-12) return 99.0
  const traceInv = (H11 + H00) / det
  if (traceInv < 0) return 99.0
  return parseFloat(Math.min(Math.sqrt(traceInv), 99.0).toFixed(3))
}

// ── GDOP quality rating ──────────────────────────────────────────────────────
export function gdopRating(score) {
  if (score < 2)  return 'EXCELLENT'
  if (score < 5)  return 'GOOD'
  if (score < 10) return 'POOR'
  return 'CRITICAL'
}

// ── VIGESIMAL BASE-20 COORDINATE COMPRESSION ──────────────────────────────────
// Ported from Python reference: triangulation_engine.py lines 8–40
// Maps a continuous value to one of 20 discrete levels and encodes as a glyph.
// Purpose: ultra-compact telemetry encoding (e.g., 2 symbols = 1 coordinate pair)
export const VIGESIMAL_SYMBOLS = [
  '◎','•','••','•••','••••',
  '━','━•','━••','━•••','━••••',
  '━━','━━•','━━••','━━•••','━━••••',
  '━━━','━━━•','━━━••','━━━•••','━━━••••'
]

// quantVigesimal: encode real value → level 0–19
export function quantVigesimal(value, minV, maxV) {
  if (maxV <= minV) return 10
  const norm = Math.max(0, Math.min(1, (value - minV) / (maxV - minV)))
  return Math.min(19, Math.floor(norm * 20))
}

// dequantVigesimal: decode level 0–19 → real value (bin center)
export function dequantVigesimal(level, minV, maxV) {
  const center = (level + 0.5) / 20
  return minV + center * (maxV - minV)
}

// vigesimalSymbol: level → glyph character
export function vigesimalSymbol(level) {
  return VIGESIMAL_SYMBOLS[Math.min(level, 19)]
}

// compressCoordinate: lat/lon → 2-symbol vigesimal encoding with optional bbox
// Default bbox covers global range. Honduras-specific: latMin=13, latMax=17, lonMin=-90, lonMax=-83
export function compressCoordinate(lat, lon, bbox = { latMin: -90, latMax: 90, lonMin: -180, lonMax: 180 }) {
  const latLevel = quantVigesimal(lat, bbox.latMin, bbox.latMax)
  const lonLevel = quantVigesimal(lon, bbox.lonMin, bbox.lonMax)
  return {
    lat_level:   latLevel,
    lon_level:   lonLevel,
    symbol_lat:  vigesimalSymbol(latLevel),
    symbol_lon:  vigesimalSymbol(lonLevel),
    encoded:     `${vigesimalSymbol(latLevel)}${vigesimalSymbol(lonLevel)}`,
    bits:        10,
    lat_decoded: parseFloat(dequantVigesimal(latLevel, bbox.latMin, bbox.latMax).toFixed(4)),
    lon_decoded: parseFloat(dequantVigesimal(lonLevel, bbox.lonMin, bbox.lonMax).toFixed(4)),
    bbox
  }
}

// ── GPS validity check ─────────────────────────────────────────────────────────
// A vessel is considered "GPS-invalid" if not receiving live terrestrial AIS.
export function isGpsInvalid(vessel) {
  if (!vessel) return true
  if (vessel.live === true && vessel.source?.includes('LIVE')) return false
  return true  // SIM, satellite, or unknown → no validated GPS
}

// ── TRIDENT request processor — shared by dev middleware + production Express ──
// body: { towers?, magnetic?, vessel?, vesselMmsi?, altitude_m? }
//   altitude_m — optional drone altitude in metres AGL. When provided alongside
//   tower TA observations, the LTE layer applies 3D slant → 2D horizontal
//   correction: d_horizontal = √(d_slant² − Δz²). Ignored for RSSI / WMM / Haversine.
// wmmFetcher: optional async (lat, lon) => { declination, inclination, intensity, lat, lon }
// Returns: { ok: true, data: Object } | { ok: false, error: String, status: 422|500 }
export async function processTridentRequest(body = {}, wmmFetcher = null) {
  try {
    const { towers, magnetic, vessel, vesselMmsi, altitude_m } = body
    const droneAltM = (altitude_m != null && Number.isFinite(Number(altitude_m)) && Number(altitude_m) >= 0)
      ? Number(altitude_m) : 0
    const layers = {}

    // Layer 1: LTE Timing Advance / RSSI trilateration
    // When altitude_m is present, TA distances are corrected for 3D slant geometry.
    if (Array.isArray(towers) && towers.length >= 1) {
      const lteResult = buildLteLayer(towers, droneAltM)
      if (lteResult) layers.lte = lteResult
    }

    // Layer 2: WMM Magnetic Fingerprinting — use live NOAA query if LTE gave a position;
    // otherwise fall back to static Caribbean grid matching
    if (magnetic && (magnetic.declination != null || magnetic.inclination != null || magnetic.intensity != null)) {
      let wmmGrid = WMM_CARIBBEAN_GRID
      if (layers.lte && typeof wmmFetcher === 'function') {
        try {
          const liveWmm = await wmmFetcher(layers.lte.lat, layers.lte.lon)
          wmmGrid = [{ lat: liveWmm.lat, lon: liveWmm.lon, decl: liveWmm.declination, incl: liveWmm.inclination, intensity: liveWmm.intensity }, ...WMM_CARIBBEAN_GRID]
        } catch (_) { /* fall back to static grid */ }
      }
      const magResult = magneticFingerprintMatch(wmmGrid, magnetic)
      if (magResult) layers.wmm = magResult
    }

    // Layer 3: Haversine dead-reckoning from last-known AIS position (fallback)
    if (vessel && (vessel.lat != null || vessel.position?.lat != null)) {
      const haveResult = buildHaversineLayer(vessel)
      if (haveResult) layers.haversine = haveResult
    }

    const fusion = tridentFusion(layers)
    if (!fusion) {
      return { ok: false, error: 'Insufficient sensor data', hint: 'Provide towers[], magnetic {decl,incl,intensity}, or vessel {lat,lon,source}', status: 422 }
    }

    // GDOP — compute only when 3+ valid LTE anchors are available
    const validAnchors = Array.isArray(towers)
      ? towers.filter(t => t.lat != null && t.lon != null && (t.ta != null || t.rssi != null))
      : []
    let gdop = null
    if (validAnchors.length >= 3) {
      const score = computeGDOP(validAnchors, fusion.lat, fusion.lon)
      gdop = { score, rating: gdopRating(score) }
    }

    const formulaDetails = {}
    if (Array.isArray(towers) && towers.length) {
      formulaDetails.lte_ta = {
        formula:    'd = TA × T_TA × c / 2   (3GPP TS 36.213)',
        resolution: '78.125 m per TA unit',
        altitude_correction: droneAltM > 0
          ? { applied: true, drone_alt_m: droneAltM, formula: 'd_h = √(d_slant² − Δz²)' }
          : { applied: false },
        towers_used: towers.map(t => {
          const slantM = t.ta != null ? timingAdvanceToDistance(t.ta)
                       : (t.rssi != null ? rssiToDistance(t.rssi, t.rssiRefDbm ?? -40, t.n ?? 2.5) : null)
          const horizM = (slantM != null && droneAltM > 0 && t.ta != null)
                       ? correctTaForAltitude(slantM, droneAltM, 0) : slantM
          return {
            lat: t.lat, lon: t.lon, ta: t.ta ?? null, rssi: t.rssi ?? null,
            slant_m: slantM != null ? Math.round(slantM) : null,
            dist_m:  horizM != null ? Math.round(horizM) : null,
          }
        })
      }
    }
    if (magnetic) formulaDetails.magnetic_fingerprint = { formula: 'Match (decl,incl,intensity) vs WMM2025', model: 'NOAA WMM2025', grid_points: WMM_CARIBBEAN_GRID.length, observed: magnetic }
    if (vessel)   formulaDetails.haversine = { formula: 'Last-known AIS position with σ = f(source)', source: vessel.source ?? 'unknown' }
    formulaDetails.gdop = { formula: 'GDOP = √(trace((HᵀH)⁻¹))  —  H_i = unit vector from fused pos to anchor i', reference: 'Geometric Dilution of Precision (2D)' }

    return {
      ok:   true,
      data: {
        engine:         'TRIDENT v1.0',
        vessel_mmsi:    vesselMmsi ?? null,
        altitude_m:     droneAltM > 0 ? droneAltM : null,
        lat:            fusion.lat,
        lon:            fusion.lon,
        uncertainty_km: fusion.uncertaintyKm,
        confidence:     fusion.confidence,
        gdop,
        estimated:      { lat: fusion.lat, lon: fusion.lon, uncertainty_km: fusion.uncertaintyKm, confidence: fusion.confidence },
        layers_active:  fusion.layersActive,
        layers:         fusion.layers,
        formulas:       formulaDetails,
        retrieved:      new Date().toISOString()
      }
    }
  } catch (err) {
    return { ok: false, error: err.message, status: 500 }
  }
}
