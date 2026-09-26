#!/usr/bin/env node
/**
 * Neutral warm lat-long IBL for the house. Not a harbour / sunset.
 * Writes public/env/house-ibl.hdr (RGBE, RLE).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const W = 512;
const H = 256;

function f2rgbe(r, g, b) {
  const v = Math.max(r, g, b);
  if (v < 1e-32) return [0, 0, 0, 0];
  const e = Math.floor(Math.log2(v)) + 1;
  const s = 256 / 2 ** e;
  const byte = (c) => Math.min(255, Math.max(0, Math.floor(c * s)));
  return [byte(r), byte(g), byte(b), e + 128];
}

function sky(u, v) {
  // v=0 top (zenith), v=1 bottom (ground). Soft warm, no sun disk.
  const zenith = [0.62, 0.7, 0.78];
  const horizon = [1.2, 1.08, 0.92];
  const ground = [0.32, 0.3, 0.26];
  const t = v < 0.5 ? v / 0.5 : (v - 0.5) / 0.5;
  const a = v < 0.5 ? zenith : horizon;
  const b = v < 0.5 ? horizon : ground;
  const k = t * t * (3 - 2 * t);
  const lift = Math.exp(-((u - 0.22) ** 2) / 0.04) * Math.exp(-((v - 0.32) ** 2) / 0.02);
  return [
    a[0] * (1 - k) + b[0] * k + lift * 2.2,
    a[1] * (1 - k) + b[1] * k + lift * 2.0,
    a[2] * (1 - k) + b[2] * k + lift * 1.6,
  ];
}

function encodeChannel(chan) {
  const out = [];
  const w = chan.length;
  let i = 0;
  while (i < w) {
    let ahead = 1;
    while (i + ahead < w && ahead < 127 && chan[i + ahead] === chan[i]) ahead++;
    if (ahead >= 4) {
      out.push(128 + ahead, chan[i]);
      i += ahead;
      continue;
    }
    const start = i;
    let lit = 0;
    while (i < w && lit < 127) {
      let run = 1;
      while (i + run < w && run < 127 && chan[i + run] === chan[i]) run++;
      if (run >= 4) break;
      i += 1;
      lit += 1;
    }
    out.push(lit);
    for (let k = 0; k < lit; k++) out.push(chan[start + k]);
  }
  return out;
}

function encodeScan(px) {
  const w = px.length / 4;
  const bytes = [2, 2, (w >> 8) & 255, w & 255];
  for (let ch = 0; ch < 4; ch++) {
    const chan = new Uint8Array(w);
    for (let i = 0; i < w; i++) chan[i] = px[i * 4 + ch];
    bytes.push(...encodeChannel(chan));
  }
  return bytes;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const out = path.join(root, "public", "env", "house-ibl.hdr");
  mkdirSync(path.dirname(out), { recursive: true });
  const header = `#?RADIANCE\n# house IBL — warm neutral, not a site HDR\nFORMAT=32-bit_rle_rgbe\n\n-Y ${H} +X ${W}\n`;
  const body = [];
  for (let y = 0; y < H; y++) {
    const px = new Uint8Array(W * 4);
    for (let x = 0; x < W; x++) {
      const [r, g, b] = sky(x / W, y / H);
      const rgbe = f2rgbe(r, g, b);
      px.set(rgbe, x * 4);
    }
    body.push(...encodeScan(px));
  }
  const file = Buffer.concat([Buffer.from(header, "ascii"), Buffer.from(body)]);
  writeFileSync(out, file);
  console.log(`wrote ${out} (${file.length} bytes)`);
}

main();
