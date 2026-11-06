export const emoji = {
	// EMOJIS //
	yes: "<:emoji_13:1567889935221137519>",
    no: "<:emoji_12:1567889883211628564>",
    link: "<a:xieron_stolen_emoji_1793887667:1567903260516552737>",
    party: "<:party:1302910888986284032>",
    artist: "<:emoji_7:1567881465767927848>",
    clock: "<:emoji_8:1567881527319207976>",
    user: "<:emoji_9:1567881594574995466>",
    play: "<:emoji_6:1567881401548808313>",
    pause: "<:emoji_15:1567893617996079105>",
    loop: "<:emoji_17:1567893746450698280>",
    shuffle: "<:emoji_13:1567893479399362571>",
    previous: "<:emoji_14:1567893557602164777>",
    rewind: "<:rewind:1286420458622812263>",
    forward: "<:emoji_16:1567893676397437021>",
    skip: "<:emoji_16:1567893676397437021>",
    stop: "<:emoji_19:1567893904609640498>",
    trash: "<:xieron_stolen_emoji_1793885713:1567895065999974511>",
    volUp: "<:emoji_17:1567893807192608768>",
    volDown: "<:emoji_20:1567894016354291793>",
    list: "<:emoji_2:1567877836780601475>",
    info: "<:emoji_3:1567877907211091969>",
    music: "<:emoji_4:1567877974995247115>",
    warn: "<:emoji_10:1567883315300671528>",
    home: "<:home:1305038165391704177>",
    globe: "<:xieron_stolen_emoji_1793889537:1567911104103841922>",
    slash: "<a:xieron_stolen_emoji_1793889523:1567911047074021450>",
    ping: "<:xieron_stolen_emoji_1793889508:1567910981940813845>",
    question: "<:question:1305038160962785352>",
    pencil: "<:emoji_1:1567877767507476591>",
    think: "<a:think:1383156714404188260>",
    heart: "<:heart:1390394352416723045>",
    folder: "<:emoji_5:1567878071845916722>",

	// NODE EMOJIS //
	nodeOn: "<:g_:1286428522084306955>",
	nodeOff: "<:r_:1286428524051304528>",
} as const;

export type EmojiConfig = typeof emoji;
export type Emoji = keyof EmojiConfig;

/*
 * Soundy - A powerful music bot built with Seyfert and lavalink-client to play high quality music in your Discord server for free.
 
 * Credits:
 * - DEV by: Crystala
