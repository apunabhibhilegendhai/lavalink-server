// RENAME MEEEEEE TO config.ts AND UPDATE THE CONFIGURATION ACCORDINGLY

import type { SoundyConfiguration, SoundyEnvironment } from "#soundy/types";
import { emoji } from "./emoji";

const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
const { DATABASE_URL, DATABASE_PASSWORD } = process.env;

export const Configuration: SoundyConfiguration = {
	defaultPrefix: "!", // Default prefix for commands
	defaultSearchPlatform: "spotify", // Default search platform for music commands
	fallbackSearchPlatform: "youtube", // Fallback search platform when default is rate limited or errors
	defaultVolume: 100, // Default volume for music playback
	defaultLocale: "en-US", // Default locale for the bot
	lyricsLines: 10, // Number of lyrics lines to display
	serverPort: 3000, // Port for the API server
	info: {
		banner: "https://i.ibb.co.com/whrLTZ1p/file-0000000019dc8211985b4359658ddd94.png", // Replace with actual banner URL
		inviteLink:
			"https://discord.com/oauth2/authorize?client_id=1567987888652681287",
		supportServer: "https://discord.gg/YtnwB94VB",
		
	},
	topgg: {
		enabled: false,
		webhookAuth: "xxx", // Replace with actual webhook auth token
		token: "xxx", // Replace with actual Top.gg token
	},
	premium: {
		enabled: false, // Enable or disable premium features
	},
	cache: {
		filename: "commands.json", // Name of the cache file
		size: 5, // Size of the cache
	},
	developersIds: ["1413268695160983582", "593741548579979265"], // Replace with actual developer IDs
	permissions: {
		stagePermissions: ["MuteMembers"],
		voicePermissions: ["ViewChannel", "Connect", "Speak"],
	},
	color: {
		primary: 0xff69b4, // Primary color for embeds
		secondary: 0xff1493, // Secondary color for embeds

		yes: 0x00ff33, // Color for positive responses
		no: 0xff0000, // Color for negative responses
		warn: 0xffff00, // Color for warning responses
	},
	webhooks: {
		nodeLog: (process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1567987137243258970/yyFRTNpH4lD849KP6TnJZpjp6J6W9TquwWFZxYpPTlG0nnJnXfSwbI3eyNJ5n3UWCnGi"), // Node logs
		guildLog: (process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1567987009723572324/r8VXC0SQqLAHcvpl5kWC7_A0B8Gpw8zDqq5qVuDMBIi4VONzErkXXjiIOb5HHxpV5f0w"), // Guild logs
		commandLog: (process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1567839171148521583/XDQG3f0_LkM-KYryX1SZcCMTzoAAZavwg-iloQH5o402RDqbvXpPqM5k_wwD86pBFF9l"), // Command logs
		voteLog: (process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1567839326748811304/--tCGUJClOeb4sAMGH8QZmSjPT-RcqICHTMvATY7zrbdqbIB1P0AJL86zhIaBTkicoNn"), // Vote logs
		errorLog: (process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1567839433271803924/CdqRGsI41rLXc9kdXLvdZo6Dv4VrhGS7CYdbdj3V6wYKE_oFjlpCG5jTkCn9O22_2rBf"), // Error logs
		report: (process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1567985976419295364/RMA-t0B6sWh3BjeCl3HtTuWk2BzeEIEAivUyxjlGbiLz0WiuRO5BWImzYcIW2N1aJOTb"), // Bug or suggestion reports
	},

	emoji,
};

export const Environment: SoundyEnvironment = {
	Token: TOKEN,
	DatabaseUrl: DATABASE_URL,
	DatabasePassword: DATABASE_PASSWORD,
};

export * from "./emoji";
export * from "./nodes";
