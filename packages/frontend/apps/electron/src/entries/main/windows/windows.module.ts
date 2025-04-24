import { Module } from '@nestjs/common';

import { ContextMenuService } from './context-menu.service';
import { CustomThemeWindowService } from './custom-theme-window.service';
import { MainWindowService } from './main-window.service';
import { OnboardingService } from './onboarding.service';
import { PopupService } from './popup.service';
import { TabViewsService } from './tab-views.service';
import { WindowsService } from './windows.service';

@Module({
  providers: [WindowsService, MainWindowService],
  exports: [WindowsService, MainWindowService],
})
export class WindowsModule {}
