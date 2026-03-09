import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only capture 5xx server errors to Sentry (skip 4xx client errors)
    if (status >= 500) {
      Sentry.captureException(exception);
    }

    // Re-throw so the existing GlobalExceptionFilter handles the response
    throw exception;
  }
}
