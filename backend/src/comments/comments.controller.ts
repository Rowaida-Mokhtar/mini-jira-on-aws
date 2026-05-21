import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@UseGuards(CognitoJwtGuard)
@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(user, taskId, dto);
  }

  @Get()
  findByTaskId(@CurrentUser() user: AuthUser, @Param('taskId') taskId: string) {
    return this.commentsService.findByTaskId(user, taskId);
  }
}
