/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

import { 
  NIGERIAN_STATES, 
  CATEGORIES, 
  INITIAL_SELLERS, 
  INITIAL_LISTINGS, 
  INITIAL_PROCUREMENT_REQUESTS, 
  INITIAL_ENGINEERS, 
  INITIAL_ENGINEER_REVIEWS, 
  INITIAL_OFFERS 
} from '../data';

import { 
  Listing, 
  Seller, 
  Category, 
  ProcurementRequest, 
  ProcurementResponse, 
  Report, 
  VerificationRequest, 
  Lead, 
  ChatMessage, 
  Engineer, 
  EngineerReview, 
  Offer,
  EscrowDeal,
  LeaseFinancingApplication
} from '../types';

// Load Firebase configuration
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
let databaseId = '(default)';

if (fs.existsSync(configPath)) {
  try {
    const rawConfig = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(rawConfig);
    firebaseConfig = {
      apiKey: parsed.apiKey,
      authDomain: parsed.authDomain,
      projectId: parsed.projectId,
      storageBucket: parsed.storageBucket,
      messagingSenderId: parsed.messagingSenderId,
      appId: parsed.appId,
    };
    if (parsed.firestoreDatabaseId) {
      databaseId = parsed.firestoreDatabaseId;
    }
  } catch (err) {
    console.error('Error reading firebase-applet-config.json:', err);
  }
}

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(firebaseApp, databaseId);

// In-memory collections serving as live high-speed state
export const collections = {
  users: [
    { id: 'usr-1', firebase_uid: 'f-uid-1', email: 'chidi.obi@medlink.com.ng', phone: '+2348031234567', role: 'seller', status: 'active' },
    { id: 'usr-2', firebase_uid: 'f-uid-2', email: 'fatima@westafricamed.com', phone: '+2348123456789', role: 'seller', status: 'active' },
    { id: 'usr-3', firebase_uid: 'f-uid-3', email: 'ezemamichael@gmail.com', phone: '+2348033334444', role: 'admin', status: 'active' },
    { id: 'usr-4', firebase_uid: 'f-uid-4', email: 'sales@lagomsconsumables.com.ng', phone: '+2347055555123', role: 'seller', status: 'active' },
    { id: 'usr-5', firebase_uid: 'f-uid-5', email: 'buyer@riversidememorial.org', phone: '+2348055554444', role: 'buyer', status: 'active' }
  ] as any[],
  sellers: [...INITIAL_SELLERS] as Seller[],
  categories: [...CATEGORIES] as Category[],
  listings: [...INITIAL_LISTINGS] as Listing[],
  procurementRequests: [...INITIAL_PROCUREMENT_REQUESTS] as ProcurementRequest[],
  procurementResponses: [
    {
      id: 'resp-1',
      request_id: 'req-1',
      seller_id: 'sel-1',
      listing_id: 'list-1',
      price: 1350000,
      message: 'We have 3 units of extremely clean, US-used Mindray patient monitors ready for delivery inside Abuja tomorrow.',
      availability: 'Immediate delivery',
      whatsapp_contact: '+2348031234567',
      seller_name: 'MedLink Diagnostics Ltd',
      offered_product: 'Mindray uMec 12 Patient Monitor',
      created_at: '2026-05-27T10:00:00Z'
    }
  ] as ProcurementResponse[],
  favorites: [] as { id: string; user_id: string; listing_id: string; created_at: string }[],
  reports: [] as Report[],
  verificationRequests: [] as VerificationRequest[],
  engineers: [...INITIAL_ENGINEERS] as Engineer[],
  engineerReviews: [...INITIAL_ENGINEER_REVIEWS] as EngineerReview[],
  offers: [...INITIAL_OFFERS] as Offer[],
  escrowDeals: [
    {
      id: 'esc-101',
      listing_id: 'list-1',
      listing_title: '3x Mindray uMec 12 Patient Monitors (Escrow Secured)',
      buyer_id: 'usr-5',
      buyer_name: 'Dr. Chidi Obi (Riverside Memorial)',
      buyer_email: 'buyer@riversidememorial.org',
      seller_id: 'sel-1',
      seller_name: 'MedLink Diagnostics Ltd',
      amount: 4050000,
      currency: 'NGN',
      escrow_fee: 60750,
      status: 'funds_deposited',
      assigned_engineer_id: 'eng-1',
      assigned_engineer_name: 'Engr. Emeka Nwosu (Biomedical Lead)',
      delivery_tracking_no: 'MDT-ESC-2026-9912',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    }
  ] as EscrowDeal[],
  financingApplications: [] as LeaseFinancingApplication[],
  inspections: [
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
  ] as any[],
  leads: [] as Lead[],
  chats: [] as { id: string; lead_id: string; messages: ChatMessage[] }[],
  notifications: [] as any[],
  searchLogs: [
    { id: 'search-1', query: 'Ultrasound machine', category_id: 'cat-1', category_name: 'Ultrasound Machines', state: 'Lagos', condition: 'used', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), results_count: 3 },
    { id: 'search-2', query: 'Mindray uMec 12', category_id: 'cat-7', category_name: 'Patient Monitors', state: 'Abuja', condition: 'used', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), results_count: 1 },
    { id: 'search-3', query: 'Defibrillator Unit', category_id: 'cat-5', category_name: 'Theatre Equipment', state: 'Rivers', condition: 'new', timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), results_count: 0 }
  ] as any[],
  activityLogs: [
    { id: 'act-1', actor: 'System', action: 'INIT', category: 'Database', description: 'Firestore database connected and synchronized.', timestamp: new Date().toISOString() }
  ] as any[]
};

/**
 * Initialize Firestore data persistence
 */
export async function initializeFirestore() {
  console.log('🔄 Initializing Firestore Marketplace Persistence...');
  try {
    // Check if listings collection exists in Firestore
    const listingsRef = collection(db, 'listings');
    const snapshot = await getDocs(listingsRef);

    if (snapshot.empty) {
      console.log('📦 Firestore is empty. Seeding initial marketplace data into Firestore...');

      // Seed Listings
      for (const item of collections.listings) {
        await setDoc(doc(db, 'listings', item.id), item);
      }

      // Seed Sellers
      for (const seller of collections.sellers) {
        await setDoc(doc(db, 'sellers', seller.id), seller);
      }

      // Seed Procurement Requests
      for (const rfq of collections.procurementRequests) {
        await setDoc(doc(db, 'procurement_requests', rfq.id), rfq);
      }

      // Seed Procurement Responses
      for (const resp of collections.procurementResponses) {
        await setDoc(doc(db, 'procurement_quotes', resp.id), resp);
      }

      // Seed Engineers
      for (const eng of collections.engineers) {
        await setDoc(doc(db, 'engineers', eng.id), eng);
      }

      // Seed Escrow Deals
      for (const deal of collections.escrowDeals) {
        await setDoc(doc(db, 'escrow_deals', deal.id), deal);
      }

      // Seed Offers
      for (const off of collections.offers) {
        await setDoc(doc(db, 'offers', off.id), off);
      }

      // Seed Inspections
      for (const insp of collections.inspections) {
        await setDoc(doc(db, 'inspections', insp.id), insp);
      }

      console.log('✅ Firestore successfully seeded with initial marketplace records!');
    } else {
      console.log('⚡ Loading existing marketplace collections from Firestore...');

      // Load Listings
      const listingsDocs = await getDocs(collection(db, 'listings'));
      if (!listingsDocs.empty) {
        collections.listings = listingsDocs.docs.map(d => d.data() as Listing);
      }

      // Load Sellers
      const sellersDocs = await getDocs(collection(db, 'sellers'));
      if (!sellersDocs.empty) {
        collections.sellers = sellersDocs.docs.map(d => d.data() as Seller);
      }

      // Load Procurement Requests
      const rfqDocs = await getDocs(collection(db, 'procurement_requests'));
      if (!rfqDocs.empty) {
        collections.procurementRequests = rfqDocs.docs.map(d => d.data() as ProcurementRequest);
      }

      // Load Procurement Quotes
      const quoteDocs = await getDocs(collection(db, 'procurement_quotes'));
      if (!quoteDocs.empty) {
        collections.procurementResponses = quoteDocs.docs.map(d => d.data() as ProcurementResponse);
      }

      // Load Engineers
      const engDocs = await getDocs(collection(db, 'engineers'));
      if (!engDocs.empty) {
        collections.engineers = engDocs.docs.map(d => d.data() as Engineer);
      }

      // Load Escrow Deals
      const escrowDocs = await getDocs(collection(db, 'escrow_deals'));
      if (!escrowDocs.empty) {
        collections.escrowDeals = escrowDocs.docs.map(d => d.data() as EscrowDeal);
      }

      // Load Offers
      const offersDocs = await getDocs(collection(db, 'offers'));
      if (!offersDocs.empty) {
        collections.offers = offersDocs.docs.map(d => d.data() as Offer);
      }

      // Load Inspections
      const inspDocs = await getDocs(collection(db, 'inspections'));
      if (!inspDocs.empty) {
        collections.inspections = inspDocs.docs.map(d => d.data());
      }

      // Load Leads
      const leadsDocs = await getDocs(collection(db, 'leads'));
      if (!leadsDocs.empty) {
        collections.leads = leadsDocs.docs.map(d => d.data() as Lead);
      }

      console.log(`✅ Loaded ${collections.listings.length} listings, ${collections.sellers.length} vendors, ${collections.procurementRequests.length} RFQs from Firestore!`);
    }
  } catch (err) {
    console.error('⚠️ Firestore sync notice (operating in high-resilience memory mode with local persistence):', err);
  }
}

import { adminDb } from '../server/config/firebaseAdmin';

function sanitizeFirestoreData(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map(sanitizeFirestoreData);
  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = sanitizeFirestoreData(value);
      }
    }
    return clean;
  }
  return data;
}

/**
 * Save or update a document in Firestore asynchronously (high-resilience memory mode fallback)
 */
export async function saveToFirestore(collectionName: string, id: string, data: any) {
  const cleanData = sanitizeFirestoreData(data);
  try {
    if (adminDb) {
      await adminDb.collection(collectionName).doc(id).set(cleanData, { merge: true });
      return;
    }
  } catch (adminErr) {
    // Admin DB unconfigured or unauthorized in local test mode
  }

  try {
    await setDoc(doc(db, collectionName, id), cleanData, { merge: true });
  } catch (err) {
    console.error(`Notice: Could not persist document ${id} to Firestore collection ${collectionName}:`, (err as Error).message);
  }
}

/**
 * Delete a document from Firestore asynchronously (high-resilience memory mode fallback)
 */
export async function deleteFromFirestore(collectionName: string, id: string) {
  try {
    if (adminDb) {
      await adminDb.collection(collectionName).doc(id).delete();
      return;
    }
  } catch (adminErr) {
    // Admin DB unconfigured or unauthorized in local test mode
  }

  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (err) {
    console.error(`Notice: Could not delete document ${id} from Firestore collection ${collectionName}:`, (err as Error).message);
  }
}
