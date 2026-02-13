import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', 'nerva-uploads');
    this.s3 = new S3Client({
      region: config.get<string>('S3_REGION', 'us-east-1'),
      endpoint: config.get<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: config.get<string>('S3_SECRET_KEY', ''),
      },
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE', 'true') === 'true',
    });
  }

  async getPresignedUploadUrl(
    tenantId: string,
    entityType: string,
    fileName: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    const ext = fileName.split('.').pop() || '';
    const s3Key = `${tenantId}/${entityType}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: contentType,
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
