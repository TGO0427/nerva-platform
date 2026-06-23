import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/db/base.repository";

export interface DocumentFilters {
  search?: string;
  documentType?: string;
  entityType?: string;
  status?: string;
  expiryStatus?: string;
  page: number;
  limit: number;
}

export interface CreateDocumentRecord {
  tenantId: string;
  entityType: string;
  entityId?: string;
  linkedLabel?: string;
  documentType: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number;
  s3Key: string;
  s3Bucket: string;
  uploadedBy: string;
  status: string;
  expiryDate?: string;
  ownerName?: string;
  notes?: string;
}

@Injectable()
export class DocumentsRepository extends BaseRepository {
  async list(tenantId: string, filters: DocumentFilters) {
    const offset = (filters.page - 1) * filters.limit;
    const params: unknown[] = [tenantId];
    const where = ["d.tenant_id = $1"];

    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      where.push(`(
        LOWER(d.file_name) LIKE $${params.length}
        OR LOWER(COALESCE(d.linked_label, '')) LIKE $${params.length}
        OR LOWER(COALESCE(d.owner_name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(u.display_name, u.email, '')) LIKE $${params.length}
      )`);
    }

    if (filters.documentType) {
      params.push(filters.documentType);
      where.push(`d.document_type = $${params.length}`);
    }

    if (filters.entityType) {
      params.push(filters.entityType);
      where.push(`d.entity_type = $${params.length}`);
    }

    if (filters.status) {
      params.push(filters.status);
      where.push(`d.status = $${params.length}`);
    }

    if (filters.expiryStatus) {
      if (filters.expiryStatus === "EXPIRED") {
        where.push("d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE");
      } else if (filters.expiryStatus === "EXPIRING_SOON") {
        where.push("d.expiry_date IS NOT NULL AND d.expiry_date >= CURRENT_DATE AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days'");
      } else if (filters.expiryStatus === "VALID") {
        where.push("d.expiry_date IS NOT NULL AND d.expiry_date > CURRENT_DATE + INTERVAL '30 days'");
      } else if (filters.expiryStatus === "NO_EXPIRY") {
        where.push("d.expiry_date IS NULL");
      }
    }

    const whereSql = where.join(" AND ");
    const rows = await this.queryMany<any>(
      `SELECT
        d.id,
        d.entity_type,
        d.entity_id,
        d.file_name,
        d.file_type,
        d.file_size_bytes,
        d.s3_key,
        d.s3_bucket,
        d.document_type,
        d.linked_label,
        d.status,
        d.expiry_date,
        d.owner_name,
        d.notes,
        d.created_at,
        d.updated_at,
        COALESCE(u.display_name, u.email, 'Unknown') AS uploaded_by_name,
        CASE
          WHEN d.expiry_date IS NULL THEN 'NO_EXPIRY'
          WHEN d.expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
          ELSE 'VALID'
        END AS expiry_status
       FROM documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE ${whereSql}
       ORDER BY
        CASE WHEN d.status = 'MISSING' THEN 0 WHEN d.status = 'PENDING' THEN 1 ELSE 2 END,
        d.expiry_date ASC NULLS LAST,
        d.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.limit, offset],
    );

    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM documents d
       LEFT JOIN users u ON u.id = d.uploaded_by
       WHERE ${whereSql}`,
      params,
    );
    const total = parseInt(countResult?.count || "0", 10);

    return {
      data: rows,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async stats(tenantId: string) {
    return this.queryOne<any>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE status = 'MISSING') AS missing,
        COUNT(*) FILTER (
          WHERE status IN ('MISSING', 'REJECTED')
             OR (expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE)
             OR (expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days')
        ) AS needs_action
       FROM documents
       WHERE tenant_id = $1`,
      [tenantId],
    );
  }

  async create(data: CreateDocumentRecord) {
    return this.queryOne<any>(
      `INSERT INTO documents (
        tenant_id,
        entity_type,
        entity_id,
        file_name,
        file_type,
        file_size_bytes,
        s3_key,
        s3_bucket,
        uploaded_by,
        document_type,
        linked_label,
        status,
        expiry_date,
        owner_name,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        data.tenantId,
        data.entityType,
        data.entityId || null,
        data.fileName,
        data.fileType,
        data.fileSizeBytes || null,
        data.s3Key,
        data.s3Bucket,
        data.uploadedBy,
        data.documentType,
        data.linkedLabel || null,
        data.status,
        data.expiryDate || null,
        data.ownerName || null,
        data.notes || null,
      ],
    );
  }
}
