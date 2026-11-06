import type { LyricsResult } from "lavalink-client";
import {
	Button,
	Container,
	Section,
	Separator,
	TextDisplay,
	Thumbnail,
} from "seyfert";
import { ButtonStyle, MessageFlags } from "seyfert/lib/types";
import { LavalinkEventTypes } from "#soundy/types";
import { createLavalinkEvent } from "#soundy/utils";

export default createLavalinkEvent({
	name: "LyricsLine",
	type: LavalinkEventTypes.Manager,
	async run(client, player, track, payload): Promise<void> {
		if (payload.skipped) return;

		if (!player.getData<boolean | undefined>("lyricsEnabled")) return;
		if (!player.textChannelId) return;

		const lyricsId = player.getData<string | undefined>("lyricsId");
		if (!lyricsId) return;

		const locale = player.getData<string>("localeString");
		const { cmd, component } = client.t(locale).get();

		const message = await client.messages
			.fetch(lyricsId, player.textChannelId)
			.catch(() => null);
		if (!message) return;

		const lyrics = player.getData<LyricsResult | undefined>("lyrics");
		if (!lyrics) {
			await message.delete().catch(() => null);

			player.deleteData("lyricsId");
			player.deleteData("lyrics");

			return;
		}

		if (message.components && message.components.length > 0) {
			const totalLines = client.config.lyricsLines + 1;
			const index = payload.lineIndex;

			let start = Math.max(0, index - Math.floor(totalLines / 2));
			if (start + totalLines > lyrics.lines.length)
				start = Math.max(0, lyrics.lines.length - totalLines);

			const end = Math.min(lyrics.lines.length, start + totalLines);

			const lines: string = lyrics.lines
				.slice(start, end)
				.map((l, i): string => {
					const lineText =
						l.line && l.line.length > 200
							? l.line.slice(0, 200)
							: l.line || "...";
					return i + start === index ? `**${lineText}**` : `-# ${lineText}`;
				})
				.join("\n");

			const titleText = (track?.info.title ?? "Unknown Title").slice(0, 50);
			const authorText = (track?.info.author ?? "Unknown Author").slice(0, 50);
			const providerText = (lyrics.provider ?? "Unknown").slice(0, 30);
			const requesterText = (
				player.getData<string>("lyricsRequester") || "Unknown"
			).slice(0, 50);

			const components = new Container().addComponents(
				new Section()
					.setAccessory(
						new Thumbnail()
							.setMedia(track?.info.artworkUrl ?? "")
							.setDescription(`${titleText} - ${authorText}`),
					)
					.addComponents(
						new TextDisplay().setContent(
							`# ${String(
								component.lyrics.title({
									song: titleText,
								}),
							)}\n\n${lines}\n\n-# ${String(cmd.powered_by({ provider: providerText }))}`,
						),
					),
				new Separator(),
				new Section()
					.addComponents(
						new TextDisplay().setContent(
							`-# ${String(cmd.requested_by({ user: requesterText }))}`,
						),
					)
					.setAccessory(
						new Button()
							.setCustomId("player-lyricsDisable")
							.setLabel("Close")
							.setStyle(ButtonStyle.Danger),
					),
			);

			await message
				.edit({
					components: [components],
					flags: MessageFlags.IsComponentsV2,
				})
				.catch(() => null);
		}
	},
});
