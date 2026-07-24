/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore, chatMessagesCollection } from "../server/state";
import { requireAuth, criticalLimiter, sanitizeText } from "../server/middleware";
import { 
  CreateOfferSchema, 
  validateBody, 
  requireCompletedRegistration,
  asyncHandler 
} from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { Offer, ChatMessage } from "../types";

export const offersRouter = Router();

// GET all leads for authenticated user
offersRouter.get("/api/leads", requireAuth, (req: any, res: any) => {
  if (req.user.role === 'admin') {
    return res.json(collections.leads);
  }

  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  const sellerId = seller?.id;

  const filtered = collections.leads.filter(
    l => l.buyer_id === req.user.id || (sellerId && l.seller_id === sellerId)
  );

  res.json(filtered);
});

// POST update lead status or notes
offersRouter.post("/api/leads/update-status", requireAuth, asyncHandler(async (req: any, res: any) => {
  const { lead_id, status, notes, price_offered } = req.body;
  const lead = collections.leads.find(l => l.id === lead_id);
  if (!lead) return res.status(404).json({ error: "NOT_FOUND", message: "Lead not found" });

  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  if (req.user.role !== 'admin' && lead.buyer_id !== req.user.id && (!seller || seller.id !== lead.seller_id)) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Not authorized to modify this lead." });
  }

  if (status) lead.status = status;
  if (notes !== undefined) lead.notes = sanitizeText(notes);
  if (price_offered !== undefined) lead.price_offered = Number(price_offered);
  lead.last_activity_at = new Date().toISOString();

  await saveToFirestore('leads', lead.id, lead);
  logActivity(req.user.email, 'UPDATE_LEAD', 'CRM', `Updated lead ${lead.id} status to ${status}`);
  res.json(lead);
}));

// GET chat message history
offersRouter.get("/api/chats/:lead_id", requireAuth, (req: any, res: any) => {
  const { lead_id } = req.params;
  const lead = collections.leads.find(l => l.id === lead_id);
  if (!lead) return res.status(404).json({ error: "NOT_FOUND", message: "Lead not found" });

  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  if (req.user.role !== 'admin' && lead.buyer_id !== req.user.id && (!seller || seller.id !== lead.seller_id)) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Not authorized to view messages for this lead." });
  }

  const messages = chatMessagesCollection.filter(m => m.lead_id === lead_id);
  res.json(messages);
});

// POST send new chat message
offersRouter.post("/api/chats/message", requireAuth, asyncHandler(async (req: any, res: any) => {
  const { lead_id, message } = req.body;
  if (!lead_id || !message) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Missing required parameters (lead_id, message)" });
  }

  const lead = collections.leads.find(l => l.id === lead_id);
  if (!lead) return res.status(404).json({ error: "NOT_FOUND", message: "Lead not found" });

  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  if (req.user.role !== 'admin' && lead.buyer_id !== req.user.id && (!seller || seller.id !== lead.seller_id)) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Not authorized to post in this chat." });
  }

  let senderName = req.user.email || 'User';
  if (req.user.role === 'seller' && seller) {
    senderName = `${seller.business_name} (Vendor)`;
  } else if (req.user.role === 'buyer') {
    senderName = `${req.user.email.split('@')[0].toUpperCase()} Hospital`;
  } else if (req.user.role === 'admin') {
    senderName = "System Moderator";
  }

  const cleanMessage = sanitizeText(message);

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    lead_id,
    sender_id: req.user.id,
    sender_name: senderName,
    message: cleanMessage,
    created_at: new Date().toISOString()
  };

  chatMessagesCollection.push(newMsg);
  lead.last_activity_at = new Date().toISOString();

  res.json(newMsg);
}));

// POST buy inquiry start on specific listing
offersRouter.post("/api/leads/inquire", requireAuth, requireCompletedRegistration, asyncHandler(async (req: any, res: any) => {
  const { listing_id, message } = req.body;

  const listing = collections.listings.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "NOT_FOUND", message: "Equipment listing not found" });

  const seller = collections.sellers.find(s => s.id === listing.seller_id);
  if (!seller) return res.status(404).json({ error: "NOT_FOUND", message: "Seller profile not found" });

  let lead = collections.leads.find(l => l.seller_id === seller.id && l.buyer_id === req.user.id && l.source_id === listing_id);
  let isNew = false;
  if (!lead) {
    isNew = true;
    lead = {
      id: `lead-${Date.now()}`,
      seller_id: seller.id,
      buyer_id: req.user.id,
      buyer_name: req.user.email ? `${req.user.email.split('@')[0].toUpperCase()} Hospital` : 'Hospital Buyer',
      buyer_contact: req.user.phone || req.user.email || '+2348000000000',
      title: `${listing.title} Inquiry`,
      type: 'listing_inquiry',
      source_id: listing_id,
      status: 'new',
      notes: `Direct listing inquiry on "${listing.title}". Listed price: ₦${listing.price.toLocaleString()}`,
      price_offered: listing.price,
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    collections.leads.unshift(lead);
  } else {
    lead.last_activity_at = new Date().toISOString();
  }

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    lead_id: lead.id,
    sender_id: req.user.id,
    sender_name: `${req.user.email?.split('@')[0].toUpperCase() || 'Buyer'} Hospital (Buyer)`,
    message: sanitizeText(message) || `Hello, I am interested in your listed medical equipment "${listing.title}".`,
    created_at: new Date().toISOString()
  };
  chatMessagesCollection.push(newMsg);

  res.json({ success: true, lead, isNew });
}));

// GET all offers
offersRouter.get("/api/offers", requireAuth, (req: any, res: any) => {
  let filtered = [...collections.offers];
  if (req.user.role !== 'admin') {
    const seller = collections.sellers.find(s => s.user_id === req.user.id);
    const sellerId = seller?.id;
    filtered = filtered.filter(o => o.buyer_id === req.user.id || (sellerId && o.seller_id === sellerId));
  }
  res.json(filtered);
});

// POST submit a new offer
offersRouter.post("/api/offers", requireAuth, requireCompletedRegistration, criticalLimiter, validateBody(CreateOfferSchema), asyncHandler(async (req: any, res: any) => {
  const { listing_id, buyer_name, buyer_contact, amount, currency, message } = req.validatedBody;

  const listing = collections.listings.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "NOT_FOUND", message: "Listing not found" });

  const seller = collections.sellers.find(s => s.id === listing.seller_id);
  if (!seller) return res.status(404).json({ error: "NOT_FOUND", message: "Seller not found" });

  const cleanBuyerName = sanitizeText(buyer_name) || req.user.email || 'Hospital Purchaser';
  const cleanBuyerContact = sanitizeText(buyer_contact) || req.user.phone || req.user.email || '+2348000000000';
  const cleanMessage = sanitizeText(message);

  const newOffer: Offer = {
    id: `off-${Date.now()}`,
    listing_id,
    buyer_id: req.user.id,
    buyer_name: cleanBuyerName,
    buyer_contact: cleanBuyerContact,
    offer_amount: Number(amount),
    currency: currency || listing.currency || 'NGN',
    message: cleanMessage,
    listing_title: listing.title,
    seller_id: seller.id,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  collections.offers.unshift(newOffer);
  await saveToFirestore('offers', newOffer.id, newOffer);
  logActivity(cleanBuyerName, 'MAKE_OFFER', 'Marketplace', `Submitted offer of ${newOffer.currency} ${Number(amount).toLocaleString()} on ${listing.title}`);

  res.status(201).json({ success: true, offer: newOffer });
}));

// PATCH update offer status
offersRouter.patch("/api/offers/:id", requireAuth, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { status, counter_amount } = req.body;

  const offer = collections.offers.find(o => o.id === id);
  if (!offer) return res.status(404).json({ error: "NOT_FOUND", message: "Offer not found" });

  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  if (req.user.role !== 'admin' && (!seller || seller.id !== offer.seller_id)) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Only seller or admin can update offer status." });
  }

  if (status) offer.status = status;
  if (counter_amount !== undefined) offer.counter_amount = Number(counter_amount);

  await saveToFirestore('offers', offer.id, offer);
  logActivity(req.user.email, 'UPDATE_OFFER', 'Marketplace', `Offer ${id} updated to ${status}`);

  res.json(offer);
}));

// GET user notifications
offersRouter.get("/api/notifications", requireAuth, (req: any, res: any) => {
  const filtered = collections.notifications.filter(n => n.user_id === req.user.id || req.user.role === 'admin');
  res.json(filtered);
});

// Read and dismiss notifications
offersRouter.post("/api/notifications/dismiss", requireAuth, (req: any, res: any) => {
  collections.notifications.forEach(n => {
    if (n.user_id === req.user.id || req.user.role === 'admin') {
      n.read = true;
    }
  });
  res.json({ success: true });
});
