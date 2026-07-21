import React, { useState } from 'react';
import { 
  X, Check, ShieldAlert, Stethoscope, Award, 
  Mail, Phone, Building, FileText, MapPin, Sparkles, Loader2 
} from 'lucide-react';
import { NIGERIAN_STATES } from '../data';
import CustomSelect from './CustomSelect';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess: (newUser: any) => void;
}

export default function RegistrationModal({ isOpen, onClose, onRegisterSuccess }: RegistrationModalProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+234');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [businessName, setBusinessName] = useState('');
  const [cacNumber, setCacNumber] = useState('');
  const [state, setState] = useState('Lagos');
  const [city, setCity] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    if (businessName.trim().length < 3) {
      setErrorMsg('Organization name must be at least 3 characters.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          phone,
          role,
          businessName,
          cacNumber: role === 'seller' ? cacNumber : '',
          state,
          city
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed. Please check your credentials.');
      }

      setSuccess(true);
      setTimeout(() => {
        // Trigger success callback
        onRegisterSuccess({
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          businessName: data.businessName || businessName,
          phone: data.user.phone
        });
        setSuccess(false);
        onClose();
        // Reset form
        setEmail('');
        setPhone('+234');
        setRole('buyer');
        setBusinessName('');
        setCacNumber('');
        setCity('');
      }, 2000);

    } catch (err: any) {
      setErrorMsg(err.message || 'Network exception. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all duration-300">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-500/20 p-2 rounded-xl border border-indigo-400/20">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Register Operator Node</h3>
              <p className="text-[11px] text-indigo-200 mt-0.5">Deploy new hospital purchaser or vetted dealer profile to MediTrade directory</p>
            </div>
          </div>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-start gap-2 animate-shake">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success ? (
            <div className="py-8 text-center space-y-3 animate-fade-in">
              <div className="h-12 w-12 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <Check className="h-6 w-6 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900">Registration Approved!</h4>
                <p className="text-xs text-slate-500">Node initialized, provisioning workspace environment...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Role Card Selectors */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Choose Operator Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Buyer */}
                  <button
                    type="button"
                    onClick={() => {
                      setRole('buyer');
                      if (businessName === '') setBusinessName('');
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                      role === 'buyer' 
                        ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <Stethoscope className={`h-5 w-5 ${role === 'buyer' ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {role === 'buyer' && (
                        <span className="bg-emerald-500 text-white rounded-full p-0.5"><Check className="h-3 w-3 stroke-[3]" /></span>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <span className="font-extrabold text-[12px] text-slate-800 block">Hospital Purchaser</span>
                      <span className="text-[9.5px] text-slate-400 font-medium block mt-0.5">Sourcing medical devices, post RFQs, request quotes</span>
                    </div>
                  </button>

                  {/* Seller */}
                  <button
                    type="button"
                    onClick={() => {
                      setRole('seller');
                      if (businessName === '') setBusinessName('');
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                      role === 'seller' 
                        ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/20' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <Award className={`h-5 w-5 ${role === 'seller' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {role === 'seller' && (
                        <span className="bg-indigo-500 text-white rounded-full p-0.5"><Check className="h-3 w-3 stroke-[3]" /></span>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <span className="font-extrabold text-[12px] text-slate-800 block">Equipment Vendor</span>
                      <span className="text-[9.5px] text-slate-400 font-medium block mt-0.5">Upload inventory, quote RFQs, chat direct with hospitals</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Grid Fields */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Email */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Operator Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. buyer@fmcabuja.org"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Operator WhatsApp / Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +2348030000000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Institution Name */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">
                    {role === 'buyer' ? 'Hospital / Healthcare Institution Name' : 'Business / Trade Corporate Name'}
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder={role === 'buyer' ? 'e.g. Federal Medical Centre, Abuja' : 'e.g. Zenith Diagnostics Ltd'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* CAC Registration No (Seller Only) */}
                {role === 'seller' && (
                  <div className="col-span-2 space-y-1 animate-fade-in">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">CAC Corporate Registration No.</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={cacNumber}
                        onChange={(e) => setCacNumber(e.target.value)}
                        placeholder="e.g. RC-448899"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Location State */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">State</label>
                  <CustomSelect
                    value={state}
                    onChange={(val) => setState(val)}
                    options={NIGERIAN_STATES.map(st => ({ value: st, label: st }))}
                  />
                </div>

                {/* Location City */}
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">City / Town</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Garki"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-xs py-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Deploying Node...</span>
                    </>
                  ) : (
                    <span>Register Account</span>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
