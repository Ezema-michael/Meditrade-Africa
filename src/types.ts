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
  profile_image_url?: string;
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
  status?: 'active' | 'suspended';
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
  condition: 'new' | 'refurbished' | 'foreign_used' | 'local_used' | 'working_used' | 'used' | 'faulty' | 'parts_only' | 'scrap';
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
  phone_click_count?: number;
  images: string[];
  videos?: string[];
  links?: string[];
  seller_name?: string;
  seller_whatsapp?: string;
  seller_verified?: boolean;
  is_ai_extracted?: boolean;
  spam_score?: number;
  spam_reasons?: string[];
  listing_type?: 'fixed' | 'make_offer' | 'auction_parts_faulty' | 'scrap_salvage' | 'auction_only';
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  listing_id: string;
  listing_title: string;
  seller_id: string;
  buyer_id?: string;
  buyer_name: string;
  buyer_contact: string; // WhatsApp or email
  offer_amount: number;
  currency: 'NGN' | 'USD';
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'countered';
  counter_amount?: number;
  created_at: string;
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

export interface Engineer {
  id: string;
  user_id?: string;
  name: string;
  specialty: string;
  experience_years: number;
  phone: string;
  email: string;
  state: string;
  city: string;
  bio: string;
  avatar_url?: string;
  verified_status: 'verified' | 'unverified';
  average_rating: number;
  services_offered: string[];
  created_at: string;
}

export interface EngineerReview {
  id: string;
  engineer_id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_business: string;
  rating: number;
  comment: string;
  created_at: string;
}

export type EscrowStatus = 'initiated' | 'funds_deposited' | 'equipment_dispatched' | 'inspected_approved' | 'funds_released' | 'disputed' | 'refunded';

export interface EscrowDeal {
  id: string;
  listing_id: string;
  listing_title: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  seller_id: string;
  seller_name: string;
  amount: number;
  currency: string;
  escrow_fee: number;
  status: EscrowStatus;
  assigned_engineer_id?: string;
  assigned_engineer_name?: string;
  engineer_notes?: string;
  engineer_approved?: boolean;
  payment_reference?: string;
  delivery_tracking_no?: string;
  created_at: string;
  updated_at: string;
}

export type FinancingStatus = 'submitted' | 'under_review' | 'pre_approved' | 'approved' | 'disbursed' | 'rejected';

export interface LeaseFinancingApplication {
  id: string;
  buyer_id: string;
  hospital_name: string;
  contact_email: string;
  contact_phone: string;
  equipment_id: string;
  equipment_title: string;
  equipment_price: number;
  down_payment: number;
  financed_amount: number;
  tenure_months: number;
  monthly_repayment: number;
  partner_bank_id: string;
  partner_bank_name: string;
  cac_registration: string;
  medical_license: string;
  monthly_patient_volume: number;
  status: FinancingStatus;
  approval_notes?: string;
  created_at: string;
}

export interface FinancingPartner {
  id: string;
  name: string;
  logo_url: string;
  interest_rate_annual: number;
  max_tenure_months: number;
  min_down_payment_pct: number;
  description: string;
  badge: string;
}

export type InspectionStatus = 'pending_assignment' | 'scheduled' | 'in_progress' | 'passed' | 'failed_with_defects' | 'canceled';

export interface InspectionChecklistItem {
  id: string;
  label: string;
  category: 'sensor_calibration' | 'tube_head_voltage' | 'power_surge' | 'accessories' | 'safety';
  status: 'pending' | 'pass' | 'fail' | 'na';
  measured_value?: string;
  notes?: string;
}

export interface InspectionRequest {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_condition: string;
  listing_price: number;
  listing_currency: string;
  seller_id: string;
  seller_name: string;
  buyer_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  hospital_name: string;
  assigned_engineer_id: string;
  assigned_engineer_name: string;
  assigned_engineer_phone: string;
  inspection_location: string;
  scheduled_date: string;
  status: InspectionStatus;
  notes?: string;
  fee_amount: number;
  escrow_linked?: boolean;
  escrow_deal_id?: string;
  checklist: InspectionChecklistItem[];
  certificate_no?: string;
  engineer_verdict_notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type EquipmentLogisticsCategory = 
  | 'xray_ct_mri' 
  | 'ultrasound_echocardiogram' 
  | 'icu_beds_tables' 
  | 'lab_analyzers_coldchain' 
  | 'standard_clinical';

export interface LogisticsEstimateRequest {
  origin_state: string;
  origin_city?: string;
  destination_state: string;
  destination_city?: string;
  equipment_category: EquipmentLogisticsCategory;
  equipment_title?: string;
  equipment_value_ngn: number;
  weight_kg?: number;
  require_rigger_crane?: boolean;
  require_transit_insurance?: boolean;
  require_escort_vehicle?: boolean;
  require_biomed_specialist?: boolean;
  listing_id?: string;
  buyer_id?: string;
  buyer_name?: string;
  hospital_name?: string;
}

export interface LogisticsQuoteBreakdown {
  base_freight_ngn: number;
  specialized_packaging_ngn: number;
  distance_km: number;
  estimated_transit_hours: number;
  insurance_ngn: number;
  rigger_crane_ngn: number;
  escort_vehicle_ngn: number;
  biomed_specialist_ngn: number;
  waybill_tolls_ngn: number;
  total_logistics_cost_ngn: number;
  transit_type: string;
  recommended_vehicle: string;
  special_handling_notes: string[];
}

export interface LogisticsQuote extends LogisticsQuoteBreakdown {
  id: string;
  quote_number: string;
  listing_id?: string;
  listing_title?: string;
  origin_state: string;
  origin_city?: string;
  destination_state: string;
  destination_city?: string;
  equipment_category: EquipmentLogisticsCategory;
  equipment_value_ngn: number;
  buyer_id?: string;
  buyer_name?: string;
  hospital_name?: string;
  status: 'draft' | 'saved' | 'attached_to_checkout' | 'confirmed';
  created_at: string;
  expires_at: string;
}


