import type { MiddlewareConsumer, NestModule} from '@nestjs/common';
import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule, PrismaHealthIndicator } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';


import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { RlsMiddleware } from './modules/auth/rls.middleware';
import { BeneficiariesModule } from './modules/beneficiaries/beneficiaries.module';
import { CasesModule } from './modules/cases/cases.module';
import { DatasetsModule } from './modules/datasets/datasets.module';
import { HealthController } from './modules/health/health.controller';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { OrgUnitsModule } from './modules/orgunits/orgunits.module';
import { PublicModule } from './modules/public/public.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SyncModule } from './modules/sync/sync.module';
import { UsersModule } from './modules/users/users.module';
import { VslaModule } from './modules/vsla/vsla.module';

@Module({
  imports: [
    // Config — loads .env and validates required vars
    ConfigModule.forRoot({ isGlobal: true }),

    // Structured JSON logging — one line per request
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            level: config.get<string>('LOG_LEVEL', 'info'),
            ...(isProduction
              ? {}
              : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
            redact: [
              'req.headers.authorization',
              'req.body.nationalId',
              'req.body.fullName',
              'req.body.phoneNumber',
              'res.body.nationalId',
              'res.body.fullName',
            ],
          },
        };
      },
    }),

    // Scheduled tasks (nightly audit chain verification, etc.)
    ScheduleModule.forRoot(),

    // Health checks
    TerminusModule,

    // Domain modules
    AuthModule,
    UsersModule,
    OrgUnitsModule,
    DatasetsModule,
    PublicModule,
    CasesModule,
    BeneficiariesModule,
    IndicatorsModule,
    ReportsModule,
    SessionsModule,
    VslaModule,
    AuditModule,
    SyncModule,
  ],
  controllers: [HealthController],
  providers: [RlsMiddleware, PrismaHealthIndicator],
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
