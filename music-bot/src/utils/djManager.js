/**
 * DJ Role & Fair-Queue Permission Manager
 * Enforces server DJ role permissions while maintaining user fairness
 */

const { PermissionsBitField } = require("discord.js");
const db = require("../database/db");

class DJManager {
  /**
   * Check if a member has permission to modify audio state
   * @param {import("discord.js").GuildMember} member 
   * @param {import("lavalink-client").Player} player 
   * @param {boolean} isSkipAction 
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canManagePlayer(member, player, isSkipAction = false) {
    if (!member || !member.guild) {
      return { allowed: false, reason: "Invalid member context." };
    }

    // 1. Server Administrators & Managers always have bypass
    if (
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
      member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    ) {
      return { allowed: true };
    }

    const settings = db.getGuildSettings(member.guild.id);
    const djEnabled = Boolean(settings?.dj_enabled && settings?.dj_role_id);

    // If DJ mode is not active, everyone in voice channel can control playback
    if (!djEnabled) {
      return { allowed: true };
    }

    // 2. Member has the designated DJ Role
    if (settings.dj_role_id && member.roles.cache.has(settings.dj_role_id)) {
      return { allowed: true };
    }

    // 3. Alone in voice channel with the bot
    const voiceChannel = member.voice?.channel;
    if (voiceChannel) {
      const nonBots = voiceChannel.members.filter((m) => !m.user.bot);
      if (nonBots.size === 1 && nonBots.first()?.id === member.id) {
        return { allowed: true };
      }
    }

    // 4. Requester can always skip their own track
    if (isSkipAction && player?.queue?.current?.requester?.id === member.id) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `⚠️ This server requires the <@&${settings.dj_role_id}> role or DJ permissions to use this control. You can also use \`/voteskip\` to vote!`,
    };
  }

  /**
   * Calculate required skip votes in a voice channel
   */
  getRequiredVotes(voiceChannel) {
    if (!voiceChannel) return 1;
    const humanCount = voiceChannel.members.filter((m) => !m.user.bot).size;
    return Math.max(1, Math.ceil(humanCount / 2));
  }
}

module.exports = new DJManager();
