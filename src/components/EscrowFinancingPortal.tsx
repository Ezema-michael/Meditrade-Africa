/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, DollarSign, Building2, Calculator, CheckCircle2, 
  Clock, AlertTriangle, FileText, ArrowRight, Lock, Sparkles, 
  UserCheck, RefreshCw, Layers, Check, ExternalLink, ChevronRight,
  TrendingUp, Award, HelpCircle, PhoneCall, Truck, ShieldAlert,
  CreditCard, Landmark, BadgePercent, CheckCircle, Info
} from 'lucide-react';

import { EscrowDeal, LeaseFinancingApplication, FinancingPartner, Listing } from '../types';
import { InterStateLogisticsEstimator } from './InterStateLogisticsEstimator';
import { VendorStorefrontModal } from './VendorStorefrontModal';

interface EscrowFinancingPortalProps {
  currentUser: any;
  onRefresh?: () => void;
}

export default function EscrowFinancingPortal({ currentUser, onRefresh }: EscrowFinancingPortalProps) {
  const [activeTab, setActiveTab] = useState<'escrow' | 'financing' | 'underwriting' | 'logistics'>('escrow');
  const [selectedVendorForStorefront, setSelectedVendorForStorefront] = useState<{ id: string; name?: string } | null>(null);


  // Escrow State
  const [escrowDeals, setEscrowDeals] = useState<EscrowDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [showCreateEscrowModal, setShowCreateEscrowModal] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState('');
  const [escrowAmountInput, setEscrowAmountInput] = useState<number>(0);
  const [isSubmittingEscrow, setIsSubmittingEscrow] = useState(false);

  // Financing State
  const [partners, setPartners] = useState<FinancingPartner[]>([]);
  const [applications, setApplications] = useState<LeaseFinancingApplication[]>([]);
  const [loadingFinancing, setLoadingFinancing] = useState(false);

  // Lease Calculator & Apply Form State
  const [calcEquipmentId, setCalcEquipmentId] = useState('');
  const [calcEquipmentPrice, setCalcEquipmentPrice] = useState<number>(14500000);
  const [calcDownPaymentPct, setCalcDownPaymentPct] = useState<number>(15);
  const [calcTenureMonths, setCalcTenureMonths] = useState<number>(24);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('fin-partner-2');

  // Hospital Info for Application
  const [appHospitalName, setAppHospitalName] = useState(currentUser?.businessName || 'Riverside Memorial Hospital');
  const [appContactEmail, setAppContactEmail] = useState(currentUser?.email || 'buyer@riversidememorial.org');
  const [appContactPhone, setAppContactPhone] = useState(currentUser?.phone || '+2348055554444');
  const [appCacReg, setAppCacReg] = useState('RC-998231');
  const [appMedicalLicense, setAppMedicalLicense] = useState('MDCN-HOSP-2024-88');
  const [appPatientVolume, setAppPatientVolume] = useState<number>(450);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // Action Modals & Notes
  const [dispatchTrackingNo, setDispatchTrackingNo] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [engineerInspectionNotes, setEngineerInspectionNotes] = useState('');

  // Fetch Escrow & Financing Data
  const fetchData = async () => {
    setLoadingDeals(true);
    setLoadingFinancing(true);
    try {
      // 1. Fetch Escrow Deals
      const escRes = await fetch('/api/escrow/deals');
      if (escRes.ok) {
        const eData = await escRes.json();
        setEscrowDeals(eData);
      }

      // 2. Fetch Financing Partners
      const pRes = await fetch('/api/financing/partners');
      if (pRes.ok) {
        const pData = await pRes.json();
        setPartners(pData);
        if (pData.length > 0 && !selectedPartnerId) {
          setSelectedPartnerId(pData[0].id);
        }
      }

      // 3. Fetch Financing Applications
      const appRes = await fetch('/api/financing/applications');
      if (appRes.ok) {
        const aData = await appRes.json();
        setApplications(aData);
      }

      // 4. Fetch Marketplace Listings for Dropdowns
      const lRes = await fetch('/api/listings');
      if (lRes.ok) {
        const lData = await lRes.json();
        setListings(lData);
        if (lData.length > 0 && !calcEquipmentId) {
          setCalcEquipmentId(lData[0].id);
          setCalcEquipmentPrice(lData[0].price);
        }
      }
    } catch (err) {
      console.error('Error fetching Escrow & Financing portal data:', err);
    } finally {
      setLoadingDeals(false);
      setLoadingFinancing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync Equipment Price when item changes in calculator
  const handleEquipmentSelect = (id: string) => {
    setCalcEquipmentId(id);
    const found = listings.find(l => l.id === id);
    if (found) {
      setCalcEquipmentPrice(found.price);
    }
  };

  // Repayment Schedule Calculation
  const partnerObj = partners.find(p => p.id === selectedPartnerId) || partners[0];
  const annualInterestRate = partnerObj?.interest_rate_annual || 16.5;
  const downPaymentAmount = Math.round((calcEquipmentPrice * calcDownPaymentPct) / 100);
  const financedAmount = calcEquipmentPrice - downPaymentAmount;
  const monthlyRate = (annualInterestRate / 100) / 12;
  const monthlyPayment = Math.round(
    (financedAmount * monthlyRate * Math.pow(1 + monthlyRate, calcTenureMonths)) / 
    (Math.pow(1 + monthlyRate, calcTenureMonths) - 1)
  );
  const totalRepayment = monthlyPayment * calcTenureMonths;
  const totalInterestPaid = totalRepayment - financedAmount;

  // Escrow Action Handlers
  const handleDepositFunds = async (dealId: string) => {
    try {
      const res = await fetch(`/api/escrow/${dealId}/deposit`, { method: 'PATCH' });
      if (res.ok) {
        alert('Payment locked into Escrow Custody Account! Vendor notified to dispatch.');
        fetchData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDispatchEquipment = async (dealId: string) => {
    const tracking = prompt('Enter delivery waybill or logistics tracking number:', dispatchTrackingNo || 'GIG-MED-8891');
    if (tracking === null) return;
    try {
      const res = await fetch(`/api/escrow/${dealId}/dispatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_no: tracking })
      });
      if (res.ok) {
        alert('Dispatch confirmed! Equipment is in transit to hospital site.');
        fetchData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEngineerSignoff = async (dealId: string, approved: boolean) => {
    const notes = prompt('Enter biomedical engineer inspection findings & calibration notes:', engineerInspectionNotes || 'All diagnostic sensors tested and output certified.');
    if (notes === null) return;
    try {
      const res = await fetch(`/api/escrow/${dealId}/engineer-signoff`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engineer_notes: notes, approved })
      });
      if (res.ok) {
        alert(`Biomedical inspection log saved. Status set to: ${approved ? 'INSPECTED & APPROVED' : 'DISPUTED'}`);
        fetchData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReleaseFunds = async (dealId: string) => {
    if (!confirm('Are you sure you want to release the Escrow funds to the vendor? This action completes the transaction.')) return;
    try {
      const res = await fetch(`/api/escrow/${dealId}/release-funds`, { method: 'PATCH' });
      if (res.ok) {
        alert('Funds successfully disbursed to vendor account!');
        fetchData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRaiseDispute = async (dealId: string) => {
    const reason = prompt('Please describe the issue or missing components:');
    if (!reason) return;
    try {
      const res = await fetch(`/api/escrow/${dealId}/raise-dispute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        alert('Dispute flagged. MediTrade clinical moderators will review the inspection logs.');
        fetchData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Escrow Deal Creation
  const handleCreateEscrowDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListingId || escrowAmountInput <= 0) return;

    setIsSubmittingEscrow(true);
    try {
      const res = await fetch('/api/escrow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: selectedListingId,
          buyer_id: currentUser?.id || 'usr-5',
          buyer_name: currentUser?.businessName || currentUser?.email || 'Hospital Purchaser',
          buyer_email: currentUser?.email || 'purchasing@hospital.ng',
          amount: escrowAmountInput
        })
      });
      if (res.ok) {
        alert('Escrow Agreement successfully initiated! Proceed to deposit funds into escrow custody.');
        setShowCreateEscrowModal(false);
        fetchData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingEscrow(false);
    }
  };

  // Submit Lease Application
  const handleApplyForLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcEquipmentId || !selectedPartnerId) return;

    setIsSubmittingApp(true);
    try {
      const res = await fetch('/api/financing/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: currentUser?.id || 'usr-5',
          hospital_name: appHospitalName,
          contact_email: appContactEmail,
          contact_phone: appContactPhone,
          equipment_id: calcEquipmentId,
          down_payment: downPaymentAmount,
          tenure_months: calcTenureMonths,
          partner_bank_id: selectedPartnerId,
          cac_registration: appCacReg,
          medical_license: appMedicalLicense,
          monthly_patient_volume: appPatientVolume
        })
      });

      if (res.ok) {
        alert('Equipment Lease Financing Application submitted successfully! Underwriting review initiated.');
        setActiveTab('financing');
        fetchData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Update Application Status (Underwriting Desk)
  const handleUpdateAppStatus = async (appId: string, status: string) => {
    const notes = prompt(`Enter status note for ${status.toUpperCase()}:`, 'Verified hospital patient volume and bank statements.');
    if (notes === null) return;
    try {
      const res = await fetch(`/api/financing/applications/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approval_notes: notes })
      });
      if (res.ok) {
        alert(`Application status updated to ${status.toUpperCase()}`);
        fetchData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalEscrowVolume = escrowDeals.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. HERO BANNER & PLATFORM OVERVIEW */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-10 text-white shadow-xl border border-indigo-900/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> MediTrade Financial Operations
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Biomedical Inspection Sign-off Required
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white leading-tight">
            Escrow Protection & Equipment Lease Financing Portal
          </h2>

          <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-3xl">
            Acquire high-value ICU monitors, ultrasound systems, CT scanners, and diagnostic imaging gear without risking capital upfront. Funds are held securely in Escrow Custody until certified by a field biomedical engineer, or financed over 12–36 months via partner commercial banks.
          </p>

          {/* Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Protected Escrow Vault</span>
              <span className="text-lg md:text-xl font-black text-emerald-400">₦{totalEscrowVolume.toLocaleString()}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Financing Partners</span>
              <span className="text-lg md:text-xl font-black text-indigo-300">{partners.length || 4} Commercial Banks</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Lease Tenure</span>
              <span className="text-lg md:text-xl font-black text-white">12 – 36 Months</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Engineer Inspection</span>
              <span className="text-lg md:text-xl font-black text-amber-400">100% Mandatory</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PORTAL TABS */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('escrow')}
          className={`px-5 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'escrow'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Escrow Protection Vault</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
            {escrowDeals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('financing')}
          className={`px-5 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'financing'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="h-4 w-4" />
          <span>Equipment Lease Calculator & Apply</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
            Live Rates
          </span>
        </button>

        <button
          onClick={() => setActiveTab('underwriting')}
          className={`px-5 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'underwriting'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Bank & Admin Approval Desk</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
            {applications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logistics')}
          className={`px-5 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'logistics'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="h-4 w-4 text-indigo-600" />
          <span>Inter-State Delivery Estimator</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
            Real-time
          </span>
        </button>
      </div>


      {/* ======================================================== */}
      {/* TAB 1: ESCROW PROTECTION VAULT & DEALS */}
      {/* ======================================================== */}
      {activeTab === 'escrow' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600" /> Active Escrow Transactions & Milestone Tracker
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Funds remain locked in neutral custodian account until biomedical engineer validates equipment physical condition and calibration.
              </p>
            </div>

            <button
              onClick={() => setShowCreateEscrowModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-indigo-600/10 shrink-0"
            >
              <ShieldCheck className="h-4 w-4" /> Start New Escrow Agreement
            </button>
          </div>

          {/* ESCROW WORKFLOW STEPS GRAPHIC */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 md:p-6 grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-black text-indigo-600 block">Step 1</span>
              <h4 className="text-xs font-extrabold text-slate-800">Agreement Created</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Buyer & Vendor agree on price & engineer inspection.</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-black text-emerald-600 block">Step 2</span>
              <h4 className="text-xs font-extrabold text-slate-800">Deposit in Vault</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Buyer deposits funds into Escrow neutral bank account.</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-black text-blue-600 block">Step 3</span>
              <h4 className="text-xs font-extrabold text-slate-800">Equipment Dispatched</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Vendor ships gear with waybill & tracking log.</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-black text-amber-600 block">Step 4</span>
              <h4 className="text-xs font-extrabold text-slate-800">Biomedical Signoff</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Field engineer tests physical sensors & calibration.</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-black text-purple-600 block">Step 5</span>
              <h4 className="text-xs font-extrabold text-slate-800">Funds Disbursed</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Escrow releases payment to vendor upon approval.</p>
            </div>
          </div>

          {/* ESCROW DEALS LIST */}
          <div className="space-y-4">
            {escrowDeals.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center bg-white">
                <ShieldCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-semibold">No active escrow agreements found.</p>
                <button
                  onClick={() => setShowCreateEscrowModal(true)}
                  className="mt-3 text-xs text-indigo-600 font-extrabold hover:underline"
                >
                  Click here to initiate an escrow purchase
                </button>
              </div>
            ) : (
              escrowDeals.map((deal) => {
                // Status mapping
                const isInitiated = deal.status === 'initiated';
                const isDeposited = deal.status === 'funds_deposited';
                const isDispatched = deal.status === 'equipment_dispatched';
                const isApproved = deal.status === 'inspected_approved';
                const isReleased = deal.status === 'funds_released';
                const isDisputed = deal.status === 'disputed';

                return (
                  <div key={deal.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-indigo-200 transition-all">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                            REF: {deal.payment_reference}
                          </span>
                          
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isReleased ? 'bg-purple-100 text-purple-800' :
                            isApproved ? 'bg-emerald-100 text-emerald-800' :
                            isDispatched ? 'bg-blue-100 text-blue-800' :
                            isDeposited ? 'bg-amber-100 text-amber-800' :
                            isDisputed ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {deal.status.replace('_', ' ')}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-slate-900 text-base mt-1">{deal.listing_title}</h4>
                        
                        <div className="text-xs text-slate-500 space-x-3 font-mono mt-0.5 flex flex-wrap">
                          <span>Buyer: <strong className="text-slate-800">{deal.buyer_name}</strong></span>
                          <span>•</span>
                          <span>
                            Vendor: {' '}
                            <button
                              type="button"
                              onClick={() => setSelectedVendorForStorefront({ id: deal.seller_id, name: deal.seller_name })}
                              className="text-slate-800 hover:text-indigo-600 font-bold hover:underline cursor-pointer transition-colors"
                              title={`View Storefront for ${deal.seller_name}`}
                            >
                              {deal.seller_name}
                            </button>
                          </span>
                        </div>
                      </div>

                      {/* Financial breakdown */}
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Escrow Amount</span>
                        <span className="text-xl font-black text-indigo-700">₦{deal.amount.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Escrow Fee (2%): ₦{deal.escrow_fee.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Progress Stepper Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-extrabold text-slate-700">
                        <span className={isInitiated || isDeposited || isDispatched || isApproved || isReleased ? 'text-indigo-600' : ''}>1. Initiated</span>
                        <span className={isDeposited || isDispatched || isApproved || isReleased ? 'text-indigo-600' : ''}>2. Deposited</span>
                        <span className={isDispatched || isApproved || isReleased ? 'text-indigo-600' : ''}>3. Dispatched</span>
                        <span className={isApproved || isReleased ? 'text-indigo-600' : ''}>4. Inspected</span>
                        <span className={isReleased ? 'text-indigo-600' : ''}>5. Disbursed</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        <div className={`h-full transition-all duration-500 ${
                          isReleased ? 'w-full bg-purple-600' :
                          isApproved ? 'w-4/5 bg-emerald-600' :
                          isDispatched ? 'w-3/5 bg-blue-600' :
                          isDeposited ? 'w-2/5 bg-amber-500' :
                          isDisputed ? 'w-full bg-rose-600' : 'w-1/5 bg-indigo-600'
                        }`} />
                      </div>
                    </div>

                    {/* Details Info Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block mb-1">Assigned Biomedical Engineer:</span>
                        <span className="text-slate-900 font-semibold flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                          {deal.assigned_engineer_name || 'Engr. Emeka Okafor (Biomedical Lead)'}
                        </span>
                        {deal.engineer_notes && (
                          <p className="text-[11px] text-slate-600 font-mono mt-1 bg-white p-2 rounded-lg border border-slate-200">
                            <strong>Findings:</strong> {deal.engineer_notes}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block mb-1">Logistics & Tracking:</span>
                        <span className="text-slate-900 font-mono">
                          Waybill / Courier #: <strong>{deal.delivery_tracking_no || 'Awaiting vendor dispatch'}</strong>
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Created: {new Date(deal.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Action Controls */}
                    <div className="flex items-center gap-2 flex-wrap pt-2 justify-end border-t border-slate-100">
                      {isInitiated && (
                        <button
                          onClick={() => handleDepositFunds(deal.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Lock className="h-3.5 w-3.5" /> Deposit Funds to Escrow Vault
                        </button>
                      )}

                      {isDeposited && (
                        <button
                          onClick={() => handleDispatchEquipment(deal.id)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Truck className="h-3.5 w-3.5" /> Confirm Equipment Dispatched
                        </button>
                      )}

                      {(isDispatched || isDeposited) && (
                        <button
                          onClick={() => handleEngineerSignoff(deal.id, true)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Biomedical Inspection Sign-off
                        </button>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => handleReleaseFunds(deal.id)}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-md shadow-purple-600/10"
                        >
                          <DollarSign className="h-3.5 w-3.5" /> Release Escrow Funds to Vendor
                        </button>
                      )}

                      {!isReleased && !isDisputed && (
                        <button
                          onClick={() => handleRaiseDispute(deal.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" /> Raise Dispute
                        </button>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: EQUIPMENT LEASE FINANCING CALCULATOR & APPLY */}
      {/* ======================================================== */}
      {activeTab === 'financing' && (
        <div className="space-y-8">
          
          {/* CALCULATOR GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Controls */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-2xs space-y-6">
              <div>
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-indigo-600" /> Equipment Lease Repayment Calculator
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select an equipment item from the marketplace directory or input custom price parameters to simulate monthly repayments.
                </p>
              </div>

              <div className="space-y-4 text-xs font-medium">
                
                {/* Equipment Dropdown */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5">Select Equipment Item</label>
                  <select
                    value={calcEquipmentId}
                    onChange={(e) => handleEquipmentSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-hidden focus:border-indigo-600 text-xs"
                  >
                    {listings.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.title} — ₦{l.price.toLocaleString()} ({l.state})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Equipment Price Input */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-slate-800 font-bold">Equipment Total Cost (₦ NGN)</label>
                    <span className="font-extrabold text-indigo-600">₦{calcEquipmentPrice.toLocaleString()}</span>
                  </div>
                  <input
                    type="number"
                    value={calcEquipmentPrice}
                    onChange={(e) => setCalcEquipmentPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-extrabold text-sm"
                  />
                </div>

                {/* Down Payment % Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-slate-800 font-bold">Initial Equity Down Payment ({calcDownPaymentPct}%)</label>
                    <span className="font-extrabold text-emerald-700">₦{downPaymentAmount.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    step={5}
                    value={calcDownPaymentPct}
                    onChange={(e) => setCalcDownPaymentPct(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                    <span>10% (Min)</span>
                    <span>25%</span>
                    <span>50% (Max)</span>
                  </div>
                </div>

                {/* Lease Tenure Selector */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5">Lease Tenure Duration</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[12, 18, 24, 36].map(months => (
                      <button
                        key={months}
                        type="button"
                        onClick={() => setCalcTenureMonths(months)}
                        className={`py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all border ${
                          calcTenureMonths === months
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {months} Months
                      </button>
                    ))}
                  </div>
                </div>

                {/* Financial Partner Selector */}
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5">Select Commercial Financing Bank Partner</label>
                  <div className="space-y-2">
                    {partners.map(partner => (
                      <div
                        key={partner.id}
                        onClick={() => setSelectedPartnerId(partner.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedPartnerId === partner.id
                            ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-600 text-xs">
                            🏦
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs">{partner.name}</h4>
                            <span className="text-[10px] text-slate-500 font-medium">{partner.badge}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-indigo-700 block">{partner.interest_rate_annual}% p.a.</span>
                          <span className="text-[10px] text-slate-400 font-bold">Max {partner.max_tenure_months} mos</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Right Side Repayment Summary & Application Trigger */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block">
                  Simulated Repayment Output
                </span>

                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block">Estimated Monthly Installment</span>
                  <span className="text-3xl font-black text-emerald-400 tracking-tight">₦{monthlyPayment.toLocaleString()} <span className="text-xs text-slate-400 font-bold">/ month</span></span>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Equipment Total Price:</span>
                    <span className="font-bold text-white">₦{calcEquipmentPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Initial Down Payment ({calcDownPaymentPct}%):</span>
                    <span className="font-bold text-emerald-400">₦{downPaymentAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Net Financed Amount:</span>
                    <span className="font-bold text-indigo-300">₦{financedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Total Interest Over {calcTenureMonths} Months:</span>
                    <span className="font-bold text-amber-300">₦{totalInterestPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 font-extrabold pt-2 border-t border-slate-800">
                    <span>Total Lease Value:</span>
                    <span className="text-white">₦{(downPaymentAmount + totalRepayment).toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-[11px] text-slate-300 leading-snug">
                  💡 <strong>Preserves Cash Flow:</strong> Spread payments across {calcTenureMonths} months while equipment generates immediate patient diagnostic revenues.
                </div>
              </div>

              {/* QUICK APPLY FORM */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-2xs">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" /> Apply For Instant Lease Pre-Qualification
                </h4>

                <form onSubmit={handleApplyForLease} className="space-y-3 text-xs font-medium">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Hospital / Clinic Business Name</label>
                    <input
                      type="text"
                      value={appHospitalName}
                      onChange={(e) => setAppHospitalName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">CAC Reg Number</label>
                      <input
                        type="text"
                        value={appCacReg}
                        onChange={(e) => setAppCacReg(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                        placeholder="RC-123456"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Medical License #</label>
                      <input
                        type="text"
                        value={appMedicalLicense}
                        onChange={(e) => setAppMedicalLicense(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                        placeholder="MDCN-HOSP-001"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={appContactPhone}
                        onChange={(e) => setAppContactPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Monthly Patients</label>
                      <input
                        type="number"
                        value={appPatientVolume}
                        onChange={(e) => setAppPatientVolume(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingApp}
                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2"
                  >
                    {isSubmittingApp ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Submitting Lease Dossier...</span>
                      </>
                    ) : (
                      <>
                        <Landmark className="h-4 w-4" />
                        <span>Submit Lease Application to {partnerObj?.name}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: BANK & ADMIN UNDERWRITING APPROVAL DESK */}
      {/* ======================================================== */}
      {activeTab === 'underwriting' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Landmark className="h-5 w-5 text-indigo-600" /> Commercial Bank Underwriting & Risk Review Desk
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted lease financing applications, inspect CAC medical licenses, set pre-approval terms, and trigger disburser payouts.
              </p>
            </div>
            <button
              onClick={fetchData}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh Applications
            </button>
          </div>

          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center bg-white">
                <Landmark className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-semibold">No financing applications submitted yet.</p>
              </div>
            ) : (
              applications.map((appItem) => (
                <div key={appItem.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-indigo-200 transition-all">
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 text-base">{appItem.hospital_name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          appItem.status === 'disbursed' ? 'bg-purple-100 text-purple-800' :
                          appItem.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          appItem.status === 'pre_approved' ? 'bg-blue-100 text-blue-800' :
                          appItem.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {appItem.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 space-x-3 font-mono mt-1 flex flex-wrap">
                        <span>Equipment: <strong className="text-slate-900">{appItem.equipment_title}</strong></span>
                        <span>•</span>
                        <span>Bank Partner: <strong className="text-indigo-700">{appItem.partner_bank_name}</strong></span>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Equipment Price</span>
                      <span className="text-lg font-black text-slate-900">₦{appItem.equipment_price.toLocaleString()}</span>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        Financed: ₦{appItem.financed_amount.toLocaleString()} ({appItem.tenure_months} mos)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Repayment</span>
                      <span className="text-sm font-black text-emerald-700">₦{appItem.monthly_repayment.toLocaleString()} / mo</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">CAC Registration</span>
                      <span className="font-mono font-bold text-slate-800">{appItem.cac_registration}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Medical License</span>
                      <span className="font-mono font-bold text-slate-800">{appItem.medical_license}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Patients</span>
                      <span className="font-extrabold text-indigo-700">{appItem.monthly_patient_volume} Patients / mo</span>
                    </div>
                  </div>

                  {appItem.approval_notes && (
                    <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs text-amber-900 font-mono">
                      <strong>Underwriter Note:</strong> {appItem.approval_notes}
                    </div>
                  )}

                  {/* Underwriter Status Actions */}
                  <div className="flex items-center gap-2 flex-wrap justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleUpdateAppStatus(appItem.id, 'pre_approved')}
                      className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Issue Pre-Approval
                    </button>
                    <button
                      onClick={() => handleUpdateAppStatus(appItem.id, 'approved')}
                      className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Final Approval
                    </button>
                    <button
                      onClick={() => handleUpdateAppStatus(appItem.id, 'disbursed')}
                      className="px-3 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Disburse Payout
                    </button>
                    <button
                      onClick={() => handleUpdateAppStatus(appItem.id, 'rejected')}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Reject Application
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: INTER-STATE HEAVY MEDICAL LOGISTICS ESTIMATOR */}
      {/* ======================================================== */}
      {activeTab === 'logistics' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
          <InterStateLogisticsEstimator
            embeddedMode={true}
            initialOriginState="Lagos"
            initialDestinationState="Enugu"
            currentUser={currentUser}
          />
        </div>
      )}

      {/* CREATE ESCROW MODAL */}

      {showCreateEscrowModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" /> Start Escrow Purchase Agreement
              </h3>
              <button
                onClick={() => setShowCreateEscrowModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateEscrowDeal} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Equipment Listing</label>
                <select
                  value={selectedListingId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedListingId(id);
                    const found = listings.find(l => l.id === id);
                    if (found) setEscrowAmountInput(found.price);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-hidden focus:border-indigo-600"
                  required
                >
                  <option value="">-- Choose Equipment --</option>
                  {listings.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.title} — ₦{l.price.toLocaleString()} ({l.seller_name || 'Dealer'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Agreed Price (₦ NGN)</label>
                <input
                  type="number"
                  value={escrowAmountInput}
                  onChange={(e) => setEscrowAmountInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm"
                  required
                />
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 space-y-1">
                <p>🔒 <strong>Escrow Guarantee:</strong> Payment remains locked in custodian account until a certified biomedical engineer tests the equipment and completes physical inspection sign-off.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateEscrowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEscrow}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {isSubmittingEscrow ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  <span>Initiate Escrow Vault</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VENDOR STOREFRONT MODAL */}
      {selectedVendorForStorefront && (
        <VendorStorefrontModal
          isOpen={!!selectedVendorForStorefront}
          onClose={() => setSelectedVendorForStorefront(null)}
          sellerId={selectedVendorForStorefront.id}
          sellerNameFallback={selectedVendorForStorefront.name}
          currentUser={currentUser}
        />
      )}

    </div>
  );
}
