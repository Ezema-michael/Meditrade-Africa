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
  ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Engineer, EngineerReview } from '../types';
import { NIGERIAN_STATES } from '../data';

interface EngineersDashboardProps {
  currentUser: any;
  onTriggerRegister: () => void;
}

const SPECIALTIES = [
  'Ultrasound & Radiology Calibration',
  'Laboratory & Biosafety Maintenance',
  'ICU Ventilators & Anaesthetic Workstations',
  'Dental Systems & Autoclave Sterilizers',
  'General Medical Equipment Maintenance'
];

export default function EngineersDashboard({ currentUser, onTriggerRegister }: EngineersDashboardProps) {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loadingEngineers, setLoadingEngineers] = useState(false);
  
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

  // Initial fetch
  useEffect(() => {
    fetchEngineers();
  }, [searchQuery, selectedState, selectedSpecialty]);

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
                      <select
                        value={regSpecialty}
                        onChange={(e) => setRegSpecialty(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        {SPECIALTIES.map((spec) => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
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
                        <select
                          value={regState}
                          onChange={(e) => setRegState(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          {NIGERIAN_STATES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
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
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">All Specialties</option>
                  {SPECIALTIES.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">All Regions / States</option>
                  {NIGERIAN_STATES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
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
      </AnimatePresence>
    </div>
  );
}
