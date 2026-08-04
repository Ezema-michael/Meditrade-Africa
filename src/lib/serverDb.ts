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

if (!firebaseConfig.projectId && process.env.FIREBASE_PROJECT_ID) {
  firebaseConfig.projectId = process.env.FIREBASE_PROJECT_ID;
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
  fileMetadata: [] as any[],
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
    if (adminDb) {
      const snapshot = await adminDb.collection('listings').get();

      if (snapshot.empty) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('CRITICAL_DATABASE_EMPTY: run the reviewed production data migration before startup');
        }
        console.log('Firestore is empty. Seeding initial marketplace data into Firestore...');
        await seedWithAdminFirestore();
        console.log('Firestore successfully seeded with initial marketplace records!');
        return;
      }

      console.log('Loading existing marketplace collections from Firestore with Admin SDK...');
      await loadWithAdminFirestore();
      console.log(`Loaded ${collections.listings.length} listings, ${collections.sellers.length} vendors, ${collections.procurementRequests.length} RFQs, ${collections.fileMetadata.length} file metadata records from Firestore!`);
      return;
    }

    // Check if listings collection exists in Firestore
    const listingsRef = collection(db, 'listings');
    const snapshot = await getDocs(listingsRef);

    if (snapshot.empty) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CRITICAL_DATABASE_EMPTY: run the reviewed production data migration before startup');
      }
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

      // Load File Metadata
      const fileMetaDocs = await getDocs(collection(db, 'file_metadata'));
      if (!fileMetaDocs.empty) {
        collections.fileMetadata = fileMetaDocs.docs.map(d => d.data());
      }

      // Load Notifications
      const notifDocs = await getDocs(collection(db, 'notifications'));
      if (!notifDocs.empty) {
        collections.notifications = notifDocs.docs.map(d => d.data());
      }

      console.log(`✅ Loaded ${collections.listings.length} listings, ${collections.sellers.length} vendors, ${collections.procurementRequests.length} RFQs, ${collections.fileMetadata.length} file metadata records from Firestore!`);
    }
  } catch (err) {
    console.error('⚠️ Firestore sync notice (operating in high-resilience memory mode with local persistence):', err);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL_DATABASE_UNAVAILABLE: Firestore initialization failed');
    }
  }
}

async function seedWithAdminFirestore() {
  const seedCollections: Array<[string, any[]]> = [
    ['listings', collections.listings],
    ['sellers', collections.sellers],
    ['procurement_requests', collections.procurementRequests],
    ['procurement_quotes', collections.procurementResponses],
    ['engineers', collections.engineers],
    ['escrow_deals', collections.escrowDeals],
    ['offers', collections.offers],
    ['inspections', collections.inspections]
  ];

  for (const [collectionName, items] of seedCollections) {
    for (const item of items) {
      await adminDb.collection(collectionName).doc(item.id).set(sanitizeFirestoreData(item), { merge: true });
    }
  }
}

async function loadAdminCollection<T>(collectionName: string): Promise<T[]> {
  const snapshot = await adminDb.collection(collectionName).get();
  return snapshot.empty ? [] : snapshot.docs.map(document => document.data() as T);
}

async function loadWithAdminFirestore() {
  const listings = await loadAdminCollection<Listing>('listings');
  if (listings.length > 0) collections.listings = listings;

  const sellers = await loadAdminCollection<Seller>('sellers');
  if (sellers.length > 0) collections.sellers = sellers;

  const rfqs = await loadAdminCollection<ProcurementRequest>('procurement_requests');
  if (rfqs.length > 0) collections.procurementRequests = rfqs;

  const quotes = await loadAdminCollection<ProcurementResponse>('procurement_quotes');
  if (quotes.length > 0) collections.procurementResponses = quotes;

  const engineers = await loadAdminCollection<Engineer>('engineers');
  if (engineers.length > 0) collections.engineers = engineers;

  const escrowDeals = await loadAdminCollection<EscrowDeal>('escrow_deals');
  if (escrowDeals.length > 0) collections.escrowDeals = escrowDeals;

  const offers = await loadAdminCollection<Offer>('offers');
  if (offers.length > 0) collections.offers = offers;

  const inspections = await loadAdminCollection<any>('inspections');
  if (inspections.length > 0) collections.inspections = inspections;

  const leads = await loadAdminCollection<Lead>('leads');
  if (leads.length > 0) collections.leads = leads;

  const fileMetadata = await loadAdminCollection<any>('file_metadata');
  if (fileMetadata.length > 0) collections.fileMetadata = fileMetadata;

  const notifications = await loadAdminCollection<any>('notifications');
  if (notifications.length > 0) collections.notifications = notifications;
}

export type AllowedEntityType =
  | 'profile_avatar'
  | 'listing'
  | 'equipment'
  | 'seller'
  | 'vendor'
  | 'store'
  | 'procurement'
  | 'rfq'
  | 'offer'
  | 'escrow'
  | 'financing'
  | 'engineer'
  | 'inspection';

export type FileVisibility = 'public' | 'owner_only' | 'participants';

export const DEFAULT_VISIBILITY: Record<AllowedEntityType, FileVisibility> = {
  profile_avatar: 'public',
  listing: 'public',
  equipment: 'public',
  seller: 'owner_only',
  vendor: 'owner_only',
  store: 'public',
  procurement: 'participants',
  rfq: 'participants',
  offer: 'participants',
  escrow: 'participants',
  financing: 'owner_only',
  engineer: 'public',
  inspection: 'participants'
};

export class MetadataUnavailableError extends Error {
  constructor(message = 'File metadata service unavailable') {
    super(message);
    this.name = 'MetadataUnavailableError';
  }
}

export interface FileMetadata {
  id: string;
  uploaderUserId: string;
  objectKey: string;
  originalFilename: string;
  detectedMimeType: string;
  claimedMimeType?: string;
  size: number;
  entityType: AllowedEntityType;
  entityId?: string;
  visibility: FileVisibility;
  uploadDate: string;
  storageProvider: 'local' | 'gcs';
  status: 'active' | 'pending' | 'deleted' | 'quarantined';
}

export function removeFileMetadataFromCache(metadataId: string, objectKey?: string): void {
  collections.fileMetadata = collections.fileMetadata.filter(
    item =>
      item.id !== metadataId &&
      (!objectKey || item.objectKey !== objectKey)
  );
}

export function updateFileMetadataCache(metadata: FileMetadata): void {
  const index = collections.fileMetadata.findIndex(
    item => item.id === metadata.id || item.objectKey === metadata.objectKey
  );
  if (index >= 0) {
    collections.fileMetadata[index] = metadata;
  } else {
    collections.fileMetadata.push(metadata);
  }
}

/**
 * Save file metadata durably in memory and Firestore (Firestore-first)
 */
export async function saveFileMetadata(metadata: FileMetadata): Promise<void> {
  const cleanMeta = sanitizeFirestoreData(metadata);
  updateFileMetadataCache(cleanMeta);
  try {
    await saveToFirestore('file_metadata', metadata.id, cleanMeta);
  } catch (err) {
    removeFileMetadataFromCache(metadata.id, metadata.objectKey);
    console.error(`Failed to persist file metadata for ID ${metadata.id}:`, err);
    throw err;
  }
}

/**
 * Authoritative lookup for file metadata by ID directly from Firestore
 */
export async function getFileMetadataByIdAuthoritative(id: string): Promise<FileMetadata | null> {
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_AUTH_BYPASS === 'true') {
    return (collections.fileMetadata.find(f => f.id === id) as FileMetadata | undefined) || null;
  }
  if (adminDb) {
    try {
      const docSnap = await adminDb.collection('file_metadata').doc(id).get();
      if (!docSnap.exists) {
        removeFileMetadataFromCache(id);
        return null;
      }
      const data = docSnap.data() as FileMetadata;
      updateFileMetadataCache(data);
      return data;
    } catch (adminErr: any) {
      console.warn(`AdminDb lookup failed for ID ${id}:`, adminErr.message);
    }
  }

  try {
    const docRef = doc(db, 'file_metadata', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      removeFileMetadataFromCache(id);
      return null;
    }
    const data = snap.data() as FileMetadata;
    updateFileMetadataCache(data);
    return data;
  } catch (err: any) {
    const cached = collections.fileMetadata.find(f => f.id === id);
    if (cached) {
      return cached as FileMetadata;
    }
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes('permission') || err.code === 'permission-denied') {
      removeFileMetadataFromCache(id);
      return null;
    }
    console.error(`Firestore error during authoritative file metadata lookup by ID (${id}):`, err);
    throw new MetadataUnavailableError(`File metadata lookup failed for ID ${id}: ${err.message}`);
  }
}

/**
 * Authoritative lookup for file metadata by Object Key directly from Firestore
 */
export async function getFileMetadataByObjectKeyAuthoritative(objectKey: string): Promise<FileMetadata | null> {
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_AUTH_BYPASS === 'true') {
    return (collections.fileMetadata.find(f => f.objectKey === objectKey) as FileMetadata | undefined) || null;
  }
  if (adminDb) {
    try {
      const snap = await adminDb.collection('file_metadata').where('objectKey', '==', objectKey).get();
      if (snap.empty) {
        removeFileMetadataFromCache('', objectKey);
        return null;
      }
      const data = snap.docs[0].data() as FileMetadata;
      updateFileMetadataCache(data);
      return data;
    } catch (adminErr: any) {
      console.warn(`AdminDb lookup failed for key ${objectKey}:`, adminErr.message);
    }
  }

  try {
    const q = query(collection(db, 'file_metadata'), where('objectKey', '==', objectKey));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      removeFileMetadataFromCache('', objectKey);
      return null;
    }
    const data = snapshot.docs[0].data() as FileMetadata;
    updateFileMetadataCache(data);
    return data;
  } catch (err: any) {
    const cached = collections.fileMetadata.find(f => f.objectKey === objectKey);
    if (cached) {
      return cached as FileMetadata;
    }
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes('permission') || err.code === 'permission-denied') {
      removeFileMetadataFromCache('', objectKey);
      return null;
    }
    console.error(`Firestore error during authoritative file metadata lookup by Key (${objectKey}):`, err);
    throw new MetadataUnavailableError(`File metadata lookup failed for object key ${objectKey}: ${err.message}`);
  }
}

/**
 * Retrieve file metadata by object key from memory or Firestore (non-authoritative fallback)
 */
export async function getFileMetadataByObjectKey(objectKey: string): Promise<FileMetadata | null> {
  return getFileMetadataByObjectKeyAuthoritative(objectKey).catch(() => {
    const inMemory = collections.fileMetadata.find(f => f.objectKey === objectKey);
    return inMemory ? (inMemory as FileMetadata) : null;
  });
}

/**
 * Retrieve file metadata by metadata ID (non-authoritative fallback)
 */
export async function getFileMetadataById(id: string): Promise<FileMetadata | null> {
  return getFileMetadataByIdAuthoritative(id).catch(() => {
    const inMemory = collections.fileMetadata.find(f => f.id === id);
    return inMemory ? (inMemory as FileMetadata) : null;
  });
}

/**
 * Delete file metadata
 */
export async function deleteFileMetadata(id: string): Promise<void> {
  removeFileMetadataFromCache(id);
  await deleteFromFirestore('file_metadata', id);
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
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_AUTH_BYPASS === 'true') {
    return;
  }
  let lastErr: any = null;
  try {
    if (adminDb) {
      await adminDb.collection(collectionName).doc(id).set(cleanData, { merge: true });
      return;
    }
  } catch (adminErr) {
    lastErr = adminErr;
  }

  try {
    await setDoc(doc(db, collectionName, id), cleanData, { merge: true });
  } catch (err: any) {
    console.error(`Notice: Could not persist document ${id} to Firestore collection ${collectionName}:`, err.message);
    lastErr = err;
    if ((collectionName === 'file_metadata' || process.env.NODE_ENV === 'production') && !err.message?.includes('PERMISSION_DENIED')) {
      throw lastErr;
    }
  }
}

/**
 * Delete a document from Firestore asynchronously (high-resilience memory mode fallback)
 */
export async function deleteFromFirestore(collectionName: string, id: string) {
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_AUTH_BYPASS === 'true') {
    return;
  }
  let lastErr: unknown;
  try {
    if (adminDb) {
      await adminDb.collection(collectionName).doc(id).delete();
      return;
    }
  } catch (adminErr) {
    lastErr = adminErr;
  }

  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (err) {
    console.error(`Notice: Could not delete document ${id} from Firestore collection ${collectionName}:`, (err as Error).message);
    lastErr = err;
    if (process.env.NODE_ENV === 'production') {
      throw lastErr;
    }
  }
}
