/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { requireAuth } from "../server/middleware";
import {
  collections,
  FileMetadata,
  AllowedEntityType,
  FileVisibility,
  DEFAULT_VISIBILITY,
  saveFileMetadata,
  deleteFileMetadata,
  removeFileMetadataFromCache,
  getFileMetadataByIdAuthoritative,
  getFileMetadataByObjectKeyAuthoritative,
  MetadataUnavailableError
} from "../lib/serverDb";
import { logActivity, logAuditEvent } from "../lib/auditLogger";
import { validateAndProcessFile, MAX_FILES_PER_UPLOAD } from "../lib/fileValidator";
import { storageService } from "../server/services/storageService";
import { getMalwareScanner } from "../server/services/malwareScanner";

export const uploadRouter = Router();

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // max 15MB buffer limit
    files: MAX_FILES_PER_UPLOAD
  }
});

export const AllowedEntityTypesEnum = z.enum([
  'profile_avatar',
  'listing',
  'equipment',
  'seller',
  'vendor',
  'store',
  'procurement',
  'rfq',
  'offer',
  'escrow',
  'financing',
  'engineer',
  'inspection'
]);

export const ObjectKeySchema = z.string().regex(
  /^uploads\/[0-9]+-[a-f0-9]{16}\.(jpg|png|webp|pdf)$/,
  "Invalid document key format or illegal character sequence."
);

/**
 * Validate upload entity ownership helper
 */
export function validateUploadEntityOwnership(user: any, entityType?: string, entityId?: string): { allowed: boolean; message?: string } {
  if (!entityType) {
    return { allowed: false, message: 'Upload entity type is required.' };
  }

  // Admin users have full platform authority
  if (user.role === 'admin') {
    return { allowed: true };
  }

  const sanitizedType = entityType.toLowerCase().trim();

  // Validate allowed entity type enum
  const parsedType = AllowedEntityTypesEnum.safeParse(sanitizedType);
  if (!parsedType.success) {
    return { allowed: false, message: `Unsupported upload entity type '${entityType}'.` };
  }

  if (sanitizedType === 'profile_avatar') {
    if (!entityId || entityId === user.id) {
      return { allowed: true };
    }
    return { allowed: false, message: 'You can only update your own profile avatar.' };
  }

  if (!entityId) {
    return { allowed: false, message: `Entity ID is required for upload entity type '${sanitizedType}'.` };
  }

  switch (sanitizedType) {
    case 'listing':
    case 'equipment': {
      const listing = collections.listings.find(l => l.id === entityId);
      if (!listing) {
        return { allowed: false, message: 'Specified equipment listing not found.' };
      }
      const seller = collections.sellers.find(s => s.user_id === user.id);
      if (!seller || seller.id !== listing.seller_id) {
        return { allowed: false, message: 'You do not own this equipment listing.' };
      }
      return { allowed: true };
    }

    case 'seller':
    case 'vendor':
    case 'store': {
      const seller = collections.sellers.find(s => s.id === entityId);
      if (!seller || seller.user_id !== user.id) {
        return { allowed: false, message: 'You do not own this merchant store profile.' };
      }
      return { allowed: true };
    }

    case 'procurement':
    case 'rfq': {
      const rfq = collections.procurementRequests.find(r => r.id === entityId);
      if (!rfq || rfq.user_id !== user.id) {
        return { allowed: false, message: 'You do not own this procurement request.' };
      }
      return { allowed: true };
    }

    case 'offer': {
      const offer = collections.offers.find(o => o.id === entityId);
      if (!offer) {
        return { allowed: false, message: 'Specified offer not found.' };
      }
      const seller = collections.sellers.find(s => s.user_id === user.id);
      const isSeller = seller && seller.id === offer.seller_id;
      const isBuyer = offer.buyer_id === user.id;
      if (!isSeller && !isBuyer) {
        return { allowed: false, message: 'You are not involved in this offer negotiation.' };
      }
      return { allowed: true };
    }

    case 'escrow': {
      const deal = collections.escrowDeals.find(d => d.id === entityId);
      if (!deal) {
        return { allowed: false, message: 'Specified escrow deal not found.' };
      }
      const seller = collections.sellers.find(s => s.user_id === user.id);
      const isSeller = seller && seller.id === deal.seller_id;
      const isBuyer = deal.buyer_id === user.id;
      const isEngineer = deal.engineer_requested && deal.assigned_engineer_id &&
        collections.engineers.some(e => e.id === deal.assigned_engineer_id && e.user_id === user.id);
      if (!isSeller && !isBuyer && !isEngineer) {
        return { allowed: false, message: 'You are not an authorized party in this escrow deal.' };
      }
      return { allowed: true };
    }

    case 'financing': {
      const app = collections.financingApplications.find(f => f.id === entityId);
      if (!app || app.buyer_id !== user.id) {
        return { allowed: false, message: 'You do not own this lease financing application.' };
      }
      return { allowed: true };
    }

    case 'engineer': {
      const eng = collections.engineers.find(e => e.id === entityId);
      if (!eng || eng.user_id !== user.id) {
        return { allowed: false, message: 'You do not own this biomedical engineer profile.' };
      }
      return { allowed: true };
    }

    case 'inspection': {
      const insp = collections.inspections.find(i => i.id === entityId);
      if (!insp) {
        return { allowed: false, message: 'Specified inspection request not found.' };
      }
      const isEngineer = insp.assigned_engineer_id && collections.engineers.some(e => e.id === insp.assigned_engineer_id && e.user_id === user.id);
      const isBuyer = insp.buyer_id === user.id;
      const seller = collections.sellers.find(s => s.user_id === user.id);
      const isSeller = seller && seller.id === insp.seller_id;
      if (!isEngineer && !isBuyer && !isSeller) {
        return { allowed: false, message: 'You are not authorized for this inspection.' };
      }
      return { allowed: true };
    }

    default:
      return {
        allowed: false,
        message: 'Unsupported or unclassified upload entity type.'
      };
  }
}

/**
 * Check if a user can access a specific file metadata object based on visibility rules
 */
export function canAccessFile(user: any, metadata: FileMetadata): { allowed: boolean; message?: string } {
  if (user?.role === 'admin') {
    return { allowed: true };
  }

  if (metadata.status !== 'active') {
    return { allowed: false, message: 'File is no longer active.' };
  }

  if (metadata.visibility === 'public') {
    return { allowed: true };
  }

  if (metadata.uploaderUserId === user?.id) {
    return { allowed: true };
  }

  if (metadata.visibility === 'owner_only') {
    return { allowed: false, message: 'This document is restricted strictly to the file owner.' };
  }

  if (metadata.visibility === 'participants') {
    if (!metadata.entityType || !metadata.entityId) {
      return { allowed: false, message: 'Document participant metadata incomplete.' };
    }
    const ownership = validateUploadEntityOwnership(user, metadata.entityType, metadata.entityId);
    if (!ownership.allowed) {
      return { allowed: false, message: ownership.message || 'You are not an authorized participant for this document.' };
    }
    return { allowed: true };
  }

  return { allowed: false, message: 'Access denied.' };
}

const handleMulterUpload = (req: any, res: any, next: any) => {
  memoryUpload.array("file", MAX_FILES_PER_UPLOAD)(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: err.message || `Upload limit exceeded (max ${MAX_FILES_PER_UPLOAD} files per request).`
      });
    }
    next();
  });
};

// Transactional File Upload POST Endpoint
uploadRouter.post("/api/upload", requireAuth, handleMulterUpload, async (req: any, res: any) => {
  const completedUploads: Array<{ metadata: FileMetadata; objectKey: string }> = [];

  const rollbackAllCompletedUploads = async () => {
    for (const item of completedUploads.reverse()) {
      try {
        await storageService.deleteFile(item.objectKey);
      } catch (err: any) {
        console.error(`Rollback error deleting storage file ${item.objectKey}:`, err);
      }
      try {
        await deleteFileMetadata(item.metadata.id);
      } catch (err: any) {
        console.error(`Rollback error deleting metadata document ${item.metadata.id}:`, err);
      }
      removeFileMetadataFromCache(item.metadata.id, item.objectKey);

      logAuditEvent({
        actor: req.user.email || req.user.id,
        action: 'FILE_UPLOAD_BATCH_ROLLBACK',
        category: 'Storage',
        description: `Rolled back file ${item.metadata.originalFilename} (${item.objectKey}) due to batch failure`,
        metadata: { metadataId: item.metadata.id, objectKey: item.objectKey }
      });
    }
  };

  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "No file was uploaded."
      });
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed per request.`
      });
    }

    const entityTypeRaw = req.body.entity_type;
    const entityId = req.body.entity_id;

    if (!entityTypeRaw || typeof entityTypeRaw !== 'string') {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Missing required upload parameter 'entity_type'."
      });
    }

    const entityType = entityTypeRaw.toLowerCase().trim() as AllowedEntityType;
    const parsedType = AllowedEntityTypesEnum.safeParse(entityType);
    if (!parsedType.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: `Unsupported entity_type '${entityTypeRaw}'. Allowed types: ${AllowedEntityTypesEnum.options.join(', ')}.`
      });
    }

    if (entityType !== 'profile_avatar' && (!entityId || typeof entityId !== 'string' || !entityId.trim())) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: `Parameter 'entity_id' is required for upload entity type '${entityType}'.`
      });
    }

    const ownershipCheck = validateUploadEntityOwnership(req.user, entityType, entityId);
    if (!ownershipCheck.allowed) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: ownershipCheck.message || "Ownership validation failed for specified entity."
      });
    }

    const visibility: FileVisibility = DEFAULT_VISIBILITY[entityType] || 'owner_only';
    const uploadResults = [];
    const scanner = getMalwareScanner();

    for (const file of files) {
      // Step 1: Malware scanning
      let scanResult;
      try {
        scanResult = await scanner.scan(file.buffer, file.originalname || 'file', file.mimetype || '');
      } catch (scanErr: any) {
        console.error("Malware scanner error:", scanErr);
        await rollbackAllCompletedUploads();
        logAuditEvent({
          actor: req.user.email || req.user.id,
          action: 'MALWARE_SCANNER_ERROR',
          category: 'Security',
          description: `Scanner service failure: ${scanErr.message}`,
          metadata: { filename: file.originalname }
        });
        return res.status(500).json({
          error: "SCANNER_ERROR",
          message: "Malware scanning service unavailable."
        });
      }

      if (!scanResult.clean) {
        await rollbackAllCompletedUploads();
        logAuditEvent({
          actor: req.user.email || req.user.id,
          action: 'MALWARE_DETECTED',
          category: 'Security',
          description: `Malware detected in file ${file.originalname}: ${scanResult.reason}`,
          metadata: { filename: file.originalname, reason: scanResult.reason, engine: scanResult.engine }
        });
        return res.status(400).json({
          error: "MALWARE_DETECTED",
          message: scanResult.reason || "File failed security scan."
        });
      }

      // Step 2: Validation
      const validation = await validateAndProcessFile(
        file.buffer,
        file.mimetype || '',
        file.originalname || 'upload'
      );

      if (!validation.valid) {
        await rollbackAllCompletedUploads();
        return res.status(400).json({
          error: "INVALID_FILE_TYPE",
          message: validation.error || "File validation failed."
        });
      }

      // Step 3: Storage upload
      const storageMeta = await storageService.uploadFile({
        buffer: validation.processedBuffer || file.buffer,
        originalFilename: file.originalname || 'file',
        mimeType: file.mimetype,
        detectedMimeType: validation.detectedMime,
        userId: req.user.id,
        entityType,
        entityId
      });

      const fullFileMetadata: FileMetadata = {
        id: storageMeta.id,
        uploaderUserId: req.user.id,
        objectKey: storageMeta.objectKey,
        originalFilename: storageMeta.originalFilename,
        detectedMimeType: storageMeta.mimeType,
        claimedMimeType: storageMeta.claimedMimeType,
        size: storageMeta.size,
        entityType,
        entityId: entityId || undefined,
        visibility,
        uploadDate: storageMeta.uploadDate,
        storageProvider: (process.env.STORAGE_PROVIDER as 'local' | 'gcs') || 'local',
        status: 'active'
      };

      // Step 4: Durable metadata persistence
      try {
        await saveFileMetadata(fullFileMetadata);
      } catch (metaErr) {
        console.error("File metadata persistence failed. Initiating compensating rollback:", metaErr);
        // Delete current storage file
        await storageService.deleteFile(storageMeta.objectKey).catch(() => {});
        removeFileMetadataFromCache(fullFileMetadata.id, storageMeta.objectKey);
        
        // Roll back previous uploaded files in this batch request
        await rollbackAllCompletedUploads();

        logAuditEvent({
          actor: req.user.email || req.user.id,
          action: 'FILE_UPLOAD_ROLLBACK',
          category: 'Storage',
          description: `Batch upload failed during metadata persistence for object ${storageMeta.objectKey}`,
          metadata: { objectKey: storageMeta.objectKey }
        });

        return res.status(500).json({
          error: "BATCH_UPLOAD_FAILED",
          message: "Failed to establish durable file metadata record. Upload rolled back."
        });
      }

      completedUploads.push({
        metadata: fullFileMetadata,
        objectKey: storageMeta.objectKey
      });

      const downloadUrl = `/api/files/${fullFileMetadata.id}/download`;
      const publicUrl = fullFileMetadata.visibility === 'public'
        ? `/api/public/files/${fullFileMetadata.id}`
        : undefined;

      uploadResults.push({
        id: fullFileMetadata.id,
        filename: fullFileMetadata.originalFilename,
        mimetype: fullFileMetadata.detectedMimeType,
        size: fullFileMetadata.size,
        visibility: fullFileMetadata.visibility,
        downloadUrl,
        publicUrl
      });

      logActivity(
        req.user.email || req.user.id,
        'FILE_UPLOAD',
        'Uploads',
        `Uploaded file: ${fullFileMetadata.originalFilename} (${fullFileMetadata.detectedMimeType}, ${fullFileMetadata.size} bytes, visibility: ${fullFileMetadata.visibility})`
      );
    }

    if (uploadResults.length === 1) {
      return res.status(201).json({
        success: true,
        ...uploadResults[0]
      });
    }

    res.status(201).json({
      success: true,
      files: uploadResults
    });
  } catch (err: any) {
    console.error("Upload route error:", err);
    await rollbackAllCompletedUploads();
    res.status(500).json({
      error: "UPLOAD_ERROR",
      message: "An error occurred while processing the file upload."
    });
  }
});

/**
 * Deprecated Authenticated Private Document Download GET Route by object key (?key=...)
 */
uploadRouter.get("/api/files/download", requireAuth, async (req: any, res: any) => {
  res.setHeader('Deprecation', 'true');
  try {
    const rawKey = req.query.key as string;
    if (!rawKey || typeof rawKey !== 'string') {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Missing document key query parameter." });
    }

    const key = decodeURIComponent(rawKey);
    const parseKey = ObjectKeySchema.safeParse(key);
    if (!parseKey.success) {
      return res.status(400).json({
        error: "INVALID_OBJECT_KEY",
        message: "Invalid object key format or illegal characters."
      });
    }

    const objectKey = parseKey.data;
    let metadata: FileMetadata | null = null;
    try {
      metadata = await getFileMetadataByObjectKeyAuthoritative(objectKey);
    } catch (dbErr) {
      if (dbErr instanceof MetadataUnavailableError) {
        logAuditEvent({
          actor: req.user.email || req.user.id,
          action: 'METADATA_SERVICE_UNAVAILABLE',
          category: 'Storage',
          description: `Metadata service outage during download request for key ${objectKey}`,
          metadata: { objectKey }
        });
        return res.status(503).json({
          error: "STORAGE_METADATA_UNAVAILABLE",
          message: "File access could not be verified due to metadata service outage."
        });
      }
      throw dbErr;
    }

    if (!metadata) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Private document metadata not found." });
    }

    const access = canAccessFile(req.user, metadata);
    if (!access.allowed) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: access.message || "You are not authorized to download this document."
      });
    }

    if (process.env.STORAGE_PROVIDER === 'gcs' && process.env.GCS_BUCKET_NAME) {
      const signedUrl = await storageService.getSignedUrl(objectKey, 15);
      return res.redirect(signedUrl);
    }

    const fullPath = path.join(process.cwd(), objectKey);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Private document file not found on disk." });
    }

    const safeFilename = path.basename(metadata.originalFilename).replace(/[^a-zA-Z0-9_.-]/g, '_');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', metadata.detectedMimeType);

    res.sendFile(fullPath);
  } catch (err: any) {
    console.error("Download route error:", err);
    res.status(500).json({ error: "STORAGE_ERROR", message: "An error occurred while serving requested document." });
  }
});

/**
 * Authoritative Download file by Metadata ID route
 */
uploadRouter.get("/api/files/:fileId/download", requireAuth, async (req: any, res: any) => {
  try {
    const fileId = req.params.fileId;
    let metadata: FileMetadata | null = null;
    try {
      metadata = await getFileMetadataByIdAuthoritative(fileId);
    } catch (dbErr) {
      if (dbErr instanceof MetadataUnavailableError) {
        logAuditEvent({
          actor: req.user.email || req.user.id,
          action: 'METADATA_SERVICE_UNAVAILABLE',
          category: 'Storage',
          description: `Metadata service outage during download request for ID ${fileId}`,
          metadata: { fileId }
        });
        return res.status(503).json({
          error: "STORAGE_METADATA_UNAVAILABLE",
          message: "File access could not be verified due to metadata service outage."
        });
      }
      throw dbErr;
    }

    if (!metadata) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Document metadata not found." });
    }

    const access = canAccessFile(req.user, metadata);
    if (!access.allowed) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: access.message || "You are not authorized to access this document."
      });
    }

    if (process.env.STORAGE_PROVIDER === 'gcs' && process.env.GCS_BUCKET_NAME) {
      const signedUrl = await storageService.getSignedUrl(metadata.objectKey, 15);
      return res.redirect(signedUrl);
    }

    const fullPath = path.join(process.cwd(), metadata.objectKey);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "NOT_FOUND", message: "File not found on disk." });
    }

    const safeFilename = path.basename(metadata.originalFilename).replace(/[^a-zA-Z0-9_.-]/g, '_');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', metadata.detectedMimeType);

    res.sendFile(fullPath);
  } catch (err: any) {
    console.error("Download by ID route error:", err);
    res.status(500).json({ error: "STORAGE_ERROR", message: "An error occurred while serving document." });
  }
});

/**
 * Dedicated Public File Route
 */
uploadRouter.get("/api/public/files/:id", async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    let metadata: FileMetadata | null = null;

    try {
      metadata = await getFileMetadataByIdAuthoritative(fileId);
    } catch (dbErr) {
      if (dbErr instanceof MetadataUnavailableError) {
        return res.status(503).json({
          error: "STORAGE_METADATA_UNAVAILABLE",
          message: "Public file metadata service unavailable."
        });
      }
      throw dbErr;
    }

    if (!metadata || metadata.status !== 'active') {
      return res.status(404).json({ error: "NOT_FOUND", message: "Public file not found." });
    }

    if (metadata.visibility !== 'public') {
      return res.status(403).json({ error: "FORBIDDEN", message: "Requested file is private." });
    }

    if (process.env.STORAGE_PROVIDER === 'gcs' && process.env.GCS_BUCKET_NAME) {
      const signedUrl = await storageService.getSignedUrl(metadata.objectKey, 15);
      return res.redirect(signedUrl);
    }

    const fullPath = path.join(process.cwd(), metadata.objectKey);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Public file not found on disk." });
    }

    res.setHeader('Content-Type', metadata.detectedMimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(fullPath);
  } catch (err: any) {
    console.error("Public file route error:", err);
    res.status(500).json({ error: "STORAGE_ERROR", message: "Failed to serve public file." });
  }
});
