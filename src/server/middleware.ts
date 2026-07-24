/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { adminAuth } from "./config/firebaseAdmin";
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

export const correlationIdMiddleware = (req: any, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  req.id = reqId;
  res.setHeader('x-request-id', reqId);
  next();
};

export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Bearer token missing.'
    });
  }

  const token = header.substring(7);

  // Local development / testing auth bypass guard (STRICTLY GUARDED FROM PRODUCTION)
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ENABLE_DEV_AUTH_BYPASS === 'true'
  ) {
    if (token === 'dev-admin-token') {
      req.auth = { uid: 'f-uid-3', email: 'ezemamichael@gmail.com' };
      req.user = collections.users.find(u => u.id === 'usr-3') || {
        id: 'usr-3',
        firebase_uid: 'f-uid-3',
        email: 'ezemamichael@gmail.com',
        role: 'admin',
        status: 'active',
        businessName: 'MediTrade Development Admin'
      };
      return next();
    } else if (token === 'dev-seller1-token') {
      req.auth = { uid: 'f-uid-1', email: 'chidi.obi@medlink.com.ng' };
      req.user = collections.users.find(u => u.id === 'usr-1') || {
        id: 'usr-1',
        firebase_uid: 'f-uid-1',
        email: 'chidi.obi@medlink.com.ng',
        role: 'seller',
        status: 'active'
      };
      return next();
    } else if (token === 'dev-seller2-token') {
      req.auth = { uid: 'f-uid-2', email: 'fatima@westafricamed.com' };
      req.user = collections.users.find(u => u.id === 'usr-2') || {
        id: 'usr-2',
        firebase_uid: 'f-uid-2',
        email: 'fatima@westafricamed.com',
        role: 'seller',
        status: 'active'
      };
      return next();
    } else if (token === 'dev-buyer-token') {
      req.auth = { uid: 'f-uid-5', email: 'buyer@riversidememorial.org' };
      req.user = collections.users.find(u => u.id === 'usr-5') || {
        id: 'usr-5',
        firebase_uid: 'f-uid-5',
        email: 'buyer@riversidememorial.org',
        role: 'buyer',
        status: 'active'
      };
      return next();
    } else if (token === 'dev-pending-token') {
      req.auth = { uid: 'f-uid-pending', email: 'pending@example.com' };
      req.user = {
        id: 'usr-pending',
        firebase_uid: 'f-uid-pending',
        email: 'pending@example.com',
        role: 'guest',
        status: 'pending_registration'
      };
      return next();
    }
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.auth = decoded;
    const uid = decoded.uid;
    const user = collections.users.find(
      u => u.firebase_uid === uid || u.id === uid || (decoded.email && u.email === decoded.email)
    );

    if (user) {
      if (user.status === 'disabled' || user.status === 'suspended') {
        return res.status(403).json({
          error: 'ACCOUNT_SUSPENDED',
          message: 'Your account is disabled or suspended.'
        });
      }
      req.user = user;
    } else {
      // Unregistered user - set role to 'guest' and status to 'pending_registration'
      // DO NOT automatically assign 'seller' role or create a seller profile!
      req.user = {
        id: uid,
        firebase_uid: uid,
        email: decoded.email || null,
        role: 'guest',
        status: 'pending_registration'
      };
    }
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired Firebase authentication token.'
    });
  }
};

export const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'You are not authorized to perform this action.'
    });
  }
  next();
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "TOO_MANY_REQUESTS", message: "Too many requests, please try again later." }
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "TOO_MANY_REQUESTS", message: "Too many requests from this IP, please try again after 15 minutes." }
});

export const criticalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "TOO_MANY_REQUESTS", message: "Throttled: Too many critical requests from this IP, please try again after 5 minutes." }
});

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.code || 'SERVER_ERROR',
    message: err.message || 'An unexpected server error occurred.',
    correlationId: (req as any).id
  });
};
