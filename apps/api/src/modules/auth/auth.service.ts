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
    const { Pool } = require('pg');
    const argon2 = require('argon2');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const results: string[] = [];

    try {
      const tenantRes = await pool.query("SELECT id FROM tenants LIMIT 1");
      const tenantId = tenantRes.rows[0]?.id;
      if (!tenantId) return { error: 'No tenant found' };
      results.push('Tenant: ' + tenantId);

      // Run migration 015 inline
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'internal'");
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL");
      await pool.query("CREATE INDEX IF NOT EXISTS idx_users_customer ON users(customer_id)");
      await pool.query("CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(tenant_id, user_type)");
      results.push('Migration: user columns added');

      // Documents table
      await pool.query(`CREATE TABLE IF NOT EXISTS documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        entity_type text NOT NULL, entity_id uuid, file_name text NOT NULL, file_type text NOT NULL,
        file_size_bytes bigint, s3_key text NOT NULL, s3_bucket text NOT NULL,
        uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now())`);
      await pool.query("CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(tenant_id, entity_type, entity_id)");
      results.push('Migration: documents table created');

      // Portal + driver permissions
      const perms = [
        ['portal.orders.read','View own orders'],['portal.invoices.read','View own invoices'],
        ['portal.invoices.download','Download invoice PDFs'],['portal.pod.read','View POD'],
        ['portal.pod.download','Download POD docs'],['portal.tracking.read','Track deliveries'],
        ['portal.returns.create','Create returns'],['portal.returns.read','View returns'],
        ['driver.trips.read','View trips'],['driver.trips.start','Start trips'],
        ['driver.trips.complete','Complete trips'],['driver.stops.update','Update stops'],
        ['driver.pod.capture','Capture POD'],['driver.upload','Upload files']
      ];
      for (const [code, desc] of perms) {
        await pool.query("INSERT INTO permissions (id, code, description) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT (code) DO NOTHING", [code, desc]);
      }
      results.push('Migration: permissions seeded');

      // Get first customer
      const custRes = await pool.query("SELECT id, name FROM customers WHERE tenant_id = $1 LIMIT 1", [tenantId]);
      const customerId = custRes.rows[0]?.id;
      results.push('Customer: ' + (custRes.rows[0]?.name || 'none'));

      // Get admin password hash (known working)
      const adminRes = await pool.query("SELECT password_hash FROM users WHERE email = 'admin@demo.com' AND tenant_id = $1", [tenantId]);
      const adminHash = adminRes.rows[0]?.password_hash;
      if (!adminHash) return { error: 'Admin user not found', results };

      // Create portal role + user
      let portalRoleId: string;
      const existingPR = await pool.query("SELECT id FROM roles WHERE tenant_id = $1 AND name = 'Portal Customer'", [tenantId]);
      if (existingPR.rows.length > 0) { portalRoleId = existingPR.rows[0].id; }
      else {
        const pr = await pool.query("INSERT INTO roles (tenant_id, name, description) VALUES ($1, 'Portal Customer', 'Portal access') RETURNING id", [tenantId]);
        portalRoleId = pr.rows[0].id;
      }
      // Assign portal permissions
      const portalPerms = await pool.query("SELECT id FROM permissions WHERE code LIKE 'portal.%'");
      for (const p of portalPerms.rows) {
        await pool.query("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [portalRoleId, p.id]);
      }

      // Create driver role
      let driverRoleId: string;
      const existingDR = await pool.query("SELECT id FROM roles WHERE tenant_id = $1 AND name = 'Driver'", [tenantId]);
      if (existingDR.rows.length > 0) { driverRoleId = existingDR.rows[0].id; }
      else {
        const dr = await pool.query("INSERT INTO roles (tenant_id, name, description) VALUES ($1, 'Driver', 'Driver access') RETURNING id", [tenantId]);
        driverRoleId = dr.rows[0].id;
      }
      const driverPerms = await pool.query("SELECT id FROM permissions WHERE code LIKE 'driver.%'");
      for (const p of driverPerms.rows) {
        await pool.query("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [driverRoleId, p.id]);
      }

      // Create portal user
      const existingPU = await pool.query("SELECT id FROM users WHERE email = 'portal@acme.com' AND tenant_id = $1", [tenantId]);
      let portalUserId: string;
      if (existingPU.rows.length > 0) {
        portalUserId = existingPU.rows[0].id;
        await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [adminHash, portalUserId]);
      } else {
        const pu = await pool.query(
          "INSERT INTO users (tenant_id, email, display_name, password_hash, user_type, customer_id) VALUES ($1, 'portal@acme.com', 'Acme Portal User', $2, 'customer', $3) RETURNING id",
          [tenantId, adminHash, customerId]
        );
        portalUserId = pu.rows[0].id;
      }
      await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [portalUserId, portalRoleId]);
      results.push('Portal user: portal@acme.com (password: admin123)');

      // Create driver user
      const existingDU = await pool.query("SELECT id FROM users WHERE email = 'mike.driver@demo.com' AND tenant_id = $1", [tenantId]);
      let driverUserId: string;
      if (existingDU.rows.length > 0) {
        driverUserId = existingDU.rows[0].id;
        await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [adminHash, driverUserId]);
      } else {
        const du = await pool.query(
          "INSERT INTO users (tenant_id, email, display_name, password_hash, user_type) VALUES ($1, 'mike.driver@demo.com', 'Mike Driver', $2, 'driver') RETURNING id",
          [tenantId, adminHash]
        );
        driverUserId = du.rows[0].id;
      }
      await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [driverUserId, driverRoleId]);

      // Link driver record if exists
      const driverRec = await pool.query("SELECT id FROM drivers WHERE tenant_id = $1 LIMIT 1", [tenantId]);
      if (driverRec.rows.length > 0) {
        await pool.query("UPDATE drivers SET user_id = $1 WHERE id = $2", [driverUserId, driverRec.rows[0].id]);
        results.push('Driver user: mike.driver@demo.com linked to driver record');
      } else {
        results.push('Driver user: mike.driver@demo.com (no driver record to link)');
      }

      return { success: true, tenantId, results };
    } catch (err: any) {
      return { error: err.message, results };
    } finally {
      await pool.end();
    }
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
