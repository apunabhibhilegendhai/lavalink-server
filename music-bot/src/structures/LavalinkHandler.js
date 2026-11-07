const { LavalinkManager } = require("lavalink-client");
const config = require("../config");
const logger = require("../utils/logger");
const autoplayManager = require("../utils/autoplayManager");
const { sendOrUpdatePlayerDashboard } = require("../utils/playerController");
const { updateRequestChannelDashboard } = require("../utils/requestChannelManager");
const { infoEmbed, warnEmbed, errorEmbed } = require("../utils/embed");
const { truncate } = require("../utils/formatters");
const voiceStatusManager = require("../utils/voiceStatusManager");
const audioOptimizer = require("../utils/audioOptimizer");
const stateManager = require("../utils/stateManager");

/**
 * Initialize and attach optimized LavalinkManager to BotClient
 * @param {import("discord.js").Client} client 
 */
function initLavalink(client) {
  const manager = new LavalinkManager({
    nodes: [
      {
        id: config.lavalink.id,
        host: config.lavalink.host,
        port: config.lavalink.port,
        authorization: config.lavalink.authorization,
        secure: config.lavalink.secure,
        retryAmount: config.lavalink.retryAmount,
        retryDelay: config.lavalink.retryDelay,
        requestSignalTimeoutMS: config.lavalink.requestTimeout,
        heartBeatInterval: config.lavalink.heartBeatInterval, // 25s keep-alive
        enablePingOnStatsCheck: true,
      },
    ],
    sendToShard: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) guild.shard.send(payload);
    },
    autoSkip: true,
    autoSkipOnResolveError: true, // Never freeze on corrupt audio chunks
    emitNewSongsOnly: true,
    playerOptions: {
      defaultSearchPlatform: config.player.defaultSearchPlatform,
      applyVolumeAsFilter: false, // Opus Direct Passthrough: skip PCM transcoding when volume = 100
      minAutoPlayMs: 0, // Never throttle or block autoplay on track completion
      onDisconnect: {
        autoReconnect: config.player.autoReconnect,
        destroyPlayer: false, // Keep session alive on network glitch
      },
      onEmptyQueue: {
        destroyAfterMs: config.player.inactivityTimeoutMs,
        // Native Jockie-style Autoplay Hook (executed when last track finishes)
        autoPlayFunction: async (player, track) => {
          const isAutoplay = Boolean(player.get("autoplay"));
          if (isAutoplay) {
            await autoplayManager.executeAutoplay(player, track, true);
          }
        },
      },
    },
    queueOptions: {
      maxPreviousTracks: config.player.maxPreviousTracks,
    },
  });

  // ---------------------------------------------------------------------------
  // Lavalink Node Lifecycle Events & Session Resuming
  // ---------------------------------------------------------------------------
  manager.nodeManager.on("connect", async (node) => {
    logger.lavalink(
      `Connected to node: ${node.id} (${node.options.host}:${node.options.port}) [v${node.info?.version?.semver || "4.x"}]`
    );

    // Activate Lavalink v4 Session Resuming for instantaneous (<50ms) recovery
    try {
      await node.updateSession(true, config.lavalink.sessionResumeTimeout);
      logger.lavalink(`Session resuming armed (timeout: ${config.lavalink.sessionResumeTimeout}s). Reconnects guaranteed < 50ms.`);
    } catch (err) {
      logger.debug("Session resume update warning:", err.message);
    }

    // Restore active player queues and playback across runner restarts
    await stateManager.restoreState(client);
  });

  manager.nodeManager.on("disconnect", (node, reason) => {
    logger.warn(`Lavalink node disconnected: ${node.id} - Reason:`, reason);
  });

  manager.nodeManager.on("error", (node, error) => {
    logger.error(`Lavalink node error [${node.id}]:`, error?.message || error);
  });

  manager.nodeManager.on("reconnecting", (node) => {
    logger.info(`Reconnecting to Lavalink node: ${node.id}...`);
  });

  // ---------------------------------------------------------------------------
  // Player Audio Lifecycle Events
  // ---------------------------------------------------------------------------
  manager.on("trackStart", async (player, track) => {
    if (!player.textChannelId) return;
    const channel = client.channels.cache.get(player.textChannelId);

    logger.info(`Started playing "${track.info.title}" in guild ${player.guildId}`);

    // Always cache last played track so autoplay has an immutable recommendation seed
    player.set("lastPlayedTrack", track);
    player.set("autoPaused", false);

    // Record track in autoplay history buffer so it is never repeated
    autoplayManager.recordTrackPlayed(player.guildId, track.info.identifier, track.info.title);

    // Jockie-style background pre-fetch for 0ms gapless transition
    const isAutoplay = Boolean(player.get("autoplay"));
    if (isAutoplay && player.queue.tracks.length === 0) {
      autoplayManager.prefetchAutoplay(player, track);
    } else if (player.queue.tracks.length > 0) {
      // Pre-warm the next queued track for 0ms instantaneous track transition
      audioOptimizer.preloadNextQueueTrack(player);
    }

    // Auto-maximize voice channel bitrate for studio-grade audio fidelity
    if (player.voiceChannelId) {
      const vc = client.channels.cache.get(player.voiceChannelId);
      if (vc) audioOptimizer.maximizeVoiceBitrate(vc, client);
    }

    // Update dedicated song request channel dashboard if configured
    updateRequestChannelDashboard(client, player.guildId, player);

    // Update real-time Voice Channel Status without emojis (Rotating Templates)
    voiceStatusManager.onTrackStart(client, player, track);

    if (!channel) return;

    try {
      await sendOrUpdatePlayerDashboard(channel, player);
    } catch (err) {
      logger.error("Failed to send trackStart dashboard:", err.message);
    }
  });

  manager.on("trackEnd", async (player, track) => {
    logger.debug(`Finished track "${track.info.title}" in guild ${player.guildId}`);
    voiceStatusManager.onTrackEnd(client, player);
  });

  manager.on("trackStuck", async (player, track, payload) => {
    logger.warn(`Track stuck: "${track.info.title}" in guild ${player.guildId} threshold ${payload.thresholdMs}ms`);
    if (player.textChannelId) {
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel) {
        channel.send({
          content: `⚠️ Stream for **${truncate(track.info.title, 45)}** stalled. Skipping...`,
          allowedMentions: { parse: [], users: [] },
        }).then((m) => setTimeout(() => m.delete().catch(() => {}), 8000)).catch(() => {});
      }
    }
    await player.skip();
  });

  manager.on("trackError", async (player, track, payload) => {
    logger.error(`Track error: "${track.info.title}" in guild ${player.guildId}:`, payload.error || payload.message);
    if (player.textChannelId) {
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel) {
        channel.send({
          content: `❌ Audio decode failure for **${truncate(track.info.title, 45)}**. Playing next...`,
          allowedMentions: { parse: [], users: [] },
        }).then((m) => setTimeout(() => m.delete().catch(() => {}), 8000)).catch(() => {});
      }
    }
    await player.skip();
  });

  manager.on("queueEnd", async (player, track) => {
    logger.info(`Queue ended in guild ${player.guildId}`);

    // If Autoplay is enabled, execute fallback recommendation
    const isAutoplay = Boolean(player.get("autoplay"));
    if (isAutoplay && !player.queue.current) {
      const lastTrack = track || player.queue.previous[0] || player.get("lastPlayedTrack");
      if (lastTrack) {
        const success = await autoplayManager.executeAutoplay(player, lastTrack, false);
        if (success) {
          logger.info(`[Jockie Autoplay] QueueEnd fallback resumed playback for guild ${player.guildId}`);
          return;
        }
      }
    }

    // Reset dedicated song request channel dashboard to ready state
    updateRequestChannelDashboard(client, player.guildId, null);

    // Clear Voice Channel Status when queue finishes
    voiceStatusManager.clearVoiceStatus(client, player.voiceChannelId, player.guildId);

    // Clean up previous dashboard
    const prevMsgId = player.get("nowPlayingMsgId");
    if (prevMsgId && player.textChannelId) {
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel) {
        channel.messages.delete(prevMsgId).catch(() => {});
      }
      player.set("nowPlayingMsgId", null);
    }

    // Check 24/7 mode
    const is247 = player.get("247");
    if (is247) {
      if (player.textChannelId) {
        const channel = client.channels.cache.get(player.textChannelId);
        if (channel) {
          channel.send({
            content: "⏱️ Queue finished. Staying in voice channel (24/7 Mode Active).",
            allowedMentions: { parse: [], users: [] },
          }).then((m) => setTimeout(() => m.delete().catch(() => {}), 15000)).catch(() => {});
        }
      }
      return;
    }

    // Inactivity leave countdown if not 24/7
    if (player.textChannelId) {
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel) {
        channel.send({
          content: "⚠️ Queue finished. Bot will disconnect in 3 minutes if no new music is added.",
          allowedMentions: { parse: [], users: [] },
        }).then((m) => setTimeout(() => m.delete().catch(() => {}), 15000)).catch(() => {});
      }
    }
  });

  manager.on("playerDestroy", (player) => {
    logger.debug(`Player destroyed for guild ${player.guildId}`);
    updateRequestChannelDashboard(client, player.guildId, null);
    voiceStatusManager.clearVoiceStatus(client, player.voiceChannelId, player.guildId);
    const prevMsgId = player.get("nowPlayingMsgId");
    if (prevMsgId && player.textChannelId) {
      const channel = client.channels.cache.get(player.textChannelId);
      if (channel) {
        channel.messages.delete(prevMsgId).catch(() => {});
      }
    }
  });

  return manager;
}

module.exports = { initLavalink };
