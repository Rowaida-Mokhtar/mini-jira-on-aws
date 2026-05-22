import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

const CLOUDFRONT_API_PREFIX = '/api/backend';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

  app.use(stripCloudFrontApiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(config.port, '0.0.0.0');
}
bootstrap();

function stripCloudFrontApiPrefix(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  if (
    request.url === CLOUDFRONT_API_PREFIX ||
    request.url.startsWith(`${CLOUDFRONT_API_PREFIX}/`) ||
    request.url.startsWith(`${CLOUDFRONT_API_PREFIX}?`)
  ) {
    request.url = request.url.slice(CLOUDFRONT_API_PREFIX.length) || '/';
  }

  next();
}
