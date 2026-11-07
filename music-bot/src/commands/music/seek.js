const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");
const { parseDuration, formatDuration } = require("../../utils/formatters");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("Seek to a specific timestamp in the current track")
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Timestamp to jump to (e.g., '1:30', '90s', '2m15s')")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.reply(errorText("No song is currently streaming."));
    }

    const currentTrack = player.queue.current;
    if (!currentTrack.info.isSeekable || currentTrack.info.isStream) {
      return interaction.reply(errorText("This track or live stream does not support seeking."));
    }

    const timeStr = interaction.options.getString("time");
    const targetMs = parseDuration(timeStr);

    if (targetMs === null) {
      return interaction.reply(
        errorText(
          "Invalid timestamp format!",
          "Use `MM:SS` (e.g. `2:15`) or unit suffixes like `90s`, `3m`."
        )
      );
    }

    if (targetMs > currentTrack.info.duration) {
      return interaction.reply(
        errorText(
          `Target timestamp (\`${formatDuration(targetMs)}\`) exceeds song duration (\`${formatDuration(currentTrack.info.duration)}\`).`
        )
      );
    }

    await player.seek(targetMs);

    return interaction.reply(
      actionText(
        "⏱️",
        `Seeked playback to **${formatDuration(targetMs)}**.`,
        `Total duration: \`${formatDuration(currentTrack.info.duration)}\``
      )
    );
  },
};
