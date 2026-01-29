import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Health check endpoint (no prefix)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/health', (_req: unknown, res: { json: (data: unknown) => void }) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Security
  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') || [
      'http://localhost:3000',
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

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nerva API')
    .setDescription('Nerva Platform Phase 1 MVP API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('master-data', 'Items, customers, suppliers')
    .addTag('inventory', 'Stock management, GRN, adjustments')
    .addTag('sales', 'Sales orders')
    .addTag('fulfilment', 'Pick, pack, ship')
    .addTag('dispatch', 'Trip planning and driver management')
    .addTag('returns', 'RMA and credit notes')
    .addTag('integrations', 'Finance system integrations')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('API_PORT') || 4000;
  await app.listen(port);

  console.log(`🚀 Nerva API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
