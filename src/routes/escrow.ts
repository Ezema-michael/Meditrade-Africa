/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore } from "../server/state";
import { requireAuth, sanitizeText } from "../server/middleware";
import { 
  CreateEscrowSchema, 
  validateBody, 
  requireCompletedRegistration,
  asyncHandler 
} from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { EscrowStatus } from "../types";

export const escrowRouter = Router();

// GET all escrow deals
escrowRouter.get("/api/escrow/deals", requireAuth, (req: any, res: any) => {
  const { user_id, seller_id, status } = req.query;
  let deals = [...collections.escrowDeals];

  // Non-admins can only see deals where they are buyer or seller
  if (req.user.role !== 'admin') {
    const seller = collections.sellers.find(s => s.user_id === req.user.id);
    const sellerId = seller?.id;
    deals = deals.filter(d => d.buyer_id === req.user.id || (sellerId && d.seller_id === sellerId));
  } else {
    if (user_id) deals = deals.filter(d => d.buyer_id === user_id || d.seller_id === user_id);
    if (seller_id) deals = deals.filter(d => d.seller_id === seller_id);
  }

  if (status) deals = deals.filter(d => d.status === status);
  res.json(deals);
});

// CREATE new Escrow agreement
escrowRouter.post("/api/escrow/create", requireAuth, requireCompletedRegistration, validateBody(CreateEscrowSchema), asyncHandler(async (req: any, res: any) => {
  const { listing_id, amount, buyer_name, buyer_email, assigned_engineer_id } = req.validatedBody;

  const listing = collections.listings.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "NOT_FOUND", message: "Equipment listing not found" });

  const seller = collections.sellers.find(s => s.id === listing.seller_id);
  const engineer = collections.engineers.find(e => e.id === assigned_engineer_id);

  const newDeal = {
    id: `esc-${Date.now()}`,
    listing_id: listing.id,
    listing_title: listing.title,
    buyer_id: req.user.id,
    buyer_name: sanitizeText(buyer_name) || req.user.businessName || 'Hospital Purchaser',
    buyer_email: sanitizeText(buyer_email) || req.user.email || 'purchaser@hospital.ng',
    seller_id: listing.seller_id,
    seller_name: seller?.business_name || listing.seller_name || 'Medical Equipment Vendor',
    amount: Number(amount),
    currency: listing.currency || 'NGN',
    escrow_fee: Math.round(Number(amount) * 0.02),
    status: 'initiated' as EscrowStatus,
    assigned_engineer_id: engineer?.id || 'eng-1',
    assigned_engineer_name: engineer?.name ? `${engineer.name} (${engineer.specialty})` : 'Engr. Emeka Okafor (Biomedical Lead)',
    payment_reference: `ESC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  collections.escrowDeals.unshift(newDeal);
  await saveToFirestore('escrow_deals', newDeal.id, newDeal);
  logActivity(req.user.email, 'CREATE_ESCROW', 'Escrow', `Created escrow deal for "${listing.title}" (Amount: ₦${Number(amount).toLocaleString()})`);

  const notif = {
    id: `notif-${Date.now()}-esc-cre`,
    user_id: seller?.user_id || 'usr-1',
    type: 'escrow_initiated',
    title: 'New Escrow Purchase Initiated',
    message: `${newDeal.buyer_name} initiated an escrow agreement for "${listing.title}". Awaiting buyer deposit into escrow.`,
    read: false,
    created_at: new Date().toISOString()
  };
  collections.notifications.unshift(notif);
  await saveToFirestore('notifications', notif.id, notif);

  res.status(201).json(newDeal);
}));

// UPDATE Escrow Status: Deposit Funds
escrowRouter.patch("/api/escrow/:id/deposit", requireAuth, asyncHandler(async (req: any, res: any) => {
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "NOT_FOUND", message: "Escrow deal not found" });

  if (req.user.role !== 'admin' && deal.buyer_id !== req.user.id) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Only the buyer or admin can deposit funds for this deal." });
  }

  deal.status = 'funds_deposited';
  deal.updated_at = new Date().toISOString();
  await saveToFirestore('escrow_deals', deal.id, deal);

  logActivity(req.user.email, 'ESCROW_FUNDS_DEPOSITED', 'Escrow', `Escrow funds ₦${deal.amount.toLocaleString()} deposited for deal ${deal.id}`);

  res.json(deal);
}));

// UPDATE Escrow Status: Dispatch Equipment
escrowRouter.patch("/api/escrow/:id/dispatch", requireAuth, asyncHandler(async (req: any, res: any) => {
  const { tracking_no } = req.body;
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "NOT_FOUND", message: "Escrow deal not found" });

  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  if (req.user.role !== 'admin' && (!seller || seller.id !== deal.seller_id)) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Only the seller or admin can mark equipment as dispatched." });
  }

  deal.status = 'equipment_dispatched';
  if (tracking_no) deal.delivery_tracking_no = sanitizeText(tracking_no);
  deal.updated_at = new Date().toISOString();
  await saveToFirestore('escrow_deals', deal.id, deal);

  logActivity(req.user.email, 'ESCROW_DISPATCH', 'Escrow', `Equipment dispatched for deal ${deal.id}`);

  res.json(deal);
}));

// UPDATE Escrow Status: Biomedical Engineer Inspection Signoff
escrowRouter.patch("/api/escrow/:id/engineer-signoff", requireAuth, asyncHandler(async (req: any, res: any) => {
  const { engineer_notes, approved } = req.body;
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "NOT_FOUND", message: "Escrow deal not found" });

  if (req.user.role !== 'admin' && req.user.role !== 'engineer') {
    return res.status(403).json({ error: "FORBIDDEN", message: "Only an assigned engineer or admin can sign off on inspection." });
  }

  deal.engineer_notes = sanitizeText(engineer_notes) || 'Physical inspection and diagnostic output calibration verified.';
  deal.engineer_approved = approved !== false;
  
  if (approved !== false) {
    deal.status = 'inspected_approved';
  } else {
    deal.status = 'disputed';
  }
  deal.updated_at = new Date().toISOString();
  await saveToFirestore('escrow_deals', deal.id, deal);

  logActivity(req.user.email, 'ESCROW_INSPECTED', 'Escrow', `Biomedical engineer signoff completed for deal ${deal.id}`);

  res.json(deal);
}));

// UPDATE Escrow Status: Release Funds to Vendor
escrowRouter.patch("/api/escrow/:id/release-funds", requireAuth, asyncHandler(async (req: any, res: any) => {
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "NOT_FOUND", message: "Escrow deal not found" });

  if (req.user.role !== 'admin' && deal.buyer_id !== req.user.id) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Only the buyer or admin can release funds." });
  }

  deal.status = 'funds_released';
  deal.updated_at = new Date().toISOString();
  await saveToFirestore('escrow_deals', deal.id, deal);

  logActivity(req.user.email, 'ESCROW_RELEASED', 'Escrow', `Escrow payout ₦${deal.amount.toLocaleString()} released for deal ${deal.id}`);

  res.json(deal);
}));

// UPDATE Escrow Status: Raise Dispute
escrowRouter.patch("/api/escrow/:id/raise-dispute", requireAuth, asyncHandler(async (req: any, res: any) => {
  const { reason } = req.body;
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "NOT_FOUND", message: "Escrow deal not found" });

  deal.status = 'disputed';
  if (reason) deal.engineer_notes = `DISPUTE RAISED: ${sanitizeText(reason)}`;
  deal.updated_at = new Date().toISOString();
  await saveToFirestore('escrow_deals', deal.id, deal);

  logActivity(req.user.email, 'ESCROW_DISPUTE', 'Escrow', `Dispute raised on deal ${deal.id}`);

  res.json(deal);
}));
