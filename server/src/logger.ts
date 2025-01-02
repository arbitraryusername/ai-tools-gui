import { createLogger, format, transports } from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts the source file and line number by inspecting CallSite objects.
 */
function getSourceInfo(): string {
  // Temporarily store the original prepareStackTrace
  const originalPrepareStackTrace = Error.prepareStackTrace;
  
  // Override prepareStackTrace to capture CallSite objects
  Error.prepareStackTrace = (err, structuredStackTrace) => structuredStackTrace;
  
  const err = new Error();
  // Exclude this function call from the generated stack
  // so that the top of the stack is where `logger.info()` was actually invoked
  Error.captureStackTrace(err, getSourceInfo);

  // The stack is now a CallSite[]
  const callSites = err.stack as unknown as NodeJS.CallSite[];

  // Restore the original prepareStackTrace
  Error.prepareStackTrace = originalPrepareStackTrace;

  // Find the first stack frame that is outside node_modules and logger.ts
  for (const cs of callSites) {
    const fileName = cs.getFileName?.();
    if (
      fileName &&
      !fileName.includes('node_modules') &&
      !fileName.includes('logger.ts')
    ) {
      const lineNumber = cs.getLineNumber?.();
      const relativePath = path.relative(__dirname, fileName);
      return ` [${relativePath}:${lineNumber}] `;
    }
  }

  // If no relevant call site was found, return an empty string
  return '';
}

// Create a custom format that uses `getSourceInfo()` to show file and line number
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack }) => {
    const sourceInfo = getSourceInfo();
    return `${timestamp} [${level.toUpperCase()}] ${sourceInfo}- ${stack || message}`;
  }),
);

const logger = createLogger({
  level: 'debug',
  format: customFormat,
  transports: [
    // Log everything to a single file
    new transports.File({
      filename: path.join(__dirname, '../logs/server.log'),
      level: 'debug',
    }),
    // Log to console with colorization in development mode
    new transports.Console({
      format: format.combine(format.colorize(), customFormat),
    }),
  ],
  // Also handle uncaught exceptions and rejections in the same file
  exceptionHandlers: [
    new transports.File({ filename: path.join(__dirname, '../logs/server.log') }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(__dirname, '../logs/server.log') }),
  ],
});

export default logger;
