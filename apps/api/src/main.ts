import 'reflect-metadata';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  // Structured logging via nestjs-pino
  app.useLogger(app.get(Logger));

  // Global exception filter — uniform error shape for all unhandled exceptions
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors — audit + request logging
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new LoggingInterceptor(), new AuditInterceptor(reflector));

  // API versioning — all routes live under /v1/
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global validation pipe — enforces class-validator DTOs at every endpoint
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS — tighten in production to the web app origin
  app.enableCors({
    origin: process.env['API_CORS_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  // OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GB MIS API')
    .setDescription(
      'Gender-Based Management Information System for MOGCSP / LWEP — World Bank IDA funded.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addTag('health', 'Service health checks')
    .addTag('auth', 'Authentication and session management')
    .addTag('users', 'User and role management')
    .addTag('orgunits', 'Organisation unit hierarchy')
    .addTag('cases', 'GBV case management')
    .addTag('beneficiaries', 'Beneficiary lifecycle')
    .addTag('indicators', 'Gender equality indicators')
    .addTag('reports', 'Report generation')
    .addTag('audit', 'Audit log review')
    .addTag('sync', 'Mobile offline sync protocol')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env['API_PORT'] ?? 4000;
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`GB MIS API listening on :${port}`);
  logger.log(`OpenAPI docs at http://localhost:${port}/api-docs`);
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
