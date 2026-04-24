"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const swagger_1 = require("@nestjs/swagger");
const fs_1 = require("fs");
const path_1 = require("path");
const app_module_1 = require("../src/app.module");
async function bootstrap() {
    const committedPath = (0, path_1.resolve)(__dirname, '../openapi.json');
    if (!(0, fs_1.existsSync)(committedPath)) {
        console.error('openapi.json not found — run pnpm openapi:generate first');
        process.exit(1);
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter(), { logger: false });
    app.setGlobalPrefix('v1');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('GB MIS API')
        .setDescription('Gender-Based MIS — MOGCSP / LWEP')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    const generated = JSON.stringify(document, null, 2);
    const committed = (0, fs_1.readFileSync)(committedPath, 'utf-8');
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
//# sourceMappingURL=check-openapi-drift.js.map