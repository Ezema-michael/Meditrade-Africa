/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../server/middleware";
import { collections } from "../server/state";
import { logActivity } from "../lib/auditLogger";
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

/**
 * Validate upload entity ownership helper
 */
export function validateUploadEntityOwnership(user: any, entityType?: string, entityId?: string): { allowed: boolean; message?: string } {
  if (!entityType || !entityId) {
    return { allowed: true };
  }

  // Admin users have full platform authority
  if (user.role === 'admin') {
    return { allowed: true };
  }

  const sanitizedType = entityType.toLowerCase().trim();

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
      return { allowed: true };
  }
}

// Upload file POST endpoint
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

    // Entity ownership validation
    const entityType = req.body.entity_type;
    const entityId = req.body.entity_id;
    const ownershipCheck = validateUploadEntityOwnership(req.user, entityType, entityId);
    if (!ownershipCheck.allowed) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: ownershipCheck.message || "Ownership validation failed for specified entity."
      });
    }

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

      const metadata = await storageService.uploadFile({
        buffer: validation.processedBuffer || file.buffer,
        originalFilename: file.originalname || 'file',
        mimeType: file.mimetype,
        detectedMimeType: validation.detectedMime,
        userId: req.user.id,
        entityType,
        entityId
      });

      uploadResults.push({
        url: metadata.publicUrl,
        filename: metadata.originalFilename,
        mimetype: metadata.detectedMimeType,
        size: metadata.size,
        objectKey: metadata.objectKey
      });

      logActivity(
        req.user.email || req.user.id,
        'FILE_UPLOAD',
        'Uploads',
        `Uploaded file: ${metadata.originalFilename} (${metadata.detectedMimeType}, ${metadata.size} bytes)`
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
      message: err.message || "An unexpected error occurred during file upload."
    });
  }
});

/**
 * Authenticated Private Document Download GET Route
 */
uploadRouter.get("/api/files/download", requireAuth, async (req: any, res: any) => {
  try {
    const rawKey = req.query.key as string;
    if (!rawKey || typeof rawKey !== 'string') {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Missing document key query parameter." });
    }

    const key = decodeURIComponent(rawKey);
    const normalizedKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, '');

    if (!normalizedKey.startsWith('uploads/')) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Invalid document path parameter." });
    }

    if (process.env.STORAGE_PROVIDER === 'gcs' && process.env.GCS_BUCKET_NAME) {
      const signedUrl = await storageService.getSignedUrl(normalizedKey, 15);
      return res.redirect(signedUrl);
    }

    const fullPath = path.join(process.cwd(), normalizedKey);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Private document not found." });
    }

    res.sendFile(fullPath);
  } catch (err: any) {
    console.error("Download route error:", err);
    res.status(500).json({ error: "STORAGE_ERROR", message: "Failed to serve requested document." });
  }
});
