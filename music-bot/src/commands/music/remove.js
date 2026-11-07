const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");
const { truncate } = require("../../utils/formatters");
const { cleanTrackTitle } = require("../../utils/sourceManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a specific track from the queue by its position number")
    .addIntegerOption((option) =>
      option
        .setName("position")
        .setDescription("Position number of the song in the queue (from /queue)")
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || player.queue.tracks.length === 0) {
      return interaction.reply(errorText("Queue is currently empty!"));
    }

    const pos = interaction.options.getInteger("position");
    if (pos > player.queue.tracks.length) {
      return interaction.reply(errorText(`Invalid position! Queue has ${player.queue.tracks.length} tracks.`));
    }

    const removed = player.queue.tracks.splice(pos - 1, 1)[0];
    const title = truncate(cleanTrackTitle(removed.info.title), 40);

    return interaction.reply(
      actionText(
        "🗑️",
        `Removed **${title}** (\`#${pos}\`) from the queue.`,
        `${player.queue.tracks.length} track(s) remaining in queue`
      )
    );
  },
};
