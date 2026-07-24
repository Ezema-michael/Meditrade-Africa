/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import {
  collections,
  saveToFirestore,
  deleteFromFirestore,
  searchLogsCollection,
  interactionLogsCollection,
  activityLogsCollection
} from "../server/state";
import { requireAuth, requireAdmin } from "../server/middleware";
import { asyncHandler } from "../lib/validation";
import { logActivity } from "../lib/auditLogger";

export const adminRouter = Router();

// Admin Dashboard & Moderator metrics
adminRouter.get("/api/admin/dashboard", requireAuth, requireAdmin, (req, res) => {
  const pendingVerificationCount = collections.sellers.filter(s => s.verification_status === 'pending').length;
  const pendingEquipmentCount = collections.listings.filter(l => l.status === 'pending_review').length;
  const totalVerifiedSellers = collections.sellers.filter(s => s.verification_status === 'verified').length;
  const totalOpenRFQs = collections.procurementRequests.filter(r => r.status === 'open').length;

  res.json({
    metrics: {
      pending_verifications: pendingVerificationCount,
      pending_equipments: pendingEquipmentCount,
      verified_sellers: totalVerifiedSellers,
      open_rfqs: totalOpenRFQs,
      total_sellers: collections.sellers.length,
      total_listings: collections.listings.length,
      total_users: collections.users.length,
      total_reports: collections.reports.length
    },
    activity_logs: activityLogsCollection.slice(0, 30)
  });
});

// Admin Search Analytics
adminRouter.get("/api/admin/search-analytics", requireAuth, requireAdmin, (req, res) => {
  const total = searchLogsCollection.length;
  
  const demandMap: { [key: string]: { count: number; last_searched: string; category?: string; state?: string } } = {};
  searchLogsCollection.forEach(s => {
    if (s.results_count === 0 && s.query.trim()) {
      const q = s.query.trim().toLowerCase();
      if (!demandMap[q]) {
        demandMap[q] = { count: 0, last_searched: s.timestamp, category: s.category_name, state: s.state };
      }
      demandMap[q].count += 1;
      demandMap[q].last_searched = s.timestamp;
    }
  });

  const unmetDemands = Object.entries(demandMap)
    .map(([term, data]) => ({ 
      term: term.charAt(0).toUpperCase() + term.slice(1), 
      count: data.count, 
      last_searched: data.last_searched,
      category: data.category,
      state: data.state
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

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
adminRouter.get("/api/admin/vendors", requireAuth, requireAdmin, (req, res) => {
  const vendors = collections.sellers.map(s => {
    const vendorListings = collections.listings.filter(l => l.seller_id === s.id);
    const totalViews = vendorListings.reduce((sum, l) => sum + (l.view_count || 0), 0);
    const totalWhatsappClicks = vendorListings.reduce((sum, l) => sum + (l.whatsapp_click_count || 0), 0);
    const totalPhoneClicks = vendorListings.reduce((sum, l) => sum + (l.phone_click_count || 0), 0);
    const totalRFQBids = collections.procurementResponses.filter(r => r.seller_id === s.id).length;
    const userAcc = collections.users.find(u => u.id === s.user_id);

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
adminRouter.patch("/api/admin/vendors/:id/status", requireAuth, requireAdmin, asyncHandler(async (req: any, res: any) => {
  const { status, verification_status } = req.body;
  const seller = collections.sellers.find(s => s.id === req.params.id);
  if (!seller) return res.status(404).json({ error: "NOT_FOUND", message: "Vendor not found" });

  if (verification_status) seller.verification_status = verification_status;
  if (status) {
    seller.status = status;
    const u = collections.users.find(usr => usr.id === seller.user_id);
    if (u) {
      u.status = status;
      await saveToFirestore('users', u.id, u);
    }
  }

  if (verification_status === 'verified') {
    for (const l of collections.listings) {
      if (l.seller_id === seller.id) {
        l.seller_verified = true;
        await saveToFirestore('listings', l.id, l);
      }
    }
  }

  await saveToFirestore('sellers', seller.id, seller);
  logActivity('Admin', 'MANAGE_VENDOR', 'AdminOps', `Updated vendor "${seller.business_name}" (Status: ${seller.status || 'active'}, Verification: ${seller.verification_status})`);
  res.json(seller);
}));

// Admin Delete / Remove Vendor
adminRouter.delete("/api/admin/vendors/:id", requireAuth, requireAdmin, asyncHandler(async (req: any, res: any) => {
  const index = collections.sellers.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "NOT_FOUND", message: "Vendor not found" });

  const deleted = collections.sellers.splice(index, 1)[0];
  await deleteFromFirestore('sellers', deleted.id);
  logActivity('Admin', 'DELETE_VENDOR', 'AdminOps', `Removed vendor store profile: ${deleted.business_name}`);
  res.json({ success: true, deleted });
}));

// Admin Equipments / Listings Management API
adminRouter.get("/api/admin/equipments", requireAuth, requireAdmin, (req, res) => {
  const { status, category_id, seller_id, state, condition, search } = req.query;
  let items = [...collections.listings];

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
    const seller = collections.sellers.find(s => s.id === l.seller_id);
    const category = collections.categories.find(c => c.id === l.category_id);
    const flags = collections.reports.filter(r => r.listing_id === l.id && r.status === 'pending').length;
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
adminRouter.patch("/api/admin/equipments/:id", requireAuth, requireAdmin, asyncHandler(async (req: any, res: any) => {
  const index = collections.listings.findIndex(l => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "NOT_FOUND", message: "Equipment not found" });

  const current = collections.listings[index];
  const updated = {
    ...current,
    ...req.body,
    updated_at: new Date().toISOString()
  };
  collections.listings[index] = updated;
  await saveToFirestore('listings', updated.id, updated);

  logActivity('Admin', 'EDIT_EQUIPMENT', 'AdminOps', `Admin updated equipment: ${updated.title} (Status: ${updated.status})`);
  res.json(updated);
}));

// Admin Delete Equipment
adminRouter.delete("/api/admin/equipments/:id", requireAuth, requireAdmin, asyncHandler(async (req: any, res: any) => {
  const index = collections.listings.findIndex(l => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "NOT_FOUND", message: "Equipment not found" });

  const deleted = collections.listings.splice(index, 1)[0];
  await deleteFromFirestore('listings', deleted.id);
  logActivity('Admin', 'DELETE_EQUIPMENT', 'AdminOps', `Admin deleted equipment: ${deleted.title}`);
  res.json({ success: true, deleted });
}));

// Engagement & Telemetry Analytics Endpoint
adminRouter.get("/api/admin/engagement-analytics", requireAuth, requireAdmin, (req, res) => {
  const totalViews = collections.listings.reduce((s, l) => s + (l.view_count || 0), 0);
  const totalWhatsapp = collections.listings.reduce((s, l) => s + (l.whatsapp_click_count || 0), 0);
  const totalCalls = collections.listings.reduce((s, l) => s + (l.phone_click_count || 0), 0);
  const totalRFQs = collections.procurementRequests.length;

  const topViewed = [...collections.listings]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 10);

  const topClicked = [...collections.listings]
    .sort((a, b) => ((b.whatsapp_click_count || 0) + (b.phone_click_count || 0)) - ((a.whatsapp_click_count || 0) + (a.phone_click_count || 0)))
    .slice(0, 10);

  const vendorStats = collections.sellers.map(sel => {
    const selListings = collections.listings.filter(l => l.seller_id === sel.id);
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

// GET complete database snapshot metrics for live diagnostics/auditing (ADMIN ONLY)
adminRouter.get("/api/diagnostics/schema", requireAuth, requireAdmin, (req: any, res: any) => {
  logActivity(req.user.email || req.user.id, "DIAGNOSTICS_ACCESS", "AdminOps", "Accessed database diagnostics schema metrics");

  const sanitizedUsers = collections.users.map(u => {
    const seller = collections.sellers.find(s => s.user_id === u.id);
    return {
      id: u.id,
      role: u.role,
      status: u.status,
      businessName: seller?.business_name || (u.role === 'admin' ? 'Platform Administrator' : 'Verified User')
    };
  });

  const sanitizedSellers = collections.sellers.map(s => ({
    id: s.id,
    user_id: s.user_id,
    business_name: s.business_name,
    verification_status: s.verification_status,
    state: s.state
  }));

  res.json({
    metrics: {
      users_count: collections.users.length,
      sellers_count: collections.sellers.length,
      listings_count: collections.listings.length,
      active_listings_count: collections.listings.filter(l => l.status === 'published' && l.is_active !== false).length,
      rfqs_count: collections.procurementRequests.length,
      escrow_count: collections.escrowDeals.length,
      financing_applications_count: collections.financingApplications.length,
      verification_requests_count: collections.verificationRequests.length,
      reports_count: collections.reports.length,
      audit_logs_count: activityLogsCollection.length,
      engineers_count: collections.engineers.length,
      reviews_count: collections.engineerReviews.length
    },
    tables: {
      users: sanitizedUsers,
      sellers: sanitizedSellers,
      categories: collections.categories,
      listings: collections.listings.map(l => ({ id: l.id, title: l.title, status: l.status, price: l.price, state: l.state }))
    }
  });
});

// Optional dev diagnostics route gated explicitly by environment flags
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_DIAGNOSTICS === 'true') {
  adminRouter.get("/api/dev/diagnostics/schema", requireAuth, requireAdmin, (req: any, res: any) => {
    res.json({
      metrics: {
        listings_count: collections.listings.length,
        sellers_count: collections.sellers.length,
        users_count: collections.users.length
      },
      tables: {
        users: collections.users,
        sellers: collections.sellers,
        listings: collections.listings
      }
    });
  });
}

