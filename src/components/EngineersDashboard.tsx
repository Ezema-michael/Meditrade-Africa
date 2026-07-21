import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Award, 
  PlusCircle, 
  MessageSquare, 
  X, 
  CheckCircle2, 
  ChevronRight, 
  User, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Calendar,
  Lock,
  Activity,
  Zap,
  Clock,
  Check,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Engineer, EngineerReview, InspectionRequest, InspectionChecklistItem } from '../types';
import { NIGERIAN_STATES } from '../data';
import CustomSelect from './CustomSelect';

interface EngineersDashboardProps {
  currentUser: any;
  onTriggerRegister: () => void;
}

const SPECIALTIES = [
  'Ultrasound & Radiology Calibration',
  'Laboratory & Biosafety Maintenance',
  'ICU Ventilators & Anaesthetic Workstations',
  'Dental Systems & Autoclaves',
  'General Medical Equipment Maintenance'
];

export default function EngineersDashboard({ currentUser, onTriggerRegister }: EngineersDashboardProps) {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loadingEngineers, setLoadingEngineers] = useState(false);
  
  // View mode
  const [activeTab, setActiveTab] = useState<'directory' | 'audits'>('directory');
  const [inspections, setInspections] = useState<InspectionRequest[]>([]);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<InspectionRequest | null>(null);
  const [auditVerdictNotes, setAuditVerdictNotes] = useState('');
  const [auditChecklistState, setAuditChecklistState] = useState<InspectionChecklistItem[]>([]);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');


  // Selected engineer for reviews modal
  const [selectedEngineer, setSelectedEngineer] = useState<Engineer | null>(null);
  const [reviews, setReviews] = useState<EngineerReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Toggle engineer registration form
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerBusiness, setReviewerBusiness] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Engineer Registration Form state
  const [regName, setRegName] = useState('');
  const [regSpecialty, setRegSpecialty] = useState(SPECIALTIES[0]);
  const [regExperience, setRegExperience] = useState('5');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regState, setRegState] = useState('Lagos');
  const [regCity, setRegCity] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regServices, setRegServices] = useState('');
  const [regAvatar, setRegAvatar] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // Fetch engineers list from server
  const fetchEngineers = async () => {
    setLoadingEngineers(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedState) params.append('state', selectedState);
      if (selectedSpecialty) params.append('specialty', selectedSpecialty);

      const res = await fetch(`/api/engineers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEngineers(data);
      }
    } catch (err) {
      console.error('Failed to fetch engineers:', err);
    } finally {
      setLoadingEngineers(false);
    }
  };

  // Fetch reviews for specific engineer
  const fetchReviews = async (engineerId: string) => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/engineers/${engineerId}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Fetch pre-purchase inspection requests
  const fetchInspections = async () => {
    setLoadingInspections(true);
    try {
      const res = await fetch('/api/inspections');
      if (res.ok) {
        const data = await res.json();
        setInspections(data);
      }
    } catch (err) {
      console.error('Failed to fetch inspection requests:', err);
    } finally {
      setLoadingInspections(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEngineers();
    fetchInspections();
  }, [searchQuery, selectedState, selectedSpecialty, activeTab]);

  const handleOpenAuditSignoff = (audit: InspectionRequest) => {
    setSelectedAudit(audit);
    setAuditVerdictNotes(audit.engineer_verdict_notes || '');
    setAuditChecklistState(audit.checklist ? JSON.parse(JSON.stringify(audit.checklist)) : []);
  };

  const handleUpdateChecklistItem = (id: string, field: 'status' | 'measured_value' | 'notes', value: string) => {
    setAuditChecklistState(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmitAuditReport = async (status: 'passed' | 'failed_with_defects') => {
    if (!selectedAudit) return;
    setSubmittingReport(true);
    try {
      const res = await fetch(`/api/inspections/${selectedAudit.id}/submit-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist: auditChecklistState,
          verdict_notes: auditVerdictNotes || (status === 'passed' ? 'Equipment passed full calibration testing.' : 'Defects found during testing.'),
          status
        })
      });

      if (res.ok) {
        fetchInspections();
        setSelectedAudit(null);
      }
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setSubmittingReport(false);
    }
  };


  // Handle open reviews
  const handleViewReviews = (engineer: Engineer) => {
    setSelectedEngineer(engineer);
    setReviewSuccess(false);
    setReviewComment('');
    setReviewRating(5);
    // Autofill reviewer details if logged in
    if (currentUser && currentUser.role !== 'guest') {
      setReviewerName(currentUser.contact_name || currentUser.email.split('@')[0]);
      setReviewerBusiness(currentUser.businessName || 'Clinical Administrator');
    } else {
      setReviewerName('');
      setReviewerBusiness('');
    }
    fetchReviews(engineer.id);
  };

  // Handle submit review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEngineer) return;

    if (currentUser?.role === 'guest') {
      onTriggerRegister();
      return;
    }

    if (!reviewerName || !reviewComment) {
      alert('Please fill out all required review fields.');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/engineers/${selectedEngineer.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: currentUser?.id,
          reviewer_name: reviewerName,
          reviewer_business: reviewerBusiness,
          rating: reviewRating,
          comment: reviewComment
        })
      });

      if (res.ok) {
        setReviewSuccess(true);
        setReviewComment('');
        // Refresh reviews and engineers list
        fetchReviews(selectedEngineer.id);
        fetchEngineers();
        
        // Temporarily refresh selected engineer avg rating locally
        const updatedRes = await fetch(`/api/engineers`);
        if (updatedRes.ok) {
          const updatedEngs = await updatedRes.json();
          const currentUpdated = updatedEngs.find((eng: Engineer) => eng.id === selectedEngineer.id);
          if (currentUpdated) {
            setSelectedEngineer(currentUpdated);
          }
        }
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle Register/Add Engineer Profile
  const handleRegisterEngineer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentUser?.role === 'guest') {
      onTriggerRegister();
      return;
    }

    if (!regName || !regPhone || !regEmail || !regCity || !regBio) {
      alert('Please provide all mandatory fields for the engineering profile.');
      return;
    }

    setSubmittingReg(true);
    try {
      const servicesArray = regServices
        ? regServices.split(',').map(s => s.trim()).filter(Boolean)
        : ['General Maintenance', 'Repair'];

      const res = await fetch('/api/engineers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          specialty: regSpecialty,
          experience_years: Number(regExperience),
          phone: regPhone,
          email: regEmail,
          state: regState,
          city: regCity,
          bio: regBio,
          services_offered: servicesArray,
          avatar_url: regAvatar || undefined
        })
      });

      if (res.ok) {
        setRegSuccess(true);
        setRegName('');
        setRegPhone('');
        setRegEmail('');
        setRegCity('');
        setRegBio('');
        setRegServices('');
        setRegAvatar('');
        // Refresh engineers list
        fetchEngineers();
        setTimeout(() => {
          setRegSuccess(false);
          setShowRegisterForm(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to register engineer:', err);
    } finally {
      setSubmittingReg(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER HERO BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Wrench className="h-40 w-40 text-emerald-400 rotate-12" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] tracking-widest uppercase px-3 py-1 rounded-full border border-indigo-500/30">
            Verified Clinical Engineering Hub
          </span>
          <h1 className="font-black text-2xl md:text-3xl tracking-tight mt-3 text-slate-50 flex items-center gap-2">
            <Wrench className="h-7 w-7 text-indigo-400 animate-spin-slow" />
            Biomedical Engineers & Installation Services
          </h1>
          <p className="text-slate-350 text-xs mt-2 leading-relaxed text-justify">
            Connect directly with verified local field engineers, medical system calibration experts, and technical service providers inside Nigeria. Hospital managers can browse specialization records, check certified ratings, and write public technical performance reviews.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => setShowRegisterForm(!showRegisterForm)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{showRegisterForm ? "Browse Engineers Registry" : "Register as Service Engineer"}</span>
            </button>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-450">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>All active ratings are backed by hospital purchaser audits.</span>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TAB STRIP */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setActiveTab('directory'); setShowRegisterForm(false); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4 text-indigo-400" />
          <span>Biomedical Engineers Directory ({engineers.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('audits'); setShowRegisterForm(false); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'audits'
              ? 'bg-cyan-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Pre-Purchase Engineering Audits</span>
          {inspections.length > 0 && (
            <span className="bg-cyan-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {inspections.length}
            </span>
          )}
        </button>
      </div>


      <AnimatePresence mode="wait">
        {showRegisterForm ? (
          /* REGISTRATION FORM VIEW */
          <motion.div
            key="register-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-600" />
                  Create Your Professional Service Profile
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Advertise your engineering and maintenance capabilities to hospital buyers nationwide.</p>
              </div>
              <button 
                onClick={() => setShowRegisterForm(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {regSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-emerald-900">Registration Profile Submitted!</h3>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  Thank you for registering. Your engineer service profile is now live in the directory. Clinical desks may audit your licenses shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegisterEngineer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name (including titles, e.g. Engr. John Doe) *</label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Engr. Chinedu Okafor"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Engineering Specialty *</label>
                      <CustomSelect
                        value={regSpecialty}
                        onChange={(val) => setRegSpecialty(val)}
                        options={SPECIALTIES.map(spec => ({ value: spec, label: spec }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Years of Experience *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="40"
                          value={regExperience}
                          onChange={(e) => setRegExperience(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Profile Photo URL (Optional)</label>
                        <input
                          type="url"
                          value={regAvatar}
                          onChange={(e) => setRegAvatar(e.target.value)}
                          placeholder="https://images.unsplash.com/... or blank"
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Direct Phone (WhatsApp) *</label>
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="e.g. +2348030000000"
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="e.g. contact@engineer.ng"
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">State (Location) *</label>
                        <CustomSelect
                          value={regState}
                          onChange={(val) => setRegState(val)}
                          options={NIGERIAN_STATES.map(st => ({ value: st, label: st }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">City *</label>
                        <input
                          type="text"
                          required
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          placeholder="e.g. Surulere"
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Services Offered (Comma Separated) *</label>
                      <input
                        type="text"
                        required
                        value={regServices}
                        onChange={(e) => setRegServices(e.target.value)}
                        placeholder="e.g. Ultrasound Repair, Board-Level Diagnosis, Calibration, Quarterly Maintenance"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Separate specific technical offerings with commas.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Professional Biography & Accreditations *</label>
                      <textarea
                        required
                        rows={4}
                        value={regBio}
                        onChange={(e) => setRegBio(e.target.value)}
                        placeholder="Describe your training, brands you work on (GE, Philips, Mindray), diagnostic equipment calibrated, and typical dispatch response windows."
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {currentUser?.role === 'guest' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
                    <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-bold">Guest Mode Active:</span> Submitting this form will automatically prompt you to setup a verified fast-login buyer/seller account to verify your business credentials.
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReg}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {submittingReg ? "Submitting..." : "Submit Profile & Go Live"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        ) : activeTab === 'audits' ? (
          /* PRE-PURCHASE ENGINEERING AUDITS PORTAL VIEW */
          <motion.div
            key="audits-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* AUDITS HEADER CARDS */}
            <div className="bg-cyan-950 text-white rounded-3xl p-6 border border-cyan-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-cyan-400" />
                  <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest">
                    Tokunbo & Used Equipment Verification Protocol
                  </span>
                </div>
                <h2 className="text-lg font-black text-white">Certified Pre-Purchase Engineering Audits</h2>
                <p className="text-xs text-cyan-200/80 leading-relaxed">
                  Before buyers release funds via Escrow, certified local biomedical engineers conduct on-site calibration testing for uncalibrated sensors, tube head voltages, and power surge protection.
                </p>
              </div>

              <div className="bg-cyan-900/80 border border-cyan-700/60 rounded-2xl p-4 shrink-0 space-y-1 text-center font-mono">
                <span className="text-[10px] text-cyan-300 uppercase block font-bold">Protocol Active Deals</span>
                <span className="text-2xl font-black text-white">{inspections.length}</span>
                <span className="text-[9.5px] text-emerald-400 block font-bold">100% Escrow Protected</span>
              </div>
            </div>

            {/* AUDITS REQUEST GRID */}
            {loadingInspections ? (
              <div className="py-20 text-center space-y-3">
                <div className="animate-spin inline-block h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
                <p className="text-slate-500 text-xs font-bold">Loading engineering audit requests...</p>
              </div>
            ) : inspections.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3">
                <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="font-extrabold text-slate-800 text-sm">No Pending Audit Requests</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When hospital buyers request pre-purchase inspections on Tokunbo or used equipment listings, requests will appear here for local engineers to conduct testing.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {inspections.map((audit) => {
                  const passed = audit.status === 'passed';
                  const failed = audit.status === 'failed_with_defects';

                  return (
                    <div
                      key={audit.id}
                      className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                    >
                      {/* Top Header */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                            passed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : failed
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                          }`}>
                            {passed ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : failed ? <XCircle className="h-3 w-3 text-rose-600" /> : <Clock className="h-3 w-3 text-amber-600" />}
                            {audit.status.replace(/_/g, ' ')}
                          </span>

                          <span className="text-xs font-mono font-bold text-slate-500">
                            Fee: ₦{(audit.fee_ngn || 65000).toLocaleString()}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-base tracking-tight leading-snug">
                          {audit.listing_title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{audit.location_city}, {audit.location_state}</span>
                        </div>
                      </div>

                      {/* Info Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-700 font-medium">
                          <span className="text-slate-400">Buyer Facility:</span>
                          <strong className="text-slate-900">{audit.buyer_name}</strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-700 font-medium">
                          <span className="text-slate-400">Assigned Engineer:</span>
                          <strong className="text-indigo-600">{audit.engineer_name}</strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-700 font-medium">
                          <span className="text-slate-400">Escrow Link:</span>
                          <span className="font-mono text-[11px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-bold">
                            {audit.escrow_id || 'Standalone Audit'}
                          </span>
                        </div>

                        {audit.certificate_number && (
                          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-emerald-700 font-mono font-bold bg-emerald-50/50 p-2 rounded-xl">
                            <span className="flex items-center gap-1">
                              <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Cert: {audit.certificate_number}</span>
                            </span>
                            <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded">
                              OFFICIAL
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Checklist Quick View */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Calibration Checklist Protocol (5 Points)
                        </span>
                        <div className="grid grid-cols-1 gap-1">
                          {audit.checklist?.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-[11px] bg-white border border-slate-100 p-2 rounded-xl">
                              <span className="text-slate-700 font-medium truncate max-w-[200px]">{item.title}</span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                item.status === 'pass'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'fail'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.status.toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleOpenAuditSignoff(audit)}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 px-4 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Wrench className="h-4 w-4 text-cyan-400" />
                        <span>Run On-Site Calibration Signoff</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* BROWSE ENGINEERS DIRECTORY VIEW */
          <motion.div
            key="directory-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >

            {/* SEARCH AND FILTERS PANEL */}
            <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              <div className="md:col-span-2 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search engineers by name, brand (GE, Mindray), or keyword..."
                  className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
                <span className="absolute left-3 top-3.5 text-slate-400 font-bold text-xs">🔍</span>
              </div>

              <div>
                <CustomSelect
                  value={selectedSpecialty}
                  onChange={(val) => setSelectedSpecialty(val)}
                  placeholder="All Specialties"
                  options={[
                    { value: '', label: 'All Specialties' },
                    ...SPECIALTIES.map(spec => ({ value: spec, label: spec }))
                  ]}
                />
              </div>

              <div>
                <CustomSelect
                  value={selectedState}
                  onChange={(val) => setSelectedState(val)}
                  placeholder="All Regions / States"
                  options={[
                    { value: '', label: 'All Regions / States' },
                    ...NIGERIAN_STATES.map(st => ({ value: st, label: st }))
                  ]}
                />
              </div>
            </div>

            {/* ENGINEERS GRID */}
            {loadingEngineers ? (
              <div className="py-24 text-center space-y-3">
                <div className="animate-spin inline-block h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
                <p className="text-slate-500 text-xs font-bold">Scanning verified engineer registry...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {engineers.map((engineer) => (
                  <motion.div
                    key={engineer.id}
                    layoutId={`eng-card-${engineer.id}`}
                    className="bg-white rounded-3xl border border-slate-150 p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <img
                        src={engineer.avatar_url || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80'}
                        alt={engineer.name}
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 rounded-2xl object-cover shrink-0 border border-slate-100 bg-slate-50 shadow-xs"
                      />

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">{engineer.name}</h3>
                          {engineer.verified_status === 'verified' && (
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-0.5 shadow-xs">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                              VERIFIED
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-indigo-600 font-bold">{engineer.specialty}</p>

                        <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            <strong className="text-slate-800 font-extrabold">{engineer.average_rating > 0 ? engineer.average_rating : "Unrated"}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{engineer.experience_years} Years Exp</span>
                          </span>
                        </div>

                        <p className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{engineer.city}, {engineer.state}</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-slate-600 leading-relaxed text-justify line-clamp-3">
                        {engineer.bio}
                      </p>

                      {/* Services Tags */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {engineer.services_offered.map((svc, idx) => (
                          <span key={idx} className="bg-slate-100 border border-slate-150 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {svc}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* ACTIONS BAR */}
                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-2.5">
                      <button
                        onClick={() => handleViewReviews(engineer)}
                        className="text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="h-4 w-4 text-slate-400" />
                        <span>Client Reviews</span>
                      </button>

                      {currentUser?.role === 'guest' ? (
                        <button
                          onClick={onTriggerRegister}
                          className="text-[11px] font-bold text-indigo-650 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                        >
                          Unlock Contacts
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${engineer.phone}`}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 rounded-xl transition-all border border-indigo-100"
                            title="Call Engineer"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                          <a
                            href={`mailto:${engineer.email}`}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-2 rounded-xl transition-all border border-slate-200"
                            title="Email Engineer"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                          <a
                            href={`https://wa.me/${engineer.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 shadow-xs"
                          >
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {engineers.length === 0 && (
                  <div className="col-span-1 md:col-span-2 bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center space-y-3">
                    <div className="text-3xl">🛠️</div>
                    <h3 className="font-bold text-slate-800">No Service Engineers Located</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      We could not match any clinical technicians based on your query or specialty filters. Try broadening your criteria or register a new service profile.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* REVIEWS COLLAPSIBLE DRAWER / MODAL */}
      <AnimatePresence>
        {selectedEngineer && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-150"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedEngineer.avatar_url || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80'}
                    alt={selectedEngineer.name}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-xl object-cover border border-slate-200 bg-white"
                  />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">{selectedEngineer.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Reviews Registry • Avg Rating: {selectedEngineer.average_rating > 0 ? `${selectedEngineer.average_rating} ★` : 'No reviews yet'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEngineer(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* WRITE A REVIEW FORM */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 space-y-3.5">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-indigo-600" />
                    Write a Clinical Performance Review
                  </h4>

                  {reviewSuccess ? (
                    <div className="bg-emerald-50 border border-emerald-150 text-emerald-850 rounded-xl p-3 text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span>Review submitted successfully! Rating updated in real-time.</span>
                    </div>
                  ) : currentUser?.role === 'guest' ? (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-800 space-y-2">
                      <p>Only verified clinical operators and hospital purchasing desks can submit public performance reviews on engineers.</p>
                      <button
                        onClick={onTriggerRegister}
                        className="text-[11px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                      >
                        Register / Verify Account
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Your Name *</label>
                          <input
                            type="text"
                            required
                            value={reviewerName}
                            onChange={(e) => setReviewerName(e.target.value)}
                            placeholder="Dr. Fatima / Matron"
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Hospital / Clinic *</label>
                          <input
                            type="text"
                            required
                            value={reviewerBusiness}
                            onChange={(e) => setReviewerBusiness(e.target.value)}
                            placeholder="Garki General Hospital"
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="block text-[10px] font-bold text-slate-600">Technical Rating *</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="focus:outline-hidden hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  star <= reviewRating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-slate-500">({reviewRating}/5 stars)</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Detailed Technical Feedback *</label>
                        <textarea
                          required
                          rows={2}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Describe the speed, diagnostic outcomes, equipment calibrated, and warranty support provided."
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white resize-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="bg-indigo-650 hover:bg-indigo-750 disabled:bg-slate-400 text-white text-[11px] font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                        >
                          {submittingReview ? "Submitting..." : "Publish Review"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* HISTORICAL REVIEWS LIST */}
                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Verified Reviews Archive</h4>

                  {loadingReviews ? (
                    <div className="py-8 text-center text-slate-500 text-xs">Loading performance logs...</div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                      No customer reviews filed yet for {selectedEngineer.name}. Be the first to file feedback!
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="border border-slate-150 rounded-2xl p-4 bg-white shadow-3xs space-y-2">
                          <div className="flex items-start justify-between gap-2.5">
                            <div>
                              <span className="font-extrabold text-slate-900 text-xs block leading-none">{rev.reviewer_name}</span>
                              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{rev.reviewer_business}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg text-amber-700 text-[10px] font-black">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{rev.rating}.0</span>
                            </div>
                          </div>
                          
                          <p className="text-xs text-slate-650 leading-relaxed text-justify bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            "{rev.comment}"
                          </p>
                          
                          <span className="text-[9px] text-slate-400 block text-right">
                            Logged on {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedEngineer(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Close Directory Log
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* CALIBRATION SIGNOFF MODAL */}
        {selectedAudit && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col shadow-2xl border border-slate-150"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-900 text-cyan-300 rounded-xl">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm leading-snug">On-Site Calibration Testing Protocol</h3>
                    <p className="text-[11px] text-cyan-200/80 font-mono">
                      Request ID: {selectedAudit.id} • Tokunbo Verification
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAudit(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {/* Equipment & Deal Overview */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Equipment Under Test</span>
                      <h4 className="font-extrabold text-slate-900 text-sm">{selectedAudit.listing_title}</h4>
                    </div>
                    <span className="bg-cyan-100 text-cyan-800 font-mono text-[11px] px-2 py-0.5 rounded font-bold">
                      {selectedAudit.listing_condition || 'Tokunbo Used'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-slate-600">
                    <div>Buyer Facility: <strong>{selectedAudit.buyer_name}</strong></div>
                    <div>Location: <strong>{selectedAudit.location_city}, {selectedAudit.location_state}</strong></div>
                    <div>Assigned Engineer: <strong>{selectedAudit.engineer_name}</strong></div>
                    <div>Audit Fee: <strong>₦{(selectedAudit.fee_ngn || 65000).toLocaleString()}</strong></div>
                  </div>
                </div>

                {/* Interactive Calibration Checklist Table */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                    <span>Biomedical Testing Checklist (5 Calibration Points)</span>
                    <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">
                      Standard EN-60601 Protocol
                    </span>
                  </h4>

                  <div className="space-y-2.5">
                    {auditChecklistState.map((item) => (
                      <div key={item.id} className="border border-slate-200 rounded-2xl p-3.5 bg-white space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 text-xs">{item.title}</span>
                          
                          {/* Toggle Status */}
                          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border">
                            <button
                              type="button"
                              onClick={() => handleUpdateChecklistItem(item.id, 'status', 'pass')}
                              className={`px-2.5 py-1 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                                item.status === 'pass'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              PASS
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateChecklistItem(item.id, 'status', 'fail')}
                              className={`px-2.5 py-1 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
                                item.status === 'fail'
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              DEFECT
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-snug">{item.description}</p>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <input
                            type="text"
                            value={item.measured_value || ''}
                            onChange={(e) => handleUpdateChecklistItem(item.id, 'measured_value', e.target.value)}
                            placeholder="e.g., Measured 220V, 0.02mA leakage"
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-mono"
                          />
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => handleUpdateChecklistItem(item.id, 'notes', e.target.value)}
                            placeholder="Engineer observation notes..."
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engineer Verdict Textarea */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Overall Engineer Calibration Verdict & Recommendations</label>
                  <textarea
                    rows={2}
                    value={auditVerdictNotes}
                    onChange={(e) => setAuditVerdictNotes(e.target.value)}
                    placeholder="Provide full technical summary, missing accessories noted, or calibration certificate details..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-relaxed"
                  />
                </div>

                {/* Footer Submit buttons */}
                <div className="pt-2 border-t border-slate-150 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAudit(null)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submittingReport}
                      onClick={() => handleSubmitAuditReport('failed_with_defects')}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Report Defects / Reject</span>
                    </button>

                    <button
                      type="button"
                      disabled={submittingReport}
                      onClick={() => handleSubmitAuditReport('passed')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>{submittingReport ? 'Signing off...' : 'Pass & Issue Calibration Certificate'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

