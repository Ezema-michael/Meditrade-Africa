/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { collections, saveToFirestore, financingPartnersCollection } from "../server/state";
import { requireAuth } from "../server/middleware";
import { ApplyFinancingSchema, validateBody, asyncHandler } from "../lib/validation";
import { logActivity } from "../lib/auditLogger";
import { FinancingStatus } from "../types";

export const financingRouter = Router();

// GET Financing Partners
financingRouter.get("/api/financing/partners", (req, res) => {
  res.json(financingPartnersCollection);
});

// GET Financing Applications
financingRouter.get("/api/financing/applications", (req, res) => {
  const { buyer_id, status } = req.query;
  let apps = [...collections.financingApplications];
  if (buyer_id) {
    apps = apps.filter(a => a.buyer_id === buyer_id);
  }
  if (status) {
    apps = apps.filter(a => a.status === status);
  }
  res.json(apps);
});

// SUBMIT Lease Financing Application
financingRouter.post("/api/financing/apply", requireAuth, validateBody(ApplyFinancingSchema), asyncHandler(async (req: any, res: any) => {
  const {
    buyer_id,
    hospital_name,
    contact_email,
    contact_phone,
    equipment_id,
    down_payment,
    tenure_months,
    partner_bank_id,
    cac_registration,
    medical_license,
    monthly_patient_volume
  } = req.body;

  const equipment = collections.listings.find(l => l.id === equipment_id);
  const partner = financingPartnersCollection.find(p => p.id === partner_bank_id);

  if (!equipment) return res.status(404).json({ error: "Equipment listing not found" });

  const price = equipment.price;
  const downPaymentVal = Number(down_payment) || Math.round(price * 0.15);
  const financedVal = price - downPaymentVal;
  const tenure = Number(tenure_months) || 24;
  const annualRate = partner?.interest_rate_annual || 17.0;
  
  const monthlyRate = (annualRate / 100) / 12;
  const monthlyRepaymentVal = Math.round(
    (financedVal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1)
  );

  const newApp = {
    id: `app-${Date.now()}`,
    buyer_id: buyer_id || req.user.id,
    hospital_name,
    contact_email: contact_email || req.user.email || 'purchasing@hospital.ng',
    contact_phone: contact_phone || '+2348000000000',
    equipment_id: equipment.id,
    equipment_title: equipment.title,
    equipment_price: price,
    down_payment: downPaymentVal,
    financed_amount: financedVal,
    tenure_months: tenure,
    monthly_repayment: monthlyRepaymentVal,
    partner_bank_id: partner?.id || 'fin-partner-1',
    partner_bank_name: partner?.name || 'Commercial Bank Partner',
    cac_registration: cac_registration || 'RC-PENDING',
    medical_license: medical_license || 'MDCN-PENDING',
    monthly_patient_volume: Number(monthly_patient_volume) || 300,
    status: 'submitted' as FinancingStatus,
    approval_notes: 'Underwriting desk created application dossier for bank risk review.',
    created_at: new Date().toISOString()
  };

  collections.financingApplications.unshift(newApp);
  await saveToFirestore('financing_applications', newApp.id, newApp);
  logActivity(hospital_name, 'APPLY_FINANCING', 'LeaseFinancing', `Submitted lease application for "${equipment.title}" with ${partner?.name}`);

  const notif = {
    id: `notif-${Date.now()}-fin-app`,
    user_id: buyer_id || req.user.id,
    type: 'financing_submitted',
    title: 'Lease Application Submitted',
    message: `Your equipment financing request for "${equipment.title}" was received by ${partner?.name}. Pre-qualification in progress.`,
    read: false,
    created_at: new Date().toISOString()
  };
  collections.notifications.unshift(notif);
  await saveToFirestore('notifications', notif.id, notif);

  res.status(201).json(newApp);
}));
