import { LavalinkEventTypes } from "#soundy/types";
import { createLavalinkEvent, getDepth, sendNodeLog } from "#soundy/utils";

interface ConnectionError extends Error {
	code?: string;
}

export default createLavalinkEvent({
	name: "error",
	type: LavalinkEventTypes.Node,
	async run(client, node, error: ConnectionError) {
		client.logger.error(
			`[Music] Node ${node.id} has an error. Error: ${getDepth(error)}`,
		);

		try {
			await sendNodeLog(client, "error", node, error);
		} catch (webhookError) {
			client.logger.error(
				`[Music] Failed to send node error webhook: ${webhookError}`,
			);
		}

		if (!node.connected) {
			client.logger.warn(
				`[Music] Node ${node.id} disconnected, attempting to reconnect in 5s...`,
			);

			setTimeout(async () => {
				try {
					if (!node.connected) {
						await node.connect();
						client.logger.info(
							`[Music] Node ${node.id} reconnection attempt initiated`,
						);
					}
				} catch (reconnectError) {
					client.logger.error(
						`[Music] Node ${node.id} reconnection failed: ${reconnectError}`,
					);
				}
			}, 5000);
		}
	},
});
