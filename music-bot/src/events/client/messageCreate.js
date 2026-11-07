const { handleSongRequestMessage } = require("../../utils/requestChannelManager");
const { parseMessage } = require("../../utils/prefixParser");
const multiBotCoordinator = require("../../utils/multiBotCoordinator");
const CommandContext = require("../../structures/CommandContext");
const { warnText, errorText } = require("../../utils/responses");
const db = require("../../database/db");
const logger = require("../../utils/logger");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // 1. Dedicated Song-Request Channel routing (e.g. #song-requests)
    const isRequest = await handleSongRequestMessage(message, client);
    if (isRequest) return;

    // 2. Fetch server prefix (backed by in-memory cache)
    const guildPrefix = db.getGuildPrefix(message.guild.id) || ".";

    // 3. Space-tolerant prefix parsing (.play, . play, .   play, @Bot play, aliases)
    const parsed = parseMessage(message, guildPrefix, client.user);
    if (!parsed) return;

    // 4. Jockie Multi-Bot Coordinator arbitration
    const shouldHandle = multiBotCoordinator.shouldHandle(
      client,
      message,
      client.botIndex || 0,
      parsed
    );
    if (!shouldHandle) return;

    // 5. Look up matching application command
    const command = client.commands.get(parsed.commandName);
    if (!command) return;

    // 6. Enforce voice channel safety for music commands
    if (command.category === "music" && !["nowplaying", "queue", "lyrics", "grab"].includes(command.data.name)) {
      if (!message.member?.voice?.channelId) {
        return message.reply(
          warnText("You must be connected to a voice channel to use music commands.")
        ).catch(() => {});
      }

      const player = client.lavalink.getPlayer(message.guild.id);
      if (player && player.voiceChannelId && message.member.voice.channelId !== player.voiceChannelId) {
        return message.reply(
          warnText(`You must be in the same voice channel (<#${player.voiceChannelId}>) as the bot to use music controls.`)
        ).catch(() => {});
      }
    }

    // 7. Instantiate unified CommandContext adapter
    const ctx = new CommandContext({
      message,
      client,
      commandName: parsed.commandName,
      args: parsed.args,
      prefix: guildPrefix,
    });

    // 8. Execute command safely
    try {
      await command.execute(ctx, client);
    } catch (err) {
      logger.error(`Error executing prefix command "${parsed.commandName}":`, err);
      try {
        await ctx.reply(errorText(`Error executing command: \`${err.message}\``));
      } catch (_) {}
    }
  },
};
