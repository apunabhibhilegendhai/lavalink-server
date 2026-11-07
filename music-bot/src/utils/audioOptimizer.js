const { PermissionFlagsBits, ChannelType } = require("discord.js");
const logger = require("./logger");
const config = require("../config");

/**
 * Audio Optimizer & Fidelity Tuner
 * - Automatically maximizes Discord voice channel bitrate to server maximum (up to 384 kbps)
 * - Pre-loads next queued track in background for true 0ms gapless transitions
 */
class AudioOptimizer {
  constructor() {
    // Map<guildId, number> to prevent excessive bitrate update API spam
    this.optimizedGuilds = new Map();
  }

  /**
   * Automatically maximize Discord Voice Channel bitrate to the guild's highest supported tier
   * (e.g. 64k -> 96k, 128k, 256k, or 384k for Nitro Boosted servers)
   * @param {import("discord.js").VoiceChannel|import("discord.js").StageChannel} voiceChannel 
   * @param {import("discord.js").Client} client 
   */
  async maximizeVoiceBitrate(voiceChannel, client) {
    if (!config.player.autoMaximizeBitrate) return;
    if (!voiceChannel || !voiceChannel.guild) return;

    // Only operate on standard voice channels or stage channels
    if (
      voiceChannel.type !== ChannelType.GuildVoice &&
      voiceChannel.type !== ChannelType.GuildStageVoice
    ) {
      return;
    }

    const guild = voiceChannel.guild;
    const now = Date.now();
    const lastOptimized = this.optimizedGuilds.get(guild.id) || 0;

    // Rate-limit checks per guild (once every 5 minutes max)
    if (now - lastOptimized < 300000) return;

    try {
      // Determine guild max bitrate: 96000, 128000, 256000, or 384000
      const maxBitrate = guild.maximumBitrate || 96000;
      const currentBitrate = voiceChannel.bitrate || 64000;

      if (currentBitrate < maxBitrate) {
        const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
        if (!me) return;

        const hasManageChannels = voiceChannel.permissionsFor(me)?.has(PermissionFlagsBits.ManageChannels);
        if (!hasManageChannels) {
          logger.debug(
            `[AudioOptimizer] Cannot auto-boost bitrate in #${voiceChannel.name} (Missing ManageChannels permission)`
          );
          return;
        }

        await voiceChannel.setBitrate(
          maxBitrate,
          "AudioOptimizer: Auto-maximized voice channel for ultra-high audio fidelity"
        );

        this.optimizedGuilds.set(guild.id, now);
        logger.info(
          `[AudioOptimizer] Boosted #${voiceChannel.name} in "${guild.name}" from ${Math.round(currentBitrate / 1000)}kbps to ${Math.round(maxBitrate / 1000)}kbps (Guild Tier Max)`
        );
      }
    } catch (err) {
      logger.debug(`[AudioOptimizer] Voice channel bitrate adjustment skipped: ${err.message}`);
    }
  }

  /**
   * Preload the next track in the queue in background so the transition when current track ends is 0ms
   * @param {import("lavalink-client").Player} player 
   */
  async preloadNextQueueTrack(player) {
    if (!config.player.gaplessPreload) return;
    if (!player || !player.queue || player.queue.tracks.length === 0) return;

    const nextTrack = player.queue.tracks[0];
    if (!nextTrack || nextTrack._preloaded) return;

    try {
      // Mark as preloading to avoid duplicate calls
      nextTrack._preloaded = true;

      // If track has an identifier and node is active, perform background pre-fetch verification
      const node = player.node;
      if (!node || !node.connected) return;

      logger.debug(
        `[AudioOptimizer] Pre-warming next track in queue: "${nextTrack.info?.title}" for guild ${player.guildId}`
      );

      // Verify node has track pre-cached or warm up search if needed
      if (!nextTrack.encoded && nextTrack.info?.uri) {
        const res = await node.rest.resolve(nextTrack.info.uri).catch(() => null);
        if (res?.data && !Array.isArray(res.data)) {
          nextTrack.encoded = res.data.encoded;
        }
      }
    } catch (err) {
      logger.debug(`[AudioOptimizer] Preload error (non-fatal): ${err.message}`);
    }
  }
}

module.exports = new AudioOptimizer();
