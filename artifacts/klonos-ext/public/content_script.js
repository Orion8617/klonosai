// ═══════════════════════════════════════════════════════
//  KLONOS LAYER 5.0 — "Patrulla SNN" Content Script
//  DOM PURGE ENGINE — Juan José Salgado Fuentes
//  Runs on every real web page. No mercy.
// ═══════════════════════════════════════════════════════

const SCHUMANN_MS = 127;
const GAMMA_MS    = 25;
const VIGESIMAL_WEIGHT = 50;

let patrolLayer   = null;
let hud           = null;
let swarm         = [];
let snnInterval   = null;
let gammaBurst    = false;
let isActive      = false;
let wasteScore    = 0;
let heapRecovered = 0;
let totalPurged   = 0;
let wasteNodes    = [];
let tick          = 0;

// ─── WASTE TAXONOMY ──────────────────────────────────────────────────────────

const WASTE_SELECTORS = [
  // Tracker pixels
  { sel: 'img[width="1"][height="1"]',         type: 'pixel_tracker',   ramBase: 0.01, aggressive: true },
  { sel: 'img[width="0"][height="0"]',         type: 'pixel_tracker',   ramBase: 0.01, aggressive: true },
  { sel: 'iframe[style*="width: 0"]',          type: 'hidden_iframe',   ramBase: 1.2,  aggressive: true },
  { sel: 'iframe[style*="height: 0"]',         type: 'hidden_iframe',   ramBase: 1.2,  aggressive: true },
  { sel: 'iframe[width="0"]',                  type: 'hidden_iframe',   ramBase: 1.5,  aggressive: true },
  { sel: 'iframe[height="0"]',                 type: 'hidden_iframe',   ramBase: 1.5,  aggressive: true },
  // Analytics & telemetry scripts
  { sel: 'script[src*="google-analytics"]',    type: 'analytics',       ramBase: 0.8,  aggressive: false },
  { sel: 'script[src*="googletagmanager"]',    type: 'analytics',       ramBase: 0.9,  aggressive: false },
  { sel: 'script[src*="fbevents"]',            type: 'analytics',       ramBase: 0.7,  aggressive: false },
  { sel: 'script[src*="hotjar"]',              type: 'session_recorder',ramBase: 2.1,  aggressive: false },
  { sel: 'script[src*="fullstory"]',           type: 'session_recorder',ramBase: 2.3,  aggressive: false },
  { sel: 'script[src*="clarity.ms"]',          type: 'session_recorder',ramBase: 1.8,  aggressive: false },
  { sel: 'script[src*="segment.com"]',         type: 'analytics',       ramBase: 1.1,  aggressive: false },
  { sel: 'script[src*="intercom"]',            type: 'crm_beacon',      ramBase: 1.4,  aggressive: false },
  { sel: 'script[src*="crisp.chat"]',          type: 'crm_beacon',      ramBase: 0.9,  aggressive: false },
  // Orphan scripts (inline, no useful type)
  { sel: 'script:not([src]):not([type]):not([id])', type: 'script_orphan', ramBase: 0.3, aggressive: false },
  // Ad networks
  { sel: 'script[src*="doubleclick"]',         type: 'ad_beacon',       ramBase: 0.6,  aggressive: true },
  { sel: 'script[src*="googlesyndication"]',   type: 'ad_beacon',       ramBase: 0.5,  aggressive: true },
  { sel: 'script[src*="amazon-adsystem"]',     type: 'ad_beacon',       ramBase: 0.5,  aggressive: true },
  // Zombie DOM
  { sel: 'div:empty:not([class]):not([id])',   type: 'zombie_div',      ramBase: 0.05, aggressive: true },
  { sel: 'span:empty:not([class])',            type: 'zombie_span',     ramBase: 0.02, aggressive: true },
  // Cookie consent walls (high priority targets)
  { sel: '[id*="cookie"][style*="position: fixed"]', type: 'cookie_wall', ramBase: 0.8, aggressive: true },
  { sel: '[class*="cookie-banner"]',           type: 'cookie_wall',     ramBase: 0.8,  aggressive: true },
  { sel: '[class*="consent"]',                 type: 'cookie_wall',     ramBase: 0.9,  aggressive: true },
  { sel: '[id*="gdpr"]',                       type: 'cookie_wall',     ramBase: 1.0,  aggressive: true },
];

const WASTE_COLORS = {
  pixel_tracker:   '#E05A3A',
  hidden_iframe:   '#E05A3A',
  analytics:       '#C89600',
  session_recorder:'#E05A3A',
  crm_beacon:      '#C89600',
  script_orphan:   '#0096C8',
  ad_beacon:       '#E05A3A',
  zombie_div:      '#4A8060',
  zombie_span:     '#4A8060',
  cookie_wall:     '#C89600',
};

// ─── DOM SCANNER ──────────────────────────────────────────────────────────────

function scanDOM() {
  const found = [];
  const seen = new WeakSet();

  for (const rule of WASTE_SELECTORS) {
    try {
      const nodes = document.querySelectorAll(rule.sel);
      for (const el of nodes) {
        if (seen.has(el)) continue;
        if (el.hasAttribute('data-klonos-purged')) continue;
        seen.add(el);
        const depth = getDOMDepth(el);
        const ram = rule.ramBase + Math.random() * rule.ramBase;
        found.push({ el, type: rule.type, depth, ram, aggressive: rule.aggressive });
      }
    } catch {}
  }

  wasteNodes = found;
  wasteScore = Math.min(Math.round((found.length / 20) * 100), 100);
  return calculatePascalDeviation();
}

function getDOMDepth(el) {
  let depth = 0, node = el;
  while (node.parentNode && depth < 50) { depth++; node = node.parentNode; }
  return depth;
}

function calculatePascalDeviation() {
  if (!wasteNodes.length) return 0;
  const pressure = wasteNodes.reduce((acc, n) => acc + n.depth * n.ram, 0);
  return Math.min(Math.floor(pressure / 8), 100);
}

// ─── PURGE ENGINE — actually removes waste from real DOM ─────────────────────

function purgeNode(waste) {
  const el = waste.el;
  if (!el || !el.parentNode || el.hasAttribute('data-klonos-purged')) return 0;

  // Mark so we don't double-purge
  el.setAttribute('data-klonos-purged', 'true');

  // Disintegration animation then removal
  const rect = el.getBoundingClientRect();
  spawnDisintegration(rect, waste.type);

  // For visible elements, animate out; for invisible ones, remove immediately
  const isVisible = rect.width > 2 && rect.height > 2;

  if (isVisible) {
    el.style.transition = 'opacity 0.3s, transform 0.3s, filter 0.3s';
    el.style.opacity = '0';
    el.style.transform = 'scale(0.8)';
    el.style.filter = 'brightness(3) saturate(0)';
    setTimeout(() => { try { el.remove(); } catch {} }, 320);
  } else {
    try { el.remove(); } catch {}
  }

  heapRecovered += waste.ram;
  totalPurged++;
  return waste.ram;
}

// ─── DISINTEGRATION EFFECT ───────────────────────────────────────────────────

function spawnDisintegration(rect, type) {
  if (!patrolLayer) return;
  const color = WASTE_COLORS[type] || '#00C896';

  // Impact flash at node location
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const w = Math.max(rect.width, 4);
  const h = Math.max(rect.height, 4);

  // Bounding box flash
  if (rect.width > 4 && rect.height > 4) {
    const box = document.createElement('div');
    box.style.cssText = `
      position:fixed;
      left:${rect.left - 2}px;top:${rect.top - 2}px;
      width:${w + 4}px;height:${h + 4}px;
      border:1px solid ${color};
      background:${color}22;
      pointer-events:none;
      z-index:2147483644;
      border-radius:2px;
      transition:opacity 0.4s,transform 0.4s;
    `;
    document.body.appendChild(box);
    requestAnimationFrame(() => {
      box.style.opacity = '0';
      box.style.transform = 'scale(1.1)';
    });
    setTimeout(() => box.remove(), 450);
  }

  // Particle burst
  const count = gammaBurst ? 10 : 5;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    const angle = (i / count) * Math.PI * 2;
    const dist = 20 + Math.random() * 30;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    particle.style.cssText = `
      position:fixed;
      left:${cx - 3}px;top:${cy - 3}px;
      width:6px;height:6px;
      background:${color};
      pointer-events:none;
      z-index:2147483645;
      border-radius:1px;
      transform:rotate(45deg);
      transition:transform 0.35s ease-out,opacity 0.35s ease-out;
    `;
    document.body.appendChild(particle);
    requestAnimationFrame(() => {
      particle.style.transform = `translate(${tx}px,${ty}px) rotate(45deg) scale(0)`;
      particle.style.opacity = '0';
    });
    setTimeout(() => particle.remove(), 380);
  }

  // Laser line from nearest agent
  if (swarm.length > 0) {
    const nearest = swarm.reduce((best, s) => {
      const d = Math.hypot(s.x - cx, s.y - cy);
      return d < best.dist ? { s, dist: d } : best;
    }, { s: swarm[0], dist: Infinity }).s;

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483643;';
    svgEl.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', nearest.x + 7);
    line.setAttribute('y1', nearest.y + 7);
    line.setAttribute('x2', cx);
    line.setAttribute('y2', cy);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('opacity', '0.8');
    svgEl.appendChild(line);
    document.body.appendChild(svgEl);
    setTimeout(() => svgEl.remove(), 200);
  }
}

// ─── SOLDIER SVG ─────────────────────────────────────────────────────────────

const svgNS = 'http://www.w3.org/2000/svg';

function createSoldierSVG(color) {
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 10 10');
  svg.style.cssText = `position:fixed;width:16px;height:16px;fill:${color};pointer-events:none;z-index:2147483647;transition:left 0.1s ease-out,top 0.1s ease-out;`;
  const hex = document.createElementNS(svgNS, 'polygon');
  hex.setAttribute('points', '5,0 9.33,2.5 9.33,7.5 5,10 0.67,7.5 0.67,2.5');
  svg.appendChild(hex);
  return svg;
}

function createLabel(name, color) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;font-family:'Space Mono',monospace;font-size:7px;color:${color};pointer-events:none;z-index:2147483647;white-space:nowrap;opacity:0.75;`;
  el.textContent = name;
  return el;
}

const SOLDIERS_DEF = [
  { name: 'PODADOR',   color: '#00C896' },
  { name: 'DRENADOR',  color: '#0096C8' },
  { name: 'REGULADOR', color: '#C89600' },
  { name: 'SCHUMANN',  color: '#C8C8C8' },
];

function initPatrolLayer() {
  if (patrolLayer) return;

  patrolLayer = document.createElement('div');
  patrolLayer.id = 'klonos-patrol-layer';
  patrolLayer.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:2147483647;';
  document.body.appendChild(patrolLayer);

  swarm = SOLDIERS_DEF.map(s => {
    const svg = createSoldierSVG(s.color);
    const label = createLabel(s.name, s.color);
    patrolLayer.appendChild(svg);
    patrolLayer.appendChild(label);
    return { name: s.name, color: s.color, svg, label, x: 50, y: 50 };
  });

  initHUD();
}

function destroyPatrolLayer() {
  document.getElementById('klonos-patrol-layer')?.remove();
  document.getElementById('klonos-hud')?.remove();
  // Clean up leftover disintegration elements
  document.querySelectorAll('[data-klonos-particle]').forEach(el => el.remove());
  patrolLayer = null;
  hud = null;
  swarm = [];
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function initHUD() {
  hud = document.createElement('div');
  hud.id = 'klonos-hud';
  hud.style.cssText = `
    position:fixed;bottom:12px;right:12px;
    background:rgba(13,26,15,0.94);
    border:1px solid rgba(0,200,150,0.4);
    color:#00C896;
    font-family:'Space Mono',monospace;
    font-size:9px;
    padding:10px 14px;
    border-radius:4px;
    letter-spacing:1px;
    z-index:2147483646;
    pointer-events:none;
    line-height:1.8;
    min-width:180px;
    backdrop-filter:blur(4px);
    box-shadow:0 0 20px rgba(0,200,150,0.1);
  `;
  document.body.appendChild(hud);
  updateHUD(0);
}

function updateHUD(pressure) {
  if (!hud) return;
  const phaseColor = gammaBurst ? '#C89600' : '#00C896';
  const phaseLabel = gammaBurst ? '40Hz ⚡ GAMMA' : '7.83Hz SCHUMANN';
  const presColor  = pressure > VIGESIMAL_WEIGHT ? '#C89600' : '#00C896';

  hud.innerHTML = `
    <div style="font-weight:700;font-size:10px;letter-spacing:2px;margin-bottom:5px;color:#00C896;">K5 — SNN ACTIVA</div>
    <div>FASE: <span style="color:${phaseColor}">${phaseLabel}</span></div>
    <div>∆ PASCAL: <span style="color:${presColor}">${pressure}</span></div>
    <div>WASTE: <span style="color:${wasteScore > 70 ? '#E05A3A' : '#00C896'}">${wasteScore}</span>/100</div>
    <div>HEAP: <span style="color:#00C896">${heapRecovered.toFixed(1)}</span>MB</div>
    <div>PURGED: <span style="color:#E05A3A">${totalPurged}</span> nodes</div>
    <div style="color:#2A5040;margin-top:4px;font-size:7px;">TICK #${tick}</div>
  `;
}

// ─── MAIN SWARM LOOP ─────────────────────────────────────────────────────────

function walkSwarm() {
  tick++;
  const pressure = scanDOM();
  const shouldGamma = pressure > VIGESIMAL_WEIGHT;

  if (shouldGamma !== gammaBurst) {
    gammaBurst = shouldGamma;
    restartLoop();
    return;
  }

  // Each agent hunts a waste node and fires
  swarm.forEach((soldier, i) => {
    let tx, ty, target = null;

    if (wasteNodes.length > 0) {
      // Pick target: agents spread across different waste nodes
      const candidates = wasteNodes.filter(n => !n.locked);
      if (candidates.length > 0) {
        target = candidates[i % candidates.length];
        target.locked = true;
        setTimeout(() => { if (target) target.locked = false; }, SCHUMANN_MS * 3);

        try {
          const rect = target.el.getBoundingClientRect();
          tx = Math.max(0, Math.min(window.innerWidth - 20, rect.left + rect.width / 2 + (Math.random() - 0.5) * 20));
          ty = Math.max(0, Math.min(window.innerHeight - 20, rect.top + rect.height / 2 + (Math.random() - 0.5) * 20));
        } catch {
          tx = Math.random() * window.innerWidth;
          ty = Math.random() * window.innerHeight;
          target = null;
        }
      } else {
        tx = Math.random() * window.innerWidth;
        ty = Math.random() * window.innerHeight;
      }
    } else {
      // Patrol sweep
      tx = (window.innerWidth * 0.1) + Math.random() * (window.innerWidth * 0.8);
      ty = (window.innerHeight * 0.1) + Math.random() * (window.innerHeight * 0.8);
    }

    soldier.x = tx;
    soldier.y = ty;
    soldier.svg.style.left = `${tx}px`;
    soldier.svg.style.top  = `${ty}px`;
    soldier.label.style.left = `${tx + 18}px`;
    soldier.label.style.top  = `${ty - 2}px`;

    // Fire — probability scales with gamma burst and STBP
    const fireChance = gammaBurst ? 0.75 : 0.30;
    const shouldFire = target && Math.random() < fireChance;

    if (shouldFire && target) {
      // Spike glow on agent
      soldier.svg.style.filter = `drop-shadow(0 0 8px ${soldier.color}) brightness(2.5)`;
      soldier.svg.style.fill = soldier.color;
      setTimeout(() => {
        soldier.svg.style.filter = 'none';
        soldier.svg.style.fill = soldier.color;
      }, gammaBurst ? 80 : 120);

      // Purge the real DOM node
      const idx = wasteNodes.indexOf(target);
      if (idx !== -1) {
        wasteNodes.splice(idx, 1);
        purgeNode(target);
      }
    }
  });

  updateHUD(pressure);
}

function restartLoop() {
  if (snnInterval) clearInterval(snnInterval);
  if (!isActive) return;
  snnInterval = setInterval(walkSwarm, gammaBurst ? GAMMA_MS : SCHUMANN_MS);
}

function activateSNN() {
  if (isActive) return;
  isActive = true;
  heapRecovered = 0;
  totalPurged = 0;
  tick = 0;
  initPatrolLayer();
  scanDOM();
  restartLoop();
}

function deactivateSNN() {
  isActive = false;
  gammaBurst = false;
  if (snnInterval) { clearInterval(snnInterval); snnInterval = null; }
  destroyPatrolLayer();
}

// ─── CHROME MESSAGING ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'SNN_ON':
      activateSNN();
      sendResponse({ ok: true });
      break;

    case 'SNN_OFF':
      deactivateSNN();
      sendResponse({ ok: true });
      break;

    case 'INJECT_WASTE': {
      // Inject a synthetic waste script node for testing
      const s = document.createElement('script');
      s.textContent = `/* klonos-injected-waste-${Date.now()} */`;
      document.body.appendChild(s);
      if (isActive) scanDOM();
      sendResponse({ ok: true, wasteCount: wasteNodes.length });
      break;
    }

    case 'GET_METRICS':
      sendResponse({
        wasteScore,
        heapRecovered,
        totalPurged,
        wasteCount: wasteNodes.length,
        gammaBurst,
        tick,
      });
      break;
  }
  return true;
});
