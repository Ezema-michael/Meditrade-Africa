/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { collections } from './serverDb';

// ==========================================
// ZOD SCHEMAS FOR API INPUT VALIDATION
// ==========================================

// RegisterUserSchema only allows public roles: 'buyer' or 'seller'
export const RegisterUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['seller', 'buyer']),
  business_name: z.string().min(2, 'Business or hospital name required').optional(),
  state: z.string().optional(),
  address: z.string().optional()
}).strict();

export const SyncUserSchema = z.object({
  firebase_uid: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional()
}).strict();

// CreateListingSchema - privileged user/seller identity fields removed!
export const CreateListingSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  category_id: z.string().min(1, 'Category ID is required'),
  category_name: z.string().optional(),
  condition: z.enum(['new', 'used', 'refurbished', 'foreign_used']),
  price: z.union([z.number().positive(), z.string().transform(v => Number(v))]),
  currency: z.enum(['NGN', 'USD']).optional().default('NGN'),
  state: z.string().min(2, 'State is required'),
  description: z.string().optional(),
  image_url: z.string().optional(),
  technical_specs: z.record(z.string(), z.any()).optional(),
  warranty_months: z.union([z.number(), z.string()]).optional()
});

export const UpdateListingSchema = CreateListingSchema.partial();

export const CreateRfqSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  category_id: z.string().optional(),
  category_name: z.string().optional(),
  hospital_name: z.string().optional(),
  destination_state: z.string().optional(),
  quantity: z.union([z.number(), z.string()]).optional(),
  budget: z.union([z.number(), z.string()]).optional(),
  budget_ngn: z.union([z.number(), z.string()]).optional(),
  currency: z.string().optional(),
  urgency: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  description: z.string().min(2, 'Description is required'),
  buyer_contact: z.string().min(2, 'Buyer contact is required')
});

export const SubmitQuoteSchema = z.object({
  request_id: z.string().min(1, 'Request ID is required'),
  price: z.union([z.number(), z.string().transform(v => Number(v))]),
  message: z.string().optional(),
  availability: z.string().optional(),
  whatsapp_contact: z.string().optional(),
  offered_product: z.string().optional()
});

export const CreateEscrowSchema = z.object({
  listing_id: z.string().min(1, 'Listing ID is required'),
  amount: z.union([z.number(), z.string().transform(v => Number(v))]),
  buyer_name: z.string().optional(),
  buyer_email: z.string().optional(),
  assigned_engineer_id: z.string().optional()
});

export const ApplyFinancingSchema = z.object({
  equipment_id: z.string().min(1, 'Equipment ID is required'),
  hospital_name: z.string().min(2, 'Hospital name is required'),
  contact_email: z.string().email('Invalid email address').or(z.string()).optional(),
  contact_phone: z.string().optional(),
  partner_bank_id: z.string().min(1, 'Partner bank ID is required'),
  equipment_price: z.union([z.number(), z.string()]).optional(),
  down_payment: z.union([z.number(), z.string()]).optional(),
  tenure_months: z.union([z.number(), z.string()]).optional(),
  cac_registration: z.string().optional(),
  medical_license: z.string().optional(),
  monthly_patient_volume: z.union([z.number(), z.string()]).optional()
});

export const ReviewSchema = z.object({
  rating: z.union([z.number().min(1).max(5), z.string().transform(v => Number(v))]),
  comment: z.string().optional()
});

export const VerificationRequestSchema = z.object({
  cac_number: z.string().min(2, 'CAC registration number is required'),
  document_url: z.string().optional()
});

export const CreateOfferSchema = z.object({
  listing_id: z.string().min(1, 'Listing ID is required'),
  buyer_name: z.string().optional(),
  buyer_contact: z.string().optional(),
  amount: z.union([z.number(), z.string().transform(v => Number(v))]),
  currency: z.string().optional(),
  message: z.string().optional()
});

export const EngineerApplicationSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(5, 'Phone number is required'),
  specialty: z.string().min(2, 'Specialty is required'),
  years_experience: z.number().min(0),
  certification_body: z.string().optional(),
  coverage_states: z.array(z.string()).optional()
});

// ==========================================
// VALIDATION MIDDLEWARES
// ==========================================

export const validateBody = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'The submitted data is invalid.',
      details: result.error.issues.map(e => `${e.path.join('.') || 'body'}: ${e.message}`)
    });
  }
  req.validatedBody = result.data;
  next();
};

export const validateParams = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid route parameters.',
      details: result.error.issues.map(e => `${e.path.join('.') || 'param'}: ${e.message}`)
    });
  }
  req.validatedParams = result.data;
  next();
};

export const validateQuery = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid search query parameters.',
      details: result.error.issues.map(e => `${e.path.join('.') || 'query'}: ${e.message}`)
    });
  }
  req.validatedQuery = result.data;
  next();
};

// ==========================================
// ACCOUNT STATUS & ROLE AUTHORIZATION MIDDLEWARE
// ==========================================

export const requireActiveAccount = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  if (req.user.status === 'suspended' || req.user.status === 'disabled' || req.user.status === 'rejected') {
    return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'Your account is disabled or suspended.' });
  }
  next();
};

export const requireCompletedRegistration = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  if (req.user.role === 'guest' || req.user.status === 'pending_registration') {
    return res.status(403).json({
      error: 'ACCOUNT_REGISTRATION_REQUIRED',
      message: 'Complete your MediTrade account registration before using this feature.'
    });
  }
  next();
};

export const requireRole = (...allowedRoles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  if (req.user.role === 'guest' || req.user.status === 'pending_registration') {
    return res.status(403).json({
      error: 'ACCOUNT_REGISTRATION_REQUIRED',
      message: 'Complete your MediTrade account registration before using this feature.'
    });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'You are not authorized to perform this action.'
    });
  }
  next();
};

export const requireAdmin = requireRole('admin');

export const requireListingOwnerOrAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  if (req.user.role === 'admin') {
    const listing = collections.listings.find(l => l.id === req.params.id);
    if (!listing) return res.status(404).json({ error: 'NOT_FOUND', message: 'Listing not found' });
    req.targetListing = listing;
    return next();
  }

  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  const listing = collections.listings.find(l => l.id === req.params.id);

  if (!listing) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Listing not found' });
  }

  if (!seller || seller.id !== listing.seller_id) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'You are not authorized to perform this action.'
    });
  }

  req.targetListing = listing;
  next();
};

export const requireVendorOwnerOrAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  if (req.user.role === 'admin') {
    return next();
  }

  const vendorId = req.params.id;
  const seller = collections.sellers.find(s => s.id === vendorId);

  if (!seller || seller.user_id !== req.user.id) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'You are not authorized to perform this action.'
    });
  }

  next();
};

// ==========================================
// ASYNC ERROR HANDLER WRAPPER
// ==========================================

export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('API execution error:', err);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An unexpected error occurred.',
      correlationId: req.id || undefined
    });
  });
};
