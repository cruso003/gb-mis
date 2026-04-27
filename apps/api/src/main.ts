// Instrumentation must be the FIRST import — it installs OpenTelemetry's
// module-loader hooks before any other module is loaded. See
// apps/api/src/instrumentation.ts for the full rationale.
import './instrumentation';

import 'reflect-metadata';

import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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

  // Security headers (Helmet). Closes hardening-checklist E1.
  // CSP defaults are strict: no inline scripts/styles, no eval, no remote
  // origins. Swagger UI runs at /api-docs and needs slightly looser CSP —
  // it is exposed only on staging per docs/pen-test/scope-and-roe.md.
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        scriptSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:'],
        connectSrc: [`'self'`],
        fontSrc: [`'self'`],
        objectSrc: [`'none'`],
        frameAncestors: [`'none'`],
        baseUri: [`'self'`],
        formAction: [`'self'`],
      },
    },
    crossOriginEmbedderPolicy: false, // required for Swagger UI assets
    strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'no-referrer' },
  });

  // Rate limiting (defence in depth — edge limits at NGINX still apply).
  // Closes hardening-checklist F2. Tighter limits on auth and sync routes
  // are configured per-route via the plugin's `config.rateLimit` hook
  // where needed; the health endpoints are polled by the load balancer
  // (~12 hits/minute) so they sit comfortably under the global default.
  await app.register(rateLimit, {
    global: true,
    max: Number(process.env['API_RATE_LIMIT_MAX'] ?? 300),
    timeWindow: process.env['API_RATE_LIMIT_WINDOW'] ?? '1 minute',
    // Use the authenticated user ID when present, falling back to IP.
    keyGenerator: (req) => {
      const user = (req as unknown as { user?: { id?: string } }).user;
      return user?.id ?? req.ip ?? 'anonymous';
    },
    addHeadersOnExceeding: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });

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
