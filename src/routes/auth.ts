/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore } from "../server/state";
import { SyncUserSchema, validateBody, asyncHandler } from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { Seller } from "../types";

export const authRouter = Router();

authRouter.post("/api/auth/sync-user", validateBody(SyncUserSchema), asyncHandler(async (req: any, res: any) => {
  const { firebase_uid, email, phone, role } = req.body;

  let user = collections.users.find(u => u.firebase_uid === firebase_uid || u.email === email);
  if (!user) {
    user = {
      id: `usr-${Date.now()}`,
      firebase_uid: firebase_uid || `f-mock-${Date.now()}`,
      email,
      phone: phone || '',
      role: role || 'seller',
      status: 'active'
    };
    collections.users.push(user);
    await saveToFirestore('users', user.id, user);
    
    if (role === 'seller') {
      const newSeller: Seller = {
        id: `sel-${Date.now()}`,
        user_id: user.id,
        business_name: email.split('@')[0].toUpperCase() + ' Medical Equipment',
        contact_name: email.split('@')[0],
        whatsapp_number: phone || '+2348000000000',
        phone_number: phone || '+2348000000000',
        email,
        state: 'Lagos',
        city: 'Ikeja',
        verification_status: 'unverified',
        subscription_plan: 'free',
        active_listings_count: 0,
        rating_placeholder: 5.0,
        created_at: new Date().toISOString()
      };
      collections.sellers.push(newSeller);
      await saveToFirestore('sellers', newSeller.id, newSeller);
    }
    
    logActivity(email, 'REGISTER', 'User', `Registered new healthcare ${role || 'seller'} account.`);
  }

  const sellerProfile = collections.sellers.find(s => s.user_id === user?.id);

  res.json({
    user,
    seller: sellerProfile || null
  });
}));

// Update user profile info dynamically on backend
authRouter.post("/api/users/update", (req, res) => {
  const { user_id, email, phone, businessName, cac_number, profile_image_url } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  const user = collections.users.find(u => u.id === user_id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (profile_image_url) (user as any).profile_image_url = profile_image_url;

  if (user.role === 'seller') {
    const seller = collections.sellers.find(s => s.user_id === user.id);
    if (seller) {
      if (businessName) seller.business_name = businessName;
      if (phone) {
        seller.phone_number = phone;
        seller.whatsapp_number = phone;
      }
      if (email) seller.email = email;
      if (cac_number) seller.cac_number = cac_number;
      if (profile_image_url) seller.logo_url = profile_image_url;
    }
  }

  if (user.role === 'buyer') {
    collections.leads.forEach(l => {
      if (l.buyer_id === user.id) {
        if (businessName) l.buyer_name = businessName;
        if (phone) l.buyer_contact = `${email} (${phone})`;
      }
    });
  }

  logActivity(user.email, 'UPDATE_PROFILE', 'User Settings', `Updated profile credentials on database: Name: ${businessName}, Phone: ${phone}`);
  res.json({ success: true, user });
});

// Dynamic Account Registration Endpoint
authRouter.post("/api/auth/register", (req, res) => {
  const { email, phone, role, businessName, cacNumber, state, city } = req.body;
  
  if (!email || !role || !businessName) {
    return res.status(400).json({ error: "Required fields missing (email, role, businessName)" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = collections.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existingUser) {
    return res.status(400).json({ error: "An operator with this email is already registered." });
  }

  const userId = `usr-${Date.now()}`;
  const newUser = {
    id: userId,
    firebase_uid: `f-mock-${Date.now()}`,
    email: normalizedEmail,
    phone: phone || '+2348000000000',
    role: role || 'seller',
    status: 'active'
  };

  collections.users.push(newUser);

  let sellerObj = null;

  if (role === 'seller') {
    const sellerId = `sel-${Date.now()}`;
    const newSeller: Seller = {
      id: sellerId,
      user_id: userId,
      business_name: businessName,
      contact_name: normalizedEmail.split('@')[0],
      whatsapp_number: phone || '+2348000000000',
      phone_number: phone || '+2348000000000',
      email: normalizedEmail,
      state: state || 'Lagos',
      city: city || 'Ikeja',
      verification_status: 'unverified',
      subscription_plan: 'free',
      active_listings_count: 0,
      rating_placeholder: 5.0,
      created_at: new Date().toISOString(),
      cac_number: cacNumber || ''
    };
    collections.sellers.push(newSeller);
    sellerObj = newSeller;
  }

  logActivity(normalizedEmail, 'REGISTER', 'User', `Registered new clinical account. Role: ${role}, Entity: ${businessName}`);
  
  res.json({
    success: true,
    user: newUser,
    seller: sellerObj,
    businessName: businessName
  });
});
