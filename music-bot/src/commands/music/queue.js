const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
  MessageFlags,
} = require("discord.js");
const { errorEmbed } = require("../../utils/embed");
const { formatDuration, truncate, createProgressBar, formatRequester } = require("../../utils/formatters");
const { getPlatformTheme, cleanTrackTitle } = require("../../utils/sourceManager");
const emojis = require("../../utils/emojis");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("View the current music queue and upcoming tracks in compact landscape view")
    .addIntegerOption((option) =>
      option.setName("page").setDescription("Specific page number to view").setMinValue(1)
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guildId);
    if (!player || (!player.queue.current && player.queue.tracks.length === 0)) {
      return interaction.reply({
        content: `${emojis.queue} The queue is currently empty. Use \`/play\` to add tracks!`,
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [], users: [] },
      });
    }

    const currentTrack = player.queue.current;
    const tracks = player.queue.tracks;
    const tracksPerPage = 10;
    const totalPages = Math.ceil(tracks.length / tracksPerPage) || 1;

    let currentPage = interaction.options.getInteger("page") || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const theme = getPlatformTheme(currentTrack?.info?.sourceName);

    function generateQueueEmbed(page) {
      const startIdx = (page - 1) * tracksPerPage;
      const pageTracks = tracks.slice(startIdx, startIdx + tracksPerPage);
      const totalQueueDuration = tracks.reduce((acc, t) => acc + (t.info.duration || 0), 0);

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({
          name: `Server Queue • ${interaction.guild.name}`,
          iconURL: theme.icon,
        })
        .setFooter({
          text: `Page ${page}/${totalPages} • Total: ${tracks.length} track(s) [${formatDuration(totalQueueDuration)}]`,
        })
        .setTimestamp();

      if (currentTrack) {
        const cleanTitle = truncate(cleanTrackTitle(currentTrack.info.title), 50);
        const cleanAuthor = truncate(currentTrack.info.author, 30);
        const progress = currentTrack.info.isStream
          ? `${emojis.live} \`[LIVE STREAM]\``
          : `\`${formatDuration(player.position)}\` ${createProgressBar(player.position, currentTrack.info.duration, 11)} \`${formatDuration(currentTrack.info.duration)}\``;

        embed.setTitle(`${emojis.play} Now Streaming: ${cleanTitle}`);
        embed.setURL(currentTrack.info.uri || "https://discord.com");

        if (currentTrack.info.artworkUrl) {
          embed.setThumbnail(currentTrack.info.artworkUrl);
        }

        embed.setDescription(
          `by **${cleanAuthor}** • ${theme.badge}\n` +
          `${progress}\n` +
          `-# ${emojis.user} Requested by ${formatRequester(currentTrack.requester)}\n\n` +
          `**${emojis.queue} Upcoming Tracks:**`
        );
      }

      if (pageTracks.length > 0) {
        const trackList = pageTracks
          .map((t, i) => {
            const index = startIdx + i + 1;
            const duration = formatDuration(t.info.duration);
            const cleanTitle = truncate(cleanTrackTitle(t.info.title), 40);
            const cleanAuthor = truncate(t.info.author, 20);
            return `\`${index}.\` [${cleanTitle}](${t.info.uri || "https://discord.com"}) - \`${cleanAuthor}\` (\`${duration}\`)`;
          })
          .join("\n");

        embed.addFields({
          name: "\u200B",
          value: trackList,
        });
      } else {
        embed.addFields({
          name: "\u200B",
          value: "*No more upcoming songs in queue. Add more with `/play`!*",
        });
      }

      return embed;
    }

    function generateButtons(page) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("queue_first")
          .setEmoji("⏮️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId("queue_prev")
          .setEmoji("◀️")
          .setLabel("Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId("queue_next")
          .setEmoji("▶️")
          .setLabel("Next")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages),
        new ButtonBuilder()
          .setCustomId("queue_last")
          .setEmoji("⏭️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages)
      );
    }

    const response = await interaction.reply({
      embeds: [generateQueueEmbed(currentPage)],
      components: totalPages > 1 ? [generateButtons(currentPage)] : [],
      allowedMentions: { parse: [], users: [] },
      fetchReply: true,
    });

    if (totalPages <= 1) return;

    // Interactive button collector for pagination
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: `${emojis.warn} Only the user who ran \`/queue\` can navigate this menu.`,
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [], users: [] },
        });
      }

      if (i.customId === "queue_first") currentPage = 1;
      else if (i.customId === "queue_prev") currentPage = Math.max(1, currentPage - 1);
      else if (i.customId === "queue_next") currentPage = Math.min(totalPages, currentPage + 1);
      else if (i.customId === "queue_last") currentPage = totalPages;

      await i.update({
        embeds: [generateQueueEmbed(currentPage)],
        components: [generateButtons(currentPage)],
        allowedMentions: { parse: [], users: [] },
      });
    });

    collector.on("end", async () => {
      await response.edit({ components: [] }).catch(() => {});
    });
  },
};
