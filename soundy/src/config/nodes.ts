import { type LavalinkNodeOptions, NodeType } from "lavalink-client";

export const nodes: LavalinkNodeOptions[] = [
	{
		id: "Public-Lavalink",
		host: process.env.LAVALINK_HOST || "lavalink.opendrive.indevs.in",
		port: Number(process.env.LAVALINK_PORT || 443),
		authorization: process.env.LAVALINK_PASSWORD || "youshallnotpass",
		secure: process.env.LAVALINK_SECURE ? process.env.LAVALINK_SECURE === "true" : true,
		retryAmount: 1000,
		retryDelay: 5000,
		nodeType: NodeType.Lavalink,
	},
];
