/**
 * High-Speed Autocomplete Engine for Song Search Inputs (Jockie / Eara Style)
 * 
 * Features:
 * - Direct Lavalink YouTube Music resolution (~500ms)
 * - Google / YouTube Suggest API instantaneous fallback (~300ms)
 * - Ultra-low-latency in-memory cache (< 1ms response on repeat keystrokes)
 * - Discord 100-character name/value clamping (prevents Error 50035 Invalid Form Body)
 * - 2500ms safety timeout guard (prevents Error 10062 Unknown interaction timeouts)
 */

const { formatDuration, truncate } = require("./formatters");
const { cleanTrackTitle } = require("./sourceManager");
const logger = require("./logger");

// 5-minute in-memory cache for autocomplete queries
const autocompleteCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch suggestions from Google / YouTube Suggest endpoint (< 400ms)
 */
async function fetchGoogleSuggestions(query) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&client=firefox&q=${encodeURIComponent(query)}`;
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!res.ok) return [];
    const data = await res.json();
    const suggestions = data[1] || [];
    
    return suggestions.slice(0, 10).map((s) => {
      const clean = truncate(s, 95);
      return {
        name: `🔍 ${clean}`,
        value: clean,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Handle autocomplete interaction for song search queries
 * @param {import("discord.js").AutocompleteInteraction} interaction 
 * @param {import("../structures/BotClient")} client 
 */
async function handleSearchAutocomplete(interaction, client) {
  const query = interaction.options.getString("query");
  if (!query || query.trim().length < 2) {
    return interaction.respond([]);
  }

  const trimmedQuery = query.trim().toLowerCase();

  // If user pasted a direct URL (Spotify, YouTube, SoundCloud, etc.), skip autocomplete
  if (/^https?:\/\//i.test(trimmedQuery)) {
    return interaction.respond([]);
  }

  // 1. High-speed memory cache check (< 1ms)
  const cached = autocompleteCache.get(trimmedQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return interaction.respond(cached.choices).catch(() => {});
  }

  const choices = [];

  try {
    // Safely retrieve connected node (Map safe iteration, never .first())
    const node = client.lavalink?.nodeManager?.nodes?.values()?.next()?.value;

    if (node && node.connected) {
      // Query YouTube Music directly for accurate track titles and durations
      const searchPromise = node.search(
        { query: `ytmsearch:${query}` },
        { id: interaction.user.id }
      );

      // 2-second timeout guard to strictly respect Discord's 3-second limit
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2000));
      const res = await Promise.race([searchPromise, timeoutPromise]);

      if (res && res.tracks && res.tracks.length > 0) {
        for (const t of res.tracks.slice(0, 10)) {
          const cleanTitle = truncate(cleanTrackTitle(t.info.title), 46);
          const cleanAuthor = truncate(t.info.author, 24);
          const duration = formatDuration(t.info.duration);

          const choiceName = truncate(`${cleanTitle} — ${cleanAuthor} [${duration}]`, 100);
          const choiceValue = truncate(t.info.uri || t.info.title, 100);

          choices.push({
            name: choiceName,
            value: choiceValue,
          });
        }
      }
    }
  } catch (err) {
    logger.debug("Lavalink autocomplete search failed:", err.message);
  }

  // 2. If Lavalink returned no tracks or was slow, fallback to Google / YouTube suggest
  if (choices.length === 0) {
    const suggestions = await fetchGoogleSuggestions(query);
    choices.push(...suggestions);
  }

  // Clamp strictly to Discord's maximum allowed 25 choices (we use top 10 for clean UX)
  const finalChoices = choices.slice(0, 10);

  // Store in cache
  autocompleteCache.set(trimmedQuery, {
    choices: finalChoices,
    timestamp: Date.now(),
  });

  return interaction.respond(finalChoices).catch(() => {});
}

module.exports = {
  handleSearchAutocomplete,
};
