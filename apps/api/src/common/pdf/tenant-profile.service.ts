import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../db/database.module';
import { TenantProfile } from './pdf-helpers';

@Injectable()
export class TenantProfileService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async getProfile(tenantId: string): Promise<TenantProfile> {
    const result = await this.pool.query(
      `SELECT name, code, address_line1, address_line2, city, postal_code, country,
              phone, email, vat_no, registration_no, logo_url,
              bank_name, bank_account_no, bank_branch_code
       FROM tenants WHERE id = $1`,
      [tenantId],
    );

    const row = result.rows[0];
    if (!row) {
      return { name: 'Company' };
    }

    return {
      name: row.name,
      code: row.code,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      postalCode: row.postal_code,
      country: row.country,
      phone: row.phone,
      email: row.email,
      vatNo: row.vat_no,
      registrationNo: row.registration_no,
      logoUrl: row.logo_url,
      bankName: row.bank_name,
      bankAccountNo: row.bank_account_no,
      bankBranchCode: row.bank_branch_code,
    };
  }

  async updateProfile(
    tenantId: string,
    data: Partial<Omit<TenantProfile, 'name' | 'code'>>,
  ): Promise<TenantProfile> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      addressLine1: 'address_line1',
      addressLine2: 'address_line2',
      city: 'city',
      postalCode: 'postal_code',
      country: 'country',
      phone: 'phone',
      email: 'email',
      vatNo: 'vat_no',
      registrationNo: 'registration_no',
      logoUrl: 'logo_url',
      bankName: 'bank_name',
      bankAccountNo: 'bank_account_no',
      bankBranchCode: 'bank_branch_code',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key as keyof typeof data] !== undefined) {
        updates.push(`${column} = $${idx++}`);
        params.push(data[key as keyof typeof data]);
      }
    }

    if (updates.length > 0) {
      params.push(tenantId);
      await this.pool.query(
        `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${idx}`,
        params,
      );
    }

    return this.getProfile(tenantId);
  }
}
