import React, { useState, useEffect } from 'react';
import { 
  User, Settings, Shield, Award, CheckCircle2, 
  ChevronDown, Phone, Mail, FileText, Check, Save,
  Users, Stethoscope, RefreshCw, Star, ArrowRight, Sparkles
} from 'lucide-react';

interface UserProfileMenuProps {
  currentUser: {
    id: string;
    email: string;
    role: string;
    businessName: string;
    phone?: string;
  };
  onUserChange: (user: any) => void;
  availableUsers?: any[];
  onTriggerRegister?: () => void;
}

export default function UserProfileMenu({ currentUser, onUserChange, availableUsers, onTriggerRegister }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState(currentUser.email);
  const [businessName, setBusinessName] = useState(currentUser.businessName);
  const [phone, setPhone] = useState(currentUser.phone || '+2348000000000');
  const [cacNumber, setCacNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with current user prop changes
  useEffect(() => {
    setEmail(currentUser.email);
    setBusinessName(currentUser.businessName);
    // Fetch detailed user profile from server to get phone and businessName
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/diagnostics/schema`);
        if (res.ok) {
          const data = await res.json();
          const dbUser = data.tables.users.find((u: any) => u.id === currentUser.id);
          if (dbUser) {
            setPhone(dbUser.phone || '+2348000000000');
          }
          if (currentUser.role === 'seller') {
            const dbSeller = data.tables.sellers.find((s: any) => s.user_id === currentUser.id);
            if (dbSeller) {
              setBusinessName(dbSeller.business_name);
              setCacNumber(dbSeller.cac_number || 'RC-998822');
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync profile metrics:', err);
      }
    };
    fetchProfile();
    setIsEditing(false);
  }, [currentUser]);

  // Handle Save profile details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          email,
          phone,
          businessName,
          cac_number: cacNumber
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        setIsEditing(false);
        
        // Notify parent of updated state
        onUserChange({
          ...currentUser,
          email: email,
          businessName: businessName,
          phone: phone
        });
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Switch actor node object handler
  const handleSwitchActorObj = (userObj: any) => {
    onUserChange({
      id: userObj.id,
      email: userObj.email,
      role: userObj.role,
      businessName: userObj.businessName || userObj.email,
      phone: userObj.phone
    });
    setIsOpen(false);
  };

  // UI helper values
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
            <Shield className="h-3 w-3" /> Clinical Moderator
          </span>
        );
      case 'buyer':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
            <Stethoscope className="h-3 w-3" /> Hospital Purchaser
          </span>
        );
      case 'seller':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
            <Award className="h-3 w-3" /> Equipment Vendor
          </span>
        );
      case 'guest':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
            <User className="h-3 w-3" /> Public Guest
          </span>
        );
      default:
        return null;
    }
  };

  const getInitial = () => {
    if (currentUser.role === 'admin') return 'M'; // Michael
    if (currentUser.role === 'buyer') return 'F'; // Fatima
    if (currentUser.role === 'seller') return 'C'; // Chidi
    if (currentUser.role === 'guest') return 'G'; // Guest
    return currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U';
  };

  const getAvatarBg = () => {
    if (currentUser.role === 'admin') return 'bg-rose-600 text-white';
    if (currentUser.role === 'buyer') return 'bg-emerald-600 text-white';
    if (currentUser.role === 'seller') return 'bg-indigo-600 text-white';
    return 'bg-slate-500 text-white';
  };

  return (
    <div className="relative z-50">
      {/* Trigger Button */}
      <button
        id="user-profile-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all cursor-pointer focus:outline-none"
      >
        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shadow-xs ${getAvatarBg()}`}>
          {getInitial()}
        </div>
        <div className="hidden sm:block text-left">
          <span className="text-[11px] font-black text-slate-800 block leading-none">
            {currentUser.role === 'admin' ? 'Michael' : currentUser.role === 'buyer' ? 'Fatima' : currentUser.role === 'seller' ? 'Chidi Obi' : 'Guest Visitor'}
          </span>
          <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mt-0.5">
            {currentUser.role === 'guest' ? 'Visitor' : `${currentUser.role} Space`}
          </span>
        </div>
        <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <>
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2.5 w-92 bg-white border border-slate-150 rounded-2.5xl shadow-2xl p-5 text-slate-800 space-y-4 z-50">
            
            {/* Header / Avatar */}
            <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
              <div className={`h-11 w-11 rounded-full flex items-center justify-center font-black text-sm shadow-md shrink-0 ${getAvatarBg()}`}>
                {getInitial()}
              </div>
              <div className="space-y-1 min-w-0">
                <p className="font-extrabold text-sm text-slate-900 truncate">
                  {currentUser.role === 'admin' 
                    ? 'Michael (Admin Ops)' 
                    : currentUser.role === 'buyer' 
                      ? 'Fatima (Riverside)' 
                      : currentUser.role === 'seller'
                        ? 'Chidi Obi (MedLink)'
                        : 'Public Guest Visitor'}
                </p>
                <p className="text-slate-500 text-[11px] truncate flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                  {currentUser.role === 'guest' ? 'guest@meditrade.africa' : email}
                </p>
                <div className="pt-0.5">{getRoleBadge(currentUser.role)}</div>
              </div>
            </div>

            {/* Profile Forms or Profile Stats */}
            {!isEditing ? (
              <div className="space-y-4">
                {/* Stats / Account Overview */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 space-y-2 text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Verified Operator Meta</span>
                  <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[9px] font-semibold">Business Unit</span>
                      <span className="font-bold text-slate-800 truncate block mt-0.5">
                        {currentUser.role === 'guest' ? 'Anonymous Browser' : businessName}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[9px] font-semibold">Contact Phone</span>
                      <span className="font-bold text-slate-800 truncate block mt-0.5">
                        {currentUser.role === 'guest' ? 'N/A' : phone}
                      </span>
                    </div>
                  </div>

                  {currentUser.role === 'seller' && (
                    <div className="pt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-indigo-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-650 shrink-0" />
                      <span>Dealer License: <strong>{cacNumber || 'RC-998822'}</strong></span>
                    </div>
                  )}
                  {currentUser.role === 'buyer' && (
                    <div className="pt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-650 shrink-0" />
                      <span>Facility: Riverside Memorial (Abuja)</span>
                    </div>
                  )}
                  {currentUser.role === 'admin' && (
                    <div className="pt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-rose-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-rose-650 shrink-0" />
                      <span>System Clearance: Full Moderator Write</span>
                    </div>
                  )}
                  {currentUser.role === 'guest' && (
                    <div className="pt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Unregistered Node: Features Restricted</span>
                    </div>
                  )}
                </div>

                {/* Edit Button */}
                {currentUser.role !== 'guest' ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Configure Workspace Profile</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      if (onTriggerRegister) onTriggerRegister();
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-200 animate-pulse" />
                    <span>Register Account Node</span>
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Update clinical profile metadata</span>
                
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Business / Institution Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Operator Direct Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  {currentUser.role === 'seller' && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">CAC Registration No.</label>
                      <input
                        type="text"
                        value={cacNumber}
                        onChange={(e) => setCacNumber(e.target.value)}
                        placeholder="e.g. RC-123456"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-xl cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1"
                  >
                    {isSaving ? 'Saving...' : (
                      <>
                        <Save className="h-3 w-3" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Quick Switch Simulated Actor Node section */}
            <div className="pt-3.5 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Switch Simulated Actor Node</span>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {(availableUsers && availableUsers.length > 0 ? availableUsers : [
                  { id: 'usr-3', email: 'ezemamichael@gmail.com', role: 'admin', displayName: 'Clinical Moderator (Michael)', businessName: 'MediTrade General Ops' },
                  { id: 'usr-5', email: 'buyer@riversidememorial.org', role: 'buyer', displayName: 'Hospital Purchaser (Fatima)', businessName: 'Riverside Memorial Hospital' },
                  { id: 'usr-1', email: 'chidi.obi@medlink.com.ng', role: 'seller', displayName: 'Equipment Dealer (Chidi Obi)', businessName: 'MedLink Diagnostics Ltd' }
                ]).map((u: any) => {
                  const getRoleIcon = (role: string) => {
                    if (role === 'admin') return '🛡️';
                    if (role === 'buyer') return '🏥';
                    return '🚚';
                  };
                  const getRoleColor = (role: string) => {
                    if (role === 'admin') return currentUser.id === u.id ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50';
                    if (role === 'buyer') return currentUser.id === u.id ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50';
                    return currentUser.id === u.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50';
                  };
                  const getCheckColor = (role: string) => {
                    if (role === 'admin') return 'text-rose-650';
                    if (role === 'buyer') return 'text-emerald-600';
                    return 'text-indigo-600';
                  };
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => handleSwitchActorObj(u)}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${getRoleColor(u.role)}`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{getRoleIcon(u.role)}</span>
                        <span className="truncate">{u.displayName || u.email}</span>
                      </span>
                      {currentUser.id === u.id && <Check className={`h-3.5 w-3.5 shrink-0 ${getCheckColor(u.role)}`} />}
                    </button>
                  );
                })}

                {/* Public Guest Option */}
                <button
                  type="button"
                  onClick={() => handleSwitchActorObj({ 
                    id: 'usr-guest', 
                    email: 'guest@meditrade.africa', 
                    role: 'guest', 
                    businessName: 'Public Guest Visitor', 
                    displayName: 'Public Guest (Unregistered)' 
                  })}
                  className={`p-2 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                    currentUser.role === 'guest' 
                      ? 'bg-slate-100 border-slate-200 text-slate-700' 
                      : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">👤</span>
                    <span className="truncate">Public Guest (Unregistered)</span>
                  </span>
                  {currentUser.role === 'guest' && <Check className="h-3.5 w-3.5 shrink-0 text-slate-600" />}
                </button>
              </div>

              {onTriggerRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onTriggerRegister();
                  }}
                  className="w-full mt-1 border border-dashed border-indigo-300 hover:border-indigo-400 bg-indigo-50/25 hover:bg-indigo-50/50 text-indigo-700 font-extrabold text-[11px] py-2 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
                  <span>Register New Profile Node...</span>
                </button>
              )}
            </div>

            {saveSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[10.5px] font-bold text-emerald-800 text-center flex items-center justify-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-650" />
                <span>Clinical Profile synced to server!</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
