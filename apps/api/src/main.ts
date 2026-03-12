import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require("helmet");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require("compression");
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { SentryExceptionFilter } from "./common/sentry/sentry.filter";
import { DATABASE_POOL } from "./common/db/database.module";
import { Pool } from "pg";

function validateEnv() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);
  const configService = app.get(ConfigService);
  const pool = app.get<Pool>(DATABASE_POOL);

  // Health check endpoint with DB connectivity check (no prefix)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get(
    "/health",
    async (
      _req: unknown,
      res: { status: (code: number) => { json: (data: unknown) => void } },
    ) => {
      try {
        await pool.query("SELECT 1");
        res.status(200).json({
          status: "ok",
          timestamp: new Date().toISOString(),
          database: "connected",
        });
      } catch {
        res.status(503).json({
          status: "degraded",
          timestamp: new Date().toISOString(),
          database: "disconnected",
        });
      }
    },
  );

  // Compression
  app.use(compression());

  // Body size limits
  app.use(json({ limit: "10mb" }));
  app.use(urlencoded({ extended: true, limit: "10mb" }));

  // Security
  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>("CORS_ORIGINS")?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Sentry error tracking (must be registered before other exception filters)
  app.useGlobalFilters(new SentryExceptionFilter());

  // API prefix
  app.setGlobalPrefix("api/v1");

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Nerva API")
    .setDescription("Nerva Platform Phase 1 MVP API")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("auth", "Authentication endpoints")
    .addTag("users", "User management")
    .addTag("master-data", "Items, customers, suppliers")
    .addTag("inventory", "Stock management, GRN, adjustments")
    .addTag("sales", "Sales orders")
    .addTag("fulfilment", "Pick, pack, ship")
    .addTag("dispatch", "Trip planning and driver management")
    .addTag("returns", "RMA and credit notes")
    .addTag("integrations", "Finance system integrations")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = configService.get<number>("API_PORT") || 4000;
  await app.listen(port);

  logger.log(`Nerva API running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
