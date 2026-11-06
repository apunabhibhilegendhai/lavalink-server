import { createEvent } from "seyfert";
import { broadcastUserVoiceStateUpdate } from "#soundy/api";
import { playerListener } from "#soundy/utils";

export default createEvent({
	data: { name: "voiceStateUpdate" },
	async run([newState, oldState], client): Promise<void> {
		await playerListener(client, newState, oldState);

		if (newState.userId) {
			broadcastUserVoiceStateUpdate(
				client,
				newState.userId,
				newState.guildId || null,
				newState.channelId || null,
			);
		}
	},
});
