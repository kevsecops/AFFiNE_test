import { Injectable, type LoggerService } from '@nestjs/common';

@Injectable()
export class OnboardingService {
  constructor(private readonly logger: LoggerService) {
    this.logger.log('OnboardingService initialized', 'OnboardingService');
  }

  // Onboarding window functionality will be implemented here
}
