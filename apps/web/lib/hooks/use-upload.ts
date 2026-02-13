import { useState, useCallback } from 'react';
import api from '@/lib/api';

interface UploadResult {
  s3Key: string;
  fileName: string;
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (
    file: File | Blob,
    entityType: string,
    fileName?: string,
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);

    try {
      const name = fileName || (file instanceof File ? file.name : `${entityType}-${Date.now()}.png`);
      const contentType = file.type || 'application/octet-stream';

      // Get presigned URL
      const { data } = await api.post<{ uploadUrl: string; s3Key: string }>('/upload/presign', {
        fileName: name,
        contentType,
        entityType,
      });

      // Upload directly to S3
      await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });

      return { s3Key: data.s3Key, fileName: name };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, error };
}
