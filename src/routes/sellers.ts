/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore } from "../server/state";
import { requireAuth } from "../server/middleware";
import { VerificationRequestSchema, validateBody, asyncHandler } from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { VerificationRequest } from "../types";

export const sellersRouter = Router();

// GET Sellers Profile
sellersRouter.get("/api/sellers/:id", (req, res) => {
  const seller = collections.sellers.find(s => s.id === req.params.id || s.user_id === req.params.id);
  if (!seller) {
    return res.status(404).json({ error: "Seller registration details not found" });
  }
  // Count current listings dynamically
  seller.active_listings_count = collections.listings.filter(l => l.seller_id === seller.id && l.status === 'published').length;
  res.json(seller);
});

// Sellers Update Profile
sellersRouter.patch("/api/sellers/profile", (req, res) => {
  const { seller_id, business_name, contact_name, whatsapp_number, phone_number, state, city, cac_number } = req.body;
  const index = collections.sellers.findIndex(s => s.id === seller_id || s.user_id === seller_id);
  
  if (index === -1) {
    return res.status(404).json({ error: "Seller profile not found." });
  }

  collections.sellers[index] = {
    ...collections.sellers[index],
    business_name: business_name || collections.sellers[index].business_name,
    contact_name: contact_name || collections.sellers[index].contact_name,
    whatsapp_number: whatsapp_number || collections.sellers[index].whatsapp_number,
    phone_number: phone_number || collections.sellers[index].phone_number,
    state: state || collections.sellers[index].state,
    city: city || collections.sellers[index].city,
    cac_number: cac_number || collections.sellers[index].cac_number
  };

  saveToFirestore('sellers', collections.sellers[index].id, collections.sellers[index]);
  res.json(collections.sellers[index]);
});

// Submit verification request
sellersRouter.post("/api/sellers/verification", requireAuth, validateBody(VerificationRequestSchema), asyncHandler(async (req: any, res: any) => {
  const { seller_id, cac_number, document_url } = req.body;
  const seller = collections.sellers.find(s => s.id === seller_id || s.user_id === req.user.id);
  if (!seller) {
    return res.status(404).json({ error: "Seller not found" });
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
