// ═══════════════════════════════════════════════════════
//  KLONOS VISUALIZER — "Patrulla SNN"
//  Content Script — Juan José Salgado Fuentes
// ═══════════════════════════════════════════════════════

const SCHUMANN_MS = 127;
const GAMMA_MS = 25;
const VIGESIMAL_WEIGHT = 50;

let patrolLayer = null;
let swarm = [];
let snnInterval = null;
let gammaBurst = false;
let wasteScore = 0;
let heapRecovered = 0;
let wasteNodes = [];
let isActive = false;

// ─── DOM waste scanner ───────────────────────────────────────────────────────

function scanDOM() {
  const orphanScripts = document.querySelectorAll('script:not([src]):not([type="application/json"])');
  const heavyIframes = document.querySelectorAll('iframe');
  const trackers = document.querySelectorAll('[data-tracking],[data-analytics],script[src*="analytics"],script[src*="gtag"],script[src*="fbq"]');

  wasteNodes = [];
  orphanScripts.forEach(el => wasteNodes.push({ el, type: 'script_orphan', depth: getDOMDepth(el), ram: 0.5 + Math.random() * 2 }));
  heavyIframes.forEach(el => wasteNodes.push({ el, type: 'iframe_leak', depth: getDOMDepth(el), ram: 1.0 + Math.random() * 3 }));
  trackers.forEach(el => wasteNodes.push({ el, type: 'telemetry_leak', depth: getDOMDepth(el), ram: 0.3 + Math.random() * 1 }));

  return calculatePascalDeviation();
}

function getDOMDepth(el) {
  let depth = 0;
  let node = el;
  while (node.parentNode) { depth++; node = node.parentNode; }
  return depth;
}

function calculatePascalDeviation() {
  if (wasteNodes.length === 0) return 0;
  const totalPressure = wasteNodes.reduce((acc, node) => acc + (node.depth * node.ram), 0);
  return Math.min(Math.floor(totalPressure / 10), 100);
}

// ─── SVG patrol layer ────────────────────────────────────────────────────────

const SOLDIERS = [
  { name: 'Podador',   color: '#00C896' },
  { name: 'Drenador',  color: '#0096C8' },
  { name: 'Regulador', color: '#C89600' },
  { name: 'Schumann',  color: '#C8C8C8' },
];

const svgNS = 'http://www.w3.org/2000/svg';

function createSoldierSVG(color) {
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 10 10');
  svg.style.cssText = `position:absolute;width:14px;height:14px;fill:${color};transition:transform 0.15s ease-out;pointer-events:none;`;

  const hex = document.createElementNS(svgNS, 'polygon');
  hex.setAttribute('points', '5,0 9.33,2.5 9.33,7.5 5,10 0.67,7.5 0.67,2.5');
  svg.appendChild(hex);

  const glow = document.createElementNS(svgNS, 'polygon');
  glow.setAttribute('points', '5,0 9.33,2.5 9.33,7.5 5,10 0.67,7.5 0.67,2.5');
  glow.style.cssText = `fill:none;stroke:${color};stroke-width:0.5;opacity:0;`;
  glow.classList.add('klonos-glow');
  svg.appendChild(glow);

  return svg;
}

function createLabel(name, color) {
  const label = document.createElement('div');
  label.style.cssText = `position:absolute;font-family:'Space Mono',monospace;font-size:7px;color:${color};opacity:0.7;pointer-events:none;white-space:nowrap;`;
  label.textContent = name;
  return label;
}

function initPatrolLayer() {
  if (patrolLayer) return;

  patrolLayer = document.createElement('div');
  patrolLayer.id = 'klonos-patrol-layer';
  patrolLayer.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;';
  document.body.appendChild(patrolLayer);

  swarm = SOLDIERS.map(s => {
    const svg = createSoldierSVG(s.color);
    const label = createLabel(s.name, s.color);
    patrolLayer.appendChild(svg);
    patrolLayer.appendChild(label);
    return { name: s.name, color: s.color, svg, label, x: 0, y: 0 };
  });

  // HUD overlay
  const hud = document.createElement('div');
  hud.id = 'klonos-hud';
  hud.style.cssText = `
    position:fixed;bottom:16px;right:16px;
    background:rgba(13,26,15,0.92);
    border:1px solid rgba(0,200,150,0.35);
    color:#00C896;
    font-family:'Space Mono',monospace;
    font-size:9px;
    padding:8px 12px;
    border-radius:4px;
    letter-spacing:1px;
    z-index:2147483646;
    pointer-events:none;
    line-height:1.7;
  `;
  hud.innerHTML = `
    <div style="font-weight:700;font-size:10px;letter-spacing:2px;margin-bottom:4px;">K5 — SNN ACTIVA</div>
    <div id="klonos-phase">PHASE-LOCK: <span style="color:#00C896">7.83Hz</span></div>
    <div id="klonos-pressure">∆ PASCAL: <span>0</span></div>
    <div id="klonos-heap">HEAP: <span>0.0</span>MB recuperado</div>
  `;
  document.body.appendChild(hud);
}

function destroyPatrolLayer() {
  const existing = document.getElementById('klonos-patrol-layer');
  const hud = document.getElementById('klonos-hud');
  if (existing) existing.remove();
  if (hud) hud.remove();
  patrolLayer = null;
  swarm = [];
}

// ─── Walk swarm (SNN decisions) ───────────────────────────────────────────────

function walkSwarm() {
  const pressure = scanDOM();
  const newGamma = pressure > VIGESIMAL_WEIGHT;
  if (newGamma !== gammaBurst) {
    gammaBurst = newGamma;
    restartLoop();
  }

  wasteScore = Math.min(pressure + wasteNodes.length * 3, 100);

  const targets = swarm.map((soldier, i) => {
    let targetX, targetY, cleanup_spike;

    if (wasteNodes.length > 0 && Math.random() > 0.4) {
      const node = wasteNodes[i % wasteNodes.length];
      try {
        const rect = node.el.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          targetX = rect.left + rect.width / 2 + (Math.random() - 0.5) * 30;
          targetY = rect.top + rect.height / 2 + (Math.random() - 0.5) * 30;
        } else {
          targetX = Math.random() * window.innerWidth;
          targetY = Math.random() * window.innerHeight;
        }
      } catch {
        targetX = Math.random() * window.innerWidth;
        targetY = Math.random() * window.innerHeight;
      }
      cleanup_spike = Math.random() < (gammaBurst ? 0.8 : 0.35);
    } else {
      targetX = Math.random() * window.innerWidth;
      targetY = Math.random() * window.innerHeight;
      cleanup_spike = Math.random() < 0.15;
    }

    return { x: targetX, y: targetY, cleanup_spike };
  });

  targets.forEach((target, i) => {
    const soldier = swarm[i];
    soldier.x = target.x;
    soldier.y = target.y;

    soldier.svg.style.transform = `translate(${soldier.x}px, ${soldier.y}px)`;
    soldier.label.style.transform = `translate(${soldier.x + 12}px, ${soldier.y - 2}px)`;

    if (target.cleanup_spike) {
      soldier.svg.style.filter = `drop-shadow(0 0 6px ${soldier.color}) brightness(2)`;
      const glow = soldier.svg.querySelector('.klonos-glow');
      if (glow) glow.style.opacity = '0.6';

      if (wasteNodes.length > i && target.cleanup_spike) {
        try {
          const node = wasteNodes[i % wasteNodes.length];
          node.el.style.outline = `1px solid ${soldier.color}`;
          node.el.style.opacity = '0.6';
          const recovered = node.ram * 0.1;
          heapRecovered += recovered;
          wasteNodes.splice(i % wasteNodes.length, 1);
        } catch {}
      }

      setTimeout(() => {
        soldier.svg.style.filter = 'none';
        const glow = soldier.svg.querySelector('.klonos-glow');
        if (glow) glow.style.opacity = '0';
      }, gammaBurst ? 60 : 100);
    }
  });

  updateHUD(pressure);
}

function updateHUD(pressure) {
  const phase = document.getElementById('klonos-phase');
  const pEl = document.getElementById('klonos-pressure');
  const heap = document.getElementById('klonos-heap');
  if (phase) phase.innerHTML = `PHASE-LOCK: <span style="color:${gammaBurst ? '#C89600' : '#00C896'}">${gammaBurst ? '40Hz GAMMA' : '7.83Hz'}</span>`;
  if (pEl) pEl.innerHTML = `∆ PASCAL: <span style="color:${pressure > VIGESIMAL_WEIGHT ? '#C89600' : '#00C896'}">${pressure}</span>`;
  if (heap) heap.innerHTML = `HEAP: <span style="color:#00C896">${heapRecovered.toFixed(1)}</span>MB recuperado`;
}

// ─── Loop management ─────────────────────────────────────────────────────────

function restartLoop() {
  if (snnInterval) clearInterval(snnInterval);
  if (!isActive) return;
  snnInterval = setInterval(walkSwarm, gammaBurst ? GAMMA_MS : SCHUMANN_MS);
}

function activateSNN() {
  if (isActive) return;
  isActive = true;
  initPatrolLayer();
  restartLoop();
}

function deactivateSNN() {
  isActive = false;
  if (snnInterval) { clearInterval(snnInterval); snnInterval = null; }
  destroyPatrolLayer();
  gammaBurst = false;
  heapRecovered = 0;
  wasteNodes = [];
}

// ─── Message listener ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'SNN_ON':
      activateSNN();
      sendResponse({ ok: true });
      break;
    case 'SNN_OFF':
      deactivateSNN();
      sendResponse({ ok: true });
      break;
    case 'INJECT_WASTE':
      if (isActive) {
        const div = document.createElement('script');
        div.setAttribute('data-klonos-injected', 'true');
        div.textContent = '/* klonos waste node */';
        document.body.appendChild(div);
        scanDOM();
      }
      sendResponse({ ok: true });
      break;
    case 'GET_METRICS':
      sendResponse({ wasteScore, heapRecovered });
      break;
  }
  return true;
});
