import { Global, Logger, Module } from '@nestjs/common';

import { createLoggerService } from '../../../logger';

export const logger = createLoggerService('main');

@Global()
@Module({
  providers: [
    {
      provide: Logger,
      useValue: logger,
    },
  ],
  exports: [Logger],
})
export class LoggerModule {}
