import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = 3000;

  await app.listen(port, '0.0.0.0');

  console.log(`Server running on http://localhost:${port}`);
}

bootstrap();