/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { NIGERIAN_STATES, CATEGORIES, INITIAL_SELLERS, INITIAL_LISTINGS, INITIAL_PROCUREMENT_REQUESTS, INITIAL_ENGINEERS, INITIAL_ENGINEER_REVIEWS, INITIAL_OFFERS } from "./src/data";
import { Listing, Seller, Category, ProcurementRequest, ProcurementResponse, Report, VerificationRequest, FirestoreNotification, Lead, ChatMessage, Engineer, EngineerReview, Offer } from "./src/types";
import rateLimit from "express-rate-limit";
import fs from "fs";
import multer from "multer";

const app = express();
const PORT = 3000;

// Trust reverse proxy to obtain accurate IP addresses in Cloud Run / Nginx setups
app.set("trust proxy", 1);

app.use(express.json());

// Serve uploads statically so they can be accessed via URL
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Global Rate Limiting configurations for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});

const criticalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 25, // Limit each IP to 25 critical requests (AI extraction, offer creation) per 5 mins
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Throttled: Too many critical requests from this IP, please try again after 5 minutes." }
});

// Apply global rate limiting to all api endpoints
app.use("/api/", apiLimiter);

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Simulated In-Memory Database (preserving data during the active web session)
let usersCollection = [
  { id: 'usr-1', firebase_uid: 'f-uid-1', email: 'chidi.obi@medlink.com.ng', phone: '+2348031234567', role: 'seller', status: 'active' },
  { id: 'usr-2', firebase_uid: 'f-uid-2', email: 'fatima@westafricamed.com', phone: '+2348123456789', role: 'seller', status: 'active' },
  { id: 'usr-3', firebase_uid: 'f-uid-3', email: 'ezemamichael@gmail.com', phone: '+2348033334444', role: 'admin', status: 'active' },
  { id: 'usr-4', firebase_uid: 'f-uid-4', email: 'sales@lagomsconsumables.com.ng', phone: '+2347055555123', role: 'seller', status: 'active' },
  { id: 'usr-5', firebase_uid: 'f-uid-5', email: 'buyer@riversidememorial.org', phone: '+2348055554444', role: 'buyer', status: 'active' }
];

let sellersCollection: Seller[] = [...INITIAL_SELLERS];
let categoriesCollection: Category[] = [...CATEGORIES];
let listingsCollection: Listing[] = [...INITIAL_LISTINGS];
let procurementRequestsCollection: ProcurementRequest[] = [...INITIAL_PROCUREMENT_REQUESTS];
let procurementResponsesCollection: ProcurementResponse[] = [
  {
    id: 'resp-1',
    request_id: 'req-1',
    seller_id: 'sel-1',
    listing_id: 'list-1',
    price: 1350000,
    message: 'We have 3 units of extremely clean, US-used Mindray patient monitors ready for delivery inside Abuja tomorrow. We can discount slightly if you pack all three.',
    availability: 'Immediate delivery',
    whatsapp_contact: '+2348031234567',
    seller_name: 'MedLink Diagnostics Ltd',
    offered_product: 'Mindray uMec 12 Patient Monitor',
    created_at: '2026-05-27T10:00:00Z'
  }
];

let favoritesCollection: { id: string; user_id: string; listing_id: string; created_at: string }[] = [];
let reportsCollection: Report[] = [];
let verificationRequestsCollection: VerificationRequest[] = [];
let engineersCollection: Engineer[] = [...INITIAL_ENGINEERS];
let engineerReviewsCollection: EngineerReview[] = [...INITIAL_ENGINEER_REVIEWS];
let offersCollection: Offer[] = [...INITIAL_OFFERS];

let inspectionRequestsCollection: any[] = [
  {
    id: 'insp-101',
    listing_id: 'list-2',
    listing_title: 'GE Voluson P8 3D/4D Ultrasound Machine',
    listing_condition: 'foreign_used',
    listing_price: 14500000,
    listing_currency: 'NGN',
    seller_id: 'sel-2',
    seller_name: 'West Africa Medical Systems',
    buyer_id: 'usr-5',
    buyer_name: 'Dr. Fatima Bello',
    buyer_phone: '+2348055554444',
    buyer_email: 'buyer@riversidememorial.org',
    hospital_name: 'Riverside Memorial Hospital',
    assigned_engineer_id: 'eng-2',
    assigned_engineer_name: 'Engr. Fatima Bello (Imaging Specialist)',
    assigned_engineer_phone: '+2348039998877',
    inspection_location: 'Plot 14, Victoria Island Industrial Way, Lagos',
    scheduled_date: '2026-07-24',
    status: 'passed',
    notes: 'Buyer requested pre-purchase engineering audit on Tokunbo ultrasound before releasing payment.',
    fee_amount: 85000,
    escrow_linked: true,
    escrow_deal_id: 'esc-102',
    checklist: [
      { id: 'chk-1', label: 'Transducer Crystal Element & Probe Signal Output Test', category: 'sensor_calibration', status: 'pass', measured_value: '3D/4D Array 99.4% Signal Homogeneity', notes: 'Zero crystal dropouts detected.' },
      { id: 'chk-2', label: 'HV Generator & Power Supply Voltage Stability Check', category: 'tube_head_voltage', status: 'pass', measured_value: '220V +/- 1.5% Surge Tolerant', notes: 'Internal surge suppressors operational.' },
      { id: 'chk-3', label: 'West Africa Power Grid Surge & UPS Handover Test', category: 'power_surge', status: 'pass', measured_value: '15 min battery hold', notes: 'UPS cutover seamless.' },
      { id: 'chk-4', label: 'Cables, Connectors & Accessories Audit', category: 'accessories', status: 'pass', measured_value: '3 Probes + Gel Heater Present', notes: 'Convex, Linear, and Endovaginal probes included.' },
      { id: 'chk-5', label: 'Electrical Safety Grounding & Thermal Diagnostic', category: 'safety', status: 'pass', measured_value: '<0.1 Ohm Ground Impedance', notes: 'Safe for continuous clinical operation.' }
    ],
    certificate_no: 'CERT-BIOMED-2026-8819',
    engineer_verdict_notes: 'Passed complete pre-purchase calibration audit. Equipment is in pristine mechanical and electronic working order.',
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];


// Sourcing analytics to capture hospital search demands and patterns for administrators context
let searchLogsCollection = [
  { id: 'search-1', query: 'Ultrasound machine', category_id: 'cat-1', category_name: 'Ultrasound Machines', state: 'Lagos', condition: 'used', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), results_count: 3 },
  { id: 'search-2', query: 'Mindray uMec 12', category_id: 'cat-7', category_name: 'Patient Monitors', state: 'Abuja', condition: 'used', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), results_count: 1 },
  { id: 'search-3', query: 'Defibrillator Unit', category_id: 'cat-5', category_name: 'Theatre Equipment', state: 'Rivers', condition: 'new', timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), results_count: 0 },
  { id: 'search-4', query: 'Autoclave sterilizer', category_id: 'cat-13', category_name: 'Autoclaves & Sterilizers', state: 'Lagos', condition: 'refurbished', timestamp: new Date(Date.now() - 3600000 * 18).toISOString(), results_count: 2 },
  { id: 'search-5', query: 'Dental Chair', category_id: 'cat-14', category_name: 'Dental Equipment', state: 'Kano', condition: 'new', timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), results_count: 0 },
  { id: 'search-6', query: 'Examination light', category_id: 'cat-8', category_name: 'Hospital Beds & Furniture', state: 'Rivers', condition: 'new', timestamp: new Date(Date.now() - 3600000 * 30).toISOString(), results_count: 0 },
  { id: 'search-7', query: 'Philip ECG', category_id: 'cat-7', category_name: 'Patient Monitors', state: 'Kano', condition: 'used', timestamp: new Date(Date.now() - 3600000 * 36).toISOString(), results_count: 1 },
  { id: 'search-8', query: 'GE Voluson E8', category_id: 'cat-1', category_name: 'Ultrasound Machines', state: 'Lagos', condition: 'refurbished', timestamp: new Date(Date.now() - 3600000 * 42).toISOString(), results_count: 2 },
  { id: 'search-9', query: 'Tuttnauer autoclave', category_id: 'cat-13', category_name: 'Autoclaves & Sterilizers', state: 'Abuja', condition: 'refurbished', timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), results_count: 0 },
  { id: 'search-10', query: 'Latex Gloves surgical', category_id: 'cat-10', category_name: 'Gloves', state: 'Lagos', condition: 'new', timestamp: new Date(Date.now() - 3600000 * 54).toISOString(), results_count: 10 }
];
let activityLogsCollection: { id: string; actor: string; action: string; category: string; description: string; timestamp: string }[] = [
  { id: 'act-1', actor: 'System', action: 'INIT', category: 'Database', description: 'Database and simulated nodes booted successfully.', timestamp: new Date().toISOString() }
];

let interactionLogsCollection: any[] = [
  { id: 'int-1', action_type: 'whatsapp_click', listing_id: 'list-1', listing_title: 'Mindray uMec 12 Patient Monitor', seller_id: 'sel-1', seller_name: 'MedLink Diagnostics Ltd', user_info: 'Riverside Memorial Hospital (Dr. Kalu)', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'int-2', action_type: 'call_click', listing_id: 'list-2', listing_title: 'GE Voluson P8 3D/4D Ultrasound Machine', seller_id: 'sel-2', seller_name: 'West Africa Medical Systems', user_info: 'St. Nicholas Hospital Purchaser', timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'int-3', action_type: 'view_details', listing_id: 'list-3', listing_title: 'Shimadzu MobileArt Portable X-Ray', seller_id: 'sel-1', seller_name: 'MedLink Diagnostics Ltd', user_info: 'Enugu State Teaching Hospital Procurement', timestamp: new Date(Date.now() - 3600000 * 6).toISOString() },
  { id: 'int-4', action_type: 'whatsapp_click', listing_id: 'list-4', listing_title: 'Mindray BeneVision N17 Patient Monitor', seller_id: 'sel-1', seller_name: 'MedLink Diagnostics Ltd', user_info: 'Nisa Garki Hospital Abuja', timestamp: new Date(Date.now() - 3600000 * 10).toISOString() },
  { id: 'int-5', action_type: 'rfq_submit', listing_id: 'list-1', listing_title: 'Patient Monitor Supply RFQ', seller_id: 'sel-1', seller_name: 'MedLink Diagnostics Ltd', user_info: 'Federal Medical Centre Jabi', timestamp: new Date(Date.now() - 3600000 * 15).toISOString() }
];

let notificationsCollection: FirestoreNotification[] = [
  {
    id: 'notif-1',
    user_id: 'usr-1',
    type: 'listing_approved',
    title: 'Listing Approved!',
    message: 'Your listing "Mindray uMec 12 Patient Monitor" has been verified by our clinical desk and is now live.',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'notif-2',
    user_id: 'usr-3',
    type: 'admin_review',
    title: 'New Listing Pending Review',
    message: 'Tuttnauer tabletop autoclave listing uploaded by MedLink requires verification.',
    read: false,
    created_at: new Date().toISOString()
  }
];

let leadsCollection: Lead[] = [
  {
    id: 'lead-1',
    seller_id: 'sel-1', // MedLink Diagnostics Ltd
    buyer_id: 'usr-5', // Riverside Memorial Hospital
    buyer_name: 'Riverside Memorial Hospital',
    buyer_contact: 'buyer@riversidememorial.org (+2348055554444)',
    title: 'Mindray uMec 12 Patient Monitor',
    type: 'rfq_offer',
    source_id: 'req-1',
    status: 'discussion',
    notes: 'Hospital purchaser Fatima is interested in our 6-month warranty and rapid Abuja courier dispatch.',
    price_offered: 1350000,
    last_activity_at: new Date(Date.now() - 1200000).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'lead-2',
    seller_id: 'sel-1',
    buyer_id: 'usr-5',
    buyer_name: 'Riverside Memorial Hospital',
    buyer_contact: 'buyer@riversidememorial.org',
    title: 'General Autoclave Sourcing Inquiry',
    type: 'listing_inquiry',
    source_id: 'list-3',
    status: 'new',
    notes: 'Buyer requested detailed brochure and technical calibration parameters.',
    price_offered: 1100000,
    last_activity_at: new Date(Date.now() - 7200000).toISOString(),
    created_at: new Date(Date.now() - 7200000).toISOString()
  }
];

let chatMessagesCollection: ChatMessage[] = [
  {
    id: 'msg-1',
    lead_id: 'lead-1',
    sender_id: 'usr-1',
    sender_name: 'MedLink Diagnostics Ltd (Chidi Obi)',
    message: 'Hello, we noticed your sourcing request for patient monitors. We have 3 units of extremely clean, US-used Mindray patient monitors ready for delivery inside Abuja tomorrow. We can discount slightly if you pack all three.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'msg-2',
    lead_id: 'lead-1',
    sender_id: 'usr-5',
    sender_name: 'Riverside Memorial Hospital (Fatima)',
    message: 'Thanks for reaching out Chidi. Do you offer warranty coverage on these used monitors?',
    created_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'msg-3',
    lead_id: 'lead-1',
    sender_id: 'usr-1',
    sender_name: 'MedLink Diagnostics Ltd (Chidi Obi)',
    message: 'Yes, we provide 6 months dealer warranty on parts and servicing. We also have a calibration lab in Lagos.',
    created_at: new Date(Date.now() - 1200000).toISOString()
  }
];

let escrowDealsCollection: any[] = [
  {
    id: 'esc-101',
    listing_id: 'list-1',
    listing_title: 'Mindray uMec 12 Patient Monitor',
    buyer_id: 'usr-5',
    buyer_name: 'Riverside Memorial Hospital',
    buyer_email: 'buyer@riversidememorial.org',
    seller_id: 'sel-1',
    seller_name: 'MedLink Diagnostics Ltd',
    amount: 1350000,
    currency: 'NGN',
    escrow_fee: 27000,
    status: 'inspected_approved',
    assigned_engineer_id: 'eng-1',
    assigned_engineer_name: 'Engr. Emeka Okafor (Biomedical Lead)',
    engineer_notes: 'Full functional test complete. ECG sensors, NIBP cuff, and SPO2 probe calibrated to ISO standards.',
    engineer_approved: true,
    payment_reference: 'ESC-2026-90812',
    delivery_tracking_no: 'GIG-MED-9921',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'esc-102',
    listing_id: 'list-2',
    listing_title: 'GE Voluson P8 3D/4D Ultrasound Machine',
    buyer_id: 'usr-5',
    buyer_name: 'St. Nicholas Hospital Purchaser',
    buyer_email: 'procurement@stnicholas.ng',
    seller_id: 'sel-2',
    seller_name: 'West Africa Medical Systems',
    amount: 14500000,
    currency: 'NGN',
    escrow_fee: 290000,
    status: 'funds_deposited',
    assigned_engineer_id: 'eng-2',
    assigned_engineer_name: 'Engr. Fatima Bello (Imaging Specialist)',
    payment_reference: 'ESC-2026-44120',
    delivery_tracking_no: 'DHL-NIG-8801',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'esc-103',
    listing_id: 'list-3',
    listing_title: 'Shimadzu MobileArt Portable X-Ray',
    buyer_id: 'usr-5',
    buyer_name: 'Enugu State Teaching Hospital',
    buyer_email: 'purchasing@esth.gov.ng',
    seller_id: 'sel-1',
    seller_name: 'MedLink Diagnostics Ltd',
    amount: 11000000,
    currency: 'NGN',
    escrow_fee: 220000,
    status: 'funds_released',
    assigned_engineer_id: 'eng-1',
    assigned_engineer_name: 'Engr. Emeka Okafor',
    engineer_notes: 'X-Ray tube radiation output verified and safe.',
    engineer_approved: true,
    payment_reference: 'ESC-2026-11029',
    delivery_tracking_no: 'MED-LOG-5510',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

let financingPartnersCollection: any[] = [
  {
    id: 'fin-partner-1',
    name: 'Access Bank MedPay Asset Finance',
    logo_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=120',
    interest_rate_annual: 18.0,
    max_tenure_months: 36,
    min_down_payment_pct: 10,
    description: 'Specialized healthcare equipment leasing program for registered clinics, diagnostic centers, and private hospitals.',
    badge: 'Preferred Commercial Partner'
  },
  {
    id: 'fin-partner-2',
    name: 'Sterling Bank HealthCare Lease',
    logo_url: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=120',
    interest_rate_annual: 16.5,
    max_tenure_months: 36,
    min_down_payment_pct: 15,
    description: 'Low interest medical equipment financing with rapid 48-hour credit pre-qualification for verified CAC entities.',
    badge: 'Fast 48hr Approval'
  },
  {
    id: 'fin-partner-3',
    name: 'GTBank Medical Equipment Leasing',
    logo_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=120',
    interest_rate_annual: 17.5,
    max_tenure_months: 24,
    min_down_payment_pct: 10,
    description: 'Asset-backed leasing using equipment as collateral. No additional real estate collateral required for items up to ₦50M.',
    badge: 'No Collateral Required'
  },
  {
    id: 'fin-partner-4',
    name: 'Sahel Capital Health Infrastructure Fund',
    logo_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120',
    interest_rate_annual: 14.0,
    max_tenure_months: 48,
    min_down_payment_pct: 20,
    description: 'Impact investment fund focused on expanding maternal and diagnostic imaging infrastructure across Sub-Saharan Africa.',
    badge: 'Impact Fund Special Rate'
  }
];

let financingApplicationsCollection: any[] = [
  {
    id: 'app-901',
    buyer_id: 'usr-5',
    hospital_name: 'Riverside Memorial Hospital Ltd',
    contact_email: 'buyer@riversidememorial.org',
    contact_phone: '+2348055554444',
    equipment_id: 'list-2',
    equipment_title: 'GE Voluson P8 3D/4D Ultrasound Machine',
    equipment_price: 14500000,
    down_payment: 2900000,
    financed_amount: 11600000,
    tenure_months: 24,
    monthly_repayment: 574200,
    partner_bank_id: 'fin-partner-2',
    partner_bank_name: 'Sterling Bank HealthCare Lease',
    cac_registration: 'RC-998231',
    medical_license: 'MDCN-HOSP-2024-88',
    monthly_patient_volume: 450,
    status: 'pre_approved',
    approval_notes: 'Pre-approval granted subject to physical site inspection of the radiology bay at Riverside Memorial.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'app-902',
    buyer_id: 'usr-5',
    hospital_name: 'Enugu State Teaching Hospital Procurement',
    contact_email: 'purchasing@esth.gov.ng',
    contact_phone: '+2348033332211',
    equipment_id: 'list-4',
    equipment_title: 'Mindray BeneVision N17 Patient Monitor System',
    equipment_price: 3800000,
    down_payment: 380000,
    financed_amount: 3420000,
    tenure_months: 12,
    monthly_repayment: 311000,
    partner_bank_id: 'fin-partner-1',
    partner_bank_name: 'Access Bank MedPay Asset Finance',
    cac_registration: 'ESTH-GOV-001',
    medical_license: 'MDCN-GOV-9012',
    monthly_patient_volume: 1200,
    status: 'submitted',
    approval_notes: 'Underwriting desk reviewing government budget line allocation.',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString()
  }
];


// Helper to log user audits
const logActivity = (actor: string, action: string, category: string, description: string) => {
  activityLogsCollection.unshift({
    id: `act-${Date.now()}`,
    actor,
    action,
    category,
    description,
    timestamp: new Date().toISOString()
  });
};

// Input Sanitizer to prevent XSS & Injection attacks (XSS / Prompt Injection mitigation)
const sanitizeText = (text: any): string => {
  if (typeof text !== 'string') return '';
  
  // 1. Remove dangerous HTML tags (script, iframe, object, embed, style)
  let cleaned = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  cleaned = cleaned.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // 2. Remove inline event handlers (on* attributes like onload, onerror, onclick, etc.)
  cleaned = cleaned.replace(/\bon[a-z]+\s*=\s*(['"])(?:\\\1|.)*?\1/gi, '');
  cleaned = cleaned.replace(/\bon[a-z]+\s*=\s*[^\s>]+/gi, '');
  
  // 3. Prevent javascript: / vbscript: / data: pseudo-protocol links
  cleaned = cleaned.replace(/href\s*=\s*(['"])\s*(javascript|vbscript|data):/gi, 'href=$1#');
  cleaned = cleaned.replace(/src\s*=\s*(['"])\s*(javascript|vbscript|data):/gi, 'src=$1#');
  
  // 4. Escape general dangerous HTML tags but keep safe ones
  cleaned = cleaned.replace(/<\/?([a-z1-6]+)\b[^>]*>/gi, (match, tag) => {
    const allowed = ['p', 'b', 'i', 'strong', 'em', 'br', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'span'];
    if (allowed.includes(tag.toLowerCase())) {
      return match.replace(/\bon[a-z]+\s*=/gi, 'disabled=');
    }
    return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });

  return cleaned.trim();
};

// Authentication & Session Validation Middleware (Privilege Escalation mitigation)
const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing authorization session token" });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token is empty" });
  }

  // Support decoding standard Firebase Auth JWT or direct UID
  let uid = token;
  if (token.includes('.')) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        Buffer.from(base64, 'base64')
          .toString()
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      uid = parsed.uid || parsed.sub || token;
    } catch (e) {
      // Fallback
    }
  }

  // Find user by either firebase_uid or id
  const user = usersCollection.find(u => u.id === uid || u.firebase_uid === uid);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User session invalid or expired" });
  }

  req.user = user;
  next();
};

// ==========================================
// FILE UPLOAD ENGINE (MULTER)
// ==========================================

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

const uploadEngine = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
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

// File upload endpoint (supports product images, videos, and profile logo/avatars)
app.post("/api/upload", (req: any, res: any) => {
  uploadEngine.single("file")(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || "File upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  });
});

// ==========================================
// API ENDPOINTS
// ==========================================

// Auth: Sync user
app.post("/api/auth/sync-user", (req, res) => {
  const { firebase_uid, email, phone, role } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  let user = usersCollection.find(u => u.firebase_uid === firebase_uid || u.email === email);
  if (!user) {
    user = {
      id: `usr-${Date.now()}`,
      firebase_uid: firebase_uid || `f-mock-${Date.now()}`,
      email,
      phone: phone || '',
      role: role || 'seller',
      status: 'active'
    };
    usersCollection.push(user);
    
    // Also bootstrap seller account if role is seller
    if (role === 'seller') {
      const newSeller: Seller = {
        id: `sel-${Date.now()}`,
        user_id: user.id,
        business_name: email.split('@')[0].toUpperCase() + ' Medical Equipment',
        contact_name: email.split('@')[0],
        whatsapp_number: phone || '+2348000000000',
        phone_number: phone || '+2348000000000',
        email,
        state: 'Lagos',
        city: 'Ikeja',
        verification_status: 'unverified',
        subscription_plan: 'free',
        active_listings_count: 0,
        rating_placeholder: 5.0,
        created_at: new Date().toISOString()
      };
      sellersCollection.push(newSeller);
    }
    
    logActivity(email, 'REGISTER', 'User', `Registered new healthcare ${role || 'seller'} account.`);
  }

  // Get associated seller profile if present
  const sellerProfile = sellersCollection.find(s => s.user_id === user?.id);

  res.json({
    user,
    seller: sellerProfile
  });
});

// Listings: GET all with filtering
app.get("/api/listings", (req, res) => {
  let filtered = [...listingsCollection];
  const { category, state, condition, query, status, seller_id } = req.query;

  if (seller_id) {
    filtered = filtered.filter(l => l.seller_id === seller_id);
  }
  if (category) {
    filtered = filtered.filter(l => l.category_id === category || categoriesCollection.find(c => c.id === l.category_id)?.parent_id === category);
  }
  if (state) {
    filtered = filtered.filter(l => l.state.toLowerCase() === (state as string).toLowerCase());
  }
  if (condition) {
    filtered = filtered.filter(l => l.condition === condition);
  }
  if (status) {
    filtered = filtered.filter(l => l.status === status);
  } else {
    // defaults to published for public
    filtered = filtered.filter(l => l.status === 'published');
  }

  if (query) {
    const sQuery = (query as string).toLowerCase();
    filtered = filtered.filter(l => 
      l.title.toLowerCase().includes(sQuery) || 
      l.description.toLowerCase().includes(sQuery) ||
      l.brand.toLowerCase().includes(sQuery) ||
      l.model.toLowerCase().includes(sQuery)
    );
  }

  // Register and store search patterns for admin insights
  if (query || category || state || condition) {
    const catObj = category ? categoriesCollection.find(c => c.id === category) : undefined;
    searchLogsCollection.unshift({
      id: `search-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      query: (query as string) || '',
      category_id: (category as string) || '',
      category_name: catObj ? catObj.name : '',
      state: (state as string) || '',
      condition: (condition as string) || '',
      timestamp: new Date().toISOString(),
      results_count: filtered.length
    });
    
    // Prevent memory creep
    if (searchLogsCollection.length > 500) {
      searchLogsCollection.pop();
    }
  }

  res.json(filtered);
});

// Listings: GET by slug or ID
app.get("/api/listings/:slugOrId", (req, res) => {
  const term = req.params.slugOrId;
  const listing = listingsCollection.find(l => l.id === term || l.slug === term);
  
  if (!listing) {
    return res.status(404).json({ error: "Marketplace listing not found" });
  }

  // Increment view count beautifully
  listing.view_count += 1;
  res.json(listing);
});

// Listings: Create Listing
app.post("/api/listings", requireAuth, (req: any, res: any) => {
  const { seller_id, category_id, title, brand, model, condition, price, currency, negotiable, state, city, description, is_ai_extracted, listing_type, images, videos, links } = req.body;

  if (!title || !price || !category_id) {
    return res.status(400).json({ error: "Required fields missing (title, price, category_id)" });
  }

  // Find seller profile belonging to the authenticated user
  const seller = sellersCollection.find(s => s.user_id === req.user.id || s.id === seller_id);
  if (!seller) {
    return res.status(403).json({ error: "Forbidden: No merchant store registered for this user" });
  }

  // Ensure that if the user is not an admin, they can only create listings for their own seller profile
  if (req.user.role !== 'admin' && seller.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden: You cannot create a listing under another merchant's profile" });
  }

  const sanitizedTitle = sanitizeText(title);
  const slug = sanitizedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 10000);

  const newListing: Listing = {
    id: `list-${Date.now()}`,
    seller_id: seller.id,
    category_id,
    title: sanitizedTitle,
    slug,
    brand: sanitizeText(brand) || 'Generic',
    model: sanitizeText(model) || '',
    condition: condition === 'used' ? 'working_used' : (condition || 'working_used'),
    price: Number(price),
    currency: currency || 'NGN',
    negotiable: negotiable ?? true,
    country: 'Nigeria',
    state: sanitizeText(state) || 'Lagos',
    city: sanitizeText(city) || 'Ikeja',
    description: sanitizeText(description) || '',
    status: 'pending_review', // Requires admin review
    featured: false,
    stock_status: 'in_stock',
    view_count: 1,
    whatsapp_click_count: 0,
    images: (images && Array.isArray(images) && images.length > 0) ? images : [
      req.body.imageUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80'
    ],
    videos: (videos && Array.isArray(videos)) ? videos : [],
    links: (links && Array.isArray(links)) ? links : [],
    seller_name: seller.business_name,
    seller_whatsapp: seller.whatsapp_number,
    seller_verified: seller.verification_status === 'verified',
    is_ai_extracted: !!is_ai_extracted,
    listing_type: listing_type || 'fixed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  listingsCollection.unshift(newListing);
  logActivity(seller.business_name, 'CREATE_LISTING', 'Listings', `Created clinical listing: ${sanitizedTitle}`);
  
  // Send simulated Firestore notification to administrative review board
  notificationsCollection.unshift({
    id: `notif-${Date.now()}`,
    user_id: 'usr-3', // Admin recipient
    type: 'admin_review',
    title: 'Review Required',
    message: `New equipment listing "${sanitizedTitle}" requires clinical verification by admin.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.status(210).json(newListing);
});

// Listings: Edit Listing
app.patch("/api/listings/:id", requireAuth, (req: any, res: any) => {
  const { id } = req.params;
  const index = listingsCollection.findIndex(l => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Listing not found" });
  }

  const listing = listingsCollection[index];

  // Find seller profile belonging to the authenticated user
  const seller = sellersCollection.find(s => s.user_id === req.user.id);
  if (!seller && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: You must have a registered seller profile to edit listings" });
  }

  // Prevent identity spoofing
  if (req.user.role !== 'admin' && listing.seller_id !== seller?.id) {
    return res.status(403).json({ error: "Forbidden: You are not authorized to edit this listing" });
  }

  // Sanitize input properties
  const updateData = { ...req.body };
  if (updateData.title) updateData.title = sanitizeText(updateData.title);
  if (updateData.brand) updateData.brand = sanitizeText(updateData.brand);
  if (updateData.model) updateData.model = sanitizeText(updateData.model);
  if (updateData.state) updateData.state = sanitizeText(updateData.state);
  if (updateData.city) updateData.city = sanitizeText(updateData.city);
  if (updateData.description) updateData.description = sanitizeText(updateData.description);

  listingsCollection[index] = {
    ...listingsCollection[index],
    ...updateData,
    updated_at: new Date().toISOString()
  };

  res.json(listingsCollection[index]);
});

// Listings: Delete Listing
app.delete("/api/listings/:id", requireAuth, (req: any, res: any) => {
  const { id } = req.params;
  const index = listingsCollection.findIndex(l => l.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Listing not found" });
  }

  const listing = listingsCollection[index];

  // Find seller profile belonging to the authenticated user
  const seller = sellersCollection.find(s => s.user_id === req.user.id);
  if (!seller && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: You are not authorized to delete listings" });
  }

  // Prevent privilege escalation
  if (req.user.role !== 'admin' && listing.seller_id !== seller?.id) {
    return res.status(403).json({ error: "Forbidden: You cannot delete another merchant's listing" });
  }

  logActivity(req.user.email, 'DELETE_LISTING', 'Listings', `Deleted listing: ${listing.title}`);
  listingsCollection.splice(index, 1);
  res.json({ success: true, message: "Listing deleted successfully" });
});

// Track WhatsApp Click counts
app.post("/api/listings/:id/track-whatsapp-click", (req, res) => {
  const { id } = req.params;
  const listing = listingsCollection.find(l => l.id === id);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }

  listing.whatsapp_click_count += 1;
  logActivity('Buyer', 'WHATSAPP_CLICK', 'Analytics', `Inquired on WhatsApp for: ${listing.title}`);
  res.json({ clicks: listing.whatsapp_click_count });
});

// Report Suspicious Listing
app.post("/api/listings/:id/report", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const listing = listingsCollection.find(l => l.id === id);
  
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }

  const newReport: Report = {
    id: `rep-${Date.now()}`,
    reporter_id: 'usr-anonymous',
    listing_id: id,
    reason: reason || 'Suspicious user or price misrepresentation',
    status: 'pending',
    created_at: new Date().toISOString(),
    listing_title: listing.title
  };

  reportsCollection.push(newReport);

  // Notify Admin panel
  notificationsCollection.unshift({
    id: `notif-${Date.now()}`,
    user_id: 'usr-3', // Admin ID
    type: 'report_flag',
    title: 'Listing Flagged!',
    message: `Listing "${listing.title}" was reported. Reason: ${reason}`,
    read: false,
    created_at: new Date().toISOString()
  });

  logActivity('Buyer-Anonymous', 'REPORT_LISTING', 'Reports', `Reported listing: ${listing.title}`);
  res.json({ success: true, report: newReport });
});

// Categories: GET standard classes
app.get("/api/categories", (req, res) => {
  res.json(categoriesCollection);
});

// Admin add category
app.post("/api/admin/categories", (req, res) => {
  const { name, slug, parent_id } = req.body;
  const newCat: Category = {
    id: `cat-${Date.now()}`,
    name,
    slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    parent_id: parent_id || null,
    is_active: true
  };
  categoriesCollection.push(newCat);
  res.json(newCat);
});

// Sellers GET profile
app.get("/api/sellers/:id", (req, res) => {
  const seller = sellersCollection.find(s => s.id === req.params.id || s.user_id === req.params.id);
  if (!seller) {
    return res.status(404).json({ error: "Seller registration details not found" });
  }
  // Count current listings dynamically
  seller.active_listings_count = listingsCollection.filter(l => l.seller_id === seller.id && l.status === 'published').length;
  res.json(seller);
});

// Sellers Update Profile
app.patch("/api/sellers/profile", (req, res) => {
  const { seller_id, business_name, contact_name, whatsapp_number, phone_number, state, city, cac_number } = req.body;
  const index = sellersCollection.findIndex(s => s.id === seller_id || s.user_id === seller_id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Seller profile not found." });
  }

  sellersCollection[index] = {
    ...sellersCollection[index],
    business_name: business_name || sellersCollection[index].business_name,
    contact_name: contact_name || sellersCollection[index].contact_name,
    whatsapp_number: whatsapp_number || sellersCollection[index].whatsapp_number,
    phone_number: phone_number || sellersCollection[index].phone_number,
    state: state || sellersCollection[index].state,
    city: city || sellersCollection[index].city,
    cac_number: cac_number || sellersCollection[index].cac_number
  };

  res.json(sellersCollection[index]);
});

// Submit verification request
app.post("/api/sellers/verification", (req, res) => {
  const { seller_id, cac_number, document_url } = req.body;
  const seller = sellersCollection.find(s => s.id === seller_id);
  if (!seller) {
    return res.status(404).json({ error: "Seller not found" });
  }

  // Update status to pending
  seller.verification_status = 'pending';
  seller.cac_number = cac_number;

  const vReq: VerificationRequest = {
    id: `vreq-${Date.now()}`,
    seller_id,
    business_name: seller.business_name,
    cac_number,
    document_url: document_url || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400',
    status: 'pending',
    created_at: new Date().toISOString()
  };

  verificationRequestsCollection.push(vReq);

  // Notify administrative operators
  notificationsCollection.unshift({
    id: `notif-${Date.now()}`,
    user_id: 'usr-3', // Admin UID
    type: 'verification_needed',
    title: 'Verification Request',
    message: `${seller.business_name} uploaded CAC documents for review.`,
    read: false,
    created_at: new Date().toISOString()
  });

  logActivity(seller.business_name, 'SUBMIT_CAC', 'KYC', `Submitted corporate registration CAC: ${cac_number}`);
  res.json({ success: true, verification: vReq });
});

// Procurement Post requests
app.post("/api/procurement-requests", (req, res) => {
  const { user_id, category_id, title, quantity, budget, currency, urgency, state, city, description, buyer_contact } = req.body;
  
  if (!title || !description || !buyer_contact) {
    return res.status(400).json({ error: "Required fields missing for posting procurement request" });
  }

  const cleanTitle = sanitizeText(title);
  const cleanDescription = sanitizeText(description);
  const cleanContact = sanitizeText(buyer_contact);
  const cleanState = sanitizeText(state);
  const cleanCity = sanitizeText(city);

  const newReq: ProcurementRequest = {
    id: `req-${Date.now()}`,
    user_id: user_id || 'usr-5',
    category_id: category_id || 'cat-8',
    title: cleanTitle,
    quantity: Number(quantity) || 1,
    budget: Number(budget) || 0,
    currency: currency || 'NGN',
    urgency: urgency || 'medium',
    country: 'Nigeria',
    state: cleanState || 'Lagos',
    city: cleanCity || 'Ikeja',
    description: cleanDescription,
    status: 'open',
    buyer_contact: cleanContact,
    created_at: new Date().toISOString()
  };

  procurementRequestsCollection.unshift(newReq);
  logActivity('Hospital/Buyer', 'POST_RFQ', 'Procurement', `Posted RFQ: ${title}`);

  // Broadcast to all verified sellers matching this category group with real-time FCM simulation
  notificationsCollection.unshift({
    id: `notif-${Date.now()}`,
    user_id: 'usr-1', // Notify Dr. Chidi Obi
    type: 'procurement_match',
    title: 'New RFQ matching your products',
    message: `A hospital posted: "${title}". Respond immediately!`,
    read: false,
    created_at: new Date().toISOString()
  });

  // Notify Admin of a newly published sourcing RFQ
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-adm`,
    user_id: 'usr-3', // Admin ID
    type: 'admin_rfq_alert',
    title: 'New Sourcing RFQ Published',
    message: `Hospital buyer posted a new RFQ: "${title}" (Qty: ${newReq.quantity}, Budget: ₦${Number(newReq.budget).toLocaleString()}).`,
    read: false,
    created_at: new Date().toISOString()
  });

  // Notify Buyer confirming their broadcast
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-byr`,
    user_id: newReq.user_id, // Target the buyer user ID
    type: 'rfq_broadcast',
    title: 'RFQ Sourcing Broadcasted',
    message: `Your clinical sourcing request for "${title}" has been successfully broadcast to verified vendors.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.json(newReq);
});

// Procurement GET requests
app.get("/api/procurement-requests", (req, res) => {
  res.json(procurementRequestsCollection);
});

// Respond to procurement requests
app.post("/api/procurement-requests/:id/respond", (req, res) => {
  const { id } = req.params;
  const { seller_id, price, message, availability, whatsapp_contact, offered_product } = req.body;

  const request = procurementRequestsCollection.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: "Procurement request not found" });
  }

  const seller = sellersCollection.find(s => s.id === seller_id) || sellersCollection[0];
  const newResponse: ProcurementResponse = {
    id: `presp-${Date.now()}`,
    request_id: id,
    seller_id: seller.id,
    price: Number(price),
    message,
    availability: availability || 'Immediate',
    whatsapp_contact: whatsapp_contact || seller.whatsapp_number,
    seller_name: seller.business_name,
    offered_product: offered_product || 'Specified Medical Equipment',
    created_at: new Date().toISOString()
  };

  procurementResponsesCollection.unshift(newResponse);
  logActivity(seller.business_name, 'RESPOND_RFQ', 'Procurement', `Responded with equipment offer to: "${request.title}"`);

  // Target hospital buyer with feedback notification
  notificationsCollection.unshift({
    id: `notif-${Date.now()}`,
    user_id: request.user_id || 'usr-5', // Dynamic target the actual buyer of this RFQ
    type: 'rfq_offer',
    title: 'New Bid Response Received!',
    message: `${seller.business_name} offered "${offered_product}" for ₦${Number(price).toLocaleString()}`,
    read: false,
    created_at: new Date().toISOString()
  });

  // Target Admin with informational notification of areactive business match
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-adm`,
    user_id: 'usr-3', // Admin ID
    type: 'admin_bid_alert',
    title: 'Dealer Sourcing Bid Received',
    message: `Dealer "${seller.business_name}" placed an offer on hospital RFQ "${request.title}" of ₦${Number(price).toLocaleString()}`,
    read: false,
    created_at: new Date().toISOString()
  });

  // Automatically create a CRM Lead for the Seller & Buyer to chat/track
  let existingLead = leadsCollection.find(l => l.seller_id === seller.id && l.buyer_id === (request.user_id || 'usr-5') && l.source_id === id);
  if (!existingLead) {
    const buyerUser = usersCollection.find(u => u.id === (request.user_id || 'usr-5'));
    const buyerEmailName = buyerUser ? buyerUser.email.split('@')[0].toUpperCase() + ' Hospital' : 'Riverside Memorial Hospital';
    existingLead = {
      id: `lead-${Date.now()}`,
      seller_id: seller.id,
      buyer_id: request.user_id || 'usr-5',
      buyer_name: buyerEmailName,
      buyer_contact: request.buyer_contact || buyerUser?.phone || buyerUser?.email || 'Contact Sourcing Office',
      title: request.title,
      type: 'rfq_offer',
      source_id: id,
      status: 'quote_sent',
      notes: `Auto-generated lead from RFQ response. Initial bid: ₦${Number(price).toLocaleString()}`,
      price_offered: Number(price),
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    leadsCollection.unshift(existingLead);
  } else {
    existingLead.status = 'quote_sent';
    existingLead.price_offered = Number(price);
    existingLead.last_activity_at = new Date().toISOString();
  }

  // Also send the initial bid message to the chat thread
  chatMessagesCollection.push({
    id: `msg-${Date.now()}-auto`,
    lead_id: existingLead.id,
    sender_id: seller.user_id || 'usr-1',
    sender_name: `${seller.business_name} (Vendor)`,
    message: message || `We have submitted a bid for your RFQ "${request.title}" offering "${offered_product || request.title}" for ₦${Number(price).toLocaleString()}`,
    created_at: new Date().toISOString()
  });

  res.json(newResponse);
});

// Admin Dashboard & Moderator metrics
app.get("/api/admin/dashboard", (req, res) => {
  res.json({
    total_listings: listingsCollection.length,
    pending_verification_sellers: sellersCollection.filter(s => s.verification_status === 'pending').length,
    pending_reviews_listings: listingsCollection.filter(l => l.status === 'pending_review').length,
    total_users: usersCollection.length,
    active_rfqs: procurementRequestsCollection.length,
    reported_listings_count: reportsCollection.length,
    audit_trail: activityLogsCollection.slice(0, 10),
    verifications_requested: verificationRequestsCollection,
    total_searches_recorded: searchLogsCollection.length,
    status_distribution: {
      published: listingsCollection.filter(l => l.status === 'published').length,
      pending_review: listingsCollection.filter(l => l.status === 'pending_review').length,
      draft: listingsCollection.filter(l => l.status === 'draft').length
    }
  });
});

// Admin review listings
app.get("/api/admin/listings/pending", (req, res) => {
  res.json(listingsCollection.filter(l => l.status === 'pending_review'));
});

// Approve review
app.patch("/api/admin/listings/:id/approve", (req, res) => {
  const listing = listingsCollection.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  listing.status = 'published';
  logActivity('Admin', 'APPROVE_LISTING', 'Moderation', `Approved "published" status for: ${listing.title}`);

  // Find associated seller
  const seller = sellersCollection.find(s => s.id === listing.seller_id);
  const sellerUserId = seller ? seller.user_id : 'usr-1';

  // 1. Notify the Seller
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-sel-appr`,
    user_id: sellerUserId,
    type: 'listing_approved',
    title: 'Listing Approved & Live!',
    message: `Your medical equipment listing "${listing.title}" passed clinical verification and is live.`,
    read: false,
    created_at: new Date().toISOString()
  });

  // 2. Notify clinical buyers (usr-5) that new verified inventory is available
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-byr-appr`,
    user_id: 'usr-5', 
    type: 'new_equipment_alert',
    title: 'New Clinical Equipment Approved',
    message: `Verified dealer "${listing.seller_name || 'Dealer'}" has listed: "${listing.title}" for ₦${Number(listing.price).toLocaleString()}.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.json(listing);
});

// Reject review
app.patch("/api/admin/listings/:id/reject", (req, res) => {
  const listing = listingsCollection.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  listing.status = 'rejected';
  logActivity('Admin', 'REJECT_LISTING', 'Moderation', `Rejected listing submission: ${listing.title}`);

  // Find associated seller
  const seller = sellersCollection.find(s => s.id === listing.seller_id);
  const sellerUserId = seller ? seller.user_id : 'usr-1';

  // Notify Seller about rejection
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-sel-rej`,
    user_id: sellerUserId,
    type: 'listing_rejected',
    title: 'Listing Failed Moderation Check',
    message: `Your listing "${listing.title}" was rejected due to missing technical parameters or price discrepancies.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.json(listing);
});

// Pending CAC docs
app.get("/api/admin/sellers/pending-verification", (req, res) => {
  res.json(sellersCollection.filter(s => s.verification_status === 'pending'));
});

// Verify Seller
app.patch("/api/admin/sellers/:id/verify", (req, res) => {
  const seller = sellersCollection.find(s => s.id === req.params.id);
  if (!seller) return res.status(404).json({ error: "Seller profile not found." });
  
  seller.verification_status = 'verified';
  
  // Also status of their verification request record
  const vReq = verificationRequestsCollection.find(vr => vr.seller_id === seller.id && vr.status === 'pending');
  if (vReq) vReq.status = 'approved';

  // Mark all their listings as verified seller listings dynamically
  listingsCollection.forEach(l => {
    if (l.seller_id === seller.id) l.seller_verified = true;
  });

  logActivity('Admin', 'VERIFY_DEALER', 'KYC', `Corporate registration verified for ${seller.business_name}`);

  // Notify Seller of their approved KYC verification status
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-sel-kyc`,
    user_id: seller.user_id || 'usr-1',
    type: 'kyc_verified',
    title: 'Store Registration Verified!',
    message: `Your business CAC document for "${seller.business_name}" is approved. You received the Verified Seller Shield!`,
    read: false,
    created_at: new Date().toISOString()
  });

  // Notify Buyers of new vetted dealer trusted sourcing alternative
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-byr-kyc`,
    user_id: 'usr-5', 
    type: 'supplier_vetted',
    title: 'Verified Supplier onboarding',
    message: `Dealer "${seller.business_name}" is now fully CAC verified. Sourcing carries full warranty support.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.json(seller);
});

app.get("/api/admin/reports", (req, res) => {
  res.json(reportsCollection);
});

app.patch("/api/admin/reports/:id/resolve", (req, res) => {
  const rep = reportsCollection.find(r => r.id === req.params.id);
  if (!rep) return res.status(404).json({ error: "Report ID not found." });
  rep.status = 'resolved';
  res.json({ success: true, report: rep });
});

// Sourcing search insights routing
app.get("/api/admin/search-insights", (req, res) => {
  const total = searchLogsCollection.length;

  // Aggregate unmet sourcing demands: searches yielding 0 results where there's a keyword or filter group
  const unmetMap: { [key: string]: { count: number; last_searched: string; category?: string; state?: string } } = {};
  searchLogsCollection.forEach(s => {
    if (s.results_count === 0 && (s.query || s.category_name)) {
      const key = s.query.trim().toLowerCase() || `[category: ${s.category_name}]`;
      if (!unmetMap[key]) {
        unmetMap[key] = { 
          count: 0, 
          last_searched: s.timestamp,
          category: s.category_name || 'General Equipment',
          state: s.state || 'Lagos'
        };
      }
      unmetMap[key].count += 1;
    }
  });
  const unmetDemands = Object.entries(unmetMap)
    .map(([term, data]) => ({ 
      term: term.charAt(0).toUpperCase() + term.slice(1), 
      count: data.count, 
      last_searched: data.last_searched,
      category: data.category,
      state: data.state
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Popular search text strings
  const queryMap: { [key: string]: number } = {};
  searchLogsCollection.forEach(s => {
    if (s.query.trim()) {
      const q = s.query.trim().toLowerCase();
      queryMap[q] = (queryMap[q] || 0) + 1;
    }
  });
  const popularQueries = Object.entries(queryMap)
    .map(([term, count]) => ({ term: term.charAt(0).toUpperCase() + term.slice(1), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Popular categories
  const catMap: { [key: string]: number } = {};
  searchLogsCollection.forEach(s => {
    if (s.category_name) {
      catMap[s.category_name] = (catMap[s.category_name] || 0) + 1;
    }
  });
  const popularCategories = Object.entries(catMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Hotspot states
  const stateMap: { [key: string]: number } = {};
  searchLogsCollection.forEach(s => {
    if (s.state) {
      stateMap[s.state] = (stateMap[s.state] || 0) + 1;
    }
  });
  const popularStates = Object.entries(stateMap)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    total_searches: total,
    recent_searches: searchLogsCollection,
    unmet_demands: unmetDemands,
    popular_queries: popularQueries,
    popular_categories: popularCategories,
    popular_states: popularStates
  });
});

// Admin Vendors Management API
app.get("/api/admin/vendors", (req, res) => {
  const vendors = sellersCollection.map(s => {
    const vendorListings = listingsCollection.filter(l => l.seller_id === s.id);
    const totalViews = vendorListings.reduce((sum, l) => sum + (l.view_count || 0), 0);
    const totalWhatsappClicks = vendorListings.reduce((sum, l) => sum + (l.whatsapp_click_count || 0), 0);
    const totalPhoneClicks = vendorListings.reduce((sum, l) => sum + (l.phone_click_count || 0), 0);
    const totalRFQBids = procurementResponsesCollection.filter(r => r.seller_id === s.id).length;
    const userAcc = usersCollection.find(u => u.id === s.user_id);

    return {
      ...s,
      email: s.email || userAcc?.email || '',
      phone: s.phone_number || s.whatsapp_number || userAcc?.phone || '',
      user_status: userAcc?.status || 'active',
      total_listings: vendorListings.length,
      published_listings: vendorListings.filter(l => l.status === 'published').length,
      pending_listings: vendorListings.filter(l => l.status === 'pending_review').length,
      total_views: totalViews,
      total_whatsapp_clicks: totalWhatsappClicks,
      total_phone_clicks: totalPhoneClicks,
      total_rfq_bids: totalRFQBids
    };
  });
  res.json(vendors);
});

// Admin Update Vendor Status / KYC
app.patch("/api/admin/vendors/:id/status", (req, res) => {
  const { status, verification_status } = req.body;
  const seller = sellersCollection.find(s => s.id === req.params.id);
  if (!seller) return res.status(404).json({ error: "Vendor not found" });

  if (verification_status) seller.verification_status = verification_status;
  if (status) {
    seller.status = status;
    const u = usersCollection.find(usr => usr.id === seller.user_id);
    if (u) u.status = status;
  }

  if (verification_status === 'verified') {
    listingsCollection.forEach(l => {
      if (l.seller_id === seller.id) l.seller_verified = true;
    });
  }

  logActivity('Admin', 'MANAGE_VENDOR', 'AdminOps', `Updated vendor "${seller.business_name}" (Status: ${seller.status || 'active'}, Verification: ${seller.verification_status})`);
  res.json(seller);
});

// Admin Delete / Remove Vendor
app.delete("/api/admin/vendors/:id", (req, res) => {
  const index = sellersCollection.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Vendor not found" });

  const deleted = sellersCollection.splice(index, 1)[0];
  logActivity('Admin', 'DELETE_VENDOR', 'AdminOps', `Removed vendor store profile: ${deleted.business_name}`);
  res.json({ success: true, deleted });
});

// Admin Equipments / Listings Management API
app.get("/api/admin/equipments", (req, res) => {
  const { status, category_id, seller_id, state, condition, search } = req.query;
  let items = [...listingsCollection];

  if (status) items = items.filter(l => l.status === status);
  if (category_id) items = items.filter(l => l.category_id === category_id);
  if (seller_id) items = items.filter(l => l.seller_id === seller_id);
  if (state) items = items.filter(l => l.state === state);
  if (condition) items = items.filter(l => l.condition === condition);
  if (search) {
    const q = (search as string).toLowerCase();
    items = items.filter(l => l.title.toLowerCase().includes(q) || l.brand.toLowerCase().includes(q) || l.model.toLowerCase().includes(q));
  }

  const enriched = items.map(l => {
    const seller = sellersCollection.find(s => s.id === l.seller_id);
    const category = categoriesCollection.find(c => c.id === l.category_id);
    const flags = reportsCollection.filter(r => r.listing_id === l.id && r.status === 'pending').length;
    return {
      ...l,
      seller_business_name: seller?.business_name || l.seller_name || 'Dealer',
      seller_whatsapp_no: seller?.whatsapp_number || l.seller_whatsapp || '',
      category_name: category?.name || 'General Equipment',
      pending_reports_count: flags
    };
  });

  res.json(enriched);
});

// Admin Edit Equipment / Update Status directly
app.patch("/api/admin/equipments/:id", (req, res) => {
  const index = listingsCollection.findIndex(l => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Equipment not found" });

  const current = listingsCollection[index];
  const updated = {
    ...current,
    ...req.body,
    updated_at: new Date().toISOString()
  };
  listingsCollection[index] = updated;

  logActivity('Admin', 'EDIT_EQUIPMENT', 'AdminOps', `Admin updated equipment: ${updated.title} (Status: ${updated.status})`);
  res.json(updated);
});

// Admin Delete Equipment
app.delete("/api/admin/equipments/:id", (req, res) => {
  const index = listingsCollection.findIndex(l => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Equipment not found" });

  const deleted = listingsCollection.splice(index, 1)[0];
  logActivity('Admin', 'DELETE_EQUIPMENT', 'AdminOps', `Admin deleted equipment: ${deleted.title}`);
  res.json({ success: true, deleted });
});

// Track Action (Clicks, Calls, Views, Shares)
app.post("/api/listings/:id/track-action", (req, res) => {
  const { id } = req.params;
  const { action_type, user_info } = req.body;
  const listing = listingsCollection.find(l => l.id === id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  if (action_type === 'whatsapp_click') {
    listing.whatsapp_click_count = (listing.whatsapp_click_count || 0) + 1;
  } else if (action_type === 'call_click') {
    listing.phone_click_count = (listing.phone_click_count || 0) + 1;
  } else if (action_type === 'view_details') {
    listing.view_count = (listing.view_count || 0) + 1;
  }

  const seller = sellersCollection.find(s => s.id === listing.seller_id);

  const event = {
    id: `act-log-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    action_type: action_type || 'engagement_click',
    listing_id: id,
    listing_title: listing.title,
    seller_id: listing.seller_id,
    seller_name: seller?.business_name || listing.seller_name || 'Dealer',
    user_info: user_info || 'Hospital Buyer',
    timestamp: new Date().toISOString()
  };

  interactionLogsCollection.unshift(event);
  logActivity('Buyer-User', (action_type || 'click').toUpperCase(), 'Engagement', `Triggered ${action_type} for "${listing.title}"`);

  res.json({ success: true, listing_stats: { view_count: listing.view_count, whatsapp_click_count: listing.whatsapp_click_count, phone_click_count: listing.phone_click_count || 0 } });
});

// Engagement & Telemetry Analytics Endpoint
app.get("/api/admin/engagement-analytics", (req, res) => {
  const totalViews = listingsCollection.reduce((s, l) => s + (l.view_count || 0), 0);
  const totalWhatsapp = listingsCollection.reduce((s, l) => s + (l.whatsapp_click_count || 0), 0);
  const totalCalls = listingsCollection.reduce((s, l) => s + (l.phone_click_count || 0), 0);
  const totalRFQs = procurementRequestsCollection.length;

  const topViewed = [...listingsCollection]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 10);

  const topClicked = [...listingsCollection]
    .sort((a, b) => ((b.whatsapp_click_count || 0) + (b.phone_click_count || 0)) - ((a.whatsapp_click_count || 0) + (a.phone_click_count || 0)))
    .slice(0, 10);

  const vendorStats = sellersCollection.map(sel => {
    const selListings = listingsCollection.filter(l => l.seller_id === sel.id);
    const vSum = selListings.reduce((s, l) => s + (l.view_count || 0), 0);
    const cSum = selListings.reduce((s, l) => s + (l.whatsapp_click_count || 0) + (l.phone_click_count || 0), 0);
    return {
      id: sel.id,
      business_name: sel.business_name,
      state: sel.state,
      verification_status: sel.verification_status,
      listings_count: selListings.length,
      views: vSum,
      clicks: cSum
    };
  }).sort((a, b) => b.clicks - a.clicks);

  res.json({
    total_views: totalViews,
    total_whatsapp_clicks: totalWhatsapp,
    total_call_clicks: totalCalls,
    total_rfqs: totalRFQs,
    top_viewed: topViewed,
    top_clicked: topClicked,
    vendor_stats: vendorStats,
    recent_interactions: interactionLogsCollection.slice(0, 30)
  });
});

// ==========================================
// CRM LEAD TRACKING & CHAT API
// ==========================================

// GET all leads for a specific user role/profile
app.get("/api/leads", (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.json(leadsCollection);
  }
  
  // Find user and check their role
  const user = usersCollection.find(u => u.id === user_id);
  if (!user) {
    return res.json([]);
  }
  
  if (user.role === 'seller') {
    const seller = sellersCollection.find(s => s.user_id === user.id);
    if (!seller) return res.json([]);
    return res.json(leadsCollection.filter(l => l.seller_id === seller.id));
  } else if (user.role === 'buyer') {
    return res.json(leadsCollection.filter(l => l.buyer_id === user.id));
  } else {
    // Admin / Moderator gets everything
    return res.json(leadsCollection);
  }
});

// POST update lead status or notes
app.post("/api/leads/update-status", (req, res) => {
  const { lead_id, status, notes, price_offered } = req.body;
  const lead = leadsCollection.find(l => l.id === lead_id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  
  if (status) lead.status = status;
  if (notes !== undefined) lead.notes = notes;
  if (price_offered !== undefined) lead.price_offered = Number(price_offered);
  lead.last_activity_at = new Date().toISOString();
  
  logActivity('System', 'UPDATE_LEAD', 'CRM', `Updated lead ${lead.id} status to ${status}`);
  res.json(lead);
});

// GET chat message history
app.get("/api/chats/:lead_id", (req, res) => {
  const { lead_id } = req.params;
  const messages = chatMessagesCollection.filter(m => m.lead_id === lead_id);
  res.json(messages);
});

// POST send new chat message
app.post("/api/chats/message", (req, res) => {
  const { lead_id, sender_id, message } = req.body;
  if (!lead_id || !sender_id || !message) {
    return res.status(400).json({ error: "Missing required chat parameters" });
  }
  
  const lead = leadsCollection.find(l => l.id === lead_id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  
  // Resolve sender name
  let senderName = "User";
  const senderUser = usersCollection.find(u => u.id === sender_id);
  if (senderUser) {
    if (senderUser.role === 'seller') {
      const seller = sellersCollection.find(s => s.user_id === sender_id);
      senderName = seller ? `${seller.business_name} (Vendor)` : senderUser.email;
    } else if (senderUser.role === 'buyer') {
      senderName = `${senderUser.email.split('@')[0].toUpperCase()} Hospital`;
    } else {
      senderName = "System Moderator";
    }
  }
  
  const cleanMessage = sanitizeText(message);

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    lead_id,
    sender_id,
    sender_name: senderName,
    message: cleanMessage,
    created_at: new Date().toISOString()
  };
  
  chatMessagesCollection.push(newMsg);
  lead.last_activity_at = new Date().toISOString();
  
  // Create notification for recipient
  const receiverUserId = sender_id === lead.buyer_id 
    ? (sellersCollection.find(s => s.id === lead.seller_id)?.user_id || 'usr-1')
    : lead.buyer_id;
    
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-chat`,
    user_id: receiverUserId,
    type: 'chat_message',
    title: `New Message from ${senderName.split('(')[0].trim()}`,
    message: message.length > 50 ? `${message.substring(0, 50)}...` : message,
    read: false,
    created_at: new Date().toISOString()
  });
  
  res.json(newMsg);
});

// POST buy inquiry start on specific listing
app.post("/api/leads/inquire", (req, res) => {
  const { listing_id, buyer_id, message } = req.body;
  
  const listing = listingsCollection.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "Equipment listing not found" });
  
  const buyer = usersCollection.find(u => u.id === buyer_id) || usersCollection.find(u => u.role === 'buyer');
  if (!buyer) return res.status(404).json({ error: "Buyer profile not found" });
  
  const seller = sellersCollection.find(s => s.id === listing.seller_id);
  if (!seller) return res.status(404).json({ error: "Seller profile not found" });
  
  // Check existing
  let lead = leadsCollection.find(l => l.seller_id === seller.id && l.buyer_id === buyer.id && l.source_id === listing_id);
  let isNew = false;
  if (!lead) {
    isNew = true;
    lead = {
      id: `lead-${Date.now()}`,
      seller_id: seller.id,
      buyer_id: buyer.id,
      buyer_name: buyer.email.split('@')[0].toUpperCase() + ' Hospital',
      buyer_contact: buyer.phone || buyer.email || '+2348055554444',
      title: `${listing.title} Inquiry`,
      type: 'listing_inquiry',
      source_id: listing_id,
      status: 'new',
      notes: `Direct listing inquiry from client buyer Fatima. Item: "${listing.title}". Listed price: ₦${listing.price.toLocaleString()}`,
      price_offered: listing.price,
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    leadsCollection.unshift(lead);
  } else {
    lead.last_activity_at = new Date().toISOString();
  }
  
  // Add message
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    lead_id: lead.id,
    sender_id: buyer.id,
    sender_name: `${buyer.email.split('@')[0].toUpperCase()} Hospital (Buyer)`,
    message: message || `Hello, I am interested in your listed medical equipment "${listing.title}". Can you give us more details?`,
    created_at: new Date().toISOString()
  };
  chatMessagesCollection.push(newMsg);
  
  // Notify seller user
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-inq`,
    user_id: seller.user_id || 'usr-1',
    type: 'chat_message',
    title: `New Inquiry Lead: ${listing.title}`,
    message: `Buyer Fatima: "${newMsg.message.substring(0, 45)}..."`,
    read: false,
    created_at: new Date().toISOString()
  });
  
  res.json({ success: true, lead, isNew });
});

// ==========================================
// OFFERS MANAGEMENT API
// ==========================================

// GET all offers
app.get("/api/offers", (req, res) => {
  const { seller_id, buyer_id, listing_id } = req.query;
  let filtered = offersCollection;
  if (seller_id) {
    filtered = filtered.filter(o => o.seller_id === seller_id);
  }
  if (buyer_id) {
    filtered = filtered.filter(o => o.buyer_id === buyer_id);
  }
  if (listing_id) {
    filtered = filtered.filter(o => o.listing_id === listing_id);
  }
  res.json(filtered);
});

// POST submit a new offer
app.post("/api/offers", criticalLimiter, (req, res) => {
  const { listing_id, buyer_id, buyer_name, buyer_contact, offer_amount, currency, message } = req.body;
  
  if (!listing_id || !buyer_name || !buyer_contact || !offer_amount) {
    return res.status(400).json({ error: "Missing required offer fields" });
  }
  
  const listing = listingsCollection.find(l => l.id === listing_id);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  
  const seller = sellersCollection.find(s => s.id === listing.seller_id);
  if (!seller) {
    return res.status(404).json({ error: "Seller not found" });
  }
  
  const cleanBuyerName = sanitizeText(buyer_name);
  const cleanBuyerContact = sanitizeText(buyer_contact);
  const cleanMessage = sanitizeText(message);
  
  const newOffer: Offer = {
    id: `off-${Date.now()}`,
    listing_id,
    buyer_id: buyer_id || 'usr-5',
    buyer_name: cleanBuyerName,
    buyer_contact: cleanBuyerContact,
    offer_amount: Number(offer_amount),
    currency: currency || listing.currency || 'NGN',
    message: cleanMessage,
    listing_title: listing.title,
    seller_id: seller.id,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  offersCollection.unshift(newOffer);
  logActivity(buyer_name, 'MAKE_OFFER', 'Marketplace', `Submitted offer of ${newOffer.currency} ${Number(offer_amount).toLocaleString()} on ${listing.title}`);
  
  // Find or create associated Lead
  let lead = leadsCollection.find(l => l.seller_id === seller.id && l.buyer_id === newOffer.buyer_id && l.source_id === listing_id);
  let isNew = false;
  
  if (!lead) {
    isNew = true;
    lead = {
      id: `lead-${Date.now()}`,
      seller_id: seller.id,
      buyer_id: newOffer.buyer_id || 'usr-5',
      buyer_name: buyer_name,
      buyer_contact: buyer_contact,
      title: `${listing.title} Offer`,
      type: 'listing_inquiry',
      source_id: listing_id,
      status: 'new',
      notes: `Offer submitted: ${newOffer.currency} ${Number(offer_amount).toLocaleString()} on item "${listing.title}". Listed price: ${listing.currency} ${listing.price.toLocaleString()}`,
      price_offered: Number(offer_amount),
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    leadsCollection.unshift(lead);
  } else {
    lead.status = 'quote_sent';
    lead.price_offered = Number(offer_amount);
    lead.notes = `New Offer submitted: ${newOffer.currency} ${Number(offer_amount).toLocaleString()}. ` + (lead.notes || '');
    lead.last_activity_at = new Date().toISOString();
  }
  
  // Post Offer message to Chat thread
  const chatMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    lead_id: lead.id,
    sender_id: newOffer.buyer_id || 'usr-5',
    sender_name: `${buyer_name} (Buyer Offer)`,
    message: `📢 [OFFER SUBMITTED] I have placed an offer of *${newOffer.currency} ${Number(offer_amount).toLocaleString()}* on this listing. ${message ? `Message: "${message}"` : ''}`,
    created_at: new Date().toISOString()
  };
  chatMessagesCollection.push(chatMsg);
  
  // Notify Seller
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-off`,
    user_id: seller.user_id || 'usr-1',
    type: 'offer_received',
    title: 'New Offer Received!',
    message: `${buyer_name} offered ${newOffer.currency} ${Number(offer_amount).toLocaleString()} for ${listing.title}`,
    read: false,
    created_at: new Date().toISOString()
  });
  
  res.status(201).json({ success: true, offer: newOffer, lead, isNew });
});

// PATCH update offer status
app.patch("/api/offers/:id", (req, res) => {
  const { id } = req.params;
  const { status, counter_amount } = req.body;
  
  const offer = offersCollection.find(o => o.id === id);
  if (!offer) {
    return res.status(404).json({ error: "Offer not found" });
  }
  
  if (status) {
    offer.status = status;
  }
  if (counter_amount !== undefined) {
    offer.counter_amount = Number(counter_amount);
  }
  
  logActivity('System', 'UPDATE_OFFER', 'Marketplace', `Offer ${id} updated to ${status}`);
  
  const lead = leadsCollection.find(l => l.seller_id === offer.seller_id && l.buyer_id === offer.buyer_id && l.source_id === offer.listing_id);
  if (lead) {
    lead.last_activity_at = new Date().toISOString();
    
    let senderId = 'system';
    let senderName = 'System';
    const sellerObj = sellersCollection.find(s => s.id === offer.seller_id);
    
    if (sellerObj) {
      senderId = sellerObj.user_id || 'usr-1';
      senderName = `${sellerObj.business_name} (Vendor)`;
    }
    
    let msgContent = '';
    if (status === 'accepted') {
      lead.status = 'won';
      msgContent = `✅ [OFFER ACCEPTED] The seller has accepted your offer of *${offer.currency} ${offer.offer_amount.toLocaleString()}*! Let's discuss delivery terms and invoice payment.`;
    } else if (status === 'declined') {
      lead.status = 'lost';
      msgContent = `❌ [OFFER DECLINED] The seller declined your offer of *${offer.currency} ${offer.offer_amount.toLocaleString()}*.`;
    } else if (status === 'countered') {
      lead.status = 'discussion';
      lead.price_offered = Number(counter_amount);
      msgContent = `🔄 [COUNTER OFFER] The seller proposed a counter-offer of *${offer.currency} ${Number(counter_amount).toLocaleString()}*. Let's discuss if this fits your hospital budget.`;
    }
    
    if (msgContent) {
      chatMessagesCollection.push({
        id: `msg-${Date.now()}-offer-status`,
        lead_id: lead.id,
        sender_id: senderId,
        sender_name: senderName,
        message: msgContent,
        created_at: new Date().toISOString()
      });
      
      // Notify Buyer
      notificationsCollection.unshift({
        id: `notif-${Date.now()}-off-upd`,
        user_id: offer.buyer_id || 'usr-5',
        type: 'offer_updated',
        title: `Offer Update: ${offer.listing_title}`,
        message: `Your offer status was updated to: ${status}${status === 'countered' ? ` (Countered to ${offer.currency} ${Number(counter_amount).toLocaleString()})` : ''}`,
        read: false,
        created_at: new Date().toISOString()
      });
    }
  }
  
  res.json(offer);
});

// GET user notifications
app.get("/api/notifications", (req, res) => {
  const { user_id } = req.query;
  if (user_id) {
    // Return alerts directed to the specific logged user context
    const filtered = notificationsCollection.filter(n => n.user_id === user_id);
    return res.json(filtered);
  }
  res.json(notificationsCollection);
});

// Read and dismiss notifications
app.post("/api/notifications/dismiss", (req, res) => {
  const { user_id } = req.body || {};
  if (user_id) {
    notificationsCollection.forEach(n => {
      if (n.user_id === user_id) n.read = true;
    });
  } else {
    notificationsCollection.forEach(n => n.read = true);
  }
  res.json({ success: true });
});

// ==========================================
// ESCROW PROTECTION SYSTEM API ENDPOINTS
// ==========================================

// GET all escrow deals
app.get("/api/escrow/deals", (req, res) => {
  const { user_id, seller_id, status } = req.query;
  let deals = [...escrowDealsCollection];
  if (user_id) {
    deals = deals.filter(d => d.buyer_id === user_id || d.seller_id === user_id);
  }
  if (seller_id) {
    deals = deals.filter(d => d.seller_id === seller_id);
  }
  if (status) {
    deals = deals.filter(d => d.status === status);
  }
  res.json(deals);
});

// CREATE new Escrow agreement
app.post("/api/escrow/create", (req, res) => {
  const { listing_id, buyer_id, buyer_name, buyer_email, amount, assigned_engineer_id } = req.body;
  if (!listing_id || !buyer_id || !amount) {
    return res.status(400).json({ error: "Missing required fields: listing_id, buyer_id, amount" });
  }

  const listing = listingsCollection.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "Equipment listing not found" });

  const seller = sellersCollection.find(s => s.id === listing.seller_id);
  const engineer = engineersCollection.find(e => e.id === assigned_engineer_id);

  const newDeal = {
    id: `esc-${Date.now()}`,
    listing_id: listing.id,
    listing_title: listing.title,
    buyer_id,
    buyer_name: buyer_name || 'Hospital Purchaser',
    buyer_email: buyer_email || 'purchaser@hospital.ng',
    seller_id: listing.seller_id,
    seller_name: seller?.business_name || listing.seller_name || 'Medical Equipment Vendor',
    amount: Number(amount),
    currency: listing.currency || 'NGN',
    escrow_fee: Math.round(Number(amount) * 0.02), // 2% escrow protection fee
    status: 'initiated',
    assigned_engineer_id: engineer?.id || 'eng-1',
    assigned_engineer_name: engineer?.name ? `${engineer.name} (${engineer.specialty})` : 'Engr. Emeka Okafor (Biomedical Lead)',
    payment_reference: `ESC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  escrowDealsCollection.unshift(newDeal);
  logActivity(buyer_name || 'Buyer', 'CREATE_ESCROW', 'Escrow', `Created escrow deal for "${listing.title}" (Amount: ₦${Number(amount).toLocaleString()})`);

  // Notify seller
  notificationsCollection.unshift({
    id: `notif-${Date.now()}-esc-cre`,
    user_id: seller?.user_id || 'usr-1',
    type: 'escrow_initiated',
    title: 'New Escrow Purchase Initiated',
    message: `${buyer_name || 'A clinic'} initiated an escrow agreement for "${listing.title}". Awaiting buyer deposit into escrow.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.status(201).json(newDeal);
});

// UPDATE Escrow Status: Deposit Funds
app.patch("/api/escrow/:id/deposit", (req, res) => {
  const deal = escrowDealsCollection.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Escrow deal not found" });

  deal.status = 'funds_deposited';
  deal.updated_at = new Date().toISOString();

  logActivity('System', 'ESCROW_FUNDS_DEPOSITED', 'Escrow', `Escrow funds ₦${deal.amount.toLocaleString()} deposited for deal ${deal.id}`);

  notificationsCollection.unshift({
    id: `notif-${Date.now()}-esc-dep`,
    user_id: deal.buyer_id,
    type: 'escrow_deposited',
    title: 'Escrow Payment Locked',
    message: `Funds (₦${deal.amount.toLocaleString()}) are securely held in Escrow custody. Vendor has been notified to dispatch equipment.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.json(deal);
});

// UPDATE Escrow Status: Dispatch Equipment
app.patch("/api/escrow/:id/dispatch", (req, res) => {
  const { tracking_no } = req.body;
  const deal = escrowDealsCollection.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Escrow deal not found" });

  deal.status = 'equipment_dispatched';
  if (tracking_no) deal.delivery_tracking_no = tracking_no;
  deal.updated_at = new Date().toISOString();

  logActivity(deal.seller_name, 'ESCROW_DISPATCH', 'Escrow', `Equipment dispatched for deal ${deal.id} (Waybill #: ${tracking_no || 'N/A'})`);

  res.json(deal);
});

// UPDATE Escrow Status: Biomedical Engineer Inspection Signoff
app.patch("/api/escrow/:id/engineer-signoff", (req, res) => {
  const { engineer_id, engineer_notes, approved } = req.body;
  const deal = escrowDealsCollection.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Escrow deal not found" });

  deal.engineer_notes = engineer_notes || 'Physical inspection and diagnostic output calibration verified.';
  deal.engineer_approved = approved !== false;
  
  if (approved !== false) {
    deal.status = 'inspected_approved';
  } else {
    deal.status = 'disputed';
  }
  deal.updated_at = new Date().toISOString();

  logActivity('Engineer', 'ESCROW_INSPECTED', 'Escrow', `Biomedical engineer signoff completed for deal ${deal.id}. Result: ${approved !== false ? 'APPROVED' : 'FAILED / DISPUTED'}`);

  res.json(deal);
});

// UPDATE Escrow Status: Release Funds to Vendor
app.patch("/api/escrow/:id/release-funds", (req, res) => {
  const deal = escrowDealsCollection.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Escrow deal not found" });

  deal.status = 'funds_released';
  deal.updated_at = new Date().toISOString();

  logActivity('Escrow Custody', 'ESCROW_RELEASED', 'Escrow', `Escrow payout ₦${deal.amount.toLocaleString()} released to vendor ${deal.seller_name}`);

  notificationsCollection.unshift({
    id: `notif-${Date.now()}-esc-rel`,
    user_id: deal.buyer_id,
    type: 'escrow_completed',
    title: 'Escrow Disbursed & Completed',
    message: `Payment for "${deal.listing_title}" has been released to ${deal.seller_name}. Thank you for using MediTrade Escrow!`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.json(deal);
});

// UPDATE Escrow Status: Raise Dispute
app.patch("/api/escrow/:id/raise-dispute", (req, res) => {
  const { reason } = req.body;
  const deal = escrowDealsCollection.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Escrow deal not found" });

  deal.status = 'disputed';
  if (reason) deal.engineer_notes = `DISPUTE RAISED: ${reason}`;
  deal.updated_at = new Date().toISOString();

  logActivity('Buyer', 'ESCROW_DISPUTE', 'Escrow', `Dispute raised on deal ${deal.id}: ${reason || 'Equipment issue reported'}`);

  res.json(deal);
});

// ==========================================
// EQUIPMENT LEASE FINANCING API ENDPOINTS
// ==========================================

// GET Financing Partners
app.get("/api/financing/partners", (req, res) => {
  res.json(financingPartnersCollection);
});

// GET Financing Applications
app.get("/api/financing/applications", (req, res) => {
  const { buyer_id, status } = req.query;
  let apps = [...financingApplicationsCollection];
  if (buyer_id) {
    apps = apps.filter(a => a.buyer_id === buyer_id);
  }
  if (status) {
    apps = apps.filter(a => a.status === status);
  }
  res.json(apps);
});

// SUBMIT Lease Financing Application
app.post("/api/financing/apply", (req, res) => {
  const {
    buyer_id,
    hospital_name,
    contact_email,
    contact_phone,
    equipment_id,
    down_payment,
    tenure_months,
    partner_bank_id,
    cac_registration,
    medical_license,
    monthly_patient_volume
  } = req.body;

  if (!equipment_id || !hospital_name || !partner_bank_id) {
    return res.status(400).json({ error: "Missing mandatory lease parameters" });
  }

  const equipment = listingsCollection.find(l => l.id === equipment_id);
  const partner = financingPartnersCollection.find(p => p.id === partner_bank_id);

  if (!equipment) return res.status(404).json({ error: "Equipment listing not found" });

  const price = equipment.price;
  const downPaymentVal = Number(down_payment) || Math.round(price * 0.15);
  const financedVal = price - downPaymentVal;
  const tenure = Number(tenure_months) || 24;
  const annualRate = partner?.interest_rate_annual || 17.0;
  
  // Calculate monthly repayment with annuity interest
  const monthlyRate = (annualRate / 100) / 12;
  const monthlyRepaymentVal = Math.round(
    (financedVal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1)
  );

  const newApp = {
    id: `app-${Date.now()}`,
    buyer_id: buyer_id || 'usr-5',
    hospital_name,
    contact_email: contact_email || 'purchasing@hospital.ng',
    contact_phone: contact_phone || '+2348000000000',
    equipment_id: equipment.id,
    equipment_title: equipment.title,
    equipment_price: price,
    down_payment: downPaymentVal,
    financed_amount: financedVal,
    tenure_months: tenure,
    monthly_repayment: monthlyRepaymentVal,
    partner_bank_id: partner?.id || 'fin-partner-1',
    partner_bank_name: partner?.name || 'Commercial Bank Partner',
    cac_registration: cac_registration || 'RC-PENDING',
    medical_license: medical_license || 'MDCN-PENDING',
    monthly_patient_volume: Number(monthly_patient_volume) || 300,
    status: 'submitted',
    approval_notes: 'Underwriting desk created application dossier for bank risk review.',
    created_at: new Date().toISOString()
  };

  financingApplicationsCollection.unshift(newApp);
  logActivity(hospital_name, 'APPLY_FINANCING', 'LeaseFinancing', `Submitted lease application for "${equipment.title}" with ${partner?.name}`);

  notificationsCollection.unshift({
    id: `notif-${Date.now()}-fin-app`,
    user_id: buyer_id || 'usr-5',
    type: 'financing_submitted',
    title: 'Lease Application Submitted',
    message: `Your equipment financing request for "${equipment.title}" was received by ${partner?.name}. Pre-qualification in progress.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.status(201).json(newApp);
});

// UPDATE Financing Application Status (Bank Desk / Admin)
app.patch("/api/financing/applications/:id/status", (req, res) => {
  const { status, approval_notes } = req.body;
  const appItem = financingApplicationsCollection.find(a => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: "Lease application not found" });

  if (status) appItem.status = status;
  if (approval_notes) appItem.approval_notes = approval_notes;

  logActivity('BankUnderwriter', 'UPDATE_FINANCING_STATUS', 'LeaseFinancing', `Updated application ${appItem.id} status to ${status}`);

  notificationsCollection.unshift({
    id: `notif-${Date.now()}-fin-upd`,
    user_id: appItem.buyer_id,
    type: 'financing_updated',
    title: `Financing Update: ${appItem.equipment_title}`,
    message: `Status updated to ${status.toUpperCase()}. Notes: ${approval_notes || 'Proceed to document execution.'}`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.json(appItem);
});


// Update user profile info dynamically on backend
app.post("/api/users/update", (req, res) => {
  const { user_id, email, phone, businessName, cac_number, profile_image_url } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  const user = usersCollection.find(u => u.id === user_id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (profile_image_url) (user as any).profile_image_url = profile_image_url;

  // If the user is a seller, update the seller's profile
  if (user.role === 'seller') {
    const seller = sellersCollection.find(s => s.user_id === user.id);
    if (seller) {
      if (businessName) seller.business_name = businessName;
      if (phone) {
        seller.phone_number = phone;
        seller.whatsapp_number = phone; // sync whatsapp
      }
      if (email) seller.email = email;
      if (cac_number) seller.cac_number = cac_number;
      if (profile_image_url) seller.logo_url = profile_image_url;
    }
  }

  // If the user is a buyer, update their hospital profile representation
  if (user.role === 'buyer') {
    // If we have leads involving this buyer, keep the name or contact updated
    leadsCollection.forEach(l => {
      if (l.buyer_id === user.id) {
        if (businessName) l.buyer_name = businessName;
        if (phone) l.buyer_contact = `${email} (${phone})`;
      }
    });
  }

  logActivity(user.email, 'UPDATE_PROFILE', 'User Settings', `Updated profile credentials on database: Name: ${businessName}, Phone: ${phone}`);
  res.json({ success: true, user });
});

// Dynamic Account Registration Endpoint
app.post("/api/auth/register", (req, res) => {
  const { email, phone, role, businessName, cacNumber, state, city } = req.body;
  
  if (!email || !role || !businessName) {
    return res.status(400).json({ error: "Required fields missing (email, role, businessName)" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = usersCollection.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: "An operator with this email is already registered." });
  }

  const userId = `usr-${Date.now()}`;
  const newUser = {
    id: userId,
    firebase_uid: `f-mock-${Date.now()}`,
    email: normalizedEmail,
    phone: phone || '+2348000000000',
    role: role || 'seller',
    status: 'active'
  };

  usersCollection.push(newUser);

  let sellerObj = null;

  if (role === 'seller') {
    const sellerId = `sel-${Date.now()}`;
    const newSeller: Seller = {
      id: sellerId,
      user_id: userId,
      business_name: businessName,
      contact_name: normalizedEmail.split('@')[0],
      whatsapp_number: phone || '+2348000000000',
      phone_number: phone || '+2348000000000',
      email: normalizedEmail,
      state: state || 'Lagos',
      city: city || 'Ikeja',
      verification_status: 'unverified',
      subscription_plan: 'free',
      active_listings_count: 0,
      rating_placeholder: 5.0,
      created_at: new Date().toISOString(),
      cac_number: cacNumber || ''
    };
    sellersCollection.push(newSeller);
    sellerObj = newSeller;
  }

  logActivity(normalizedEmail, 'REGISTER', 'User', `Registered new clinical account. Role: ${role}, Entity: ${businessName}`);
  
  res.json({
    success: true,
    user: newUser,
    seller: sellerObj,
    businessName: businessName
  });
});

// ==========================================
// AI ENGINE CHATPLAYGROUND & GEMINI SERVICE
// ==========================================

// Gemini Extract Listing Pipeline
app.post("/api/ai/extract-listing", criticalLimiter, async (req, res) => {
  const { message } = req.body;
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: "Paste raw WhatsApp seller text to scan with Google AI." });
  }

  try {
    logActivity('Gemini-Engine', 'AI_SCAN_REQUEST', 'AI Pipeline', `Analyzing WhatsApp paragraph text with Gemini 3.5-flash`);

    const systemPrompt = `You are a medical equipment domain architect in West Africa. 
Analyze raw hospital trading text and return a beautifully structured JSON with clean fields:
1. title: Polished, professional product title (clean brand and device model labels, correct case, remove messy phone numbers or dates).
2. Category Name: Match with standard medical categories: 
   "Ultrasound Machines", "X-Ray Equipment", "CT & MRI Accessories", "Laboratory Equipment", "Theatre Equipment", "ICU Equipment", "Patient Monitors", "Hospital Beds & Furniture", "PPE & Consumables", "Syringes & Needles", "Gloves", "Infusion Pumps", "Autoclaves & Sterilizers", "Dental Equipment".
3. brand: Manufacturer (e.g. Mindray, GE Healthcare, Tuttnauer, Sonoscape, Shimadzu). If not specified, set to "Generic" or empty.
4. model: Product model ID.
5. condition: Must be strictly "new", "refurbished", "working_used", "faulty", "parts_only", or "scrap". (Decide based on semantic tags: 'new'/'tear rubber'/'unused' -> "new", 'refurbished' -> "refurbished", 'faulty'/'defect'/'not working' -> "faulty", 'parts'/'for parts' -> "parts_only", 'scrap'/'salvage' -> "scrap", otherwise -> "working_used").
6. price: The estimated total price as a pure number.
7. currency: NGN (Nigerian Naira) or USD (US Dollar). (Naira might be labeled as "₦", "NGN", "M" for million Naira).
8. location_state: Match location to a standard Nigerian state.
9. location_city: Local city/town name where equipment is stored.
10. seller_phone: Handphone or WhatsApp number found in the prompt text.
11. description: Cleaned-up professional clinical description formatted with proper English.
12. missing_fields: String array listing vital fields absent in input (e.g. ['warranty', 'photos', 'transducers', 'backup battery health']).
13. spam_flag: Boolean flag indicating if the text contains high-risk keywords (Western union transfer, fast wiring, double cash overnight schemes etc).
14. spam_reasons: Array of why it was flagged as spam.`;

    // Modern SDK generateContent call using gemini-3.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Raw Message to parse:\n"${message}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            brand: { type: Type.STRING },
            model: { type: Type.STRING },
            condition: { type: Type.STRING },
            price: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            location_state: { type: Type.STRING },
            location_city: { type: Type.STRING },
            seller_phone: { type: Type.STRING },
            description: { type: Type.STRING },
            missing_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
            spam_flag: { type: Type.BOOLEAN },
            spam_reasons: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["title", "category", "condition", "price", "currency", "location_state", "description"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No output returned from the Gemini modeling node.");
    }

    const structuredData = JSON.parse(outputText);
    logActivity('Gemini-Engine', 'AI_SCAN_SUCCESS', 'AI Pipeline', `Extracted listing product: ${structuredData.title}`);
    res.json(structuredData);
  } catch (err: any) {
    console.error("Gemini failed:", err);
    res.status(500).json({ error: `AI Parser node failed: ${err.message || 'Verification failed. Please check your GEMINI_API_KEY settings.'}` });
  }
});

// Gemini Improve Description Workflow
app.post("/api/ai/improve-description", criticalLimiter, async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: "Description is empty" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Rewrite this medical equipment description to sound highly professional, technical, clean, and organized. List key features to help hospitals make buying decisions:\n\n"${description}"`,
    });
    res.json({ enhanced: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dynamic Intelligent Category Detector
app.post("/api/ai/classify-category", criticalLimiter, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title is empty" });

  try {
    const listLabels = categoriesCollection.map(c => `"${c.name}" (ID: ${c.id})`).join(', ');
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Identify the single most appropriate medical equipment category for "${title}" from this matching index: [${listLabels}]. Return ONLY the Category ID.`,
    });
    
    const matchedId = response.text?.trim() || 'cat-10';
    res.json({ category_id: matchedId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Intelligent Duplicate Listing Detector
app.post("/api/ai/detect-duplicate", criticalLimiter, async (req, res) => {
  const { title, details } = req.body;
  if (!title) return res.status(400).json({ error: "Product title is required to test duplicates." });

  try {
    const activeListingsStr = listingsCollection.map(l => `- "${l.title}" by ${l.seller_name} located in ${l.state} (Price: ${l.price})`).join('\n');
    
    const prompt = `Assess the risk that the incoming medical product posting is a duplicate of something recently posted. Give a percentage of similarity and a risk comment.
    
    Incoming: "${title}" (${details || ''})
    
    Active database index listings:
    ${activeListingsStr || 'None'}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            similarityPercentage: { type: Type.NUMBER },
            isDuplicate: { type: Type.BOOLEAN },
            matchingOffer: { type: Type.STRING },
            reasons: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["similarityPercentage", "isDuplicate", "reasons"]
        }
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Procurement Matcher
app.post("/api/ai/match-procurement", criticalLimiter, async (req, res) => {
  const { listing_id } = req.body;
  const listing = listingsCollection.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "Product listing not found" });

  try {
    const rfqsStr = procurementRequestsCollection.map(r => `RFQ #${r.id}: "${r.title}". Details: ${r.description}. State: ${r.state}. Budget: ${r.budget}`).join('\n');
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an AI Hospital Sourcing Agent. Match this newly added medical listing: "${listing.title}" with description "${listing.description}" in state "${listing.state}" and price "${listing.price}".
      
      Compare against these hospital requests currently open in West Africa:
      ${rfqsStr}
      
      Return a JSON array of matched items with score percentages, recommending actions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              requestId: { type: Type.STRING },
              relevancePercentage: { type: Type.NUMBER },
              matchingJustification: { type: Type.STRING }
            },
            required: ["requestId", "relevancePercentage", "matchingJustification"]
          }
        }
      }
    });

    res.json(JSON.parse(response.text || '[]'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Technical Comparison Matrix
app.post("/api/ai/compare-devices", criticalLimiter, async (req, res) => {
  const { devices, facility_context } = req.body;
  if (!devices || !Array.isArray(devices) || devices.length < 2) {
    return res.status(400).json({ error: "Please select at least 2 medical devices to compare." });
  }

  try {
    const facility = facility_context || "General Secondary Hospital / Clinical Facility";
    const deviceSpecsText = devices.map((d: any, idx: number) => {
      return `Device #${idx + 1}: ID: "${d.id}", Title: "${d.title}", Brand: "${d.brand || 'N/A'}", Model: "${d.model || 'N/A'}", Condition: "${d.condition}", Price: ${d.price} ${d.currency || 'NGN'}, Category: "${d.category_name || d.category_id || 'Medical Equipment'}", State: "${d.state || 'Lagos'}", Description: "${d.description || 'N/A'}"`;
    }).join("\n\n");

    const systemInstruction = `You are a Senior Clinical Engineering Specialist & Hospital Procurement Advisor in West Africa with 20+ years of biomedical experience.
Compare the provided medical devices side-by-side for a target facility type: "${facility}".

Provide an authoritative, detailed technical breakdown covering:
1. Executive clinical summary explaining the comparison context.
2. Winning device recommendation and primary justification.
3. Individual device evaluations:
   - clinicalSuitabilityScore (1-100)
   - tco3YearEstimateNaira (Estimated 3-Year Total Cost of Ownership in NGN, including purchase, servicing, consumables)
   - keyPros (3-5 distinct technical/clinical advantages)
   - keyCons (2-4 limitations or operational requirements)
   - powerGridReadiness (Assessment of surge tolerance, UPS necessity, generator friendliness)
   - biomedicalMaintainabilityScore (1-10 rating for local spare parts & engineer serviceability)
   - consumableCostRating ("Low", "Moderate", "High")
4. Head-to-head dimension benchmarks (comparing power resilience, diagnostic accuracy, mobility, maintenance, lease value).
5. Procurement committee recommendations (negotiation tips, spare parts kit to order, escrow safety).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Facility Context: ${facility}\n\nSelected Medical Devices:\n${deviceSpecsText}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            winningDeviceId: { type: Type.STRING },
            winningDeviceTitle: { type: Type.STRING },
            winningReason: { type: Type.STRING },
            deviceEvaluations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  deviceId: { type: Type.STRING },
                  deviceTitle: { type: Type.STRING },
                  clinicalSuitabilityScore: { type: Type.NUMBER },
                  tco3YearEstimateNaira: { type: Type.NUMBER },
                  keyPros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  keyCons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  powerGridReadiness: { type: Type.STRING },
                  biomedicalMaintainabilityScore: { type: Type.NUMBER },
                  consumableCostRating: { type: Type.STRING }
                },
                required: ["deviceId", "deviceTitle", "clinicalSuitabilityScore", "tco3YearEstimateNaira", "keyPros", "keyCons", "powerGridReadiness", "biomedicalMaintainabilityScore", "consumableCostRating"]
              }
            },
            headToHeadGrid: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dimension: { type: Type.STRING },
                  analysis: { type: Type.STRING },
                  bestDeviceTitle: { type: Type.STRING }
                },
                required: ["dimension", "analysis", "bestDeviceTitle"]
              }
            },
            procurementRecommendation: {
              type: Type.OBJECT,
              properties: {
                negotiationAdvice: { type: Type.STRING },
                recommendedSpareParts: { type: Type.ARRAY, items: { type: Type.STRING } },
                escrowSafetyNotes: { type: Type.STRING }
              },
              required: ["negotiationAdvice", "recommendedSpareParts", "escrowSafetyNotes"]
            }
          },
          required: ["executiveSummary", "winningDeviceTitle", "winningReason", "deviceEvaluations", "headToHeadGrid", "procurementRecommendation"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    logActivity('Gemini-Engine', 'AI_COMPARE_SUCCESS', 'AI Comparison', `Generated side-by-side technical comparison for ${devices.length} devices.`);
    res.json(parsedData);
  } catch (err: any) {
    console.error("Comparison AI Error:", err);
    res.status(500).json({ error: `AI Comparison Engine Error: ${err.message || 'Failed to generate comparison analysis.'}` });
  }
});

// GET complete database snapshot for live diagnostics/auditing
app.get("/api/diagnostics/schema", (req, res) => {
  res.json({
    metrics: {
      listings_count: listingsCollection.length,
      sellers_count: sellersCollection.length,
      categories_count: categoriesCollection.length,
      rfqs_count: procurementRequestsCollection.length,
      users_count: usersCollection.length,
      reports_count: reportsCollection.length,
      verification_requests: verificationRequestsCollection.length,
      audit_logs_count: activityLogsCollection.length,
      engineers_count: engineersCollection.length,
      reviews_count: engineerReviewsCollection.length
    },
    tables: {
      users: usersCollection,
      sellers: sellersCollection,
      categories: categoriesCollection,
      listings: listingsCollection.map(l => ({ id: l.id, title: l.title, status: l.status, price: l.price, state: l.state })),
      reports: reportsCollection,
      verification_requests: verificationRequestsCollection,
      audit_logs: activityLogsCollection,
      engineers: engineersCollection,
      reviews: engineerReviewsCollection
    }
  });
});

// ==========================================
// CLINICAL BIOMEDICAL ENGINEERS & SERVICES API
// ==========================================

// GET /api/engineers - Retrieve list of engineers with search & filters
app.get("/api/engineers", (req, res) => {
  let filtered = [...engineersCollection];
  const { specialty, state, query } = req.query;

  if (specialty) {
    filtered = filtered.filter(e => e.specialty.toLowerCase().includes((specialty as string).toLowerCase()));
  }
  if (state) {
    filtered = filtered.filter(e => e.state.toLowerCase() === (state as string).toLowerCase());
  }
  if (query) {
    const sQuery = (query as string).toLowerCase();
    filtered = filtered.filter(e => 
      e.name.toLowerCase().includes(sQuery) || 
      e.specialty.toLowerCase().includes(sQuery) ||
      e.bio.toLowerCase().includes(sQuery) ||
      e.services_offered.some(s => s.toLowerCase().includes(sQuery))
    );
  }

  res.json(filtered);
});

// GET /api/engineers/:id/reviews - Retrieve reviews for an engineer
app.get("/api/engineers/:id/reviews", (req, res) => {
  const engineerId = req.params.id;
  const reviews = engineerReviewsCollection.filter(r => r.engineer_id === engineerId);
  res.json(reviews);
});

// POST /api/engineers/:id/reviews - Submit a review for an engineer
app.post("/api/engineers/:id/reviews", (req, res) => {
  const engineerId = req.params.id;
  const { reviewer_id, reviewer_name, reviewer_business, rating, comment } = req.body;

  if (!reviewer_name || !rating || !comment) {
    return res.status(400).json({ error: "Reviewer name, rating, and comment are required." });
  }

  const newReview: EngineerReview = {
    id: `rev-${Date.now()}`,
    engineer_id: engineerId,
    reviewer_id: reviewer_id || `usr-anonymous-${Date.now()}`,
    reviewer_name,
    reviewer_business: reviewer_business || "Clinical Practitioner",
    rating: Number(rating),
    comment,
    created_at: new Date().toISOString()
  };

  engineerReviewsCollection.unshift(newReview);

  // Recalculate average rating for the engineer
  const engReviews = engineerReviewsCollection.filter(r => r.engineer_id === engineerId);
  const totalRating = engReviews.reduce((sum, r) => sum + r.rating, 0);
  const average = totalRating / engReviews.length;

  const engineer = engineersCollection.find(e => e.id === engineerId);
  if (engineer) {
    engineer.average_rating = parseFloat(average.toFixed(1));
  }

  logActivity(reviewer_name, 'SUBMIT_REVIEW', 'Engineer', `Submitted a ${rating}-star review for engineer ${engineer?.name || engineerId}`);

  res.status(201).json(newReview);
});

// POST /api/engineers - Create/Register an engineer profile
app.post("/api/engineers", (req, res) => {
  const { name, specialty, experience_years, phone, email, state, city, bio, services_offered, avatar_url } = req.body;

  if (!name || !specialty || !phone || !email || !state || !city || !bio) {
    return res.status(400).json({ error: "Required fields are missing: name, specialty, phone, email, state, city, bio." });
  }

  const newEngineer: Engineer = {
    id: `eng-${Date.now()}`,
    name,
    specialty,
    experience_years: Number(experience_years) || 1,
    phone,
    email,
    state,
    city,
    bio,
    avatar_url: avatar_url || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    verified_status: 'unverified',
    average_rating: 0,
    services_offered: Array.isArray(services_offered) ? services_offered : [],
    created_at: new Date().toISOString()
  };

  engineersCollection.unshift(newEngineer);
  logActivity(name, 'REGISTER_ENGINEER', 'Engineer', `Created a new medical engineer profile: ${name}`);

  res.status(201).json(newEngineer);
});

// ==========================================
// PRE-PURCHASE BIOMEDICAL ENGINEERING AUDITS
// ==========================================

// GET /api/inspections - List inspection requests
app.get("/api/inspections", (req, res) => {
  const { buyer_id, seller_id, listing_id, engineer_id, status } = req.query;
  let filtered = [...inspectionRequestsCollection];

  if (buyer_id) {
    filtered = filtered.filter(i => i.buyer_id === buyer_id);
  }
  if (seller_id) {
    filtered = filtered.filter(i => i.seller_id === seller_id);
  }
  if (listing_id) {
    filtered = filtered.filter(i => i.listing_id === listing_id);
  }
  if (engineer_id) {
    filtered = filtered.filter(i => i.assigned_engineer_id === engineer_id);
  }
  if (status) {
    filtered = filtered.filter(i => i.status === status);
  }

  res.json(filtered);
});

// GET /api/inspections/:id - Get single inspection request
app.get("/api/inspections/:id", (req, res) => {
  const item = inspectionRequestsCollection.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Inspection request not found" });
  res.json(item);
});

// POST /api/inspections/request - Trigger a new Pre-Purchase Audit
app.post("/api/inspections/request", (req, res) => {
  const {
    listing_id,
    buyer_id,
    buyer_name,
    buyer_phone,
    buyer_email,
    hospital_name,
    preferred_engineer_id,
    inspection_location,
    scheduled_date,
    notes,
    link_escrow
  } = req.body;

  if (!listing_id || !buyer_name || !buyer_phone) {
    return res.status(400).json({ error: "Missing required inspection parameters" });
  }

  const listing = listingsCollection.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "Medical equipment listing not found" });

  const seller = sellersCollection.find(s => s.id === listing.seller_id);

  // Assign requested engineer or pick matching engineer from directory
  let engineer = engineersCollection.find(e => e.id === preferred_engineer_id);
  if (!engineer) {
    engineer = engineersCollection.find(e => e.state.toLowerCase() === (listing.state || 'lagos').toLowerCase()) || engineersCollection[0];
  }

  const defaultChecklist = [
    {
      id: `chk-1-${Date.now()}`,
      label: 'Sensor / Transducer Signal Precision & Sensitivity Test',
      category: 'sensor_calibration',
      status: 'pending',
      measured_value: '',
      notes: 'Evaluate sensor frequency response & SNR'
    },
    {
      id: `chk-2-${Date.now()}`,
      label: 'High Voltage Tube Head / Generator Output & Radiation Leakage Test',
      category: 'tube_head_voltage',
      status: 'pending',
      measured_value: '',
      notes: 'X-Ray kVp / mA output calibration check'
    },
    {
      id: `chk-3-${Date.now()}`,
      label: 'West Africa Mains Voltage Surge Tolerance & Battery/UPS Cutover',
      category: 'power_surge',
      status: 'pending',
      measured_value: '',
      notes: 'Check 220V stabilization under load'
    },
    {
      id: `chk-4-${Date.now()}`,
      label: 'Probe, Cable Harness, Mounting & Essential Accessories Completeness Audit',
      category: 'accessories',
      status: 'pending',
      measured_value: '',
      notes: 'Verify missing probes, cuffs, lead cables or footswitches'
    },
    {
      id: `chk-5-${Date.now()}`,
      label: 'Chassis Electrical Safety & Ground Wire Leakage Current Check',
      category: 'safety',
      status: 'pending',
      measured_value: '',
      notes: 'Confirm compliance with IEC 60601 medical safety'
    }
  ];

  let escrowDealId = undefined;

  if (link_escrow !== false) {
    let existingEscrow = escrowDealsCollection.find(d => d.listing_id === listing.id && d.buyer_id === (buyer_id || 'usr-5'));
    if (!existingEscrow) {
      existingEscrow = {
        id: `esc-${Date.now()}`,
        listing_id: listing.id,
        listing_title: listing.title,
        buyer_id: buyer_id || 'usr-5',
        buyer_name: buyer_name,
        buyer_email: buyer_email || 'buyer@hospital.ng',
        seller_id: listing.seller_id,
        seller_name: seller?.business_name || listing.seller_name || 'Medical Vendor',
        amount: listing.price,
        currency: listing.currency || 'NGN',
        escrow_fee: Math.round(listing.price * 0.02),
        status: 'initiated',
        assigned_engineer_id: engineer?.id,
        assigned_engineer_name: engineer ? `${engineer.name} (${engineer.specialty})` : 'Certified Biomedical Lead',
        payment_reference: `ESC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      escrowDealsCollection.unshift(existingEscrow);
    }
    escrowDealId = existingEscrow.id;
  }

  const inspectionFee = listing.price > 5000000 ? 120000 : 65000;

  const newInspection = {
    id: `insp-${Date.now()}`,
    listing_id: listing.id,
    listing_title: listing.title,
    listing_condition: listing.condition,
    listing_price: listing.price,
    listing_currency: listing.currency || 'NGN',
    seller_id: listing.seller_id,
    seller_name: seller?.business_name || listing.seller_name || 'Vendor',
    buyer_id: buyer_id || 'usr-5',
    buyer_name,
    buyer_phone,
    buyer_email: buyer_email || 'purchaser@hospital.ng',
    hospital_name: hospital_name || buyer_name,
    assigned_engineer_id: engineer?.id || 'eng-1',
    assigned_engineer_name: engineer ? `${engineer.name} (${engineer.specialty})` : 'Engr. Emeka Okafor',
    assigned_engineer_phone: engineer?.phone || '+2348031112233',
    inspection_location: inspection_location || `${seller?.city || listing.city || 'Lagos'}, ${seller?.state || listing.state || 'Lagos'} Warehouse Site`,
    scheduled_date: scheduled_date || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    status: 'scheduled',
    notes: notes || `Pre-purchase engineering audit requested on ${listing.condition.replace('_', ' ').toUpperCase()} unit prior to final payment settlement.`,
    fee_amount: inspectionFee,
    escrow_linked: link_escrow !== false,
    escrow_deal_id: escrowDealId,
    checklist: defaultChecklist,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  inspectionRequestsCollection.unshift(newInspection);

  logActivity(buyer_name, 'REQUEST_INSPECTION', 'BiomedicalAudit', `Requested pre-purchase engineering audit for "${listing.title}" with engineer ${newInspection.assigned_engineer_name}`);

  notificationsCollection.unshift({
    id: `notif-${Date.now()}-insp-new`,
    user_id: seller?.user_id || 'usr-1',
    type: 'inspection_requested',
    title: 'Pre-Purchase Audit Scheduled',
    message: `${buyer_name} requested a Certified Biomedical Engineer audit for "${listing.title}". Scheduled engineer: ${newInspection.assigned_engineer_name}.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.status(201).json(newInspection);
});

// PATCH /api/inspections/:id/submit-report - Submit audit report & certificate verdict
app.post("/api/inspections/:id/submit-report", (req, res) => {
  const { id } = req.params;
  const { checklist, verdict_notes, status } = req.body;

  const inspection = inspectionRequestsCollection.find(i => i.id === id);
  if (!inspection) return res.status(404).json({ error: "Inspection request not found" });

  if (checklist && Array.isArray(checklist)) {
    inspection.checklist = checklist;
  }
  if (verdict_notes) {
    inspection.engineer_verdict_notes = verdict_notes;
  }

  const finalStatus = status || 'passed';
  inspection.status = finalStatus;
  inspection.completed_at = new Date().toISOString();
  inspection.updated_at = new Date().toISOString();

  if (finalStatus === 'passed') {
    inspection.certificate_no = `CERT-BIOMED-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  if (inspection.escrow_deal_id) {
    const deal = escrowDealsCollection.find(d => d.id === inspection.escrow_deal_id);
    if (deal) {
      deal.engineer_notes = `Biomedical Audit Result (${finalStatus.toUpperCase()}): ${verdict_notes || 'All calibration tests completed.'}`;
      deal.engineer_approved = finalStatus === 'passed';
      if (finalStatus === 'passed') {
        deal.status = 'inspected_approved';
      } else {
        deal.status = 'disputed';
      }
      deal.updated_at = new Date().toISOString();
    }
  }

  logActivity(inspection.assigned_engineer_name, 'COMPLETE_INSPECTION', 'BiomedicalAudit', `Submitted calibration report for ${inspection.listing_title}. Result: ${finalStatus.toUpperCase()}`);

  notificationsCollection.unshift({
    id: `notif-${Date.now()}-insp-done`,
    user_id: inspection.buyer_id,
    type: 'inspection_completed',
    title: finalStatus === 'passed' ? 'Pre-Purchase Audit PASSED! Certified' : 'Pre-Purchase Audit DEFECTS REPORTED',
    message: finalStatus === 'passed' 
      ? `Calibration certificate ${inspection.certificate_no} issued for "${inspection.listing_title}". Payment escrow cleared for settlement.`
      : `Defects identified during pre-purchase inspection on "${inspection.listing_title}". Dispute raised in escrow custody.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.json(inspection);
});


// ==========================================
// INTER-STATE HEAVY LOGISTICS COST ESTIMATOR
// ==========================================

let logisticsQuotesCollection: any[] = [
  {
    id: 'log-101',
    quote_number: 'LOG-2026-9912',
    listing_id: 'list-2',
    listing_title: 'GE Voluson P8 3D/4D Ultrasound Machine',
    origin_state: 'Lagos',
    origin_city: 'Ikeja',
    destination_state: 'Enugu',
    destination_city: 'Enugu Urban',
    equipment_category: 'ultrasound_echocardiogram',
    equipment_value_ngn: 14500000,
    buyer_id: 'usr-5',
    buyer_name: 'Dr. Fatima Bello',
    hospital_name: 'Riverside Memorial Hospital',
    base_freight_ngn: 256500,
    specialized_packaging_ngn: 45000,
    distance_km: 570,
    estimated_transit_hours: 36,
    insurance_ngn: 108750,
    rigger_crane_ngn: 45000,
    escort_vehicle_ngn: 0,
    biomed_specialist_ngn: 65000,
    waybill_tolls_ngn: 18000,
    total_logistics_cost_ngn: 538250,
    transit_type: 'Air-Ride Suspension Freight Truck',
    recommended_vehicle: '5-Ton Air-Suspension Closed Box Truck with Shock Sensors',
    special_handling_notes: [
      'Padded shockproof flight case for 3D/4D Transducers',
      'Anti-vibration transit straps & shock tag indicator installed',
      'Biomedical Engineer onboard escort for sensor calibration verification upon delivery'
    ],
    status: 'saved',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 14).toISOString()
  }
];

function getInterStateDistanceKm(originState: string, destState: string): { km: number; hours: number } {
  const o = (originState || 'Lagos').toLowerCase().trim();
  const d = (destState || 'Lagos').toLowerCase().trim();

  if (o === d) return { km: 50, hours: 8 };

  const matrix: Record<string, Record<string, { km: number; hours: number }>> = {
    lagos: {
      abuja: { km: 750, hours: 48 },
      enugu: { km: 570, hours: 36 },
      rivers: { km: 610, hours: 40 },
      kano: { km: 1000, hours: 60 },
      oyo: { km: 130, hours: 12 },
      anambra: { km: 500, hours: 32 },
      edo: { km: 310, hours: 20 },
      cross_river: { km: 720, hours: 48 },
      delta: { km: 430, hours: 28 },
      kaduna: { km: 820, hours: 52 }
    },
    abuja: {
      lagos: { km: 750, hours: 48 },
      kano: { km: 360, hours: 24 },
      enugu: { km: 420, hours: 28 },
      rivers: { km: 680, hours: 44 },
      kaduna: { km: 210, hours: 14 },
      plateau: { km: 280, hours: 18 }
    }
  };

  if (matrix[o] && matrix[o][d]) return matrix[o][d];
  if (matrix[d] && matrix[d][o]) return matrix[d][o];

  return { km: 540, hours: 36 };
}

function calculateLogisticsBreakdown(params: {
  origin_state: string;
  destination_state: string;
  equipment_category: string;
  equipment_value_ngn: number;
  require_rigger_crane?: boolean;
  require_transit_insurance?: boolean;
  require_escort_vehicle?: boolean;
  require_biomed_specialist?: boolean;
}) {
  const { km, hours } = getInterStateDistanceKm(params.origin_state, params.destination_state);
  const val = Number(params.equipment_value_ngn) || 5000000;

  let baseRatePerKm = 400;
  let packagingFee = 35000;
  let transitType = 'Heavy Goods Closed Truck';
  let recommendedVehicle = '10-Ton Enclosed Hydraulic Tailgate Van';
  let specialHandlingNotes: string[] = [];

  switch (params.equipment_category) {
    case 'xray_ct_mri':
      baseRatePerKm = 850;
      packagingFee = 120000; // Lead lining protection & hydraulic rigging frame
      transitType = 'Heavy Lead-Shielded Hydraulic Crane Hauler';
      recommendedVehicle = '15-Ton Heavy Hydraulic Tailgate Truck with Lead-Lined Dunnage';
      specialHandlingNotes = [
        'Lead-lined radiation shield dunnage & gantry lock-down clamps',
        'Hydraulic tail-lift or 25-ton mobile crane offloading at facility site',
        'Tube-head shock sensor tags attached prior to transit departure'
      ];
      break;

    case 'ultrasound_echocardiogram':
      baseRatePerKm = 450;
      packagingFee = 45000;
      transitType = 'Air-Ride Suspension Pneumatic Freight';
      recommendedVehicle = 'Air-Suspension Padded Box Van with Shock Sensors';
      specialHandlingNotes = [
        'High-density foam padded flight cases for transducers & probes',
        'Pneumatic air-ride suspension transit preventing crystal element displacement',
        'Shock tag monitoring'
      ];
      break;

    case 'icu_beds_tables':
      baseRatePerKm = 550;
      packagingFee = 60000;
      transitType = 'Cubic Volume Hydraulic Furniture Carrier';
      recommendedVehicle = '7.5-Ton Enclosed Furniture Hauler with Tailgate Lift';
      specialHandlingNotes = [
        'Heavy-duty corner guards, bubble wrap & industrial shrink-wrap',
        'Disassembly & assembly engineering crew at destination facility',
        'Actuator motor voltage & brake lock test upon offloading'
      ];
      break;

    case 'lab_analyzers_coldchain':
      baseRatePerKm = 650;
      packagingFee = 75000;
      transitType = 'Refrigerated & Temperature Monitored Carrier';
      recommendedVehicle = 'Temperature-Controlled Climate Box Van (2°C - 8°C)';
      specialHandlingNotes = [
        'Continuous temperature logger & dry ice / battery backup pack',
        'Optical sensor locking during transit',
        'Re-calibration test on arrival before handover sign-off'
      ];
      break;

    default: // standard_clinical
      baseRatePerKm = 380;
      packagingFee = 25000;
      transitType = 'Secured Padded Cargo Freight';
      recommendedVehicle = 'Standard 3.5-Ton Padded Box Van';
      specialHandlingNotes = [
        'Impact-resistant wooden crate with custom foam inserts',
        'Waybill tracking & secure tamper-evident seals'
      ];
      break;
  }

  const baseFreightNgn = Math.round(km * baseRatePerKm);
  const insuranceNgn = params.require_transit_insurance !== false ? Math.round(val * 0.0075) : 0; // 0.75% of equipment value
  const riggerCraneNgn = params.require_rigger_crane ? (params.equipment_category === 'xray_ct_mri' ? 120000 : 55000) : 0;
  const escortVehicleNgn = params.require_escort_vehicle ? 110000 : 0;
  const biomedSpecialistNgn = params.require_biomed_specialist ? 65000 : 0;
  const waybillTollsNgn = km > 200 ? 18000 : 8000;

  const totalNgn = baseFreightNgn + packagingFee + insuranceNgn + riggerCraneNgn + escortVehicleNgn + biomedSpecialistNgn + waybillTollsNgn;

  return {
    base_freight_ngn: baseFreightNgn,
    specialized_packaging_ngn: packagingFee,
    distance_km: km,
    estimated_transit_hours: hours,
    insurance_ngn: insuranceNgn,
    rigger_crane_ngn: riggerCraneNgn,
    escort_vehicle_ngn: escortVehicleNgn,
    biomed_specialist_ngn: biomedSpecialistNgn,
    waybill_tolls_ngn: waybillTollsNgn,
    total_logistics_cost_ngn: totalNgn,
    transit_type: transitType,
    recommended_vehicle: recommendedVehicle,
    special_handling_notes: specialHandlingNotes
  };
}

// POST /api/logistics/estimate - Real-time calculation endpoint
app.post("/api/logistics/estimate", (req, res) => {
  const {
    origin_state,
    destination_state,
    equipment_category,
    equipment_value_ngn,
    require_rigger_crane,
    require_transit_insurance,
    require_escort_vehicle,
    require_biomed_specialist
  } = req.body;

  if (!origin_state || !destination_state) {
    return res.status(400).json({ error: "Origin state and destination state are required." });
  }

  const breakdown = calculateLogisticsBreakdown({
    origin_state,
    destination_state,
    equipment_category: equipment_category || 'standard_clinical',
    equipment_value_ngn: Number(equipment_value_ngn) || 5000000,
    require_rigger_crane: Boolean(require_rigger_crane),
    require_transit_insurance: require_transit_insurance !== false,
    require_escort_vehicle: Boolean(require_escort_vehicle),
    require_biomed_specialist: Boolean(require_biomed_specialist)
  });

  res.json(breakdown);
});

// POST /api/logistics/quote - Generate formal quote
app.post("/api/logistics/quote", (req, res) => {
  const {
    listing_id,
    listing_title,
    origin_state,
    origin_city,
    destination_state,
    destination_city,
    equipment_category,
    equipment_value_ngn,
    require_rigger_crane,
    require_transit_insurance,
    require_escort_vehicle,
    require_biomed_specialist,
    buyer_id,
    buyer_name,
    hospital_name
  } = req.body;

  const breakdown = calculateLogisticsBreakdown({
    origin_state: origin_state || 'Lagos',
    destination_state: destination_state || 'Abuja',
    equipment_category: equipment_category || 'standard_clinical',
    equipment_value_ngn: Number(equipment_value_ngn) || 5000000,
    require_rigger_crane: Boolean(require_rigger_crane),
    require_transit_insurance: require_transit_insurance !== false,
    require_escort_vehicle: Boolean(require_escort_vehicle),
    require_biomed_specialist: Boolean(require_biomed_specialist)
  });

  const quoteNumber = `LOG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newQuote = {
    id: `log-${Date.now()}`,
    quote_number: quoteNumber,
    listing_id,
    listing_title,
    origin_state: origin_state || 'Lagos',
    origin_city: origin_city || 'Main Hub',
    destination_state: destination_state || 'Abuja',
    destination_city: destination_city || 'Central District',
    equipment_category: equipment_category || 'standard_clinical',
    equipment_value_ngn: Number(equipment_value_ngn) || 5000000,
    buyer_id: buyer_id || 'usr-5',
    buyer_name: buyer_name || 'Hospital Purchaser',
    hospital_name: hospital_name || buyer_name || 'Medical Facility',
    ...breakdown,
    status: 'saved',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 14).toISOString()
  };

  logisticsQuotesCollection.unshift(newQuote);

  logActivity(newQuote.buyer_name, 'CREATE_LOGISTICS_QUOTE', 'InterStateLogistics', `Calculated inter-state delivery estimate (${origin_state} -> ${destination_state}) for ₦${breakdown.total_logistics_cost_ngn.toLocaleString()}`);

  res.status(201).json(newQuote);
});

// GET /api/logistics/quotes - List quotes
app.get("/api/logistics/quotes", (req, res) => {
  res.json(logisticsQuotesCollection);
});


// ==========================================
// PORT ROUTER MIDDLEWARE & ASSET SERVING
// ==========================================


async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Healthcare Equipment and Consumables Directory running on http://localhost:${PORT}`);
  });
}

startServer();
