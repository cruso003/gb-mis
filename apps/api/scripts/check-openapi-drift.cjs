#!/usr/bin/env node
/**
 * Fail CI when the committed apps/api/openapi.json differs from the
 * spec generated from the live AppModule.
 *
 * Pre-condition: `pnpm --filter=@gb-mis/api build` has been run.
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-console */

const { readFileSync, existsSync } = require('fs');
const { resolve } = require('path');

const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');

const { AppModule } = require('../dist/app.module');

(async () => {
  const committedPath = resolve(__dirname, '../openapi.json');
  if (!existsSync(committedPath)) {
    console.error('openapi.json not found — run pnpm openapi:generate first');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
    logger: false,
    abortOnError: false,
  });
  app.setGlobalPrefix('v1');

  const config = new DocumentBuilder()
    .setTitle('GB MIS API')
    .setDescription('Gender-Based MIS — MOGCSP / LWEP')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const generated = JSON.stringify(document, null, 2) + '\n';
  const committed = readFileSync(committedPath, 'utf-8');

  if (generated !== committed) {
    console.error(
      'OpenAPI spec has drifted from committed openapi.json — run `pnpm openapi:generate` and commit the result',
    );
    process.exit(1);
  }

  console.log('OpenAPI spec is up to date');
  await app.close();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
