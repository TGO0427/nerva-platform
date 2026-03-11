import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>("S3_BUCKET", "nerva-uploads");
    this.s3 = new S3Client({
      region: config.get<string>("S3_REGION", "us-east-1"),
      endpoint: config.get<string>("S3_ENDPOINT"),
      credentials: {
        accessKeyId: config.get<string>("S3_ACCESS_KEY", ""),
        secretAccessKey: config.get<string>("S3_SECRET_KEY", ""),
      },
      forcePathStyle:
        config.get<string>("S3_FORCE_PATH_STYLE", "true") === "true",
    });
  }

  async getPresignedUploadUrl(
    tenantId: string,
    entityType: string,
    fileName: string,
    contentType: string,
    fileSize?: number,
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      throw new BadRequestException(
        `File type "${contentType}" is not allowed. Accepted types: ${[...ALLOWED_MIME_TYPES].join(", ")}`,
      );
    }

    if (fileSize && fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      );
    }

    const ext = fileName.split(".").pop() || "";
    const s3Key = `${tenantId}/${entityType}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 600 });
    return { uploadUrl, s3Key };
  }

  async getPresignedDownloadUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });
    return getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }
}
