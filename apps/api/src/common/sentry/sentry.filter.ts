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

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const body =
      typeof exceptionResponse === "object" && exceptionResponse !== null
        ? exceptionResponse
        : {
            statusCode: status,
            message:
              typeof exceptionResponse === "string"
                ? exceptionResponse
                : "Internal server error",
            path: request?.url,
            timestamp: new Date().toISOString(),
          };

    response.status(status).json(body);
  }
}
