/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

export const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 MB
export const MAX_PDF_SIZE = 15 * 1024 * 1024;   // 15 MB
export const MAX_FILES_PER_UPLOAD = 5;

export interface FileValidationResult {
  valid: boolean;
  detectedMime: string;
  error?: string;
  processedBuffer?: Buffer;
}

export async function validateAndProcessFile(
  fileBuffer: Buffer,
  claimedMimeType: string,
  originalName: string
): Promise<FileValidationResult> {
  if (!fileBuffer || fileBuffer.length === 0) {
    return { valid: false, detectedMime: '', error: 'Uploaded file is empty.' };
  }

  // Check SVG explicit rejection
  if (claimedMimeType.includes('svg') || originalName.toLowerCase().endsWith('.svg')) {
    return { valid: false, detectedMime: 'image/svg+xml', error: 'SVG files are strictly disallowed due to script injection risks.' };
  }

  // Detect magic bytes signature
  let detectedType = await fileTypeFromBuffer(fileBuffer);
  let detectedMime = detectedType?.mime || '';

  // Fallback signature checks for standard PDF/Image headers if file-type misses
  if (!detectedMime) {
    if (fileBuffer.slice(0, 4).toString('hex') === '25504446') {
      detectedMime = 'application/pdf';
    } else if (fileBuffer.slice(0, 3).toString('hex') === 'ffd8ff') {
      detectedMime = 'image/jpeg';
    } else if (fileBuffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
      detectedMime = 'image/png';
    } else if (fileBuffer.slice(0, 4).toString('ascii') === 'RIFF' && fileBuffer.slice(8, 12).toString('ascii') === 'WEBP') {
      detectedMime = 'image/webp';
    }
  }

  if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
    return {
      valid: false,
      detectedMime: detectedMime || 'unknown',
      error: `Disallowed file type detected (${detectedMime || 'unknown'}). Allowed formats: JPEG, PNG, WebP, PDF.`
    };
  }

  // Size limit checks
  if (detectedMime === 'application/pdf') {
    if (fileBuffer.length > MAX_PDF_SIZE) {
      return { valid: false, detectedMime, error: `PDF file exceeds maximum limit of 15MB.` };
    }
    return { valid: true, detectedMime, processedBuffer: fileBuffer };
  }

  // Image size limit check
  if (fileBuffer.length > MAX_IMAGE_SIZE) {
    return { valid: false, detectedMime, error: `Image file exceeds maximum limit of 8MB.` };
  }

  // Re-encode image using sharp to strip metadata and sanitize
  try {
    let processed: Buffer;
    if (detectedMime === 'image/jpeg') {
      processed = await sharp(fileBuffer).rotate().jpeg({ quality: 85 }).toBuffer();
    } else if (detectedMime === 'image/png') {
      processed = await sharp(fileBuffer).rotate().png({ compressionLevel: 8 }).toBuffer();
    } else if (detectedMime === 'image/webp') {
      processed = await sharp(fileBuffer).rotate().webp({ quality: 85 }).toBuffer();
    } else {
      processed = fileBuffer;
    }

    return {
      valid: true,
      detectedMime,
      processedBuffer: processed
    };
  } catch (err: any) {
    return {
      valid: false,
      detectedMime,
      error: `Failed to decode and sanitize image payload: ${err.message || 'Corrupt image'}`
    };
  }
}
