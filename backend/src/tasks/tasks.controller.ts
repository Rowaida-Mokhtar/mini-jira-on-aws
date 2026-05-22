import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { AuthUser } from '../auth/auth-user.type';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';
import type { UploadedTaskImageFile } from './tasks.service';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const IMAGE_FILE_PIPE = new ParseFilePipe({
  fileIsRequired: true,
  validators: [
    new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE_BYTES }),
    new FileTypeValidator({ fileType: /^image\/(png|jpeg|webp)$/ }),
  ],
  exceptionFactory: (error) => new BadRequestException(error),
});

@UseGuards(CognitoJwtGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.tasksService.findAll(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.findOne(user, id);
  }

  @Post(':taskId/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_IMAGE_SIZE_BYTES,
      },
    }),
  )
  uploadImage(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
    @UploadedFile(IMAGE_FILE_PIPE) file: UploadedTaskImageFile,
  ) {
    return this.tasksService.uploadImage(user, taskId, file);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.delete(user, id);
  }

  @Delete(':taskId/image')
  deleteImage(@CurrentUser() user: AuthUser, @Param('taskId') taskId: string) {
    return this.tasksService.deleteImage(user, taskId);
  }
}
