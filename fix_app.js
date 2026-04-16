const fs = require('fs');

let content = fs.readFileSync('artifacts/clonengine/src/App.tsx', 'utf8');

content = content.replace(
  /const cur\s*=\s*document\.createElement\("div"\);\s*cur\.id = "cursor";.*?return \(\) => {.*?\};/s,
  ''
);

content = content.replace(
  /document\.body\.style\.cursor = "none";/g,
  'document.body.style.cursor = "auto";'
);

content = content.replace(
  /<div className="logo"><div className="logo-box"><\/div>KLONOSAI<\/div>/g,
  '<div className="logo" style={{display: "flex", alignItems: "center", gap: "10px"}}><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff7a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10 13 2 2 2-2"/><path d="m22 13-3 4-2-2"/><path d="M12 22v-3"/><path d="M2 13l3 4 2-2"/><path d="M12 2A4 4 0 0 0 8 6h8a4 4 0 0 0-4-4Z"/><path d="M15.5 10a2.5 2.5 0 0 1-2 2h-3a2.5 2.5 0 0 1-2-2"/><path d="M17 14h2.5"/><path d="M4.5 14H7"/></svg>KLONOSAI</div>'
);

content = content.replace(
  /<div className="logo">KLONOSAI<\/div>/g,
  '<div className="logo" style={{display: "flex", alignItems: "center", gap: "10px"}}><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff7a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10 13 2 2 2-2"/><path d="m22 13-3 4-2-2"/><path d="M12 22v-3"/><path d="M2 13l3 4 2-2"/><path d="M12 2A4 4 0 0 0 8 6h8a4 4 0 0 0-4-4Z"/><path d="M15.5 10a2.5 2.5 0 0 1-2 2h-3a2.5 2.5 0 0 1-2-2"/><path d="M17 14h2.5"/><path d="M4.5 14H7"/></svg>KLONOSAI</div>'
);

fs.writeFileSync('artifacts/clonengine/src/App.tsx', content);
