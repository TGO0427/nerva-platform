export class ListDocumentsQueryDto {
  search?: string;
  documentType?: string;
  entityType?: string;
  status?: string;
  expiryStatus?: string;
  page?: number;
  limit?: number;
}

export class CreateDocumentDto {
  entityType!: string;
  entityId?: string;
  linkedLabel?: string;
  documentType!: string;
  fileName!: string;
  fileType!: string;
  fileSizeBytes?: number;
  s3Key!: string;
  s3Bucket!: string;
  status?: string;
  expiryDate?: string;
  ownerName?: string;
  notes?: string;
}
