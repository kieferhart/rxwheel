import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, readFileSync } from "fs";

const logoDataUrl = readFileSync("/tmp/logo_b64.txt", "utf8").trim();

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Logo centered (icon + Rx Wheel text) -->
  <image href="${logoDataUrl}" x="250" y="60" width="700" height="220"/>

  <!-- Tagline -->
  <text x="600" y="335" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="#94a3b8">Visual Medication Schedule Planner</text>

  <!-- Bullets -->
  <text x="600" y="405" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#64748b">Plan doses on a 24-hour clock  &#x2022;  Avoid late-night doses automatically</text>
  <text x="600" y="443" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#64748b">Free, no signup, works on any device</text>

  <!-- URL -->
  <text x="600" y="535" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#6366f1" font-weight="600">rxwheel.com</text>
</svg>`;

const resvg = new Resvg(svg, { font: { loadSystemFonts: true } });
const png = resvg.render().asPng();
writeFileSync("og-image.png", png);
console.log("og-image.png created");
