import { join } from 'node:path';

// Platform detection utilities
export const isMacOS = () => {
  return process.platform === 'darwin';
};

export const isWindows = () => {
  return process.platform === 'win32';
};

export const isLinux = () => {
  return process.platform === 'linux';
};

// Resources path
export const resourcesPath = join(__dirname, `../../../../resources`);

// Window types
export type LaunchStage = 'main' | 'onboarding';
