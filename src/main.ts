import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
// import { SeedService } from './seeds/seed.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  // const seedService = app.get(SeedService);
  // await seedService.createSeed(); // Ejecuta el seed

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
