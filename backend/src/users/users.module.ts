import { Module } from '@nestjs/common';
import { AwsModule } from '../aws/aws.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [AwsModule, TeamsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
