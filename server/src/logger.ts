import { createLogger, format, transports } from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom format to include timestamp, log level, and message
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack }) => {
    const fileName = (new Error().stack || '').split('\n')[3]?.trim() || 'Unknown file';
    return `${timestamp} [${level.toUpperCase()}] [${fileName}] - ${stack || message}`;
  })
);

const logger = createLogger({
  level: 'info',
  format: customFormat,
  transports: [
    // Log to a file
    new transports.File({
      filename: path.join(__dirname, '../logs/server.log'),
      level: 'info',
    }),
    // Log errors to a separate file
    new transports.File({
      filename: path.join(__dirname, '../logs/errors.log'),
      level: 'error',
    }),
    // Log to console with colorization in development mode
    new transports.Console({
      format: format.combine(format.colorize(), customFormat),
    }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(__dirname, '../logs/exceptions.log') }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(__dirname, '../logs/rejections.log') }),
  ],
});

export default logger;
