import type { Player } from "lavalink-client";
import type { UsingClient } from "seyfert";
import type { ElysiaApp, SoundyWS } from "#soundy/api";
import { serializePlayerState } from "./types";

let globalAppInstance: ElysiaApp | null = null;

function getWsClients(app: ElysiaApp) {
	const server = app.server;
	if (server?.clients && server.clients.size >= 0) return server.clients;

	const maybeWsServer = server?.ws;
	if (maybeWsServer?.clients) return maybeWsServer.clients;

	return null;
}

export function setGlobalAppInstance(app: ElysiaApp): void {
	globalAppInstance = app;
}

async function broadcastPlayerStatus(
	guildId: string,
	player: Player,
	app: ElysiaApp,
) {
	const clients = getWsClients(app);
	if (!clients) return;

	const statusMsg = JSON.stringify({
		type: "status",
		guildId,
		...(await serializePlayerState(player)),
		queue: player.queue.tracks.map((track, index: number) => ({
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
		})),
		current: player.queue.current
			? {
					title: player.queue.current.info.title,
					author: player.queue.current.info.author,
					duration: player.queue.current.info.duration,
					uri: player.queue.current.info.uri,
					artwork: player.queue.current.info.artworkUrl || undefined,
					isStream: player.queue.current.info.isStream,
					position: player.position,
					requester:
						player.queue.current.requester &&
						typeof player.queue.current.requester === "object" &&
						"id" in player.queue.current.requester
							? (player.queue.current.requester as { id: string }).id
							: undefined,
				}
			: null,
		position: player.position,
		volume: player.volume,
		paused: player.paused,
		playing: player.playing,
		repeatMode: player.repeatMode,
		autoplay: player.getData("enabledAutoplay") || false,
		connected: player.connected ?? false,
	});

	for (const client of clients) {
		if (client.readyState === 1) {
			client.send(statusMsg);
		}
	}
}

export function broadcastPlayerUpdate(guildId: string, player: Player) {
	if (globalAppInstance) {
		broadcastPlayerStatus(guildId, player, globalAppInstance);
	}
}

export async function broadcastPlayerEvent(
	guildId: string,
	player: Player,
	eventType: string,
	eventData?: unknown,
) {
	if (!globalAppInstance) return;

	const clients = getWsClients(globalAppInstance);
	if (!clients) return;

	const eventMsg = JSON.stringify({
		type: "player-event",
		eventType,
		guildId,
		...(await serializePlayerState(player)),
		eventData,
		timestamp: Date.now(),
	});

	for (const client of clients) {
		if (client.readyState === 1) {
			client.send(eventMsg);
		}
	}
}

export function broadcastPlayerDisconnection(guildId: string) {
	if (!globalAppInstance) return;

	const clients = getWsClients(globalAppInstance);
	if (!clients) return;

	const disconnectionMsg = JSON.stringify({
		type: "status",
		guildId,
		connected: false,
		playing: false,
		paused: false,
		volume: 0,
		position: 0,
		current: null,
		queue: [],
		repeatMode: 0,
		autoplay: false,
	});

	for (const client of clients) {
		if (client.readyState === 1) {
			client.send(disconnectionMsg);
		}
	}
}

export function broadcastUserVoiceStateUpdate(
	client: UsingClient,
	userId: string,
	_guildId: string | null,
	_voiceChannelId: string | null,
) {
	if (!globalAppInstance) return;

	const clients = getWsClients(globalAppInstance);
	if (!clients || clients.size === 0) return;

	for (const wsClient of clients) {
		const ws = wsClient as SoundyWS;
		const clientUserId = ws.data?.userId;
		if (clientUserId === userId) {
			const cachedGuilds = Array.from(client.cache.guilds?.values() ?? []);
			const updatedGuilds = (
				cachedGuilds as Array<{ id: string; name: string; icon: string | null }>
			)
				.filter((g) => {
					const voiceState = client.cache.voiceStates?.get(userId, g.id);
					const isMember = client.cache.members?.get(userId, g.id);
					return Boolean(voiceState?.channelId) || Boolean(isMember);
				})
				.map((g) => {
					const voiceState = client.cache.voiceStates?.get(userId, g.id);
					return {
						id: g.id,
						name: g.name,
						icon: g.icon,
						inVoiceChannel: Boolean(voiceState?.channelId),
					};
				});

			const updateMsg = JSON.stringify({
				type: "user-connect",
				success: true,
				guilds: updatedGuilds,
				guildId: ws.data?.guildId,
				voiceChannelId: ws.data?.voiceChannelId,
				userId,
			});

			ws.send(updateMsg);
		}
	}
}
