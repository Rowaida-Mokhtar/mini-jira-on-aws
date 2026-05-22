import { SNSClient } from '@aws-sdk/client-sns';
import { Provider } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { SNS_CLIENT } from './aws.constants';

export const snsClientProvider: Provider = {
  provide: SNS_CLIENT,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService) =>
    new SNSClient({
      region: config.awsRegion,
    }),
};
