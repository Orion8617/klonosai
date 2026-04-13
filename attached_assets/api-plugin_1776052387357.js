/**
 * WeatherAI Data API Plugin for Vite
 * Serves live weather data as clean JSON endpoints.
 * 
 * Endpoints:
 *   GET /sitemap.xml                     → XML sitemap (all city + state pages)
 *   GET /api/v1/                         → API index & documentation
 *   GET /api/v1/weather/:region          → Current weather (+ 7-day daily)
 *   GET /api/v1/aqi/:region              → Air quality index
 *   GET /api/v1/snapshot/:region         → Combined weather + AQI snapshot
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import WebSocket from 'ws'
import { computeMarineSNN } from './src/services/marineService.js'
import { HN_TOWERS, cellIdLookup, towerStats } from './hondurasTowers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadCities() {
  try {
    const raw = readFileSync(resolve(__dirname, 'src/data/cities.json'), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function generateSitemap(host) {
  const base   = `https://weatherai.app`
  const today  = new Date().toISOString().split('T')[0]
  const cities = loadCities()

  const staticUrls = [
    { loc: base, priority: '1.0', changefreq: 'daily' },
    { loc: `${base}/louisiana`,  priority: '0.9', changefreq: 'hourly' },
    { loc: `${base}/california`, priority: '0.9', changefreq: 'hourly' }
  ]

  const cityUrls = cities.map(c => ({
    loc:        `${base}/weather/${c.slug}`,
    priority:   '0.7',
    changefreq: 'daily'
  }))

  const allUrls = [...staticUrls, ...cityUrls]

  const urlEntries = allUrls.map(u =>
    `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`
}

const REGIONS = {
  louisiana: {
    lat: 29.9511, lon: -90.0715,
    city: 'New Orleans', state: 'Louisiana',
    timezone: 'America/Chicago', accent: '#00ffaa'
  },
  california: {
    lat: 34.0522, lon: -118.2437,
    city: 'Los Angeles', state: 'California',
    timezone: 'America/Los_Angeles', accent: '#ff6600'
  }
}

const OPEN_METEO  = 'https://api.open-meteo.com/v1/forecast'
const AIR_QUALITY = 'https://air-quality-api.open-meteo.com/v1/air-quality'
const MARINE_BASE = 'https://marine-api.open-meteo.com/v1/marine'
const OVERPASS    = 'https://overpass-api.de/api/interpreter'
const FIRMS_URL   = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_USA_Contiguous_24h.csv'
const USGS_QUAKES = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'

const cache = new Map()
const CACHE_TTL_MS      = 5  * 60 * 1000   // 5-min  — weather, AQI, marine
const CACHE_TTL_ROADS   = 10 * 60 * 1000   // 10-min — OSM roads (rarely change)
const CACHE_TTL_FIRES   = 10 * 60 * 1000   // 10-min — FIRMS (24h dataset)
const CACHE_TTL_GEOMAG  = 24 * 60 * 60 * 1000   // 24h — magnetic field (changes ~0.1°/yr)
const CACHE_TTL_KP      = 5  * 60 * 1000   // 5-min — Kp geomagnetic storm index
const CACHE_TTL_SAT     = 15 * 60 * 1000   // 15-min — SatNOGS satellite passes

// ── NOAA Kp-index (geomagnetic storm level 0–9) ───────────────────────────────
const KP_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'

async function fetchKpIndex() {
  const res = await fetch(KP_URL, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Kp HTTP ${res.status}`)
  const arr  = await res.json()
  if (!Array.isArray(arr) || !arr.length) throw new Error('Kp empty response')
  const last = arr[arr.length - 1]
  const kp   = parseFloat(last.kp_index ?? 0)
  return {
    kp,
    estimatedKp:  parseFloat(last.estimated_kp ?? 0),
    timeTag:      last.time_tag,
    stormLevel:   kp >= 5 ? 'STORM' : kp >= 4 ? 'ACTIVE' : 'QUIET'
  }
}

// ── NOAA NGDC WMM API (requires no key — public REST endpoint) ────────────────
// API: https://www.ngdc.noaa.gov/geomag-web/calculators/calculateIgrfwmm
// Honduras: lat=15.5, lon=-87.1, alt=0km, resultFormat=json
const WMM_URL = 'https://www.ngdc.noaa.gov/geomag-web/calculators/calculateIgrfwmm?lat1=15.5&lon1=-87.1&elevationUnits=K&elevation1=0&model=WMM&resultFormat=json&startYear=2026.0&endYear=2026.0'

// WMM2025 offline fallback constants for Honduras (lat=15.5°N, lon=-87.1°W, alt=0km, epoch=2026.0)
// Source: NOAA/NCEI WMM2025 spherical harmonic model. Stable to <0.5% over 5-yr validity period.
const HN_WMM = {
  declination:  -0.82,    // degrees (neg = west magnetic deviation)
  inclination:   46.15,   // degrees (dip angle from horizontal)
  horizontal:  28350,     // nanoTesla (horizontal component)
  vertical:    29820,     // nanoTesla (downward vertical component)
  intensity:   41125,     // nanoTesla (total field intensity)
  epoch:       2026.0,
  model:       'WMM2025',
  source:      'NOAA/NCEI WMM2025 — Honduras 15.5°N,-87.1°W'
}

async function fetchWMMFields() {
  const res = await fetch(WMM_URL, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`WMM HTTP ${res.status}`)
  const json  = await res.json()
  const result = json?.result?.[0]
  if (!result) throw new Error('WMM empty response')
  return {
    declination:  parseFloat((result.decl ?? HN_WMM.declination).toFixed(4)),
    inclination:  parseFloat((result.incl ?? HN_WMM.inclination).toFixed(4)),
    horizontal:   parseFloat((result.horizontal ?? HN_WMM.horizontal).toFixed(1)),
    vertical:     parseFloat((result.z ?? HN_WMM.vertical).toFixed(1)),
    intensity:    parseFloat((result.totalintensity ?? HN_WMM.intensity).toFixed(1)),
    epoch:        2026.0,
    model:        'WMM2025',
    source:       'NOAA NGDC WMM live'
  }
}

// fetchWMMForLocation — query WMM2025 for any lat/lon (for TRIDENT magnetic fingerprinting)
// Parameterizes the NOAA WMM URL with arbitrary coordinates.
// Cache key includes lat/lon rounded to 2 decimal places (≈1 km grid spacing).
async function fetchWMMForLocation(lat, lon) {
  const latR = parseFloat(lat.toFixed(2))
  const lonR = parseFloat(lon.toFixed(2))
  const url  = `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateIgrfwmm?lat1=${latR}&lon1=${lonR}&elevationUnits=K&elevation1=0&model=WMM&resultFormat=json&startYear=2026.0&endYear=2026.0`
  const res  = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`WMM HTTP ${res.status}`)
  const body   = await res.json()
  const result = body?.result?.[0]
  if (!result) throw new Error('WMM empty response')
  return {
    lat:         latR,
    lon:         lonR,
    declination: parseFloat((result.decl          ?? 0).toFixed(4)),
    inclination: parseFloat((result.incl          ?? 0).toFixed(4)),
    horizontal:  parseFloat((result.horizontal    ?? 0).toFixed(1)),
    vertical:    parseFloat((result.z             ?? 0).toFixed(1)),
    intensity:   parseFloat((result.totalintensity ?? 0).toFixed(1)),
    epoch:       2026.0,
    model:       'WMM2025',
    source:      `NOAA NGDC WMM live — ${latR}°N, ${lonR}°W`
  }
}

// fetchGeomagHN: WMM fields cached 24h (changes ~0.1°/yr); Kp cached 5min (live storm index)
// These caches are SEPARATE to ensure Kp freshness is not frozen by the WMM 24h TTL
async function fetchGeomagHN() {
  // Fetch WMM fields (24h cache) and Kp (5min cache) in parallel, independently
  const [wmmFields, kpData] = await Promise.all([
    cached('geomag:wmm', () => fetchWMMFields(), CACHE_TTL_GEOMAG).catch(err => {
      console.warn('[MarineAI] WMM fetch failed, using offline constants:', err.message)
      return { ...HN_WMM }
    }),
    cached('geomag:kp', () => fetchKpIndex(), CACHE_TTL_KP).catch(err => {
      console.warn('[MarineAI] Kp fetch failed:', err.message)
      return { kp: 0, estimatedKp: 0, stormLevel: 'QUIET', timeTag: null }
    })
  ])
  // Merge: WMM fields + live Kp — both independently cached at their own TTL
  return {
    ...wmmFields,
    kp:           kpData.kp,
    estimatedKp:  kpData.estimatedKp,
    stormLevel:   kpData.stormLevel,
    kpTimeTag:    kpData.timeTag,
    retrievedAt:  new Date().toISOString()
  }
}

async function cached(key, fetchFn, ttl = CACHE_TTL_MS) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < ttl) return entry.data
  const data = await fetchFn()
  cache.set(key, { ts: Date.now(), data })
  return data
}

// ── INTERNAL: Weather in frontend format (includes hourly for charts) ────────
async function fetchWeatherUI(region) {
  const r = REGIONS[region]
  const url = `${OPEN_METEO}?latitude=${r.lat}&longitude=${r.lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,` +
    `wind_direction_10m,cloud_cover,surface_pressure,apparent_temperature,uv_index,weather_code` +
    `&hourly=temperature_2m,precipitation,wind_speed_10m,cloud_cover` +
    `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,uv_index_max,wind_speed_10m_max` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=${r.timezone}&forecast_days=7`
  const res  = await fetch(url)
  const raw  = await res.json()
  const c    = raw.current  || {}
  const h    = raw.hourly   || {}
  const d    = raw.daily    || {}
  return {
    temp:        Math.round(c.temperature_2m        ?? 72),
    feelsLike:   Math.round(c.apparent_temperature  ?? 70),
    humidity:    Math.round(c.relative_humidity_2m  ?? 75),
    rain:        parseFloat((c.precipitation        ?? 0).toFixed(2)),
    wind:        Math.round(c.wind_speed_10m        ?? 8),
    windDir:     Math.round(c.wind_direction_10m    ?? 180),
    cloud:       Math.round(c.cloud_cover           ?? 60),
    pressure:    Math.round((c.surface_pressure     ?? 1013) * 0.0295301),
    pressureHpa: Math.round(c.surface_pressure      ?? 1013),
    uvIndex:     Math.round(c.uv_index              ?? 3),
    weatherCode: c.weather_code ?? 0,
    rain24h:     (h.precipitation   || []).slice(0, 24),
    temp24h:     (h.temperature_2m  || []).slice(0, 24),
    daily: d.time ? {
      precipSum: d.precipitation_sum,
      tempMax:   d.temperature_2m_max,
      tempMin:   d.temperature_2m_min,
      uvMax:     d.uv_index_max,
      windMax:   d.wind_speed_10m_max
    } : null
  }
}

// ── INTERNAL: AQI in frontend format ─────────────────────────────────────────
async function fetchAQIUI(region) {
  const r   = REGIONS[region]
  const url = `${AIR_QUALITY}?latitude=${r.lat}&longitude=${r.lon}` +
    `&current=us_aqi,pm10,pm2_5,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide&timezone=auto`
  const res = await fetch(url)
  const raw = await res.json()
  const c   = raw.current || {}
  return {
    aqi:  Math.round(c.us_aqi ?? 42),
    pm25: parseFloat((c.pm2_5              ?? 8.2).toFixed(1)),
    pm10: parseFloat((c.pm10               ?? 18.4).toFixed(1)),
    o3:   parseFloat((c.ozone              ?? 45.2).toFixed(1)),
    no2:  parseFloat((c.nitrogen_dioxide   ?? 12.1).toFixed(1)),
    so2:  parseFloat((c.sulphur_dioxide    ?? 2.3).toFixed(1)),
    co:   parseFloat((c.carbon_monoxide    ?? 0.4).toFixed(2))
  }
}

// ── INTERNAL: Marine data (Gulf of Mexico — 28.5°N / 90.5°W, New Orleans offshore) ──
async function fetchGulfMarineUI() {
  const url = `${MARINE_BASE}?latitude=28.5&longitude=-90.5` +
    `&current=wave_height,wave_direction,wave_period,sea_surface_temperature` +
    `&daily=sea_surface_temperature_max,wave_height_max` +
    `&temperature_unit=fahrenheit&timezone=America/Chicago`
  const res  = await fetch(url)
  const raw  = await res.json()
  const c = raw.current || {}
  const d = raw.daily   || {}
  return {
    sst:          parseFloat((c.sea_surface_temperature       ?? 78.0).toFixed(1)),
    waveHeight:   parseFloat((c.wave_height                   ?? 0.9).toFixed(1)),
    waveDir:      Math.round(c.wave_direction ?? 190),
    wavePeriod:   Math.round(c.wave_period    ?? 6),
    sstMaxToday:  parseFloat((d.sea_surface_temperature_max?.[0] ?? 78.5).toFixed(1)),
    waveMaxToday: parseFloat((d.wave_height_max?.[0]            ?? 1.4).toFixed(1))
  }
}

// ── INTERNAL: NASA FIRMS fires (California) ───────────────────────────────────
const CA_BOUNDS = { minLat: 32.5, maxLat: 42.0, minLon: -124.5, maxLon: -114.1 }

function parseFireCSV(csv) {
  const lines   = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const fires   = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    const row  = {}
    headers.forEach((h, idx) => { row[h] = vals[idx] })
    const lat = parseFloat(row.latitude)
    const lon = parseFloat(row.longitude)
    if (!isNaN(lat) && !isNaN(lon) &&
        lat >= CA_BOUNDS.minLat && lat <= CA_BOUNDS.maxLat &&
        lon >= CA_BOUNDS.minLon && lon <= CA_BOUNDS.maxLon) {
      fires.push({
        lat, lon,
        brightness: parseFloat(row.bright_ti4 || row.brightness || 350),
        confidence: row.confidence || 'n',
        frp:        parseFloat(row.frp || 5),
        acqDate:    row.acq_date  || new Date().toISOString().slice(0, 10),
        acqTime:    row.acq_time  || '1200',
        satellite:  row.satellite || 'SNPP',
        source:     'NASA FIRMS'
      })
    }
  }
  return fires
}

function getSimulatedFires() {
  const areas = [
    { name: 'Angeles NF',     lat: 34.32, lon: -118.01 },
    { name: 'Shasta',         lat: 40.65, lon: -122.44 },
    { name: 'Mendocino',      lat: 39.31, lon: -123.08 },
    { name: 'San Bernardino', lat: 34.24, lon: -117.21 },
    { name: 'Riverside Co',   lat: 33.73, lon: -116.84 },
    { name: 'Napa Valley',    lat: 38.51, lon: -122.27 },
    { name: 'Ventura Co',     lat: 34.27, lon: -119.01 },
    { name: 'Plumas NF',      lat: 40.01, lon: -120.72 }
  ]
  const fires = []
  areas.forEach(area => {
    if (Math.random() > 0.35) {
      const count = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < count; i++) {
        fires.push({
          lat: area.lat + (Math.random() - 0.5) * 0.5,
          lon: area.lon + (Math.random() - 0.5) * 0.5,
          brightness: 320 + Math.random() * 100,
          confidence: ['l', 'n', 'h'][Math.floor(Math.random() * 3)],
          frp:        Math.random() * 400 + 5,
          acqDate:    new Date().toISOString().slice(0, 10),
          acqTime:    `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}00`,
          satellite:  'SNPP',
          name:       area.name,
          source:     'simulated'
        })
      }
    }
  })
  return fires
}

async function fetchFiresUI() {
  try {
    const res  = await fetch(FIRMS_URL, { signal: AbortSignal.timeout(12000) })
    if (!res.ok) throw new Error(`FIRMS HTTP ${res.status}`)
    const csv  = await res.text()
    const fires = parseFireCSV(csv)
    if (fires.length > 0) return fires
    throw new Error('Empty FIRMS response')
  } catch (err) {
    console.warn('[WeatherAI] FIRMS fetch failed, using simulated data:', err.message)
    return getSimulatedFires()
  }
}

// ── INTERNAL: OSM roads via Overpass (per city, 10-min cache) ────────────────
const CITY_BBOXES = {
  la:    '33.80,-118.72,34.30,-117.75',
  nola:  '29.82,-90.38,30.08,-89.85',
  miami: '25.62,-80.44,25.90,-80.12'
}

async function fetchRoadsUI(city) {
  const bbox = CITY_BBOXES[city]
  if (!bbox) throw new Error(`Unknown city: ${city}`)
  const query = `[out:json][timeout:25];(way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|secondary)$"](${bbox}););out geom;`
  const res  = await fetch(OVERPASS, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `data=${encodeURIComponent(query)}`,
    signal:  AbortSignal.timeout(30000)
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  const json = await res.json()
  return (json.elements || [])
    .filter(el => el.type === 'way' && el.geometry?.length >= 2)
    .map(el => ({
      type:   el.tags?.highway ?? 'primary',
      name:   el.tags?.name   ?? '',
      coords: el.geometry.map(n => [n.lat, n.lon])
    }))
}

// ── INTERNAL: USGS Earthquakes (California, M2.5+, last 24h) ─────────────────
const CA_QUAKE_BOUNDS = { minLat: 32.5, maxLat: 42.0, minLon: -124.5, maxLon: -114.1 }

async function fetchQuakesUI() {
  const res = await fetch(USGS_QUAKES, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`USGS HTTP ${res.status}`)
  const json = await res.json()
  return (json.features || [])
    .filter(f => {
      const [lon, lat] = f.geometry.coordinates
      return lat >= CA_QUAKE_BOUNDS.minLat && lat <= CA_QUAKE_BOUNDS.maxLat &&
             lon >= CA_QUAKE_BOUNDS.minLon && lon <= CA_QUAKE_BOUNDS.maxLon
    })
    .map(f => ({
      lat:    f.geometry.coordinates[1],
      lon:    f.geometry.coordinates[0],
      depth:  parseFloat(f.geometry.coordinates[2].toFixed(1)),
      mag:    parseFloat(f.properties.mag?.toFixed(1) ?? 0),
      place:  f.properties.place ?? '',
      time:   f.properties.time,
      url:    f.properties.url ?? ''
    }))
    .filter(q => q.mag >= 2.5)
    .sort((a, b) => b.mag - a.mag)
    .slice(0, 60)
}

async function fetchWeatherJSON(region) {
  const r = REGIONS[region]
  const url = `${OPEN_METEO}?latitude=${r.lat}&longitude=${r.lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,` +
    `wind_direction_10m,cloud_cover,surface_pressure,apparent_temperature,uv_index,weather_code` +
    `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,uv_index_max,wind_speed_10m_max` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&timezone=${r.timezone}&forecast_days=7`

  const res  = await fetch(url)
  const raw  = await res.json()
  const c    = raw.current
  const d    = raw.daily || {}

  return {
    source:    'WeatherAI · Open-Meteo (free)',
    region,
    city:      r.city,
    state:     r.state,
    coords:    { lat: r.lat, lon: r.lon },
    timezone:  r.timezone,
    retrieved: new Date().toISOString(),
    cached_until: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    current: {
      temperature_f:    Math.round(c.temperature_2m ?? 72),
      feels_like_f:     Math.round(c.apparent_temperature ?? 70),
      humidity_pct:     Math.round(c.relative_humidity_2m ?? 75),
      rain_in_per_hr:   parseFloat((c.precipitation ?? 0).toFixed(2)),
      wind_speed_mph:   Math.round(c.wind_speed_10m ?? 8),
      wind_dir_deg:     Math.round(c.wind_direction_10m ?? 180),
      cloud_cover_pct:  Math.round(c.cloud_cover ?? 60),
      pressure_hpa:     Math.round(c.surface_pressure ?? 1013),
      uv_index:         Math.round(c.uv_index ?? 3),
      weather_code:     c.weather_code ?? 0
    },
    forecast_7day: d.time ? d.time.map((date, i) => ({
      date,
      temp_max_f:   Math.round(d.temperature_2m_max?.[i] ?? 75),
      temp_min_f:   Math.round(d.temperature_2m_min?.[i] ?? 60),
      precip_in:    parseFloat((d.precipitation_sum?.[i] ?? 0).toFixed(2)),
      uv_max:       Math.round(d.uv_index_max?.[i] ?? 3),
      wind_max_mph: Math.round(d.wind_speed_10m_max?.[i] ?? 10)
    })) : []
  }
}

async function fetchAQIJSON(region) {
  const r = REGIONS[region]
  const url = `${AIR_QUALITY}?latitude=${r.lat}&longitude=${r.lon}` +
    `&current=us_aqi,pm10,pm2_5,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide&timezone=auto`

  const res = await fetch(url)
  const raw = await res.json()
  const c   = raw.current || {}

  const aqi = Math.round(c.us_aqi ?? 42)
  const category =
    aqi <= 50  ? 'Good' :
    aqi <= 100 ? 'Moderate' :
    aqi <= 150 ? 'Unhealthy for Sensitive Groups' :
    aqi <= 200 ? 'Unhealthy' :
    aqi <= 300 ? 'Very Unhealthy' : 'Hazardous'

  return {
    source:    'WeatherAI · Open-Meteo Air Quality (free)',
    region,
    city:      r.city,
    coords:    { lat: r.lat, lon: r.lon },
    retrieved: new Date().toISOString(),
    cached_until: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    aqi: {
      us_aqi:             aqi,
      category,
      pm2_5_ugm3:         parseFloat((c.pm2_5 ?? 0).toFixed(1)),
      pm10_ugm3:          parseFloat((c.pm10  ?? 0).toFixed(1)),
      ozone_ugm3:         parseFloat((c.ozone ?? 0).toFixed(1)),
      nitrogen_dioxide_ugm3: parseFloat((c.nitrogen_dioxide ?? 0).toFixed(1)),
      sulphur_dioxide_ugm3:  parseFloat((c.sulphur_dioxide  ?? 0).toFixed(1)),
      carbon_monoxide_ugm3:  parseFloat((c.carbon_monoxide  ?? 0).toFixed(2))
    }
  }
}

// ── AIS Vessel Simulation — Honduras (seeded deterministic PRNG) ─────────────
function seededRng(seed) {
  let s = (seed ^ 0x12345678) >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = (s ^ (s >>> 16)) >>> 0
    return s / 0xffffffff
  }
}

const VESSEL_ROUTES = [
  // ── CONTAINER / CARGO ─────────────────────────────────────────────────────
  { mmsi:334201001, name:'CORTÉS EXPRESS',     type:71, typeLabel:'Container', flag:'HN', length:162, sLat:15.854, sLon:-87.943, eLat:23.15,  eLon:-82.36,  speed:13.5 },
  { mmsi:538123456, name:'MSC TEGUCIGALPA',    type:71, typeLabel:'Container', flag:'PA', length:220, sLat:15.866, sLon:-87.928, eLat: 9.35,  eLon:-79.91,  speed:14.2 },
  { mmsi:316104001, name:'MAERSK CORTÉS',      type:71, typeLabel:'Container', flag:'DK', length:298, sLat:16.12,  sLon:-87.55,  eLat:15.866, eLon:-87.928, speed:11.8 },
  { mmsi:334202002, name:'ATLANTIC FEEDER',    type:71, typeLabel:'Container', flag:'PA', length:145, sLat:15.866, sLon:-87.928, eLat:10.00,  eLon:-83.02,  speed:12.0 },
  { mmsi:334203003, name:'CARIBE TRADER',      type:70, typeLabel:'Cargo',     flag:'HN', length: 95, sLat:15.762, sLon:-87.461, eLat:15.866, eLon:-87.928, speed: 8.5 },
  { mmsi:477123456, name:'ORIENT STAR',        type:71, typeLabel:'Container', flag:'HK', length:335, sLat:15.10,  sLon:-88.00,  eLat:15.866, eLon:-87.928, speed:13.0 },
  { mmsi:248765432, name:'MSC MEDUSA',         type:71, typeLabel:'Container', flag:'MT', length:366, sLat:15.866, sLon:-87.928, eLat:36.15,  eLon:  5.35,  speed:15.5 },
  // ── REEFER (banana/fruit) ──────────────────────────────────────────────────
  { mmsi:366123001, name:'DOLE CHOLUTECA',     type:72, typeLabel:'Reefer',    flag:'US', length:185, sLat:15.762, sLon:-87.465, eLat:51.55,  eLon:  0.10,  speed:14.8 },
  { mmsi:366124002, name:'CHIQUITA ROATÁN',    type:72, typeLabel:'Reefer',    flag:'US', length:178, sLat:15.768, sLon:-86.788, eLat:25.77,  eLon:-80.19,  speed:15.2 },
  // ── TANKERS ───────────────────────────────────────────────────────────────
  { mmsi:334301001, name:'TANKER GOLFO I',     type:80, typeLabel:'Tanker',    flag:'HN', length:110, sLat:15.866, sLon:-87.928, eLat:15.767, eLon:-86.783, speed: 9.0 },
  { mmsi:351876543, name:'ESSO ISTMICO',       type:81, typeLabel:'Tanker',    flag:'PA', length:168, sLat:13.273, sLon:-87.621, eLat:13.420, eLon:-87.468, speed: 7.5 },
  { mmsi:334302002, name:'FUELS CARIBE',       type:80, typeLabel:'Tanker',    flag:'HN', length: 85, sLat:15.968, sLon:-85.895, eLat:15.866, eLon:-87.928, speed: 8.2 },
  // ── FERRIES / PASSENGER ───────────────────────────────────────────────────
  { mmsi:334401001, name:'ROATÁN EXPRESS',     type:60, typeLabel:'Ferry',     flag:'HN', length: 55, sLat:16.317, sLon:-86.534, eLat:15.767, eLon:-86.783, speed:18.5 },
  { mmsi:334401002, name:'UTILA PRINCESS III', type:60, typeLabel:'Ferry',     flag:'HN', length: 42, sLat:16.113, sLon:-86.899, eLat:15.767, eLon:-86.783, speed:16.2 },
  { mmsi:311456789, name:'CARNIVAL DESTINY',   type:60, typeLabel:'Cruise',    flag:'BS', length:272, sLat:16.375, sLon:-86.450, eLat:20.50,  eLon:-86.95,  speed:12.0 },
  // ── FISHING ───────────────────────────────────────────────────────────────
  { mmsi:334501001, name:'FV GARÍFUNA',        type:30, typeLabel:'Fishing',   flag:'HN', length: 28, sLat:15.90,  sLon:-87.10,  eLat:15.90,  eLon:-87.10,  speed: 3.2 },
  { mmsi:334501002, name:'FV CARIBE AZUL',     type:30, typeLabel:'Fishing',   flag:'HN', length: 24, sLat:16.20,  sLon:-86.80,  eLat:16.20,  eLon:-86.80,  speed: 2.8 },
  { mmsi:334501003, name:'FV MOSQUITIA',       type:30, typeLabel:'Fishing',   flag:'HN', length: 18, sLat:15.40,  sLon:-84.20,  eLat:15.40,  eLon:-84.20,  speed: 1.5 },
  { mmsi:334501004, name:'FV PUNTA PATUCA',    type:30, typeLabel:'Fishing',   flag:'HN', length: 22, sLat:15.80,  sLon:-84.90,  eLat:15.80,  eLon:-84.90,  speed: 2.1 },
  { mmsi:334501005, name:'FV MADRUGÓN',        type:30, typeLabel:'Fishing',   flag:'HN', length: 31, sLat:16.50,  sLon:-86.30,  eLat:16.50,  eLon:-86.30,  speed: 4.5 },
  { mmsi:334501006, name:'FV LEONA DEL MAR',   type:30, typeLabel:'Fishing',   flag:'HN', length: 26, sLat:13.05,  sLon:-87.80,  eLat:13.05,  eLon:-87.80,  speed: 3.8 },
  { mmsi:334501007, name:'FV GOLFO DULCE',     type:30, typeLabel:'Fishing',   flag:'HN', length: 20, sLat:13.28,  sLon:-87.70,  eLat:13.28,  eLon:-87.70,  speed: 2.2 },
  { mmsi:334501008, name:'FV BAHÍA TRUJILLO',  type:30, typeLabel:'Fishing',   flag:'HN', length: 19, sLat:15.90,  sLon:-86.00,  eLat:15.90,  eLon:-86.00,  speed: 2.7 },
  // ── NAVAL / MILITARY ──────────────────────────────────────────────────────
  { mmsi:334601001, name:'PATRULLERA HN-P1',   type:55, typeLabel:'Naval',     flag:'HN', length: 58, sLat:15.90,  sLon:-87.90,  eLat:16.40,  eLon:-86.20,  speed:22.0 },
  { mmsi:334601002, name:'PATRULLERA HN-P2',   type:55, typeLabel:'Naval',     flag:'HN', length: 42, sLat:13.35,  sLon:-87.65,  eLat:13.18,  eLon:-87.80,  speed:18.5 },
  { mmsi:334601003, name:'GUARDACOSTAS-01',    type:55, typeLabel:'Naval',     flag:'HN', length: 38, sLat:15.866, sLon:-87.940, eLat:15.95,  eLon:-87.50,  speed:15.0 },
  // ── GENERAL CARGO ─────────────────────────────────────────────────────────
  { mmsi:334701001, name:'CAFETALERO COPÁN',   type:70, typeLabel:'Cargo',     flag:'HN', length: 72, sLat:15.968, sLon:-85.892, eLat:18.48,  eLon:-88.19,  speed: 7.8 },
  { mmsi:334702002, name:'LIBERTAD CARIBE',    type:70, typeLabel:'Cargo',     flag:'HN', length: 68, sLat:15.762, sLon:-87.461, eLat:15.968, eLon:-85.892, speed: 8.5 },
  { mmsi:388765432, name:'LIBERTY COASTER',    type:70, typeLabel:'Cargo',     flag:'JM', length: 88, sLat:17.99,  sLon:-76.80,  eLat:15.866, eLon:-87.928, speed: 9.2 },
  // ── SERVICE / TUGS ────────────────────────────────────────────────────────
  { mmsi:334801001, name:'REMOLCADOR ENP-1',   type:21, typeLabel:'Tug',       flag:'HN', length: 35, sLat:15.868, sLon:-87.920, eLat:15.874, eLon:-87.930, speed: 3.5 },
  { mmsi:334801002, name:'BOYA TENDER HN-01',  type:18, typeLabel:'Service',   flag:'HN', length: 28, sLat:15.95,  sLon:-87.60,  eLat:16.10,  eLon:-87.20,  speed: 5.2 },
  // ── PACIFIC COAST ─────────────────────────────────────────────────────────
  { mmsi:334901001, name:'PACÍFICO EXPRESS',   type:60, typeLabel:'RoPax',     flag:'HN', length: 82, sLat:13.275, sLon:-87.621, eLat:13.418, eLon:-87.465, speed:11.5 },
  { mmsi:334902002, name:'FONSECA CARRIER',    type:70, typeLabel:'Cargo',     flag:'HN', length: 65, sLat:13.34,  sLon:-87.72,  eLat:13.10,  eLon:-86.65,  speed: 7.0 },
]

// ── GULF OF MEXICO — AIS-SIM fleet — all routes fully within Gulf bounds ──────
// Bounds: lat 24–32°N, lon -98 to -80.5°W. No route endpoint falls outside these limits.
const GULF_VESSEL_ROUTES = [
  // ── DAWN SERVICES FLEET (dawnoffshore.com — New Orleans) ──────────────────
  { mmsi:366501001, name:'M/V SOUTHERN DAWN',   type:21, typeLabel:'Tug',     flag:'US', length: 37, sLat:29.942, sLon:-90.061, eLat:27.50, eLon:-89.80, speed: 8.2 },
  { mmsi:366501002, name:'M/V CARIBBEAN DAWN',  type:21, typeLabel:'Tug',     flag:'US', length: 37, sLat:29.951, sLon:-90.058, eLat:27.75, eLon:-82.65, speed: 9.0 },
  { mmsi:366501003, name:'M/V GULF DAWN',       type:21, typeLabel:'Tug',     flag:'US', length: 29, sLat:29.730, sLon:-95.250, eLat:27.80, eLon:-93.40, speed: 7.5 },
  { mmsi:366501004, name:'M/V BREAK OF DAWN',   type:21, typeLabel:'Tug',     flag:'US', length: 27, sLat:29.300, sLon:-94.800, eLat:27.90, eLon:-92.50, speed: 7.0 },
  { mmsi:366501005, name:'M/V INDIAN DAWN',     type:21, typeLabel:'Tug',     flag:'US', length: 33, sLat:30.691, sLon:-88.040, eLat:29.95, eLon:-90.06, speed: 8.5 },
  { mmsi:366501006, name:'M/V BAYOU DAWN',      type:21, typeLabel:'Tug',     flag:'US', length: 23, sLat:29.960, sLon:-89.920, eLat:29.90, eLon:-89.60, speed: 5.5 },
  // ── OFFSHORE SUPPLY VESSELS (OSV) ─────────────────────────────────────────
  { mmsi:366601001, name:'HARVEY SUBSEA',       type:21, typeLabel:'OSV',     flag:'US', length: 92, sLat:29.96,  sLon:-90.07,  eLat:28.00, eLon:-90.50, speed:10.5 },
  { mmsi:366601002, name:'CHET MORRISON 1',     type:21, typeLabel:'OSV',     flag:'US', length: 85, sLat:28.50,  sLon:-90.30,  eLat:29.96, eLon:-90.07, speed: 9.8 },
  { mmsi:366601003, name:'GULF SUPPLIER',       type:21, typeLabel:'OSV',     flag:'US', length: 78, sLat:27.80,  sLon:-91.00,  eLat:27.50, eLon:-90.80, speed:11.0 },
  // ── TANKERS ───────────────────────────────────────────────────────────────
  { mmsi:366701001, name:'NANSEN SPIRIT',       type:80, typeLabel:'Tanker',  flag:'US', length:183, sLat:29.73,  sLon:-95.25,  eLat:29.95, eLon:-90.06, speed:12.0 },
  { mmsi:366701002, name:'GULF ENERGY',         type:80, typeLabel:'Tanker',  flag:'US', length:152, sLat:27.80,  sLon:-97.40,  eLat:29.73, eLon:-95.25, speed:11.5 },
  { mmsi:538601001, name:'OVERSEAS HOUSTON',    type:80, typeLabel:'Tanker',  flag:'MH', length:228, sLat:29.73,  sLon:-95.25,  eLat:27.75, eLon:-82.65, speed:13.5 },
  // ── CONTAINER / CARGO ─────────────────────────────────────────────────────
  { mmsi:366801001, name:'CMA CGM MISSISSIPPI', type:71, typeLabel:'Container',flag:'US', length:299, sLat:29.96,  sLon:-90.07,  eLat:29.73, eLon:-95.25, speed:14.2 },
  { mmsi:248801001, name:'MSC GALVESTON',       type:71, typeLabel:'Container',flag:'MT', length:366, sLat:29.30,  sLon:-94.80,  eLat:30.69, eLon:-88.04, speed:15.0 },
  { mmsi:366801002, name:'RIVER ENTERPRISE',    type:70, typeLabel:'Cargo',   flag:'US', length: 95, sLat:29.95,  sLon:-90.07,  eLat:30.69, eLon:-88.04, speed: 8.0 },
  // ── BARGES (common on Mississippi River / Gulf Intracoastal Waterway) ─────
  { mmsi:366002001, name:'CRESCENT BARGE NOR',  type:90, typeLabel:'Barge',   flag:'US', length:180, sLat:29.95,  sLon:-89.95,  eLat:29.20, eLon:-90.80, speed: 4.2 },
  { mmsi:366002002, name:'GULF TOWING 1',       type:90, typeLabel:'Barge',   flag:'US', length:152, sLat:29.73,  sLon:-95.10,  eLat:29.96, eLon:-90.07, speed: 5.5 },
  // ── FISHING (Gulf shrimpers) ───────────────────────────────────────────────
  { mmsi:366901001, name:'FV CAJUN PRIDE',      type:30, typeLabel:'Fishing', flag:'US', length: 24, sLat:29.10,  sLon:-90.70,  eLat:29.10, eLon:-90.70, speed: 3.5 },
  { mmsi:366901002, name:'FV GULF STAR',        type:30, typeLabel:'Fishing', flag:'US', length: 18, sLat:28.90,  sLon:-91.50,  eLat:28.90, eLon:-91.50, speed: 2.8 },
  // ── CRUISE / COAST GUARD ──────────────────────────────────────────────────
  { mmsi:311701001, name:'CARNIVAL VALOR',      type:60, typeLabel:'Cruise',  flag:'BS', length:290, sLat:29.96,  sLon:-90.06,  eLat:27.75, eLon:-82.65, speed:20.0 },
  { mmsi:366001001, name:'USCGC FORWARD',       type:55, typeLabel:'USCG',    flag:'US', length: 64, sLat:29.96,  sLon:-90.04,  eLat:27.80, eLon:-97.00, speed:18.0 },
]

const GULF_PORTS_SIM = [
  { name: 'New Orleans',     lat: 29.950, lon: -90.061 },
  { name: 'Houston',         lat: 29.730, lon: -95.250 },
  { name: 'Galveston',       lat: 29.300, lon: -94.800 },
  { name: 'Mobile',          lat: 30.691, lon: -88.040 },
  { name: 'Corpus Christi',  lat: 27.800, lon: -97.400 },
  { name: 'Tampa',           lat: 27.750, lon: -82.650 },
]

// Gulf of Mexico WMM-2025 baseline (29°N, 90°W)
const GULF_WMM = { declination: -3.5, inclination: 59.0, intensity: 52000, kp: 0 }

function aisVesselColor(type) {
  if (type === 30) return '#00ff88'            // fishing — green
  if (type === 21 || type === 22) return '#ffaa00'  // tug — amber
  if (type >= 60 && type <= 69) return '#ffd700'    // passenger/cruise — gold
  if (type === 71 || type === 72) return '#00ccff'  // container/reefer — cyan
  if (type >= 70 && type <= 79) return '#00aaff'    // cargo — light blue
  if (type >= 80 && type <= 89) return '#ff9900'    // tanker — orange
  if (type === 55 || type === 35) return '#ff4444'  // military/naval — red
  if (type === 90) return '#cc88ff'                 // barge — purple
  return '#aaaaaa'                                  // other
}

// HN_PORTS_SIM mirrors Marine.jsx HN_PORTS for server-side SNN context
const HN_PORTS_SIM = [
  { name: 'Puerto Cortés',   lat: 15.866, lon: -87.928 },
  { name: 'La Ceiba',        lat: 15.767, lon: -86.783 },
  { name: 'Puerto Castilla', lat: 15.968, lon: -85.892 },
  { name: 'Tela',            lat: 15.762, lon: -87.461 },
  { name: 'Puerto Trujillo', lat: 15.923, lon: -85.970 },
  { name: 'Roatán',          lat: 16.317, lon: -86.534 },
  { name: 'Utila',           lat: 16.113, lon: -86.899 },
  { name: 'Amapala',         lat: 13.283, lon: -87.621 },
  { name: 'Pto San Lorenzo', lat: 13.420, lon: -87.468 },
  { name: 'Puerto Lempira',  lat: 15.267, lon: -83.767 },
]

// ── Shared AIS simulation engine — drives both HN and Gulf fleets ─────────────
// routes: array of route objects; ports: array of port objects;
// geomagCtx: WMM baseline; seedOffset: integer to separate slot namespaces;
// boundsFilter: optional {minLat, maxLat, minLon, maxLon} — drop vessels outside box
function simulateVesselFleet(routes, ports, geomagCtx, seedOffset = 0, boundsFilter = null) {
  const slot    = Math.floor(Date.now() / 300000)
  const hourUTC = new Date().getUTCHours()
  const vessels = []
  for (let i = 0; i < routes.length; i++) {
    const v = routes[i]
    const rng = seededRng(slot * 10000 + i * 997 + seedOffset)
    const dlat = v.eLat - v.sLat
    const dlon = v.eLon - v.sLon
    const routeDeg = Math.sqrt(dlat * dlat + dlon * dlon)
    const degPerSlot = v.speed * 0.0145 / 12
    let lat, lon, heading, cog
    if (routeDeg < 0.05) {
      lat     = v.sLat + (rng() - 0.5) * 0.12
      lon     = v.sLon + (rng() - 0.5) * 0.12
      heading = Math.round(rng() * 360)
      cog     = heading
    } else {
      const totalSlots = Math.max(1, routeDeg / degPerSlot)
      const progress   = (slot % Math.ceil(totalSlots)) / Math.ceil(totalSlots)
      lat     = v.sLat + dlat * progress + (rng() - 0.5) * 0.015
      lon     = v.sLon + dlon * progress + (rng() - 0.5) * 0.015
      heading = Math.round(((Math.atan2(dlon, dlat) * 180 / Math.PI) + 360) % 360)
      cog     = (heading + Math.round((rng() - 0.5) * 10) + 360) % 360
    }
    lat = parseFloat(lat.toFixed(4))
    lon = parseFloat(lon.toFixed(4))
    // Apply geographic bounds filter if provided
    if (boundsFilter) {
      const { minLat, maxLat, minLon, maxLon } = boundsFilter
      if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) continue
    }
    const speed = parseFloat((v.speed + (rng() - 0.5) * 0.6).toFixed(1))
    const vessel = {
      mmsi:      v.mmsi,
      name:      v.name,
      type:      v.type,
      typeLabel: v.typeLabel,
      flag:      v.flag,
      length:    v.length,
      lat,
      lon,
      speed,
      heading,
      cog,
      status:    'UNDERWAY',
      color:     aisVesselColor(v.type),
      source:    'AIS-SIM',
      originLat: parseFloat(v.sLat.toFixed(4)),
      originLon: parseFloat(v.sLon.toFixed(4)),
      destLat:   parseFloat(v.eLat.toFixed(4)),
      destLon:   parseFloat(v.eLon.toFixed(4)),
      isRoute:   routeDeg >= 0.05
    }
    const snnResult = computeMarineSNN(vessel, { ports, geomag: geomagCtx, hourUTC, nearbyVessels: [] })
    vessel.snn       = snnResult.neat
    vessel.snnDetail = snnResult
    vessels.push(vessel)
  }
  return { vessels, slot, generatedAt: new Date().toISOString() }
}

function generateAISVessels(geomag = null) {
  const geoCtx   = geomag || { kp: 0, declination: -0.82, inclination: 46.15, intensity: 41125 }
  const { vessels, slot, generatedAt } = simulateVesselFleet(VESSEL_ROUTES, HN_PORTS_SIM, geoCtx, 0, null)
  return {
    vessels,
    count:       vessels.length,
    slot,
    generatedAt,
    source:      'WeatherAI Maritime · AIS Simulated (Honduras)',
    bounds:      { minLat: 12.8, maxLat: 17.2, minLon: -90.0, maxLon: -82.5 }
  }
}

// Gulf of Mexico bounds filter — lat 24–32°N, lon -98 to -80.5°W
const GULF_BOUNDS = { minLat: 24.0, maxLat: 32.0, minLon: -98.0, maxLon: -80.5 }

// ── Vessel trail — deterministic 24h position history from slot arithmetic ───
function generateGulfVessels(geomag = null) {
  const geoCtx   = geomag || GULF_WMM
  const { vessels, slot, generatedAt } = simulateVesselFleet(
    GULF_VESSEL_ROUTES, GULF_PORTS_SIM, geoCtx, 88888, GULF_BOUNDS
  )
  return {
    vessels,
    count:       vessels.length,
    slot,
    generatedAt,
    source:      'WeatherAI Maritime · AIS Simulated (Gulf of Mexico)',
    bounds:      GULF_BOUNDS
  }
}

function generateVesselTrail(mmsi, hoursBack = 24) {
  let routeIdx = VESSEL_ROUTES.findIndex(v => v.mmsi === mmsi)
  let routeList = VESSEL_ROUTES
  let routeOffset = 0
  if (routeIdx === -1) {
    routeIdx = GULF_VESSEL_ROUTES.findIndex(v => v.mmsi === mmsi)
    routeList = GULF_VESSEL_ROUTES
    routeOffset = 88888
  }
  if (routeIdx === -1) return null
  const v           = routeList[routeIdx]
  const currentSlot = Math.floor(Date.now() / 300000)
  const dlat        = v.eLat - v.sLat
  const dlon        = v.eLon - v.sLon
  const routeDeg    = Math.sqrt(dlat * dlat + dlon * dlon)
  const degPerSlot  = v.speed * 0.0145 / 12
  const points      = []

  for (let h = hoursBack; h >= 0; h--) {
    const slot = currentSlot - h * 12            // 12 slots × 5 min = 1 hour
    const rng  = seededRng(slot * 10000 + routeIdx * 997 + routeOffset)
    let lat, lon
    if (routeDeg < 0.05) {
      lat = v.sLat + (rng() - 0.5) * 0.12
      lon = v.sLon + (rng() - 0.5) * 0.12
    } else {
      const totalSlots = Math.max(1, routeDeg / degPerSlot)
      const progress   = (slot % Math.ceil(totalSlots)) / Math.ceil(totalSlots)
      lat = v.sLat + dlat * progress + (rng() - 0.5) * 0.015
      lon = v.sLon + dlon * progress + (rng() - 0.5) * 0.015
    }
    points.push({
      lat:       parseFloat(lat.toFixed(4)),
      lon:       parseFloat(lon.toFixed(4)),
      hoursAgo:  h,
      timestamp: new Date(Date.now() - h * 3600000).toISOString()
    })
  }

  const totalDistKm = points.slice(1).reduce((sum, pt, i) => {
    const prev = points[i]
    const R = 6371
    const dL = (pt.lat - prev.lat) * Math.PI / 180
    const dO = (pt.lon - prev.lon) * Math.PI / 180
    const a  = Math.sin(dL / 2) ** 2 +
               Math.cos(prev.lat * Math.PI / 180) * Math.cos(pt.lat * Math.PI / 180) *
               Math.sin(dO / 2) ** 2
    return sum + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }, 0)

  return {
    mmsi,
    name:         v.name,
    typeLabel:    v.typeLabel,
    flag:         v.flag,
    trail:        points,
    hoursBack,
    totalDistKm:  Math.round(totalDistKm),
    source:       'AIS-SIM'
  }
}

// ── aisstream.io: real-time AIS via WebSocket (FREE, no hardware needed) ─────
// Sign up at https://aisstream.io/ with GitHub → get API key → set AISSTREAM_API_KEY
const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream'
const HN_BOUNDS     = { latmin: 13, latmax: 17, lonmin: -89.5, lonmax: -83 }

function aisTypeLabel(type) {
  if (type === 30) return 'Fishing'
  if (type === 35) return 'Military'
  if (type === 55) return 'Naval'
  if (type >= 60 && type <= 65) return 'Ferry'
  if (type >= 66 && type <= 69) return 'Passenger'
  if (type === 71) return 'Container'
  if (type === 72) return 'Reefer'
  if (type >= 70 && type <= 79) return 'Cargo'
  if (type >= 80 && type <= 89) return 'Tanker'
  if (type === 21 || type === 22) return 'Tug'
  if (type === 18) return 'Service'
  return 'Vessel'
}

function snnForVessel(vessel, geomag) {
  const hourUTC = new Date().getUTCHours()
  const result  = computeMarineSNN(vessel, {
    ports:         HN_PORTS_SIM,
    geomag:        geomag || { kp: 0, declination: -0.82, inclination: 46.15, intensity: 41125 },
    hourUTC,
    nearbyVessels: []
  })
  return result
}

// Shared aisstream.io fetcher — streams for `durationMs`, collects unique vessels by MMSI
function fetchAISStream(boundingBox, label, durationMs = 12000) {
  const apiKey = process.env.AISSTREAM_API_KEY
  if (!apiKey) {
    console.info(`[${label}] AISSTREAM_API_KEY not set — skipping live AIS`)
    return Promise.resolve([])
  }
  return new Promise((resolve) => {
    const vessels = new Map()
    let settled   = false
    const done = () => {
      if (settled) return
      settled = true
      const list = Array.from(vessels.values())
      console.info(`[${label}] aisstream.io: ${list.length} unique vessels collected`)
      resolve(list)
    }
    const timer = setTimeout(done, durationMs)

    let ws
    try {
      ws = new WebSocket(AISSTREAM_URL)
    } catch (err) {
      console.warn(`[${label}] aisstream.io WebSocket create failed:`, err.message)
      clearTimeout(timer)
      resolve([])
      return
    }

    ws.on('open', () => {
      ws.send(JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: [boundingBox],
        FilterMessageTypes: ['PositionReport', 'ShipStaticData']
      }))
    })

    // Static data cache keyed by MMSI (for name/callsign/dest/type)
    const staticCache = new Map()

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw)
        const mmsi = msg?.MetaData?.MMSI
        if (!mmsi) return

        if (msg.MessageType === 'ShipStaticData') {
          const s = msg.Message?.ShipStaticData || {}
          staticCache.set(mmsi, {
            name:     (s.Name || '').trim(),
            callsign: (s.CallSign || '').trim(),
            dest:     (s.Destination || '').trim(),
            type:     parseInt(s.Type || 0, 10),
          })
        }

        if (msg.MessageType === 'PositionReport') {
          const p   = msg.Message?.PositionReport || {}
          const lat = parseFloat(msg.MetaData?.latitude ?? p.Latitude)
          const lon = parseFloat(msg.MetaData?.longitude ?? p.Longitude)
          if (!isFinite(lat) || !isFinite(lon)) return

          const stat   = staticCache.get(mmsi) || {}
          const type   = stat.type || 0
          const sog    = parseFloat(p.Sog || 0)
          const cog    = parseFloat(p.Cog || 0)
          const hdg    = parseInt(p.TrueHeading || Math.round(cog), 10)
          const navSt  = parseInt(p.NavigationalStatus ?? p.Status ?? 0, 10)

          vessels.set(mmsi, {
            mmsi,
            name:      stat.name || (msg.MetaData?.ShipName || `VESSEL ${mmsi}`).trim(),
            type,
            typeLabel: aisTypeLabel(type),
            flag:      '??',
            length:    null,
            lat:       parseFloat(lat.toFixed(4)),
            lon:       parseFloat(lon.toFixed(4)),
            speed:     parseFloat(sog.toFixed(1)),
            heading:   isFinite(hdg) && hdg >= 0 && hdg <= 360 ? hdg : Math.round(cog),
            cog:       parseFloat(cog.toFixed(1)),
            status:    navSt === 1 ? 'AT ANCHOR' : navSt === 5 ? 'MOORED' : 'UNDERWAY',
            color:     aisVesselColor(type),
            source:    'AIS_LIVE',
            dest:      stat.dest || '',
            callsign:  stat.callsign || '',
            isRoute:   false,
            originLat: null, originLon: null, destLat: null, destLon: null,
          })
        }
      } catch { /* ignore parse errors */ }
    })

    ws.on('error', (err) => {
      console.warn(`[${label}] aisstream.io error:`, err.message)
      clearTimeout(timer)
      done()
    })

    ws.on('close', () => {
      clearTimeout(timer)
      done()
    })

    // Graceful close after durationMs so server flushes its buffer first
    setTimeout(() => { try { ws.close() } catch { } }, durationMs - 500)
  })
}

async function fetchAISHub() {
  // Honduras bounding box: [[latMin, lonMin], [latMax, lonMax]]
  return fetchAISStream(
    [[HN_BOUNDS.latmin, HN_BOUNDS.lonmin], [HN_BOUNDS.latmax, HN_BOUNDS.lonmax]],
    'MarineAI'
  )
}

// ── Global Fishing Watch — real fishing vessel events in Honduras waters ─────
const GFW_BASE     = 'https://gateway.api.globalfishingwatch.org/v3'
const GFW_TTL      = 10 * 60 * 1000   // 10 min
const HN_POLY      = [[-89.5,13.0],[-83.0,13.0],[-83.0,17.0],[-89.5,17.0],[-89.5,13.0]]

async function fetchGFW() {
  const apiKey = process.env.GFW_API_KEY
  if (!apiKey) {
    console.info('[MarineAI] GFW_API_KEY not set — skipping GFW live data')
    return []
  }
  const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().slice(0, 10)
  const today     = new Date().toISOString().slice(0, 10)
  const body      = JSON.stringify({
    datasets:  ['public-global-fishing-events:latest'],
    startDate: yesterday,
    endDate:   today,
    limit:     50,
    geometry:  { type: 'Polygon', coordinates: [HN_POLY] }
  })
  try {
    const res = await fetch(`${GFW_BASE}/events`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
      signal:  AbortSignal.timeout(12000)
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.warn(`[MarineAI] GFW HTTP ${res.status}: ${txt.slice(0, 200)}`)
      return []
    }
    const json    = await res.json()
    const entries = json.entries || []

    // Deduplicate by MMSI — keep the most recent event per vessel
    const byMmsi = new Map()
    for (const e of entries) {
      const mmsi = parseInt(e.vessel?.ssvid || 0, 10)
      if (!mmsi || !e.position?.lat || !e.position?.lon) continue
      if (!byMmsi.has(mmsi) || new Date(e.start) > new Date(byMmsi.get(mmsi).start))
        byMmsi.set(mmsi, e)
    }

    const vessels = []
    for (const e of byMmsi.values()) {
      const mmsi  = parseInt(e.vessel.ssvid, 10)
      const speed = parseFloat((e.vessel?.speed ?? 3.5).toFixed(1))
      vessels.push({
        mmsi,
        name:         ((e.vessel.shipname || e.vessel.name || `GFW-${mmsi}`)).trim().toUpperCase(),
        type:         30,
        typeLabel:    'Fishing',
        flag:         (e.vessel.flag || 'HN').slice(0, 2).toUpperCase(),
        length:       null,
        lat:          parseFloat(parseFloat(e.position.lat).toFixed(4)),
        lon:          parseFloat(parseFloat(e.position.lon).toFixed(4)),
        speed,
        heading:      Math.round(e.vessel?.course ?? (Math.random() * 360)),
        cog:          parseFloat((e.vessel?.course ?? 0).toFixed(1)),
        status:       e.type === 'fishing' ? 'FISHING' : 'UNDERWAY',
        color:        '#ffaa00',
        source:       'GFW_LIVE',
        dest:         '',
        callsign:     (e.vessel.callsign || '').trim(),
        isRoute:      false,
        originLat:    null, originLon: null, destLat: null, destLon: null,
        gfwEventType: e.type,
        lastSeen:     e.start
      })
    }
    console.info(`[MarineAI] GFW: ${vessels.length} fishing vessels in Honduras waters`)
    return vessels.filter(v => isFinite(v.lat) && isFinite(v.lon))
  } catch (err) {
    console.warn('[MarineAI] GFW fetch failed:', err.message)
    return []
  }
}

// ── SatNOGS — AIS satellite coverage with real TLE-based pass computation ────
const SATNOGS_DB   = 'https://db.satnogs.org/api'
const SATNOGS_NET  = 'https://network.satnogs.org/api'
const TLE_API      = 'https://tle.ivanstanojevic.me/api/tle'

// Honduras ground observer (Caribbean coast, Trujillo area — good horizon)
const HN_OBS       = { lat: 15.5, lon: -87.1, altKm: 0.1 }
const HN_LAT_RAD   = 15.5  * Math.PI / 180
const HN_LON_RAD   = -87.1 * Math.PI / 180
const RE           = 6371.0      // km
const MU           = 398600.4418 // km^3/s^2
const J2           = 1.08263e-3
const WE           = 7.2921150e-5 // rad/s  Earth rotation

// AIS/VDES VHF band: 157–163 MHz (AIS ch A+B at 161.975/162.025 MHz, VDES nearby)
const AIS_FREQ_LOW  = 157000000  // Hz
const AIS_FREQ_HIGH = 163000000  // Hz

// Fallback list used only if SatNOGS DB is unreachable
const FALLBACK_NORADS = [42828, 43790, 55107]  // NORSAT-2, EAGLET-I, AAC-AIS-SAT1

// Query SatNOGS DB transmitter API to dynamically discover active AIS/VDES satellites
async function discoverAISSatellites() {
  const url = `${SATNOGS_DB}/transmitters/?format=json&status=active`
  const res  = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`SatNOGS DB HTTP ${res.status}`)
  const transmitters = await res.json()
  if (!Array.isArray(transmitters)) throw new Error('Unexpected SatNOGS DB response shape')

  const seenNorads = new Set()
  const discovered = []

  for (const t of transmitters) {
    const dl   = t.downlink_low || 0
    const desc = (t.description || '').toLowerCase()
    const inAISBand = dl >= AIS_FREQ_LOW && dl <= AIS_FREQ_HIGH
    const isAISDesc = desc.includes('ais') || desc.includes('vdes') || desc.includes('vessel')

    if ((inAISBand || isAISDesc) && t.norad_cat_id && !seenNorads.has(t.norad_cat_id)) {
      seenNorads.add(t.norad_cat_id)
      discovered.push({
        norad: t.norad_cat_id,
        name:  t.description || `SAT-${t.norad_cat_id}`,
        freq:  dl,
        mode:  t.mode
      })
    }
  }

  console.info(`[MarineAI] SatNOGS DB discovered ${discovered.length} AIS/VDES satellites`)
  return discovered  // [{ norad, name, freq, mode }, ...]
}

// Parse a TLE into orbital elements
function parseTLE(tle1, tle2, name) {
  const n0   = parseFloat(tle2.substring(52, 63)) * 2 * Math.PI / 86400  // rad/s
  const a    = Math.pow(MU / (n0 * n0), 1 / 3)                           // km
  const ecc  = parseFloat('0.' + tle2.substring(26, 33))
  const incl = parseFloat(tle2.substring(8, 16))  * Math.PI / 180
  const raan = parseFloat(tle2.substring(17, 25)) * Math.PI / 180
  const argp = parseFloat(tle2.substring(34, 42)) * Math.PI / 180
  const M0   = parseFloat(tle2.substring(43, 51)) * Math.PI / 180

  // Epoch: YYDDD.FRACTION in col 18-32 of line 1
  const es   = tle1.substring(18, 32)
  const eYr  = parseInt(es.substring(0, 2))
  const eDoy = parseFloat(es.substring(2))
  const yr4  = eYr >= 57 ? 1900 + eYr : 2000 + eYr
  const jan1 = Date.UTC(yr4, 0, 1, 0, 0, 0, 0)
  const epochMs = jan1 + (eDoy - 1) * 86400000

  const periodMin = 2 * Math.PI / n0 / 60
  return { name, n0, a, ecc, incl, raan, argp, M0, epochMs, periodMin, norad: parseInt(tle2.substring(2, 7)) }
}

// Propagate satellite position to time tMs — simplified SGP4 (two-body + J2 nodal regression)
function propagatePos(elem, tMs) {
  const { n0, a, ecc, incl, raan, argp, M0, epochMs } = elem
  const dt    = (tMs - epochMs) / 1000  // seconds since TLE epoch
  const p     = a * (1 - ecc * ecc)
  const draan = -1.5 * J2 * (RE / p) ** 2 * n0 * Math.cos(incl)
  const dargp =  0.75 * J2 * (RE / p) ** 2 * n0 * (5 * Math.cos(incl) ** 2 - 1)
  const M     = M0 + n0 * dt
  const raanT = raan + draan * dt
  const argpT = argp + dargp * dt

  // Kepler equation: E = M + e*sin(E)
  let E = M
  for (let i = 0; i < 10; i++) E = M + ecc * Math.sin(E)

  const nu = 2 * Math.atan2(Math.sqrt(1 + ecc) * Math.sin(E / 2), Math.sqrt(1 - ecc) * Math.cos(E / 2))
  const r  = a * (1 - ecc * Math.cos(E))
  const u  = nu + argpT

  // ECI Cartesian
  const x = r * (Math.cos(raanT) * Math.cos(u) - Math.sin(raanT) * Math.sin(u) * Math.cos(incl))
  const y = r * (Math.sin(raanT) * Math.cos(u) + Math.cos(raanT) * Math.sin(u) * Math.cos(incl))
  const z = r * (Math.sin(u) * Math.sin(incl))

  // GMST for ECI → ECEF
  const jd   = tMs / 86400000 + 2440587.5
  const gmst = ((280.46061837 + 360.98564736629 * (jd - 2451545)) * Math.PI / 180)

  // Satellite geodetic lat/lon from ECI
  const lonECI = Math.atan2(y, x)
  const lonGeo = ((lonECI - gmst) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI
  const latGeo = Math.asin(z / r)

  // Convert to ECEF for elevation calc
  const satX = r * Math.cos(latGeo) * Math.cos(lonGeo + gmst)
  const satY = r * Math.cos(latGeo) * Math.sin(lonGeo + gmst)
  const satZ = r * Math.sin(latGeo)

  return { x: satX, y: satY, z: satZ, r, lat: latGeo, lon: lonGeo, gmst }
}

// Gulf of Mexico ground observer (offshore platform near New Orleans)
const GULF_OBS     = { lat: 28.5, lon: -90.5, altKm: 0.0 }
const GULF_LAT_RAD = 28.5  * Math.PI / 180
const GULF_LON_RAD = -90.5 * Math.PI / 180

// Compute elevation angle of satellite above observer horizon (degrees)
// obs: { lat, lon, altKm }, obsLatRad, obsLonRad — defaults to Honduras
function computeElevation(sat, tMs, obs = HN_OBS, obsLatRad = HN_LAT_RAD, obsLonRad = HN_LON_RAD) {
  const jd   = tMs / 86400000 + 2440587.5
  const gmst = ((280.46061837 + 360.98564736629 * (jd - 2451545)) * Math.PI / 180)
  const lst  = obsLonRad + gmst  // local sidereal time

  const cosLat = Math.cos(obsLatRad)
  const sinLat = Math.sin(obsLatRad)
  const rObs   = RE + obs.altKm

  // Observer ECEF
  const ox = rObs * cosLat * Math.cos(lst)
  const oy = rObs * cosLat * Math.sin(lst)
  const oz = rObs * sinLat

  // Range vector
  const pos = propagatePos(sat, tMs)
  const rx   = pos.x - ox
  const ry   = pos.y - oy
  const rz   = pos.z - oz
  const rng  = Math.sqrt(rx * rx + ry * ry + rz * rz)

  // Observer zenith unit vector
  const zx = cosLat * Math.cos(lst)
  const zy = cosLat * Math.sin(lst)
  const zz = sinLat

  const elev = Math.asin((rx * zx + ry * zy + rz * zz) / rng) * 180 / Math.PI
  return { elev, range: rng }
}

// Predict satellite passes over a ground observer in a time window
function predictPasses(elem, startMs, obs = HN_OBS, obsLatRad = HN_LAT_RAD, obsLonRad = HN_LON_RAD, windowMs = 24 * 3600000, minElev = 5) {
  const step    = 30000  // 30-second steps
  const endMs   = startMs + windowMs
  const passes  = []
  let inPass    = false
  let aosMs, maxEl

  for (let t = startMs; t < endMs; t += step) {
    const { elev } = computeElevation(elem, t, obs, obsLatRad, obsLonRad)
    if (elev > minElev) {
      if (!inPass) { inPass = true; aosMs = t; maxEl = elev }
      else if (elev > maxEl) maxEl = elev
    } else if (inPass) {
      passes.push({
        aos:       new Date(aosMs).toISOString(),
        los:       new Date(t).toISOString(),
        aosMs,
        losMs:     t,
        maxEl:     parseFloat(maxEl.toFixed(1)),
        durationMin: Math.round((t - aosMs) / 60000)
      })
      inPass = false
      if (passes.length >= 6) break  // return first 6 passes
    }
  }
  return passes
}

// Fetch TLE from free API
async function fetchTLE(norad) {
  const res = await fetch(`${TLE_API}/${norad}`, { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error(`TLE HTTP ${res.status} for NORAD ${norad}`)
  const j = await res.json()
  if (!j.line1 || !j.line2) throw new Error(`TLE missing lines for NORAD ${norad}`)
  return parseTLE(j.line1, j.line2, j.name || `SAT-${norad}`)
}

// Core SatNOGS coverage computation — parameterized by observer location
async function computeSatNOGSCoverage(obs, obsLatRad, obsLonRad, regionLabel) {
  const now = Date.now()

  // Step 1: Discover AIS/VDES satellites dynamically from SatNOGS DB
  let discovered
  try {
    discovered = await discoverAISSatellites()
  } catch (err) {
    console.warn(`[MarineAI/${regionLabel}] SatNOGS DB discovery failed, using fallback list:`, err.message)
    discovered = FALLBACK_NORADS.map(n => ({ norad: n, name: `SAT-${n}` }))
  }

  // Step 2: Fetch TLEs in parallel for all discovered satellites
  const tleResults = await Promise.allSettled(discovered.map(s => fetchTLE(s.norad)))

  const satellites = tleResults.map((r, i) => {
    const sat   = discovered[i]
    const norad = sat.norad
    const name  = sat.name

    if (r.status === 'rejected') {
      console.warn(`[MarineAI/${regionLabel}] TLE fetch failed for NORAD ${norad}: ${r.reason?.message}`)
      return { norad, name, error: r.reason?.message, passes: [], nextPass: null }
    }

    const elem   = r.value
    const passes = predictPasses(elem, now, obs, obsLatRad, obsLonRad)

    const upcoming   = passes.filter(p => p.aosMs > now)
    const next       = upcoming[0] || null
    const passActive = passes.some(p => p.aosMs <= now && p.losMs > now)

    return {
      norad,
      name:        elem.name || name,
      freq:        sat.freq,
      mode:        sat.mode,
      periodMin:   parseFloat(elem.periodMin.toFixed(2)),
      inclination: parseFloat((elem.incl * 180 / Math.PI).toFixed(2)),
      passes:      passes.slice(0, 4).map(p => ({
        aos: p.aos, los: p.los, maxEl: p.maxEl, durationMin: p.durationMin
      })),
      nextPass: next ? {
        time:         next.aos,
        aos:          next.aos,
        los:          next.los,
        maxEl:        next.maxEl,
        durationMin:  next.durationMin,
        minutesUntil: Math.max(0, Math.round((next.aosMs - now) / 60000)),
        passActive
      } : null
    }
  })

  const withPasses = satellites.filter(s => s.nextPass)
  withPasses.sort((a, b) => a.nextPass.minutesUntil - b.nextPass.minutesUntil)

  const nextSat    = withPasses[0] || null
  const passActive = satellites.some(s => s.nextPass?.passActive)

  console.info(`[MarineAI/${regionLabel}] SatNOGS: ${withPasses.length} sats tracked, next: ${nextSat ? nextSat.name + ' T-' + nextSat.nextPass.minutesUntil + 'm' : 'none'}`)

  return {
    satellites,
    nextPass: nextSat ? { satellite: nextSat.name, norad: nextSat.norad, ...nextSat.nextPass } : null,
    passActive,
    observer:    obs,
    retrievedAt: new Date().toISOString()
  }
}

// Honduras observer (backward-compatible wrapper)
function fetchSatNOGSCoverage() {
  return computeSatNOGSCoverage(HN_OBS, HN_LAT_RAD, HN_LON_RAD, 'Honduras')
}

// Gulf of Mexico observer
function fetchSatNOGSCoverageGulf() {
  return computeSatNOGSCoverage(GULF_OBS, GULF_LAT_RAD, GULF_LON_RAD, 'Gulf')
}

// ── aisstream.io: Gulf of Mexico bounding box ────────────────────────────────
const GULF_BOUNDS_AIS = { latmin: 24, latmax: 32, lonmin: -98, lonmax: -80.5 }

function snnForVesselGulf(vessel, geomag) {
  const hourUTC = new Date().getUTCHours()
  return computeMarineSNN(vessel, {
    ports:         GULF_PORTS_SIM,
    geomag:        geomag || GULF_WMM,
    hourUTC,
    nearbyVessels: []
  })
}

async function fetchAISHubGulf() {
  // Gulf of Mexico bounding box: [[latMin, lonMin], [latMax, lonMax]]
  return fetchAISStream(
    [[GULF_BOUNDS_AIS.latmin, GULF_BOUNDS_AIS.lonmin], [GULF_BOUNDS_AIS.latmax, GULF_BOUNDS_AIS.lonmax]],
    'GulfAI'
  )
}

async function generateGulfVesselsWithLive() {
  const geomag = GULF_WMM  // Static Gulf WMM baseline (no real-time Kp for Gulf yet)
  const geoCtx = { declination: geomag.declination, inclination: geomag.inclination, intensity: geomag.intensity, kp: geomag.kp || 0 }

  const [simResult, aisLive] = await Promise.all([
    Promise.resolve(generateGulfVessels()),
    cached('ais:hub:gulf', () => fetchAISHubGulf(), CACHE_TTL_MS)
  ])

  // Enrich live vessels with SNN
  const hourUTC = new Date().getUTCHours()
  const enrichLive = v => {
    const snnResult = computeMarineSNN(v, { ports: GULF_PORTS_SIM, geomag, hourUTC, nearbyVessels: [] })
    return { ...v, snn: snnResult.neat, snnDetail: snnResult }
  }

  if (!aisLive.length) return { ...simResult, geomag, liveCount: 0, aisCount: 0, simCount: simResult.count }

  const liveMMSISet = new Set(aisLive.map(v => v.mmsi))
  const live    = aisLive.map(enrichLive)
  const filtered = simResult.vessels.filter(sv =>
    !liveMMSISet.has(sv.mmsi) &&
    !live.some(lv => haversineKmInternal(sv.lat, sv.lon, lv.lat, lv.lon) < 25)
  )

  const merged = [...live, ...filtered]
  console.info(`[GulfAI] Merged: ${live.length} AIS_LIVE + ${filtered.length} SIM = ${merged.length} total`)

  return {
    vessels:     merged,
    count:       merged.length,
    liveCount:   live.length,
    aisCount:    live.length,
    simCount:    filtered.length,
    slot:        simResult.slot,
    geomag,
    generatedAt: new Date().toISOString(),
    source:      `WeatherAI Maritime · ${live.length} AIS_LIVE + ${filtered.length} AIS_SIM (Gulf of Mexico)`,
    bounds:      simResult.bounds
  }
}

function haversineKmInternal(lat1, lon1, lat2, lon2) {
  const R  = 6371
  const dL = (lat2 - lat1) * Math.PI / 180
  const dO = (lon2 - lon1) * Math.PI / 180
  const a  = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dO/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

async function generateAISVesselsWithLive() {
  // Fetch geomag context, SIM vessels (now SNN-enriched), and live data in parallel
  let geomag
  try {
    // fetchGeomagHN internally caches WMM (24h) and Kp (5min) separately;
    // call directly without an outer cache so Kp stays fresh every request
    geomag = await fetchGeomagHN()
  } catch {
    geomag = { kp: 0, declination: -0.82, inclination: 46.15, intensity: 41125 }
  }

  const [simResult, aisLive, gfwLive] = await Promise.all([
    Promise.resolve(generateAISVessels(geomag)),
    cached('ais:hub', () => fetchAISHub(), CACHE_TTL_MS),
    cached('ais:gfw', () => fetchGFW(),    GFW_TTL)
  ])

  // Apply SNN to live vessels (they didn't have geomag context yet)
  const hourUTC = new Date().getUTCHours()
  const enrichLive = v => {
    const snnResult = computeMarineSNN(v, {
      ports:         HN_PORTS_SIM,
      geomag,
      hourUTC,
      nearbyVessels: []
    })
    return { ...v, snn: snnResult.neat, snnDetail: snnResult }
  }

  // Priority map: aisstream.io overrides GFW if same MMSI
  const liveByMmsi = new Map()
  for (const v of gfwLive)  liveByMmsi.set(v.mmsi, enrichLive(v))
  for (const v of aisLive)  liveByMmsi.set(v.mmsi, enrichLive(v))
  const live = Array.from(liveByMmsi.values())

  if (!live.length) return { ...simResult, geomag }

  const sim         = simResult.vessels
  const liveMMSISet = new Set(live.map(v => v.mmsi))
  // Primary dedupe: drop SIM vessels whose MMSI matches any live source
  // Secondary: also suppress SIM vessels within 25km of any live vessel (gap fill)
  const filtered = sim.filter(sv =>
    !liveMMSISet.has(sv.mmsi) &&
    !live.some(lv => haversineKmInternal(sv.lat, sv.lon, lv.lat, lv.lon) < 25)
  )

  const merged   = [...live, ...filtered]
  const aisCount = aisLive.length
  const gfwCount = gfwLive.filter(v => !aisLive.some(a => a.mmsi === v.mmsi)).length

  return {
    vessels:     merged,
    count:       merged.length,
    liveCount:   live.length,
    aisCount,
    gfwCount,
    simCount:    filtered.length,
    slot:        simResult.slot,
    geomag,
    generatedAt: new Date().toISOString(),
    source: `WeatherAI Maritime · ${aisCount} AIS_LIVE + ${gfwCount} GFW_LIVE + ${filtered.length} AIS_SIM`,
    bounds:      simResult.bounds
  }
}

// ── Honduras Marine Weather (Caribbean + Pacific coasts) ─────────────────────
async function fetchHondurasMarineUI() {
  const [caribRes, pacRes] = await Promise.all([
    fetch(`${MARINE_BASE}?latitude=15.85&longitude=-87.35&current=wave_height,wave_direction,wave_period,sea_surface_temperature&hourly=wave_height&forecast_days=1&timezone=America/Tegucigalpa`, { signal: AbortSignal.timeout(8000) }),
    fetch(`${MARINE_BASE}?latitude=13.35&longitude=-87.55&current=wave_height,wave_direction,wave_period,sea_surface_temperature&timezone=America/Tegucigalpa`, { signal: AbortSignal.timeout(8000) })
  ])
  const [caribRaw, pacRaw] = await Promise.all([caribRes.json(), pacRes.json()])
  const cc = caribRaw.current || {}
  const ch = caribRaw.hourly  || {}
  const pc = pacRaw.current   || {}
  return {
    caribbean: {
      sst:        parseFloat((cc.sea_surface_temperature ?? 28.5).toFixed(1)),
      waveHeight: parseFloat((cc.wave_height             ??  1.2).toFixed(1)),
      waveDir:    Math.round(cc.wave_direction            ?? 70),
      wavePeriod: Math.round(cc.wave_period               ??  7),
      waveHourly: (ch.wave_height || []).slice(0, 24).map(v => parseFloat((v ?? 1.2).toFixed(2)))
    },
    pacific: {
      sst:        parseFloat((pc.sea_surface_temperature ?? 29.2).toFixed(1)),
      waveHeight: parseFloat((pc.wave_height             ??  0.9).toFixed(1)),
      waveDir:    Math.round(pc.wave_direction            ?? 220),
      wavePeriod: Math.round(pc.wave_period               ??  6)
    }
  }
}

function sendJSON(res, data, status = 200) {
  const body = JSON.stringify(data, null, 2)
  res.writeHead(status, {
    'Content-Type':                'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control':               'public, max-age=300',
    'X-Powered-By':                'WeatherAI Data API v1'
  })
  res.end(body)
}

function apiIndex(req) {
  const base = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`
  return {
    name:        'WeatherAI + MarineAI Data API',
    version:     '1.1.0',
    description: 'Real-time weather, AQI and maritime intelligence for Central America and Honduras. Free tier — 5-min cache.',
    data_sources: [
      'Open-Meteo (weather, free)',
      'NASA FIRMS (wildfire hotspots)',
      'NOAA NGDC WMM2025 (geomagnetic field)',
      'NOAA SWPC (Kp index)',
      'aisstream.io (live AIS, free WebSocket)',
      'Global Fishing Watch (fishing vessels)',
      'SatNOGS / TLE (satellite passes)'
    ],
    endpoints: {
      weather_louisiana:    `${base}/api/v1/weather/louisiana`,
      weather_california:   `${base}/api/v1/weather/california`,
      aqi_louisiana:        `${base}/api/v1/aqi/louisiana`,
      aqi_california:       `${base}/api/v1/aqi/california`,
      snapshot_louisiana:   `${base}/api/v1/snapshot/louisiana`,
      snapshot_california:  `${base}/api/v1/snapshot/california`,
      marine_vessels:       `${base}/api/v1/marine/vessels`,
      marine_geomag:        `${base}/api/v1/marine/geomag`,
      marine_trail_example: `${base}/api/v1/marine/trail/334201001`
    },
    marine_vessel_fields: {
      mmsi:      'Maritime Mobile Service Identity (unique vessel ID)',
      name:      'Vessel name',
      typeLabel: 'Vessel category: Container, Cargo, Reefer, Tanker, Ferry, Fishing, Naval, Tug, Service',
      flag:      'ISO 2-letter flag state',
      length:    'Length overall in meters',
      lat:       'WGS84 latitude (decimal degrees)',
      lon:       'WGS84 longitude (decimal degrees)',
      speed:     'Speed over ground in knots',
      heading:   'True heading (degrees, 0-359)',
      cog:       'Course over ground (degrees)',
      status:    'Navigation status: UNDERWAY | AT ANCHOR | MOORED | FISHING',
      source:    'Data source: AIS_LIVE | GFW_LIVE | AIS-SIM',
      snn:       'SNN risk score 0-100 (≥70 = anomaly, 50-69 = elevated, <50 = nominal)',
      snnDetail: {
        brazos: {
          cinetico:   'Kinematic anomaly (SOG + COG/HDG divergence), 0-100',
          tactico:    'Tactical risk (type × zone × time-of-day matrix), 0-100',
          posicional: 'Port proximity × approach speed risk, 0-100',
          historico:  'Route deviation from MMSI-seeded expected path, 0-100',
          magnetico:  'Geomagnetic field anomaly (NOAA Kp + WMM declination/intensity), 0-100'
        },
        alpha:  'LMS learning rate (0.07)',
        beta:   'Nesterov momentum (0.88)',
        ticks:  'Update cycles since vessel init'
      }
    },
    geomag_fields: {
      declination:  'Magnetic declination at Honduras centroid (degrees)',
      inclination:  'Magnetic inclination (degrees)',
      intensity:    'Total field intensity (nanoTesla)',
      epoch:        'WMM model epoch year',
      model:        'WMM model version (WMM2025)',
      kp:           'NOAA Kp geomagnetic index (0-9)',
      stormLevel:   'QUIET | ACTIVE | STORM'
    },
    response_format:  'JSON, UTF-8',
    update_frequency: 'Every 5 minutes (cached). Geomag: WMM 24h, Kp 5min.',
    license:          'WeatherAI + MarineAI Commercial API — contact hello@weatherai.app',
    pricing:          'See /pricing · LIBRE: free read · CAPITÁN $49/mo: SNN alerts + API · ARMADOR $199/mo: full API + webhooks'
  }
}

export {
  cached,
  REGIONS,
  CITY_BBOXES,
  CACHE_TTL_MS,
  CACHE_TTL_ROADS,
  CACHE_TTL_FIRES,
  CACHE_TTL_GEOMAG,
  CACHE_TTL_SAT,
  fetchWeatherUI,
  fetchAQIUI,
  generateAISVessels,
  fetchHondurasMarineUI,
  fetchGulfMarineUI,
  fetchFiresUI,
  fetchRoadsUI,
  fetchQuakesUI,
  fetchWeatherJSON,
  fetchAQIJSON,
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
}

export function weatherApiPlugin() {
  return {
    name: 'weatherai-data-api',
    configureServer(server) {

      // ── Sitemap ──────────────────────────────────────────────
      server.middlewares.use('/sitemap.xml', (req, res) => {
        const xml = generateSitemap(req.headers.host)
        res.writeHead(200, {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*'
        })
        res.end(xml)
      })

      // ── Internal UI endpoints — serve frontend with server-side cache ────
      server.middlewares.use('/api/wx', async (req, res) => {
        const region = req.url.replace(/^\//, '').split('?')[0]
        if (!REGIONS[region]) { sendJSON(res, { error: 'Invalid region', valid_regions: Object.keys(REGIONS) }, 400); return }
        try {
          const data = await cached(`ui:wx:${region}`, () => fetchWeatherUI(region))
          sendJSON(res, data)
        } catch (err) {
          console.error('[WeatherAI /api/wx]', err)
          sendJSON(res, { error: err.message }, 502)
        }
      })

      server.middlewares.use('/api/aqi', async (req, res) => {
        const region = req.url.replace(/^\//, '').split('?')[0]
        if (!REGIONS[region]) { sendJSON(res, { error: 'Invalid region', valid_regions: Object.keys(REGIONS) }, 400); return }
        try {
          const data = await cached(`ui:aqi:${region}`, () => fetchAQIUI(region))
          sendJSON(res, data)
        } catch (err) {
          console.error('[WeatherAI /api/aqi]', err)
          sendJSON(res, { error: err.message }, 502)
        }
      })

      server.middlewares.use('/api/marine', async (req, res) => {
        const sub = (req.url || '/').split('?')[0].replace(/^\//, '')
        try {
          if (sub === 'honduras') {
            const data = await cached('ui:marine:hn', () => fetchHondurasMarineUI())
            sendJSON(res, data)
          } else if (sub === 'gulf') {
            const data = await cached('ui:marine:gulf', () => fetchGulfMarineUI(), CACHE_TTL_MS)
            sendJSON(res, data)
          } else {
            sendJSON(res, { error: 'Use /api/marine/honduras or /api/marine/gulf' }, 400)
          }
        } catch (err) {
          console.error('[WeatherAI /api/marine]', err)
          sendJSON(res, { error: err.message }, 502)
        }
      })

      server.middlewares.use('/api/ais', async (req, res) => {
        const sub        = (req.url || '/').split('?')[0]
        // ── Gulf sub-routes ─────────────────────────────────────────────────
        if (sub === '/gulf' || sub === '/gulf/') {
          try {
            const data = await cached('api:ais:gulf', () => generateGulfVesselsWithLive(), CACHE_TTL_MS)
            sendJSON(res, data)
          } catch (err) {
            console.error('[WeatherAI /api/ais/gulf]', err)
            sendJSON(res, { vessels: [], error: err.message }, 502)
          }
          return
        }
        const gulfTrailMatch = sub.match(/^\/gulf\/trail\/(\d+)$/)
        if (gulfTrailMatch) {
          const mmsi  = parseInt(gulfTrailMatch[1], 10)
          const trail = generateVesselTrail(mmsi)
          if (!trail) { sendJSON(res, { error: 'MMSI not found in Gulf SIM fleet', mmsi }, 404); return }
          sendJSON(res, trail)
          return
        }
        // ── HN (Honduras) routes ────────────────────────────────────────────
        const trailMatch = sub.match(/^\/trail\/(\d+)$/)
        if (trailMatch) {
          const mmsi  = parseInt(trailMatch[1], 10)
          const trail = generateVesselTrail(mmsi)
          if (!trail) { sendJSON(res, { error: 'MMSI not found in SIM fleet', mmsi }, 404); return }
          sendJSON(res, trail)
          return
        }
        try {
          const data = await cached('api:ais', () => generateAISVesselsWithLive(), CACHE_TTL_MS)
          sendJSON(res, data)
        } catch (err) {
          console.error('[WeatherAI /api/ais]', err)
          sendJSON(res, { vessels: [], error: err.message }, 502)
        }
      })

      server.middlewares.use('/api/sat-coverage', async (req, res) => {
        const sub = (req.url || '/').split('?')[0]
        if (sub === '/gulf' || sub === '/gulf/') {
          try {
            const data = await cached('api:sat:gulf', () => fetchSatNOGSCoverageGulf(), CACHE_TTL_SAT)
            sendJSON(res, data)
          } catch (err) {
            console.error('[WeatherAI /api/sat-coverage/gulf]', err)
            sendJSON(res, { satellites: [], nextPass: null, passActive: false, error: err.message }, 502)
          }
          return
        }
        try {
          const data = await cached('api:sat', () => fetchSatNOGSCoverage(), CACHE_TTL_SAT)
          sendJSON(res, data)
        } catch (err) {
          console.error('[WeatherAI /api/sat-coverage]', err)
          sendJSON(res, { satellites: [], nextPass: null, passActive: false, error: err.message }, 502)
        }
      })

      server.middlewares.use('/api/geomag', async (req, res) => {
        try {
          // fetchGeomagHN internally manages separate WMM (24h) and Kp (5min) caches
          const data = await fetchGeomagHN()
          sendJSON(res, data)
        } catch (err) {
          console.error('[WeatherAI /api/geomag]', err)
          sendJSON(res, { ...HN_WMM, kp: 0, stormLevel: 'QUIET', error: err.message }, 200)
        }
      })

      // ── TRIDENT GPS-free positioning — available in dev + production ──────
      server.middlewares.use('/api/trident', async (req, res) => {
        const { fspl, timingAdvanceToDistance, rssiToDistance, cost231Hata, rsrpFromRssi,
                computeGDOP, gdopRating, quantVigesimal, dequantVigesimal, vigesimalSymbol, VIGESIMAL_SYMBOLS,
                processTridentRequest } = await import('./tridentEngine.js')

        const sub = (req.url || '/').split('?')[0]

        // GET /api/trident/formulas — formula calculator
        if (req.method === 'GET' && (sub === '/formulas' || sub === '/formulas/')) {
          const qs = new URLSearchParams((req.url || '').split('?')[1] || '')
          const formula = qs.get('formula')
          const results = {}
          if (!formula || formula === 'fspl') {
            const d = parseFloat(qs.get('d') ?? 1000), f = parseFloat(qs.get('f') ?? 2.4e9)
            results.fspl = { input: { d_m: d, f_hz: f }, result_db: parseFloat(fspl(d, f).toFixed(2)) }
          }
          if (!formula || formula === 'ta') {
            const ta = parseInt(qs.get('ta') ?? 10, 10)
            results.timing_advance = { input: { ta }, result_m: Math.round(timingAdvanceToDistance(ta)), resolution: '78.125 m/step' }
          }
          if (!formula || formula === 'rssi') {
            const rssi = parseFloat(qs.get('rssi') ?? -70), ref = parseFloat(qs.get('ref') ?? -40), n = parseFloat(qs.get('n') ?? 2.5)
            results.rssi_distance = { input: { rssi_dbm: rssi, rssi_ref_dbm: ref, n }, result_m: Math.round(rssiToDistance(rssi, ref, n)) }
          }
          if (!formula || formula === 'cost231') {
            const d = parseFloat(qs.get('d') ?? 1), f = parseFloat(qs.get('f') ?? 1800)
            results.cost231_hata = { input: { d_km: d, f_mhz: f }, result_db: parseFloat(cost231Hata(d, f).toFixed(2)) }
          }
          if (!formula || formula === 'rsrp') {
            const rssi = parseFloat(qs.get('rssi') ?? -80), nb = parseInt(qs.get('nb') ?? 100, 10)
            results.rsrp = { input: { rssi_dbm: rssi, num_rb: nb }, result_dbm: parseFloat(rsrpFromRssi(rssi, nb).toFixed(2)) }
          }
          if (!formula || formula === 'gdop') {
            const anchors = [
              { lat: parseFloat(qs.get('lat0') ?? 15.518), lon: parseFloat(qs.get('lon0') ?? -88.025) },
              { lat: parseFloat(qs.get('lat1') ?? 14.093), lon: parseFloat(qs.get('lon1') ?? -87.207) },
              { lat: parseFloat(qs.get('lat2') ?? 15.774), lon: parseFloat(qs.get('lon2') ?? -86.793) },
            ]
            const tLat = parseFloat(qs.get('tlat') ?? 15.51), tLon = parseFloat(qs.get('tlon') ?? -87.90)
            const score = computeGDOP(anchors, tLat, tLon)
            results.gdop = {
              input:   { anchors, target: { lat: tLat, lon: tLon } },
              result:  score,
              rating:  gdopRating(score),
              formula: 'GDOP = √(trace((HᵀH)⁻¹))  —  H_i = unit vector from target to anchor i',
              ratings: { excellent: '< 2', good: '2–5', poor: '5–10', critical: '> 10' }
            }
          }
          if (!formula || formula === 'vigesimal') {
            const val = parseFloat(qs.get('val') ?? 15.5)
            const minV = parseFloat(qs.get('min') ?? 13), maxV = parseFloat(qs.get('max') ?? 17)
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
          sendJSON(res, { engine: 'TRIDENT v1.0 — Formula Calculator', formulas: results, all_formulas: ['fspl', 'ta', 'rssi', 'cost231', 'rsrp', 'gdop', 'vigesimal'], usage: '/api/trident/formulas?formula=gdop&lat0=15.5&lon0=-88.0&lat1=14.1&lon1=-87.2&lat2=15.8&lon2=-86.8&tlat=15.5&tlon=-87.9' })
          return
        }

        // POST /api/trident — fusion engine
        if (req.method === 'POST' || req.method === 'OPTIONS') {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' })
            res.end(); return
          }
          try {
            const raw = await new Promise((resolve, reject) => {
              let body = ''
              req.on('data', chunk => { body += chunk })
              req.on('end',   ()    => resolve(body))
              req.on('error', reject)
            })
            const body = JSON.parse(raw || '{}')
            const result = await processTridentRequest(body, fetchWMMForLocation)
            if (!result.ok) { sendJSON(res, { error: result.error, hint: result.hint }, result.status ?? 500); return }
            sendJSON(res, result.data)
          } catch (err) {
            console.error('[TRIDENT]', err.message)
            sendJSON(res, { error: err.message }, 500)
          }
          return
        }

        sendJSON(res, { error: 'Use POST /api/trident for fusion or GET /api/trident/formulas for calculator' }, 405)
      })

      server.middlewares.use('/api/fires', async (req, res) => {
        try {
          const data = await cached('ui:fires', () => fetchFiresUI(), CACHE_TTL_FIRES)
          sendJSON(res, data)
        } catch (err) {
          console.error('[WeatherAI /api/fires]', err)
          sendJSON(res, { error: err.message }, 502)
        }
      })

      server.middlewares.use('/api/roads', async (req, res) => {
        const city = req.url.replace(/^\//, '').split('?')[0]
        if (!CITY_BBOXES[city]) { sendJSON(res, { error: 'Invalid city. Use: la, nola, miami' }, 400); return }
        try {
          const data = await cached(`ui:roads:${city}`, () => fetchRoadsUI(city), CACHE_TTL_ROADS)
          sendJSON(res, data)
        } catch (err) {
          console.error('[WeatherAI /api/roads]', err)
          sendJSON(res, { error: err.message }, 502)
        }
      })

      server.middlewares.use('/api/quakes', async (req, res) => {
        try {
          const data = await cached('ui:quakes', () => fetchQuakesUI(), CACHE_TTL_FIRES)
          sendJSON(res, data)
        } catch (err) {
          console.error('[WeatherAI /api/quakes]', err)
          sendJSON(res, [], 200)
        }
      })

      // ── TRIDENT TERRA — Honduras Cell Tower API ──────────────────────────────
      server.middlewares.use('/api/cell', async (req, res) => {
        if (req.method === 'OPTIONS') { sendJSON(res, {}); return }
        const path = req.url?.split('?')[0] || '/'
        const qs   = Object.fromEntries(new URL(`http://h${req.url}`).searchParams)

        if (path === '/stats' && req.method === 'GET') {
          sendJSON(res, towerStats()); return
        }

        if (path === '/towers' && req.method === 'GET') {
          let results = HN_TOWERS
          if (qs.carrier) results = results.filter(t => t.carrier === qs.carrier.toLowerCase())
          if (qs.city)    results = results.filter(t => t.city.toLowerCase().includes(qs.city.toLowerCase()))
          if (qs.tech)    results = results.filter(t => t.tech === qs.tech)
          sendJSON(res, { count: results.length, towers: results }); return
        }

        if (path === '/lookup' && req.method === 'POST') {
          let body = ''
          req.on('data', c => { body += c })
          req.on('end', () => {
            try {
              const { mcc, mnc, lac, cid } = JSON.parse(body)
              if (mcc == null || mnc == null || lac == null || cid == null) {
                sendJSON(res, { error: 'Required: mcc, mnc, lac, cid' }, 400); return
              }
              const tower = cellIdLookup(+mcc, +mnc, +lac, +cid)
              if (!tower) { sendJSON(res, { found: false, mcc, mnc, lac, cid }, 404); return }
              sendJSON(res, {
                found: true, lat: tower.lat, lon: tower.lon,
                accuracyM: Math.round(tower.range * 0.35), coverageM: tower.range,
                carrier: tower.carrier, city: tower.city, tech: tower.tech,
                band: tower.band, power_dbm: tower.power_dbm, samples: tower.samples,
                cell_id: tower.id, method: 'CELL-ID-LOOKUP',
              })
            } catch { sendJSON(res, { error: 'Invalid JSON' }, 400) }
          })
          return
        }

        if (path === '/triangulate' && req.method === 'POST') {
          let body = ''
          req.on('data', c => { body += c })
          req.on('end', () => {
            try {
              const { towers: towerList } = JSON.parse(body)
              if (!Array.isArray(towerList) || towerList.length < 2) {
                sendJSON(res, { error: 'Required: towers array with 2+ entries [{mcc,mnc,lac,cid,rsrp?}]' }, 400); return
              }
              const anchors = []
              for (const t of towerList) {
                const rec = cellIdLookup(+t.mcc, +t.mnc, +t.lac, +t.cid)
                if (!rec) continue
                const rsrp = t.rsrp ?? rec.power_dbm
                const distM = rec.range * Math.max(0.1, Math.min(1, (rsrp + 50) / (-50)))
                anchors.push({ lat: rec.lat, lon: rec.lon, distKm: distM / 1000, carrier: rec.carrier, city: rec.city, cell_id: rec.id })
              }
              if (anchors.length < 2) { sendJSON(res, { error: 'Could not resolve 2+ towers from database' }, 404); return }
              if (anchors.length === 2) {
                sendJSON(res, { lat: +((anchors[0].lat+anchors[1].lat)/2).toFixed(5), lon: +((anchors[0].lon+anchors[1].lon)/2).toFixed(5), uncertaintyKm: 2.5, method: 'CELL-MIDPOINT', anchors }); return
              }
              let lat = anchors.reduce((s,a)=>s+a.lat,0)/anchors.length
              let lon = anchors.reduce((s,a)=>s+a.lon,0)/anchors.length
              let lr = 0.01
              for (let i = 0; i < 200; i++) {
                let gLat=0,gLon=0
                for (const a of anchors) {
                  const dLat=(lat-a.lat)*Math.PI/180, dLon=(lon-a.lon)*Math.PI/180
                  const sinLat2=Math.sin(dLat/2)**2, cosLat=Math.cos(lat*Math.PI/180)*Math.cos(a.lat*Math.PI/180)
                  const sinLon2=Math.sin(dLon/2)**2
                  const d=6371*2*Math.atan2(Math.sqrt(sinLat2+cosLat*sinLon2),Math.sqrt(1-(sinLat2+cosLat*sinLon2)))
                  if(d<0.001) continue
                  const err=d-a.distKm
                  gLat+=err*(lat-a.lat)/d; gLon+=err*(lon-a.lon)/d
                }
                const n=Math.sqrt(gLat**2+gLon**2)
                if(n<1e-14) break
                lat-=lr*gLat/n; lon-=lr*gLon/n; lr*=0.997
              }
              sendJSON(res, { lat: +lat.toFixed(5), lon: +lon.toFixed(5), uncertaintyKm: 1.2, method: 'CELL-TRILATERATION', anchors })
            } catch(e) { sendJSON(res, { error: e.message }, 400) }
          })
          return
        }

        sendJSON(res, { error: 'Unknown cell endpoint', endpoints: ['/api/cell/towers', '/api/cell/stats', '/api/cell/lookup [POST]', '/api/cell/triangulate [POST]'] }, 404)
      })

      server.middlewares.use('/api/v1', async (req, res, next) => {
        if (req.method === 'OPTIONS') { sendJSON(res, {}); return }

        const path = req.url?.split('?')[0] || '/'
        const parts = path.split('/').filter(Boolean)

        try {
          if (path === '/' || path === '') {
            sendJSON(res, apiIndex(req))
            return
          }

          if (parts[0] === 'marine') {
            const sub = parts[1]
            if (sub === 'vessels') {
              const aisData = await cached('api:ais', () => generateAISVesselsWithLive(), CACHE_TTL_MS)
              sendJSON(res, aisData)
              return
            }
            if (sub === 'geomag') {
              const geo = await fetchGeomagHN()
              sendJSON(res, geo)
              return
            }
            if (sub === 'trail' && parts[2]) {
              const mmsi  = parseInt(parts[2], 10)
              const trail = generateVesselTrail(mmsi)
              if (!trail) { sendJSON(res, { error: 'MMSI not found in SIM fleet', mmsi }, 404); return }
              sendJSON(res, trail)
              return
            }
            sendJSON(res, { error: 'Unknown marine endpoint. Try /api/v1/marine/vessels or /api/v1/marine/geomag', docs: '/api/v1/' }, 404)
            return
          }

          const [endpoint, region] = parts
          if (!region || !REGIONS[region]) {
            sendJSON(res, { error: 'Invalid region', valid_regions: Object.keys(REGIONS) }, 400)
            return
          }

          if (endpoint === 'weather') {
            const data = await cached(`wx:${region}`, () => fetchWeatherJSON(region))
            sendJSON(res, data)
            return
          }

          if (endpoint === 'aqi') {
            const data = await cached(`aqi:${region}`, () => fetchAQIJSON(region))
            sendJSON(res, data)
            return
          }

          if (endpoint === 'snapshot') {
            const [wx, aqi] = await Promise.all([
              cached(`wx:${region}`,  () => fetchWeatherJSON(region)),
              cached(`aqi:${region}`, () => fetchAQIJSON(region))
            ])
            sendJSON(res, { ...wx, air_quality: aqi.aqi })
            return
          }

          sendJSON(res, { error: 'Unknown endpoint', docs: '/api/v1/' }, 404)

        } catch (err) {
          console.error('[WeatherAI API]', err)
          sendJSON(res, { error: 'Upstream fetch failed', message: err.message }, 502)
        }
      })
    }
  }
}
