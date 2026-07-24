/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore, deleteFromFirestore } from "../server/state";
import { requireAuth, sanitizeText } from "../server/middleware";
import { 
  CreateListingSchema, 
  UpdateListingSchema, 
  validateBody, 
  requireListingOwnerOrAdmin, 
  asyncHandler 
} from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { Listing, Report, Category } from "../types";
import { NIGERIAN_STATES } from "../data";

export const listingsRouter = Router();

// Listings: GET all with filtering
listingsRouter.get("/api/listings", (req, res) => {
  let filtered = [...collections.listings];
  const { category, state, condition, query, status, seller_id } = req.query;

  if (seller_id) {
    filtered = filtered.filter(l => l.seller_id === seller_id);
  }
  if (category) {
    filtered = filtered.filter(l => l.category_id === category || collections.categories.find(c => c.id === l.category_id)?.parent_id === category);
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
    const catObj = category ? collections.categories.find(c => c.id === category) : undefined;
    collections.searchLogs.unshift({
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
    if (collections.searchLogs.length > 500) {
      collections.searchLogs.pop();
    }
  }

  res.json(filtered);
});

// Categories: GET standard classes
listingsRouter.get("/api/categories", (req, res) => {
  res.json(collections.categories);
});

// Nigerian States: GET
listingsRouter.get("/api/states", (req, res) => {
  res.json(NIGERIAN_STATES);
});

// Listings: GET by slug or ID
listingsRouter.get("/api/listings/:slugOrId", (req, res) => {
  const term = req.params.slugOrId;
  const listing = collections.listings.find(l => l.id === term || l.slug === term);
  
  if (!listing) {
    return res.status(404).json({ error: "Marketplace listing not found" });
  }

  listing.view_count += 1;
  res.json(listing);
});

// Listings: Create Listing
listingsRouter.post("/api/listings", requireAuth, validateBody(CreateListingSchema), asyncHandler(async (req: any, res: any) => {
  const { seller_id, category_id, title, brand, model, condition, price, currency, negotiable, state, city, description, is_ai_extracted, listing_type, images, videos, links } = req.body;

  // Find seller profile belonging to the authenticated user
  const seller = collections.sellers.find(s => s.user_id === req.user.id || s.id === seller_id);
  if (!seller) {
    return res.status(403).json({ error: "Forbidden: No merchant store registered for this user" });
  }

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
    status: 'pending_review',
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

  collections.listings.unshift(newListing);
  await saveToFirestore('listings', newListing.id, newListing);
  logActivity(seller.business_name, 'CREATE_LISTING', 'Listings', `Created clinical listing: ${sanitizedTitle}`);
  
  const notif = {
    id: `notif-${Date.now()}`,
    user_id: 'usr-3',
    type: 'admin_review',
    title: 'Review Required',
    message: `New equipment listing "${sanitizedTitle}" requires clinical verification by admin.`,
    read: false,
    created_at: new Date().toISOString()
  };
  collections.notifications.unshift(notif);
  await saveToFirestore('notifications', notif.id, notif);

  res.status(201).json(newListing);
}));

// Listings: Edit Listing
listingsRouter.patch("/api/listings/:id", requireAuth, requireListingOwnerOrAdmin, validateBody(UpdateListingSchema), asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const index = collections.listings.findIndex(l => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Listing not found" });
  }

  const updateData = { ...req.body };
  if (updateData.title) updateData.title = sanitizeText(updateData.title);
  if (updateData.brand) updateData.brand = sanitizeText(updateData.brand);
  if (updateData.model) updateData.model = sanitizeText(updateData.model);
  if (updateData.state) updateData.state = sanitizeText(updateData.state);
  if (updateData.city) updateData.city = sanitizeText(updateData.city);
  if (updateData.description) updateData.description = sanitizeText(updateData.description);

  collections.listings[index] = {
    ...collections.listings[index],
    ...updateData,
    updated_at: new Date().toISOString()
  };

  await saveToFirestore('listings', id, collections.listings[index]);
  res.json(collections.listings[index]);
}));

// Listings: Delete Listing
listingsRouter.delete("/api/listings/:id", requireAuth, requireListingOwnerOrAdmin, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const index = collections.listings.findIndex(l => l.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Listing not found" });
  }

  const listing = collections.listings[index];
  logActivity(req.user.email, 'DELETE_LISTING', 'Listings', `Deleted listing: ${listing.title}`);
  collections.listings.splice(index, 1);
  await deleteFromFirestore('listings', id);
  res.json({ success: true, message: "Listing deleted successfully" });
}));

// Track WhatsApp Click counts
listingsRouter.post("/api/listings/:id/track-whatsapp-click", (req, res) => {
  const { id } = req.params;
  const listing = collections.listings.find(l => l.id === id);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }

  listing.whatsapp_click_count += 1;
  logActivity('Buyer', 'WHATSAPP_CLICK', 'Analytics', `Inquired on WhatsApp for: ${listing.title}`);
  res.json({ clicks: listing.whatsapp_click_count });
});

// Report Suspicious Listing
listingsRouter.post("/api/listings/:id/report", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const listing = collections.listings.find(l => l.id === id);
  
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

  collections.reports.push(newReport);

  collections.notifications.unshift({
    id: `notif-${Date.now()}`,
    user_id: 'usr-3',
    type: 'report_flag',
    title: 'Listing Flagged!',
    message: `Listing "${listing.title}" was reported. Reason: ${reason}`,
    read: false,
    created_at: new Date().toISOString()
  });

  logActivity('Buyer-Anonymous', 'REPORT_LISTING', 'Reports', `Reported listing: ${listing.title}`);
  res.json({ success: true, report: newReport });
});
