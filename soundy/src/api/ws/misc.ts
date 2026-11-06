import type { WSHandler } from "./types";
import { serializePlayerState } from "./types";

export const handleUserStatus: WSHandler = async (ws, msg, client) => {
	if (msg.type === "user-status") {
		const userId = ws.data?.userId;
		if (!userId) {
			ws.send(
				JSON.stringify({
					type: "user-status",
					found: false,
					error: "Unauthorized",
				}),
			);
			return true;
		}
		let found = null;
		for (const player of client.manager.players.values()) {
			const guildId = player.guildId;

			const gId = String(guildId);
			const voiceState = client.cache.voiceStates?.get(userId, gId);
			if (voiceState?.channelId) {
				found = {
					guildId,
					voiceChannelId: voiceState.channelId,
					player: player,
				};
				break;
			}
		}
		if (found) {
			ws.send(JSON.stringify({ type: "user-status", ...found }));
		} else {
			ws.send(JSON.stringify({ type: "user-status", found: false }));
		}
		return true;
	}
	return false;
};

export const handleUserConnect: WSHandler = async (
	ws,
	msg,
	client,
	..._args
) => {
	if (msg.type === "user-connect") {
		const userId = ws.data?.userId;

		if (!userId) {
			ws.send(
				JSON.stringify({
					type: "user-connect",
					success: false,
					message: "Unauthorized: Connection is not authenticated.",
				}),
			);
			return true;
		}

		let guildsPayload =
			(msg.guilds as Array<{
				id: string;
				name: string;
				icon: string | null;
			}>) || [];

		// If payload is empty or missing guilds, populate from bot cache where user is member or voice state exists
		if (guildsPayload.length === 0) {
			const cachedGuilds = Array.from(client.cache.guilds?.values() ?? []);
			guildsPayload = (
				cachedGuilds as Array<{ id: string; name: string; icon: string | null }>
			).map((g) => ({
				id: g.id,
				name: g.name,
				icon: g.icon,
			}));
		}

		const userGuilds = guildsPayload
			.filter((g) => {
				const voiceState = client.cache.voiceStates?.get(userId, g.id);
				const isMember = client.cache.members?.get(userId, g.id);
				return (
					Boolean(voiceState?.channelId) ||
					Boolean(isMember) ||
					Boolean(client.cache.guilds?.get(g.id))
				);
			})
			.map((g) => {
				const voiceState = client.cache.voiceStates?.get(userId, g.id);
				return {
					...g,
					inVoiceChannel: Boolean(voiceState?.channelId),
				};
			});

		let activeGuildId: string | null = ws.data?.guildId || null;
		let activeVoiceChannelId: string | null = ws.data?.voiceChannelId || null;

		// 1. Keep currently selected guild if valid, otherwise prioritize VC guild
		if (ws.data?.guildId) {
			activeGuildId = ws.data.guildId;
			const voiceState = client.cache.voiceStates?.get(userId, activeGuildId);
			if (voiceState?.channelId) {
				activeVoiceChannelId = voiceState.channelId;
			}
		} else {
			for (const g of userGuilds) {
				const voiceState = client.cache.voiceStates?.get(userId, g.id);
				if (voiceState?.channelId) {
					activeGuildId = g.id;
					activeVoiceChannelId = voiceState.channelId;
					break;
				}
			}
		}

		// 2. Prioritize the guild where bot is currently playing music
		if (!activeGuildId) {
			for (const g of userGuilds) {
				const player = client.manager.getPlayer(g.id);
				if (player && (player.playing || player.queue.current)) {
					activeGuildId = g.id;
					break;
				}
			}
		}

		// 3. Fallback to first guild in userGuilds
		if (!activeGuildId && userGuilds.length > 0) {
			activeGuildId = userGuilds[0]?.id || null;
		}

		if (activeGuildId) {
			if (!ws.data) ws.data = {};
			ws.data.guildId = activeGuildId;
			if (activeVoiceChannelId) {
				ws.data.voiceChannelId = activeVoiceChannelId;
			}
		}

		ws.send(
			JSON.stringify({
				type: "user-connect",
				success: true,
				guilds: userGuilds,
				guildId: activeGuildId,
				activeGuildId: activeGuildId,
				voiceChannelId: activeVoiceChannelId,
			}),
		);

		// Send initial player status and queue immediately
		if (activeGuildId) {
			const player = client.manager.getPlayer(activeGuildId);
			if (player) {
				ws.send(
					JSON.stringify({
						type: "status",
						...(await serializePlayerState(player, client)),
					}),
				);
				const queue = player.queue.tracks.map((track, index: number) => ({
					index,
					title: track.info.title || "Unknown",
					author: track.info.author || "Unknown",
					duration: track.info.duration || 0,
					uri: track.info.uri || "",
					artwork: track.info.artworkUrl || undefined,
					requester:
						track.requester &&
						typeof track.requester === "object" &&
						"id" in track.requester
							? (track.requester as { id: string }).id
							: undefined,
				}));
				ws.send(JSON.stringify({ type: "queue", queue, length: queue.length }));
			} else {
				ws.send(JSON.stringify({ type: "status", connected: false }));
			}
		}
		return true;
	}
	return false;
};

export const handleGetPlaylist: WSHandler = async (ws, msg, client) => {
	if (msg.type === "get-playlist" && msg.playlistId) {
		const playlistId = String(msg.playlistId);

		try {
			const playlist = await client.database.getPlaylistById(playlistId);

			if (!playlist) {
				ws.send(
					JSON.stringify({
						type: "get-playlist",
						success: false,
						message: "Playlist not found",
					}),
				);
				return true;
			}

			const tracks = playlist.tracks.map(
				(
					track: { id: string; url: string; info: string | null },
					index: number,
				) => ({
					id: track.id,
					index,
					url: track.url,
					info: track.info ? JSON.parse(track.info) : null,
				}),
			);

			ws.send(
				JSON.stringify({
					type: "get-playlist",
					success: true,
					playlist: {
						id: playlist.id,
						name: playlist.name,
						userId: playlist.userId,
						trackCount: tracks.length,
						tracks: tracks,
						createdAt: playlist.createdAt,
					},
				}),
			);
		} catch (error) {
			ws.send(
				JSON.stringify({
					type: "get-playlist",
					success: false,
					message: `Error getting playlist: ${String(error)}`,
				}),
			);
		}
		return true;
	}
	return false;
};

export const handleGetPlaylists: WSHandler = async (ws, msg, client) => {
	if (msg.type === "get-playlists") {
		const userId = ws.data?.userId;

		if (!userId) {
			ws.send(
				JSON.stringify({
					type: "get-playlists",
					success: false,
					message: "Unauthorized",
				}),
			);
			return true;
		}

		try {
			const playlists = await client.database.getPlaylists(userId);

			ws.send(
				JSON.stringify({
					type: "get-playlists",
					success: true,
					playlists: playlists.map((playlist) => ({
						id: playlist.id,
						name: playlist.name,
						trackCount: playlist.tracks.length,
						createdAt: playlist.createdAt,
					})),
				}),
			);
		} catch (error) {
			ws.send(
				JSON.stringify({
					type: "get-playlists",
					success: false,
					message: `Error getting playlists: ${String(error)}`,
				}),
			);
		}
		return true;
	}
	return false;
};

export const handleSelectGuild: WSHandler = async (ws, msg, client) => {
	if (msg.type === "select-guild" && msg.guildId) {
		const guildId = String(msg.guildId);
		const userId = ws.data?.userId;

		if (!userId) {
			ws.send(
				JSON.stringify({
					type: "select-guild",
					success: false,
					message: "Unauthorized: Connection is not authenticated.",
				}),
			);
			return true;
		}

		// Verify membership
		const isMember =
			client.cache.members?.get(userId, guildId) ||
			(await client.members.fetch(guildId, userId).catch(() => null));

		if (!isMember) {
			ws.send(
				JSON.stringify({
					type: "select-guild",
					success: false,
					message: "Unauthorized: You are not a member of this server.",
				}),
			);
			return true;
		}

		if (!ws.data) ws.data = {};
		ws.data.guildId = guildId;

		const voiceState = client.cache.voiceStates?.get(userId, guildId);
		ws.data.voiceChannelId = voiceState?.channelId || undefined;

		ws.send(
			JSON.stringify({
				type: "select-guild",
				success: true,
				guildId: guildId,
				voiceChannelId: ws.data.voiceChannelId,
			}),
		);

		// Immediately send status/queue of the new guild
		const player = client.manager.getPlayer(guildId);
		if (player) {
			ws.send(
				JSON.stringify({
					type: "status",
					...(await serializePlayerState(player, client)),
				}),
			);
		} else {
			ws.send(JSON.stringify({ type: "status", connected: false }));
		}

		return true;
	}
	return false;
};
