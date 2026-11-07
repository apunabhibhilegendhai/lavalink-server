/**
 * Unified Command Context Adapter
 * Bridges Discord Slash Commands (ChatInputCommandInteraction) and Prefix Message Commands
 * into a single unified API, allowing 100% code reusability without duplicating command files.
 */
class CommandContext {
  constructor({ interaction, message, client, commandName, args = [], prefix = "." }) {
    this.isInteraction = Boolean(interaction);
    this.isMessage = Boolean(message);
    this.interaction = interaction || null;
    this.message = message || null;
    this.client = client;
    this.commandName = commandName;
    this.args = args;
    this.prefix = prefix;

    this.guild = interaction?.guild || message?.guild || null;
    this.guildId = this.guild?.id || null;
    this.channel = interaction?.channel || message?.channel || null;
    this.channelId = this.channel?.id || null;
    this.member = interaction?.member || message?.member || null;
    this.user = interaction?.user || message?.author || null;
    this.author = this.user;

    this.replied = false;
    this.deferred = false;
    this._sentMessage = null;

    // Emulate Discord.js Interaction Options interface
    if (this.isInteraction) {
      this.options = interaction.options;
    } else {
      // Determine if the command uses subcommands (e.g. .playlist create or .dj set)
      const hasSubcommand = ["playlist", "dj"].includes(commandName?.toLowerCase());
      const effectiveArgs = hasSubcommand ? this.args.slice(1) : this.args;

      this.options = {
        getSubcommand: () => {
          if (!this.args || this.args.length === 0) return null;
          return this.args[0].toLowerCase();
        },
        getSubcommandGroup: () => null,

        getString: (name) => {
          if (!effectiveArgs || effectiveArgs.length === 0) return null;
          // For song search queries and playlist names, preserve the entire remainder with spaces!
          if (name === "query" || name === "name") return effectiveArgs.join(" ");
          if (name === "source") {
            const match = effectiveArgs.find((a) =>
              /^(spsearch|ytsearch|ytmsearch|scsearch|jssearch)$/i.test(a)
            );
            return match ? match.toLowerCase() : null;
          }
          if (name === "time" || name === "new" || name === "action") return effectiveArgs[0] || null;
          return effectiveArgs.join(" ") || null;
        },

        getInteger: (name) => {
          if (!effectiveArgs || effectiveArgs.length === 0) return null;
          if (name === "from" || name === "first") {
            const val = parseInt(effectiveArgs[0], 10);
            return isNaN(val) ? null : val;
          }
          if (name === "to" || name === "second") {
            const targetStr = effectiveArgs.length > 1 ? effectiveArgs[1] : effectiveArgs[0];
            const val = parseInt(targetStr, 10);
            return isNaN(val) ? null : val;
          }
          if (name === "level" || name === "position") {
            const val = parseInt(effectiveArgs[0], 10);
            return isNaN(val) ? null : val;
          }
          const val = parseInt(effectiveArgs[0], 10);
          return isNaN(val) ? null : val;
        },

        getNumber: (name) => {
          if (!effectiveArgs || effectiveArgs.length === 0) return null;
          const val = parseFloat(effectiveArgs[0]);
          return isNaN(val) ? null : val;
        },

        getBoolean: (name) => {
          if (!effectiveArgs || effectiveArgs.length === 0) return null;
          const first = effectiveArgs[0].toLowerCase();
          if (["true", "yes", "on", "enable", "1"].includes(first)) return true;
          if (["false", "no", "off", "disable", "0"].includes(first)) return false;
          return null;
        },

        getUser: () => this.message.mentions?.users?.first() || null,
        getMember: () => this.message.mentions?.members?.first() || null,
        getRole: (name) => {
          if (this.message.mentions?.roles?.size > 0) {
            return this.message.mentions.roles.first();
          }
          if (effectiveArgs[0]) {
            return this.guild?.roles?.cache?.get(effectiveArgs[0]) || null;
          }
          return null;
        },
        getChannel: (name) => {
          if (this.message.mentions?.channels?.size > 0) {
            return this.message.mentions.channels.first();
          }
          if (effectiveArgs[0]) {
            return this.guild?.channels?.cache?.get(effectiveArgs[0]) || null;
          }
          return null;
        },
      };
    }
  }

  /**
   * Defer reply (typing state or Discord deferred state)
   */
  async deferReply(opts = {}) {
    this.deferred = true;
    if (this.isInteraction) {
      return this.interaction.deferReply(opts);
    }
    // For text prefix commands, trigger the typing status in channel
    try {
      await this.channel.sendTyping();
    } catch (_) {}
    return null;
  }

  /**
   * Sanitize payload for standard Discord messages (strips ephemeral flags)
   */
  _sanitizeMessagePayload(payload) {
    const msgPayload = typeof payload === "string" ? { content: payload } : { ...payload };
    // Normal text messages cannot be ephemeral: strip ephemeral properties
    if ("ephemeral" in msgPayload) delete msgPayload.ephemeral;
    if ("flags" in msgPayload) delete msgPayload.flags;
    msgPayload.allowedMentions = { repliedUser: false, parse: [] };
    return msgPayload;
  }

  /**
   * Send command reply
   */
  async reply(payload) {
    this.replied = true;
    if (this.isInteraction) {
      return this.interaction.reply(payload);
    }

    const msgPayload = this._sanitizeMessagePayload(payload);
    this._sentMessage = await this.message.reply(msgPayload);
    return this._sentMessage;
  }

  /**
   * Edit previously deferred or sent reply
   */
  async editReply(payload) {
    this.replied = true;
    if (this.isInteraction) {
      return this.interaction.editReply(payload);
    }

    const msgPayload = this._sanitizeMessagePayload(payload);

    if (this._sentMessage) {
      return this._sentMessage.edit(msgPayload);
    }

    this._sentMessage = await this.message.reply(msgPayload);
    return this._sentMessage;
  }

  /**
   * Send follow up message
   */
  async followUp(payload) {
    if (this.isInteraction) {
      return this.interaction.followUp(payload);
    }

    const msgPayload = this._sanitizeMessagePayload(payload);
    return this.channel.send(msgPayload);
  }
}

module.exports = CommandContext;
