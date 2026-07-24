/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore } from "../server/state";
import { requireAuth } from "../server/middleware";
import { CreateEscrowSchema, validateBody, asyncHandler } from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { EscrowStatus } from "../types";

export const escrowRouter = Router();

// GET all escrow deals
escrowRouter.get("/api/escrow/deals", (req, res) => {
  const { user_id, seller_id, status } = req.query;
  let deals = [...collections.escrowDeals];
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
escrowRouter.post("/api/escrow/create", requireAuth, validateBody(CreateEscrowSchema), asyncHandler(async (req: any, res: any) => {
  const { listing_id, buyer_id, buyer_name, buyer_email, amount, assigned_engineer_id } = req.body;

  const listing = collections.listings.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "Equipment listing not found" });

  const seller = collections.sellers.find(s => s.id === listing.seller_id);
  const engineer = collections.engineers.find(e => e.id === assigned_engineer_id);

  const newDeal = {
    id: `esc-${Date.now()}`,
    listing_id: listing.id,
    listing_title: listing.title,
    buyer_id: buyer_id || req.user.id,
    buyer_name: buyer_name || 'Hospital Purchaser',
    buyer_email: buyer_email || req.user.email || 'purchaser@hospital.ng',
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
  logActivity(buyer_name || 'Buyer', 'CREATE_ESCROW', 'Escrow', `Created escrow deal for "${listing.title}" (Amount: ₦${Number(amount).toLocaleString()})`);

  const notif = {
    id: `notif-${Date.now()}-esc-cre`,
    user_id: seller?.user_id || 'usr-1',
    type: 'escrow_initiated',
    title: 'New Escrow Purchase Initiated',
    message: `${buyer_name || 'A clinic'} initiated an escrow agreement for "${listing.title}". Awaiting buyer deposit into escrow.`,
    read: false,
    created_at: new Date().toISOString()
  };
  collections.notifications.unshift(notif);
  await saveToFirestore('notifications', notif.id, notif);

  res.status(201).json(newDeal);
}));

// UPDATE Escrow Status: Deposit Funds
escrowRouter.patch("/api/escrow/:id/deposit", (req, res) => {
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Escrow deal not found" });

  deal.status = 'funds_deposited';
  deal.updated_at = new Date().toISOString();

  logActivity('System', 'ESCROW_FUNDS_DEPOSITED', 'Escrow', `Escrow funds ₦${deal.amount.toLocaleString()} deposited for deal ${deal.id}`);

  collections.notifications.unshift({
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
escrowRouter.patch("/api/escrow/:id/dispatch", (req, res) => {
  const { tracking_no } = req.body;
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Escrow deal not found" });

  deal.status = 'equipment_dispatched';
  if (tracking_no) deal.delivery_tracking_no = tracking_no;
  deal.updated_at = new Date().toISOString();

  logActivity(deal.seller_name, 'ESCROW_DISPATCH', 'Escrow', `Equipment dispatched for deal ${deal.id} (Waybill #: ${tracking_no || 'N/A'})`);

  res.json(deal);
});

// UPDATE Escrow Status: Biomedical Engineer Inspection Signoff
escrowRouter.patch("/api/escrow/:id/engineer-signoff", (req, res) => {
  const { engineer_notes, approved } = req.body;
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
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
escrowRouter.patch("/api/escrow/:id/release-funds", (req, res) => {
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Escrow deal not found" });

  deal.status = 'funds_released';
  deal.updated_at = new Date().toISOString();

  logActivity('Escrow Custody', 'ESCROW_RELEASED', 'Escrow', `Escrow payout ₦${deal.amount.toLocaleString()} released to vendor ${deal.seller_name}`);

  collections.notifications.unshift({
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
escrowRouter.patch("/api/escrow/:id/raise-dispute", (req, res) => {
  const { reason } = req.body;
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "Escrow deal not found" });

  deal.status = 'disputed';
  if (reason) deal.engineer_notes = `DISPUTE RAISED: ${reason}`;
  deal.updated_at = new Date().toISOString();

  logActivity('Buyer', 'ESCROW_DISPUTE', 'Escrow', `Dispute raised on deal ${deal.id}: ${reason || 'Equipment issue reported'}`);

  res.json(deal);
});
