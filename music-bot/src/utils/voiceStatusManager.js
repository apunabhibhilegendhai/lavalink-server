/**
 * Real-Time Voice Channel Status (VC Status) Manager
 *
 * Automatically updates and rotates Discord Voice Channel Status in real time.
 * Enforces strictly 100% clean text WITHOUT emojis.
 *
 * Supported Template Variables:
 *   {title} or {song name} - Cleaned track title
 *   {author} or {singer}   - Artist / Performer name
 *   {duration}             - Formatted time (e.g. 03:42 or LIVE)
 *   {source}               - Platform name (e.g. Spotify, YouTube)
 */

const logger = require("./logger");
const config = require("../config");
const { formatDuration, truncate } = require("./formatters");
const { cleanTrackTitle } = require("./sourceManager");

// Default curated clean templates (Strictly ZERO emojis)
const DEFAULT_TEMPLATES = [
  "{title} by - {author}",          // Exact user-requested format
  "{title} by {author}",            // Clean classic format
  "Playing: {title} by {author}",   // Streaming standard
  "[{duration}] {title} by {author}", // Timestamped layout
  "{title} - {author}",             // Minimalist format
  "Listening to {title} - {author}",// Rich presence format
  "{title} | {author}",             // Modern pipe separator
];

// Active interval rotation timers mapped by guildId
const activeTimers = new Map();

// In-memory cache of current status per voiceChannelId to avoid redundant REST requests
const channelStatusCache = new Map();

// Current rotating template index by guildId
const templateIndices = new Map();

// Minimum interval between updates to the same channel to safeguard against Discord 429s
const MIN_UPDATE_COOLDOWN_MS = 5000;
const lastUpdateTimes = new Map();

/**
 * Format status string using template and track metadata (No Emojis guaranteed)
 * @param {string} template 
 * @param {object} track 
 * @returns {string}
 */
function formatStatusString(template, track) {
  if (!track || !track.info) return "";

  const rawTitle = cleanTrackTitle(track.info.title) || track.info.title || "Unknown Track";
  const cleanTitle = truncate(rawTitle.replace(/\s+/g, " ").trim(), 48);
  const cleanAuthor = truncate((track.info.author || "Unknown Artist").replace(/\s+/g, " ").trim(), 32);
  const duration = track.info.isStream ? "LIVE" : formatDuration(track.info.duration);
  const source = track.info.sourceName
    ? track.info.sourceName.charAt(0).toUpperCase() + track.info.sourceName.slice(1)
    : "Audio";

  let status = template
    .replace(/\{title\}/gi, cleanTitle)
    .replace(/\{song\s*name\}/gi, cleanTitle)
    .replace(/\{author\}/gi, cleanAuthor)
    .replace(/\{singer\}/gi, cleanAuthor)
    .replace(/\{duration\}/gi, duration)
    .replace(/\{source\}/gi, source);

  // Strictly strip all Unicode emojis, pictographs and symbols to enforce clean text
  status = status
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, "") // Strip custom Discord emojis
    .replace(/\s+/g, " ")
    .trim();

  // Clamp to 100 characters for optimal visibility in Discord Voice Channel header
  return truncate(status, 100);
}

/**
 * Send Voice Channel Status update via Discord REST API
 * @param {import("discord.js").Client} client 
 * @param {string} voiceChannelId 
 * @param {string} statusText 
 * @returns {Promise<boolean>}
 */
async function setChannelStatus(client, voiceChannelId, statusText) {
  if (!client || !voiceChannelId) return false;

  const currentCached = channelStatusCache.get(voiceChannelId);
  if (currentCached === statusText) {
    return true; // No change, skip REST call
  }

  const now = Date.now();
  const lastUpdate = lastUpdateTimes.get(voiceChannelId) || 0;
  if (now - lastUpdate < MIN_UPDATE_COOLDOWN_MS) {
    return false; // In cooldown, avoid spamming Discord
  }

  lastUpdateTimes.set(voiceChannelId, now);

  try {
    await client.rest.put(`/channels/${voiceChannelId}/voice-status`, {
      body: { status: statusText || "" },
    });
    channelStatusCache.set(voiceChannelId, statusText || "");
    logger.debug(`[VC Status] Updated VC ${voiceChannelId} -> "${statusText}"`);
    return true;
  } catch (err) {
    if (err.status === 403) {
      logger.debug(`[VC Status] Missing permission SET_VOICE_CHANNEL_STATUS in channel ${voiceChannelId}`);
    } else if (err.status === 429) {
      logger.warn(`[VC Status] Rate limited updating status on channel ${voiceChannelId}`);
    } else {
      logger.debug(`[VC Status] Failed to update VC status on ${voiceChannelId}:`, err.message);
    }
    return false;
  }
}

/**
 * Start rotation cycle for a playing track
 * @param {import("discord.js").Client} client 
 * @param {import("lavalink-client").Player} player 
 * @param {object} track 
 */
function startRotation(client, player, track) {
  const guildId = player.guildId;
  const voiceChannelId = player.voiceChannelId;
  if (!voiceChannelId) return;

  // Clear any existing rotation for this guild
  stopRotation(guildId);

  const templates = config.voiceStatus?.templates || DEFAULT_TEMPLATES;
  let currentIndex = templateIndices.get(guildId) || 0;

  // Immediately render and apply the active template
  const initialText = formatStatusString(templates[currentIndex % templates.length], track);
  setChannelStatus(client, voiceChannelId, initialText);

  // Schedule template rotation while the song plays
  const rotateInterval = config.voiceStatus?.rotateIntervalMs || 35000;
  const timer = setInterval(() => {
    const activePlayer = client.lavalink?.getPlayer(guildId);
    if (!activePlayer || !activePlayer.playing || activePlayer.paused || !activePlayer.voiceChannelId) {
      return;
    }

    const currentTrack = activePlayer.queue.current;
    if (!currentTrack) return;

    currentIndex = (currentIndex + 1) % templates.length;
    templateIndices.set(guildId, currentIndex);

    const rotatedText = formatStatusString(templates[currentIndex], currentTrack);
    setChannelStatus(client, activePlayer.voiceChannelId, rotatedText);
  }, rotateInterval);

  activeTimers.set(guildId, timer);
}

/**
 * Stop rotation timer for a guild
 * @param {string} guildId 
 */
function stopRotation(guildId) {
  if (activeTimers.has(guildId)) {
    clearInterval(activeTimers.get(guildId));
    activeTimers.delete(guildId);
  }
}

/**
 * Track Start Hook
 */
function onTrackStart(client, player, track) {
  if (config.voiceStatus?.enabled === false) return;
  if (!player.voiceChannelId || !track) return;

  const guildId = player.guildId;
  // Cycle to next template for each new track
  const prevIndex = templateIndices.get(guildId) || 0;
  const nextIndex = (prevIndex + 1) % (config.voiceStatus?.templates?.length || DEFAULT_TEMPLATES.length);
  templateIndices.set(guildId, nextIndex);

  startRotation(client, player, track);
}

/**
 * Playback Pause Hook
 */
function onPause(client, player) {
  if (config.voiceStatus?.enabled === false) return;
  const voiceChannelId = player.voiceChannelId;
  if (!voiceChannelId) return;

  const track = player.queue.current;
  if (!track) return;

  stopRotation(player.guildId);

  const rawTitle = cleanTrackTitle(track.info.title) || track.info.title;
  const cleanTitle = truncate(rawTitle, 45);
  const cleanAuthor = truncate(track.info.author, 30);
  const pausedText = `Paused: ${cleanTitle} by - ${cleanAuthor}`;
  setChannelStatus(client, voiceChannelId, pausedText);
}

/**
 * Playback Resume Hook
 */
function onResume(client, player) {
  if (config.voiceStatus?.enabled === false) return;
  const track = player.queue.current;
  if (!track) return;

  startRotation(client, player, track);
}

/**
 * Track End Hook
 */
function onTrackEnd(client, player) {
  stopRotation(player.guildId);
}

/**
 * Clear Voice Channel Status when queue ends, bot stops, or player is destroyed
 * @param {import("discord.js").Client} client 
 * @param {string} voiceChannelId 
 * @param {string} [guildId] 
 */
async function clearVoiceStatus(client, voiceChannelId, guildId) {
  if (guildId) {
    stopRotation(guildId);
  }
  if (!voiceChannelId) return;

  channelStatusCache.delete(voiceChannelId);
  try {
    await client.rest.put(`/channels/${voiceChannelId}/voice-status`, {
      body: { status: "" },
    });
    logger.debug(`[VC Status] Cleared voice status for channel ${voiceChannelId}`);
  } catch (err) {
    logger.debug(`[VC Status] Failed to clear status for channel ${voiceChannelId}:`, err.message);
  }
}

module.exports = {
  formatStatusString,
  setChannelStatus,
  startRotation,
  stopRotation,
  onTrackStart,
  onPause,
  onResume,
  onTrackEnd,
  clearVoiceStatus,
};
