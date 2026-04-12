import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist-ext");
const ZIP_OUT = path.join(__dirname, "klonos-layer5-extension.zip");

// ─── Build popup with vite ──────────────────────────────────────────────────

console.log("⚙  Building popup...");
execSync("pnpm exec vite build --config vite.extension.config.ts", {
  cwd: __dirname,
  stdio: "inherit",
});

// ─── Rename index.html → popup.html ────────────────────────────────────────

const indexHtml = path.join(DIST, "index.html");
const popupHtml = path.join(DIST, "popup.html");
if (fs.existsSync(indexHtml)) {
  let html = fs.readFileSync(indexHtml, "utf8");
  // Remove Google Fonts (CSP issue in extensions)
  html = html.replace(/<link[^>]*fonts\.googleapis[^>]*>/g, "");
  html = html.replace(/<link[^>]*fonts\.gstatic[^>]*>/g, "");
  fs.writeFileSync(popupHtml, html);
  fs.unlinkSync(indexHtml);
  console.log("✓  popup.html ready");
}

// ─── Copy manifest + content script + icons ─────────────────────────────────

const publicDir = path.join(__dirname, "public");
const filesToCopy = [
  "manifest.json",
  "content_script.js",
  "icon16.png",
  "icon48.png",
  "icon128.png",
];

for (const f of filesToCopy) {
  const src = path.join(publicDir, f);
  const dst = path.join(DIST, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`✓  ${f}`);
  } else {
    console.warn(`⚠  ${f} not found, skipping`);
  }
}

// ─── Package as zip using Node.js ────────────────────────────────────────────

console.log("📦 Packaging zip...");
if (fs.existsSync(ZIP_OUT)) fs.unlinkSync(ZIP_OUT);

// Build zip using archiver-like approach via tar → zip conversion with fflate
// Use Node.js native approach: write a minimal ZIP archive
function makeZip(dirPath, outPath) {
  const entries = [];
  
  function walk(dir, base) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const rel = base ? `${base}/${entry}` : entry;
      if (fs.statSync(full).isDirectory()) {
        walk(full, rel);
      } else {
        const data = fs.readFileSync(full);
        entries.push({ name: rel, data });
      }
    }
  }
  
  walk(dirPath, "");
  
  const bufs = [];
  const offsets = [];
  let offset = 0;
  
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = entry.data;
    
    // Local file header
    const lh = Buffer.allocUnsafe(30 + name.length);
    lh.writeUInt32LE(0x04034b50, 0); // signature
    lh.writeUInt16LE(20, 4);  // version needed
    lh.writeUInt16LE(0, 6);   // flags
    lh.writeUInt16LE(0, 8);   // compression: store
    lh.writeUInt16LE(0, 10);  // mod time
    lh.writeUInt16LE(0, 12);  // mod date
    lh.writeUInt32LE(crc32(data), 14); // crc32
    lh.writeUInt32LE(data.length, 18); // compressed size
    lh.writeUInt32LE(data.length, 22); // uncompressed size
    lh.writeUInt16LE(name.length, 26); // filename length
    lh.writeUInt16LE(0, 28);  // extra length
    name.copy(lh, 30);
    
    offsets.push(offset);
    bufs.push(lh, data);
    offset += lh.length + data.length;
  }
  
  // Central directory
  const cdBufs = [];
  let cdSize = 0;
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const name = Buffer.from(entry.name);
    const data = entry.data;
    const cd = Buffer.allocUnsafe(46 + name.length);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(20, 4);  // version made by
    cd.writeUInt16LE(20, 6);  // version needed
    cd.writeUInt16LE(0, 8);   // flags
    cd.writeUInt16LE(0, 10);  // compression
    cd.writeUInt16LE(0, 12);  // mod time
    cd.writeUInt16LE(0, 14);  // mod date
    cd.writeUInt32LE(crc32(data), 16); // crc32
    cd.writeUInt32LE(data.length, 20); // compressed
    cd.writeUInt32LE(data.length, 24); // uncompressed
    cd.writeUInt16LE(name.length, 28); // filename length
    cd.writeUInt16LE(0, 30);  // extra length
    cd.writeUInt16LE(0, 32);  // comment length
    cd.writeUInt16LE(0, 34);  // disk start
    cd.writeUInt16LE(0, 36);  // internal attrs
    cd.writeUInt32LE(0, 38);  // external attrs
    cd.writeUInt32LE(offsets[i], 42); // local header offset
    name.copy(cd, 46);
    cdBufs.push(cd);
    cdSize += cd.length;
  }
  
  const cdOffset = offset;
  const eocd = Buffer.allocUnsafe(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4);  // disk number
  eocd.writeUInt16LE(0, 6);  // cd start disk
  eocd.writeUInt16LE(entries.length, 8);  // entries on disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(cdSize, 12); // cd size
  eocd.writeUInt32LE(cdOffset, 16); // cd offset
  eocd.writeUInt16LE(0, 20); // comment length
  
  fs.writeFileSync(outPath, Buffer.concat([...bufs, ...cdBufs, eocd]));
}

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let k = i;
    for (let j = 0; j < 8; j++) k = k & 1 ? 0xEDB88320 ^ (k >>> 1) : k >>> 1;
    table[i] = k;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

makeZip(DIST, ZIP_OUT);

const stats = fs.statSync(ZIP_OUT);
console.log(`\n✅ Extension ready: klonos-layer5-extension.zip (${(stats.size / 1024).toFixed(1)} KB)`);
console.log('   Load in Chrome: chrome://extensions → Developer mode → Load unpacked → select dist-ext/');
