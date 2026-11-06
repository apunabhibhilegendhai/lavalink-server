import { Elysia } from "elysia";
import type { UsingClient } from "seyfert";

export function createPlaylistAPI(client: UsingClient) {
	return new Elysia({ prefix: "/api/playlist" })

		.get(
			"/list/:userId",
			async ({ params }) => {
				const playlists = await client.database.getPlaylists(params.userId);
				return { playlists };
			},
			{
				detail: {
					summary: "List User Playlists",
					description: "Get all saved custom playlists for a user",
					tags: ["Dashboard - Playlist"],
				},
			},
		)

		.get(
			"/view/:playlistId",
			async ({ params }) => {
				const playlist = await client.database.getPlaylistById(
					params.playlistId,
				);
				if (!playlist) return { error: "Playlist not found" };
				return { playlist };
			},
			{
				detail: {
					summary: "View Playlist Details",
					description: "Get specific playlist details and track listing",
					tags: ["Dashboard - Playlist"],
				},
			},
		)
		.post(
			"/create",
			async ({ body }) => {
				const { userId, name } = body as {
					userId: string;
					name: string;
				};
				await client.database.createPlaylist(userId, name);
				return { success: true };
			},
			{
				detail: {
					summary: "Create Playlist",
					description: "Create a new custom playlist for user",
					tags: ["Dashboard - Playlist"],
				},
			},
		)
		.post(
			"/add",
			async ({ body }) => {
				const { playlistId, tracks } = body as {
					playlistId: string;
					tracks: Array<{ url: string; info?: object }>;
				};
				await client.database.addTracksToPlaylist(playlistId, tracks);
				return { success: true };
			},
			{
				detail: {
					summary: "Add Tracks to Playlist",
					description: "Add tracks to an existing user playlist",
					tags: ["Dashboard - Playlist"],
				},
			},
		)
		.post(
			"/remove",
			async ({ body }) => {
				const { playlistId, trackId } = body as {
					playlistId: string;
					trackId: string;
				};
				await client.database.removeSong(playlistId, trackId);
				return { success: true };
			},
			{
				detail: {
					summary: "Remove Track from Playlist",
					description: "Remove a track from user playlist",
					tags: ["Dashboard - Playlist"],
				},
			},
		)
		.post(
			"/delete",
			async ({ body }) => {
				const { userId, playlistId } = body as {
					userId: string;
					playlistId: string;
				};
				await client.database.deletePlaylist(userId, playlistId);
				return { success: true };
			},
			{
				detail: {
					summary: "Delete Playlist",
					description: "Delete user playlist",
					tags: ["Dashboard - Playlist"],
				},
			},
		);
}
