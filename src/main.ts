import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule, utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonUtilities.format.nestLike('SpamMusic', {
              prettyPrint: true,
              colors: true,
            }),
          ),
        }),
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.Http({
          host: 'logs.collector.eu-01.cloud.solarwinds.com',
          path: '/v1/logs',
          ssl: true,
          headers: {
            Authorization: `Bearer fDK3DNFpJspyevqaNj8qev2rBzAML9Ha6eHt8G5tKbOZ8IQ5TM6RKNk4H_gy36q3lHXSct0`,
          },
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://spammusic.netlify.app',
      'https://app.riffvalley.es',
    ], // Especifica los dominios permitidos
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Métodos permitidos
    credentials: true, // Si necesitas enviar cookies
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina campos desconocidos
      forbidNonWhitelisted: true,
      transform: true, // convierte tipos (p.ej. strings a números/fechas)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // import { SeedService } from './seeds/seed.service';
  // const seedService = app.get(SeedService);
  // await seedService.createSeed(); // Ejecuta el seed

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
