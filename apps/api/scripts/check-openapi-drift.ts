import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { AppModule } from '../src/app.module';

async function bootstrap() {
  const committedPath = resolve(__dirname, '../openapi.json');
  if (!existsSync(committedPath)) {
    console.error('openapi.json not found — run pnpm openapi:generate first');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, new FastifyAdapter(), { logger: false });
  app.setGlobalPrefix('v1');

  const config = new DocumentBuilder()
    .setTitle('GB MIS API')
    .setDescription('Gender-Based MIS — MOGCSP / LWEP')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const generated = JSON.stringify(document, null, 2);
  const committed = readFileSync(committedPath, 'utf-8');

  if (generated !== committed) {
    console.error('OpenAPI spec has drifted from committed openapi.json — run pnpm openapi:generate and commit the result');
    process.exit(1);
  }

  console.log('OpenAPI spec is up to date');
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
