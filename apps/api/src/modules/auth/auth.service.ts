import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Pool } from "pg";
import * as argon2 from "argon2";
import { randomBytes } from "crypto";
import { DATABASE_POOL } from "../../common/db/database.module";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  displayName: string;
  permissions: string[];
  userType: "internal" | "customer" | "driver";
  customerId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    tenantId: string;
    userType: "internal" | "customer" | "driver";
    customerId: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.tenantId, dto.email);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is disabled");
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Get user permissions
    const permissions = await this.usersService.getUserPermissions(user.id);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      displayName: user.displayName,
      permissions,
      userType: user.userType,
      customerId: user.customerId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });
    const refreshToken = await this.generateRefreshToken(
      user.id,
      user.tenantId,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        tenantId: user.tenantId,
        userType: user.userType,
        customerId: user.customerId,
      },
    };
  }

  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    if (password.length < 8) {
      throw new BadRequestException(
        "Password must be at least 8 characters long",
      );
    }
    return argon2.hash(password);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const isCurrentValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!isCurrentValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    await this.usersService.update(userId, { password: dto.newPassword });
  }

  async getUserSites(userId: string) {
    return this.usersService.getUserSites(userId);
  }

  async generateRefreshToken(
    userId: string,
    tenantId: string,
  ): Promise<string> {
    const raw = randomBytes(40).toString("hex");
    const tokenHash = await argon2.hash(raw);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await this.pool.query(
      `INSERT INTO refresh_tokens (user_id, tenant_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, tenantId, tokenHash, expiresAt],
    );

    const tokenId = result.rows[0].id;
    return `${tokenId}.${raw}`;
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const dotIndex = refreshToken.indexOf(".");
    if (dotIndex === -1) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokenId = refreshToken.substring(0, dotIndex);
    const raw = refreshToken.substring(dotIndex + 1);

    const result = await this.pool.query(
      `SELECT id, user_id, tenant_id, token_hash, expires_at, revoked_at
       FROM refresh_tokens
       WHERE id = $1`,
      [tokenId],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const row = result.rows[0];

    if (row.revoked_at) {
      throw new UnauthorizedException("Refresh token has been revoked");
    }

    if (new Date(row.expires_at) < new Date()) {
      throw new UnauthorizedException("Refresh token has expired");
    }

    const isValid = await argon2.verify(row.token_hash, raw);
    if (!isValid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Revoke old token (rotation)
    await this.pool.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`,
      [tokenId],
    );

    // Get user and generate new tokens
    const user = await this.usersService.findById(row.user_id);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("User not found or disabled");
    }

    const permissions = await this.usersService.getUserPermissions(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      displayName: user.displayName,
      permissions,
      userType: user.userType,
      customerId: user.customerId,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: "15m" });
    const newRefreshToken = await this.generateRefreshToken(
      user.id,
      user.tenantId,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const dotIndex = refreshToken.indexOf(".");
    if (dotIndex === -1) return;

    const tokenId = refreshToken.substring(0, dotIndex);
    await this.pool.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
      [tokenId],
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  async logout(refreshToken: string): Promise<void> {
    await this.revokeRefreshToken(refreshToken);
  }

  async requestPasswordReset(
    tenantId: string,
    email: string,
  ): Promise<string | null> {
    const user = await this.usersService.findByEmail(tenantId, email);

    if (!user || !user.isActive) {
      // Don't reveal whether the user exists
      return null;
    }

    const raw = randomBytes(40).toString("hex");
    const tokenHash = await argon2.hash(raw);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const result = await this.pool.query(
      `INSERT INTO password_reset_tokens (user_id, tenant_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [user.id, tenantId, tokenHash, expiresAt],
    );

    const tokenId = result.rows[0].id;

    this.logger.log(
      `Password reset token created for user ${user.id} (token id: ${tokenId})`,
    );

    // Return composite token: id.rawToken
    return `${tokenId}.${raw}`;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) {
      throw new BadRequestException("Invalid reset token");
    }

    const tokenId = token.substring(0, dotIndex);
    const raw = token.substring(dotIndex + 1);

    const result = await this.pool.query(
      `SELECT id, user_id, token_hash, expires_at, used_at
       FROM password_reset_tokens
       WHERE id = $1`,
      [tokenId],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const row = result.rows[0];

    if (row.used_at) {
      throw new BadRequestException("Reset token has already been used");
    }

    if (new Date(row.expires_at) < new Date()) {
      throw new BadRequestException("Reset token has expired");
    }

    const isValid = await argon2.verify(row.token_hash, raw);
    if (!isValid) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // Update the user's password
    await this.usersService.update(row.user_id, { password: newPassword });

    // Mark token as used
    await this.pool.query(
      `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
      [tokenId],
    );

    // Revoke all refresh tokens for this user (force re-login)
    await this.revokeAllUserTokens(row.user_id);

    this.logger.log(
      `Password reset completed for user ${row.user_id} (token id: ${tokenId})`,
    );
  }
}
