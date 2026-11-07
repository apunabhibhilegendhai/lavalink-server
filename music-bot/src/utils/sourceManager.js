/**
 * Multi-Platform Source Manager & Media Metadata Resolver
 * Comprehensive support for YouTube, Spotify, SoundCloud, JioSaavn, and Web Streams
 */

const emojis = require("./emojis");

const PLATFORM_THEMES = {
  spotify: {
    name: "Spotify",
    badge: emojis.getPlatformBadge("spotify"),
    color: 0x1db954, // Official Spotify Green
    searchPrefix: "spsearch",
    icon: "https://cdn.icon-icons.com/icons2/2699/PNG/512/spotify_logo_icon_169824.png",
  },
  youtube: {
    name: "YouTube",
    badge: emojis.getPlatformBadge("youtube"),
    color: 0xff0000, // Official YouTube Red
    searchPrefix: "ytsearch",
    icon: "https://cdn.icon-icons.com/icons2/2699/PNG/512/youtube_logo_icon_168737.png",
  },
  soundcloud: {
    name: "SoundCloud",
    badge: emojis.getPlatformBadge("soundcloud"),
    color: 0xff5500, // Official SoundCloud Orange
    searchPrefix: "scsearch",
    icon: "https://cdn.icon-icons.com/icons2/2699/PNG/512/soundcloud_logo_icon_168864.png",
  },
  jiosaavn: {
    name: "JioSaavn",
    badge: emojis.getPlatformBadge("jiosaavn"),
    color: 0x00d2b5, // JioSaavn Teal
    searchPrefix: "jssearch",
    icon: "https://upload.wikimedia.org/wikipedia/commons/e/ed/JioSaavn_Logo.svg",
  },
  stream: {
    name: "Web Stream",
    badge: emojis.getPlatformBadge("http"),
    color: 0x5865f2, // Discord Blurple
    searchPrefix: "http",
    icon: "https://cdn-icons-png.flaticon.com/512/3845/3845868.png",
  },
};

/**
 * Detect source platform from URL or query
 * @param {string} query 
 * @returns {"spotify" | "youtube" | "soundcloud" | "jiosaavn" | "stream" | null}
 */
function detectSource(query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();

  if (/spotify\.com/i.test(q) || /^spsearch:/i.test(q)) {
    return "spotify";
  }
  if (/(youtube\.com|youtu\.be)/i.test(q) || /^(ytsearch|ytmsearch):/i.test(q)) {
    return "youtube";
  }
  if (/soundcloud\.com/i.test(q) || /^scsearch:/i.test(q)) {
    return "soundcloud";
  }
  if (/jiosaavn\.com/i.test(q) || /^jssearch:/i.test(q)) {
    return "jiosaavn";
  }
  if (/^https?:\/\/.*\.(mp3|aac|ogg|wav|flac|m4a|m3u8)(\?.*)?$/i.test(q)) {
    return "stream";
  }

  return null;
}

/**
 * Get platform styling theme
 * @param {string} sourceName 
 * @returns {typeof PLATFORM_THEMES.spotify}
 */
function getPlatformTheme(sourceName) {
  const key = (sourceName || "").toLowerCase();
  return PLATFORM_THEMES[key] || PLATFORM_THEMES.stream;
}

/**
 * Clean track title of noisy clickbait suffixes
 * @param {string} title 
 * @returns {string}
 */
function cleanTrackTitle(title) {
  if (!title) return "";
  return title
    .replace(/\[official\s*(music\s*video|audio|video|visualizer|lyric\s*video)\]/gi, "")
    .replace(/\(official\s*(music\s*video|audio|video|visualizer|lyric\s*video)\)/gi, "")
    .replace(/\(lyrics?\)/gi, "")
    .replace(/\[lyrics?\]/gi, "")
    .replace(/\(hq\s*audio\)/gi, "")
    .replace(/\(remastered(\s*\d{4})?\)/gi, "")
    .trim();
}

module.exports = {
  PLATFORM_THEMES,
  detectSource,
  getPlatformTheme,
  cleanTrackTitle,
};
