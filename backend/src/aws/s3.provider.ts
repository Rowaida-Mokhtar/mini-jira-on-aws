import { S3Client } from '@aws-sdk/client-s3';
import { Provider } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { S3_CLIENT } from './aws.constants';

export const s3ClientProvider: Provider = {
  provide: S3_CLIENT,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService) =>
    new S3Client({
      region: config.awsRegion,
    }),
};
