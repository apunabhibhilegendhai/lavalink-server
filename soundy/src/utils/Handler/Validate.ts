import { Logger } from "seyfert";
import { Configuration } from "#soundy/config";
import type { SoundyWebhooks } from "#soundy/types";
import { InvalidEnvValue } from "#soundy/utils";

const logger = new Logger({
	name: "[ENV]",
});

/**
 * Validate Soundy environment variables.
 */
export function validateEnv() {
	logger.info("Validating environment variables...");

	if (!process.env.TOKEN) {
		if (process.env.DISCORD_BOT_TOKEN) {
			process.env.TOKEN = process.env.DISCORD_BOT_TOKEN;
		} else if (process.env.DISCORD_TOKEN) {
			process.env.TOKEN = process.env.DISCORD_TOKEN;
		}
	}

	if (!process.env.TOKEN) {
		throw new InvalidEnvValue(
			"The variable 'TOKEN' (or 'DISCORD_BOT_TOKEN') in environment cannot be empty or undefined."
		);
	}

	if (!process.env.DATABASE_URL) {
		process.env.DATABASE_URL = "";
	}
	if (!process.env.DATABASE_PASSWORD) {
		process.env.DATABASE_PASSWORD = "";
	}

	return logger.info("Environment variables validated successfully.");
}

/**
 * Validate the `Configuration` object variables.
 */
export function validateConfig() {
	logger.info("Validating 'src/config/config.ts' contents...");

	const createMessage = (variable: string) =>
		`The configuration value '${variable}' in 'src/config/config.ts' is missing or invalid.`;

	const isUnset = (v: unknown) => {
		if (v === undefined || v === null) return true;
		if (typeof v === "string") {
			const s = v.trim().toLowerCase();
			return s === "";
		}
		return false;
	};

	if (!Configuration) {
		throw new InvalidEnvValue(createMessage("Configuration"));
	}

	if (isUnset(Configuration.defaultPrefix)) {
		throw new InvalidEnvValue(createMessage("Configuration.defaultPrefix"));
	}

	if (
		Configuration.serverPort === undefined ||
		Configuration.serverPort === null ||
		typeof Configuration.serverPort !== "number"
	) {
		throw new InvalidEnvValue(createMessage("Configuration.serverPort"));
	}

	if (Configuration.topgg?.enabled) {
		if (isUnset(Configuration.topgg?.token)) {
			throw new InvalidEnvValue(createMessage("Configuration.topgg.token"));
		}
	}

	if (!Configuration.cache || isUnset(Configuration.cache.filename)) {
		throw new InvalidEnvValue(createMessage("Configuration.cache.filename"));
	}

	logger.info("Configuration validation passed.");
}
