/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore } from "../server/state";
import { requireAuth, sanitizeText } from "../server/middleware";
import { 
  VerificationRequestSchema, 
  validateBody, 
  requireVendorOwnerOrAdmin,
  requireCompletedRegistration,
  asyncHandler 
} from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { VerificationRequest } from "../types";

export const sellersRouter = Router();

// GET Sellers Profile
sellersRouter.get("/api/sellers/:id", (req, res) => {
  const seller = collections.sellers.find(s => s.id === req.params.id || s.user_id === req.params.id);
  if (!seller) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Seller registration details not found" });
  }
  seller.active_listings_count = collections.listings.filter(l => l.seller_id === seller.id && l.status === 'published').length;
  res.json(seller);
});

// Sellers Update Profile
sellersRouter.patch("/api/sellers/profile", requireAuth, requireCompletedRegistration, asyncHandler(async (req: any, res: any) => {
  const { business_name, contact_name, whatsapp_number, phone_number, state, city, cac_number } = req.body;
  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  
  if (!seller) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Seller profile not found for this user." });
  }

  if (business_name) seller.business_name = sanitizeText(business_name);
  if (contact_name) seller.contact_name = sanitizeText(contact_name);
  if (whatsapp_number) seller.whatsapp_number = sanitizeText(whatsapp_number);
  if (phone_number) seller.phone_number = sanitizeText(phone_number);
  if (state) seller.state = sanitizeText(state);
  if (city) seller.city = sanitizeText(city);
  if (cac_number) seller.cac_number = sanitizeText(cac_number);

  await saveToFirestore('sellers', seller.id, seller);
  res.json(seller);
}));

// Submit verification request
sellersRouter.post("/api/sellers/verification", requireAuth, requireCompletedRegistration, validateBody(VerificationRequestSchema), asyncHandler(async (req: any, res: any) => {
  const { cac_number, document_url } = req.validatedBody;
  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  
  if (!seller) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Seller profile not found for this user." });
  }

  seller.verification_status = 'pending';
  seller.cac_number = cac_number;
  await saveToFirestore('sellers', seller.id, seller);

  const vReq: VerificationRequest = {
    id: `vreq-${Date.now()}`,
    seller_id: seller.id,
    business_name: seller.business_name,
    cac_number,
    document_url: document_url || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400',
    status: 'pending',
    created_at: new Date().toISOString()
  };

  collections.verificationRequests.push(vReq);
  await saveToFirestore('verification_requests', vReq.id, vReq);

  const notif = {
    id: `notif-${Date.now()}`,
    user_id: 'usr-3',
    type: 'verification_needed',
    title: 'Verification Request',
    message: `${seller.business_name} uploaded CAC documents for review.`,
    read: false,
    created_at: new Date().toISOString()
  };
  collections.notifications.unshift(notif);
  await saveToFirestore('notifications', notif.id, notif);

  logActivity(seller.business_name, 'SUBMIT_CAC', 'KYC', `Submitted corporate registration CAC: ${cac_number}`);
  res.json({ success: true, verification: vReq });
}));
