/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from "express";
import { logActivity } from "../lib/auditLogger";
import { requireAuth, criticalLimiter, sanitizeText } from "../server/middleware";

export const logisticsRouter = Router();

let logisticsQuotesCollection: any[] = [
  {
    id: 'log-101',
    quote_number: 'LOG-2026-9912',
    listing_id: 'list-2',
    listing_title: 'GE Voluson P8 3D/4D Ultrasound Machine',
    origin_state: 'Lagos',
    origin_city: 'Ikeja',
    destination_state: 'Enugu',
    destination_city: 'Enugu Urban',
    equipment_category: 'ultrasound_echocardiogram',
    equipment_value_ngn: 14500000,
    buyer_id: 'usr-5',
    buyer_name: 'Dr. Fatima Bello',
    hospital_name: 'Riverside Memorial Hospital',
    base_freight_ngn: 256500,
    specialized_packaging_ngn: 45000,
    distance_km: 570,
    estimated_transit_hours: 36,
    insurance_ngn: 108750,
    rigger_crane_ngn: 45000,
    escort_vehicle_ngn: 0,
    biomed_specialist_ngn: 65000,
    waybill_tolls_ngn: 18000,
    total_logistics_cost_ngn: 538250,
    transit_type: 'Air-Ride Suspension Freight Truck',
    recommended_vehicle: '5-Ton Air-Suspension Closed Box Truck with Shock Sensors',
    special_handling_notes: [
      'Padded shockproof flight case for 3D/4D Transducers',
      'Anti-vibration transit straps & shock tag indicator installed',
      'Biomedical Engineer onboard escort for sensor calibration verification upon delivery'
    ],
    status: 'saved',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 14).toISOString()
  }
];

function getInterStateDistanceKm(originState: string, destState: string): { km: number; hours: number } {
  const o = (originState || 'Lagos').toLowerCase().trim();
  const d = (destState || 'Lagos').toLowerCase().trim();

  if (o === d) return { km: 50, hours: 8 };

  const matrix: Record<string, Record<string, { km: number; hours: number }>> = {
    lagos: {
      abuja: { km: 750, hours: 48 },
      enugu: { km: 570, hours: 36 },
      rivers: { km: 610, hours: 40 },
      kano: { km: 1000, hours: 60 },
      oyo: { km: 130, hours: 12 },
      anambra: { km: 500, hours: 32 },
      edo: { km: 310, hours: 20 },
      cross_river: { km: 720, hours: 48 },
      delta: { km: 430, hours: 28 },
      kaduna: { km: 820, hours: 52 }
    },
    abuja: {
      lagos: { km: 750, hours: 48 },
      kano: { km: 360, hours: 24 },
      enugu: { km: 420, hours: 28 },
      rivers: { km: 680, hours: 44 },
      kaduna: { km: 210, hours: 14 },
      plateau: { km: 280, hours: 18 }
    }
  };

  if (matrix[o] && matrix[o][d]) return matrix[o][d];
  if (matrix[d] && matrix[d][o]) return matrix[d][o];

  return { km: 540, hours: 36 };
}

function calculateLogisticsBreakdown(params: {
  origin_state: string;
  destination_state: string;
  equipment_category: string;
  equipment_value_ngn: number;
  require_rigger_crane?: boolean;
  require_transit_insurance?: boolean;
  require_escort_vehicle?: boolean;
  require_biomed_specialist?: boolean;
}) {
  const { km, hours } = getInterStateDistanceKm(params.origin_state, params.destination_state);
  const val = Number(params.equipment_value_ngn) || 5000000;

  let baseRatePerKm = 400;
  let packagingFee = 35000;
  let transitType = 'Heavy Goods Closed Truck';
  let recommendedVehicle = '10-Ton Enclosed Hydraulic Tailgate Van';
  let specialHandlingNotes: string[] = [];

  switch (params.equipment_category) {
    case 'xray_ct_mri':
      baseRatePerKm = 850;
      packagingFee = 120000;
      transitType = 'Heavy Lead-Shielded Hydraulic Crane Hauler';
      recommendedVehicle = '15-Ton Heavy Hydraulic Tailgate Truck with Lead-Lined Dunnage';
      specialHandlingNotes = [
        'Lead-lined radiation shield dunnage & gantry lock-down clamps',
        'Hydraulic tail-lift or 25-ton mobile crane offloading at facility site',
        'Tube-head shock sensor tags attached prior to transit departure'
      ];
      break;

    case 'ultrasound_echocardiogram':
      baseRatePerKm = 450;
      packagingFee = 45000;
      transitType = 'Air-Ride Suspension Pneumatic Freight';
      recommendedVehicle = 'Air-Suspension Padded Box Van with Shock Sensors';
      specialHandlingNotes = [
        'High-density foam padded flight cases for transducers & probes',
        'Pneumatic air-ride suspension transit preventing crystal element displacement',
        'Shock tag monitoring'
      ];
      break;

    case 'icu_beds_tables':
      baseRatePerKm = 550;
      packagingFee = 60000;
      transitType = 'Cubic Volume Hydraulic Furniture Carrier';
      recommendedVehicle = '7.5-Ton Enclosed Furniture Hauler with Tailgate Lift';
      specialHandlingNotes = [
        'Heavy-duty corner guards, bubble wrap & industrial shrink-wrap',
        'Disassembly & assembly engineering crew at destination facility',
        'Actuator motor voltage & brake lock test upon offloading'
      ];
      break;

    case 'lab_analyzers_coldchain':
      baseRatePerKm = 650;
      packagingFee = 75000;
      transitType = 'Refrigerated & Temperature Monitored Carrier';
      recommendedVehicle = 'Temperature-Controlled Climate Box Van (2°C - 8°C)';
      specialHandlingNotes = [
        'Continuous temperature logger & dry ice / battery backup pack',
        'Optical sensor locking during transit',
        'Re-calibration test on arrival before handover sign-off'
      ];
      break;

    default:
      baseRatePerKm = 380;
      packagingFee = 25000;
      transitType = 'Secured Padded Cargo Freight';
      recommendedVehicle = 'Standard 3.5-Ton Padded Box Van';
      specialHandlingNotes = [
        'Impact-resistant wooden crate with custom foam inserts',
        'Waybill tracking & secure tamper-evident seals'
      ];
      break;
  }

  const baseFreightNgn = Math.round(km * baseRatePerKm);
  const insuranceNgn = params.require_transit_insurance !== false ? Math.round(val * 0.0075) : 0;
  const riggerCraneNgn = params.require_rigger_crane ? (params.equipment_category === 'xray_ct_mri' ? 120000 : 55000) : 0;
  const escortVehicleNgn = params.require_escort_vehicle ? 110000 : 0;
  const biomedSpecialistNgn = params.require_biomed_specialist ? 65000 : 0;
  const waybillTollsNgn = km > 200 ? 18000 : 8000;

  const totalNgn = baseFreightNgn + packagingFee + insuranceNgn + riggerCraneNgn + escortVehicleNgn + biomedSpecialistNgn + waybillTollsNgn;

  return {
    base_freight_ngn: baseFreightNgn,
    specialized_packaging_ngn: packagingFee,
    distance_km: km,
    estimated_transit_hours: hours,
    insurance_ngn: insuranceNgn,
    rigger_crane_ngn: riggerCraneNgn,
    escort_vehicle_ngn: escortVehicleNgn,
    biomed_specialist_ngn: biomedSpecialistNgn,
    waybill_tolls_ngn: waybillTollsNgn,
    total_logistics_cost_ngn: totalNgn,
    transit_type: transitType,
    recommended_vehicle: recommendedVehicle,
    special_handling_notes: specialHandlingNotes
  };
}

logisticsRouter.post("/api/logistics/estimate", criticalLimiter, (req, res) => {
  const {
    origin_state,
    destination_state,
    equipment_category,
    equipment_value_ngn,
    require_rigger_crane,
    require_transit_insurance,
    require_escort_vehicle,
    require_biomed_specialist
  } = req.body;

  if (!origin_state || !destination_state) {
    return res.status(400).json({ error: "Origin state and destination state are required." });
  }

  const breakdown = calculateLogisticsBreakdown({
    origin_state,
    destination_state,
    equipment_category: equipment_category || 'standard_clinical',
    equipment_value_ngn: Number(equipment_value_ngn) || 5000000,
    require_rigger_crane: Boolean(require_rigger_crane),
    require_transit_insurance: require_transit_insurance !== false,
    require_escort_vehicle: Boolean(require_escort_vehicle),
    require_biomed_specialist: Boolean(require_biomed_specialist)
  });

  res.json(breakdown);
});

logisticsRouter.post("/api/logistics/quote", requireAuth, criticalLimiter, (req: any, res) => {
  const {
    listing_id,
    listing_title,
    origin_state,
    origin_city,
    destination_state,
    destination_city,
    equipment_category,
    equipment_value_ngn,
    require_rigger_crane,
    require_transit_insurance,
    require_escort_vehicle,
    require_biomed_specialist,
    buyer_name,
    hospital_name
  } = req.body;

  const breakdown = calculateLogisticsBreakdown({
    origin_state: origin_state || 'Lagos',
    destination_state: destination_state || 'Abuja',
    equipment_category: equipment_category || 'standard_clinical',
    equipment_value_ngn: Number(equipment_value_ngn) || 5000000,
    require_rigger_crane: Boolean(require_rigger_crane),
    require_transit_insurance: require_transit_insurance !== false,
    require_escort_vehicle: Boolean(require_escort_vehicle),
    require_biomed_specialist: Boolean(require_biomed_specialist)
  });

  const quoteNumber = `LOG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newQuote = {
    id: `log-${Date.now()}`,
    quote_number: quoteNumber,
    listing_id,
    listing_title,
    origin_state: origin_state || 'Lagos',
    origin_city: origin_city || 'Main Hub',
    destination_state: destination_state || 'Abuja',
    destination_city: destination_city || 'Central District',
    equipment_category: equipment_category || 'standard_clinical',
    equipment_value_ngn: Number(equipment_value_ngn) || 5000000,
    buyer_id: req.user.id,
    buyer_name: sanitizeText(buyer_name) || req.user.businessName || 'Hospital Purchaser',
    hospital_name: sanitizeText(hospital_name) || req.user.businessName || 'Medical Facility',
    ...breakdown,
    status: 'saved',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 14).toISOString()
  };

  logisticsQuotesCollection.unshift(newQuote);

  logActivity(newQuote.buyer_name, 'CREATE_LOGISTICS_QUOTE', 'InterStateLogistics', `Calculated inter-state delivery estimate (${origin_state} -> ${destination_state}) for ₦${breakdown.total_logistics_cost_ngn.toLocaleString()}`);

  res.status(201).json(newQuote);
});

logisticsRouter.get("/api/logistics/quotes", requireAuth, (req: any, res) => {
  const quotes = req.user.role === 'admin'
    ? logisticsQuotesCollection
    : logisticsQuotesCollection.filter(quote => quote.buyer_id === req.user.id);
  res.json(quotes);
});
