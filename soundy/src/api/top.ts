import { Elysia } from "elysia";
import type { UsingClient } from "seyfert";

export function createTopAPI(client: UsingClient) {
	return new Elysia({ prefix: "/api/top" })
		.get(
			"/tracks",
			async ({ query }) => {
				const guildId = query.guildId || "";
				const limit = Number(query.limit) || 10;
				const tracks = await client.database.getTopTracks(guildId, limit);
				return { tracks };
			},
			{
				detail: {
					summary: "Get Top Tracks",
					description: "Retrieve top played tracks globally or per guild",
					tags: ["Dashboard - Top Charts"],
				},
			},
		)
		.get(
			"/users",
			async ({ query }) => {
				const guildId = query.guildId || "";
				const limit = Number(query.limit) || 10;
				const rawUsers = await client.database.getTopUsers(guildId, limit);

				const users = await Promise.all(
					rawUsers.map(async (u) => {
						const discordUser =
							client.cache.users?.get(u.userId) ??
							(await client.users.fetch(u.userId).catch(() => null));
						return {
							userId: u.userId,
							playCount: u.playCount,
							username: discordUser?.username || null,
							globalName:
								discordUser?.globalName || discordUser?.username || null,
							avatar: discordUser?.avatarURL({ size: 256 }) || null,
						};
					}),
				);

				return { users };
			},
			{
				detail: {
					summary: "Get Top Users",
					description: "Retrieve top active listening users",
					tags: ["Dashboard - Top Charts"],
				},
			},
		)
		.get(
			"/guilds",
			async ({ query }) => {
				const limit = Number(query.limit) || 10;
				const guilds = await client.database.getTopGuilds(limit);
				return { guilds };
			},
			{
				detail: {
					summary: "Get Top Guilds",
					description: "Retrieve top active guilds by playback count",
					tags: ["Dashboard - Top Charts"],
				},
			},
		);
}
