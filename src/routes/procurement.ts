/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore, chatMessagesCollection } from "../server/state";
import { requireAuth, sanitizeText } from "../server/middleware";
import { 
  CreateRfqSchema, 
  SubmitQuoteSchema, 
  validateBody, 
  requireRole, 
  requireCompletedRegistration,
  asyncHandler 
} from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { ProcurementRequest, ProcurementResponse } from "../types";

export const procurementRouter = Router();

// Procurement Post requests
procurementRouter.post("/api/procurement-requests", requireAuth, requireCompletedRegistration, validateBody(CreateRfqSchema), asyncHandler(async (req: any, res: any) => {
  const { category_id, title, quantity, budget, currency, urgency, state, city, description, buyer_contact } = req.validatedBody;

  const cleanTitle = sanitizeText(title);
  const cleanDescription = sanitizeText(description);
  const cleanContact = sanitizeText(buyer_contact);
  const cleanState = sanitizeText(state);
  const cleanCity = sanitizeText(city);

  const newReq: ProcurementRequest = {
    id: `req-${Date.now()}`,
    user_id: req.user.id,
    category_id: category_id || 'cat-8',
    title: cleanTitle,
    quantity: Number(quantity) || 1,
    budget: Number(budget) || 0,
    currency: currency || 'NGN',
    urgency: urgency || 'medium',
    country: 'Nigeria',
    state: cleanState || 'Lagos',
    city: cleanCity || 'Ikeja',
    description: cleanDescription,
    status: 'open',
    buyer_contact: cleanContact,
    created_at: new Date().toISOString()
  };

  collections.procurementRequests.unshift(newReq);
  await saveToFirestore('procurement_requests', newReq.id, newReq);
  logActivity(req.user.email || 'Buyer', 'POST_RFQ', 'Procurement', `Posted RFQ: ${title}`);

  const notif1 = {
    id: `notif-${Date.now()}`,
    user_id: 'usr-1',
    type: 'procurement_match',
    title: 'New RFQ matching your products',
    message: `A hospital posted: "${title}". Respond immediately!`,
    read: false,
    created_at: new Date().toISOString()
  };
  collections.notifications.unshift(notif1);
  await saveToFirestore('notifications', notif1.id, notif1);

  const notif2 = {
    id: `notif-${Date.now()}-adm`,
    user_id: 'usr-3',
    type: 'admin_rfq_alert',
    title: 'New Sourcing RFQ Published',
    message: `Hospital buyer posted a new RFQ: "${title}" (Qty: ${newReq.quantity}, Budget: ₦${Number(newReq.budget).toLocaleString()}).`,
    read: false,
    created_at: new Date().toISOString()
  };
  collections.notifications.unshift(notif2);
  await saveToFirestore('notifications', notif2.id, notif2);

  const notif3 = {
    id: `notif-${Date.now()}-byr`,
    user_id: newReq.user_id,
    type: 'rfq_broadcast',
    title: 'RFQ Sourcing Broadcasted',
    message: `Your clinical sourcing request for "${title}" has been successfully broadcast to verified vendors.`,
    read: false,
    created_at: new Date().toISOString()
  };
  collections.notifications.unshift(notif3);
  await saveToFirestore('notifications', notif3.id, notif3);

  res.json(newReq);
}));

// Procurement GET requests
procurementRouter.get("/api/procurement-requests", (req, res) => {
  res.json(collections.procurementRequests);
});

// Respond to procurement requests
procurementRouter.post("/api/procurement-requests/:id/respond", requireAuth, requireCompletedRegistration, requireRole('seller', 'admin'), validateBody(SubmitQuoteSchema), asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { price, message, availability, whatsapp_contact, offered_product } = req.validatedBody;

  const request = collections.procurementRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Procurement request not found" });
  }

  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  if (!seller && req.user.role !== 'admin') {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "No registered merchant store profile found for your user account."
    });
  }

  const activeSeller = seller || collections.sellers[0];

  const newResponse: ProcurementResponse = {
    id: `presp-${Date.now()}`,
    request_id: id,
    seller_id: activeSeller.id,
    price: Number(price),
    message: sanitizeText(message),
    availability: sanitizeText(availability) || 'Immediate',
    whatsapp_contact: sanitizeText(whatsapp_contact) || activeSeller.whatsapp_number,
    seller_name: activeSeller.business_name,
    offered_product: sanitizeText(offered_product) || 'Specified Medical Equipment',
    created_at: new Date().toISOString()
  };

  collections.procurementResponses.unshift(newResponse);
  await saveToFirestore('procurement_quotes', newResponse.id, newResponse);
  logActivity(activeSeller.business_name, 'RESPOND_RFQ', 'Procurement', `Responded with equipment offer to: "${request.title}"`);

  const notif1 = {
    id: `notif-${Date.now()}`,
    user_id: request.user_id || 'usr-5',
    type: 'rfq_offer',
    title: 'New Bid Response Received!',
    message: `${activeSeller.business_name} offered "${offered_product}" for ₦${Number(price).toLocaleString()}`,
    read: false,
    created_at: new Date().toISOString()
  };
  collections.notifications.unshift(notif1);
  await saveToFirestore('notifications', notif1.id, notif1);

  let existingLead = collections.leads.find(l => l.seller_id === activeSeller.id && l.buyer_id === request.user_id && l.source_id === id);
  if (!existingLead) {
    const buyerUser = collections.users.find(u => u.id === request.user_id);
    const buyerEmailName = buyerUser ? buyerUser.email.split('@')[0].toUpperCase() + ' Hospital' : 'Riverside Memorial Hospital';
    existingLead = {
      id: `lead-${Date.now()}`,
      seller_id: activeSeller.id,
      buyer_id: request.user_id,
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
    collections.leads.unshift(existingLead);
  } else {
    existingLead.status = 'quote_sent';
    existingLead.price_offered = Number(price);
    existingLead.last_activity_at = new Date().toISOString();
  }
  await saveToFirestore('leads', existingLead.id, existingLead);

  const chatMsg = {
    id: `msg-${Date.now()}-auto`,
    lead_id: existingLead.id,
    sender_id: activeSeller.user_id || req.user.id,
    sender_name: `${activeSeller.business_name} (Vendor)`,
    message: message || `We have submitted a bid for your RFQ "${request.title}" offering "${offered_product || request.title}" for ₦${Number(price).toLocaleString()}`,
    created_at: new Date().toISOString()
  };
  chatMessagesCollection.push(chatMsg);

  res.json(newResponse);
}));
