import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Descarta cualquier campo que no esté declarado en el DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors();
  await app.listen(3000, '0.0.0.0'); // Con 0.0.0.0 el servidor escuchará en todas las interfaces de red
}
bootstrap();
