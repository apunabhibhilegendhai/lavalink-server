import type { SoundyMiddlewares } from "#soundy/middlewares";
import type { Options } from "#soundy/types";
import type { SoundyContext } from "#soundy/utils";
import type Soundy from "./client/Soundy";
import type English from "./locales/en-US";

declare module "seyfert" {
	interface Command extends Options {}
	interface SubCommand extends Options {}
	interface ComponentCommand extends Options {}
	interface ModalCommand extends Options {}
	interface ContextMenuCommand extends Options {}
	interface EntryPointCommand extends Options {}

	interface ExtendContext extends ReturnType<typeof SoundyContext> {}

	interface SeyfertRegistry {
		client: Soundy;
		context: ReturnType<typeof SoundyContext>;
		middlewares: typeof SoundyMiddlewares;
		langs: typeof English;
	}

	interface ExtendedRCLocations {
		lavalink: string;
	}

	interface InternalOptions {
		withPrefix: true;
	}
}
