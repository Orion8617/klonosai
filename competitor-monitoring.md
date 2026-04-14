# Competitor Monitoring Brief — ClonEngine / KlonOS Layer 5.0
Last updated: 2026-04-13
Maintained by: Juan José Salgado Fuentes · klonengine@proton.me

---

## Product Context

**ClonEngine** is a neuromorphic AI engine based on the C. elegans 302N biological connectome,
running Izhikevich spiking neurons with STBP/R-STDP learning and Schumann resonance phase-lock.

**KlonOS Layer 5.0** is the sovereign edge stack: Expo PWA + Android VPN APK + Chrome DOM purge
extension — all sharing the same SNN constants (VIGESIMAL_WEIGHT=50, SCHUMANN_MS=127ms, GAMMA_BURST_MS=25ms).

**Positioning (April Dunford format):**
> For privacy-first developers and sovereign tech teams who need real-time neuromorphic AI at the
> network edge, ClonEngine is a biologically-grounded SNN framework that delivers TUN-level traffic
> intelligence without cloud dependency. Unlike Intel Loihi (lab-only) or standard VPN apps (no AI),
> ClonEngine is the only deployable SNN stack anchored to the C. elegans connectome.

---

## Competitors Tracked

### Tier 1 — Neuromorphic Hardware / Research (indirect)

| Company | URL | Alert | Notes |
|---|---|---|---|
| Intel Loihi / Hala Point | intel.com/neuromorphic | Google Alert | 1.15B neurons at Sandia NL — hardware-only |
| BrainChip Akida | brainchip.com | Google Alert | AKD1500, ASX:BRN, Dec 2025 $25M raise |
| SynSense | synsense.ai | Google Alert | Speck/Xylo, 3.36µs latency, Swiss/Chinese |
| Innatera | innatera.com | Google Alert | Talla T1, €16M Series A 2024, IoT micro |
| IBM NorthPole | research.ibm.com | Google Alert | Near-memory compute, no DRAM |
| SpiNNaker 2 | spinncloud.com | Google Alert | 22nm, ARM-based, TU Dresden |
| Prophesee | prophesee.ai | Google Alert | Event cameras, $40M Series D, auto/industrial |

### ⚠️ Tier 0 — MISMO NOMBRE — Competidor Directo de Marca

| Empresa | URL | Plataforma | Tech | Precio | Riesgo |
|---|---|---|---|---|---|
| **LagKiller Priority Tool** (KrystekInformatyk) | krystekinformatyk.github.io/LagKiller | **Windows only** | Registry tweaks (CPU/GPU/IO scheduler) | Gratis / open source | Confusión de nombre en SEO |

**Análisis (13 abr 2026):**
- Lanzado ago 2025 · 0 GitHub stars · desarrollador polaco independiente · sin comunidad activa
- Técnica: escribe en `HKLM\Image File Execution Options\<exe>\PerfOptions` — prioriza proceso en Windows scheduler
- **No toca la red** — reduce micro-stutter en single-player AAA (Cyberpunk, God of War, Elden Ring)
- **KlonOS reduce latencia de red** — reduce ping en multiplayer competitivo (Free Fire, PUBG, Valorant)
- Son problemas completamente distintos — no compiten técnicamente
- Riesgo principal: **SEO/naming confusion** — un gamer que busca "LagKiller" puede llegar allá primero
- Acción: Usar siempre "**KlonOS ZeroLag**" para diferenciarse en búsquedas — nombre cambiado de LagKiller a ZeroLag (abr 2026)

### Tier 2 — VPN / Mobile Privacy (direct usage overlap)

| Company | URL | Alert | Notes |
|---|---|---|---|
| Mullvad VPN | mullvad.net | Google Alert | No accounts, privacy-first, WireGuard — closest ethos |
| ProtonVPN | protonvpn.com | Google Alert | Same email domain (Proton) as Juan |
| Cloudflare WARP | cloudflare.com/warp | Google Alert | Free, DNS-level, no SNN |
| WireGuard (protocol) | wireguard.com | Google Alert | Gold-standard TUN — study the Android client |
| Brave Browser VPN | brave.com | Google Alert | Privacy-browser crossover — relevant to extension |

### Tier 3 — SNN Software Frameworks (developer ecosystem)

| Project | URL | Stars | Last push | License |
|---|---|---|---|---|
| SNNtorch | github.com/jeshraghian/snntorch | 2.1k | Active | MIT |
| Lava (Intel) | github.com/lava-nc/lava | 1.4k | Active | LGPL-2.1 |
| Nengo | github.com/nengo/nengo | 1.5k | Active | Free for research |
| Brian2 | github.com/brian-team/brian2 | 1.2k | Active | CeCILL |
| SpykeTorch | github.com/miladmozafari/SpykeTorch | 600 | Moderate | Free |
| PyNN | github.com/NeuralEnsemble/PyNN | 300 | Active | CeCILL |
| Norse | github.com/norse-labs/norse | ~700 | Active | Apache-2.0 |

### Tier 4 — Android VPN Reference Implementations (architecture study)

| Project | URL | Stars | Language |
|---|---|---|---|
| WireGuard Android | github.com/WireGuard/wireguard-android | 4k+ | Kotlin |
| Shadowsocks Android | github.com/shadowsocks/shadowsocks-android | 35k+ | Kotlin + C++ |
| Outline Client (Jigsaw/Google) | github.com/Jigsaw-Code/outline-client | 8k+ | Kotlin |
| Nebula Android (Slack) | github.com/slackhq/nebula-android | 1k+ | Kotlin |

---

## Bookmark Bundle (per major competitor)

### BrainChip Akida
- Pricing: brainchip.com/products/akida
- Changelog: brainchip.com/news
- App Store: N/A (hardware SDK)
- LinkedIn Jobs: linkedin.com/company/brainchipinc/jobs
- G2: N/A

### Intel Loihi
- Research: intel.com/content/www/us/en/research/neuromorphic-computing.html
- Blog: community.intel.com/t5/Blogs/Tech-Innovation/Artificial-Intelligence-AI/bg-p/blog-AI
- GitHub: github.com/lava-nc
- LinkedIn: linkedin.com/company/intel-corporation/jobs (search: neuromorphic)

### Mullvad VPN
- Pricing: mullvad.net/en/pricing
- Changelog: mullvad.net/en/changelog
- App Store: apps.apple.com/us/app/mullvad-vpn/id1488466513
- Google Play: play.google.com/store/apps/details?id=net.mullvad.mullvadvpn
- GitHub: github.com/mullvad/mullvadvpn-app

---

## Change Log

| Date | Competitor | What Changed | Action Taken |
|---|---|---|---|
| 2026-04-13 | BrainChip | $25M raise Dec 2025; AKD1500 launched | Monitor — potential partnership (they need firmware/SW, ClonEngine has SNN stack) |
| 2026-04-13 | Innatera | €16M Series A 2024, Talla T1 micro SNN | Monitor — IoT SNN overlap, different market (sensing vs routing) |
| 2026-04-13 | Lava / Intel | 1.4k stars, LGPL-2.1 | Viable as backend — no mobile VPN integration |

---

## Google Alert Bundle (click to activate)

Copy each URL into your browser to create the alert:

```
https://www.google.com/alerts?q=BrainChip+Akida+neuromorphic&hl=en&source=web
https://www.google.com/alerts?q=Intel+Loihi+neuromorphic+2026&hl=en&source=web
https://www.google.com/alerts?q=SynSense+Speck+Xylo&hl=en&source=web
https://www.google.com/alerts?q=Innatera+Talla+neuromorphic&hl=en&source=web
https://www.google.com/alerts?q=spiking+neural+network+VPN+edge&hl=en&source=web
https://www.google.com/alerts?q=ClonEngine+KlonOS+neuromorphic&hl=en&source=web
https://www.google.com/alerts?q=%22C.+elegans%22+connectome+AI+edge&hl=en&source=web
```

---

## Monthly Ritual (30 min)

| Min | Task | Look for |
|---|---|---|
| 0–5 | Google Alert digest | New funding, product launches, press |
| 5–10 | BrainChip + Innatera changelogs | SDK updates that overlap with ClonEngine |
| 10–15 | WireGuard + Mullvad GitHub | TUN interface changes relevant to ZeroLagVpnService |
| 15–20 | SNNtorch / Lava GitHub | New training APIs, Izhikevich support |
| 20–25 | LinkedIn jobs: "neuromorphic" + "spiking" | Companies hiring = budget for tools |
| 25–30 | Update this file | Log date + changes + action |

On-demand trigger: paste this prompt → "Run my monthly competitive check for ClonEngine"

---

## White Space — Where ClonEngine Wins Uniquely

No competitor combines ALL of:

1. **Biological connectome basis** (C. elegans 302N, not synthetic topology)
2. **Mobile-first deployment** (Android APK + Expo PWA, not lab hardware)
3. **TUN-level network intelligence** (VPN fd handoff to SNN, not cloud inference)
4. **DOM purge engine** (Chrome extension with 20+ waste type classification via SNN agents)
5. **Schumann resonance phase-lock** (7.83Hz biological timing signal)
6. **Pascal deviation engine** (Gaussian ring traffic distribution)
7. **Monetization tier** (Free 302N → Pro 139K → Enterprise unlimited, sovereign-grade)

The market gap: **software-only, deployable neuromorphic SNN for edge network routing** — no hardware vendor has this. Intel Loihi requires custom silicon. BrainChip needs the AKD1500 chip. ClonEngine runs on any Android device via Kotlin + Rust + JNI.
