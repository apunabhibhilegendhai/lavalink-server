const { errorText, warnText } = require("./responses");
const logger = require("./logger");

/**
 * Jockie Multi-Bot Coordinator
 * Coordinates multiple bot instances (Pulse, Pulse 1, Pulse 2, etc.) running concurrently
 * in the same Discord server without duplicate responses, channel collisions, or race conditions.
 */
class MultiBotCoordinator {
  constructor() {
    // Array of all known bot client IDs in the pool
    const envIds = process.env.ALL_BOT_IDS
      ? process.env.ALL_BOT_IDS.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    if (process.env.CLIENT_ID && !envIds.includes(process.env.CLIENT_ID)) {
      envIds.push(process.env.CLIENT_ID.trim());
    }
    this.allBotIds = envIds;
  }

  /**
   * Register known bot IDs into the coordinator pool
   * @param {Array<string>} botIds 
   */
  registerBotIds(botIds) {
    if (Array.isArray(botIds)) {
      this.allBotIds = [...new Set([...this.allBotIds, ...botIds.filter(Boolean)])];
    }
  }

  /**
   * Determine whether THIS bot instance should process this incoming prefix command
   * @param {import("discord.js").Client} client 
   * @param {import("discord.js").Message} message 
   * @param {number} botIndex (0 = Primary, 1 = Clone 1, 2 = Clone 2, etc.)
   * @param {object} parsed { commandName, rawArgs, isMention }
   * @returns {boolean} Whether this bot instance should execute the command
   */
  shouldHandle(client, message, botIndex = 0, parsed) {
    const guild = message.guild;
    if (!guild) return false;

    // Ensure our own ID is registered
    if (!this.allBotIds.includes(client.user.id)) {
      this.allBotIds.push(client.user.id);
    }

    const member = message.member;
    const userVoiceChannelId = member?.voice?.channelId;

    // -------------------------------------------------------------------------
    // Rule 1: Explicit Bot Mention Targeting (@Pulse 1 play)
    // -------------------------------------------------------------------------
    if (parsed.isMention) {
      if (message.mentions.users.has(client.user.id)) {
        return true;
      }
      // If user mentioned another bot in our multi-bot pool, stay silent!
      if (this.allBotIds.some((id) => id !== client.user.id && message.mentions.users.has(id))) {
        return false;
      }
    }

    // Commands that don't need a voice channel (e.g. help, ping, stats, prefix)
    const nonVoiceCommands = ["help", "ping", "stats", "prefix", "dj"];
    if (nonVoiceCommands.includes(parsed.commandName)) {
      // Primary bot handles non-voice informational commands
      return botIndex === 0;
    }

    // -------------------------------------------------------------------------
    // Rule 2: Active Voice Channel Affinity (Session Owner)
    // -------------------------------------------------------------------------
    if (userVoiceChannelId) {
      // Find if any bot in our pool is currently connected to the user's voice channel
      const botInUserChannel = this.allBotIds.find((id) => {
        const vs = guild.voiceStates.cache.get(id);
        return vs && vs.channelId === userVoiceChannelId;
      });

      if (botInUserChannel) {
        // ONLY the bot inside the user's voice channel claims the command!
        return client.user.id === botInUserChannel;
      }
    } else {
      // User is not in any voice channel
      if (botIndex === 0) {
        message.reply(errorText("You need to be in a voice channel to play music!")).catch(() => {});
      }
      return false;
    }

    // -------------------------------------------------------------------------
    // Rule 3: Idle Bot Allocation (Next Available Instance)
    // -------------------------------------------------------------------------
    // The user is in a voice channel with NO bot currently connected.
    // We inspect each bot in rank order (0, 1, 2, 3...) to find the first idle bot.
    let firstIdleBotIndex = -1;

    for (let i = 0; i < this.allBotIds.length; i++) {
      const id = this.allBotIds[i];
      const vs = guild.voiceStates.cache.get(id);
      const isConnected = vs && vs.channelId;

      if (!isConnected) {
        firstIdleBotIndex = i;
        break;
      }
    }

    // If an idle bot was found:
    if (firstIdleBotIndex !== -1) {
      // Does this idle rank match our bot's index?
      return botIndex === firstIdleBotIndex;
    }

    // -------------------------------------------------------------------------
    // Rule 4: All Bot Slots Busy Alert
    // -------------------------------------------------------------------------
    // All bots in the pool are already active in other voice channels in this server!
    if (botIndex === 0) {
      message.reply(
        warnText(
          `All **${this.allBotIds.length}** music bot slots are currently active in other voice channels! Wait for a channel to finish or use a bot mention.`
        )
      ).catch(() => {});
    }

    return false;
  }
}

module.exports = new MultiBotCoordinator();
