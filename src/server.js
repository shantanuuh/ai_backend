import http from "http";
import dotenv from "dotenv";
import logger from "./utils/logger.js";
import { setupWebSocketServer } from "./websocket/server.js";

// Load environment variables early
dotenv.config();

const PORT = process.env.PORT || 3000;

// Set up basic HTTP Server (useful for Render health checks)
const server = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ status: "ok", message: "AI Voice Backend healthy" }));
    }
    
    if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        return res.end("AI Voice WebSocket Server is Running.");
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
});

// Attach WebSocket functionality (shares the same network port)
setupWebSocketServer(server);

// Boot up
server.listen(PORT, () => {
    logger.info(`Server initialized.`);
    logger.info(`HTTP running on http://localhost:${PORT}`);
    logger.info(`WebSocket ready on ws://localhost:${PORT}`);
});

// Handling termination signals safely for Render deployments
process.on("SIGTERM", () => {
    logger.info("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
        logger.info("Server closed successfully.");
        process.exit(0);
    });
});

process.on("SIGINT", () => {
    logger.info("SIGINT received. Shutting down gracefully...");
    server.close(() => {
        logger.info("Server closed successfully.");
        process.exit(0);
    });
});

// Catch-all to prevent server crashes on untrapped exceptions inside promises
process.on("unhandledRejection", (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});
process.on("uncaughtException", (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    // Optional: could exit here, but normally kept alive unless state is totally corrupt
});
