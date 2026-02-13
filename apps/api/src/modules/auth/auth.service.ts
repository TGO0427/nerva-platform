import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  displayName: string;
  permissions: string[];
  userType: 'internal' | 'customer' | 'driver';
  customerId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    tenantId: string;
    userType: 'internal' | 'customer' | 'driver';
    customerId: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async debugDb() {
    // Find the actual tenant
    const allUsers = await this.usersService.findByEmail(
      'e28898d1-6466-4f36-8d56-3e8f0cad68b2', 'admin@demo.com'
    );
    // Try to find admin by iterating known approaches
    let adminUser = allUsers;
    let tenantId = 'unknown';
    if (!adminUser) {
      // The tenant ID might be different — check via raw query
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      const tenantRes = await pool.query("SELECT id FROM tenants LIMIT 1");
      if (tenantRes.rows.length > 0) {
        tenantId = tenantRes.rows[0].id;
        const userRes = await pool.query("SELECT email, user_type FROM users WHERE tenant_id = $1", [tenantId]);
        await pool.end();
        return { tenantId, users: userRes.rows };
      }
      await pool.end();
    }
    return {
      tenantId: 'e28898d1-6466-4f36-8d56-3e8f0cad68b2',
      adminExists: !!adminUser,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.tenantId, dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
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
        'Password must be at least 8 characters long',
      );
    }
    return argon2.hash(password);
  }

  async getUserSites(userId: string) {
    return this.usersService.getUserSites(userId);
  }
}
