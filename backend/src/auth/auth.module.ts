import { Module } from '@nestjs/common';
import { AwsModule } from '../aws/aws.module';
import { CognitoJwtGuard } from './cognito-jwt.guard';
import { ManagerGuard } from './manager.guard';

@Module({
  imports: [AwsModule],
  providers: [CognitoJwtGuard, ManagerGuard],
  exports: [CognitoJwtGuard, ManagerGuard],
})
export class AuthModule {}
