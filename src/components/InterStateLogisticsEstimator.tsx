import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  X, 
  ChevronRight, 
  Zap, 
  Wrench, 
  Sparkles,
  Info,
  Copy,
  Check,
  Building,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NIGERIAN_STATES } from '../data';
import { Listing, EquipmentLogisticsCategory, LogisticsQuoteBreakdown, LogisticsQuote } from '../types';
import CustomSelect from './CustomSelect';

interface InterStateLogisticsEstimatorProps {
  initialListing?: Listing | null;
  initialOriginState?: string;
  initialDestinationState?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onAttachToCheckout?: (quote: LogisticsQuote) => void;
  currentUser?: any;
  embeddedMode?: boolean;
}

export const EQUIPMENT_CATEGORY_OPTIONS: {
  id: EquipmentLogisticsCategory;
  title: string;
  subtitle: string;
  icon: string;
  defaultWeight: string;
}[] = [
  {
    id: 'xray_ct_mri',
    title: 'Lead-Lined Imaging (X-Ray, CT, MRI)',
    subtitle: 'Radiation shielding, heavy gantry frame (>800kg), hydraulic crane handling',
    icon: '☢️',
    defaultWeight: '1,200 kg'
  },
  {
    id: 'ultrasound_echocardiogram',
    title: 'Ultrasound & Delicate Transducers',
    subtitle: 'Air-ride suspension, anti-vibration flight case, shock sensors',
    icon: '🩺',
    defaultWeight: '120 kg'
  },
  {
    id: 'icu_beds_tables',
    title: 'Heavy ICU Beds & Operating Tables',
    subtitle: 'High cubic volume, shrink wrapping, on-site assembly team',
    icon: '🏥',
    defaultWeight: '350 kg'
  },
  {
    id: 'lab_analyzers_coldchain',
    title: 'Cold-Chain & Lab Analyzers',
    subtitle: 'Refrigerated climate box (2°C - 8°C), optical sensor calibration lock',
    icon: '🧪',
    defaultWeight: '220 kg'
  },
  {
    id: 'standard_clinical',
    title: 'Standard Clinical Equipment',
    subtitle: 'Patient monitors, ECGs, infusion pumps in padded wooden crates',
    icon: '🛈',
    defaultWeight: '45 kg'
  }
];

export function InterStateLogisticsEstimator({
  initialListing,
  initialOriginState = 'Lagos',
  initialDestinationState = 'Enugu',
  isOpen = true,
  onClose,
  onAttachToCheckout,
  currentUser,
  embeddedMode = false
}: InterStateLogisticsEstimatorProps) {
  // Form State
  const [originState, setOriginState] = useState(initialListing?.state || initialOriginState);
  const [originCity, setOriginCity] = useState(initialListing?.city || 'Central Hub');
  const [destinationState, setDestinationState] = useState(initialDestinationState);
  const [destinationCity, setDestinationCity] = useState('Urban Centre');
  
  const [equipmentCategory, setEquipmentCategory] = useState<EquipmentLogisticsCategory>(
    initialListing?.category_id?.includes('x-ray') || initialListing?.title?.toLowerCase().includes('x-ray')
      ? 'xray_ct_mri'
      : initialListing?.title?.toLowerCase().includes('ultrasound')
      ? 'ultrasound_echocardiogram'
      : initialListing?.title?.toLowerCase().includes('bed') || initialListing?.title?.toLowerCase().includes('table')
      ? 'icu_beds_tables'
      : initialListing?.title?.toLowerCase().includes('analyzer')
      ? 'lab_analyzers_coldchain'
      : 'standard_clinical'
  );

  const [equipmentValue, setEquipmentValue] = useState<number>(
    initialListing?.price ? Number(initialListing.price) : 8500000
  );

  // Extras
  const [requireRigger, setRequireRigger] = useState(
    equipmentCategory === 'xray_ct_mri' || equipmentCategory === 'icu_beds_tables'
  );
  const [requireInsurance, setRequireInsurance] = useState(true);
  const [requireEscort, setRequireEscort] = useState(false);
  const [requireBiomed, setRequireBiomed] = useState(
    equipmentCategory === 'xray_ct_mri' || equipmentCategory === 'ultrasound_echocardiogram'
  );

  // Results State
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<LogisticsQuoteBreakdown | null>(null);
  const [generatedQuote, setGeneratedQuote] = useState<LogisticsQuote | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Local fallback calculation if fetch fails
  const computeLocalFallback = (): LogisticsQuoteBreakdown => {
    const isSameState = (originState || '').toLowerCase() === (destinationState || '').toLowerCase();
    const km = isSameState ? 50 : 570;
    const hours = isSameState ? 8 : 36;
    const val = Number(equipmentValue) || 5000000;
    const baseFreightNgn = km * 450;
    const packagingFee = 45000;
    const insuranceNgn = requireInsurance ? Math.round(val * 0.0075) : 0;
    const riggerCraneNgn = requireRigger ? 55000 : 0;
    const escortVehicleNgn = requireEscort ? 110000 : 0;
    const biomedSpecialistNgn = requireBiomed ? 65000 : 0;
    const waybillTollsNgn = 18000;
    const total = baseFreightNgn + packagingFee + insuranceNgn + riggerCraneNgn + escortVehicleNgn + biomedSpecialistNgn + waybillTollsNgn;

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
      total_logistics_cost_ngn: total,
      transit_type: 'Air-Ride Suspension Pneumatic Freight',
      recommended_vehicle: 'Air-Suspension Padded Box Van with Shock Sensors',
      special_handling_notes: [
        'Anti-vibration transit straps & shock tag indicator installed',
        'Biomedical Engineer onboard escort for sensor calibration verification upon delivery'
      ]
    };
  };

  // Calculate breakdown on changes
  const fetchEstimate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logistics/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_state: originState,
          destination_state: destinationState,
          equipment_category: equipmentCategory,
          equipment_value_ngn: equipmentValue,
          require_rigger_crane: requireRigger,
          require_transit_insurance: requireInsurance,
          require_escort_vehicle: requireEscort,
          require_biomed_specialist: requireBiomed
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBreakdown(data);
      } else {
        setBreakdown(computeLocalFallback());
      }
    } catch (err) {
      console.error('Failed to calculate logistics estimate:', err);
      setBreakdown(computeLocalFallback());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimate();
  }, [
    originState,
    destinationState,
    equipmentCategory,
    equipmentValue,
    requireRigger,
    requireInsurance,
    requireEscort,
    requireBiomed
  ]);

  // Generate formal quote
  const handleGenerateQuote = async () => {
    try {
      const res = await fetch('/api/logistics/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: initialListing?.id,
          listing_title: initialListing?.title || 'Custom Medical Equipment',
          origin_state: originState,
          origin_city: originCity,
          destination_state: destinationState,
          destination_city: destinationCity,
          equipment_category: equipmentCategory,
          equipment_value_ngn: equipmentValue,
          require_rigger_crane: requireRigger,
          require_transit_insurance: requireInsurance,
          require_escort_vehicle: requireEscort,
          require_biomed_specialist: requireBiomed,
          buyer_id: currentUser?.id || 'usr-guest',
          buyer_name: currentUser?.businessName || currentUser?.email || 'Hospital Procurement',
          hospital_name: currentUser?.businessName || 'Medical Facility'
        })
      });

      if (res.ok) {
        const quote = await res.json();
        setGeneratedQuote(quote);
        setSavedSuccess(true);
        if (onAttachToCheckout) {
          onAttachToCheckout(quote);
        }
      }
    } catch (err) {
      console.error('Failed to generate logistics quote:', err);
    }
  };

  const handleCopyQuoteText = () => {
    if (!breakdown) return;
    const text = `📦 INTER-STATE MEDICAL LOGISTICS QUOTE
Equipment: ${initialListing?.title || 'Heavy Medical Device'}
Route: ${originState} (${originCity}) ➡️ ${destinationState} (${destinationCity})
Est. Distance: ${breakdown.distance_km} km | Est. Transit: ${breakdown.estimated_transit_hours} Hours
----------------------------------------
• Base Freight Rate: ₦${breakdown.base_freight_ngn.toLocaleString()}
• Protective Packaging: ₦${breakdown.specialized_packaging_ngn.toLocaleString()}
• Transit Insurance (0.75%): ₦${breakdown.insurance_ngn.toLocaleString()}
• Rigger/Crane Offload: ₦${breakdown.rigger_crane_ngn.toLocaleString()}
• Onboard Biomed Engineer: ₦${breakdown.biomed_specialist_ngn.toLocaleString()}
• Tolls & Interstate Waybill: ₦${breakdown.waybill_tolls_ngn.toLocaleString()}
========================================
TOTAL ESTIMATED DELIVERY: ₦${breakdown.total_logistics_cost_ngn.toLocaleString()}
Recommended Vehicle: ${breakdown.recommended_vehicle}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!isOpen && !embeddedMode) return null;

  const content = (
    <div className="space-y-6">
      {/* HEADER HERO */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Truck className="h-3 w-3 text-indigo-400" />
                Inter-State Freight Protocol
              </span>
              {initialListing && (
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold truncate max-w-[200px]">
                  {initialListing.title}
                </span>
              )}
            </div>

            <h2 className="text-xl font-black text-white tracking-tight">
              Inter-State Heavy Medical Equipment Delivery Estimator
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Calculates specialized transit costs for lead-lined radiation gantries, heavy ICU beds, delicate ultrasound transducers, and temperature-controlled laboratory analyzers across Nigeria.
            </p>
          </div>

          {!embeddedMode && onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-colors cursor-pointer self-start md:self-auto"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* FORM & CALCULATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: PARAMETERS (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Origin & Destination Route */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b pb-2">
              <Navigation className="h-4 w-4 text-indigo-600" />
              <span>1. Inter-State Route Selection</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Origin State */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Origin State (Pickup)</span>
                  <span className="text-indigo-600 font-mono text-[10px]">Seller Location</span>
                </label>
                <CustomSelect
                  options={NIGERIAN_STATES.map(s => ({ value: s, label: s }))}
                  value={originState}
                  onChange={(val) => setOriginState(val)}
                  placeholder="Select Origin State"
                />
              </div>

              {/* Destination State */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Destination State (Delivery)</span>
                  <span className="text-emerald-600 font-mono text-[10px]">Hospital Location</span>
                </label>
                <CustomSelect
                  options={NIGERIAN_STATES.map(s => ({ value: s, label: s }))}
                  value={destinationState}
                  onChange={(val) => setDestinationState(val)}
                  placeholder="Select Destination State"
                />
              </div>
            </div>

            {/* Quick Distance Pill */}
            {breakdown && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs text-slate-700 font-mono">
                <span className="flex items-center gap-1.5 font-bold">
                  <MapPin className="h-4 w-4 text-rose-500" />
                  <span>{originState} ➔ {destinationState}</span>
                </span>
                <span className="text-indigo-700 font-black">
                  {breakdown.distance_km} km • ~{breakdown.estimated_transit_hours} Hours Transit
                </span>
              </div>
            )}
          </div>

          {/* 2. Equipment Classification */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b pb-2">
              <Wrench className="h-4 w-4 text-cyan-600" />
              <span>2. Equipment Handling Classification</span>
            </h3>

            <div className="space-y-2">
              {EQUIPMENT_CATEGORY_OPTIONS.map((cat) => {
                const isSelected = equipmentCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setEquipmentCategory(cat.id);
                      if (cat.id === 'xray_ct_mri') {
                        setRequireRigger(true);
                        setRequireBiomed(true);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="text-xl p-2 bg-slate-100 rounded-xl shrink-0">{cat.icon}</span>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">{cat.title}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          isSelected ? 'bg-indigo-900 text-indigo-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {cat.defaultWeight}
                        </span>
                      </div>
                      <p className={`text-[11px] leading-snug ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {cat.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Equipment Value NGN Input */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Equipment Valuation (NGN) <span className="text-slate-400 font-normal">(Used for 0.75% Transit Insurance calculation)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-xs">₦</span>
                <input
                  type="number"
                  value={equipmentValue}
                  onChange={(e) => setEquipmentValue(Number(e.target.value))}
                  placeholder="e.g., 12000000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* 3. Specialized Add-on Services */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b pb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>3. Specialized Handling & Insurance Options</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Transit Insurance */}
              <label className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                requireInsurance ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={requireInsurance}
                  onChange={(e) => setRequireInsurance(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 accent-emerald-600"
                />
                <div className="text-xs">
                  <span className="font-extrabold block">Transit Risk Insurance</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Full indemnity (0.75% of value = ₦{Math.round(equipmentValue * 0.0075).toLocaleString()})
                  </span>
                </div>
              </label>

              {/* Rigger Crane */}
              <label className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                requireRigger ? 'bg-indigo-50/60 border-indigo-300 text-indigo-950' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={requireRigger}
                  onChange={(e) => setRequireRigger(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 accent-indigo-600"
                />
                <div className="text-xs">
                  <span className="font-extrabold block">Rigger & Mobile Crane</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    On-site heavy offloading crew at hospital
                  </span>
                </div>
              </label>

              {/* Onboard Biomed Engineer */}
              <label className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                requireBiomed ? 'bg-cyan-50/60 border-cyan-300 text-cyan-950' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={requireBiomed}
                  onChange={(e) => setRequireBiomed(e.target.checked)}
                  className="mt-0.5 rounded text-cyan-600 accent-cyan-600"
                />
                <div className="text-xs">
                  <span className="font-extrabold block">Onboard Biomed Specialist</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Engineer escort verifying shock/tilt tags
                  </span>
                </div>
              </label>

              {/* Highway Escort */}
              <label className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                requireEscort ? 'bg-amber-50/60 border-amber-300 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={requireEscort}
                  onChange={(e) => setRequireEscort(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 accent-amber-600"
                />
                <div className="text-xs">
                  <span className="font-extrabold block">Highway Patrol Escort</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Escort vehicle for multi-ton heavy convoys
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME COST BREAKDOWN & SUMMARY (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-cyan-400" />
                Live Freight Quote Breakdown
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono">
                Nigeria Inter-State
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-3">
                <div className="animate-spin inline-block h-8 w-8 border-4 border-indigo-400 border-t-transparent rounded-full" />
                <p className="text-xs text-slate-400 font-mono">Re-calculating distance & freight tariffs...</p>
              </div>
            ) : breakdown ? (
              <div className="space-y-5">
                {/* BIG TOTAL */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest block">
                    Total Estimated Delivery & Handling
                  </span>
                  <div className="text-3xl font-black text-emerald-400 tracking-tight font-mono">
                    ₦{breakdown.total_logistics_cost_ngn.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-300 pt-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Est. Transit: <strong>{breakdown.estimated_transit_hours} Hours</strong></span>
                    <span>•</span>
                    <span>{breakdown.distance_km} km</span>
                  </div>
                </div>

                {/* ITEMIZATION LIST */}
                <div className="space-y-2 text-xs divide-y divide-slate-800/80">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-400">Base Freight ({breakdown.distance_km} km):</span>
                    <strong className="font-mono text-slate-200">₦{breakdown.base_freight_ngn.toLocaleString()}</strong>
                  </div>

                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-400">Specialized Protective Packaging:</span>
                    <strong className="font-mono text-slate-200">₦{breakdown.specialized_packaging_ngn.toLocaleString()}</strong>
                  </div>

                  {breakdown.insurance_ngn > 0 && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400">Transit Risk Insurance (0.75%):</span>
                      <strong className="font-mono text-emerald-400">₦{breakdown.insurance_ngn.toLocaleString()}</strong>
                    </div>
                  )}

                  {breakdown.rigger_crane_ngn > 0 && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400">Rigger & Mobile Crane Offload:</span>
                      <strong className="font-mono text-indigo-300">₦{breakdown.rigger_crane_ngn.toLocaleString()}</strong>
                    </div>
                  )}

                  {breakdown.biomed_specialist_ngn > 0 && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400">Onboard Biomed Specialist:</span>
                      <strong className="font-mono text-cyan-300">₦{breakdown.biomed_specialist_ngn.toLocaleString()}</strong>
                    </div>
                  )}

                  {breakdown.escort_vehicle_ngn > 0 && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-400">Highway Patrol Escort:</span>
                      <strong className="font-mono text-amber-300">₦{breakdown.escort_vehicle_ngn.toLocaleString()}</strong>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-400">Interstate Waybill & Tolls:</span>
                    <strong className="font-mono text-slate-200">₦{breakdown.waybill_tolls_ngn.toLocaleString()}</strong>
                  </div>
                </div>

                {/* RECOMMENDED VEHICLE & PROTOCOL */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-2 text-xs">
                  <span className="text-[10px] text-cyan-300 font-mono uppercase font-bold block">
                    Recommended Transit Vehicle:
                  </span>
                  <div className="font-extrabold text-white flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>{breakdown.recommended_vehicle}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Special Handling Rules:</span>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {breakdown.special_handling_notes.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleGenerateQuote}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 px-4 font-black text-xs transition-all cursor-pointer shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Generate Official Freight Quote & Attach</span>
                  </button>

                  <button
                    onClick={handleCopyQuoteText}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl py-2.5 px-4 font-bold text-xs transition-all cursor-pointer border border-slate-700 flex items-center justify-center gap-2"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'Copied Freight Quote to Clipboard!' : 'Copy Quote Text for Inquiry'}</span>
                  </button>

                  {savedSuccess && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-center text-xs font-mono animate-fade-in">
                      ✓ Formal logistics quote attached to session!
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  if (embeddedMode) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-100 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200"
      >
        {content}
      </motion.div>
    </div>
  );
}
