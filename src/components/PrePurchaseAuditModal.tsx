import React, { useState, useEffect } from 'react';
import { Listing, Engineer, User, InspectionRequest } from '../types';
import { 
  ShieldCheck, 
  Wrench, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Sparkles, 
  Phone, 
  Building2, 
  X, 
  Clock, 
  Zap, 
  Activity, 
  FileCheck2,
  Lock
} from 'lucide-react';

interface PrePurchaseAuditModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSuccess?: (inspection: InspectionRequest) => void;
}

export const PrePurchaseAuditModal: React.FC<PrePurchaseAuditModalProps> = ({
  listing,
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>('');
  const [hospitalName, setHospitalName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [inspectionAddress, setInspectionAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [linkEscrow, setLinkEscrow] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submittedInspection, setSubmittedInspection] = useState<InspectionRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Set defaults from currentUser or listing state
      setBuyerName(currentUser?.email?.split('@')[0].toUpperCase() + ' Hospital' || 'Riverside Memorial Hospital');
      setBuyerEmail(currentUser?.email || 'buyer@riversidememorial.org');
      setBuyerPhone(currentUser?.phone || '+2348055554444');
      setHospitalName(currentUser?.email ? currentUser.email.split('@')[0].toUpperCase() + ' Clinic' : 'Riverside Memorial Hospital');
      setInspectionAddress(`${listing.seller_name || 'Vendor Warehouse'}, ${listing.city || 'Ikeja'}, ${listing.state || 'Lagos'}`);
      
      // Default scheduled date 2 days from now
      const targetDate = new Date(Date.now() + 86400000 * 2);
      setScheduledDate(targetDate.toISOString().split('T')[0]);

      // Fetch certified engineers
      fetch('/api/engineers')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setEngineers(data);
            // Preselect engineer matching state or first engineer
            const match = data.find((e: Engineer) => e.state.toLowerCase() === (listing.state || 'lagos').toLowerCase()) || data[0];
            if (match) {
              setSelectedEngineerId(match.id);
            }
          }
        })
        .catch(err => console.error("Error loading engineers:", err));
    } else {
      setSubmittedInspection(null);
      setError(null);
    }
  }, [isOpen, listing, currentUser]);

  if (!isOpen) return null;

  const isUsedEquipment = ['foreign_used', 'local_used', 'working_used', 'refurbished', 'used', 'faulty'].includes(listing.condition);
  const selectedEngineer = engineers.find(e => e.id === selectedEngineerId);
  const auditFee = listing.price > 5000000 ? 120000 : 65000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !buyerPhone || !inspectionAddress) {
      setError("Please fill in hospital name, contact phone, and inspection address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/inspections/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          buyer_id: currentUser?.id || 'usr-5',
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          buyer_email: buyerEmail,
          hospital_name: hospitalName,
          preferred_engineer_id: selectedEngineerId,
          inspection_location: inspectionAddress,
          scheduled_date: scheduledDate,
          notes,
          link_escrow: linkEscrow
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit engineering audit request.");
      }

      setSubmittedInspection(data);
      if (onSuccess) onSuccess(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong creating the audit request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900 via-sky-900 to-indigo-900 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-300 hover:text-white p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-400/30 text-cyan-300">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 mb-1">
                Protocol Standard #BIOMED-2026
              </span>
              <h2 className="text-xl font-bold tracking-tight">
                Certified Pre-Purchase Engineering Audit Request
              </h2>
            </div>
          </div>
          <p className="text-sm text-cyan-100/90 max-w-2xl">
            Dispatch an independent certified biomedical engineer from the directory to perform on-site calibration, tube head testing, and sensor diagnostics before releasing funds.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {submittedInspection ? (
            /* Success View */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900">Pre-Purchase Audit Scheduled!</h3>
                <p className="text-slate-600 text-sm mt-1 max-w-lg mx-auto">
                  Your audit request has been transmitted to <span className="font-semibold text-slate-900">{submittedInspection.assigned_engineer_name}</span>.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left max-w-md mx-auto space-y-3">
                <div className="flex justify-between text-xs text-slate-500 border-b pb-2">
                  <span>AUDIT TRACKING NO</span>
                  <span className="font-mono font-bold text-slate-900">{submittedInspection.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Equipment:</span>
                  <span className="font-medium text-slate-900 truncate max-w-[200px]">{submittedInspection.listing_title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Assigned Engineer:</span>
                  <span className="font-medium text-cyan-700">{submittedInspection.assigned_engineer_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Scheduled Date:</span>
                  <span className="font-medium text-slate-900">{submittedInspection.scheduled_date}</span>
                </div>
                {submittedInspection.escrow_linked && (
                  <div className="flex justify-between text-sm bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-200">
                    <span className="flex items-center gap-1 font-medium text-xs">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      Escrow Vault Status:
                    </span>
                    <span className="font-bold text-xs">Funds Locked Pending Signoff</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
                >
                  Return to Listing
                </button>
              </div>
            </div>
          ) : (
            /* Form View */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Equipment Context Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 text-base">{listing.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      isUsedEquipment ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {listing.condition.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Listed Price: <span className="font-semibold text-slate-800">₦{listing.price.toLocaleString()}</span> • Vendor: <span className="text-slate-700">{listing.seller_name || 'Verified Vendor'}</span>
                  </p>
                </div>

                <div className="text-right sm:text-right text-xs">
                  <span className="text-slate-500 block">Audit Fee</span>
                  <span className="text-base font-bold text-cyan-700">₦{auditFee.toLocaleString()}</span>
                </div>
              </div>

              {/* Risk Mitigation Warning Banner */}
              {isUsedEquipment && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-amber-900 text-sm">High-Risk Equipment Advisory</h4>
                    <p className="leading-relaxed text-amber-800">
                      Buying Foreign Used (Tokunbo) or Local Used equipment carries high risk of uncalibrated sensors, worn X-ray tube heads, or missing probes. This protocol ensures an engineer runs physical diagnostic benchmarking on-site before payment release.
                    </p>
                  </div>
                </div>
              )}

              {/* Engineer Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select Certified Biomedical Engineer from Directory
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {engineers.map(eng => {
                    const isSelected = eng.id === selectedEngineerId;
                    return (
                      <div
                        key={eng.id}
                        onClick={() => setSelectedEngineerId(eng.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-cyan-600 bg-cyan-50/50 shadow-sm ring-2 ring-cyan-500/20' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <img 
                            src={eng.avatar_url || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=100'} 
                            alt={eng.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-slate-900 truncate">{eng.name}</h5>
                              {eng.verified_status === 'verified' && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-medium">
                                  <ShieldCheck className="w-3 h-3 text-sky-600" />
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-cyan-700 font-medium truncate">{eng.specialty}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>📍 {eng.state}, {eng.city}</span>
                              <span>⭐ {eng.average_rating} ({eng.experience_years} yrs exp)</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inspection Protocol Checklist Preview */}
              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Standard On-Site Calibration Testing Checklist
                    </span>
                  </div>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/50 px-2 py-0.5 rounded font-mono">
                    5 Audit Points
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-2 text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>Transducer / Sensor Precision & SNR Test</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Tube Head HV Generator Voltage Stability</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Mains Power Surge & Battery Cutover Check</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Wrench className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>Harness, Probes & Accessories Audit</span>
                  </div>
                </div>
              </div>

              {/* Location & Details Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Facility / Hospital Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={hospitalName}
                      onChange={e => setHospitalName(e.target.value)}
                      placeholder="e.g. St. Nicholas Hospital"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchaser Contact Phone *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={buyerPhone}
                      onChange={e => setBuyerPhone(e.target.value)}
                      placeholder="+2348000000000"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    On-Site Inspection Address / Warehouse Site *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={inspectionAddress}
                      onChange={e => setInspectionAddress(e.target.value)}
                      placeholder="e.g. Vendor Warehouse, 14 Industrial Avenue, Ikeja, Lagos"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferred Audit Date *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      required
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Special Calibration Requirements
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Test 3D Cardiac Probe specifically"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Escrow Lock Integration Toggle */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="linkEscrow"
                  checked={linkEscrow}
                  onChange={e => setLinkEscrow(e.target.checked)}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                />
                <label htmlFor="linkEscrow" className="cursor-pointer text-xs space-y-0.5">
                  <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    Lock Escrow Payment Until Engineer Audit Signoff
                  </span>
                  <span className="text-emerald-700 block leading-snug">
                    Funds will be held securely in Escrow custody. The seller will only be paid after the certified engineer submits a PASSED calibration report.
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-sky-700 hover:from-cyan-700 hover:to-sky-800 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Triggering Audit...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Confirm Pre-Purchase Audit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
