/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../server/middleware";
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
        entityType: req.body.entity_type,
        entityId: req.body.entity_id
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
