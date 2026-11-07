/**
 * Deploy Clean Monochrome Black & White Static Emojis
 * Generates pixel-perfect 128x128 white PNGs on transparent backgrounds
 * and uploads them directly into the Discord Server (Guild ID: 1555968929023664208).
 * 
 * Replaces all random/rainbow and animated GIF emojis with sleek, static Eara-style glyphs.
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = "1555968929023664208";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN is missing in .env!");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Pure Monochrome SVG Glyphs (Eara Minimalist Architecture)
// ---------------------------------------------------------------------------
function wrapSvg(inner, viewBox = "0 0 24 24") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="${viewBox}" fill="none">
    ${inner}
  </svg>`;
}

const MONOCHROME_ICONS = {
  // Player Transport
  play: wrapSvg(`<polygon points="6,4 19,12 6,20" fill="#FFFFFF" />`),
  pause: wrapSvg(`<rect x="6" y="4" width="4" height="16" rx="1.5" fill="#FFFFFF" /><rect x="14" y="4" width="4" height="16" rx="1.5" fill="#FFFFFF" />`),
  playpause: wrapSvg(`<polygon points="4,4 13,12 4,20" fill="#FFFFFF" /><rect x="15" y="4" width="3" height="16" rx="1" fill="#FFFFFF" /><rect x="19" y="4" width="3" height="16" rx="1" fill="#FFFFFF" />`),
  skip: wrapSvg(`<polygon points="5,4 16,12 5,20" fill="#FFFFFF" /><rect x="17" y="4" width="3" height="16" rx="1" fill="#FFFFFF" />`),
  previous: wrapSvg(`<rect x="4" y="4" width="3" height="16" rx="1" fill="#FFFFFF" /><polygon points="19,4 8,12 19,20" fill="#FFFFFF" />`),
  stop: wrapSvg(`<rect x="5" y="5" width="14" height="14" rx="2.5" fill="#FFFFFF" />`),
  loop: wrapSvg(`
    <path d="M17 2l4 4-4 4" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7 22l-4-4 4-4" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  loop_one: wrapSvg(`
    <path d="M17 2l4 4-4 4" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7 22l-4-4 4-4" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="12" y="15" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="900" fill="#FFFFFF" text-anchor="middle">1</text>
  `),
  shuffle: wrapSvg(`
    <polyline points="16 3 21 3 21 8" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="4" y1="20" x2="21" y2="3" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="21 16 21 21 16 21" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="15" y1="15" x2="21" y2="21" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="4" y1="4" x2="9" y2="9" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  autoplay: wrapSvg(`
    <path d="M12 12c-2-2.5-4-4-6.5-4a4.5 4.5 0 0 0 0 9c2.5 0 4.5-1.5 6.5-4m0 0c2 2.5 4 4 6.5 4a4.5 4.5 0 0 0 0-9c-2.5 0-4.5 1.5-6.5 4" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  heart: wrapSvg(`
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="#FFFFFF" />
  `),
  queue: wrapSvg(`
    <line x1="8" y1="6" x2="21" y2="6" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="8" y1="12" x2="21" y2="12" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="8" y1="18" x2="16" y2="18" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="4" cy="6" r="1.5" fill="#FFFFFF"/>
    <circle cx="4" cy="12" r="1.5" fill="#FFFFFF"/>
    <circle cx="4" cy="18" r="1.5" fill="#FFFFFF"/>
  `),

  // Audio & Volume
  volume: wrapSvg(`
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#FFFFFF"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
  `),
  volumelow: wrapSvg(`
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#FFFFFF"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
  `),
  volumemute: wrapSvg(`
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#FFFFFF"/>
    <line x1="22" y1="9" x2="16" y2="15" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="16" y1="9" x2="22" y2="15" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
  `),

  // Status & Highlights
  sparkles: wrapSvg(`
    <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" fill="#FFFFFF" />
    <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" fill="#FFFFFF" />
  `),
  music: wrapSvg(`
    <path d="M9 18V5l12-2v13" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="6" cy="18" r="3" fill="#FFFFFF"/>
    <circle cx="18" cy="16" r="3" fill="#FFFFFF"/>
  `),
  disc: wrapSvg(`
    <circle cx="12" cy="12" r="10" fill="none" stroke="#FFFFFF" stroke-width="2.4"/>
    <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-dasharray="3 3"/>
  `),
  radio: wrapSvg(`
    <circle cx="12" cy="12" r="2.5" fill="#FFFFFF"/>
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48 0a6 6 0 0 1 0-8.49m11.31-2.83a10 10 0 0 1 0 14.15m-14.14 0a10 10 0 0 1 0-14.15" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
  `),
  dj: wrapSvg(`
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" fill="#FFFFFF"/>
  `),
  fire: wrapSvg(`
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="#FFFFFF"/>
  `),
  check: wrapSvg(`
    <polyline points="20 6 9 17 4 12" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  `),
  cross: wrapSvg(`
    <line x1="18" y1="6" x2="6" y2="18" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
    <line x1="6" y1="6" x2="18" y2="18" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
  `),

  // Streaming Platforms (Monochrome White Branding)
  spotify: wrapSvg(`
    <circle cx="12" cy="12" r="10" fill="none" stroke="#FFFFFF" stroke-width="2.3"/>
    <path d="M6.5 9.5c3.2-1 7.8-.8 11 1.2" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M7.5 12.3c2.7-.8 6.5-.6 9.2 1" fill="none" stroke="#FFFFFF" stroke-width="2.1" stroke-linecap="round"/>
    <path d="M8.5 15.1c2.1-.6 5.1-.5 7.2.8" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
  `),
  youtube: wrapSvg(`
    <rect x="2" y="4" width="20" height="16" rx="4.5" fill="none" stroke="#FFFFFF" stroke-width="2.3"/>
    <polygon points="10,8.5 16,12 10,15.5" fill="#FFFFFF"/>
  `),
  soundcloud: wrapSvg(`
    <path d="M18 10a4 4 0 0 1 4 4 4 4 0 0 1-4 4H7a5 5 0 0 1-1-9.9 5.5 5.5 0 0 1 10.9-1.1A4 4 0 0 1 18 10z" fill="none" stroke="#FFFFFF" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
  `),

  // Sleek Seamless Progress Bar Segments
  bar_lf: wrapSvg(`<rect x="0" y="6" width="24" height="12" rx="6" fill="#FFFFFF" />`),
  bar_mf: wrapSvg(`<rect x="0" y="6" width="24" height="12" fill="#FFFFFF" />`),
  bar_rf: wrapSvg(`<rect x="0" y="6" width="24" height="12" rx="6" fill="#FFFFFF" />`),
  bar_le: wrapSvg(`<rect x="0" y="8" width="24" height="8" rx="4" fill="#3F4147" />`),
  bar_me: wrapSvg(`<rect x="0" y="8" width="24" height="8" fill="#3F4147" />`),
  bar_re: wrapSvg(`<rect x="0" y="8" width="24" height="8" rx="4" fill="#3F4147" />`),
  bar_single_f: wrapSvg(`<rect x="0" y="6" width="24" height="12" rx="6" fill="#FFFFFF" />`),
};

async function convertSvgToPngBase64(svgString) {
  const buf = await sharp(Buffer.from(svgString))
    .resize(128, 128)
    .png({ compressionLevel: 9 })
    .toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function deploy() {
  console.log(`\n======================================================`);
  console.log(`🚀 DEPLOYING MONOCHROME STATIC EMOJIS TO GUILD ${GUILD_ID}`);
  console.log(`======================================================\n`);

  // 1. Fetch current emojis from guild
  const listRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/emojis`, {
    headers: { Authorization: `Bot ${TOKEN}` },
  });
  if (!listRes.ok) {
    throw new Error(`Failed to fetch guild emojis: HTTP ${listRes.status}`);
  }
  const existingList = await listRes.json();
  console.log(`Found ${existingList.length} total existing emojis in guild.`);

  const existingMap = new Map();
  for (const e of existingList) {
    existingMap.set(e.name.toLowerCase(), e);
  }

  const customEmojisMap = {};

  // 2. Iterate each monochrome icon, create or reuse in guild
  for (const [key, svg] of Object.entries(MONOCHROME_ICONS)) {
    const emojiName = `p_${key}`.toLowerCase();

    if (existingMap.has(emojiName)) {
      const existing = existingMap.get(emojiName);
      const tag = `<:${existing.name}:${existing.id}>`;
      console.log(`  ✔ Already exists in guild: ${emojiName} -> ${tag}`);
      customEmojisMap[key] = tag;
      continue;
    }

    console.log(`  ⚡ Rendering and uploading "${emojiName}"...`);
    try {
      const b64 = await convertSvgToPngBase64(svg);

      const createRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/emojis`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: emojiName,
          image: b64,
        }),
      });

      if (!createRes.ok) {
        const errJson = await createRes.json().catch(() => ({}));
        console.warn(`  ⚠️ Failed to create ${emojiName}: HTTP ${createRes.status}`, JSON.stringify(errJson));
        continue;
      }

      const created = await createRes.json();
      const tag = `<:${created.name}:${created.id}>`;
      console.log(`  ✅ Successfully uploaded: ${emojiName} -> ${tag}`);
      customEmojisMap[key] = tag;

      // Small delay to respect Discord guild emoji rate limits
      await new Promise((r) => setTimeout(r, 650));
    } catch (err) {
      console.error(`  ❌ Error uploading ${emojiName}:`, err.message);
    }
  }

  // 3. Write out to customEmojis.json
  const jsonPath = path.join(__dirname, "..", "src", "utils", "customEmojis.json");
  fs.writeFileSync(jsonPath, JSON.stringify(customEmojisMap, null, 2), "utf-8");
  console.log(`\n🎉 Successfully saved ${Object.keys(customEmojisMap).length} static monochrome emojis to:\n   ${jsonPath}`);
}

deploy().catch((err) => {
  console.error("FATAL ERROR in deploy:", err);
  process.exit(1);
});
