require("dotenv").config();

module.exports = {
  // Discord Application
  discord: {
    token: process.env.DISCORD_TOKEN || "",
    clientId: process.env.CLIENT_ID || "",
    guildId: process.env.GUILD_ID || "",
  },

  // Ultra-Low-Latency Lavalink v4 Node Credentials
  lavalink: {
    id: process.env.LAVALINK_ID || "Primary-Ultra-Node",
    host: process.env.LAVALINK_HOST || "lavalink.opendrive.indevs.in",
    port: parseInt(process.env.LAVALINK_PORT || "443", 10),
    authorization: process.env.LAVALINK_PASSWORD || "youshallnotpass",
    secure: process.env.LAVALINK_SECURE !== undefined
      ? (process.env.LAVALINK_SECURE === "true" || process.env.LAVALINK_SECURE === "1")
      : (parseInt(process.env.LAVALINK_PORT || "443", 10) === 443),
    retryAmount: Infinity,
    retryDelay: 1000, // 1s fast reconnection
    requestTimeout: 6000, // Snappier REST timeout
    heartBeatInterval: 25000, // 25s keepalive keeps Cloudflare Tunnel & NAT mapping primed
    sessionResumeTimeout: 60, // 60s session resuming for seamless <50ms reconnection
  },

  // Player Settings for 0ms Gapless Playback & Opus Direct Passthrough
  player: {
    defaultVolume: 100, // 100 is neutral: guarantees LavaPlayer Opus direct passthrough
    defaultAutoplay: process.env.DEFAULT_AUTOPLAY === "true" || false, // Starts off by default, turns on with button or command
    applyVolumeAsFilter: false, // NEVER decode to PCM if volume is 100
    autoMaximizeBitrate: process.env.AUTO_MAXIMIZE_BITRATE !== "false", // Automatically maximizes voice channel to 384kbps if permitted
    defaultSearchPlatform: process.env.DEFAULT_SEARCH_PLATFORM || "spsearch", // spsearch, ytsearch, ytmsearch, scsearch, jssearch
    maxPreviousTracks: 25,
    inactivityTimeoutMs: parseInt(process.env.INACTIVITY_TIMEOUT_MS || "180000", 10), // 3 minutes
    emptyChannelTimeoutMs: parseInt(process.env.EMPTY_CHANNEL_TIMEOUT_MS || "120000", 10), // 2 minutes
    autoReconnect: true,
    gaplessPreload: true, // Pre-resolve next track/autoplay recommendation in background
    autocompleteCacheTtlMs: 300000, // 5-minute memory cache for instant <1ms autocomplete
    useComponentsV2: process.env.USE_COMPONENTS_V2 !== "false", // Native Discord Components V2 Container (Flags: 32768)
  },

  // Real-Time Voice Channel Status (VC Status) Engine (No Emojis)
  voiceStatus: {
    enabled: process.env.ENABLE_VC_STATUS !== "false",
    rotateIntervalMs: parseInt(process.env.VC_STATUS_ROTATE_INTERVAL_MS || "35000", 10), // 35-second rotation
    templates: [
      "{title} by - {author}",          // Exact user-requested format
      "{title} by {author}",            // Clean classic format
      "Playing: {title} by {author}",   // Streaming standard
      "[{duration}] {title} by {author}", // Timestamped layout
      "{title} - {author}",             // Minimalist format
      "Listening to {title} - {author}",// Rich presence format
      "{title} | {author}",             // Modern pipe separator
    ],
  },

  // Cohesive Modern Color Palette (Eara Design System)
  colors: {
    surface: 0x2b2d31,     // Discord Native Dark Surface (Containers & Embeds)
    primary: 0x5865f2,     // Blurple Accent (Primary Actions & Buttons)
    success: 0x2ec4b6,     // Mint Green (Successful Operations)
    warning: 0xf59e0b,     // Warm Amber (Warnings & Standby)
    error: 0xef4444,       // Clean Crimson (Errors & Disconnects)
    neutral: 0x1e1f22,     // Deep Canvas
    spotify: 0x1db954,     // Spotify Brand Green
    youtube: 0xff0000,     // YouTube Crimson
    soundcloud: 0xff5500,  // SoundCloud Amber
    jiosaavn: 0x00d2b5,    // JioSaavn Teal
  },

  // Centralized Shared Emojis (No Duplication)
  emojis: require("./utils/emojis"),
};
