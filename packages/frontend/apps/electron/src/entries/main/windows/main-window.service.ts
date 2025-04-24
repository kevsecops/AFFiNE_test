import { join } from 'node:path';

import { Injectable, type LoggerService } from '@nestjs/common';
import { BrowserWindow, nativeTheme } from 'electron';
import electronWindowState from 'electron-window-state';
import { BehaviorSubject } from 'rxjs';

import { isLinux, isMacOS, isWindows, resourcesPath } from './utils';

const IS_DEV: boolean =
  process.env.NODE_ENV === 'development' && !process.env.CI;

function closeAllWindows() {
  BrowserWindow.getAllWindows().forEach(w => {
    if (!w.isDestroyed()) {
      w.destroy();
    }
  });
}

@Injectable()
export class MainWindowService {
  mainWindowReady: Promise<BrowserWindow> | undefined;
  mainWindow$ = new BehaviorSubject<BrowserWindow | undefined>(undefined);
  private hiddenMacWindow: BrowserWindow | undefined;

  constructor(private readonly logger: LoggerService) {}

  get mainWindow() {
    return this.mainWindow$.value;
  }

  private preventMacAppQuit() {
    if (!this.hiddenMacWindow && isMacOS()) {
      this.hiddenMacWindow = new BrowserWindow({
        show: false,
        width: 100,
        height: 100,
      });
      this.hiddenMacWindow.on('close', () => {
        this.cleanupWindows();
      });
    }
  }

  private cleanupWindows() {
    closeAllWindows();
    this.mainWindowReady = undefined;
    this.mainWindow$.next(undefined);
    this.hiddenMacWindow?.destroy();
    this.hiddenMacWindow = undefined;
  }

  private async createMainWindow() {
    this.logger.log('create window', 'MainWindowService');
    const mainWindowState = electronWindowState({
      defaultWidth: 1000,
      defaultHeight: 800,
    });

    const browserWindow = new BrowserWindow({
      titleBarStyle: isMacOS()
        ? 'hiddenInset'
        : isWindows()
          ? 'hidden'
          : 'default',
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      autoHideMenuBar: isLinux(),
      minWidth: 640,
      minHeight: 480,
      visualEffectState: 'active',
      vibrancy: 'under-window',
      height: mainWindowState.height,
      show: false, // Use 'ready-to-show' event to show window
      webPreferences: {
        webgl: true,
        contextIsolation: true,
        sandbox: false,
      },
    });

    if (isLinux()) {
      browserWindow.setIcon(join(resourcesPath, `icons/icon_64x64.png`));
    }

    nativeTheme.themeSource = 'light';
    mainWindowState.manage(browserWindow);

    this.bindEvents(browserWindow);
    return browserWindow;
  }

  private bindEvents(mainWindow: BrowserWindow) {
    mainWindow.on('ready-to-show', () => {
      this.logger.log('main window is ready to show', 'MainWindowService');
    });

    mainWindow.on('close', e => {
      e.preventDefault();
      if (!isMacOS()) {
        closeAllWindows();
        this.mainWindowReady = undefined;
        this.mainWindow$.next(undefined);
      } else {
        // hide window on macOS
        if (mainWindow.isFullScreen()) {
          mainWindow.once('leave-full-screen', () => {
            mainWindow.hide();
          });
          mainWindow.setFullScreen(false);
        } else {
          mainWindow.hide();
        }
      }
    });

    const refreshBound = (timeout = 0) => {
      setTimeout(() => {
        if (mainWindow.isDestroyed()) return;
        const size = mainWindow.getSize();
        mainWindow.setSize(size[0] + 1, size[1] + 1);
        mainWindow.setSize(size[0], size[1]);
      }, timeout);
    };

    mainWindow.on('leave-full-screen', () => {
      refreshBound();
      refreshBound(1000);
    });
  }

  async ensureMainWindow(): Promise<BrowserWindow> {
    if (
      !this.mainWindowReady ||
      (await this.mainWindowReady.then(w => w.isDestroyed()))
    ) {
      this.mainWindowReady = this.createMainWindow();
      this.mainWindow$.next(await this.mainWindowReady);
      this.preventMacAppQuit();
    }
    return this.mainWindowReady;
  }

  async initAndShowMainWindow() {
    const mainWindow = await this.ensureMainWindow();

    if (IS_DEV) {
      // do not gain focus in dev mode
      mainWindow.showInactive();
    } else {
      mainWindow.show();
    }

    this.preventMacAppQuit();

    return mainWindow;
  }

  async getMainWindow() {
    return this.ensureMainWindow();
  }

  async showMainWindow() {
    const window = await this.getMainWindow();
    if (!window) return;
    if (window.isMinimized()) {
      window.restore();
    }
    window.focus();
  }
}
