const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { actionText, errorText, successText } = require("../../utils/responses");
const db = require("../../database/db");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prefix")
    .setDescription("View or change the server's text command prefix")
    .addStringOption((option) =>
      option
        .setName("new")
        .setDescription("Set a new command prefix (e.g. '.', '!', 'm!')")
        .setMaxLength(5)
    ),

  aliases: ["setprefix"],

  async execute(interaction, client) {
    const guildId = interaction.guildId;
    const currentPrefix = db.getGuildPrefix(guildId) || config.prefix.default;
    const newPrefix = interaction.options.getString("new");

    // If no argument provided, display the current prefix
    if (!newPrefix) {
      return interaction.reply(
        actionText(
          "⚙️",
          `Current server prefix is: \`${currentPrefix}\``,
          `You can run commands using \`${currentPrefix}play\` or with flexible spacing: \`${currentPrefix} play <song>\`.\nTo change it, use \`/prefix new:<prefix>\` or \`${currentPrefix}prefix <new>\`.`
        )
      );
    }

    // Permission check: only Administrators or Manage Guild can change the prefix
    const member = interaction.member;
    const hasAdmin =
      member?.permissions?.has(PermissionFlagsBits.Administrator) ||
      member?.permissions?.has(PermissionFlagsBits.ManageGuild);

    if (!hasAdmin) {
      return interaction.reply(
        errorText("You need the `Manage Server` or `Administrator` permission to change the prefix.")
      );
    }

    const clean = newPrefix.trim();
    if (!clean || clean.length > 5) {
      return interaction.reply(errorText("Prefix must be between 1 and 5 characters."));
    }

    db.setGuildPrefix(guildId, clean);

    return interaction.reply(
      successText(
        `Server prefix has been changed to \`${clean}\``,
        `You can now use commands like \`${clean}play\`, \`${clean} play\`, \`${clean}queue\`, etc.`
      )
    );
  },
};
