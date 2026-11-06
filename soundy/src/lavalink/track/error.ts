import { LavalinkEventTypes } from "#soundy/types";
import { createLavalinkEvent, getDepth, sendNodeLog } from "#soundy/utils";

export default createLavalinkEvent({
	name: "trackError",
	type: LavalinkEventTypes.Manager,
	async run(client, player, track, payload) {
		// Log the error to console
		client.logger.error(
			`[Music] Track error for "${track?.info.title}" in guild ${player.guildId}. Error: ${getDepth(payload.exception)}`,
		);

		let channelId = "";
		const rawChannel = player.textChannelId;
		if (
			typeof rawChannel === "object" &&
			rawChannel !== null &&
			Object.hasOwn(rawChannel, "id") &&
			typeof (rawChannel as { id: unknown }).id === "string"
		) {
			channelId = (rawChannel as { id: string }).id;
		} else if (typeof rawChannel === "string") {
			channelId = rawChannel;
		}

		try {
			if (
				payload.exception?.message?.includes("rate limit") ||
				payload.exception?.message?.includes("429")
			) {
				client.logger.warn(
					`[Music] Skipping webhook for rate limit error on track "${track?.info.title}"`,
				);
				return;
			}

			// Send to webhook
			await sendNodeLog(client, "track-error", player.node, {
				exception: payload.exception,
				track: track,
				// biome-ignore lint/suspicious/noExplicitAny: Lavalink event payload types are dynamic and may not match strict typings, so 'any' is used for compatibility.
			} as any);
		} catch (error) {
			client.logger.error(
				`[Music] Failed to handle track error event: ${error}`,
			);
		}

		// Check if this was a YouTube or streaming block that can be auto-resolved via Spotify / JioSaavn
		const errMsg = String(payload.exception?.message || "");
		const isBlockedStream =
			track?.info.sourceName === "youtube" ||
			errMsg.includes("login") ||
			errMsg.includes("All clients failed") ||
			errMsg.includes("403") ||
			errMsg.includes("requires login") ||
			errMsg.includes("not a bot");

		if (isBlockedStream && track?.info?.title) {
			const fallbackQuery = `${track.info.title} ${track.info.author || ""}`.trim();
			client.logger.warn(
				`[Music] Track "${track.info.title}" failed to stream (${errMsg.slice(0, 80)}). Attempting auto-fallback for "${fallbackQuery}"...`,
			);

			try {
				const fallbackRes = await player.search(
					fallbackQuery,
					track.requester,
				);
				if (fallbackRes.tracks && fallbackRes.tracks.length > 0) {
					const validTrack =
						fallbackRes.tracks.find(
							(t) =>
								t.info.sourceName !== "youtube" &&
								t.info.identifier !== track.info.identifier,
						) || fallbackRes.tracks[0];

					if (
						validTrack &&
						validTrack.info.identifier !== track.info.identifier
					) {
						validTrack.requester = track.requester;
						client.logger.info(
							`[Music] Auto-switched to [${validTrack.info.sourceName}] "${validTrack.info.title}"! Playing now...`,
						);

						if (channelId) {
							await client.messages
								.write(channelId, {
									embeds: [
										{
											color: client.config.color.warn ?? 0xffff00,
											description: `⚡ Audio stream for **${track.info.title}** was redirected to **[${validTrack.info.title}](${validTrack.info.uri})** via ${validTrack.info.sourceName.toUpperCase()}.`,
										},
									],
								})
								.catch(() => null);
						}

						await player.queue.add(validTrack);
						if (!player.playing) {
							await player.play();
						}
						return;
					}
				}
			} catch (fbErr) {
				client.logger.error(`[Music] Auto-fallback failed: ${fbErr}`);
			}
		}

		// If fallback couldn't be resolved, send an informative error message to the channel
		if (channelId) {
			await client.messages
				.write(channelId, {
					embeds: [
						{
							color: client.config.color.no,
							title: "❌ Track Error",
							description: `There was an error playing **${track?.info.title}**.\n\`${payload.exception?.message || "Unknown stream error"}\`\n\n💡 *Tip: Try searching with Spotify or JioSaavn format (e.g. \`/play <song name>\` or a Spotify URL).*`,
						},
					],
				})
				.catch(() => null);
		}

		// Try to play the next track if available without abruptly destroying the player
		try {
			if (player.queue.tracks.length > 0) {
				await player.skip();
			} else {
				// Don't leave immediately! Keep player in channel with idle timeout
				player.queue.current = null;
				const mode247 = await client.database.get247Mode(player.guildId);
				if (!mode247?.enabled) {
					const existingTimeout =
						player.getData<NodeJS.Timeout>("disconnectTimeout");
					if (existingTimeout) clearTimeout(existingTimeout);

					const disconnectTimeout = setTimeout(async () => {
						const currentPlayer = client.manager.getPlayer(player.guildId);
						if (
							currentPlayer &&
							!currentPlayer.queue.current &&
							!currentPlayer.playing
						) {
							await currentPlayer.destroy();
						}
					}, 60000);
					player.setData("disconnectTimeout", disconnectTimeout);
				}
			}
		} catch (skipError) {
			client.logger.error(
				`[Music] Failed to handle queue after track error: ${skipError}`,
			);
		}
	},
});
