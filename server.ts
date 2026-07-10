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

const app = express();
const PORT = 3000;

app.use(express.json());

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
  const { category, state, condition, query, status } = req.query;

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
app.post("/api/listings", (req, res) => {
  const { seller_id, category_id, title, brand, model, condition, price, currency, negotiable, state, city, description, is_ai_extracted, listing_type } = req.body;

  if (!title || !price || !category_id) {
    return res.status(400).json({ error: "Required fields missing (title, price, category_id)" });
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 10000);
  const seller = sellersCollection.find(s => s.id === seller_id) || sellersCollection[0];

  const newListing: Listing = {
    id: `list-${Date.now()}`,
    seller_id: seller.id,
    category_id,
    title,
    slug,
    brand: brand || 'Generic',
    model: model || '',
    condition: condition === 'used' ? 'working_used' : (condition || 'working_used'),
    price: Number(price),
    currency: currency || 'NGN',
    negotiable: negotiable ?? true,
    country: 'Nigeria',
    state: state || 'Lagos',
    city: city || 'Ikeja',
    description: description || '',
    status: 'pending_review', // Requires admin review
    featured: false,
    stock_status: 'in_stock',
    view_count: 1,
    whatsapp_click_count: 0,
    images: [
      req.body.imageUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80'
    ],
    seller_name: seller.business_name,
    seller_whatsapp: seller.whatsapp_number,
    seller_verified: seller.verification_status === 'verified',
    is_ai_extracted: !!is_ai_extracted,
    listing_type: listing_type || 'fixed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  listingsCollection.unshift(newListing);
  logActivity(seller.business_name, 'CREATE_LISTING', 'Listings', `Created clinical listing: ${title}`);
  
  // Send simulated Firestore notification to administrative review board
  notificationsCollection.unshift({
    id: `notif-${Date.now()}`,
    user_id: 'usr-3', // Admin recipient
    type: 'admin_review',
    title: 'Review Required',
    message: `New equipment listing "${title}" requires clinical verification by admin.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.status(210).json(newListing);
});

// Listings: Edit Listing
app.patch("/api/listings/:id", (req, res) => {
  const { id } = req.params;
  const index = listingsCollection.findIndex(l => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Listing not found" });
  }

  listingsCollection[index] = {
    ...listingsCollection[index],
    ...req.body,
    updated_at: new Date().toISOString()
  };

  res.json(listingsCollection[index]);
});

// Listings: Delete Listing
app.delete("/api/listings/:id", (req, res) => {
  const { id } = req.params;
  const index = listingsCollection.findIndex(l => l.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Listing not found" });
  }

  logActivity('Admin/Seller', 'DELETE_LISTING', 'Listings', `Deleted listing: ${listingsCollection[index].title}`);
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

  const newReq: ProcurementRequest = {
    id: `req-${Date.now()}`,
    user_id: user_id || 'usr-5',
    category_id: category_id || 'cat-8',
    title,
    quantity: Number(quantity) || 1,
    budget: Number(budget) || 0,
    currency: currency || 'NGN',
    urgency: urgency || 'medium',
    country: 'Nigeria',
    state: state || 'Lagos',
    city: city || 'Ikeja',
    description,
    status: 'open',
    buyer_contact,
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
  
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    lead_id,
    sender_id,
    sender_name: senderName,
    message,
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
app.post("/api/offers", (req, res) => {
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
  
  const newOffer: Offer = {
    id: `off-${Date.now()}`,
    listing_id,
    listing_title: listing.title,
    seller_id: seller.id,
    buyer_id: buyer_id || 'usr-5',
    buyer_name,
    buyer_contact,
    offer_amount: Number(offer_amount),
    currency: currency || listing.currency || 'NGN',
    message: message || '',
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

// Update user profile info dynamically on backend
app.post("/api/users/update", (req, res) => {
  const { user_id, email, phone, businessName, cac_number } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  const user = usersCollection.find(u => u.id === user_id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (email) user.email = email;
  if (phone) user.phone = phone;

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
app.post("/api/ai/extract-listing", async (req, res) => {
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
app.post("/api/ai/improve-description", async (req, res) => {
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
app.post("/api/ai/classify-category", async (req, res) => {
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
app.post("/api/ai/detect-duplicate", async (req, res) => {
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
app.post("/api/ai/match-procurement", async (req, res) => {
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
