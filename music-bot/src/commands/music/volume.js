const { SlashCommandBuilder, ButtonStyle } = require("discord.js");
const { actionWithButtons, errorText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");
const djManager = require("../../utils/djManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Adjust the playback volume (0% to 200%)")
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("Volume percentage between 0 and 200")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200)
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player) {
      return interaction.reply(errorText("No active audio player found in this server."));
    }

    const djCheck = djManager.canManagePlayer(interaction.member, player, false);
    if (!djCheck.allowed) {
      return interaction.reply(errorText(djCheck.reason));
    }

    const level = interaction.options.getInteger("level");
    await player.setVolume(level);

    const emoji = emojis.getVolumeEmoji(level);
    const sub = level === 100
      ? "Lossless Opus direct passthrough active (0% distortion)"
      : level > 100
      ? "Digital preamp boost active"
      : "Attenuated level";

    return interaction.reply(
      actionWithButtons(
        emoji,
        `Volume set to **${level}%**.`,
        sub,
        [
          { customId: "pctrl_vol_50", label: "50%", emoji: emojis.volume.low, style: level === 50 ? ButtonStyle.Primary : ButtonStyle.Secondary },
          { customId: "pctrl_vol_100", label: "100%", emoji: emojis.volume.normal, style: level === 100 ? ButtonStyle.Primary : ButtonStyle.Secondary },
          { customId: "pctrl_vol_150", label: "150%", emoji: emojis.volume.boost, style: level === 150 ? ButtonStyle.Primary : ButtonStyle.Secondary },
        ]
      )
    );
  },
};
