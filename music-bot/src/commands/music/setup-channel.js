const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const db = require("../../database/db");
const { buildPlaceholderPayload } = require("../../utils/requestChannelManager");
const { errorText, successText, actionWithButton } = require("../../utils/responses");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-channel")
    .setDescription("Configure a dedicated song-request channel with a permanent Eara-style player dashboard")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Select an existing channel (leave blank to auto-create #pulse-requests)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Setup or remove request channel")
        .addChoices(
          { name: "Setup / Link Channel", value: "setup" },
          { name: "Remove / Reset Channel", value: "remove" }
        )
        .setRequired(false)
    ),

  async execute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply(
        errorText("You need **Manage Server** permissions to configure the song request channel.")
      );
    }

    const action = interaction.options.getString("action") || "setup";

    if (action === "remove") {
      db.clearRequestChannel(interaction.guildId);
      return interaction.reply(
        successText(
          "Dedicated song-request channel configuration removed.",
          "Request channel reset to standard text channel.",
          { ephemeral: true }
        )
      );
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let channel = interaction.options.getChannel("channel");

    // If channel not specified, create a dedicated channel
    if (!channel) {
      try {
        channel = await interaction.guild.channels.create({
          name: "pulse-requests",
          type: ChannelType.GuildText,
          topic: "🎶 Type song names or paste links here to play instantly. Messages auto-clean!",
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
          ],
        });
      } catch (err) {
        return interaction.editReply(
          errorText(`Failed to auto-create channel: ${err.message}`, "Please specify an existing text channel.")
        );
      }
    }

    // Post the permanent interactive player dashboard
    try {
      const payload = buildPlaceholderPayload();
      const msg = await channel.send(payload);

      // Pin the dashboard for visibility
      await msg.pin().catch(() => {});

      // Save in SQLite database
      db.setRequestChannel(interaction.guildId, channel.id, msg.id);

      return interaction.editReply(
        actionWithButton(
          emojis.equalizer,
          `Dedicated song request channel configured in <#${channel.id}>!`,
          "Interactive player card is live · Auto-cleans song request messages · Just type song names",
          {
            url: `https://discord.com/channels/${interaction.guildId}/${channel.id}`,
            label: "Jump to Channel",
          }
        )
      );
    } catch (err) {
      return interaction.editReply(
        errorText(`Failed to initialize dashboard in <#${channel.id}>: ${err.message}`)
      );
    }
  },
};
