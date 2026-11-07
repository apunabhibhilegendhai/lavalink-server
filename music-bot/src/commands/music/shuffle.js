const { SlashCommandBuilder, ButtonStyle } = require("discord.js");
const { actionWithButton, errorText } = require("../../utils/responses");
const { truncate } = require("../../utils/formatters");
const { cleanTrackTitle } = require("../../utils/sourceManager");
const emojis = require("../../utils/emojis");
const djManager = require("../../utils/djManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Randomize the order of upcoming tracks in the queue"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || player.queue.tracks.length < 2) {
      return interaction.reply(errorText("Queue needs at least 2 tracks to shuffle."));
    }

    const djCheck = djManager.canManagePlayer(interaction.member, player, false);
    if (!djCheck.allowed) {
      return interaction.reply(errorText(djCheck.reason));
    }

    player.queue.shuffle();
    const firstUpcoming = player.queue.tracks[0];
    const sub = firstUpcoming
      ? `Next track: **${truncate(cleanTrackTitle(firstUpcoming.info.title), 36)}**`
      : null;

    return interaction.reply(
      actionWithButton(
        emojis.shuffle,
        `Shuffled **${player.queue.tracks.length}** tracks in the queue.`,
        sub,
        { customId: "cmd_queue", label: "View Queue", emoji: emojis.queue, style: ButtonStyle.Secondary }
      )
    );
  },
};
