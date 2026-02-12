import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Core modules
import { DatabaseModule } from './common/db/database.module';
import { PdfHelpersModule } from './common/pdf/pdf.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { MasterDataModule } from './modules/masterdata/masterdata.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { FulfilmentModule } from './modules/fulfilment/fulfilment.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AuditModule } from './modules/audit/audit.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
      },
    ]),

    // Database
    DatabaseModule,

    // Shared modules
    PdfHelpersModule,

    // Feature modules
    AuthModule,
    RbacModule,
    TenantsModule,
    UsersModule,
    MasterDataModule,
    InventoryModule,
    SalesModule,
    FulfilmentModule,
    DispatchModule,
    ReturnsModule,
    IntegrationsModule,
    AuditModule,
    ManufacturingModule,
    InvoicingModule,
  ],
})
export class AppModule {}
