/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Category, Listing, Seller, ProcurementRequest, SubscriptionPlan } from './types';

export const NIGERIAN_STATES = [
  'Lagos',
  'Abuja (FCT)',
  'Rivers',
  'Oyo',
  'Kano',
  'Enugu',
  'Anambra',
  'Kaduna',
  'Edo',
  'Delta',
  'Cross River',
  'Abia',
  'Imo',
  'Ogun',
  'Kwara',
  'Plateau',
  'Ondo',
  'Akwa Ibom'
];

export const CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Radiology Equipment', slug: 'radiology-equipment', is_active: true },
  { id: 'cat-2', name: 'Ultrasound Machines', slug: 'ultrasound-machines', is_active: true, parent_id: 'cat-1' },
  { id: 'cat-3', name: 'X-Ray Equipment', slug: 'x-ray-equipment', is_active: true, parent_id: 'cat-1' },
  { id: 'cat-4', name: 'CT & MRI Accessories', slug: 'ct-mri-accessories', is_active: true, parent_id: 'cat-1' },
  { id: 'cat-5', name: 'Laboratory Equipment', slug: 'laboratory-equipment', is_active: true },
  { id: 'cat-6', name: 'Theatre Equipment', slug: 'theatre-equipment', is_active: true },
  { id: 'cat-7', name: 'ICU Equipment', slug: 'icu-equipment', is_active: true },
  { id: 'cat-8', name: 'Patient Monitors', slug: 'patient-monitors', is_active: true, parent_id: 'cat-7' },
  { id: 'cat-9', name: 'Hospital Beds & Furniture', slug: 'beds-furniture', is_active: true },
  { id: 'cat-10', name: 'PPE & Consumables', slug: 'ppe-consumables', is_active: true },
  { id: 'cat-11', name: 'Syringes & Needles', slug: 'syringes-needles', is_active: true, parent_id: 'cat-10' },
  { id: 'cat-12', name: 'Gloves', slug: 'gloves', is_active: true, parent_id: 'cat-10' },
  { id: 'cat-13', name: 'Infusion Pumps', slug: 'infusion-pumps', is_active: true },
  { id: 'cat-14', name: 'Autoclaves & Sterilizers', slug: 'autoclaves', is_active: true },
  { id: 'cat-15', name: 'Dental Equipment', slug: 'dental-equipment', is_active: true },
  { id: 'cat-16', name: 'Physiotherapy Equipment', slug: 'physiotherapy-equipment', is_active: true }
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    name: 'Free Directory',
    price_monthly: 0,
    features: [
      'Up to 3 active listings',
      'Standard search directory visibility',
      'WhatsApp click-to-chat links',
      'Basic listing metrics (views, clicks)'
    ]
  },
  {
    id: 'plan-growth',
    name: 'Growth Seller',
    price_monthly: 15000, // 15,000 NGN/mo
    badge: 'Popular',
    features: [
      'Up to 50 active listings',
      'Featured seller verification badge',
      'Instant matching notifications for RFQs',
      'AI Listing Assistant (WhatsApp message imports)',
      'Paystack or Stripe payment gateway integrations',
      '3 featured listings per month included'
    ]
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise Distributor',
    price_monthly: 45000, // 45,000 NGN/mo
    badge: 'Premium',
    features: [
      'Unlimited listings',
      'Priority top-of-search index sorting',
      'Dedicated CAC verification priority review',
      'Direct API access with bulk automatic uploads',
      'Advanced sales, leads and view count metrics dashboards',
      'Unlimited WhatsApp auto-import extracts',
      'Co-branded hospital newsletters advertisement placement'
    ]
  }
];

export const INITIAL_SELLERS: Seller[] = [
  {
    id: 'sel-1',
    user_id: 'usr-1',
    business_name: 'MedLink Diagnostics Ltd',
    contact_name: 'Dr. Chidi Obi',
    whatsapp_number: '+2348031234567',
    phone_number: '+2348031234567',
    email: 'chidi.obi@medlink.com.ng',
    state: 'Lagos',
    city: 'Ikeja',
    verification_status: 'verified',
    subscription_plan: 'growth',
    active_listings_count: 5,
    rating_placeholder: 4.8,
    cac_number: 'RC-14920412',
    logo_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=100&h=100&fit=crop',
    created_at: '2025-01-15T09:00:00Z'
  },
  {
    id: 'sel-2',
    user_id: 'usr-2',
    business_name: 'West Africa Medical Suppliers',
    contact_name: 'Mrs. Fatima Bello',
    whatsapp_number: '+2348123456789',
    phone_number: '+2348123456789',
    email: 'fatima@westafricamed.com',
    state: 'Abuja (FCT)',
    city: 'Garki',
    verification_status: 'verified',
    subscription_plan: 'enterprise',
    active_listings_count: 12,
    rating_placeholder: 4.9,
    cac_number: 'RC-8293149',
    logo_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=100&h=100&fit=crop',
    created_at: '2025-02-10T14:30:00Z'
  },
  {
    id: 'sel-3',
    user_id: 'usr-4',
    business_name: 'Lagoms Hospital Consumables Inc.',
    contact_name: 'Adebayo Johnson',
    whatsapp_number: '+2347055555123',
    phone_number: '+2347055555123',
    email: 'sales@lagomsconsumables.com.ng',
    state: 'Oyo',
    city: 'Ibadan',
    verification_status: 'unverified',
    subscription_plan: 'free',
    active_listings_count: 2,
    rating_placeholder: 4.2,
    cac_number: undefined,
    created_at: '2025-04-18T11:00:00Z'
  }
];

export const INITIAL_LISTINGS: Listing[] = [
  {
    id: 'list-1',
    seller_id: 'sel-1',
    category_id: 'cat-8', // Patient Monitors
    title: 'Mindray uMec 12 Patient Monitor',
    slug: 'mindray-umec-12-patient-monitor-lagos',
    brand: 'Mindray',
    model: 'uMec 12',
    condition: 'used',
    price: 1350000,
    currency: 'NGN',
    negotiable: true,
    country: 'Nigeria',
    state: 'Lagos',
    city: 'Ikeja',
    description: 'Immaculate used Mindray uMec 12 Patient Monitor direct from US. Screen is scratch-less. Comes with all cables (ECG, Spo2 probe, NIBP cuff with extension tube, and temp sensor). Backup battery has perfect health holding up to 4 hours. Perfect for newly opening clinic theatres and ICUs.',
    status: 'published',
    featured: true,
    stock_status: 'in_stock',
    view_count: 342,
    whatsapp_click_count: 51,
    images: [
      'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=80'
    ],
    seller_name: 'MedLink Diagnostics Ltd',
    seller_whatsapp: '+2348031234567',
    seller_verified: true,
    created_at: '2026-05-10T10:00:00Z',
    updated_at: '2026-05-12T08:30:00Z'
  },
  {
    id: 'list-2',
    seller_id: 'sel-2',
    category_id: 'cat-2', // Ultrasound Machines
    title: 'GE Voluson E8 Expert Ultrasound Machine',
    slug: 'ge-voluson-e8-expert-ultrasound-machine-abuja',
    brand: 'GE Healthcare',
    model: 'Voluson E8',
    condition: 'refurbished',
    price: 18500000,
    currency: 'NGN',
    negotiable: true,
    country: 'Nigeria',
    state: 'Abuja (FCT)',
    city: 'Garki',
    description: 'Professionally refurbished GE Voluson E8. Excellent resolution with HDlive rendering technology. Package includes 3 probes: RAB6-D Active probe, C1-5-D abdominal probe, and IC5-9-D transvaginal probe. Complete with Sony thermal printer. Pre-installed with OB/GYN, abdominal, cardiac, and urology application licenses. Full setup service in Abuja included plus 6 months warranty.',
    status: 'published',
    featured: true,
    stock_status: 'in_stock',
    view_count: 589,
    whatsapp_click_count: 122,
    images: [
      'https://images.unsplash.com/photo-1551076805-e1869033e561?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=500&auto=format&fit=crop&q=80'
    ],
    seller_name: 'West Africa Medical Suppliers',
    seller_whatsapp: '+2348123456789',
    seller_verified: true,
    created_at: '2026-05-18T15:20:00Z',
    updated_at: '2026-05-19T10:00:00Z'
  },
  {
    id: 'list-3',
    seller_id: 'sel-2',
    category_id: 'cat-3', // X-Ray Equipment
    title: 'Shimadzu MobileArt Evolution Portable X-Ray',
    slug: 'shimadzu-mobileart-evolution-portable-xray',
    brand: 'Shimadzu',
    model: 'MobileArt Evolution',
    condition: 'used',
    price: 11000000,
    currency: 'NGN',
    negotiable: false,
    country: 'Nigeria',
    state: 'Abuja (FCT)',
    city: 'Maitama',
    description: 'Shimadzu MobileArt Evolution 32kW portable X-Ray machine. Exceptional maneuverability on wheels. Motor-driven design with safety sensors. Fits in tight hospital lifts and corridors. Unit has been checked by biomedical engineers and delivers clean exposures. Perfect for bedside chests and orthopedic wards.',
    status: 'published',
    featured: false,
    stock_status: 'in_stock',
    view_count: 145,
    whatsapp_click_count: 18,
    images: [
      'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=500&auto=format&fit=crop&q=80'
    ],
    seller_name: 'West Africa Medical Suppliers',
    seller_whatsapp: '+2348123456789',
    seller_verified: true,
    created_at: '2026-05-22T08:00:00Z',
    updated_at: '2026-05-22T08:00:00Z'
  },
  {
    id: 'list-4',
    seller_id: 'sel-3',
    category_id: 'cat-12', // Gloves
    title: 'Latex Examination Gloves (Powdered) - GLOVEX',
    slug: 'glovex-latex-examination-gloves',
    brand: 'GLOVEX',
    model: 'M / L / S size',
    condition: 'new',
    price: 4500,
    currency: 'NGN',
    negotiable: true,
    country: 'Nigeria',
    state: 'Oyo',
    city: 'Ibadan',
    description: 'Bulk supply of Premium Latex examination gloves. Grade A medical grade, pre-powdered. 100 pieces per box, 10 boxes per master carton. Minimum order quantity: 10 cartons. Free delivery inside Ibadan town for orders of 50+ cartons. Flexible payment terms open for established hospital group unions.',
    status: 'published',
    featured: false,
    stock_status: 'in_stock',
    view_count: 98,
    whatsapp_click_count: 24,
    images: [
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'
    ],
    seller_name: 'Lagoms Hospital Consumables Inc.',
    seller_whatsapp: '+2347055555123',
    seller_verified: false,
    created_at: '2026-05-25T11:45:00Z',
    updated_at: '2026-05-25T11:45:00Z'
  },
  {
    id: 'list-5',
    seller_id: 'sel-1',
    category_id: 'cat-14', // Autoclaves
    title: 'Tuttnauer 2540M Manual Tabletop Autoclaver',
    slug: 'tuttnauer-2540m-tabletop-autoclave',
    brand: 'Tuttnauer',
    model: '2540M',
    condition: 'refurbished',
    price: 2400000,
    currency: 'NGN',
    negotiable: true,
    country: 'Nigeria',
    state: 'Lagos',
    city: 'Surulere',
    description: 'Reliable Tuttnauer tabletop autoclave sterilizer. Chamber volume 32 Liters. Excellent for dental practices, small laboratories, surgical units. Comes with brand new door gasket and safety valve installed. Sterilizing times from 3 minutes up to 50 minutes. Operating temperature 121C to 134C. Tested and fully calibrated.',
    status: 'pending_review',
    featured: false,
    stock_status: 'on_demand',
    view_count: 12,
    whatsapp_click_count: 0,
    images: [
      'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=500&auto=format&fit=crop&q=80'
    ],
    seller_name: 'MedLink Diagnostics Ltd',
    seller_whatsapp: '+2348031234567',
    seller_verified: true,
    created_at: '2026-05-27T16:00:00Z',
    updated_at: '2026-05-27T16:00:00Z'
  }
];

export const INITIAL_PROCUREMENT_REQUESTS: ProcurementRequest[] = [
  {
    id: 'req-1',
    user_id: 'usr-3',
    category_id: 'cat-8',
    title: 'Need 3 patient monitors in Abuja',
    quantity: 3,
    budget: 1500000,
    currency: 'NGN',
    urgency: 'critical',
    country: 'Nigeria',
    state: 'Abuja (FCT)',
    city: 'Wuse 2',
    description: 'URGENT: Garki Specialists Group Clinic looking for 3 Patient monitors for general inpatient ward. Budget ₦1.5m maximum each. Ready, verified and cash/bank transfer is waiting. Prefer modular units with SpO2, NIBP, Dual Temp and Respiration.',
    status: 'open',
    buyer_contact: 'Dr. Alabi (+2348033334444)',
    created_at: '2026-05-26T14:10:00Z'
  },
  {
    id: 'req-2',
    user_id: 'usr-5',
    category_id: 'cat-11',
    title: '150 Cartons of Surgical Gloves & Syringes for Port Harcourt Hospital',
    quantity: 150,
    budget: 6500, // Budget per box/carton
    currency: 'NGN',
    urgency: 'medium',
    country: 'Nigeria',
    state: 'Rivers',
    city: 'Port Harcourt',
    description: 'We require steady wholesale supplies of medical examination gloves, syringes and surgical consumables for Riverside Memorial Hospital. Seeking quotes from verified local CAC-registered pharmaceutical distributors only.',
    status: 'open',
    buyer_contact: 'Matron Amara (Riverside Clinic)',
    created_at: '2026-05-27T09:12:00Z'
  }
];
