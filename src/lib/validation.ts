/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { collections } from './serverDb';

// ==========================================
// ZOD SCHEMAS FOR API INPUT VALIDATION
// ==========================================

export const SyncUserSchema = z.object({
  firebase_uid: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['seller', 'buyer', 'admin', 'engineer']).optional()
});

export const RegisterUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['seller', 'buyer', 'admin', 'engineer']).optional(),
  business_name: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional()
});

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
  warranty_months: z.union([z.number(), z.string()]).optional(),
  seller_id: z.string().optional(),
  seller_name: z.string().optional()
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
  request_id: z.string().optional(),
  seller_id: z.string().optional(),
  price: z.union([z.number(), z.string().transform(v => Number(v))]),
  message: z.string().optional(),
  availability: z.string().optional(),
  whatsapp_contact: z.string().optional(),
  offered_product: z.string().optional()
});

export const CreateEscrowSchema = z.object({
  listing_id: z.string().min(1, 'Listing ID is required'),
  buyer_id: z.string().optional(),
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
  buyer_id: z.string().optional(),
  cac_registration: z.string().optional(),
  medical_license: z.string().optional(),
  monthly_patient_volume: z.union([z.number(), z.string()]).optional()
});

export const ReviewSchema = z.object({
  rating: z.union([z.number().min(1).max(5), z.string().transform(v => Number(v))]),
  reviewer_name: z.string().optional(),
  comment: z.string().optional()
});

export const VerificationRequestSchema = z.object({
  seller_id: z.string().optional(),
  cac_number: z.string().min(2, 'CAC registration number is required'),
  document_url: z.string().optional()
});

export const CreateOfferSchema = z.object({
  listing_id: z.string().min(1, 'Listing ID is required'),
  buyer_id: z.string().optional(),
  buyer_name: z.string().optional(),
  buyer_contact: z.string().optional(),
  offer_amount: z.union([z.number(), z.string().transform(v => Number(v))]).optional(),
  amount: z.union([z.number(), z.string().transform(v => Number(v))]).optional(),
  currency: z.string().optional(),
  message: z.string().optional(),
  notes: z.string().optional()
});

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

export const validateBody = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation error',
      details: result.error.issues.map(e => `${e.path.join('.') || 'body'}: ${e.message}`)
    });
  }
  req.validatedBody = result.data;
  next();
};

// ==========================================
// ROLE & OWNERSHIP AUTHORIZATION MIDDLEWARE
// ==========================================

export const requireRole = (...allowedRoles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: `Forbidden: Requires one of roles: ${allowedRoles.join(', ')}` });
  }
  next();
};

export const requireAdmin = requireRole('admin');

export const requireListingOwnerOrAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const listingId = req.params.id;
  const listing = collections.listings.find(l => l.id === listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  if (req.user.role === 'admin') {
    req.targetListing = listing;
    return next();
  }
  const seller = collections.sellers.find(s => s.user_id === req.user.id || s.id === listing.seller_id);
  if (!seller || (seller.user_id !== req.user.id && listing.seller_id !== seller.id)) {
    return res.status(403).json({ error: 'Forbidden: You do not own this listing' });
  }
  req.targetListing = listing;
  next();
};

export const requireVendorOwnerOrAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const vendorId = req.params.id;
  if (req.user.role === 'admin') {
    return next();
  }
  const seller = collections.sellers.find(s => s.id === vendorId || s.user_id === req.user.id);
  if (!seller || seller.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: You do not own this vendor profile' });
  }
  next();
};

// ==========================================
// ASYNC ERROR HANDLER WRAPPER
// ==========================================

export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('API execution error:', err);
    res.status(500).json({ error: 'Internal Server Error: ' + (err.message || 'Operation failed') });
  });
};
