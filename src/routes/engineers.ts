/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore } from "../server/state";
import { requireAuth, sanitizeText } from "../server/middleware";
import { 
  ReviewSchema, 
  validateBody, 
  requireCompletedRegistration,
  asyncHandler 
} from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { Engineer, EngineerReview } from "../types";

export const engineersRouter = Router();

// GET /api/engineers - Retrieve list of engineers with search & filters
engineersRouter.get("/api/engineers", (req, res) => {
  let filtered = [...collections.engineers];
  const { specialty, state, query } = req.query;

  if (specialty) {
    filtered = filtered.filter(e => e.specialty.toLowerCase().includes((specialty as string).toLowerCase()));
  }
  if (state) {
    filtered = filtered.filter(e => e.state.toLowerCase() === (state as string).toLowerCase());
  }
  if (query) {
    const sQuery = (query as string).toLowerCase();
    filtered = filtered.filter(e => 
      e.name.toLowerCase().includes(sQuery) || 
      e.specialty.toLowerCase().includes(sQuery) ||
      e.bio.toLowerCase().includes(sQuery) ||
      e.services_offered.some(s => s.toLowerCase().includes(sQuery))
    );
  }

  res.json(filtered);
});

// GET /api/engineers/:id/reviews - Retrieve reviews for an engineer
engineersRouter.get("/api/engineers/:id/reviews", (req, res) => {
  const engineerId = req.params.id;
  const reviews = collections.engineerReviews.filter(r => r.engineer_id === engineerId);
  res.json(reviews);
});

// POST /api/engineers/:id/reviews - Submit a review for an engineer
engineersRouter.post("/api/engineers/:id/reviews", requireAuth, requireCompletedRegistration, validateBody(ReviewSchema), asyncHandler(async (req: any, res: any) => {
  const engineerId = req.params.id;
  const { reviewer_name, reviewer_business, rating, comment } = req.validatedBody;

  const newReview: EngineerReview = {
    id: `rev-${Date.now()}`,
    engineer_id: engineerId,
    reviewer_id: req.user.id,
    reviewer_name: sanitizeText(reviewer_name) || req.user.email || 'Clinical Practitioner',
    reviewer_business: sanitizeText(reviewer_business) || "Clinical Practitioner",
    rating: Number(rating),
    comment: sanitizeText(comment),
    created_at: new Date().toISOString()
  };

  collections.engineerReviews.unshift(newReview);
  await saveToFirestore('engineer_reviews', newReview.id, newReview);

  const engReviews = collections.engineerReviews.filter(r => r.engineer_id === engineerId);
  const totalRating = engReviews.reduce((sum, r) => sum + r.rating, 0);
  const average = totalRating / engReviews.length;

  const engineer = collections.engineers.find(e => e.id === engineerId);
  if (engineer) {
    engineer.average_rating = parseFloat(average.toFixed(1));
    await saveToFirestore('engineers', engineer.id, engineer);
  }

  logActivity(req.user.email, 'SUBMIT_REVIEW', 'Engineer', `Submitted a ${rating}-star review for engineer ${engineer?.name || engineerId}`);

  res.status(201).json(newReview);
}));

// POST /api/engineers - Create/Register an engineer profile (Admin or Engineer role)
engineersRouter.post("/api/engineers", requireAuth, asyncHandler(async (req: any, res: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'engineer') {
    return res.status(403).json({ error: "FORBIDDEN", message: "Only engineers or administrators can create engineer profiles." });
  }

  const { name, specialty, experience_years, phone, email, state, city, bio, services_offered, avatar_url } = req.body;

  if (!name || !specialty || !phone || !email || !state || !city || !bio) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Required fields missing: name, specialty, phone, email, state, city, bio." });
  }

  const cleanName = sanitizeText(name);

  const newEngineer: Engineer = {
    id: `eng-${Date.now()}`,
    name: cleanName,
    specialty: sanitizeText(specialty),
    experience_years: Number(experience_years) || 1,
    phone: sanitizeText(phone),
    email: sanitizeText(email),
    state: sanitizeText(state),
    city: sanitizeText(city),
    bio: sanitizeText(bio),
    avatar_url: avatar_url || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    verified_status: 'unverified',
    average_rating: 0,
    services_offered: Array.isArray(services_offered) ? services_offered.map(sanitizeText) : [],
    created_at: new Date().toISOString()
  };

  collections.engineers.unshift(newEngineer);
  await saveToFirestore('engineers', newEngineer.id, newEngineer);
  logActivity(cleanName, 'REGISTER_ENGINEER', 'Engineer', `Created a new medical engineer profile: ${cleanName}`);

  res.status(201).json(newEngineer);
}));

// Inspections GET
engineersRouter.get("/api/inspections", requireAuth, (req: any, res: any) => {
  let filtered = [...collections.inspections];

  if (req.user.role !== 'admin') {
    const seller = collections.sellers.find(s => s.user_id === req.user.id);
    const sellerId = seller?.id;
    filtered = filtered.filter(i => i.buyer_id === req.user.id || (sellerId && i.seller_id === sellerId) || i.assigned_engineer_id === req.user.id);
  }

  if (req.query.listing_id) filtered = filtered.filter(i => i.listing_id === req.query.listing_id);
  if (req.query.status) filtered = filtered.filter(i => i.status === req.query.status);

  res.json(filtered);
});

engineersRouter.get("/api/inspections/:id", requireAuth, (req: any, res: any) => {
  const item = collections.inspections.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "NOT_FOUND", message: "Inspection request not found" });

  const seller = collections.sellers.find(s => s.user_id === req.user.id);
  if (req.user.role !== 'admin' && item.buyer_id !== req.user.id && (!seller || seller.id !== item.seller_id) && item.assigned_engineer_id !== req.user.id) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Not authorized to view this inspection record." });
  }

  res.json(item);
});

// Request Inspection
engineersRouter.post("/api/inspections/request", requireAuth, requireCompletedRegistration, asyncHandler(async (req: any, res: any) => {
  const {
    listing_id,
    buyer_name,
    buyer_phone,
    buyer_email,
    hospital_name,
    preferred_engineer_id,
    inspection_location,
    scheduled_date,
    notes,
    link_escrow
  } = req.body;

  if (!listing_id) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "listing_id is required" });
  }

  const listing = collections.listings.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "NOT_FOUND", message: "Medical equipment listing not found" });

  const seller = collections.sellers.find(s => s.id === listing.seller_id);

  let engineer = collections.engineers.find(e => e.id === preferred_engineer_id);
  if (!engineer) {
    engineer = collections.engineers.find(e => e.state.toLowerCase() === (listing.state || 'lagos').toLowerCase()) || collections.engineers[0];
  }

  const defaultChecklist = [
    {
      id: `chk-1-${Date.now()}`,
      label: 'Sensor / Transducer Signal Precision & Sensitivity Test',
      category: 'sensor_calibration',
      status: 'pending',
      measured_value: '',
      notes: 'Evaluate sensor frequency response & SNR'
    },
    {
      id: `chk-2-${Date.now()}`,
      label: 'High Voltage Tube Head / Generator Output & Radiation Leakage Test',
      category: 'tube_head_voltage',
      status: 'pending',
      measured_value: '',
      notes: 'X-Ray kVp / mA output calibration check'
    },
    {
      id: `chk-3-${Date.now()}`,
      label: 'West Africa Mains Voltage Surge Tolerance & Battery/UPS Cutover',
      category: 'power_surge',
      status: 'pending',
      measured_value: '',
      notes: 'Check 220V stabilization under load'
    },
    {
      id: `chk-4-${Date.now()}`,
      label: 'Probe, Cable Harness, Mounting & Essential Accessories Completeness Audit',
      category: 'accessories',
      status: 'pending',
      measured_value: '',
      notes: 'Verify missing probes, cuffs, lead cables or footswitches'
    },
    {
      id: `chk-5-${Date.now()}`,
      label: 'Chassis Electrical Safety & Ground Wire Leakage Current Check',
      category: 'safety',
      status: 'pending',
      measured_value: '',
      notes: 'Confirm compliance with IEC 60601 medical safety'
    }
  ];

  const inspectionFee = listing.price > 5000000 ? 120000 : 65000;
  const cleanBuyerName = sanitizeText(buyer_name) || req.user.email || 'Hospital Purchaser';

  const newInspection = {
    id: `insp-${Date.now()}`,
    listing_id: listing.id,
    listing_title: listing.title,
    listing_condition: listing.condition,
    listing_price: listing.price,
    listing_currency: listing.currency || 'NGN',
    seller_id: listing.seller_id,
    seller_name: seller?.business_name || listing.seller_name || 'Vendor',
    buyer_id: req.user.id,
    buyer_name: cleanBuyerName,
    buyer_phone: sanitizeText(buyer_phone) || req.user.phone || '+2348000000000',
    buyer_email: sanitizeText(buyer_email) || req.user.email || 'purchaser@hospital.ng',
    hospital_name: sanitizeText(hospital_name) || cleanBuyerName,
    assigned_engineer_id: engineer?.id || 'eng-1',
    assigned_engineer_name: engineer ? `${engineer.name} (${engineer.specialty})` : 'Engr. Emeka Okafor',
    assigned_engineer_phone: engineer?.phone || '+2348031112233',
    inspection_location: sanitizeText(inspection_location) || `${seller?.city || listing.city || 'Lagos'}, Warehouse Site`,
    scheduled_date: scheduled_date || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    status: 'scheduled',
    notes: sanitizeText(notes) || `Pre-purchase engineering audit requested on ${listing.title}.`,
    fee_amount: inspectionFee,
    escrow_linked: link_escrow !== false,
    checklist: defaultChecklist,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  collections.inspections.unshift(newInspection);
  await saveToFirestore('inspections', newInspection.id, newInspection);

  logActivity(cleanBuyerName, 'REQUEST_INSPECTION', 'BiomedicalAudit', `Requested pre-purchase engineering audit for "${listing.title}"`);

  res.status(201).json(newInspection);
}));

// Submit Report
engineersRouter.post("/api/inspections/:id/submit-report", requireAuth, asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  const { checklist, verdict_notes, status } = req.body;

  const inspection = collections.inspections.find(i => i.id === id);
  if (!inspection) return res.status(404).json({ error: "NOT_FOUND", message: "Inspection request not found" });

  if (req.user.role !== 'admin' && req.user.role !== 'engineer' && inspection.assigned_engineer_id !== req.user.id) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Only the assigned engineer or admin can submit inspection reports." });
  }

  if (checklist && Array.isArray(checklist)) {
    inspection.checklist = checklist;
  }
  if (verdict_notes) {
    inspection.engineer_verdict_notes = sanitizeText(verdict_notes);
  }

  const finalStatus = status || 'passed';
  inspection.status = finalStatus;
  inspection.completed_at = new Date().toISOString();
  inspection.updated_at = new Date().toISOString();

  if (finalStatus === 'passed') {
    inspection.certificate_no = `CERT-BIOMED-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  await saveToFirestore('inspections', inspection.id, inspection);
  logActivity(req.user.email, 'COMPLETE_INSPECTION', 'BiomedicalAudit', `Submitted report for ${inspection.listing_title}. Result: ${finalStatus.toUpperCase()}`);

  res.json(inspection);
}));
