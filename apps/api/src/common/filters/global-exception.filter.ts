import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import type { ApiError } from '@gb-mis/types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const { status, body } = this.resolve(exception, request);

    if (status >= 500) {
      this.logger.error(
        { err: exception, path: request.url, method: request.method },
        'Unhandled exception',
      );
    }

    void reply.status(status).send(body);
  }

  private resolve(
    exception: unknown,
    request: FastifyRequest,
  ): { status: number; body: ApiError } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message =
        typeof raw === 'string'
          ? raw
          : (raw as Record<string, unknown>)['message']?.toString() ?? exception.message;

      return {
        status,
        body: {
          error: exception.name,
          message,
          statusCode: status,
          path: request.url,
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        body: {
          error: 'ValidationError',
          message: 'Request body failed schema validation',
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          path: request.url,
          timestamp: new Date().toISOString(),
          details: exception.issues,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
