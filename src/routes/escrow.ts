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
import { z } from "zod";
import {
  getFileMetadataByIdAuthoritative,
  MetadataUnavailableError
} from "../lib/serverDb";

export const escrowRouter = Router();

function isAssignedEngineer(user: any, engineerId?: string): boolean {
  return Boolean(engineerId && collections.engineers.some(
    engineer => engineer.id === engineerId && engineer.user_id === user.id
  ));
}

escrowRouter.get("/api/escrow/bank-details", requireAuth, (_req, res) => {
  const bankName = process.env.BANK_TRANSFER_BANK_NAME;
  const accountName = process.env.BANK_TRANSFER_ACCOUNT_NAME;
  const accountNumber = process.env.BANK_TRANSFER_ACCOUNT_NUMBER;
  if (!bankName || !accountName || !accountNumber) {
    return res.status(503).json({
      error: "BANK_TRANSFER_UNAVAILABLE",
      message: "Bank-transfer details are not configured."
    });
  }
  res.json({ bank_name: bankName, account_name: accountName, account_number: accountNumber });
});

const BankPaymentProofSchema = z.object({
  proof_file_id: z.string().min(1),
  bank_name: z.string().min(2).max(120),
  transaction_reference: z.string().min(3).max(120)
}).strict();

const BankPaymentConfirmationSchema = z.object({
  notes: z.string().max(500).optional()
}).strict();

// GET all escrow deals
escrowRouter.get("/api/escrow/deals", requireAuth, (req: any, res: any) => {
  const { user_id, seller_id, status } = req.query;
  let deals = [...collections.escrowDeals];

  // Non-admins can only see deals where they are a buyer, seller, or requested engineer.
  if (req.user.role !== 'admin') {
    const seller = collections.sellers.find(s => s.user_id === req.user.id);
    const sellerId = seller?.id;
    deals = deals.filter(d =>
      d.buyer_id === req.user.id ||
      (sellerId && d.seller_id === sellerId) ||
      (d.engineer_requested && isAssignedEngineer(req.user, d.assigned_engineer_id))
    );
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
    assigned_engineer_id: engineer?.id,
    assigned_engineer_name: engineer?.name ? `${engineer.name} (${engineer.specialty})` : undefined,
    engineer_requested: Boolean(engineer),
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

// Buyer submits a bank-transfer receipt already uploaded against this escrow deal.
escrowRouter.post(
  "/api/escrow/:id/bank-payment-proof",
  requireAuth,
  validateBody(BankPaymentProofSchema),
  asyncHandler(async (req: any, res: any) => {
    const deal = collections.escrowDeals.find(d => d.id === req.params.id);
    if (!deal) return res.status(404).json({ error: "NOT_FOUND", message: "Escrow deal not found" });
    if (deal.buyer_id !== req.user.id) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Only the buyer can submit bank-payment proof." });
    }
    if (deal.status !== 'initiated') {
      return res.status(409).json({ error: "INVALID_STATE_TRANSITION", message: "Payment proof can only be submitted for an initiated deal." });
    }

    let proof;
    try {
      proof = await getFileMetadataByIdAuthoritative(req.validatedBody.proof_file_id);
    } catch (err) {
      if (err instanceof MetadataUnavailableError) {
        return res.status(503).json({ error: "STORAGE_METADATA_UNAVAILABLE", message: "Payment proof could not be verified. Please retry." });
      }
      throw err;
    }
    if (
      !proof ||
      proof.status !== 'active' ||
      proof.uploaderUserId !== req.user.id ||
      proof.entityType !== 'escrow' ||
      proof.entityId !== deal.id
    ) {
      return res.status(400).json({
        error: "INVALID_PAYMENT_PROOF",
        message: "The uploaded file is not an active payment proof belonging to this escrow deal."
      });
    }

    deal.payment_method = 'bank_transfer';
    deal.bank_payment_status = 'proof_pending';
    deal.bank_payment_proof_file_id = proof.id;
    deal.bank_payment_bank_name = sanitizeText(req.validatedBody.bank_name);
    deal.bank_payment_transaction_reference = sanitizeText(req.validatedBody.transaction_reference);
    deal.bank_payment_submitted_at = new Date().toISOString();
    deal.updated_at = new Date().toISOString();
    await saveToFirestore('escrow_deals', deal.id, deal);

    logActivity(req.user.email, 'BANK_PAYMENT_PROOF_SUBMITTED', 'Escrow', `Bank-payment proof submitted for deal ${deal.id}`);
    const seller = collections.sellers.find(s => s.id === deal.seller_id);
    const notif = {
      id: `notif-${Date.now()}-bank-proof`,
      user_id: seller?.user_id || '',
      type: 'bank_payment_proof_submitted',
      title: 'Bank Payment Proof Awaiting Confirmation',
      message: `${deal.buyer_name} submitted bank-transfer proof for ${deal.listing_title}.`,
      read: false,
      created_at: new Date().toISOString()
    };
    if (notif.user_id) {
      collections.notifications.unshift(notif);
      await saveToFirestore('notifications', notif.id, notif);
    }
    res.status(201).json(deal);
  })
);

// Admin, deal seller, or specifically requested/assigned engineer confirms receipt.
escrowRouter.patch(
  "/api/escrow/:id/bank-payment-confirm",
  requireAuth,
  validateBody(BankPaymentConfirmationSchema),
  asyncHandler(async (req: any, res: any) => {
    const deal = collections.escrowDeals.find(d => d.id === req.params.id);
    if (!deal) return res.status(404).json({ error: "NOT_FOUND", message: "Escrow deal not found" });

    const seller = collections.sellers.find(s => s.user_id === req.user.id);
    const canConfirm = req.user.role === 'admin' ||
      seller?.id === deal.seller_id ||
      Boolean(deal.engineer_requested && isAssignedEngineer(req.user, deal.assigned_engineer_id));
    if (!canConfirm) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Only an administrator, the deal seller, or the requested assigned engineer can confirm this payment."
      });
    }
    if (deal.status !== 'initiated' || deal.bank_payment_status !== 'proof_pending' || !deal.bank_payment_proof_file_id) {
      return res.status(409).json({
        error: "INVALID_STATE_TRANSITION",
        message: "A pending bank-payment proof is required before confirmation."
      });
    }

    deal.bank_payment_status = 'confirmed';
    deal.bank_payment_confirmed_at = new Date().toISOString();
    deal.bank_payment_confirmed_by = req.user.id;
    deal.bank_payment_confirmed_by_role = req.user.role;
    deal.bank_payment_confirmation_notes = sanitizeText(req.validatedBody.notes || '');
    deal.status = 'funds_deposited';
    deal.updated_at = new Date().toISOString();
    await saveToFirestore('escrow_deals', deal.id, deal);

    logActivity(req.user.email, 'BANK_PAYMENT_CONFIRMED', 'Escrow', `Bank payment confirmed for deal ${deal.id}`);
    const notif = {
      id: `notif-${Date.now()}-bank-confirmed`,
      user_id: deal.buyer_id,
      type: 'bank_payment_confirmed',
      title: 'Bank Payment Confirmed',
      message: `Your bank transfer for ${deal.listing_title} was confirmed. The seller may now dispatch the equipment.`,
      read: false,
      created_at: new Date().toISOString()
    };
    collections.notifications.unshift(notif);
    await saveToFirestore('notifications', notif.id, notif);
    res.json(deal);
  })
);

// UPDATE Escrow Status: Deposit Funds
escrowRouter.patch("/api/escrow/:id/deposit", requireAuth, asyncHandler(async (req: any, res: any) => {
  const deal = collections.escrowDeals.find(d => d.id === req.params.id);
  if (!deal) return res.status(404).json({ error: "NOT_FOUND", message: "Escrow deal not found" });

  if (req.user.role !== 'admin' && deal.buyer_id !== req.user.id) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Only the buyer or admin can deposit funds for this deal." });
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: "PAYMENT_PROVIDER_REQUIRED",
      message: "Deposits are recorded only by the verified payment-provider webhook."
    });
  }
  if (deal.status !== 'initiated') {
    return res.status(409).json({ error: "INVALID_STATE_TRANSITION", message: "Only initiated deals can accept a deposit." });
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
  if (deal.status !== 'funds_deposited') {
    return res.status(409).json({ error: "INVALID_STATE_TRANSITION", message: "Funds must be verified before dispatch." });
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

  if (req.user.role !== 'admin' && !isAssignedEngineer(req.user, deal.assigned_engineer_id)) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Only an assigned engineer or admin can sign off on inspection." });
  }
  if (deal.status !== 'equipment_dispatched') {
    return res.status(409).json({ error: "INVALID_STATE_TRANSITION", message: "Equipment must be dispatched before inspection sign-off." });
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
  if (deal.status !== 'inspected_approved') {
    return res.status(409).json({ error: "INVALID_STATE_TRANSITION", message: "An approved inspection is required before releasing funds." });
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: "PAYMENT_PROVIDER_REQUIRED",
      message: "Fund release is performed only by the verified payment-provider workflow."
    });
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

  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  const isParty = deal.buyer_id === req.user.id || seller?.id === deal.seller_id ||
    isAssignedEngineer(req.user, deal.assigned_engineer_id);
  if (req.user.role !== 'admin' && !isParty) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Only a party to this deal can raise a dispute." });
  }
  if (deal.status === 'funds_released') {
    return res.status(409).json({ error: "INVALID_STATE_TRANSITION", message: "This deal can no longer be disputed." });
  }

  deal.status = 'disputed';
  if (reason) deal.engineer_notes = `DISPUTE RAISED: ${sanitizeText(reason)}`;
  deal.updated_at = new Date().toISOString();
  await saveToFirestore('escrow_deals', deal.id, deal);

  logActivity(req.user.email, 'ESCROW_DISPUTE', 'Escrow', `Dispute raised on deal ${deal.id}`);

  res.json(deal);
}));
