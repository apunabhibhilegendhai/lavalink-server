const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { errorText, actionWithButton } = require("../../utils/responses");
const { formatDuration, getSourceBadge, truncate } = require("../../utils/formatters");
const emojis = require("../../utils/emojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("grab")
    .setDescription("Save the currently playing track to your private Direct Messages"),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.reply(errorText("No song is currently streaming in this server."));
    }

    const track = player.queue.current;
    const cleanTitle = truncate(track.info.title, 60);
    const uri = track.info.uri || "https://discord.com";

    try {
      const dmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Open Song")
          .setURL(uri)
      );

      const dmContent =
        `💾 **Saved Track: [${cleanTitle}](${uri})**\n` +
        `• **Artist:** \`${track.info.author || "Unknown"}\`\n` +
        `• **Duration:** \`${formatDuration(track.info.duration)}\`\n` +
        `• **Platform:** ${getSourceBadge(track.info.sourceName)}\n` +
        `• **Saved from:** \`${interaction.guild.name}\`\n\n` +
        `-# Click below to open and listen on your favorite music platform!`;

      await interaction.user.send({
        content: dmContent,
        components: [dmRow],
        allowedMentions: { parse: [], users: [] },
      });

      return interaction.reply(
        actionWithButton(
          "💾",
          `Sent **[${cleanTitle}](${uri})** straight to your Direct Messages!`,
          "Check your private DMs to listen anytime",
          {
            label: "Open Track",
            url: uri,
          },
          { ephemeral: true }
        )
      );
    } catch (err) {
      return interaction.reply(
        errorText(
          "Could not deliver Direct Message!",
          "Please ensure your Discord privacy settings allow Direct Messages from server members."
        )
      );
    }
  },
};
