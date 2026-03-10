import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

const customFormat = printf(({ level, message, timestamp, ...meta }) => {
    let logMsg = `[${timestamp}] ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
        logMsg += ` ${JSON.stringify(meta)}`;
    }
    return logMsg;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        customFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                customFormat
            )
        })
    ]
});

export default logger;
