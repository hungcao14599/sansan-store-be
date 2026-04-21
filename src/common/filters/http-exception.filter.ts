import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      response.status(status).json({
        statusCode: status,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as { message?: string | string[] }).message ??
              exception.message,
        error:
          typeof exceptionResponse === 'string'
            ? exception.name
            : (exceptionResponse as { error?: string }).error ?? exception.name,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const status =
        exception.code === 'P2002'
          ? HttpStatus.CONFLICT
          : exception.code === 'P2025'
            ? HttpStatus.NOT_FOUND
            : HttpStatus.BAD_REQUEST;

      response.status(status).json({
        statusCode: status,
        message: exception.message,
        error: 'PrismaClientKnownRequestError',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.message : 'Unexpected exception',
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
      timestamp: new Date().toISOString(),
    });
  }
}
