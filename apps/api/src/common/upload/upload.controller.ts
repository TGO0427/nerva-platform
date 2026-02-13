import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../decorators/current-user.decorator';
import { UploadService } from './upload.service';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presign')
  async presign(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { fileName: string; contentType: string; entityType: string },
  ) {
    return this.uploadService.getPresignedUploadUrl(
      user.tenantId,
      body.entityType,
      body.fileName,
      body.contentType,
    );
  }
}
