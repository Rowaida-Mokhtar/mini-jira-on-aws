import {
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AssignUserTeamDto } from './dto/assign-user-team.dto';
import { UsersService } from './users.service';

@UseGuards(CognitoJwtGuard)
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post('me')
  async upsertMe(@CurrentUser() user: AuthUser | undefined) {
    const authUser = this.requireAuthUser(user);

    try {
      return await this.usersService.upsertMe(authUser);
    } catch (error) {
      this.logUserProfileError('POST /users/me', authUser, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        this.getSafeProfileErrorMessage(error, 'sync'),
      );
    }
  }

  @Get('me')
  async findMe(@CurrentUser() user: AuthUser | undefined) {
    const authUser = this.requireAuthUser(user);

    try {
      return await this.usersService.findMe(authUser);
    } catch (error) {
      this.logUserProfileError('GET /users/me', authUser, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        this.getSafeProfileErrorMessage(error, 'load'),
      );
    }
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser | undefined) {
    return this.usersService.findAll(this.requireAuthUser(user));
  }

  @Patch(':id/team')
  assignTeam(
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: AssignUserTeamDto,
  ) {
    return this.usersService.assignTeam(
      this.requireAuthUser(user),
      id,
      dto.teamId,
    );
  }

  private requireAuthUser(user: AuthUser | undefined): AuthUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user context is missing');
    }

    return user;
  }

  private logUserProfileError(
    route: string,
    user: AuthUser,
    error: unknown,
  ): void {
    const awsError = this.getAwsErrorDetails(error);
    const message = error instanceof Error ? error.message : String(error);

    this.logger.error(
      `${route} failed for user ${user.userId}`,
      JSON.stringify({
        email: user.email,
        role: user.role,
        hasTeamId: Boolean(user.teamId),
        errorName: error instanceof Error ? error.name : undefined,
        message,
        awsError,
      }),
    );
  }

  private getSafeProfileErrorMessage(error: unknown, action: 'load' | 'sync') {
    if (this.getAwsErrorDetails(error).code === 'AccessDeniedException') {
      return `Unable to ${action} user profile because the backend cannot access MiniJiraUsers`;
    }

    return `Unable to ${action} user profile`;
  }

  private getAwsErrorDetails(error: unknown): {
    code?: string;
    statusCode?: number;
    requestId?: string;
  } {
    const candidate = error as {
      name?: string;
      Code?: string;
      code?: string;
      $metadata?: {
        httpStatusCode?: number;
        requestId?: string;
      };
    };

    return {
      code: candidate.name || candidate.Code || candidate.code,
      statusCode: candidate.$metadata?.httpStatusCode,
      requestId: candidate.$metadata?.requestId,
    };
  }
}
