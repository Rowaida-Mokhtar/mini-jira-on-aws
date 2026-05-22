import { Module } from '@nestjs/common';
import { AwsModule } from '../aws/aws.module';
import { PublicTeamsController } from './public-teams.controller';
import { TeamsController } from './teams.controller';
import { TeamsRepository } from './teams.repository';
import { TeamsService } from './teams.service';

@Module({
  imports: [AwsModule],
  controllers: [TeamsController, PublicTeamsController],
  providers: [TeamsService, TeamsRepository],
  exports: [TeamsService, TeamsRepository],
})
export class TeamsModule {}
