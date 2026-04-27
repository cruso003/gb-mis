#!/usr/bin/env node
/**
 * Generate apps/api/openapi.json from the running Nest app definition.
 *
 * Pre-condition: `pnpm --filter=@gb-mis/api build` has been run, so
 * dist/app.module.js exists. We require from dist/ rather than from
 * src/ because Nest's Swagger explorer needs `design:paramtypes`
 * metadata which only the TypeScript compiler emits — esbuild-based
 * transpilers (tsx, swc) drop it.
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-console */

const { writeFileSync } = require('fs');
const { resolve } = require('path');

const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');

const { AppModule } = require('../dist/app.module');

(async () => {
  // abortOnError: false keeps Nest from silently calling process.exit
  // when an internal error occurs during bootstrap.
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
  const outPath = resolve(__dirname, '../openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2) + '\n', 'utf-8');
  console.log(`OpenAPI spec written to ${outPath}`);
  await app.close();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
