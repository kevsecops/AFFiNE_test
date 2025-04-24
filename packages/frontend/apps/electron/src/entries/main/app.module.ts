import { Module, type OnModuleInit } from '@nestjs/common';

import { LoggerModule } from './logger';
import { WindowsModule } from './windows/windows.module';

@Module({
  imports: [WindowsModule, LoggerModule],
})
export class AppModule implements OnModuleInit {
  onModuleInit() {}
}
