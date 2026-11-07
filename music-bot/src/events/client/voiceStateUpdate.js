const { ChannelType } = require("discord.js");
const config = require("../../config");
const logger = require("../../utils/logger");
const { warnEmbed } = require("../../utils/embed");
const audioOptimizer = require("../../utils/audioOptimizer");

// Map to store guild leave timeouts when voice channel is empty
const emptyChannelTimeouts = new Map();

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    const guildId = newState.guild.id;

    // -------------------------------------------------------------------------
    // 1. Stage Channel Auto-Speaker & Voice Fidelity Auto-Maximizer
    // -------------------------------------------------------------------------
    if (newState.id === client.user.id && newState.channel) {
      // Auto-boost voice channel bitrate to guild maximum (up to 384 kbps)
      audioOptimizer.maximizeVoiceBitrate(newState.channel, client);

      if (newState.channel.type === ChannelType.GuildStageVoice && newState.suppressed) {
        try {
          await newState.guild.members.me.voice.setSuppressed(false);
          logger.info(`Auto-unsuppressed bot in Stage Channel: ${newState.channel.name}`);
        } catch (err) {
          logger.debug("Stage channel unsuppress warning:", err.message);
        }
      }
    }

    const player = client.lavalink.getPlayer(guildId);
    if (!player) return;

    // -------------------------------------------------------------------------
    // 2. Disconnect / Kick / Move Cleanup
    // -------------------------------------------------------------------------
    if (oldState.id === client.user.id && !newState.channelId) {
      logger.info(`Bot was disconnected from voice channel in guild: ${guildId}`);
      if (player) {
        player.destroy("Bot disconnected from voice channel");
      }
      if (emptyChannelTimeouts.has(guildId)) {
        clearTimeout(emptyChannelTimeouts.get(guildId));
        emptyChannelTimeouts.delete(guildId);
      }
      return;
    }

    // Handle bot moved between voice channels
    if (oldState.id === client.user.id && newState.channelId && oldState.channelId !== newState.channelId) {
      const voiceStatusManager = require("../../utils/voiceStatusManager");
      voiceStatusManager.clearVoiceStatus(client, oldState.channelId, guildId);
      if (player && player.playing && !player.paused && player.queue.current) {
        voiceStatusManager.onTrackStart(client, player, player.queue.current);
      }
    }

    // -------------------------------------------------------------------------
    // 3. Listener Monitoring & Smart Auto-Pause / Auto-Resume
    // -------------------------------------------------------------------------
    if (!player.voiceChannelId) return;

    // Count non-bot members in voice channel using live gateway voiceStates cache (reliable across 1M+ servers)
    const humanListeners = newState.guild.voiceStates.cache.filter(
      (vs) => vs.channelId === player.voiceChannelId && vs.id !== client.user.id
    ).size;

    // If 24/7 mode is active, do not leave
    if (player.get("247")) {
      if (emptyChannelTimeouts.has(guildId)) {
        clearTimeout(emptyChannelTimeouts.get(guildId));
        emptyChannelTimeouts.delete(guildId);
      }
      return;
    }

    if (humanListeners === 0) {
      // Auto-pause audio stream to conserve CPU and network bandwidth
      if (player.playing && !player.paused) {
        await player.pause();
        player.set("autoPaused", true);
        logger.info(`Auto-paused playback in guild ${guildId} because voice channel is empty.`);
      }

      if (!emptyChannelTimeouts.has(guildId)) {
        logger.info(`Voice channel empty in guild ${guildId}. Starting 2-minute auto-leave timer.`);
        
        if (player.textChannelId) {
          const textChannel = newState.guild.channels.cache.get(player.textChannelId);
          if (textChannel) {
            textChannel.send({
              embeds: [
                warnEmbed(
                  "Voice channel is empty! Playback is auto-paused. The bot will disconnect in 2 minutes if no one rejoins.",
                  "Empty Channel"
                ),
              ],
            }).then((m) => setTimeout(() => m.delete().catch(() => {}), 15000)).catch(() => {});
          }
        }

        const timeout = setTimeout(async () => {
          const stillEmpty = newState.guild.voiceStates.cache.filter(
            (vs) => vs.channelId === player.voiceChannelId && vs.id !== client.user.id
          ).size === 0;

          if (stillEmpty) {
            logger.info(`Auto-leaving voice channel in guild ${guildId} due to inactivity.`);
            player.destroy("Voice channel left empty");
          }
          emptyChannelTimeouts.delete(guildId);
        }, config.player.emptyChannelTimeoutMs);

        emptyChannelTimeouts.set(guildId, timeout);
      }
    } else {
      // Humans returned, cancel timeout and auto-resume if previously paused
      if (emptyChannelTimeouts.has(guildId)) {
        logger.info(`Human listeners present (${humanListeners}) in guild ${guildId}. Cancelling auto-leave timer.`);
        clearTimeout(emptyChannelTimeouts.get(guildId));
        emptyChannelTimeouts.delete(guildId);
      }

      if (player.paused && player.get("autoPaused")) {
        await player.resume();
        player.set("autoPaused", false);
        logger.info(`Auto-resumed playback in guild ${guildId} because listener joined.`);
      }
    }
  },
};
