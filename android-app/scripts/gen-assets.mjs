// Generates launcher icons + splash images from the brand logo (webp on Blob).
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const LOGO_URL =
  "https://uburqjwmx2s6ud7y.public.blob.vercel-storage.com/lumina/cmwk83oi50005zst09tv1tnsm/1000164582_1_fg10-6HCJNaOcdFo52mrGOcurz5E0UgTM7O.webp";
const RES = "android/app/src/main/res";
const BG = "#101010";

execSync(`curl -sL -o /tmp/logo.webp "${LOGO_URL}"`, { stdio: "inherit" });
const logoPng = await sharp("/tmp/logo.webp").png().toBuffer();

async function save(buf, path) {
  mkdirSync(path.split("/").slice(0, -1).join("/"), { recursive: true });
  writeFileSync(path, buf);
  console.log("wrote", path);
}

// ---- App icon: envelope design (owner-approved) ----
// Black rounded square, white envelope outline, the A monogram inside.
const M = 512;
const baseBig = await sharp(logoPng).resize(M, M).png().toBuffer();
const rawInfo = await sharp(baseBig).raw().toBuffer({ resolveWithObject: true });
const [br, bgc, bb] = rawInfo.data;
const logoBg = `rgb(${br},${bgc},${bb})`;

// White A cut-out: thresholded luminance as alpha (dark bg -> transparent)
const lum = await sharp(baseBig).grayscale().raw().toBuffer();
const rgba = Buffer.alloc(M * M * 4);
for (let i = 0; i < M * M; i++) {
  const v = lum[i];
  const a = Math.max(0, Math.min(255, Math.round(((v - 70) / (190 - 70)) * 255)));
  rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = a;
}
const aFull = await sharp(rgba, { raw: { width: M, height: M, channels: 4 } }).png().toBuffer();
const AH = 124;
const aInner = await sharp(aFull).resize(AH, AH).png().toBuffer();

const envSvg = `<svg width="${M}" height="${M}" viewBox="0 0 512 512">
  <rect x="58" y="140" width="396" height="260" rx="26" fill="none" stroke="white" stroke-width="16"/>
  <path d="M62 158 L256 248 L450 158" fill="none" stroke="white" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;
const envBuf = await sharp(Buffer.from(envSvg)).png().toBuffer();
const bgSvg = `<svg width="${M}" height="${M}"><rect width="${M}" height="${M}" rx="112" fill="${logoBg}"/></svg>`;
const master = await sharp(Buffer.from(bgSvg))
  .composite([
    { input: envBuf, gravity: "centre" },
    { input: aInner, left: Math.round((M - AH) / 2), top: 262 },
  ])
  .png()
  .toBuffer();

// Launcher icons per density: [folder, iconSize, foregroundSize]
for (const [d, icon, fg] of [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
]) {
  const iconBuf = await sharp(master).resize(icon, icon).png().toBuffer();
  await save(iconBuf, `${RES}/mipmap-${d}/ic_launcher.png`);
  await save(iconBuf, `${RES}/mipmap-${d}/ic_launcher_round.png`);
  // Adaptive foreground: design at 80% centred on a full-bleed brand canvas
  const fgInner = await sharp(master).resize(Math.round(fg * 0.8), Math.round(fg * 0.8)).png().toBuffer();
  const fgBuf = await sharp({
    create: { width: fg, height: fg, channels: 4, background: logoBg },
  })
    .composite([{ input: fgInner, gravity: "centre" }])
    .png()
    .toBuffer();
  await save(fgBuf, `${RES}/mipmap-${d}/ic_launcher_foreground.png`);
}

// Splash screens: dark canvas + centered logo at ~38% of width
for (const [dir, w, h] of [
  ["drawable", 480, 320],
  ["drawable-land-mdpi", 480, 320],
  ["drawable-land-hdpi", 800, 480],
  ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960],
  ["drawable-land-xxxhdpi", 1920, 1280],
  ["drawable-port-mdpi", 320, 480],
  ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280],
  ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920],
]) {
  const logoW = Math.round(w * 0.38);
  const inner = await sharp(logoPng).resize(logoW, logoW).png().toBuffer();
  const buf = await sharp({
    create: { width: w, height: h, channels: 4, background: BG },
  })
    .composite([{ input: inner, gravity: "centre" }])
    .png()
    .toBuffer();
  await save(buf, `${RES}/${dir}/splash.png`);
}
console.log("assets done");
