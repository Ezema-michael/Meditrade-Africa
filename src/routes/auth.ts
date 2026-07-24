/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore } from "../server/state";
import { RegisterUserSchema, validateBody, asyncHandler } from "../lib/validation";
import { requireAuth } from "../server/middleware";
import { logActivity } from "../lib/auditLogger";
import { Seller } from "../types";

export const authRouter = Router();

// Sync Firebase User with MediTrade Database Profile
authRouter.post("/api/auth/sync-user", requireAuth, asyncHandler(async (req: any, res: any) => {
  const firebaseUid = req.user.firebase_uid;
  const email = req.user.email;

  let user = collections.users.find(u => u.firebase_uid === firebaseUid || (email && u.email === email));
  if (!user) {
    // If authenticated in Firebase but not in MediTrade users, initialize as pending_registration guest
    user = {
      id: `usr-${Date.now()}`,
      firebase_uid: firebaseUid,
      email: email || '',
      phone: '',
      role: 'guest',
      status: 'pending_registration'
    };
    collections.users.push(user);
    await saveToFirestore('users', user.id, user);
    logActivity(email || firebaseUid, 'SYNC_USER', 'User', 'Initialized authenticated user in pending_registration state.');
  }

  const sellerProfile = collections.sellers.find(s => s.user_id === user?.id);

  res.json({
    user,
    seller: sellerProfile || null
  });
}));

// Update user profile info dynamically on backend
authRouter.post("/api/users/update", requireAuth, asyncHandler(async (req: any, res: any) => {
  const userId = req.user.id;
  const { phone, businessName, cac_number, profile_image_url } = req.body;

  const user = collections.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "FORBIDDEN", message: "User profile not found." });
  }

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
      if (cac_number) seller.cac_number = cac_number;
      if (profile_image_url) seller.logo_url = profile_image_url;
      await saveToFirestore('sellers', seller.id, seller);
    }
  }

  await saveToFirestore('users', user.id, user);

  logActivity(
    user.email,
    'UPDATE_PROFILE',
    'User Settings',
    `Updated profile credentials: Name: ${businessName || 'N/A'}, Phone: ${phone || 'N/A'}`
  );

  res.json({ success: true, user });
}));

// Dynamic Account Registration Endpoint
authRouter.post("/api/auth/register", requireAuth, validateBody(RegisterUserSchema), asyncHandler(async (req: any, res: any) => {
  const { role, business_name, state, address, phone } = req.validatedBody;
  const email = req.user.email || req.body.email;

  if (!email) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Email is required for registration." });
  }

  // Enforce allowed public roles: 'buyer' or 'seller' ONLY!
  if (role !== 'buyer' && role !== 'seller') {
    return res.status(403).json({
      error: "PRIVILEGED_ROLE_REJECTED",
      message: "Public registration allows only 'buyer' or 'seller' roles. Privileged roles require administrative approval."
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  let user = collections.users.find(u => u.id === req.user.id || u.email.toLowerCase() === normalizedEmail);

  if (user) {
    user.email = normalizedEmail;
    user.role = role;
    user.status = 'active';
    if (phone) user.phone = phone;
  } else {
    user = {
      id: req.user.id || `usr-${Date.now()}`,
      firebase_uid: req.user.firebase_uid || `f-uid-${Date.now()}`,
      email: normalizedEmail,
      phone: phone || '+2348000000000',
      role,
      status: 'active'
    };
    collections.users.push(user);
  }

  await saveToFirestore('users', user.id, user);

  let sellerObj = null;

  if (role === 'seller') {
    let seller = collections.sellers.find(s => s.user_id === user.id);
    if (!seller) {
      sellerObj = {
        id: `sel-${Date.now()}`,
        user_id: user.id,
        business_name: business_name || `${normalizedEmail.split('@')[0].toUpperCase()} Medical`,
        contact_name: normalizedEmail.split('@')[0],
        whatsapp_number: phone || '+2348000000000',
        phone_number: phone || '+2348000000000',
        email: normalizedEmail,
        state: state || 'Lagos',
        city: 'Ikeja',
        verification_status: 'unverified' as const,
        subscription_plan: 'free' as const,
        active_listings_count: 0,
        rating_placeholder: 5.0,
        created_at: new Date().toISOString()
      };
      collections.sellers.push(sellerObj);
      await saveToFirestore('sellers', sellerObj.id, sellerObj);
    } else {
      sellerObj = seller;
    }
  }

  logActivity(normalizedEmail, 'REGISTER', 'User', `Completed account registration as ${role}. Entity: ${business_name || 'N/A'}`);

  res.json({
    success: true,
    user,
    seller: sellerObj
  });
}));
