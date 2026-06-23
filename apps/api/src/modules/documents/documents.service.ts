import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CreateDocumentRecord,
  DocumentsRepository,
  DocumentFilters,
} from "./documents.repository";
import { CreateDocumentDto, ListDocumentsQueryDto } from "./dto/document.dto";

const VALID_STATUSES = new Set(["APPROVED", "PENDING", "MISSING", "REJECTED"]);

@Injectable()
export class DocumentsService {
  constructor(private readonly repository: DocumentsRepository) {}

  async list(tenantId: string, query: ListDocumentsQueryDto) {
    const filters: DocumentFilters = {
      search: query.search,
      documentType: emptyToUndefined(query.documentType),
      entityType: emptyToUndefined(query.entityType),
      status: normalizeStatus(query.status),
      expiryStatus: emptyToUndefined(query.expiryStatus),
      page: Number(query.page) || 1,
      limit: Math.min(Number(query.limit) || 25, 100),
    };

    const result = await this.repository.list(tenantId, filters);
    return {
      data: result.data.map(mapDocument),
      meta: result.meta,
    };
  }

  async stats(tenantId: string) {
    const stats = await this.repository.stats(tenantId);
    return {
      approved: Number(stats?.approved || 0),
      pending: Number(stats?.pending || 0),
      missing: Number(stats?.missing || 0),
      needsAction: Number(stats?.needs_action || 0),
    };
  }

  async create(tenantId: string, userId: string, data: CreateDocumentDto) {
    if (!data.fileName || !data.fileType || !data.s3Key || !data.s3Bucket) {
      throw new BadRequestException("File metadata is required");
    }

    const status = normalizeStatus(data.status) || "PENDING";
    if (!VALID_STATUSES.has(status)) {
      throw new BadRequestException("Invalid document status");
    }

    const created = await this.repository.create({
      tenantId,
      uploadedBy: userId,
      entityType: data.entityType,
      entityId: data.entityId,
      linkedLabel: data.linkedLabel,
      documentType: data.documentType,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSizeBytes: data.fileSizeBytes,
      s3Key: data.s3Key,
      s3Bucket: data.s3Bucket,
      status,
      expiryDate: data.expiryDate,
      ownerName: data.ownerName,
      notes: data.notes,
    } satisfies CreateDocumentRecord);

    return mapDocument({
      ...created,
      uploaded_by_name: "You",
      expiry_status: getExpiryStatus(created.expiry_date),
    });
  }
}

function emptyToUndefined(value?: string) {
  if (!value || value === "All") return undefined;
  return value;
}

function normalizeStatus(value?: string) {
  if (!value || value === "All") return undefined;
  return value.toUpperCase().replace(/\s+/g, "_");
}

function getExpiryStatus(value?: string | Date | null) {
  if (!value) return "NO_EXPIRY";
  const expiry = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inThirtyDays = new Date(today);
  inThirtyDays.setDate(today.getDate() + 30);
  if (expiry < today) return "EXPIRED";
  if (expiry <= inThirtyDays) return "EXPIRING_SOON";
  return "VALID";
}

function mapDocument(row: any) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    linkedLabel: row.linked_label,
    documentType: row.document_type || row.entity_type,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : null,
    s3Key: row.s3_key,
    s3Bucket: row.s3_bucket,
    status: row.status || "PENDING",
    expiryDate: row.expiry_date,
    expiryStatus: row.expiry_status || getExpiryStatus(row.expiry_date),
    ownerName: row.owner_name,
    notes: row.notes,
    uploadedByName: row.uploaded_by_name || "Unknown",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
