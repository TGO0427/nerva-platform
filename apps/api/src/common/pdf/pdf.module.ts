import { Module, Global } from '@nestjs/common';
import { TenantProfileService } from './tenant-profile.service';

@Global()
@Module({
  providers: [TenantProfileService],
  exports: [TenantProfileService],
})
export class PdfHelpersModule {}
