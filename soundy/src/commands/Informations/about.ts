import {
	Command,
	type CommandContext,
	Declare,
	Embed,
	LocalesT,
} from "seyfert";
import { SoundyCategory } from "#soundy/types";
import { SoundyOptions } from "#soundy/utils";

@Declare({
	name: "about",
	description: "Show information about me",
	integrationTypes: ["GuildInstall"],
	contexts: ["Guild"],
})
@LocalesT("cmd.about.name", "cmd.about.description")
@SoundyOptions({ cooldown: 5, category: SoundyCategory.Informations })
export default class AboutCommand extends Command {
	async run(ctx: CommandContext): Promise<void> {
		const { client } = ctx;
		const { cmd } = await ctx.getLocale();

		const guildCount = client.cache.guilds?.count() ?? 0;
		const userCount = client.cache.users?.count() ?? 0;

		const aboutEmbed = new Embed()
			.setColor(client.config.color.primary)
			.setAuthor({
				name: cmd.about.run.title,
			})
			.setDescription(
				[
					`${client.config.emoji.info} **${cmd.about.run.about_me.title}**`,
					"",
					cmd.about.run.about_me[1],
					"",
					`${client.config.emoji.list} **${cmd.about.run.about_me[2]}**`,
					"",
					cmd.about.run.about_me[3],
					cmd.about.run.about_me[4],
					cmd.about.run.about_me[5],
					cmd.about.run.about_me[6],
					cmd.about.run.about_me[7],
					cmd.about.run.about_me[8],
					"",
					`${client.config.emoji.link} **${cmd.about.run.about_me[9]}**`,
					"",
					`- [${cmd.about.run.about_me[10]}](${client.config.info.inviteLink})`,
					`- [${cmd.about.run.about_me[11]}](${client.config.info.supportServer})`,
					`- [${cmd.about.run.about_me[12]}](${client.config.info.voteLink})`,
					"",
					`${client.config.emoji.info} **${cmd.about.run.about_me[13]}**`,
					"",
					"# MADE BY @ice.w",
				].join("\n"),
			)
			.setFooter({
				text: cmd.about.run.footer({ guildCount, userCount }),
			})
			.setTimestamp();

		await ctx.write({
			embeds: [aboutEmbed],
		});
	}
}
