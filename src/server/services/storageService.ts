/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';

export interface StorageMetadata {
  id: string;
  uploaderUserId: string;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
  claimedMimeType?: string;
  size: number;
  detectedMimeType: string;
  uploadDate: string;
  entityType?: string;
  entityId?: string;
  publicUrl: string;
}

export interface UploadOptions {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  detectedMimeType: string;
  userId: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Anti-Malware / Security Scanner Interface Abstraction
 * Plug ClamAV or Cloud Virus Scanner here in production environments.
 */
export async function scanFile(buffer: Buffer): Promise<{ clean: boolean; reason?: string }> {
  // Placeholder malware scanner check (ClamAV / WebRisk API integration point)
  if (!buffer || buffer.length === 0) {
    return { clean: false, reason: 'File buffer is empty or corrupt.' };
  }
  
  // Inspect for obvious EICAR test string
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 128));
  if (content.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
    return { clean: false, reason: 'EICAR virus signature detected.' };
  }

  return { clean: true };
}

export class StorageService {
  private provider: string;
  private uploadsDir: string;
  private bucketName: string | undefined;
  private storageClient: Storage | null = null;

  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'local';
    this.bucketName = process.env.GCS_BUCKET_NAME;
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  private getStorage(): Storage {
    if (!this.storageClient) {
      this.storageClient = new Storage();
    }
    return this.storageClient;
  }

  public async uploadFile(options: UploadOptions): Promise<StorageMetadata> {
    const scanResult = await scanFile(options.buffer);
    if (!scanResult.clean) {
      throw new Error(`Security scan failed: ${scanResult.reason || 'Malware threat detected.'}`);
    }

    const fileExt = this.getSafeExtension(options.detectedMimeType || options.mimeType);
    const randomUuid = crypto.randomBytes(8).toString('hex');
    const objectKey = `uploads/${Date.now()}-${randomUuid}.${fileExt}`;
    const sanitizedName = path.basename(options.originalFilename).replace(/[^a-zA-Z0-9_.-]/g, '_');

    let documentUrl = '';

    if (this.provider === 'gcs' && this.bucketName) {
      // In real GCS mode, save to Google Cloud Storage bucket (Uniform Bucket-Level Access)
      const bucket = this.getStorage().bucket(this.bucketName);
      const file = bucket.file(objectKey);

      await file.save(options.buffer, {
        resumable: false,
        contentType: options.detectedMimeType || options.mimeType,
        metadata: {
          metadata: {
            uploaderUserId: options.userId,
            originalFilename: sanitizedName,
            entityType: options.entityType || '',
            entityId: options.entityId || ''
          }
        },
        validation: 'md5'
      });

      // Private document download route requiring authentication
      documentUrl = `/api/files/download?key=${encodeURIComponent(objectKey)}`;
    } else {
      // Local storage fallback adapter
      const fullPath = path.join(process.cwd(), objectKey);
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, options.buffer);
      documentUrl = `/api/files/download?key=${encodeURIComponent(objectKey)}`;
    }

    const metadata: StorageMetadata = {
      id: `file-${randomUuid}`,
      uploaderUserId: options.userId,
      objectKey,
      originalFilename: sanitizedName,
      mimeType: options.detectedMimeType || options.mimeType, // Authoritative detected MIME type
      claimedMimeType: options.mimeType,
      size: options.buffer.length,
      detectedMimeType: options.detectedMimeType,
      uploadDate: new Date().toISOString(),
      entityType: options.entityType,
      entityId: options.entityId,
      publicUrl: documentUrl
    };

    return metadata;
  }

  public async deleteFile(objectKey: string): Promise<boolean> {
    if (this.provider === 'gcs' && this.bucketName) {
      try {
        const bucket = this.getStorage().bucket(this.bucketName);
        await bucket.file(objectKey).delete();
        return true;
      } catch (err) {
        console.error('Error deleting file from GCS:', err);
        return false;
      }
    } else {
      const fullPath = path.join(process.cwd(), objectKey);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
    }
    return false;
  }

  public async getSignedUrl(objectKey: string, expiresMinutes: number = 60): Promise<string> {
    if (this.provider === 'gcs' && this.bucketName) {
      const bucket = this.getStorage().bucket(this.bucketName);
      const file = bucket.file(objectKey);
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresMinutes * 60 * 1000
      });
      return signedUrl;
    }
    return `/api/files/download?key=${encodeURIComponent(objectKey)}`;
  }

  private getSafeExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg': return 'jpg';
      case 'image/png': return 'png';
      case 'image/webp': return 'webp';
      case 'application/pdf': return 'pdf';
      default: return 'bin';
    }
  }
}

export const storageService = new StorageService();
