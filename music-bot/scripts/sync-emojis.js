/**
 * Emoji.gg Synchronization & Discord Application Emojis Uploader
 * 
 * Automatically fetches high-resolution, attractive custom emojis from Emoji.gg
 * and registers them directly as Discord Application Emojis on the bot's Client ID.
 * Application Emojis can be used across 1M+ servers with ZERO server requirement!
 * 
 * Usage:
 *   npm run sync-emojis
 */

require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ DISCORD_TOKEN and CLIENT_ID are required in .env!");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

// Curated high-aesthetic emoji assets from Emoji.gg CDN
const EMOJI_CATALOG = {
  spotify: "https://cdn3.emoji.gg/emojis/992807-spotify.png",
  youtube: "https://cdn3.emoji.gg/emojis/8066-youtubemusic.png",
  music: "https://cdn3.emoji.gg/emojis/824253-glossyfacepalm.png",
  loop: "https://cdn3.emoji.gg/emojis/7905-repeat.gif",
  pause: "https://cdn3.emoji.gg/emojis/42291-wait.png",
  soundcloud: "https://cdn3.emoji.gg/emojis/3827-soundcloud.png",
  check: "https://cdn3.emoji.gg/emojis/700387-checkmark.png",
  cross: "https://cdn3.emoji.gg/emojis/780023-textcross.png",
  volume: "https://cdn3.emoji.gg/emojis/479332-volume-down.png",
  queue: "https://cdn3.emoji.gg/emojis/8005-spotify-queue-add.png",
  disc: "https://cdn3.emoji.gg/emojis/78174-pixeldisc.png",
  skip: "https://cdn3.emoji.gg/emojis/12985-skip.png",
  playpause: "https://cdn3.emoji.gg/emojis/3560-play-pause.png",
  stop: "https://cdn3.emoji.gg/emojis/920722-stop.png",
  heart: "https://cdn3.emoji.gg/emojis/9925-heartgem.gif",
  sparkles: "https://cdn3.emoji.gg/emojis/41367-sparkles.gif",
  fire: "https://cdn3.emoji.gg/emojis/5895-black-sparkle-fire.png",
  radio: "https://cdn3.emoji.gg/emojis/60855-pixelradio.png",
  dj: "https://cdn3.emoji.gg/emojis/98912-ipod.png",
};

async function downloadAsBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.warn(`  ⚠️ Failed to download from ${url}:`, err.message);
    return null;
  }
}

async function syncEmojis() {
  console.log("⚡ Connecting to Discord Application Emojis API...");

  let existingEmojis = [];
  try {
    const data = await rest.get(Routes.applicationEmojis(CLIENT_ID));
    existingEmojis = data.items || [];
    console.log(`  Found ${existingEmojis.length} existing Application Emojis on bot.`);
  } catch (err) {
    console.error("  ❌ Could not fetch existing Application Emojis:", err.message);
    return;
  }

  const existingMap = new Map();
  for (const emoji of existingEmojis) {
    existingMap.set(emoji.name.toLowerCase(), emoji);
  }

  const mappedCustom = {};

  for (const [name, url] of Object.entries(EMOJI_CATALOG)) {
    const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

    if (existingMap.has(sanitizedName)) {
      const existing = existingMap.get(sanitizedName);
      const tag = `<:${existing.name}:${existing.id}>`;
      console.log(`  ✔ Already synced: ${name} -> ${tag}`);
      mappedCustom[name] = tag;
      continue;
    }

    console.log(`  ⬇️ Downloading "${name}" from Emoji.gg CDN...`);
    const b64 = await downloadAsBase64(url);
    if (!b64) continue;

    console.log(`  ⬆️ Uploading "${sanitizedName}" to Discord Application Emojis...`);
    try {
      const created = await rest.post(Routes.applicationEmojis(CLIENT_ID), {
        body: {
          name: sanitizedName,
          image: b64,
        },
      });

      const tag = `<:${created.name}:${created.id}>`;
      console.log(`  ✅ Successfully uploaded: ${name} -> ${tag}`);
      mappedCustom[name] = tag;
    } catch (err) {
      console.warn(`  ❌ Upload failed for ${name}:`, err.message);
    }
  }

  // Save results to customEmojis.json
  const outputPath = path.join(__dirname, "..", "src", "utils", "customEmojis.json");
  fs.writeFileSync(outputPath, JSON.stringify(mappedCustom, null, 2), "utf-8");
  console.log(`\n🎉 Synchronized emojis written to: ${outputPath}`);
}

syncEmojis().catch((err) => console.error("Sync error:", err));
