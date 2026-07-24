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
  getFileMetadataByObjectKey,
  getFileMetadataById,
  deleteFileMetadata
} from "../lib/serverDb";
import { logActivity, logAuditEvent } from "../lib/auditLogger";
import { validateAndProcessFile, MAX_FILES_PER_UPLOAD } from "../lib/fileValidator";
import { storageService } from "../server/services/storageService";

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
      const isEngineer = deal.assigned_engineer_id && collections.engineers.some(e => e.id === deal.assigned_engineer_id && e.user_id === user.id);
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

// Transactional File Upload POST Endpoint
uploadRouter.post("/api/upload", requireAuth, memoryUpload.array("file", MAX_FILES_PER_UPLOAD), async (req: any, res: any) => {
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

    for (const file of files) {
      const validation = await validateAndProcessFile(
        file.buffer,
        file.mimetype || '',
        file.originalname || 'upload'
      );

      if (!validation.valid) {
        return res.status(400).json({
          error: "INVALID_FILE_TYPE",
          message: validation.error || "File validation failed."
        });
      }

      // Step 1: Upload binary object to storage engine
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

      // Step 2: Transactional persistence of metadata
      try {
        await saveFileMetadata(fullFileMetadata);
      } catch (metaErr) {
        // Compensating Transaction: Roll back uploaded storage file
        console.error("File metadata persistence failed. Initiating compensating cleanup:", metaErr);
        const rollbackSuccess = await storageService.deleteFile(storageMeta.objectKey);
        
        logAuditEvent({
          actor: req.user.email || req.user.id,
          action: 'FILE_UPLOAD_ROLLBACK',
          category: 'Storage',
          description: `Compensating rollback ${rollbackSuccess ? 'SUCCEEDED' : 'FAILED'} for object ${storageMeta.objectKey}`,
          metadata: { objectKey: storageMeta.objectKey, rollbackSuccess }
        });

        return res.status(500).json({
          error: "FILE_METADATA_PERSISTENCE_FAILED",
          message: "Failed to establish durable file metadata record. Upload rolled back."
        });
      }

      uploadResults.push({
        id: fullFileMetadata.id,
        url: storageMeta.publicUrl,
        filename: fullFileMetadata.originalFilename,
        mimetype: fullFileMetadata.detectedMimeType,
        size: fullFileMetadata.size,
        objectKey: fullFileMetadata.objectKey,
        visibility: fullFileMetadata.visibility
      });

      logActivity(
        req.user.email || req.user.id,
        'FILE_UPLOAD',
        'Uploads',
        `Uploaded file: ${fullFileMetadata.originalFilename} (${fullFileMetadata.detectedMimeType}, ${fullFileMetadata.size} bytes, visibility: ${fullFileMetadata.visibility})`
      );
    }

    if (uploadResults.length === 1) {
      return res.json({
        success: true,
        ...uploadResults[0]
      });
    }

    res.json({
      success: true,
      files: uploadResults
    });
  } catch (err: any) {
    console.error("Upload route error:", err);
    res.status(500).json({
      error: "UPLOAD_ERROR",
      message: "An error occurred while processing the file upload."
    });
  }
});

/**
 * Authenticated Private Document Download GET Route by object key (?key=...)
 */
uploadRouter.get("/api/files/download", requireAuth, async (req: any, res: any) => {
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
    const metadata = await getFileMetadataByObjectKey(objectKey);

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
 * Download file by Metadata ID route
 */
uploadRouter.get("/api/files/:fileId/download", requireAuth, async (req: any, res: any) => {
  try {
    const fileId = req.params.fileId;
    const metadata = await getFileMetadataById(fileId);

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
    const metadata = await getFileMetadataById(fileId);

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
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(fullPath);
  } catch (err: any) {
    console.error("Public file route error:", err);
    res.status(500).json({ error: "STORAGE_ERROR", message: "Failed to serve public file." });
  }
});
