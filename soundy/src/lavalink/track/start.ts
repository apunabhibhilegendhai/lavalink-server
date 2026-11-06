import { broadcastPlayerUpdate } from "#soundy/api";
import { LavalinkEventTypes } from "#soundy/types";
import {
	createLavalinkEvent,
	createNowPlayingEmbed,
	escapeMarkdown,
	PlayerSaver,
	syncNextTrack,
} from "#soundy/utils";

export default createLavalinkEvent({
	name: "trackStart",
	type: LavalinkEventTypes.Manager,
	async run(client, player, track) {
		if (!(player.textChannelId && player.voiceChannelId)) return;
		if (!track) return;
		try {
			player.setData("me", {
				...client.me,
				tag: client.me.username,
			});

			const playerSaver = new PlayerSaver(client.logger);

			const localeString = await client.database.getLocale(player.guildId);
			player.setData("localeString", localeString);

			const lyricsData = await playerSaver.getLyricsData(player.guildId);
			if (lyricsData) {
				if (lyricsData.lyricsEnabled) {
					player.setData("lyricsEnabled", lyricsData.lyricsEnabled);
				}
				if (lyricsData.lyricsId) {
					player.setData("lyricsId", lyricsData.lyricsId);
				}
				if (lyricsData.lyrics) {
					player.setData("lyrics", lyricsData.lyrics);
				}
			}

			const disconnectTimeout = player.getData<NodeJS.Timeout | undefined>(
				"disconnectTimeout",
			);
			if (disconnectTimeout) {
				clearTimeout(disconnectTimeout);
				player.deleteData("disconnectTimeout");
			}

			const lyricsInterval = player.getData<NodeJS.Timeout | undefined>(
				"lyricsInterval",
			);
			if (lyricsInterval) {
				clearInterval(lyricsInterval);
				player.deleteData("lyricsInterval");
			}

			let requesterId = client.botId || "bot";
			if (track.requester) {
				if (typeof track.requester === "object" && "id" in track.requester) {
					requesterId = String((track.requester as { id: string }).id);
				} else if (typeof track.requester === "string") {
					requesterId = track.requester;
				}
			}

			await client.database.updateTrackStats(
				track.info.uri,
				track.info.title,
				track.info.author,
				player.guildId,
				requesterId,
				track.info.uri,
				track.info.artworkUrl ?? undefined,
				track.info.duration,
				track.info.isStream,
			);
			await client.database.updateUserStats(requesterId, player.guildId);

			if (player.voiceChannelId) {
				const allVoiceStates =
					client.cache.voiceStates?.values(player.guildId) ?? [];
				const listeners = allVoiceStates
					.filter(
						(vs) =>
							vs.channelId === player.voiceChannelId &&
							vs.userId !== client.botId,
					)
					.map((vs) => vs.userId);

				if (listeners.length >= 2) {
					const trackDuration =
						track.info.duration && !track.info.isStream
							? track.info.duration
							: 180_000;
					client.database
						.updateListeningFriends(listeners, trackDuration)
						.catch((err) =>
							client.logger.warn(
								`[Music] Failed to update listening friends: ${err}`,
							),
						);
				}
			}

			const voice = await client.channels
				.fetch(player.voiceChannelId)
				.catch(() => null);
			if (!voice?.is(["GuildStageVoice", "GuildVoice"])) return;

			if (voice.is(["GuildVoice"])) {
				const voiceStatusEnabled = await client.database.getVoiceStatus(
					player.guildId,
				);
				if (voiceStatusEnabled) {
					await voice
						.setVoiceStatus(
							`♪ **${escapeMarkdown(track.info.title)}** by **${escapeMarkdown(track.info.author)}**`,
						)
						.catch(() => null);
				}
			}

			const nowPlaying = await createNowPlayingEmbed(client, player, track);
			const setupData = await client.database.getSetup(player.guildId);
			if (setupData?.messageId) {
				try {
					const setupMessage = await client.messages.fetch(
						setupData.messageId,
						setupData.channelId,
					);
					if (setupMessage) {
						await client.messages.edit(
							setupMessage.id,
							setupData.channelId,
							nowPlaying,
						);
						const playerSaver = new PlayerSaver(client.logger);
						const playerData = player.toJSON();
						const safeData = playerSaver.extractSafePlayerData(
							playerData as unknown as Record<string, unknown>,
						);
						safeData.messageId = setupData.messageId;
						await playerSaver.savePlayer(player.guildId, safeData);
						broadcastPlayerUpdate(player.guildId, player);
						client.logger.info(
							`[Music] Saved player for guild ${player.guildId}`,
						);
						return;
					}
				} catch (error) {
					client.logger.debug(
						`[Music] Failed to update setup message: ${error}`,
					);
				}
			}

			const sentMessage = await client.messages.write(
				player.textChannelId,
				nowPlaying,
			);
			player.setData("messageId", sentMessage.id);

			await playerSaver.setLastNowPlayingMessage(
				player.guildId,
				sentMessage.id,
				player.textChannelId,
			);

			const playerData = player.toJSON();
			const safeData = playerSaver.extractSafePlayerData(
				playerData as unknown as Record<string, unknown>,
			);
			safeData.messageId = sentMessage.id;
			await playerSaver.savePlayer(player.guildId, safeData);
			broadcastPlayerUpdate(player.guildId, player);
			client.logger.info(`[Music] Saved player for guild ${player.guildId}`);
		} catch (err) {
			client.logger.error(
				"[Music] Failed to send trackStart message or save player state:",
				err,
			);
		} finally {
			syncNextTrack(client, player).catch((err) =>
				client.logger.warn(
					"[NodeLink Gapless] Failed to sync next track: ${err}",
				),
			);
		}
	},
});
