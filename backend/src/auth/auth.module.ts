import { Module } from '@nestjs/common';
import { CognitoJwtGuard } from './cognito-jwt.guard';
import { ManagerGuard } from './manager.guard';

@Module({
  providers: [CognitoJwtGuard, ManagerGuard],
  exports: [CognitoJwtGuard, ManagerGuard],
})
export class AuthModule {}
