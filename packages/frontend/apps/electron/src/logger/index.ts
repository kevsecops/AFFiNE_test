import type { LoggerService } from '@nestjs/common';
import { app, shell } from 'electron';
import type { LogFunctions } from 'electron-log';
import log from 'electron-log/main';

// Initialize electron-log (only once)
log.initialize({ preload: false });
log.transports.file.level = 'info';
log.transports.console.level = 'info';

export function getLogFilePath() {
  return log.transports.file.getFile().path;
}

export async function revealLogFile() {
  const filePath = getLogFilePath();
  return await shell.openPath(filePath);
}

app.on('before-quit', () => {
  log.transports.console.level = false;
});

export function createLoggerService(
  scope: string
): LoggerService & LogFunctions {
  return log.scope(scope);
}
