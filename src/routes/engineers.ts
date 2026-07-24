/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore } from "../server/state";
import { requireAuth } from "../server/middleware";
import { ReviewSchema, validateBody, asyncHandler } from "../lib/validation";
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
engineersRouter.post("/api/engineers/:id/reviews", requireAuth, validateBody(ReviewSchema), asyncHandler(async (req: any, res: any) => {
  const engineerId = req.params.id;
  const { reviewer_id, reviewer_name, reviewer_business, rating, comment } = req.body;

  const newReview: EngineerReview = {
    id: `rev-${Date.now()}`,
    engineer_id: engineerId,
    reviewer_id: reviewer_id || req.user.id,
    reviewer_name,
    reviewer_business: reviewer_business || "Clinical Practitioner",
    rating: Number(rating),
    comment,
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

  logActivity(reviewer_name, 'SUBMIT_REVIEW', 'Engineer', `Submitted a ${rating}-star review for engineer ${engineer?.name || engineerId}`);

  res.status(201).json(newReview);
}));

// POST /api/engineers - Create/Register an engineer profile
engineersRouter.post("/api/engineers", requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, specialty, experience_years, phone, email, state, city, bio, services_offered, avatar_url } = req.body;

  if (!name || !specialty || !phone || !email || !state || !city || !bio) {
    return res.status(400).json({ error: "Required fields are missing: name, specialty, phone, email, state, city, bio." });
  }

  const newEngineer: Engineer = {
    id: `eng-${Date.now()}`,
    name,
    specialty,
    experience_years: Number(experience_years) || 1,
    phone,
    email,
    state,
    city,
    bio,
    avatar_url: avatar_url || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    verified_status: 'unverified',
    average_rating: 0,
    services_offered: Array.isArray(services_offered) ? services_offered : [],
    created_at: new Date().toISOString()
  };

  collections.engineers.unshift(newEngineer);
  await saveToFirestore('engineers', newEngineer.id, newEngineer);
  logActivity(name, 'REGISTER_ENGINEER', 'Engineer', `Created a new medical engineer profile: ${name}`);

  res.status(201).json(newEngineer);
}));

// Inspections
engineersRouter.get("/api/inspections", (req, res) => {
  const { buyer_id, seller_id, listing_id, engineer_id, status } = req.query;
  let filtered = [...collections.inspections];

  if (buyer_id) {
    filtered = filtered.filter(i => i.buyer_id === buyer_id);
  }
  if (seller_id) {
    filtered = filtered.filter(i => i.seller_id === seller_id);
  }
  if (listing_id) {
    filtered = filtered.filter(i => i.listing_id === listing_id);
  }
  if (engineer_id) {
    filtered = filtered.filter(i => i.assigned_engineer_id === engineer_id);
  }
  if (status) {
    filtered = filtered.filter(i => i.status === status);
  }

  res.json(filtered);
});

engineersRouter.get("/api/inspections/:id", (req, res) => {
  const item = collections.inspections.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Inspection request not found" });
  res.json(item);
});

engineersRouter.post("/api/inspections/request", (req, res) => {
  const {
    listing_id,
    buyer_id,
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

  if (!listing_id || !buyer_name || !buyer_phone) {
    return res.status(400).json({ error: "Missing required inspection parameters" });
  }

  const listing = collections.listings.find(l => l.id === listing_id);
  if (!listing) return res.status(404).json({ error: "Medical equipment listing not found" });

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

  let escrowDealId = undefined;

  if (link_escrow !== false) {
    let existingEscrow = collections.escrowDeals.find(d => d.listing_id === listing.id && d.buyer_id === (buyer_id || 'usr-5'));
    if (!existingEscrow) {
      existingEscrow = {
        id: `esc-${Date.now()}`,
        listing_id: listing.id,
        listing_title: listing.title,
        buyer_id: buyer_id || 'usr-5',
        buyer_name: buyer_name,
        buyer_email: buyer_email || 'buyer@hospital.ng',
        seller_id: listing.seller_id,
        seller_name: seller?.business_name || listing.seller_name || 'Medical Vendor',
        amount: listing.price,
        currency: listing.currency || 'NGN',
        escrow_fee: Math.round(listing.price * 0.02),
        status: 'initiated',
        assigned_engineer_id: engineer?.id,
        assigned_engineer_name: engineer ? `${engineer.name} (${engineer.specialty})` : 'Certified Biomedical Lead',
        payment_reference: `ESC-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      collections.escrowDeals.unshift(existingEscrow);
    }
    escrowDealId = existingEscrow.id;
  }

  const inspectionFee = listing.price > 5000000 ? 120000 : 65000;

  const newInspection = {
    id: `insp-${Date.now()}`,
    listing_id: listing.id,
    listing_title: listing.title,
    listing_condition: listing.condition,
    listing_price: listing.price,
    listing_currency: listing.currency || 'NGN',
    seller_id: listing.seller_id,
    seller_name: seller?.business_name || listing.seller_name || 'Vendor',
    buyer_id: buyer_id || 'usr-5',
    buyer_name,
    buyer_phone,
    buyer_email: buyer_email || 'purchaser@hospital.ng',
    hospital_name: hospital_name || buyer_name,
    assigned_engineer_id: engineer?.id || 'eng-1',
    assigned_engineer_name: engineer ? `${engineer.name} (${engineer.specialty})` : 'Engr. Emeka Okafor',
    assigned_engineer_phone: engineer?.phone || '+2348031112233',
    inspection_location: inspection_location || `${seller?.city || listing.city || 'Lagos'}, ${seller?.state || listing.state || 'Lagos'} Warehouse Site`,
    scheduled_date: scheduled_date || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    status: 'scheduled',
    notes: notes || `Pre-purchase engineering audit requested on ${listing.condition.replace('_', ' ').toUpperCase()} unit prior to final payment settlement.`,
    fee_amount: inspectionFee,
    escrow_linked: link_escrow !== false,
    escrow_deal_id: escrowDealId,
    checklist: defaultChecklist,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  collections.inspections.unshift(newInspection);

  logActivity(buyer_name, 'REQUEST_INSPECTION', 'BiomedicalAudit', `Requested pre-purchase engineering audit for "${listing.title}" with engineer ${newInspection.assigned_engineer_name}`);

  collections.notifications.unshift({
    id: `notif-${Date.now()}-insp-new`,
    user_id: seller?.user_id || 'usr-1',
    type: 'inspection_requested',
    title: 'Pre-Purchase Audit Scheduled',
    message: `${buyer_name} requested a Certified Biomedical Engineer audit for "${listing.title}". Scheduled engineer: ${newInspection.assigned_engineer_name}.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.status(201).json(newInspection);
});

engineersRouter.post("/api/inspections/:id/submit-report", (req, res) => {
  const { id } = req.params;
  const { checklist, verdict_notes, status } = req.body;

  const inspection = collections.inspections.find(i => i.id === id);
  if (!inspection) return res.status(404).json({ error: "Inspection request not found" });

  if (checklist && Array.isArray(checklist)) {
    inspection.checklist = checklist;
  }
  if (verdict_notes) {
    inspection.engineer_verdict_notes = verdict_notes;
  }

  const finalStatus = status || 'passed';
  inspection.status = finalStatus;
  inspection.completed_at = new Date().toISOString();
  inspection.updated_at = new Date().toISOString();

  if (finalStatus === 'passed') {
    inspection.certificate_no = `CERT-BIOMED-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  if (inspection.escrow_deal_id) {
    const deal = collections.escrowDeals.find(d => d.id === inspection.escrow_deal_id);
    if (deal) {
      deal.engineer_notes = `Biomedical Audit Result (${finalStatus.toUpperCase()}): ${verdict_notes || 'All calibration tests completed.'}`;
      deal.engineer_approved = finalStatus === 'passed';
      if (finalStatus === 'passed') {
        deal.status = 'inspected_approved';
      } else {
        deal.status = 'disputed';
      }
      deal.updated_at = new Date().toISOString();
    }
  }

  logActivity(inspection.assigned_engineer_name, 'COMPLETE_INSPECTION', 'BiomedicalAudit', `Submitted calibration report for ${inspection.listing_title}. Result: ${finalStatus.toUpperCase()}`);

  collections.notifications.unshift({
    id: `notif-${Date.now()}-insp-done`,
    user_id: inspection.buyer_id,
    type: 'inspection_completed',
    title: finalStatus === 'passed' ? 'Pre-Purchase Audit PASSED! Certified' : 'Pre-Purchase Audit DEFECTS REPORTED',
    message: finalStatus === 'passed' 
      ? `Calibration certificate ${inspection.certificate_no} issued for "${inspection.listing_title}". Payment escrow cleared for settlement.`
      : `Defects identified during pre-purchase inspection on "${inspection.listing_title}". Dispute raised in escrow custody.`,
    read: false,
    created_at: new Date().toISOString()
  });

  res.json(inspection);
});
