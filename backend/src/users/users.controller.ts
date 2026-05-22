import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';

@UseGuards(CognitoJwtGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('me')
  upsertMe(@CurrentUser() user: AuthUser) {
    return this.usersService.upsertMe(user);
  }

  @Get('me')
  findMe(@CurrentUser() user: AuthUser) {
    return this.usersService.findMe(user);
  }
}
