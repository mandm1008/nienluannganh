import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve();

const logDir = path.join(rootDir, 'logs');
const logFile = path.join(logDir, 'app.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function stripAnsiCodes(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function formatMessage(type, args) {
  const timestamp = new Date().toISOString();

  const formattedArgs = args.map((arg) => {
    try {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg, null, 2);
      } else {
        return String(arg);
      }
    } catch {
      return '[Unserializable Object]';
    }
  });

  const raw = formattedArgs.join(' ');
  const cleanMessage = stripAnsiCodes(raw);

  return `[${type} ${timestamp}]\n${cleanMessage}\n`;
}

export function overrideConsole() {
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  ['log', 'info', 'warn', 'error'].forEach((method) => {
    console[method] = (...args) => {
      const message = formatMessage(method.toUpperCase(), args);
      logStream.write(message);
      original[method].apply(console, args);
    };
  });
}
