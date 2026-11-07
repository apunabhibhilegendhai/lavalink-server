const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");
const djManager = require("../../utils/djManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback, clear the queue, and disconnect from the voice channel"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player) {
      return interaction.reply(errorText("No active player is currently connected in this server."));
    }

    const djCheck = djManager.canManagePlayer(interaction.member, player, false);
    if (!djCheck.allowed) {
      return interaction.reply(errorText(djCheck.reason));
    }

    const vcId = player.voiceChannelId;
    player.queue.tracks.splice(0, player.queue.tracks.length);
    await player.destroy("User ran /stop command");

    return interaction.reply(
      actionText(
        emojis.stop,
        "Audio stream stopped and queue cleared.",
        vcId ? `Disconnected from <#${vcId}>` : "Voice connection closed"
      )
    );
  },
};
