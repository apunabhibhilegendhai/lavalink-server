const { SlashCommandBuilder, ButtonStyle } = require("discord.js");
const { actionWithButton, errorText } = require("../../utils/responses");
const { truncate, formatDuration } = require("../../utils/formatters");
const { cleanTrackTitle } = require("../../utils/sourceManager");
const emojis = require("../../utils/emojis");
const djManager = require("../../utils/djManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current song or jump to a specific track in the queue")
    .addIntegerOption((option) =>
      option.setName("to").setDescription("Jump directly to track number in queue").setMinValue(1)
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.reply(errorText("No song is currently streaming in this server."));
    }

    const djCheck = djManager.canManagePlayer(interaction.member, player, true);
    if (!djCheck.allowed) {
      return interaction.reply(errorText(djCheck.reason));
    }

    const currentTitle = truncate(cleanTrackTitle(player.queue.current.info.title), 40);
    const jumpTo = interaction.options.getInteger("to");

    if (jumpTo) {
      if (jumpTo > player.queue.tracks.length) {
        return interaction.reply(errorText(`Queue only contains ${player.queue.tracks.length} track(s). Cannot jump to #${jumpTo}.`));
      }

      player.queue.tracks.splice(0, jumpTo - 1);
      await player.skip();

      const nextTrack = player.queue.tracks[0];
      const sub = nextTrack ? `Now playing: **${truncate(cleanTrackTitle(nextTrack.info.title), 35)}**` : "Queue reached the end";

      return interaction.reply(
        actionWithButton(
          emojis.skip,
          `Jumped to track **#${jumpTo}** in queue.`,
          sub,
          { customId: "cmd_queue", label: "View Queue", emoji: emojis.queue, style: ButtonStyle.Secondary }
        )
      );
    }

    const nextTrack = player.queue.tracks[0];
    await player.skip();

    const sub = nextTrack
      ? `Up next: **${truncate(cleanTrackTitle(nextTrack.info.title), 35)}** • \`${formatDuration(nextTrack.info.duration)}\``
      : player.get("autoplay") ? "Autoplay generating next recommendation..." : "Queue ended";

    return interaction.reply(
      actionWithButton(
        emojis.skip,
        `Skipped **${currentTitle}**.`,
        sub,
        { customId: "cmd_queue", label: "View Queue", emoji: emojis.queue, style: ButtonStyle.Secondary }
      )
    );
  },
};
