import { LavalinkEventTypes } from "#soundy/types";
import { createLavalinkEvent, sendNodeLog } from "#soundy/utils";

export default createLavalinkEvent({
	name: "trackStuck",
	type: LavalinkEventTypes.Manager,
	async run(client, player, track, payload) {
		client.logger.error(
			`[Music] Track stuck: "${track?.info.title}" in guild ${player.guildId}. Threshold: ${payload.thresholdMs}ms`,
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
			const exception = {
				message: `Track stuck for ${payload.thresholdMs}ms`,
				name: "TrackStuckException",
				severity: "COMMON",
				cause: null,
			};

			await sendNodeLog(client, "track-error", player.node, {
				track,
				exception,
				guildId: player.guildId,
				// biome-ignore lint/suspicious/noExplicitAny: Lavalink event payload types are dynamic and may not match strict typings, so 'any' is used for compatibility.
			} as any);

			if (channelId) {
				await client.messages
					.write(channelId, {
						embeds: [
							{
								color: client.config.color.no,
								title: "❌ Track Stuck",
								description: `The track **${track?.info.title}** got stuck and couldn't continue playing.`,
							},
						],
					})
					.catch(() => null);
			}
		} catch (error) {
			client.logger.error(
				`[Music] Failed to handle track stuck event: ${error}`,
			);
		}

		try {
			if (player.queue.tracks.length > 0) {
				await player.skip();
			} else {
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
			client.logger.error(`[Music] Failed to skip stuck track: ${skipError}`);
		}
	},
});
