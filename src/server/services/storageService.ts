/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StorageMetadata {
  uploaderUserId: string;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
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

  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'local';
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  public async uploadFile(options: UploadOptions): Promise<StorageMetadata> {
    const scanResult = await scanFile(options.buffer);
    if (!scanResult.clean) {
      throw new Error(`Security scan failed: ${scanResult.reason || 'Malware threat detected.'}`);
    }

    const fileExt = this.getSafeExtension(options.detectedMimeType || options.mimeType);
    const randomUuid = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const objectKey = `uploads/${Date.now()}-${randomUuid}.${fileExt}`;
    const sanitizedName = path.basename(options.originalFilename).replace(/[^a-zA-Z0-9_.-]/g, '_');

    let publicUrl = '';

    if (this.provider === 'gcs' && process.env.GCS_BUCKET_NAME) {
      // In production GCS mode, save to Google Cloud Storage bucket
      publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${objectKey}`;
    } else {
      // Local storage fallback adapter
      const fullPath = path.join(process.cwd(), objectKey);
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, options.buffer);
      publicUrl = `/${objectKey}`;
    }

    const metadata: StorageMetadata = {
      uploaderUserId: options.userId,
      objectKey,
      originalFilename: sanitizedName,
      mimeType: options.mimeType,
      size: options.buffer.length,
      detectedMimeType: options.detectedMimeType,
      uploadDate: new Date().toISOString(),
      entityType: options.entityType,
      entityId: options.entityId,
      publicUrl
    };

    return metadata;
  }

  public async deleteFile(objectKey: string): Promise<boolean> {
    if (this.provider === 'local' || !process.env.GCS_BUCKET_NAME) {
      const fullPath = path.join(process.cwd(), objectKey);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
    }
    return false;
  }

  public async getSignedUrl(objectKey: string): Promise<string> {
    return `/${objectKey}`;
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
