import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from './auth-user.type';
import { requireManager } from './authorization.helper';

type RequestWithUser = Request & {
  user?: AuthUser;
};

@Injectable()
export class ManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user || !requireManager(request.user)) {
      throw new ForbiddenException('Manager role is required');
    }

    return true;
  }
}
