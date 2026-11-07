const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");
const { truncate } = require("../../utils/formatters");
const { cleanTrackTitle } = require("../../utils/sourceManager");
const emojis = require("../../utils/emojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("replay")
    .setDescription("Restart the currently playing song from the beginning"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.reply(errorText("No song is currently streaming in this server."));
    }

    if (!player.queue.current.info.isSeekable) {
      return interaction.reply(errorText("This track does not support seeking or replay."));
    }

    await player.seek(0);
    const title = truncate(cleanTrackTitle(player.queue.current.info.title), 40);

    return interaction.reply(
      actionText(emojis.reset, `Replaying **${title}** from 00:00.`)
    );
  },
};
