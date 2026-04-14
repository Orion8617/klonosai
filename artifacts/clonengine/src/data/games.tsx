// ─── Layer 6: Games Data — original SVG art (no trademarks) ─────────────────
//
// Microsoft Affiliate Program — Impact.com
// Replace YOUR_IMPACT_TAG with your publisher tag from Impact dashboard
// Commission: 7% Xbox digital games · $1.50 Game Pass Ultimate · $1.30 Game Pass PC
// Sign up: https://www.microsoft.com/en-us/store/b/affiliates

const MS_TAG = "YOUR_IMPACT_TAG"; // ← replace with your Impact.com publisher tag
export const msStoreLink = (productId: string) =>
  `https://www.microsoft.com/store/productId/${productId}?ocid=${MS_TAG}`;

export const XBOX_LINKS = {
  gamePassUltimate: msStoreLink("CFQ7TTC0KGQ8"), // $1.50 CPA per signup
  gamePassPC:       msStoreLink("CFQ7TTC0KGQ9"), // $1.30 CPA per signup
  fortnite:         msStoreLink("9NBLGGH4TGK5"), // Free — drives installs
  haloInfinite:     msStoreLink("9PP5G1F0C2B6"), // 7% commission
  forzaHorizon5:    msStoreLink("9NKX70BBCDRN"), // 7% commission
  seaOfThieves:     msStoreLink("9P8DHNK8BVTF"), // 7% commission
  cod:              msStoreLink("9NBLGGH537BL"), // 7% commission
};

export interface GameEntry {
  col: string; name: string; genre: string;
  plat: string; lat: string; ring: string;
  storeUrl?: string;  // affiliate link
  commission?: string;
  icon: (c: string) => React.ReactNode;
}

export const GAMES_DATA: GameEntry[] = [
  {
    col: "#00c8ff", name: "Fortnite", genre: "Battle Royale", plat: "PC · Mobile", lat: "-47ms", ring: "Ring 2 · UDP",
    storeUrl: XBOX_LINKS.fortnite, commission: "Free",
    icon: (c) => <>
      <polygon points="24,4 36,12 40,26 24,44 8,26 12,12" stroke={c} strokeWidth="2" fill={c+"18"}/>
      <polygon points="24,12 32,18 34,28 24,38 14,28 16,18" stroke={c} strokeWidth="1.2" fill={c+"28"}/>
      <line x1="24" y1="12" x2="24" y2="38" stroke={c} strokeWidth="1.5" opacity=".7"/>
      <line x1="14" y1="28" x2="34" y2="28" stroke={c} strokeWidth="1.5" opacity=".7"/>
    </>,
  },
  {
    col: "#ff4655", name: "Valorant", genre: "FPS Tactical", plat: "PC", lat: "-38ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <path d="M8 10 L24 38 L40 10" stroke={c} strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
      <path d="M16 10 L24 26 L32 10" stroke={c} strokeWidth="1.5" fill={c+"22"} strokeLinejoin="round"/>
      <circle cx="24" cy="24" r="3" fill={c}/>
    </>,
  },
  {
    col: "#ff6b35", name: "Free Fire", genre: "Battle Royale", plat: "Mobile", lat: "-61ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <circle cx="24" cy="24" r="16" stroke={c} strokeWidth="1.5" fill={c+"14"}/>
      <path d="M24 10 C24 10 32 18 30 26 C28 32 20 32 18 26 C16 18 24 10 24 10Z" fill={c} opacity=".8"/>
      <path d="M24 16 C24 16 28 22 27 26 C26 29 22 29 21 26 C20 22 24 16 24 16Z" fill={c+"aa"}/>
      <circle cx="24" cy="24" r="3" fill="white" opacity=".6"/>
    </>,
  },
  {
    col: "#9b5de5", name: "Mobile Legends", genre: "MOBA", plat: "Mobile", lat: "-56ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <path d="M24 6 L42 24 L24 42 L6 24 Z" stroke={c} strokeWidth="2" fill={c+"18"}/>
      <path d="M24 12 L36 24 L24 36 L12 24 Z" stroke={c} strokeWidth="1.5" fill={c+"28"}/>
      <path d="M18 24 L24 18 L30 24 L24 30 Z" fill={c} opacity=".9"/>
      <line x1="6" y1="24" x2="42" y2="24" stroke={c} strokeWidth=".8" opacity=".4"/>
      <line x1="24" y1="6" x2="24" y2="42" stroke={c} strokeWidth=".8" opacity=".4"/>
    </>,
  },
  {
    col: "#f5c842", name: "PUBG Mobile", genre: "Battle Royale", plat: "Mobile", lat: "-44ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <rect x="8" y="16" width="32" height="20" rx="4" stroke={c} strokeWidth="2" fill={c+"18"}/>
      <rect x="14" y="10" width="20" height="10" rx="2" stroke={c} strokeWidth="1.5" fill={c+"28"}/>
      <circle cx="24" cy="26" r="5" stroke={c} strokeWidth="1.5" fill={c+"33"}/>
      <circle cx="24" cy="26" r="2" fill={c}/>
      <line x1="8" y1="26" x2="13" y2="26" stroke={c} strokeWidth="1.5"/>
      <line x1="35" y1="26" x2="40" y2="26" stroke={c} strokeWidth="1.5"/>
    </>,
  },
  {
    col: "#cd4232", name: "Apex Legends", genre: "FPS · BR", plat: "PC · Mobile", lat: "-41ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <path d="M24 6 L40 38 H8 Z" stroke={c} strokeWidth="2" fill={c+"18"} strokeLinejoin="round"/>
      <path d="M24 14 L34 34 H14 Z" fill={c} opacity=".4"/>
      <path d="M20 38 L24 28 L28 38" stroke={c} strokeWidth="1.5" fill={c+"44"}/>
      <line x1="14" y1="28" x2="34" y2="28" stroke={c} strokeWidth="1" opacity=".6"/>
    </>,
  },
  {
    col: "#8ecaff", name: "CS2", genre: "FPS Tactical", plat: "PC", lat: "-33ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <rect x="10" y="18" width="28" height="16" rx="3" stroke={c} strokeWidth="2" fill={c+"18"}/>
      <rect x="34" y="20" width="8" height="4" rx="1" fill={c} opacity=".7"/>
      <rect x="6" y="21" width="8" height="3" rx="1" fill={c} opacity=".7"/>
      <circle cx="20" cy="26" r="3" stroke={c} strokeWidth="1.5" fill={c+"33"}/>
      <line x1="10" y1="26" x2="6" y2="26" stroke={c} strokeWidth="1.2"/>
      <line x1="24" y1="14" x2="24" y2="18" stroke={c} strokeWidth="1.5" opacity=".6"/>
    </>,
  },
  {
    col: "#c89b3c", name: "League of Legends", genre: "MOBA", plat: "PC", lat: "-29ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <circle cx="24" cy="24" r="17" stroke={c} strokeWidth="2" fill={c+"14"}/>
      <path d="M24 8 L28 20 L40 20 L30 28 L34 40 L24 32 L14 40 L18 28 L8 20 L20 20 Z" fill={c} opacity=".7"/>
      <circle cx="24" cy="24" r="5" fill={c}/>
    </>,
  },
  {
    col: "#f5a623", name: "Call of Duty", genre: "FPS · BR", plat: "PC · Mobile", lat: "-52ms", ring: "Ring 2 · UDP",
    icon: (c) => <>
      <circle cx="24" cy="24" r="16" stroke={c} strokeWidth="2" fill={c+"14"}/>
      <line x1="24" y1="8" x2="24" y2="40" stroke={c} strokeWidth="2"/>
      <line x1="8" y1="24" x2="40" y2="24" stroke={c} strokeWidth="2"/>
      <circle cx="24" cy="24" r="4" fill={c}/>
      <circle cx="24" cy="24" r="8" stroke={c} strokeWidth="1" fill="none" opacity=".5"/>
    </>,
  },
  {
    col: "#22d3ee", name: "Genshin Impact", genre: "Action RPG", plat: "PC · Mobile", lat: "-35ms", ring: "Ring 1 · HTTPS",
    icon: (c) => <>
      <polygon points="24,4 44,16 44,32 24,44 4,32 4,16" stroke={c} strokeWidth="2" fill={c+"14"}/>
      <polygon points="24,12 37,19.5 37,28.5 24,36 11,28.5 11,19.5" stroke={c} strokeWidth="1" fill={c+"22"}/>
      <path d="M24 14 L24 34 M14 20 L34 20 M14 28 L34 28" stroke={c} strokeWidth="1.2" opacity=".6"/>
      <circle cx="24" cy="24" r="4" fill={c} opacity=".9"/>
    </>,
  },
  {
    col: "#5b8731", name: "Minecraft", genre: "Sandbox", plat: "PC · Mobile", lat: "-18ms", ring: "Ring 0 · TCP",
    icon: (c) => <>
      <rect x="8" y="8" width="14" height="14" stroke={c} strokeWidth="2" fill={c+"22"}/>
      <rect x="26" y="8" width="14" height="14" stroke={c} strokeWidth="2" fill={c+"33"}/>
      <rect x="8" y="26" width="14" height="14" stroke={c} strokeWidth="2" fill={c+"33"}/>
      <rect x="26" y="26" width="14" height="14" stroke={c} strokeWidth="2" fill={c+"22"}/>
      <line x1="8" y1="8" x2="40" y2="40" stroke={c} strokeWidth="1" opacity=".3"/>
    </>,
  },
  {
    col: "#e2231a", name: "Roblox", genre: "Platform", plat: "PC · Mobile", lat: "-22ms", ring: "Ring 1 · HTTPS",
    icon: (c) => <>
      <rect x="10" y="10" width="28" height="28" rx="4" stroke={c} strokeWidth="2" fill={c+"18"}/>
      <rect x="16" y="16" width="16" height="16" rx="2" fill={c} opacity=".7"/>
      <rect x="20" y="20" width="8" height="8" rx="1" fill="white" opacity=".8"/>
      <line x1="10" y1="24" x2="38" y2="24" stroke={c} strokeWidth=".8" opacity=".4"/>
      <line x1="24" y1="10" x2="24" y2="38" stroke={c} strokeWidth=".8" opacity=".4"/>
    </>,
  },
];
