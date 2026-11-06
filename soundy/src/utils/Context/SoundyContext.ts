import { type DefaultLocale, extendContext } from "seyfert";
import type { LocaleString } from "seyfert/lib/types";
import { pinoLogger } from "#soundy/utils";

/**
 * The custom context is used to extend the context.
 * @returns {CustomContext} The custom context.
 */
export const SoundyContext = extendContext((i) => ({
	/**
	 * Access the high-performance Pino Logger instance.
	 */
	logger: pinoLogger.child({
		guildId: i.guildId ?? "DM",
		userId: "author" in i ? i.author?.id : i.user?.id,
	}),
	/**
	 * Get the locale from the context.
	 * @returns {Promise<DefaultLocale>} The locale object.
	 */
	async getLocale(): Promise<DefaultLocale> {
		return i.client.t(await this.getLocaleString()).get();
	},
	/**
	 * Get the locale string from the context.
	 * @returns {Promise<LocaleString>} The locale string.
	 */
	async getLocaleString(): Promise<LocaleString> {
		if (!i.guildId)
			return Promise.resolve(
				(i.user.locale as LocaleString | undefined) ??
					(i.client.config.defaultLocale as LocaleString),
			);
		const l = await i.client.database.getLocale(i.guildId);
		return l as LocaleString;
	},
}));
