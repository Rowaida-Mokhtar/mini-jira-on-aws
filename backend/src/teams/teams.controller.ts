import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateTeamDto } from './dto/create-team.dto';
import { TeamsService } from './teams.service';

@UseGuards(CognitoJwtGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.teamsService.findAll(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(user, dto);
  }
}
