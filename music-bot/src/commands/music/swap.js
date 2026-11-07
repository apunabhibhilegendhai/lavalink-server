const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("swap")
    .setDescription("Swap the positions of two tracks in the queue")
    .addIntegerOption((option) =>
      option.setName("first").setDescription("First track position").setRequired(true).setMinValue(1)
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || player.queue.tracks.length < 2) {
      return interaction.reply(errorText("Queue needs at least 2 tracks to swap."));
    }

    const first = interaction.options.getInteger("first");
    const second = interaction.options.getInteger("second");
    const total = player.queue.tracks.length;

    if (first > total || second > total) {
      return interaction.reply(errorText(`Track positions must be between 1 and ${total}.`));
    }

    if (first === second) {
      return interaction.reply(errorText("Cannot swap a track with itself!"));
    }

    const temp = player.queue.tracks[first - 1];
    player.queue.tracks[first - 1] = player.queue.tracks[second - 1];
    player.queue.tracks[second - 1] = temp;

    return interaction.reply(
      actionText("🔀", `Swapped track **#${first}** with track **#${second}** in queue.`)
    );
  },
};
