import { Controller, Get } from '@nestjs/common';
import { TeamsService } from './teams.service';

@Controller('public/teams')
export class PublicTeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  findOptions() {
    return this.teamsService.findOptions();
  }
}
