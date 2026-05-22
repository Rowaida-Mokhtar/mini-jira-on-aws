import { Module } from '@nestjs/common';
import { AwsModule } from '../aws/aws.module';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogRepository } from './activity-log.repository';
import { ActivityLogService } from './activity-log.service';

@Module({
  imports: [AwsModule],
  controllers: [ActivityLogController],
  providers: [ActivityLogService, ActivityLogRepository],
  exports: [ActivityLogService, ActivityLogRepository],
})
export class ActivityLogModule {}
