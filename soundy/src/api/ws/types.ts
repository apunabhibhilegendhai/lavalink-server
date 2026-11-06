import type { Player } from "lavalink-client";
import type { UsingClient } from "seyfert";
import type { SoundyWS, WSMessage } from "#soundy/api";

export interface WebSocketServerWithClients {
	clients?: Set<{ readyState: number; send: (msg: string) => void }>;
}

export type WSHandler = (
	ws: SoundyWS,
	msg: WSMessage,
	client: UsingClient,
	...args: unknown[]
) => Promise<boolean> | boolean;

export async function serializePlayerState(
	player: Player,
	client?: UsingClient,
) {
	const current = player.queue.current;
	let listeners: Array<{
		id: string;
		name: string;
		avatar: string | null;
		role: string;
	}> = [];

	if (client && player.guildId && player.voiceChannelId) {
		const userIds = new Set<string>();

		// 1. From cache
		const allVoiceStates =
			client.cache.voiceStates?.values(player.guildId) ?? [];
		for (const vs of allVoiceStates) {
			if (vs.channelId === player.voiceChannelId) {
				userIds.add(vs.userId);
			}
		}

		// 2. From channel fetch if available
		const channel = (await client.channels
			.fetch(player.voiceChannelId)
			.catch(() => null)) as {
			states?: () => Array<{ userId: string }>;
		} | null;
		if (channel && typeof channel.states === "function") {
			const states = channel.states();
			if (Array.isArray(states)) {
				for (const vs of states) {
					if (vs.userId) userIds.add(vs.userId);
				}
			}
		}

		const rawListeners = await Promise.all(
			Array.from(userIds).map(async (uid) => {
				if (client.me?.id && uid === client.me.id) return null;
				const u =
					client.cache.users?.get(uid) ??
					(await client.users.fetch(uid).catch(() => null));
				if (u?.bot) return null;

				return {
					id: uid,
					name: u?.globalName || u?.username || `User ${uid.slice(-4)}`,
					avatar: u?.avatarURL({ size: 128 }) || null,
					role: "Listener",
				};
			}),
		);
		listeners = rawListeners.filter(
			(
				l,
			): l is {
				id: string;
				name: string;
				avatar: string | null;
				role: string;
			} => l !== null,
		);
	}

	return {
		connected: player.connected ?? false,
		playing: player.playing,
		paused: player.paused,
		volume: player.volume,
		position: player.position,
		listeners,
		current: current
			? {
					title: current.info.title,
					author: current.info.author,
					duration: current.info.duration,
					uri: current.info.uri,
					artwork: current.info.artworkUrl || undefined,
					isStream: current.info.isStream,
					position: player.position,
					albumName: current.pluginInfo.albumName,
				}
			: null,
		repeatMode:
			player.repeatMode === "off" ? 0 : player.repeatMode === "track" ? 1 : 2,
		autoplay: player.getData("enabledAutoplay") || false,
	};
}

export function getContext(msg: WSMessage, ws: SoundyWS) {
	return {
		guildId: msg.guildId || ws.data?.guildId,
		voiceChannelId: msg.voiceChannelId || ws.data?.voiceChannelId,
	};
}

export function getRequesterId(_msg: WSMessage, ws: SoundyWS) {
	return String(ws.data?.userId || "websocket-user");
}

export async function checkVoicePermissions(
	ws: SoundyWS,
	guildId: string,
	client: UsingClient,
	requireSameChannel = true,
): Promise<{ allowed: boolean; message?: string }> {
	const userId = ws.data?.userId;
	if (!userId) {
		return {
			allowed: false,
			message: "Unauthorized: Connection is not authenticated.",
		};
	}

	const isMember =
		client.cache.members?.get(userId, guildId) ||
		(await client.members.fetch(guildId, userId).catch(() => null));

	if (!isMember) {
		return {
			allowed: false,
			message: "Unauthorized: You are not a member of this server.",
		};
	}

	const voiceState = client.cache.voiceStates?.get(userId, guildId);
	if (!voiceState?.channelId) {
		return {
			allowed: false,
			message:
				"You must be connected to a Voice Channel in this server to control music.",
		};
	}

	if (requireSameChannel) {
		const player = client.manager.getPlayer(guildId);
		if (
			player?.voiceChannelId &&
			player.voiceChannelId !== voiceState.channelId
		) {
			return {
				allowed: false,
				message:
					"You must be in the SAME Voice Channel as Soundy to control playback.",
			};
		}
	}

	return { allowed: true };
}
