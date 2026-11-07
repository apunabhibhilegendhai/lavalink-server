const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");
const { truncate } = require("../../utils/formatters");
const { cleanTrackTitle } = require("../../utils/sourceManager");
const emojis = require("../../utils/emojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("previous")
    .setDescription("Play the previous track from the session history"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player) {
      return interaction.reply(errorText("No active music player in this server."));
    }

    const previousTrack = player.queue.previous[0];
    if (!previousTrack) {
      return interaction.reply(errorText("No previous track found in the session history buffer."));
    }

    await player.play({ track: previousTrack });
    const title = truncate(cleanTrackTitle(previousTrack.info.title), 40);
    const author = truncate(previousTrack.info.author, 24);

    return interaction.reply(
      actionText(emojis.previous, `Playing previous track: **${title}** by **${author}**.`)
    );
  },
};
