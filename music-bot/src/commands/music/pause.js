const { SlashCommandBuilder, ButtonStyle } = require("discord.js");
const { actionWithButton, errorText, warnText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");
const djManager = require("../../utils/djManager");
const voiceStatusManager = require("../../utils/voiceStatusManager");

module.exports = {
  data: new SlashCommandBuilder().setName("pause").setDescription("Pause current audio playback"),
  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.reply(errorText("No music is currently streaming in this server."));
    }

    const djCheck = djManager.canManagePlayer(interaction.member, player, false);
    if (!djCheck.allowed) {
      return interaction.reply(errorText(djCheck.reason));
    }

    if (player.paused) {
      return interaction.reply(warnText("Playback is already paused. Click Resume below to continue."));
    }

    await player.pause();
    voiceStatusManager.onPause(client, player);

    return interaction.reply(
      actionWithButton(
        emojis.pause,
        "Audio stream paused.",
        "Click below or use `/resume` to unpause",
        { customId: "cmd_resume", label: "Resume", emoji: emojis.play, style: ButtonStyle.Primary }
      )
    );
  },
};
