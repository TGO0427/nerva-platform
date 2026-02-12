import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { TenantProfileService } from '../../common/pdf/tenant-profile.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantProfileService: TenantProfileService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and get JWT token' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: CurrentUserData) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      tenantId: user.tenantId,
      permissions: user.permissions,
    };
  }

  @Get('my-sites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sites assigned to current user' })
  async mySites(@CurrentUser() user: CurrentUserData) {
    return this.authService.getUserSites(user.id);
  }

  @Get('tenant-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get company profile for current tenant' })
  async getTenantProfile(@CurrentUser() user: CurrentUserData) {
    return this.tenantProfileService.getProfile(user.tenantId);
  }

  @Patch('tenant-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update company profile for current tenant' })
  async updateTenantProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() data: Record<string, string>,
  ) {
    return this.tenantProfileService.updateProfile(user.tenantId, data);
  }
}
