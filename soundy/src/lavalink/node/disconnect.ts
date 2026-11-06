import { LavalinkEventTypes } from "#soundy/types";
import { createLavalinkEvent, sendNodeLog } from "#soundy/utils";

export default createLavalinkEvent({
	name: "disconnect",
	type: LavalinkEventTypes.Node,
	async run(client, node) {
		const nodeType = node.isNodeLink() ? "NodeLink" : "Lavalink";
		client.logger.info(`[Music] Node ${node.id} (${nodeType}) Disconnected`);
		await sendNodeLog(client, "disconnected", node).catch((err) =>
			client.logger.error(
				`[Music] Failed to send node disconnect webhook: ${err}`,
			),
		);
		// Handle node failover for active players
		const playersOnNode = Array.from(client.manager.players.values()).filter(
			(player) => player.node?.id === node.id,
		);

		if (playersOnNode.length > 0) {
			const availableNodes = Array.from(
				client.manager.nodeManager.nodes.values(),
			).filter((n) => n.id !== node.id && n.connected);

			if (availableNodes.length > 0) {
				const fallbackNode = availableNodes[0];
				if (fallbackNode) {
					client.logger.info(
						`[Music] Migrating ${playersOnNode.length} player(s) from node ${node.id} to ${fallbackNode.id}`,
					);
					for (const player of playersOnNode) {
						try {
							await player.changeNode(fallbackNode);
						} catch (err) {
							client.logger.error(
								`[Music] Failed to migrate player in guild ${player.guildId}: ${err}`,
							);
						}
					}
				}
			} else {
				client.logger.warn(
					`[Music] Node ${node.id} disconnected but no fallback nodes are online!`,
				);
			}
		}
	},
});
