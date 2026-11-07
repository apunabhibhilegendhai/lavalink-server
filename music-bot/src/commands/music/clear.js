const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");
const djManager = require("../../utils/djManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear all upcoming songs from the queue without stopping current playback"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || player.queue.tracks.length === 0) {
      return interaction.reply(errorText("Queue is already empty!"));
    }

    const djCheck = djManager.canManagePlayer(interaction.member, player, false);
    if (!djCheck.allowed) {
      return interaction.reply(errorText(djCheck.reason));
    }

    const removedCount = player.queue.tracks.length;
    player.queue.tracks.splice(0, player.queue.tracks.length);

    return interaction.reply(
      actionText(
        emojis.clear,
        `Cleared **${removedCount}** track(s) from the queue.`,
        "Current song continues playing without interruption"
      )
    );
  },
};
