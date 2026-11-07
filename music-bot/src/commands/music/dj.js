const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../../database/db");
const { actionText, errorText, warnText } = require("../../utils/responses");
const emojis = require("../../utils/emojis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dj")
    .setDescription("Configure DJ role permissions and fair-queue protection")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set the DJ role for this server")
        .addRoleOption((option) =>
          option.setName("role").setDescription("Select the DJ role").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("toggle").setDescription("Enable or disable DJ mode enforcement")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("status").setDescription("View current DJ role and protection status")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("clear").setDescription("Remove DJ role restriction")
    ),

  async execute(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply(errorText("You need **Manage Server** permissions to configure DJ settings."));
    }

    const subcommand = interaction.options.getSubcommand();
    const settings = db.getGuildSettings(interaction.guildId);

    if (subcommand === "set") {
      const role = interaction.options.getRole("role");
      db.setDjSettings(interaction.guildId, role.id, true);

      return interaction.reply(
        actionText(
          emojis.dj,
          `DJ role set to <@&${role.id}> (**ENABLED**).`,
          "Protected controls restricted to DJs & Admins • Non-DJs can use /voteskip"
        )
      );
    }

    if (subcommand === "toggle") {
      const currentEnabled = Boolean(settings?.dj_enabled);
      const newEnabled = !currentEnabled;

      if (newEnabled && !settings?.dj_role_id) {
        return interaction.reply(warnText("No DJ role is set yet! Run `/dj set <role>` first."));
      }

      db.setDjSettings(interaction.guildId, settings?.dj_role_id || null, newEnabled);

      return interaction.reply(
        actionText(
          emojis.dj,
          `DJ Mode **${newEnabled ? "ENABLED" : "DISABLED"}**.`,
          newEnabled ? "Audio controls restricted to DJs & Admins" : "All listeners can control playback"
        )
      );
    }

    if (subcommand === "status") {
      const djRole = settings?.dj_role_id ? `<@&${settings.dj_role_id}>` : "*None configured*";
      const isEnabled = Boolean(settings?.dj_enabled && settings?.dj_role_id);

      return interaction.reply(
        actionText(
          emojis.dj,
          `DJ Mode: **${isEnabled ? "ACTIVE" : "INACTIVE"}**`,
          `Role: ${djRole} • Non-DJs must use /voteskip when active`
        )
      );
    }

    if (subcommand === "clear") {
      db.setDjSettings(interaction.guildId, null, false);
      return interaction.reply(
        actionText(emojis.reset, "Cleared DJ role configuration.", "DJ Mode is now disabled")
      );
    }
  },
};
