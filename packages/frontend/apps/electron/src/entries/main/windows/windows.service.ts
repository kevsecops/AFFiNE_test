import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { app } from 'electron';

import { MainWindowService } from './main-window.service';

@Injectable()
export class WindowsService implements OnModuleInit {
  constructor(
    private readonly mainWindowService: MainWindowService,
    private readonly logger: Logger
  ) {}

  async onModuleInit() {
    await app.whenReady();
    this.logger.log('app is ready', 'WindowsService');
    await this.initializeMainWindow();
  }

  async initializeMainWindow() {
    return this.mainWindowService.initAndShowMainWindow();
  }

  async getMainWindow() {
    return this.mainWindowService.getMainWindow();
  }

  async showMainWindow() {
    return this.mainWindowService.showMainWindow();
  }
}
