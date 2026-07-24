/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import path from "path";
import { requireAuth, uploadEngine } from "../server/middleware";
import { logActivity } from "../lib/auditLogger";

export const uploadRouter = Router();

uploadRouter.post("/api/upload", requireAuth, (req: any, res: any) => {
  uploadEngine.single("file")(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || "File upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }
    const sanitizedFilename = path.basename(req.file.filename);
    const fileUrl = `/uploads/${sanitizedFilename}`;
    logActivity(req.user.email, 'FILE_UPLOAD', 'Uploads', `Uploaded file: ${sanitizedFilename} (${req.file.mimetype}, ${req.file.size} bytes)`);
    res.json({
      success: true,
      url: fileUrl,
      filename: sanitizedFilename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  });
});
