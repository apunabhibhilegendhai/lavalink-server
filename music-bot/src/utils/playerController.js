const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const config = require("../config");
const { getPlatformTheme, cleanTrackTitle } = require("./sourceManager");
const {
  formatDuration,
  createProgressBar,
  truncate,
  formatRequester,
  getSourceBadge,
} = require("./formatters");
const { buildComponentsV2Payload } = require("./componentsV2");
const autoplayManager = require("./autoplayManager");
const djManager = require("./djManager");
const db = require("../database/db");
const emojis = require("./emojis");
const voiceStatusManager = require("./voiceStatusManager");
const logger = require("./logger");

/**
 * Build Ultra-Compact Landscape Embed (Eara / Jockie Style Fallback)
 * Minimalist, micro-height, zero bloat, ZERO PINGS
 */
function buildNowPlayingEmbed(player) {
  const track = player.queue.current;
  if (!track) {
    return new EmbedBuilder()
      .setColor(0x2b2d31)
      .setDescription(`[Ready for Music](https://discord.com) — Pulse\nUse \`/play\` to stream audio.\n\n00:00 ${createProgressBar(0, 100, 12)} 00:00`);
  }

  const theme = getPlatformTheme(track.info.sourceName);
  const cleanTitle = truncate(cleanTrackTitle(track.info.title), 40);
  const cleanAuthor = truncate(track.info.author, 25);
  const uri = track.info.uri || "https://discord.com";
  const albumOrSource = track.pluginInfo?.albumName || track.pluginInfo?.album?.name || theme.name;

  const progressSlider = track.info.isStream
    ? "🔴 `[LIVE STREAM]`"
    : `${formatDuration(player.position)} ${createProgressBar(player.position, track.info.duration, 12)} ${formatDuration(track.info.duration)}`;

  // Eara Format Line 1: [Title](URI) — Artist
  const line1 = `[${cleanTitle}](${uri}) — ${cleanAuthor}`;

  // Eara Format Line 2: <@Requester> · Album/Source (Zero pings enforced via allowedMentions)
  const requesterId = track.requester?.id || (typeof track.requester === "string" && /^\d+$/.test(track.requester) ? track.requester : null);
  const requesterBadge = track.isAutoplay
    ? `${emojis.sparkles} \`Autoplay\` · ${truncate(track.seedTitle || albumOrSource, 25)}`
    : requesterId
      ? `<@${requesterId}> · ${albumOrSource}`
      : `@${formatRequester(track.requester)} · ${albumOrSource}`;

  // Eara Format Line 3: 00:18 [progress-bar] 03:42
  const line3 = progressSlider;

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setDescription(`${line1}\n${requesterBadge}\n\n${line3}`);

  if (track.info.artworkUrl) {
    embed.setThumbnail(track.info.artworkUrl);
  }

  return embed;
}

/**
 * Build Exact Eara 2-Row Transport Control Component Layout
 * Matches media_1794027502596_85dec848.png:
 * Row 1: [⏮] [▶/⏸] [⏭] [🤍] [⏏ Open player]
 * Row 2: [🔁] [🔀] [∞] [📑] [⏹]
 */
function buildNowPlayingComponents(player) {
  const isPaused = player.paused;
  const hasPrevious = (player.queue.previous?.length || 0) > 0;
  const isAutoplay = Boolean(player.get("autoplay"));
  const isLooping = player.repeatMode !== "off";

  // Row 1 (5 items): Previous, Play/Pause, Skip, Save to DM, Open Player
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_prev")
      .setEmoji(emojis.previous)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasPrevious),
    new ButtonBuilder()
      .setCustomId("btn_pause_resume")
      .setEmoji(isPaused ? emojis.play : emojis.pause)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("btn_skip")
      .setEmoji(emojis.skip)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("btn_save")
      .setEmoji(emojis.save)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("btn_open_player")
      .setEmoji(emojis.openPlayer)
      .setLabel("Open player")
      .setStyle(ButtonStyle.Primary)
  );

  // Row 2 (5 items): Repeat/Loop, Shuffle, Autoplay, Queue, Stop
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_loop")
      .setEmoji(player.repeatMode === "track" ? emojis.loopOne : emojis.loop)
      .setStyle(isLooping ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("btn_shuffle")
      .setEmoji(emojis.shuffle)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("btn_autoplay")
      .setEmoji(emojis.autoplay)
      .setStyle(isAutoplay ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("btn_queue")
      .setEmoji(emojis.queue)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("btn_stop")
      .setEmoji(emojis.stop)
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

/**
 * Build standard Discord embed fallback payload (Zero Pings guaranteed)
 */
function getFallbackEmbedPayload(player) {
  const components = buildNowPlayingComponents(player);
  return {
    embeds: [buildNowPlayingEmbed(player)],
    components,
    allowedMentions: { parse: [], users: [] },
  };
}

/**
 * Build the payload for sending or editing the dashboard
 */
function getDashboardPayload(player) {
  const components = buildNowPlayingComponents(player);

  if (config.player.useComponentsV2) {
    try {
      const v2Payload = buildComponentsV2Payload(player, components);
      v2Payload.allowed_mentions = { parse: [], users: [] };
      return v2Payload;
    } catch (err) {
      logger.debug("Components V2 payload error:", err.message);
    }
  }

  return getFallbackEmbedPayload(player);
}

/**
 * Send or Edit in-place the Player Dashboard (Jockie / Eara Best Practice)
 * Prevents channel spam and completely stops repeated user notification pings
 */
async function sendOrUpdatePlayerDashboard(channel, player) {
  if (!channel || !player) return null;

  const payload = getDashboardPayload(player);
  const prevMsgId = player.get("nowPlayingMsgId");

  // Attempt to edit previous message in-place if still in channel
  if (prevMsgId) {
    try {
      const prevMsg = await channel.messages.fetch(prevMsgId).catch(() => null);
      if (prevMsg && prevMsg.editable) {
        return await prevMsg.edit(payload);
      }
    } catch {
      // If Components V2 rejected or message deleted, try fallback
      if (payload.flags === 32768) {
        try {
          const fallback = getFallbackEmbedPayload(player);
          const prevMsg = await channel.messages.fetch(prevMsgId).catch(() => null);
          if (prevMsg && prevMsg.editable) {
            return await prevMsg.edit(fallback);
          }
        } catch {}
      }
    }
  }

  // Otherwise send a new dashboard and store its ID
  try {
    const msg = await channel.send(payload);
    player.set("nowPlayingMsgId", msg.id);
    return msg;
  } catch (err) {
    // If Components V2 failed (e.g. channel restrictions), gracefully fall back
    if (payload.flags === 32768) {
      try {
        const fallback = getFallbackEmbedPayload(player);
        const msg = await channel.send(fallback);
        player.set("nowPlayingMsgId", msg.id);
        return msg;
      } catch (innerErr) {
        logger.error("Failed to send fallback player dashboard:", innerErr.message);
        return null;
      }
    }
    logger.error("Failed to send player dashboard:", err.message);
    return null;
  }
}

/**
 * Update interaction with Components V2 or Landscape Embed fallback
 */
async function updatePlayerInteraction(interaction, player) {
  const payload = getDashboardPayload(player);

  try {
    return await interaction.update(payload);
  } catch (err) {
    try {
      const fallback = getFallbackEmbedPayload(player);
      return await interaction.update(fallback);
    } catch (fallbackErr) {
      logger.debug("Interaction update fallback:", fallbackErr.message);
    }
  }
}

/**
 * Handle interactive button clicks on the player controller
 */
async function handlePlayerButton(interaction, client) {
  const { customId, guildId, member } = interaction;

  // Handle playlist playback triggers directly from playlist buttons
  if (customId === "cmd_pl_play_favs" || customId.startsWith("cmd_pl_play_")) {
    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: "⚠️ You must be connected to a voice channel to stream playlists.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let targetTracks = [];
    let playlistName = "";

    if (customId === "cmd_pl_play_favs") {
      playlistName = "Favorites";
      targetTracks = db.getFavorites(member.id);
    } else {
      playlistName = customId.replace("cmd_pl_play_", "");
      const pl = db.getPlaylist(member.id, playlistName);
      if (pl) {
        targetTracks = db.getPlaylistTracks(pl.id);
      }
    }

    if (!targetTracks || targetTracks.length === 0) {
      return interaction.editReply({
        content: `❌ Playlist **${playlistName}** is empty or does not exist.`,
      });
    }

    let activePlayer = client.lavalink.getPlayer(guildId);
    if (!activePlayer) {
      activePlayer = client.lavalink.createPlayer({
        guildId,
        voiceChannelId: voiceChannel.id,
        textChannelId: interaction.channelId,
        selfDeaf: true,
        volume: config.player.defaultVolume,
      });
      activePlayer.set("autoplay", config.player.defaultAutoplay ?? true);
    }

    if (!activePlayer.connected) {
      await activePlayer.connect();
    }

    let loaded = 0;
    for (const item of targetTracks) {
      try {
        const res = await activePlayer.search({ query: item.uri || item.title }, interaction.user);
        if (res?.tracks?.length > 0) {
          activePlayer.queue.add(res.tracks[0]);
          loaded++;
        }
      } catch {}
    }

    if (!activePlayer.playing && !activePlayer.paused) {
      await activePlayer.play();
    }

    return interaction.editReply({
      content: `🎵 Loaded and queued **${loaded} track(s)** from **${playlistName}**!`,
    });
  }

  const player = client.lavalink.getPlayer(guildId);

  if (!player) {
    return interaction.reply({
      content: "❌ No active audio player found in this server.",
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [], users: [] },
    });
  }

  // Voice channel safety validation
  if (!member.voice.channelId) {
    return interaction.reply({
      content: "⚠️ You must be connected to a voice channel to use audio controls.",
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [], users: [] },
    });
  }

  if (player.voiceChannelId && member.voice.channelId !== player.voiceChannelId) {
    return interaction.reply({
      content: `⚠️ You must be in the same voice channel (<#${player.voiceChannelId}>) to use audio controls.`,
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [], users: [] },
    });
  }

  // Helper to enforce DJ permissions on playback modifications
  const checkDJ = (isSkip = false) => {
    const perm = djManager.canManagePlayer(member, player, isSkip);
    if (!perm.allowed) {
      interaction.reply({
        content: perm.reason,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
      return false;
    }
    return true;
  };

  switch (customId) {
    case "cmd_resume":
    case "cmd_pause":
    case "btn_pause_resume": {
      if (!checkDJ(false)) return;
      if (player.paused) {
        await player.resume();
        voiceStatusManager.onResume(client, player);
      } else {
        await player.pause();
        voiceStatusManager.onPause(client, player);
      }
      if (customId === "btn_pause_resume") {
        await updatePlayerInteraction(interaction, player);
      } else {
        await interaction.reply({
          content: player.paused ? `${emojis.pause} Playback paused.` : `${emojis.play} Playback resumed.`,
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [], users: [] },
        });
      }
      break;
    }

    case "btn_skip": {
      if (!checkDJ(true)) return;
      const currentTitle = player.queue.current?.info?.title || "current track";
      await player.skip();
      await interaction.reply({
        content: `⏭️ Skipped **${truncate(currentTitle, 45)}**`,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
      break;
    }

    case "btn_prev": {
      if (!checkDJ(false)) return;
      const prevTrack = player.queue.previous[0];
      if (!prevTrack) {
        return interaction.reply({
          content: "❌ No previous track found in session history.",
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [], users: [] },
        });
      }
      await player.play({ track: prevTrack });
      await interaction.reply({
        content: `⏮️ Playing previous: **${truncate(prevTrack.info.title, 45)}**`,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
      break;
    }

    case "btn_save": {
      const track = player.queue.current;
      if (!track) {
        return interaction.reply({
          content: "❌ No song is currently streaming.",
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [], users: [] },
        });
      }

      // Save directly into SQLite favorites library
      db.addFavorite(interaction.user.id, track);

      const cleanTitle = truncate(track.info.title, 50);
      const uri = track.info.uri || "https://discord.com";

      const dmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Open Song")
          .setURL(uri)
      );

      const dmContent =
        `🤍 **Saved to Favorites: [${cleanTitle}](${uri})**\n` +
        `• **Artist:** \`${track.info.author || "Unknown"}\`\n` +
        `• **Duration:** \`${formatDuration(track.info.duration)}\`\n` +
        `• **Server:** \`${interaction.guild.name}\`\n\n` +
        `-# Use \`/playlist play-favorites\` to stream all your saved songs anytime!`;

      try {
        await interaction.user.send({
          content: dmContent,
          components: [dmRow],
          allowedMentions: { parse: [], users: [] },
        });
        return interaction.reply({
          content: `🤍 Saved **[${cleanTitle}](${uri})** to your Favorites & sent details to your DMs!\n-# Use \`/playlist play-favorites\` to stream anytime`,
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [], users: [] },
        });
      } catch {
        return interaction.reply({
          content: `🤍 Saved **[${cleanTitle}](${uri})** to your Favorites!\n-# Use \`/playlist play-favorites\` to stream anytime`,
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [], users: [] },
        });
      }
    }

    case "btn_open_player": {
      const currentTrack = player.queue.current;
      const is247 = Boolean(player.get("247"));
      const isAutoplay = Boolean(player.get("autoplay"));
      const loopMode = player.repeatMode || "off";
      const totalDuration = player.queue.tracks.reduce(
        (acc, t) => acc + (t.info.duration || 0),
        currentTrack?.info?.duration || 0
      );

      const trackTitle = currentTrack ? truncate(currentTrack.info.title, 40) : "No song playing";
      const trackUri = currentTrack?.info?.uri || "https://discord.com";
      const trackAuthor = currentTrack?.info?.author || "Unknown";

      const consoleContent =
        `🎛️ **Audio Console & Control Center**\n` +
        `▶️ **Now Playing:** [${trackTitle}](${trackUri}) — \`${trackAuthor}\`\n\n` +
        `• **Volume:** \`${player.volume}%\` · **Repeat:** \`${loopMode.toUpperCase()}\`\n` +
        `• **Autoplay:** \`${isAutoplay ? "ENABLED" : "OFF"}\` · **24/7 Mode:** \`${is247 ? "ACTIVE" : "OFF"}\`\n` +
        `• **Queue:** \`${player.queue.tracks.length} track(s)\` (\`${formatDuration(totalDuration)}\` total)\n\n` +
        `-# Select a quick volume preset or DSP audio filter below:`;

      const volRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("pctrl_vol_50").setLabel("50%").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("pctrl_vol_100").setLabel("100%").setStyle(player.volume === 100 ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("pctrl_vol_150").setLabel("150%").setStyle(ButtonStyle.Secondary)
      );

      const filterRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("pctrl_filter_bass").setLabel("Bass Boost").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("pctrl_filter_nightcore").setLabel("Nightcore").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("pctrl_filter_8d").setLabel("8D Audio").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("pctrl_filter_clear").setLabel("Reset EQ").setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        content: consoleContent,
        components: [volRow, filterRow],
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    case "btn_loop": {
      if (!checkDJ(false)) return;
      let nextMode = "off";
      if (player.repeatMode === "off") nextMode = "track";
      else if (player.repeatMode === "track") nextMode = "queue";
      else nextMode = "off";

      player.setRepeatMode(nextMode);
      await updatePlayerInteraction(interaction, player);
      break;
    }

    case "btn_shuffle": {
      if (!checkDJ(false)) return;
      if (player.queue.tracks.length < 2) {
        return interaction.reply({
          content: "⚠️ Not enough songs in queue to shuffle (minimum 2 needed).",
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [], users: [] },
        });
      }
      player.queue.shuffle();
      await interaction.reply({
        content: `🔀 Shuffled **${player.queue.tracks.length}** songs in queue!`,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
      break;
    }

    case "btn_autoplay": {
      if (!checkDJ(false)) return;
      const currentAutoplay = Boolean(player.get("autoplay"));
      const newAutoplay = !currentAutoplay;
      player.set("autoplay", newAutoplay);

      // Pre-fetch next recommendation if queue is empty
      const seedTrack = player.queue.current || player.queue.previous[0] || player.get("lastPlayedTrack");
      if (newAutoplay && seedTrack) {
        if (!player.playing && player.queue.tracks.length === 0) {
          // If queue ended already, immediately start autoplaying!
          await autoplayManager.executeAutoplay(player, seedTrack, false);
        } else {
          autoplayManager.prefetchAutoplay(player, seedTrack);
        }
      }

      await updatePlayerInteraction(interaction, player);
      await interaction.followUp({
        content: newAutoplay
          ? "♾️ **Autoplay enabled**: Next songs will play automatically after this track finishes."
          : "♾️ **Autoplay disabled**.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
      break;
    }

    case "cmd_queue":
    case "btn_queue": {
      const current = player.queue.current;
      const tracks = player.queue.tracks;

      if (!current && tracks.length === 0) {
        return interaction.reply({
          content: "📑 The queue is currently empty. Use `/play` to add tracks!",
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [], users: [] },
        });
      }

      const queueItems = tracks.slice(0, 10).map((t, idx) => {
        return `\`${idx + 1}.\` [${truncate(t.info.title, 36)}](${t.info.uri || "https://discord.com"}) — \`${formatDuration(t.info.duration)}\``;
      });

      const remaining = tracks.length > 10 ? `\n*...and ${tracks.length - 10} more tracks*` : "";
      const totalDuration = tracks.reduce(
        (acc, t) => acc + (t.info.duration || 0),
        current?.info?.duration || 0
      );

      const queueContent =
        `📑 **Upcoming Queue — ${tracks.length} track(s)**\n\n` +
        `▶️ **Now Playing:** [${truncate(current?.info?.title || "Nothing", 40)}](${current?.info?.uri || "https://discord.com"})\n\n` +
        `**Next Tracks:**\n${queueItems.length > 0 ? queueItems.join("\n") + remaining : "*No upcoming tracks in queue.*"}\n\n` +
        `-# Total Duration: \`${formatDuration(totalDuration)}\` · Autoplay: \`${player.get("autoplay") ? "ON" : "OFF"}\``;

      return interaction.reply({
        content: queueContent,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    case "btn_stop": {
      if (!checkDJ(false)) return;
      player.queue.tracks.splice(0, player.queue.tracks.length);
      await player.destroy("User pressed Stop button");
      await interaction.reply({
        content: "⏹️ Playback stopped, queue cleared, and disconnected from voice channel.",
        allowedMentions: { parse: [], users: [] },
      });
      break;
    }

    // Quick Console Handlers
    case "pctrl_vol_50": {
      if (!checkDJ(false)) return;
      await player.setVolume(50);
      return interaction.reply({
        content: "🔉 Volume set to **50%**.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }
    case "pctrl_vol_100": {
      if (!checkDJ(false)) return;
      await player.setVolume(100);
      return interaction.reply({
        content: "🔊 Volume set to **100% (Lossless Direct Passthrough)**.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }
    case "pctrl_vol_150": {
      if (!checkDJ(false)) return;
      await player.setVolume(150);
      return interaction.reply({
        content: "📢 Volume boosted to **150%**.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }
    case "pctrl_filter_bass": {
      if (!checkDJ(false)) return;
      await player.filterManager.setEqualizer([
        { band: 0, gain: 0.25 },
        { band: 1, gain: 0.20 },
        { band: 2, gain: 0.15 },
        { band: 3, gain: 0.10 },
      ]);
      return interaction.reply({
        content: "🎧 **Bass Boost** preset applied.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }
    case "pctrl_filter_nightcore": {
      if (!checkDJ(false)) return;
      await player.filterManager.setTimescale({ speed: 1.25, pitch: 1.25, rate: 1.0 });
      return interaction.reply({
        content: "⚡ **Nightcore** preset applied.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }
    case "pctrl_filter_8d": {
      if (!checkDJ(false)) return;
      await player.filterManager.setRotation({ rotationHz: 0.2 });
      return interaction.reply({
        content: "🌊 **8D Surround** preset applied.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }
    case "pctrl_filter_clear": {
      if (!checkDJ(false)) return;
      await player.filterManager.resetFilters();
      return interaction.reply({
        content: "🔄 Equalizer & audio filters reset to flat default.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    default:
      break;
  }
}

/**
 * Handle filter select menu interaction
 */
async function handleFilterSelect(interaction, client) {
  const { values, guildId } = interaction;
  const player = client.lavalink.getPlayer(guildId);
  if (!player) {
    return interaction.reply({
      content: "❌ No active audio player found in this server.",
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [], users: [] },
    });
  }

  const selected = values[0];
  switch (selected) {
    case "reset":
      await player.filterManager.resetFilters();
      return interaction.reply({
        content: "🔄 Reset all filters to default flat EQ.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    case "8d":
      await player.filterManager.resetFilters();
      await player.filterManager.toggleRotation();
      return interaction.reply({
        content: "🎧 Activated **8D Spatial Audio**.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    case "nightcore":
      await player.filterManager.resetFilters();
      await player.filterManager.toggleNightcore();
      return interaction.reply({
        content: "⚡ Activated **Nightcore**.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    case "vaporwave":
      await player.filterManager.resetFilters();
      await player.filterManager.toggleVaporwave();
      return interaction.reply({
        content: "🌊 Activated **Vaporwave**.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    case "bass":
      await player.filterManager.resetFilters();
      await player.filterManager.setEqualizer([{ band: 0, gain: 0.25 }, { band: 1, gain: 0.20 }, { band: 2, gain: 0.15 }]);
      return interaction.reply({
        content: "🔊 Activated **Bass Boost**.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    default:
      await player.filterManager.resetFilters();
      return interaction.reply({
        content: "🔄 Reset filters.",
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
  }
}

module.exports = {
  buildNowPlayingEmbed,
  buildNowPlayingComponents,
  sendOrUpdatePlayerDashboard,
  updatePlayerInteraction,
  handlePlayerButton,
  handleFilterSelect,
};
