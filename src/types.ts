/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'guest' | 'buyer' | 'seller' | 'admin' | 'super_admin';
export type ListingStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'expired';
export type RequestStatus = 'open' | 'fulfilled' | 'closed';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface Seller {
  id: string;
  user_id: string;
  business_name: string;
  contact_name: string;
  whatsapp_number: string;
  phone_number: string;
  email: string;
  state: string;
  city: string;
  verification_status: VerificationStatus;
  subscription_plan: 'free' | 'growth' | 'enterprise';
  logo_url?: string;
  active_listings_count: number;
  rating_placeholder: number;
  cac_number?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  icon?: string;
  is_active: boolean;
}

export interface Listing {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  slug: string;
  brand: string;
  model: string;
  condition: 'new' | 'used' | 'refurbished';
  price: number;
  currency: 'NGN' | 'USD';
  negotiable: boolean;
  country: string;
  state: string;
  city: string;
  description: string;
  status: ListingStatus;
  featured: boolean;
  stock_status: 'in_stock' | 'out_of_stock' | 'on_demand';
  view_count: number;
  whatsapp_click_count: number;
  images: string[];
  seller_name?: string;
  seller_whatsapp?: string;
  seller_verified?: boolean;
  is_ai_extracted?: boolean;
  spam_score?: number;
  spam_reasons?: string[];
  created_at: string;
  updated_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

export interface ProcurementRequest {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  quantity: number;
  budget: number;
  currency: 'NGN' | 'USD';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  country: string;
  state: string;
  city: string;
  description: string;
  status: RequestStatus;
  buyer_contact: string;
  created_at: string;
}

export interface ProcurementResponse {
  id: string;
  request_id: string;
  seller_id: string;
  listing_id?: string;
  price: number;
  message: string;
  availability: string;
  whatsapp_contact: string;
  seller_name?: string;
  offered_product?: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  listing_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  listing_title?: string;
}

export interface VerificationRequest {
  id: string;
  seller_id: string;
  business_name: string;
  cac_number: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: string; // JSON
  created_at: string;
}

export interface FirestoreNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Payment subscription architectures
export interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  features: string[];
  badge?: string;
}

export interface Subscription {
  id: string;
  seller_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'expired';
  current_period_start: string;
  current_period_end: string;
  payment_method?: 'paystack' | 'flutterwave' | 'stripe';
}

export interface Payment {
  id: string;
  subscription_id?: string;
  seller_id: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  gateway_reference: string;
  gateway: 'paystack' | 'flutterwave' | 'stripe';
  created_at: string;
}

export type LeadStatus = 'new' | 'discussion' | 'quote_sent' | 'won' | 'lost';

export interface Lead {
  id: string;
  seller_id: string;
  buyer_id: string;
  buyer_name: string;
  buyer_contact: string;
  title: string;
  type: 'listing_inquiry' | 'rfq_offer';
  source_id: string;
  status: LeadStatus;
  notes?: string;
  price_offered?: number;
  last_activity_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  lead_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

