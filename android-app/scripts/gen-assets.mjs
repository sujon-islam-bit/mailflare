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

// Launcher icons per density: [folder, iconSize, foregroundSize]
for (const [d, icon, fg] of [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
]) {
  const iconBuf = await sharp(logoPng).resize(icon, icon).png().toBuffer();
  await save(iconBuf, `${RES}/mipmap-${d}/ic_launcher.png`);
  await save(iconBuf, `${RES}/mipmap-${d}/ic_launcher_round.png`);
  const fgBuf = await sharp(logoPng).resize(fg, fg).png().toBuffer();
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
