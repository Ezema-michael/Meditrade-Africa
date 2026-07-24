/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore, chatMessagesCollection } from "../server/state";
import { requireAuth, criticalLimiter, sanitizeText } from "../server/middleware";
import { CreateOfferSchema, validateBody, asyncHandler } from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { Offer, ChatMessage, Lead } from "../types";

export const offersRouter = Router();

// GET all leads for a specific user role/profile
offersRouter.get("/api/leads", (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.json(collections.leads);
  }
  
  const user = collections.users.find(u => u.id === user_id);
  if (!user) {
    return res.json([]);
  }
  
  if (user.role === 'seller') {
    const seller = collections.sellers.find(s => s.user_id === user.id);
    if (!seller) return res.json([]);
    return res.json(collections.leads.filter(l => l.seller_id === seller.id));
  } else if (user.role === 'buyer') {
    return res.json(collections.leads.filter(l => l.buyer_id === user.id));
  } else {
    return res.json(collections.leads);
  }
});

// POST update lead status or notes
offersRouter.post("/api/leads/update-status", (req, res) => {
  const { lead_id, status, notes, price_offered } = req.body;
  const lead = collections.leads.find(l => l.id === lead_id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  
  if (status) lead.status = status;
  if (notes !== undefined) lead.notes = notes;
  if (price_offered !== undefined) lead.price_offered = Number(price_offered);
  lead.last_activity_at = new Date().toISOString();
  
  logActivity('System', 'UPDATE_LEAD', 'CRM', `Updated lead ${lead.id} status to ${status}`);
  res.json(lead);
});

// GET chat message history
offersRouter.get("/api/chats/:lead_id", (req, res) => {
  const { lead_id } = req.params;
  const messages = chatMessagesCollection.filter(m => m.lead_id === lead_id);
  res.json(messages);
});

// POST send new chat message
offersRouter.post("/api/chats/message", (req, res) => {
  const { lead_id, sender_id, message } = req.body;
  if (!lead_id || !sender_id || !message) {
    return res.status(400).json({ error: "Missing required chat parameters" });
  }
  
  const lead = collections.leads.find(l => l.id === lead_id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  
  let senderName = "User";
  const senderUser = collections.users.find(u => u.id === sender_id);
  if (senderUser) {
    if (senderUser.role === 'seller') {
      const seller = collections.sellers.find(s => s.user_id === sender_id);
      senderName = seller ? `${seller.business_name} (Vendor)` : senderUser.email;
    } else if (senderUser.role === 'buyer') {
      senderName = `${senderUser.email.split('@')[0].toUpperCase()} Hospital`;
    } else {
      senderName = "System Moderator";
    }
  }
  
  const cleanMessage = sanitizeText(message);

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    lead_id,
    sender_id,
    sender_name: senderName,
    message: cleanMessage,
    created_at: new Date().toISOString()
  };
  
  chatMessagesCollection.push(newMsg);
  lead.last_activity_at = new Date().toISOString();
  
  const receiverUserId = sender_id === lead.buyer_id 
    ? (collections.sellers.find(s => s.id === lead.seller_id)?.user_id || 'usr-1')
    : lead.buyer_id;
    
  collections.notifications.unshift({
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
offersRouter.post("/api/leads/inquire", (req, res) => {
  const { listing_id, buyer_id, message } = req.body;
  
  const listing = collections.listings.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "Equipment listing not found" });
  
  const buyer = collections.users.find(u => u.id === buyer_id) || collections.users.find(u => u.role === 'buyer');
  if (!buyer) return res.status(404).json({ error: "Buyer profile not found" });
  
  const seller = collections.sellers.find(s => s.id === listing.seller_id);
  if (!seller) return res.status(404).json({ error: "Seller profile not found" });
  
  let lead = collections.leads.find(l => l.seller_id === seller.id && l.buyer_id === buyer.id && l.source_id === listing_id);
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
    collections.leads.unshift(lead);
  } else {
    lead.last_activity_at = new Date().toISOString();
  }
  
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    lead_id: lead.id,
    sender_id: buyer.id,
    sender_name: `${buyer.email.split('@')[0].toUpperCase()} Hospital (Buyer)`,
    message: message || `Hello, I am interested in your listed medical equipment "${listing.title}". Can you give us more details?`,
    created_at: new Date().toISOString()
  };
  chatMessagesCollection.push(newMsg);
  
  collections.notifications.unshift({
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

// GET all offers
offersRouter.get("/api/offers", (req, res) => {
  const { seller_id, buyer_id, listing_id } = req.query;
  let filtered = collections.offers;
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
offersRouter.post("/api/offers", requireAuth, criticalLimiter, validateBody(CreateOfferSchema), asyncHandler(async (req: any, res: any) => {
  const { listing_id, buyer_id, buyer_name, buyer_contact, offer_amount, currency, message } = req.body;
  
  const listing = collections.listings.find(l => l.id === listing_id);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  
  const seller = collections.sellers.find(s => s.id === listing.seller_id);
  if (!seller) {
    return res.status(404).json({ error: "Seller not found" });
  }
  
  const cleanBuyerName = sanitizeText(buyer_name);
  const cleanBuyerContact = sanitizeText(buyer_contact);
  const cleanMessage = sanitizeText(message);
  
  const newOffer: Offer = {
    id: `off-${Date.now()}`,
    listing_id,
    buyer_id: buyer_id || req.user.id,
    buyer_name: cleanBuyerName,
    buyer_contact: cleanBuyerContact,
    offer_amount: Number(offer_amount),
    currency: currency || listing.currency || 'NGN',
    message: cleanMessage,
    listing_title: listing.title,
    seller_id: seller.id,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  collections.offers.unshift(newOffer);
  await saveToFirestore('offers', newOffer.id, newOffer);
  logActivity(buyer_name, 'MAKE_OFFER', 'Marketplace', `Submitted offer of ${newOffer.currency} ${Number(offer_amount).toLocaleString()} on ${listing.title}`);
  
  let lead = collections.leads.find(l => l.seller_id === seller.id && l.buyer_id === newOffer.buyer_id && l.source_id === listing_id);
  let isNew = false;
  
  if (!lead) {
    isNew = true;
    lead = {
      id: `lead-${Date.now()}`,
      seller_id: seller.id,
      buyer_id: newOffer.buyer_id || req.user.id,
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
    collections.leads.unshift(lead);
  } else {
    lead.status = 'quote_sent';
    lead.price_offered = Number(offer_amount);
    lead.notes = `New Offer submitted: ${newOffer.currency} ${Number(offer_amount).toLocaleString()}. ` + (lead.notes || '');
    lead.last_activity_at = new Date().toISOString();
  }
  await saveToFirestore('leads', lead.id, lead);
  
  const chatMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    lead_id: lead.id,
    sender_id: newOffer.buyer_id || req.user.id,
    sender_name: `${buyer_name} (Buyer Offer)`,
    message: `📢 [OFFER SUBMITTED] I have placed an offer of *${newOffer.currency} ${Number(offer_amount).toLocaleString()}* on this listing. ${message ? `Message: "${message}"` : ''}`,
    created_at: new Date().toISOString()
  };
  chatMessagesCollection.push(chatMsg);
  
  const notif = {
    id: `notif-${Date.now()}-off`,
    user_id: seller.user_id || 'usr-1',
    type: 'offer_received',
    title: 'New Offer Received!',
    message: `${buyer_name} offered ${newOffer.currency} ${Number(offer_amount).toLocaleString()} for ${listing.title}`,
    read: false,
    created_at: new Date().toISOString()
  };
  collections.notifications.unshift(notif);
  await saveToFirestore('notifications', notif.id, notif);
  
  res.status(201).json({ success: true, offer: newOffer, lead, isNew });
}));

// PATCH update offer status
offersRouter.patch("/api/offers/:id", (req, res) => {
  const { id } = req.params;
  const { status, counter_amount } = req.body;
  
  const offer = collections.offers.find(o => o.id === id);
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
  
  const lead = collections.leads.find(l => l.seller_id === offer.seller_id && l.buyer_id === offer.buyer_id && l.source_id === offer.listing_id);
  if (lead) {
    lead.last_activity_at = new Date().toISOString();
    
    let senderId = 'system';
    let senderName = 'System';
    const sellerObj = collections.sellers.find(s => s.id === offer.seller_id);
    
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
      
      collections.notifications.unshift({
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
offersRouter.get("/api/notifications", (req, res) => {
  const { user_id } = req.query;
  if (user_id) {
    const filtered = collections.notifications.filter(n => n.user_id === user_id);
    return res.json(filtered);
  }
  res.json(collections.notifications);
});

// Read and dismiss notifications
offersRouter.post("/api/notifications/dismiss", (req, res) => {
  const { user_id } = req.body || {};
  if (user_id) {
    collections.notifications.forEach(n => {
      if (n.user_id === user_id) n.read = true;
    });
  } else {
    collections.notifications.forEach(n => n.read = true);
  }
  res.json({ success: true });
});
