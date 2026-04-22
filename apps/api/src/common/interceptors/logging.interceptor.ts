import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';

import type { AuthenticatedUser } from '../types/authenticated-user';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();

    const { method, url } = req;
    const userId = req.user?.id ?? 'anonymous';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`${method} ${url} ${ms}ms user=${userId}`);
        },
        error: () => {
          const ms = Date.now() - start;
          this.logger.warn(`${method} ${url} ${ms}ms user=${userId} [error]`);
        },
      }),
    );
  }
}
