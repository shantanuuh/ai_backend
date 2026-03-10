import { WebSocketServer } from "ws";
import logger from "../utils/logger.js";
import { VoiceSession } from "./session.js";

/**
 * Initializes and starts the WebSocket Server.
 * @param {import("http").Server} server The HTTP server to attach the WSS to.
 */
export function setupWebSocketServer(server) {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws, req) => {
        logger.info(`New connection attempt from ${req.socket.remoteAddress}`);
        
        // Ensure connection is alive by responding to pongs (Ping-Pong Heartbeat)
        ws.isAlive = true;
        ws.on("pong", () => {
            ws.isAlive = true;
        });

        // Instantiate a new voice handling session wrapper
        new VoiceSession(ws);
    });

    // Detect broken connections continuously to prevent memory leaks
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                logger.warn("Terminating stale/broken WebSocket client connection.");
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping(); // Send ping to client
        });
    }, 30000); // Check every 30 seconds

    wss.on("close", () => {
        clearInterval(interval);
        logger.info("WebSocket server closed.");
    });

    logger.info("WebSocket Server configured and ready.");
    return wss;
}
