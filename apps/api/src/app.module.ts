import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';

import { RlsMiddleware } from './modules/auth/rls.middleware';

import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BeneficiariesModule } from './modules/beneficiaries/beneficiaries.module';
import { CasesModule } from './modules/cases/cases.module';
import { HealthController } from './modules/health/health.controller';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { OrgUnitsModule } from './modules/orgunits/orgunits.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SyncModule } from './modules/sync/sync.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // Config — loads .env and validates required vars
    ConfigModule.forRoot({ isGlobal: true }),

    // Structured JSON logging — one line per request
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', 'info'),
          transport:
            config.get('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          redact: [
            // Never log these fields — survivor safety
            'req.headers.authorization',
            'req.body.nationalId',
            'req.body.fullName',
            'req.body.phoneNumber',
            'res.body.nationalId',
            'res.body.fullName',
          ],
        },
      }),
    }),

    // Health checks
    TerminusModule,

    // Domain modules
    AuthModule,
    UsersModule,
    OrgUnitsModule,
    CasesModule,
    BeneficiariesModule,
    IndicatorsModule,
    ReportsModule,
    AuditModule,
    SyncModule,
  ],
  controllers: [HealthController],
  providers: [RlsMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Inject RLS session variables on all authenticated routes
    consumer
      .apply(RlsMiddleware)
      .exclude({ path: 'health', method: RequestMethod.ALL })
      .forRoutes('*');
  }
}
