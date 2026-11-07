/**
 * ==============================================================================
 * SINGLE SOURCE OF TRUTH FOR ALL EMOJIS (Pulse Music Bot)
 * ==============================================================================
 * 
 * To customize ANY emoji across the entire bot, simply edit the values below in EMOJI_CONFIG!
 * Every command, button, status notice, volume preset, embed, and progress bar dynamically
 * reads from this single file. No other files have to be touched.
 * 
 * All default emojis below are 100% static, monochrome white vector emojis synced
 * directly into your Discord server for a crisp, professional Eara-style look.
 */

const EMOJI_CONFIG = {
  // ---------------------------------------------------------------------------
  // 1. PLAYER TRANSPORT CONTROLS (Monochrome White Static Guild Emojis)
  // ---------------------------------------------------------------------------
  play: "<:p_play:1568522262892777533>",
  pause: "<:p_pause:1568522268068286466>",
  playpause: "<:p_playpause:1568522273537785977>",
  previous: "<:p_previous:1568522285315264595>",
  skip: "<:p_skip:1568522279674183710>",
  stop: "<:p_stop:1568522290537439343>",
  loop: "<:p_loop:1568522296099082353>",
  loopOne: "<:p_loop_one:1568522307721502792>",
  shuffle: "<:p_shuffle:1568522313408847932>",
  autoplay: "<:p_autoplay:1568522318760644641>",
  save: "<:p_heart:1568522324158976080>",
  heart: "<:p_heart:1568522324158976080>",
  openPlayer: "⏏",
  queue: "<:p_queue:1568522329363849288>",

  // ---------------------------------------------------------------------------
  // 2. VOLUME CONTROLS & AUDIO LEVELS
  // ---------------------------------------------------------------------------
  volume: "<:p_volume:1568522335202443417>",
  volumeNormal: "<:p_volume:1568522335202443417>",
  volumeLow: "<:p_volumelow:1568522340944314418>",
  volumeMute: "<:p_volumemute:1568522346141192212>",
  volumeBoost: "<:p_volume:1568522335202443417>",

  // ---------------------------------------------------------------------------
  // 3. SYSTEM STATUS, ALERTS & BADGES
  // ---------------------------------------------------------------------------
  success: "<:p_check:1568522387237113987>",
  check: "<:p_check:1568522387237113987>",
  error: "<:p_cross:1568522392643309619>",
  cross: "<:p_cross:1568522392643309619>",
  warn: "⚠️",
  alert: "⚠️",
  info: "ℹ️",
  sparkles: "<:p_sparkles:1568522354512887851>",
  fire: "<:p_fire:1568522381868277822>",
  pin: "📌",
  live: "🔴",
  online: "🟢",
  offline: "🔴",

  // ---------------------------------------------------------------------------
  // 4. MUSIC FEATURES & UTILITY CONTROLS
  // ---------------------------------------------------------------------------
  music: "<:p_music:1568522360380989512>",
  disc: "<:p_disc:1568522365774856287>",
  radio: "<:p_radio:1568522371353284699>",
  dj: "<:p_dj:1568522376411619421>",
  playlist: "<:p_queue:1568522329363849288>",
  lyrics: "<:p_music:1568522360380989512>",
  scroll: "📜",
  search: "<:p_music:1568522360380989512>",
  equalizer: "<:p_volume:1568522335202443417>",
  time: "⏱️",
  user: "👤",
  link: "🔗",
  stats: "📊",
  ping: "📡",
  clear: "🗑️",
  reset: "<:p_loop:1568522296099082353>",
  settings: "⚙️",
  gear: "⚙️",
  help: "⚡",
  pointer: "👉",
  book: "📖",
  leave: "👋",
  wave: "👋",
  vote: "🗳️",
  mic: "🎤",
  guitar: "🎸",
  audio: "<:p_volume:1568522335202443417>",

  // ---------------------------------------------------------------------------
  // 5. STREAMING PLATFORMS (Monochrome White Branding)
  // ---------------------------------------------------------------------------
  spotify: "<:p_spotify:1568522397781336094>",
  youtube: "<:p_youtube:1568522403120812062>",
  soundcloud: "<:p_soundcloud:1568522408485195807>",
  jiosaavn: "<:p_music:1568522360380989512>",
  bandcamp: "<:p_disc:1568522365774856287>",
  twitch: "<:p_radio:1568522371353284699>",
  web: "<:p_disc:1568522365774856287>",

  // ---------------------------------------------------------------------------
  // 6. DSP AUDIO FILTERS
  // ---------------------------------------------------------------------------
  filter8D: "<:p_dj:1568522376411619421>",
  filterBass: "<:p_volume:1568522335202443417>",
  filterNightcore: "<:p_sparkles:1568522354512887851>",
  filterVaporwave: "<:p_disc:1568522365774856287>",
  filterKaraoke: "<:p_music:1568522360380989512>",
  filterPop: "<:p_music:1568522360380989512>",
  filterRock: "<:p_music:1568522360380989512>",
  filterNormalizer: "<:p_disc:1568522365774856287>",
  filterReset: "<:p_loop:1568522296099082353>",

  // ---------------------------------------------------------------------------
  // 7. SEAMLESS PROGRESS BAR BLOCKS
  // ---------------------------------------------------------------------------
  bar_lf: "<:p_bar_lf:1568522414768390145>",
  bar_mf: "<:p_bar_mf:1568522420590215231>",
  bar_rf: "<:p_bar_rf:1568522426470371388>",
  bar_le: "<:p_bar_le:1568522432396922990>",
  bar_me: "<:p_bar_me:1568522437832745130>",
  bar_re: "<:p_bar_re:1568522443205779460>",
  bar_single_f: "<:p_bar_single_f:1568522448704380999>",
};

// Unified shared dictionary supporting both top-level and categorized access
const emojis = {
  ...EMOJI_CONFIG,

  // Categorized namespaces
  player: {
    previous: EMOJI_CONFIG.previous,
    play: EMOJI_CONFIG.play,
    pause: EMOJI_CONFIG.pause,
    playpause: EMOJI_CONFIG.playpause,
    skip: EMOJI_CONFIG.skip,
    stop: EMOJI_CONFIG.stop,
    loop: EMOJI_CONFIG.loop,
    loopOne: EMOJI_CONFIG.loopOne,
    shuffle: EMOJI_CONFIG.shuffle,
    autoplay: EMOJI_CONFIG.autoplay,
    save: EMOJI_CONFIG.save,
    heart: EMOJI_CONFIG.heart,
    openPlayer: EMOJI_CONFIG.openPlayer,
    queue: EMOJI_CONFIG.queue,
  },

  volume: {
    mute: EMOJI_CONFIG.volumeMute,
    low: EMOJI_CONFIG.volumeLow,
    normal: EMOJI_CONFIG.volumeNormal,
    boost: EMOJI_CONFIG.volumeBoost,
  },

  filters: {
    spatial8D: EMOJI_CONFIG.filter8D,
    bass: EMOJI_CONFIG.filterBass,
    nightcore: EMOJI_CONFIG.filterNightcore,
    vaporwave: EMOJI_CONFIG.filterVaporwave,
    karaoke: EMOJI_CONFIG.filterKaraoke,
    pop: EMOJI_CONFIG.filterPop,
    rock: EMOJI_CONFIG.filterRock,
    normalizer: EMOJI_CONFIG.filterNormalizer,
    reset: EMOJI_CONFIG.filterReset,
  },

  platforms: {
    spotify: EMOJI_CONFIG.spotify,
    youtube: EMOJI_CONFIG.youtube,
    soundcloud: EMOJI_CONFIG.soundcloud,
    jiosaavn: EMOJI_CONFIG.jiosaavn,
    bandcamp: EMOJI_CONFIG.bandcamp,
    twitch: EMOJI_CONFIG.twitch,
    web: EMOJI_CONFIG.web,
    music: EMOJI_CONFIG.music,
  },

  status: {
    success: EMOJI_CONFIG.success,
    error: EMOJI_CONFIG.error,
    warn: EMOJI_CONFIG.warn,
    info: EMOJI_CONFIG.info,
    sparkles: EMOJI_CONFIG.sparkles,
    fire: EMOJI_CONFIG.fire,
    pin: EMOJI_CONFIG.pin,
    live: EMOJI_CONFIG.live,
  },

  progress: {
    filled: "▰",
    empty: "▱",
    dot: "🔘",
    lineFilled: "━",
    lineEmpty: "─",
  },

  /**
   * Helper to format readable platform badge with emoji
   */
  getPlatformBadge(sourceName) {
    const src = (sourceName || "").toLowerCase();
    switch (src) {
      case "spotify":
        return `${EMOJI_CONFIG.spotify} Spotify`;
      case "youtube":
        return `${EMOJI_CONFIG.youtube} YouTube`;
      case "soundcloud":
        return `${EMOJI_CONFIG.soundcloud} SoundCloud`;
      case "jiosaavn":
        return `${EMOJI_CONFIG.jiosaavn} JioSaavn`;
      case "bandcamp":
        return `${EMOJI_CONFIG.bandcamp} Bandcamp`;
      case "twitch":
        return `${EMOJI_CONFIG.twitch} Twitch`;
      case "http":
      case "https":
        return `${EMOJI_CONFIG.web} Web Stream`;
      default:
        return `${EMOJI_CONFIG.music} Audio`;
    }
  },

  /**
   * Helper to get appropriate volume emoji for level percentage
   */
  getVolumeEmoji(level) {
    if (level === 0) return EMOJI_CONFIG.volumeMute;
    if (level < 50) return EMOJI_CONFIG.volumeLow;
    if (level <= 100) return EMOJI_CONFIG.volumeNormal;
    return EMOJI_CONFIG.volumeBoost;
  },

  /**
   * Helper to build progress bar with custom Discord server emojis or clean Unicode fallback
   */
  createProgressBar(current, total, size = 12) {
    if (!total || total === 0 || isNaN(total) || total === Infinity) {
      return `${EMOJI_CONFIG.live} \`[LIVE STREAM]\``;
    }
    const clampedCurrent = Math.min(Math.max(current, 0), total);
    const progress = Math.min(Math.max(clampedCurrent / total, 0), 1);
    const filledBlocks = Math.round(progress * size);

    // Seamless custom monochrome server emojis (Eara exact match)
    if (EMOJI_CONFIG.bar_lf && EMOJI_CONFIG.bar_le) {
      let bar = "";
      for (let i = 0; i < size; i++) {
        const isFirst = i === 0;
        const isLast = i === size - 1;
        const isFilled = i < filledBlocks;

        if (isFirst) {
          if (filledBlocks === 1 && EMOJI_CONFIG.bar_single_f) {
            bar += EMOJI_CONFIG.bar_single_f;
          } else {
            bar += isFilled ? EMOJI_CONFIG.bar_lf : EMOJI_CONFIG.bar_le;
          }
        } else if (isLast) {
          bar += isFilled ? EMOJI_CONFIG.bar_rf : EMOJI_CONFIG.bar_re;
        } else {
          bar += isFilled ? EMOJI_CONFIG.bar_mf : EMOJI_CONFIG.bar_me;
        }
      }
      return bar;
    }

    // High quality Unicode fallback
    const emptyProgress = Math.max(0, size - filledBlocks);
    const filled = "▰".repeat(Math.max(0, filledBlocks));
    const empty = "▱".repeat(emptyProgress);

    return `${filled}${empty}`;
  },
};

module.exports = emojis;
