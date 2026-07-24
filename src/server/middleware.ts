/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { getAuth } from "firebase-admin/auth";
import { collections } from "../lib/serverDb";

export const sanitizeText = (text: any): string => {
  if (typeof text !== 'string') return '';
  
  let cleaned = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  cleaned = cleaned.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  cleaned = cleaned.replace(/\bon[a-z]+\s*=\s*(['"])(?:\\\1|.)*?\1/gi, '');
  cleaned = cleaned.replace(/\bon[a-z]+\s*=\s*[^\s>]+/gi, '');
  
  cleaned = cleaned.replace(/href\s*=\s*(['"])\s*(javascript|vbscript|data):/gi, 'href=$1#');
  cleaned = cleaned.replace(/src\s*=\s*(['"])\s*(javascript|vbscript|data):/gi, 'src=$1#');
  
  cleaned = cleaned.replace(/<\/?([a-z1-6]+)\b[^>]*>/gi, (match, tag) => {
    const allowed = ['p', 'b', 'i', 'strong', 'em', 'br', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'span'];
    if (allowed.includes(tag.toLowerCase())) {
      return match.replace(/\bon[a-z]+\s*=/gi, 'disabled=');
    }
    return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });

  return cleaned.trim();
};

export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.substring(7);
    const decoded = await getAuth().verifyIdToken(token);

    req.auth = decoded;
    const uid = decoded.uid;
    const user = collections.users.find(u => u.firebase_uid === uid || u.id === uid || (decoded.email && u.email === decoded.email));
    req.user = user || {
      id: uid,
      firebase_uid: uid,
      email: decoded.email || '',
      role: 'seller',
      status: 'active'
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

export const uploadEngine = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/mpeg",
      "video/ogg",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Only standard images and videos are allowed."));
    }
  },
});

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Too many requests, please try again later." }
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});

export const criticalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Throttled: Too many critical requests from this IP, please try again after 5 minutes." }
});
