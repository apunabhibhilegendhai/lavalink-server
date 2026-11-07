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
      this.options = {
        getString: (name) => {
          if (!this.args || this.args.length === 0) return null;
          // For song search queries, preserve the entire remainder of the string with spaces!
          if (name === "query") return this.args.join(" ");
          if (name === "source") {
            const match = this.args.find((a) =>
              /^(spsearch|ytsearch|ytmsearch|scsearch|jssearch)$/i.test(a)
            );
            return match ? match.toLowerCase() : null;
          }
          if (name === "time") return this.args[0] || null;
          if (name === "name") return this.args.join(" ");
          return this.args[0] || null;
        },
        getInteger: (name) => {
          if (!this.args || this.args.length === 0) return null;
          const val = parseInt(this.args[0], 10);
          return isNaN(val) ? null : val;
        },
        getNumber: (name) => {
          if (!this.args || this.args.length === 0) return null;
          const val = parseFloat(this.args[0]);
          return isNaN(val) ? null : val;
        },
        getBoolean: (name) => {
          if (!this.args || this.args.length === 0) return null;
          const first = this.args[0].toLowerCase();
          if (["true", "yes", "on", "enable", "1"].includes(first)) return true;
          if (["false", "no", "off", "disable", "0"].includes(first)) return false;
          return null;
        },
        getUser: () => this.message.mentions?.users?.first() || null,
        getMember: () => this.message.mentions?.members?.first() || null,
        getChannel: () => this.message.mentions?.channels?.first() || null,
        getRole: () => this.message.mentions?.roles?.first() || null,
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
   * Send command reply
   */
  async reply(payload) {
    this.replied = true;
    if (this.isInteraction) {
      return this.interaction.reply(payload);
    }

    const msgPayload = typeof payload === "string" ? { content: payload } : { ...payload };
    msgPayload.allowedMentions = { repliedUser: false, parse: [] };
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

    const msgPayload = typeof payload === "string" ? { content: payload } : { ...payload };
    msgPayload.allowedMentions = { repliedUser: false, parse: [] };

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

    const msgPayload = typeof payload === "string" ? { content: payload } : { ...payload };
    msgPayload.allowedMentions = { repliedUser: false, parse: [] };
    return this.channel.send(msgPayload);
  }
}

module.exports = CommandContext;
