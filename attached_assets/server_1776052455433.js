import express from 'express'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import {
  cached,
  REGIONS,
  CITY_BBOXES,
  CACHE_TTL_MS,
  CACHE_TTL_ROADS,
  CACHE_TTL_FIRES,
  CACHE_TTL_SAT,
  fetchWeatherUI,
  fetchAQIUI,
  fetchHondurasMarineUI,
  fetchGulfMarineUI,
  fetchFiresUI,
  fetchRoadsUI,
  fetchQuakesUI,
  fetchWeatherJSON,
  fetchAQIJSON,
  generateAISVessels,
  generateAISVesselsWithLive,
  generateGulfVessels,
  generateGulfVesselsWithLive,
  generateVesselTrail,
  fetchSatNOGSCoverage,
  fetchSatNOGSCoverageGulf,
  fetchGeomagHN,
  fetchWMMForLocation,
  HN_WMM,
  generateSitemap,
  apiIndex,
  sendJSON
} from './api-plugin.js'

import {
  timingAdvanceToDistance,
  rssiToDistance,
  correctTaForAltitude,
  fspl,
  cost231Hata,
  rsrpFromRssi,
  computeGDOP,
  gdopRating,
  quantVigesimal,
  dequantVigesimal,
  vigesimalSymbol,
  compressCoordinate,
  VIGESIMAL_SYMBOLS,
  processTridentRequest,
} from './tridentEngine.js'

import {
  HN_TOWERS,
  cellIdLookup,
  towersByCity,
  towersByCarrier,
  towerStats,
} from './hondurasTowers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST      = resolve(__dirname, 'dist')
const PORT      = parseInt(process.env.PORT || '5000', 10)

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '50kb' }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.sendStatus(204); return }
  next()
})

function json(res, data, status = 200) {
  res.status(status).json(data)
}

app.get('/sitemap.xml', (req, res) => {
  const xml = generateSitemap(req.headers.host)
  res.setHeader('Content-Type',  'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.send(xml)
})

app.get('/api/wx/:region', async (req, res) => {
  const { region } = req.params
  if (!REGIONS[region]) { json(res, { error: 'Invalid region', valid_regions: Object.keys(REGIONS) }, 400); return }
  try {
    const data = await cached(`ui:wx:${region}`, () => fetchWeatherUI(region), CACHE_TTL_MS)
    json(res, data)
  } catch (err) {
    console.error('[server /api/wx]', err.message)
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/aqi/:region', async (req, res) => {
  const { region } = req.params
  if (!REGIONS[region]) { json(res, { error: 'Invalid region', valid_regions: Object.keys(REGIONS) }, 400); return }
  try {
    const data = await cached(`ui:aqi:${region}`, () => fetchAQIUI(region), CACHE_TTL_MS)
    json(res, data)
  } catch (err) {
    console.error('[server /api/aqi]', err.message)
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/marine/honduras', async (req, res) => {
  try {
    const data = await cached('ui:marine:hn', () => fetchHondurasMarineUI(), CACHE_TTL_MS)
    json(res, data)
  } catch (err) {
    console.error('[server /api/marine/honduras]', err.message)
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/marine/gulf', async (req, res) => {
  try {
    const data = await cached('ui:marine:gulf', () => fetchGulfMarineUI(), CACHE_TTL_MS)
    json(res, data)
  } catch (err) {
    console.error('[server /api/marine/gulf]', err.message)
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/ais/gulf/trail/:mmsi', (req, res) => {
  const mmsi  = parseInt(req.params.mmsi, 10)
  const trail = generateVesselTrail(mmsi)
  if (!trail) { json(res, { error: 'MMSI not found in Gulf SIM fleet', mmsi }, 404); return }
  json(res, trail)
})

app.get('/api/ais/gulf', async (req, res) => {
  try {
    const data = await cached('api:ais:gulf', () => generateGulfVesselsWithLive(), CACHE_TTL_MS)
    json(res, data)
  } catch (err) {
    console.error('[server /api/ais/gulf]', err.message)
    json(res, { vessels: [], error: err.message }, 502)
  }
})

app.get('/api/ais/trail/:mmsi', (req, res) => {
  const mmsi  = parseInt(req.params.mmsi, 10)
  const trail = generateVesselTrail(mmsi)
  if (!trail) { json(res, { error: 'MMSI not found in SIM fleet', mmsi }, 404); return }
  json(res, trail)
})

// ── AIS Honduras — stale-while-revalidate ────────────────────────────────────
// Always responds instantly: serves cached or simulated data, refreshes live
// data in background so the 12-second aisstream window never blocks the client.
let _aisHnCache = null
let _aisHnTs    = 0
let _aisHnBusy  = false

function _refreshAISHN() {
  if (_aisHnBusy) return
  _aisHnBusy = true
  generateAISVesselsWithLive()
    .then(d => { _aisHnCache = d; _aisHnTs = Date.now() })
    .catch(e => console.error('[/api/ais] background refresh error:', e.message))
    .finally(() => { _aisHnBusy = false })
}

app.get('/api/ais', (req, res) => {
  const stale = Date.now() - _aisHnTs > CACHE_TTL_MS
  if (stale) _refreshAISHN()
  const data = _aisHnCache ?? generateAISVessels()
  json(res, data)
})

// ── TRIDENT TERRA — Honduras Cell Tower API ──────────────────────────────────

app.get('/api/cell/towers', (req, res) => {
  const { carrier, city, tech } = req.query
  let results = HN_TOWERS
  if (carrier) results = results.filter(t => t.carrier === carrier.toLowerCase())
  if (city)    results = results.filter(t => t.city.toLowerCase().includes(city.toLowerCase()))
  if (tech)    results = results.filter(t => t.tech === tech)
  json(res, { count: results.length, towers: results })
})

app.get('/api/cell/stats', (_req, res) => {
  json(res, towerStats())
})

app.post('/api/cell/lookup', (req, res) => {
  const { mcc, mnc, lac, cid } = req.body ?? {}
  if (mcc == null || mnc == null || lac == null || cid == null) {
    json(res, { error: 'Required: mcc, mnc, lac, cid' }, 400); return
  }
  const tower = cellIdLookup(+mcc, +mnc, +lac, +cid)
  if (!tower) {
    json(res, { found: false, mcc, mnc, lac, cid }, 404); return
  }
  json(res, {
    found:      true,
    lat:        tower.lat,
    lon:        tower.lon,
    accuracyM:  Math.round(tower.range * 0.35),
    coverageM:  tower.range,
    carrier:    tower.carrier,
    city:       tower.city,
    tech:       tower.tech,
    band:       tower.band,
    power_dbm:  tower.power_dbm,
    samples:    tower.samples,
    cell_id:    tower.id,
    method:     'CELL-ID-LOOKUP',
  })
})

app.post('/api/cell/triangulate', (req, res) => {
  const { towers: towerList } = req.body ?? {}
  if (!Array.isArray(towerList) || towerList.length < 2) {
    json(res, { error: 'Required: towers array with 2+ entries [{mcc,mnc,lac,cid,rsrp?}]' }, 400); return
  }
  const anchors = []
  for (const t of towerList) {
    const rec = cellIdLookup(+t.mcc, +t.mnc, +t.lac, +t.cid)
    if (!rec) continue
    const rsrp = t.rsrp ?? rec.power_dbm
    const distM = rec.range * Math.max(0.1, Math.min(1, (rsrp + 50) / (-50)))
    anchors.push({ lat: rec.lat, lon: rec.lon, distKm: distM / 1000, carrier: rec.carrier, city: rec.city, cell_id: rec.id })
  }
  if (anchors.length < 2) {
    json(res, { error: 'Could not resolve 2+ towers from database' }, 404); return
  }
  if (anchors.length === 2) {
    const midLat = (anchors[0].lat + anchors[1].lat) / 2
    const midLon = (anchors[0].lon + anchors[1].lon) / 2
    json(res, { lat: +midLat.toFixed(5), lon: +midLon.toFixed(5), uncertaintyKm: 2.5, method: 'CELL-MIDPOINT', anchors })
    return
  }
  let lat = anchors.reduce((s, a) => s + a.lat, 0) / anchors.length
  let lon = anchors.reduce((s, a) => s + a.lon, 0) / anchors.length
  let lr = 0.01
  for (let i = 0; i < 200; i++) {
    let gLat = 0, gLon = 0
    for (const a of anchors) {
      const dLat = (lat - a.lat) * Math.PI / 180
      const dLon = (lon - a.lon) * Math.PI / 180
      const d = 6371 * 2 * Math.atan2(Math.sqrt(Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(a.lat*Math.PI/180)*Math.sin(dLon/2)**2), Math.sqrt(1-(Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(a.lat*Math.PI/180)*Math.sin(dLon/2)**2)))
      if (d < 0.001) continue
      const err = d - a.distKm
      gLat += err * (lat - a.lat) / d
      gLon += err * (lon - a.lon) / d
    }
    const n = Math.sqrt(gLat**2 + gLon**2)
    if (n < 1e-14) break
    lat -= lr * gLat / n
    lon -= lr * gLon / n
    lr *= 0.997
  }
  json(res, { lat: +lat.toFixed(5), lon: +lon.toFixed(5), uncertaintyKm: 1.2, method: 'CELL-TRILATERATION', anchors })
})

app.get('/api/sat-coverage/gulf', async (req, res) => {
  try {
    const data = await cached('api:sat:gulf', () => fetchSatNOGSCoverageGulf(), CACHE_TTL_SAT)
    json(res, data)
  } catch (err) {
    console.error('[server /api/sat-coverage/gulf]', err.message)
    json(res, { satellites: [], nextPass: null, passActive: false, error: err.message }, 502)
  }
})

app.get('/api/sat-coverage', async (req, res) => {
  try {
    const data = await cached('api:sat', () => fetchSatNOGSCoverage(), CACHE_TTL_SAT)
    json(res, data)
  } catch (err) {
    console.error('[server /api/sat-coverage]', err.message)
    json(res, { satellites: [], nextPass: null, passActive: false, error: err.message }, 502)
  }
})

app.get('/api/geomag', async (req, res) => {
  try {
    // fetchGeomagHN internally manages separate WMM (24h) and Kp (5min) caches
    const data = await fetchGeomagHN()
    json(res, data)
  } catch (err) {
    console.error('[server /api/geomag]', err.message)
    json(res, { ...HN_WMM, kp: 0, stormLevel: 'QUIET', error: err.message }, 200)
  }
})

app.get('/api/fires', async (req, res) => {
  try {
    const data = await cached('ui:fires', () => fetchFiresUI(), CACHE_TTL_FIRES)
    json(res, data)
  } catch (err) {
    console.error('[server /api/fires]', err.message)
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/roads/:city', async (req, res) => {
  const { city } = req.params
  if (!CITY_BBOXES[city]) { json(res, { error: 'Invalid city. Use: la, nola, miami' }, 400); return }
  try {
    const data = await cached(`ui:roads:${city}`, () => fetchRoadsUI(city), CACHE_TTL_ROADS)
    json(res, data)
  } catch (err) {
    console.error('[server /api/roads]', err.message)
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/roads', async (req, res) => {
  const city = (req.query.city || '').toLowerCase()
  if (!CITY_BBOXES[city]) { json(res, { error: 'Invalid city. Use: la, nola, miami' }, 400); return }
  try {
    const data = await cached(`ui:roads:${city}`, () => fetchRoadsUI(city), CACHE_TTL_ROADS)
    json(res, data)
  } catch (err) {
    console.error('[server /api/roads]', err.message)
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/quakes', async (req, res) => {
  try {
    const data = await cached('ui:quakes', () => fetchQuakesUI(), CACHE_TTL_FIRES)
    json(res, data)
  } catch (err) {
    console.error('[server /api/quakes]', err.message)
    json(res, [], 200)
  }
})

app.get('/api/v1', (req, res) => {
  json(res, apiIndex(req))
})

app.get('/api/v1/weather/:region', async (req, res) => {
  const { region } = req.params
  if (!REGIONS[region]) { json(res, { error: 'Invalid region', valid_regions: Object.keys(REGIONS) }, 400); return }
  try {
    const data = await cached(`wx:${region}`, () => fetchWeatherJSON(region), CACHE_TTL_MS)
    json(res, data)
  } catch (err) {
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/v1/aqi/:region', async (req, res) => {
  const { region } = req.params
  if (!REGIONS[region]) { json(res, { error: 'Invalid region', valid_regions: Object.keys(REGIONS) }, 400); return }
  try {
    const data = await cached(`aqi:${region}`, () => fetchAQIJSON(region), CACHE_TTL_MS)
    json(res, data)
  } catch (err) {
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/v1/snapshot/:region', async (req, res) => {
  const { region } = req.params
  if (!REGIONS[region]) { json(res, { error: 'Invalid region', valid_regions: Object.keys(REGIONS) }, 400); return }
  try {
    const [wx, aqi] = await Promise.all([
      cached(`wx:${region}`,  () => fetchWeatherJSON(region), CACHE_TTL_MS),
      cached(`aqi:${region}`, () => fetchAQIJSON(region),     CACHE_TTL_MS)
    ])
    json(res, { ...wx, air_quality: aqi.aqi })
  } catch (err) {
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/v1/marine/vessels', async (req, res) => {
  try {
    const data = await cached('api:ais', () => generateAISVesselsWithLive(), CACHE_TTL_MS)
    json(res, data)
  } catch (err) {
    json(res, { error: err.message }, 502)
  }
})

app.get('/api/v1/marine/geomag', async (req, res) => {
  try {
    const data = await fetchGeomagHN()
    json(res, data)
  } catch (err) {
    json(res, { ...HN_WMM, kp: 0, stormLevel: 'QUIET', error: err.message }, 200)
  }
})

app.get('/api/v1/marine/trail/:mmsi', (req, res) => {
  const mmsi  = parseInt(req.params.mmsi, 10)
  const trail = generateVesselTrail(mmsi)
  if (!trail) { json(res, { error: 'MMSI not found in SIM fleet', mmsi }, 404); return }
  json(res, trail)
})

// ── TRIDENT — GPS-free positioning engine (POST) ──────────────────────────────
// Body: { towers?, magnetic?, vessel?, vesselMmsi?, altitude_m? }
//   altitude_m (optional): drone altitude in metres AGL. When present with TA towers,
//   corrects 3D slant distance to 2D horizontal: d_h = √(d_slant² − Δz²).
//   Ignored for RSSI, WMM-MAG and Haversine layers (magnetic is 3D by nature).
// Returns: { lat, lon, altitude_m, uncertainty_km, confidence, estimated{}, layers_active, layers, formulas }
app.post('/api/trident', async (req, res) => {
  try {
    const result = await processTridentRequest(req.body || {}, fetchWMMForLocation)
    if (!result.ok) { json(res, { error: result.error, hint: result.hint }, result.status ?? 500); return }
    json(res, result.data)
  } catch (err) {
    console.error('[TRIDENT]', err.message)
    json(res, { error: err.message }, 500)
  }
})

// ── TRIDENT formula calculator (GET — for testing individual formulas) ───────
app.get('/api/trident/formulas', (req, res) => {
  const { formula, ...params } = req.query
  const results = {}

  if (!formula || formula === 'fspl') {
    const d = parseFloat(params.d ?? 1000), f = parseFloat(params.f ?? 2.4e9)
    results.fspl = { input: { d_m: d, f_hz: f }, result_db: parseFloat(fspl(d, f).toFixed(2)) }
  }
  if (!formula || formula === 'ta') {
    const ta = parseInt(params.ta ?? 10, 10)
    results.timing_advance = { input: { ta }, result_m: Math.round(timingAdvanceToDistance(ta)), resolution: '78.125 m/step' }
  }
  if (!formula || formula === 'rssi') {
    const rssi = parseFloat(params.rssi ?? -70), ref = parseFloat(params.ref ?? -40), n = parseFloat(params.n ?? 2.5)
    results.rssi_distance = { input: { rssi_dbm: rssi, rssi_ref_dbm: ref, n }, result_m: Math.round(rssiToDistance(rssi, ref, n)) }
  }
  if (!formula || formula === 'cost231') {
    const d = parseFloat(params.d ?? 1), f = parseFloat(params.f ?? 1800)
    results.cost231_hata = { input: { d_km: d, f_mhz: f }, result_db: parseFloat(cost231Hata(d, f).toFixed(2)) }
  }
  if (!formula || formula === 'rsrp') {
    const rssi = parseFloat(params.rssi ?? -80), nb = parseInt(params.nb ?? 100, 10)
    results.rsrp = { input: { rssi_dbm: rssi, num_rb: nb }, result_dbm: parseFloat(rsrpFromRssi(rssi, nb).toFixed(2)) }
  }
  if (!formula || formula === 'gdop') {
    const anchors = [
      { lat: parseFloat(params.lat0 ?? 15.518), lon: parseFloat(params.lon0 ?? -88.025) },
      { lat: parseFloat(params.lat1 ?? 14.093), lon: parseFloat(params.lon1 ?? -87.207) },
      { lat: parseFloat(params.lat2 ?? 15.774), lon: parseFloat(params.lon2 ?? -86.793) },
    ]
    const tLat = parseFloat(params.tlat ?? 15.51), tLon = parseFloat(params.tlon ?? -87.90)
    const score = computeGDOP(anchors, tLat, tLon)
    results.gdop = {
      input:       { anchors, target: { lat: tLat, lon: tLon } },
      result:      score,
      rating:      gdopRating(score),
      formula:     'GDOP = √(trace((HᵀH)⁻¹))  —  H_i = unit vector from target to anchor i',
      ratings:     { excellent: '< 2', good: '2–5', poor: '5–10', critical: '> 10' }
    }
  }
  if (!formula || formula === 'vigesimal') {
    const val = parseFloat(params.val ?? 15.5)
    const minV = parseFloat(params.min ?? 13), maxV = parseFloat(params.max ?? 17)
    const level = quantVigesimal(val, minV, maxV)
    results.vigesimal = {
      input:          { value: val, min: minV, max: maxV },
      level,
      symbol:         vigesimalSymbol(level),
      decoded_center: parseFloat(dequantVigesimal(level, minV, maxV).toFixed(4)),
      all_symbols:    VIGESIMAL_SYMBOLS,
      formula:        'level = floor(clamp((v−min)/(max−min), 0, 1) × 20)',
      reference:      'Base-20 vigesimal encoding — ultra-compact telemetry'
    }
  }

  json(res, {
    engine:   'TRIDENT v1.0 — Formula Calculator',
    formulas: results,
    all_formulas: ['fspl', 'ta', 'rssi', 'cost231', 'rsrp', 'gdop', 'vigesimal'],
    usage:    '/api/trident/formulas?formula=gdop&lat0=15.5&lon0=-88.0&lat1=14.1&lon1=-87.2&lat2=15.8&lon2=-86.8&tlat=15.5&tlon=-87.9'
  })
})

app.use(express.static(DIST, {
  maxAge:  '5m',
  etag:    true,
  index:   'index.html'
}))

app.use((req, res) => {
  res.sendFile(resolve(DIST, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WeatherAI] server listening on :${PORT}`)
})
