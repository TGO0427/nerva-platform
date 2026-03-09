import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { Pool } from "pg";
import { DATABASE_POOL } from "../../common/db/database.module";
import { AuditService } from "../audit/audit.service";

export interface UserDataExport {
  exportedAt: string;
  profile: {
    email: string;
    displayName: string;
    userType: string;
    createdAt: string;
    lastLoginAt: string | null;
  };
  auditLog: Array<{
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
  }>;
  orders: Array<{ id: string; createdAt: string; type: string }>;
  passwordResetRequests: Array<{ createdAt: string; expiresAt: string }>;
  refreshTokenSessions: Array<{ createdAt: string; expiresAt: string }>;
}

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly auditService: AuditService,
  ) {}

  async exportUserData(
    userId: string,
    tenantId: string,
  ): Promise<UserDataExport> {
    // Get user profile
    const userResult = await this.pool.query(
      `SELECT email, display_name, user_type, created_at, last_login_at
       FROM users WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    );

    if (userResult.rows.length === 0) {
      throw new BadRequestException("User not found");
    }

    const user = userResult.rows[0];

    // Get audit log entries for this user
    const auditResult = await this.pool.query(
      `SELECT action, entity_type, entity_id, created_at
       FROM audit_log
       WHERE tenant_id = $1 AND actor_user_id = $2
       ORDER BY created_at DESC
       LIMIT 500`,
      [tenantId, userId],
    );

    // Get orders/GRNs/adjustments created by this user (IDs and dates only)
    const ordersResult = await this.pool.query(
      `SELECT id, created_at, 'purchase_order' AS type FROM purchase_orders
       WHERE tenant_id = $1 AND created_by = $2
       UNION ALL
       SELECT id, created_at, 'grn' AS type FROM goods_received_notes
       WHERE tenant_id = $1 AND created_by = $2
       UNION ALL
       SELECT id, created_at, 'adjustment' AS type FROM inventory_adjustments
       WHERE tenant_id = $1 AND created_by = $2
       UNION ALL
       SELECT id, created_at, 'sales_order' AS type FROM sales_orders
       WHERE tenant_id = $1 AND created_by = $2
       ORDER BY created_at DESC
       LIMIT 500`,
      [tenantId, userId],
    );

    // Get password reset requests (dates only, no tokens)
    const resetResult = await this.pool.query(
      `SELECT created_at, expires_at
       FROM password_reset_tokens
       WHERE user_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC`,
      [userId, tenantId],
    );

    // Get refresh token sessions (created_at, expires_at only)
    const sessionsResult = await this.pool.query(
      `SELECT created_at, expires_at
       FROM refresh_tokens
       WHERE user_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC`,
      [userId, tenantId],
    );

    // Log the data export in audit
    await this.auditService.log({
      tenantId,
      actorUserId: userId,
      entityType: "user",
      entityId: userId,
      action: "GDPR_DATA_EXPORT",
    });

    // Store last export timestamp
    await this.pool.query(
      `UPDATE users SET updated_at = NOW() WHERE id = $1`,
      [userId],
    );

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        email: user.email,
        displayName: user.display_name,
        userType: user.user_type,
        createdAt: user.created_at?.toISOString?.() || String(user.created_at),
        lastLoginAt: user.last_login_at
          ? user.last_login_at?.toISOString?.() || String(user.last_login_at)
          : null,
      },
      auditLog: auditResult.rows.map((row) => ({
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        createdAt: row.created_at?.toISOString?.() || String(row.created_at),
      })),
      orders: ordersResult.rows.map((row) => ({
        id: row.id,
        createdAt: row.created_at?.toISOString?.() || String(row.created_at),
        type: row.type,
      })),
      passwordResetRequests: resetResult.rows.map((row) => ({
        createdAt: row.created_at?.toISOString?.() || String(row.created_at),
        expiresAt: row.expires_at?.toISOString?.() || String(row.expires_at),
      })),
      refreshTokenSessions: sessionsResult.rows.map((row) => ({
        createdAt: row.created_at?.toISOString?.() || String(row.created_at),
        expiresAt: row.expires_at?.toISOString?.() || String(row.expires_at),
      })),
    };
  }

  async deleteUserData(userId: string, tenantId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Anonymize user: set email, displayName, clear password_hash, deactivate
      const deletedEmail = `deleted-${userId}@deleted.local`;
      await client.query(
        `UPDATE users
         SET email = $1,
             display_name = 'Deleted User',
             password_hash = '',
             is_active = false,
             updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [deletedEmail, userId, tenantId],
      );

      // Revoke all refresh tokens
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
      );

      // Delete password reset tokens
      await client.query(
        `DELETE FROM password_reset_tokens WHERE user_id = $1`,
        [userId],
      );

      // Log the deletion in audit
      await client.query(
        `INSERT INTO audit_log (tenant_id, actor_user_id, entity_type, entity_id, action, after_json)
         VALUES ($1, $2, 'user', $3, 'GDPR_ACCOUNT_DELETION', $4)`,
        [
          tenantId,
          userId,
          userId,
          JSON.stringify({
            reason: "User requested account deletion (GDPR)",
            anonymizedEmail: deletedEmail,
          }),
        ],
      );

      await client.query("COMMIT");

      this.logger.log(
        `GDPR account deletion completed for user ${userId} in tenant ${tenantId}`,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error(
        `GDPR account deletion failed for user ${userId}:`,
        error,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async getLastExportDate(
    userId: string,
    tenantId: string,
  ): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT created_at FROM audit_log
       WHERE tenant_id = $1 AND actor_user_id = $2 AND action = 'GDPR_DATA_EXPORT'
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, userId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return row.created_at?.toISOString?.() || String(row.created_at);
  }

  async canExportData(userId: string, tenantId: string): Promise<boolean> {
    const lastExport = await this.getLastExportDate(userId, tenantId);
    if (!lastExport) return true;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(lastExport) < oneHourAgo;
  }
}
