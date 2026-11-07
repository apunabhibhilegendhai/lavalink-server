const { SlashCommandBuilder } = require("discord.js");
const { actionText, errorText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Disconnect the bot from the voice channel"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player) {
      return interaction.reply(errorText("I am not currently connected to any voice channel in this server."));
    }

    const vcId = player.voiceChannelId;
    await player.destroy("User ran /leave command");

    return interaction.reply(
      actionText(emojis.leave, "Disconnected from voice channel.", vcId ? `Left <#${vcId}>` : null)
    );
  },
};
