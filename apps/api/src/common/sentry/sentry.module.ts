import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Sentry from "@sentry/nestjs";

@Module({})
export class SentryModule implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get<string>("SENTRY_DSN");

    if (!dsn) {
      return;
    }

    const environment = this.configService.get<string>("NODE_ENV") || "development";
    const isProduction = environment === "production";

    Sentry.init({
      dsn,
      environment,
      tracesSampleRate: isProduction ? 0.1 : 1.0,
    });
  }
}
