import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyMfaDto, LoginMfaDto } from "./dto/mfa.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import {
  CurrentUser,
  CurrentUserData,
} from "../../common/decorators/current-user.decorator";
import { TenantProfileService } from "../../common/pdf/tenant-profile.service";
import { UpdateTenantProfileDto } from "./dto/update-tenant-profile.dto";
import { GdprService } from "../users/gdpr.service";
import { DeleteAccountDto } from "../users/dto/gdpr.dto";
import { UsersService } from "../users/users.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantProfileService: TenantProfileService,
    private readonly gdprService: GdprService,
    private readonly usersService: UsersService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: "Authenticate user and get JWT token" })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: "Request a password reset email" })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(dto.tenantId, dto.email);

    return {
      message:
        "If an account exists with that email, a password reset link has been sent.",
    };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: "Reset password using a reset token" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: "Password has been reset successfully." };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token using a refresh token" })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout and revoke refresh token" })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: "Logged out successfully" };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user" })
  async me(@CurrentUser() user: CurrentUserData) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      tenantId: user.tenantId,
      permissions: user.permissions,
      userType: user.userType,
      customerId: user.customerId,
    };
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change current user password" })
  async changePassword(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.id, dto);
    return { message: "Password changed successfully" };
  }

  @Get("my-sites")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get sites assigned to current user" })
  async mySites(@CurrentUser() user: CurrentUserData) {
    return this.authService.getUserSites(user.id);
  }

  @Get("tenant-profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get company profile for current tenant" })
  async getTenantProfile(@CurrentUser() user: CurrentUserData) {
    return this.tenantProfileService.getProfile(user.tenantId);
  }

  @Patch("tenant-profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update company profile for current tenant" })
  async updateTenantProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() data: UpdateTenantProfileDto,
  ) {
    return this.tenantProfileService.updateProfile(user.tenantId, data);
  }

  @Get("mfa/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current MFA status" })
  async mfaStatus(@CurrentUser() user: CurrentUserData) {
    return this.authService.getMfaStatus(user.id);
  }

  @Post("mfa/setup")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Generate TOTP secret and QR code for MFA setup" })
  async mfaSetup(@CurrentUser() user: CurrentUserData) {
    return this.authService.setupMfa(user.id);
  }

  @Post("mfa/enable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify TOTP code and enable MFA" })
  async mfaEnable(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: VerifyMfaDto,
  ) {
    await this.authService.enableMfa(user.id, dto.code);
    return { message: "MFA enabled successfully" };
  }

  @Post("mfa/disable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify TOTP code and disable MFA" })
  async mfaDisable(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: VerifyMfaDto,
  ) {
    await this.authService.disableMfa(user.id, dto.code);
    return { message: "MFA disabled successfully" };
  }

  @Post("mfa/verify")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: "Verify MFA code during login" })
  async mfaVerify(@Body() dto: LoginMfaDto) {
    return this.authService.verifyMfaLogin(dto.mfaToken, dto.code);
  }

  // ============ GDPR ============

  @Get("my-data")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Export all personal data (GDPR)" })
  async exportMyData(@CurrentUser() user: CurrentUserData) {
    const canExport = await this.gdprService.canExportData(
      user.id,
      user.tenantId,
    );
    if (!canExport) {
      throw new BadRequestException(
        "Data export is rate limited to once per hour. Please try again later.",
      );
    }

    return this.gdprService.exportUserData(user.id, user.tenantId);
  }

  @Get("my-data/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get last data export date" })
  async exportStatus(@CurrentUser() user: CurrentUserData) {
    const lastExport = await this.gdprService.getLastExportDate(
      user.id,
      user.tenantId,
    );
    return { lastExportDate: lastExport };
  }

  @Delete("my-account")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete own account (GDPR)" })
  async deleteMyAccount(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: DeleteAccountDto,
  ) {
    // Verify password before deletion
    const fullUser = await this.usersService.findById(user.id);
    if (!fullUser) {
      throw new UnauthorizedException("User not found");
    }

    const isPasswordValid = await argon2.verify(
      fullUser.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException("Incorrect password");
    }

    await this.gdprService.deleteUserData(user.id, user.tenantId);

    return { message: "Your account has been deleted successfully." };
  }
}
