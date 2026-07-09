/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  HelpCircle, 
  Heart, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Users, 
  Check, 
  Phone, 
  AlertTriangle, 
  CheckCircle,
  Stethoscope,
  Filter,
  MessageSquare,
  Volume2,
  Calendar,
  Building,
  Activity,
  DollarSign,
  ChevronRight,
  UserCheck,
  Send,
  Bell,
  FileText
} from 'lucide-react';

import { Listing, Category, Seller, SubscriptionPlan } from './types';
import { CATEGORIES, NIGERIAN_STATES, SUBSCRIPTION_PLANS, INITIAL_SELLERS } from './data';

// Component imports
import ListingCard from './components/ListingCard';
import AIDashboard from './components/AIDashboard';
import ProcurementHub from './components/ProcurementHub';
import AdminPanel from './components/AdminPanel';
import WorkspaceCloudGuide from './components/WorkspaceCloudGuide';
import LeadsDashboard from './components/LeadsDashboard';
import UserProfileMenu from './components/UserProfileMenu';
import RegistrationModal from './components/RegistrationModal';

interface TabGuestRestrictionNoticeProps {
  tabName: string;
  onTriggerRegister: () => void;
  onFastLogin: (user: any) => void;
}

function TabGuestRestrictionNotice({ tabName, onTriggerRegister, onFastLogin }: TabGuestRestrictionNoticeProps) {
  return (
    <div className="relative overflow-hidden bg-slate-50 border border-slate-200 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-xs max-w-3xl mx-auto my-12 animate-fade-in">
      <div className="absolute inset-0 bg-radial-gradient from-indigo-50/20 to-transparent pointer-events-none" />
      <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-xs">
        <ShieldCheck className="h-8 w-8 text-indigo-650" />
      </div>
      
      <div className="max-w-2xl mx-auto space-y-3">
        <span className="bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
          🔒 Restricted Capability
        </span>
        <h3 className="font-black text-slate-900 text-xl md:text-2xl tracking-tight leading-tight">
          {tabName} Locked
        </h3>
        <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-xl mx-auto">
          The capability <strong>{tabName}</strong> is restricted to registered clinicians, buyers, and verified vendors. Switch your operator profile or register a free profile to immediately unlock full capabilities.
        </p>
      </div>

      {/* Interactive triggers */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 pt-4">
        <button 
          onClick={onTriggerRegister}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
        >
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>Register New Account Node</span>
        </button>
        <div className="text-xs text-slate-400 font-bold shrink-0">or Quick Login:</div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => onFastLogin({
              id: 'usr-5',
              email: 'buyer@riversidememorial.org',
              role: 'buyer',
              businessName: 'Riverside Memorial Hospital',
              phone: '+2348055554444'
            })}
            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
          >
            🏥 Purchaser Fatima
          </button>
          <button 
            type="button"
            onClick={() => onFastLogin({
              id: 'usr-1',
              email: 'chidi.obi@medlink.com.ng',
              role: 'seller',
              businessName: 'MedLink Diagnostics Ltd',
              phone: '+2348031234567'
            })}
            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
          >
            🚚 Dealer Chidi Obi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Current active viewport tab
  const [activeTab, setActiveTab] = useState<'marketplace' | 'ai_magic' | 'procure' | 'leads' | 'admin' | 'devops' | 'pricing'>('marketplace');

  // Directory listing states
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const featuredListings = listings.filter(item => item.featured);

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');

  // Notifications drawer / state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Active Session User profile
  const [currentUser, setCurrentUser] = useState<any>({
    id: 'usr-3',
    email: 'ezemamichael@gmail.com',
    role: 'admin', // Mapped as clinical admin
    businessName: 'MediTrade General Ops'
  });

  // Dynamic user session list and registration modal triggers
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  // Sync users list from server
  const fetchAvailableUsers = async () => {
    try {
      const res = await fetch('/api/diagnostics/schema');
      if (res.ok) {
        const data = await res.json();
        const users = data.tables.users || [];
        const sellers = data.tables.sellers || [];
        
        const mappedUsers = users.map((u: any) => {
          let name = u.email;
          if (u.role === 'admin') {
            name = 'Clinical Moderator (Michael)';
          } else if (u.role === 'buyer') {
            name = u.email === 'buyer@riversidememorial.org' 
              ? 'Hospital Purchaser (Fatima)' 
              : `${u.email.split('@')[0].toUpperCase()} (Hospital Purchaser)`;
          } else if (u.role === 'seller') {
            const seller = sellers.find((s: any) => s.user_id === u.id);
            name = seller ? `${seller.business_name} (Vendor)` : `${u.email.split('@')[0].toUpperCase()} (Vendor)`;
          }
          return {
            ...u,
            displayName: name,
            businessName: u.role === 'admin' 
              ? 'MediTrade General Ops' 
              : u.role === 'buyer' 
                ? (u.email === 'buyer@riversidememorial.org' ? 'Riverside Memorial Hospital' : `${u.email.split('@')[0].toUpperCase()} Hospital`)
                : (sellers.find((s: any) => s.user_id === u.id)?.business_name || 'Medical Equipment Ltd')
          };
        });
        
        setAvailableUsers(mappedUsers);
      }
    } catch (err) {
      console.error('Failed to fetch available users list:', err);
    }
  };

  // Seller profile state if roles change
  const [sellerProfile, setSellerProfile] = useState<Seller | null>(INITIAL_SELLERS[0]);

  // Modals / Overlays triggers
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  // Verification request triggered inside user space
  const [cacRegNumber, setCacRegNumber] = useState('');
  const [isCacSubmitting, setIsCacSubmitting] = useState(false);

  // Fetch directories
  const fetchListings = async () => {
    setLoadingListings(true);
    try {
      // Build dynamic filter URL query block
      let url = '/api/listings?';
      if (selectedCategory) url += `category=${selectedCategory}&`;
      if (selectedState) url += `state=${selectedState}&`;
      if (selectedCondition) url += `condition=${selectedCondition}&`;
      if (searchQuery) url += `query=${encodeURIComponent(searchQuery)}&`;
      
      // If client is on admin panel, query all lists including draft/review states
      if (activeTab === 'admin') {
        url += 'status=pending_review&';
      } else {
        url += 'status=published&';
      }

      const res = await fetch(url);
      const data = await res.json();
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingListings(false);
    }
  };

  // Sync simulated Firestore notifications
  const fetchNotifications = async (userId = currentUser?.id) => {
    try {
      const url = userId ? `/api/notifications?user_id=${userId}` : '/api/notifications';
      const res = await fetch(url);
      const data = await res.json();
      setNotifications(data);
      setUnreadNotifCount(data.filter((n: any) => !n.read).length);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await fetch('/api/notifications/dismiss', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser?.id })
      });
      fetchNotifications(currentUser?.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle WhatsApp Click increment
  const handleContactSeller = async (id: string, whatsappNumber: string) => {
    try {
      const res = await fetch(`/api/listings/${id}/track-whatsapp-click`, { method: 'POST' });
      if (res.ok) {
        // Reload listing metrics
        fetchListings();
      }
    } catch (err) {
      console.error(err);
    }
    // Launch standard WhatsApp click-to-chat API
    const cleanPhone = whatsappNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=Hello,%20I%20am%20interested%20in%20your%20medical%20equipment%20listing%20on%20MediTrade%20Africa.%20Is%2520this%20still%20available?`, '_blank');
  };

  // Submit listing flag concern
  const handleReportListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReportId) return;

    try {
      const res = await fetch(`/api/listings/${activeReportId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reportReason })
      });
      if (res.ok) {
        setShowReportSuccess(true);
        setReportReason('');
        setTimeout(() => {
          setShowReportSuccess(false);
          setActiveReportId(null);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Corporate CAC Doc uploading trigger
  const handleCacSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cacRegNumber) return;

    setIsCacSubmitting(true);
    try {
      const res = await fetch('/api/sellers/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: sellerProfile?.id,
          cac_number: cacRegNumber,
          document_url: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400'
        })
      });
      if (res.ok) {
        alert('CAC Documents uploaded and logged to secure bucket system. Verification status updated to pending!');
        setCacRegNumber('');
        // Reload seller
        if (sellerProfile) {
          const sRes = await fetch(`/api/sellers/${sellerProfile.id}`);
          const sData = await sRes.json();
          setSellerProfile(sData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCacSubmitting(false);
    }
  };

  // Start Secure direct Chat / Inquiry Lead
  const handleInquireChat = async (listingId: string) => {
    try {
      const res = await fetch('/api/leads/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          buyer_id: currentUser?.id,
          message: `Hello! We are inquiring regarding your listed medical equipment. Is this unit still available and does it carry diagnostic warranty?`
        })
      });
      if (res.ok) {
        // Switch to the leads CRM page where they can chat in real-time!
        setActiveTab('leads');
      } else {
        alert('Failed to initialize platform chat. Verify you are logged in as a valid Operator.');
      }
    } catch (err) {
      console.error('Failed to initiate direct inquiry:', err);
    }
  };

  // Listen to search/tab adjustments
  useEffect(() => {
    fetchListings();
  }, [selectedCategory, selectedState, selectedCondition, activeTab]);

  useEffect(() => {
    fetchAvailableUsers();
  }, [currentUser?.id]);

  useEffect(() => {
    fetchNotifications(currentUser?.id);
    const interval = setInterval(() => {
      fetchNotifications(currentUser?.id);
    }, 6000); // Polling for live notification updates
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans">
      
      {/* 1. TOP HEADER BANNER: Alerts indicating logged email */}
      <div className="bg-indigo-600 text-white px-4 py-2.5 text-xs font-semibold flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-indigo-700 shadow-sm relative z-50">
        <div className="flex items-center gap-2 flex-wrap justify-center text-center">
          <span className="bg-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white">
            Active Operator Workspace
          </span>
          <span className="text-[11px]">
            Logged in as <strong>{currentUser.email}</strong>
          </span>
          <span className="text-indigo-300">|</span>
          <div className="flex items-center gap-1.5 bg-indigo-950/20 px-2 py-0.5 rounded-lg border border-indigo-500/20">
            <span className="text-indigo-200 text-[10px]">Actor Node:</span>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const targetId = e.target.value;
                if (targetId === 'REGISTER_NEW') {
                  setShowRegistrationModal(true);
                  return;
                }
                const found = availableUsers.find(u => u.id === targetId);
                if (found) {
                  setCurrentUser({
                    id: found.id,
                    email: found.email,
                    role: found.role,
                    businessName: found.businessName || found.email,
                    phone: found.phone
                  });
                }
              }}
              className="bg-indigo-800 text-white font-extrabold text-[10.5px] rounded border border-indigo-500/30 px-1 py-0.5 focus:ring-0 focus:outline-none cursor-pointer animate-pulse-slow"
            >
              {(availableUsers.length > 0 ? availableUsers : [
                { id: 'usr-3', role: 'admin', displayName: 'Clinical Moderator (Michael)' },
                { id: 'usr-5', role: 'buyer', displayName: 'Hospital Purchaser (Fatima)' },
                { id: 'usr-1', role: 'seller', displayName: 'Equipment Dealer (Chidi Obi)' }
              ]).map(u => (
                <option key={u.id} value={u.id}>
                  {u.role === 'admin' ? '🛡️' : u.role === 'buyer' ? '🏥' : '🚚'} {u.displayName}
                </option>
              ))}
              <option value="REGISTER_NEW" className="font-extrabold text-indigo-300">✨ Register New Operator Node...</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Trigger */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (unreadNotifCount > 0) handleClearNotifications();
              }}
              className="relative p-1.5 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] h-4 w-4 rounded-full flex items-center justify-center animate-bounce shadow-xs">
                  {unreadNotifCount}
                </span>
              )}
              <span className="text-[11px] font-bold">Alert Feed</span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-150 rounded-2xl shadow-xl p-4 text-slate-800 space-y-3 z-50">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Notification Cloud (Real-time DB)</h4>
                  <button 
                    onClick={handleClearNotifications}
                    className="text-[10px] text-indigo-600 hover:underline font-bold"
                  >
                    Dismiss All
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {notifications.map(n => (
                    <div key={n.id} className="p-2.5 rounded-xl text-xs bg-slate-50 border border-slate-100 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 uppercase text-[9px] text-indigo-600">{n.type.replace('_', ' ')}</span>
                        <span className="text-[9px] text-slate-400">{new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="font-medium text-[11px] leading-snug">{n.message}</p>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs">No active alerts. Use the RFQ hub or publish with AI to trigger logs.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <span className="text-indigo-200">|</span>
          <span className="font-mono text-[10px] bg-indigo-900 border border-indigo-800 px-2 py-0.5 rounded text-indigo-200">
            Node status: ONLINE (Europe-West2)
          </span>
        </div>
      </div>

      {/* 2. NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-150 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm">
              <Stethoscope className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight block leading-none">
                MediTrade <span className="text-indigo-600 font-extrabold">Africa</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mt-0.5">
                Hospital Equipment & Consumables
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => { setActiveTab('marketplace'); fetchListings(); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'marketplace' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Search Directory
            </button>
            <button
              onClick={() => setActiveTab('ai_magic')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ai_magic' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span>WhatsApp AI AI-assisted</span>
            </button>
            <button
              onClick={() => setActiveTab('procure')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'procure' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-4 w-4 text-indigo-650" />
              <span>Hospital Procurement RFQs</span>
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'leads' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="h-4 w-4 text-indigo-650" />
              <span>Leads & Direct Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pricing' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              SaaS Plans & Subscription
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Moderator Control Desk</span>
            </button>
            <button
              onClick={() => setActiveTab('devops')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'devops' ? 'bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-100' : 'text-slate-600 hover:text-indigo-700 hover:bg-slate-50'
              }`}
            >
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>GCP Cloud IaC Deployment</span>
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('ai_magic')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Bulk WhatsApp Auto-Import</span>
            </button>
            
            <UserProfileMenu 
              currentUser={currentUser} 
              onUserChange={setCurrentUser} 
              availableUsers={availableUsers}
              onTriggerRegister={() => setShowRegistrationModal(true)}
            />
          </div>
        </div>

        {/* Small screen role selection tab alerts */}
        <div className="lg:hidden bg-slate-100 flex overflow-x-auto justify-start border-t border-slate-200">
          <button onClick={() => setActiveTab('marketplace')} className={`px-4 py-3.5 text-xs font-bold whitespace-nowrap cursor-pointer ${activeTab === 'marketplace' ? 'border-b-2 border-indigo-600 text-indigo-600' : ''}`}>Directory</button>
          <button onClick={() => setActiveTab('ai_magic')} className={`px-4 py-3.5 text-xs font-bold whitespace-nowrap cursor-pointer ${activeTab === 'ai_magic' ? 'border-b-2 border-indigo-600 text-indigo-600' : ''}`}>WhatsApp Import</button>
          <button onClick={() => setActiveTab('procure')} className={`px-4 py-3.5 text-xs font-bold whitespace-nowrap cursor-pointer ${activeTab === 'procure' ? 'border-b-2 border-indigo-600 text-indigo-600' : ''}`}>Hospital RFQs</button>
          <button onClick={() => setActiveTab('leads')} className={`px-4 py-3.5 text-xs font-bold whitespace-nowrap cursor-pointer ${activeTab === 'leads' ? 'border-b-2 border-indigo-600 text-indigo-600' : ''}`}>Leads & Chat</button>
          <button onClick={() => setActiveTab('admin')} className={`px-4 py-3.5 text-xs font-bold whitespace-nowrap cursor-pointer ${activeTab === 'admin' ? 'border-b-2 border-indigo-600 text-indigo-600' : ''}`}>Moderation Console</button>
          <button onClick={() => setActiveTab('devops')} className={`px-4 py-3.5 text-xs font-bold whitespace-nowrap cursor-pointer ${activeTab === 'devops' ? 'border-b-2 border-indigo-600 text-indigo-600' : ''}`}>GCP IAC Blueprints</button>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW 1: Directory Marketplace Catalog */}
        {activeTab === 'marketplace' && (
          <div className="space-y-8">
            {/* HERO STATS BAR / PROCUREMENT BANNER STATEMENT */}
            <div className="relative bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-10 overflow-hidden shadow-lg border border-slate-800">
              <div className="absolute -right-20 -bottom-20 opacity-20 transform rotate-12 pointer-events-none">
                <Stethoscope className="h-80 w-80" />
              </div>
              <div className="relative z-10 max-w-2xl space-y-4">
                <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block">
                  A Solution for Disappearing WhatsApp Offers
                </span>
                <h1 className="text-2xl md:text-4xl font-black leading-tight tracking-tight">
                  Europe & Africa Direct Healthcare Procurement Database
                </h1>
                <p className="text-indigo-100 text-xs md:text-sm leading-relaxed text-justify">
                  Sellers of high-end diagnostic machinery (Radiology, MRI, ICU Monitors) and disposable consumables frequently broadcast their products across multiple chat forums. Unfortunately, daily messages are quickly buried, preventing clinicians from searching through historic offerings when critical procurement needs arise. MediTrade transforms unstructured WhatsApp feeds into verified catalog pages indexed for local hospitals.
                </p>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setActiveTab('ai_magic')}
                    className="bg-indigo-600 hover:bg-indigo-700 font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
                  >
                    Paste WhatsApp message
                  </button>
                  <button 
                    onClick={() => setActiveTab('procure')}
                    className="bg-transparent hover:bg-white/10 border border-indigo-200/50 font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
                  >
                    Browse Urgent Patient Demands (Procurement)
                  </button>
                </div>
              </div>
            </div>

            {/* SELLER IDENTITY INTERACTIVE MINI DASHBOARD FOR SCREEN VISITOR */}
            {currentUser?.role !== 'guest' && (
              <div className="bg-white border border-slate-150 rounded-2.5xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure Seller KYC Status</span>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    Your Current Merchant Store: <span className="text-indigo-600 underline">{sellerProfile ? sellerProfile.business_name : 'No Store Connected'}</span>
                    {sellerProfile?.verification_status === 'verified' ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-lg font-bold flex items-center gap-0.5">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verified CAC Badge
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-lg font-bold">
                        Pending CAC Verification
                      </span>
                    )}
                  </h4>
                  <p className="text-slate-500 text-xs">
                    Merchants with an official Corporate Affairs Commission registration badge experience a <strong>3x click rate limit improvement</strong>.
                  </p>
                </div>

                {sellerProfile?.verification_status === 'unverified' && (
                  <form onSubmit={handleCacSubmit} className="flex gap-2 items-center flex-wrap w-full md:w-auto">
                    <input
                      type="text"
                      required
                      maxLength={15}
                      placeholder="Enter CAC Business ID (e.g. RC-1492)"
                      value={cacRegNumber}
                      onChange={(e) => setCacRegNumber(e.target.value)}
                      className="bg-slate-50 border border-slate-250 rounded-lg p-2.5 text-xs w-full sm:w-60 focus:outline-indigo-600/40"
                    />
                    <button
                      type="submit"
                      disabled={isCacSubmitting}
                      className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold px-4 py-2.5 rounded-lg w-full sm:w-auto cursor-pointer"
                    >
                      {isCacSubmitting ? 'Uploading...' : 'Verify Store CAC'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* FEATURED SYSTEMS (HOMEPAGE HIGHLIGHTS) */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-650 animate-pulse" /> Curated Showcase
                  </span>
                  <h2 className="font-extrabold text-slate-900 text-xl tracking-tight">
                    ★ Featured Healthcare Equipment & Systems
                  </h2>
                  <p className="text-slate-500 text-xs font-medium">
                    Premium and high-end diagnostic systems vetted for quality, immediately available for clinic placement.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-slate-100 text-slate-600 font-mono px-3 py-1.5 rounded-lg border border-slate-150 font-bold">
                    Featured Systems: {featuredListings.length}
                  </span>
                </div>
              </div>

              {loadingListings ? (
                <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                  Querying featured systems inventory...
                </div>
              ) : featuredListings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl">
                  No featured items currently published.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {featuredListings.map(item => (
                    <ListingCard
                      key={`featured-${item.id}`}
                      listing={item}
                      onContactClick={handleContactSeller}
                      onReportClick={(id) => setActiveReportId(id)}
                      onInquireChat={handleInquireChat}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ACCESS CONTROLLED FULL CATALOGUE SECTION */}
            {currentUser?.role !== 'guest' ? (
              <div className="space-y-8 pt-4">
                {/* HIGH-OCTANE CATEGORY NAVIGATION JUMBO CHIPS */}
                <div>
                  <span className="text-[11px] font-black uppercase text-slate-400 block tracking-widest mb-3">
                    Jump to Professional Category
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        selectedCategory === '' 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-600/40'
                      }`}
                    >
                      All Categories ({listings.length})
                    </button>
                    {CATEGORIES.filter(c => !c.parent_id).map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                          selectedCategory === c.id 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-600/40'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ADVANCED MULTI-OPTIONS SEARCH BAR & FILTERS */}
                <div className="bg-white border border-slate-150 p-5 rounded-3xl shadow-xs space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-5 relative">
                      <Search className="absolute left-3.5 top-3.5 text-slate-400 h-4.5 w-4.5" />
                      <input
                        type="text"
                        placeholder="Search by diagnostic brand, specific models (Mindray, Voluson, Ultrasound, Autoclaves, Gloves...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-xs focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                      />
                    </div>

                    {/* State selector */}
                    <div className="lg:col-span-3">
                      <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      >
                        <option value="">All Nigerian States (Port Location)</option>
                        {NIGERIAN_STATES.map(st => (
                          <option key={st} value={st}>{st} State</option>
                        ))}
                      </select>
                    </div>

                    {/* Condition selector */}
                    <div className="lg:col-span-2">
                      <select
                        value={selectedCondition}
                        onChange={(e) => setSelectedCondition(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-xs text-slate-600 focus:outline-none"
                      >
                        <option value="">All Conditions</option>
                        <option value="new">Brand New (Tear Rubber)</option>
                        <option value="refurbished">Refurbished</option>
                        <option value="used">Used / Pre-Owned</option>
                      </select>
                    </div>

                    {/* Apply execution triggers */}
                    <button
                      onClick={fetchListings}
                      className="lg:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-bold text-xs cursor-pointer shadow-xs transition-colors"
                    >
                      Reload Listings
                    </button>
                  </div>
                </div>

                {/* DYNAMIC LISTINGS TIMELINE GRID */}
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-extrabold text-indigo-600 text-lg tracking-tight">
                      {selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory)?.name : 'Latest Marketplace Offerings'}
                    </h3>
                    <span className="text-xs text-slate-400 font-bold">
                      Matches found: {listings.length}
                    </span>
                  </div>

                  {loadingListings ? (
                    <div className="py-20 text-center text-xs text-slate-400 animate-pulse">Loading verified medical systems catalog indexes...</div>
                  ) : (
                    <>
                      {listings.length === 0 ? (
                        <div className="p-12 border border-dashed border-slate-200 rounded-3xl text-center bg-slate-50/50">
                          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                          <h4 className="font-bold text-slate-800 text-sm mb-1">No Active Listings found</h4>
                          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-4">
                            We couldn't locate any machinery listings matching those specific criteria. Try resetting state parameters or import some with AI.
                          </p>
                          <button 
                            onClick={() => { setSelectedCategory(''); setSelectedState(''); setSelectedCondition(''); setSearchQuery(''); }}
                            className="text-white bg-indigo-600 px-4 py-2 rounded-xl text-xs font-bold"
                          >
                            Reset Search Filters
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {listings.map(item => (
                            <ListingCard
                              key={item.id}
                              listing={item}
                              onContactClick={handleContactSeller}
                              onReportClick={(id) => setActiveReportId(id)}
                              onInquireChat={handleInquireChat}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* GUEST DISCOVER FULL CATALOG LOCK CARD */
              <div className="relative overflow-hidden bg-slate-50 border border-slate-200 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-xs my-6">
                <div className="absolute inset-0 bg-radial-gradient from-indigo-50/10 to-transparent pointer-events-none" />
                <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-xs">
                  <ShieldCheck className="h-8 w-8 text-indigo-650 animate-bounce" />
                </div>
                
                <div className="max-w-2xl mx-auto space-y-3">
                  <span className="bg-rose-105 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                    🔒 Operator Authentication Required
                  </span>
                  <h3 className="font-black text-slate-900 text-xl md:text-2xl tracking-tight leading-tight">
                    Full Sourcing Catalogue Locked
                  </h3>
                  <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-xl mx-auto">
                    To safeguard pricing compliance, maintain medical merchant CAC checks, and shield direct WhatsApp contacts from automated bots, browsing the full database of 350+ products is locked to verified members.
                  </p>
                </div>

                {/* Benefits matrix */}
                <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 text-left">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-150 space-y-1 shadow-2xs">
                    <span className="text-indigo-650 font-black text-xs block">⚡ 350+ Listings</span>
                    <p className="text-[10px] text-slate-400 font-medium leading-normal">Full specifications and calibration metrics unlocked.</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-150 space-y-1 shadow-2xs">
                    <span className="text-indigo-650 font-black text-xs block">💬 Direct Contact</span>
                    <p className="text-[10px] text-slate-400 font-medium leading-normal">Instantly click to chat with medical distributors directly.</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-150 space-y-1 shadow-2xs">
                    <span className="text-indigo-650 font-black text-xs block">📋 Submit RFQs</span>
                    <p className="text-[10px] text-slate-400 font-medium leading-normal">Publish urgent clinical equipment needs to all suppliers.</p>
                  </div>
                </div>

                {/* Direct switch triggers */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 pt-4">
                  <button 
                    onClick={() => setShowRegistrationModal(true)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span>Register New Account Node</span>
                  </button>
                  <div className="text-xs text-slate-400 font-bold shrink-0">or Quick Login:</div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentUser({
                        id: 'usr-5',
                        email: 'buyer@riversidememorial.org',
                        role: 'buyer',
                        displayName: 'Hospital Purchaser (Fatima)',
                        businessName: 'Riverside Memorial Hospital',
                        phone: '+2348055554444'
                      })}
                      className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                    >
                      🏥 Purchaser Fatima
                    </button>
                    <button 
                      onClick={() => setCurrentUser({
                        id: 'usr-1',
                        email: 'chidi.obi@medlink.com.ng',
                        role: 'seller',
                        displayName: 'Equipment Dealer (Chidi Obi)',
                        businessName: 'MedLink Diagnostics Ltd',
                        phone: '+2348031234567'
                      })}
                      className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                    >
                      🚚 Dealer Chidi Obi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STATS BOARD FOOTER INFO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900 text-[#DFE7E6] rounded-3xl p-8 border border-slate-800 shadow-md">
              <div className="space-y-1">
                <span className="text-2xl font-black text-emerald-400 block">₦18.5M</span>
                <span className="text-xs font-bold uppercase tracking-wider block text-slate-300">Average G.E Medical Machine Saving</span>
                <p className="text-slate-400 text-[11px]">Hospitals in Abuja FCT save on average 48% by purchase of verified refurbished diagnostic components.</p>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-black text-emerald-400 block">&lt; 4 Hours</span>
                <span className="text-xs font-bold uppercase tracking-wider block text-slate-300">Average Sourcing Turnaround</span>
                <p className="text-slate-400 text-[11px]">Direct WhatsApp Click callbacks avoid cold sales desks, shifting lead times directly into immediate deliveries.</p>
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-black text-emerald-400 block">100% Secure Auditing</span>
                <span className="text-xs font-bold uppercase tracking-wider block text-slate-300">GCP Verifications</span>
                <p className="text-slate-400 text-[11px]">All uploaded images are backed safely on private Cloud Storage with automatic spam diagnostic checks.</p>
              </div>
            </div>

            {/* HOW IT WORKS EDUCATION AND BRAND TRUST BUILDERS */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h3 className="font-extrabold text-slate-900 text-xl tracking-tight">Structured Sourcing for Hospital Procurement</h3>
                <p className="text-slate-500 text-xs">Transform chaotic and transient WhatsApp medical supply postings into a permanent clinical database.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/60 card">
                  <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm mb-3.5">
                    1
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1.5 uppercase tracking-wider">
                    Copy and Paste WhatsApp Ad
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Paste raw broadcast messages containing model typos, prices, and locations into the Gemini AI converter tool.
                  </p>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/60 card">
                  <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm mb-3.5">
                    2
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1.5 uppercase tracking-wider">
                    Vetted by Admin Moderation
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Our administrative team instantly audits the extracted clinical catalog data against known fraud/spam metrics.
                  </p>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/60 card">
                  <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm mb-3.5">
                    3
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1.5 uppercase tracking-wider">
                    Hospitals search & Click Contact
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Clinics quickly locate required patient monitors, bidding under immediate delivery templates directly on WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: AI Magic Paste Portal */}
        {activeTab === 'ai_magic' && (
          currentUser?.role === 'guest' ? (
            <TabGuestRestrictionNotice 
              tabName="AI WhatsApp Sourcing Extractor" 
              onTriggerRegister={() => setShowRegistrationModal(true)} 
              onFastLogin={setCurrentUser} 
            />
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-md">
                <h2 className="font-black text-xl flex items-center gap-2">
                  <Sparkles className="h-5.5 w-5.5 text-emerald-400 animate-pulse" />
                  Intelligent Medical Trade Extraction
                </h2>
                <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed text-justify">
                  Paste raw unstructured hospital supply announcements scraped from busy WhatsApp merchant directories. Google <strong>Gemini-3.5-flash</strong> will scan the message block, isolate specific metrics (titles, locations, prices, contact digits), clean language, evaluate duplicate postings, and output listing specifications in clean JSON format.
                </p>
              </div>

              <AIDashboard 
                sellerId={sellerProfile?.id || 'sel-1'} 
                onListingPublished={() => {
                  setActiveTab('marketplace');
                  fetchListings();
                }} 
              />
            </div>
          )
        )}

        {/* VIEW 3: Procurement / RFQ Board */}
        {activeTab === 'procure' && (
          currentUser?.role === 'guest' ? (
            <TabGuestRestrictionNotice 
              tabName="Hospital Sourcing Requests (RFQ)" 
              onTriggerRegister={() => setShowRegistrationModal(true)} 
              onFastLogin={setCurrentUser} 
            />
          ) : (
            <div className="space-y-6">
              <ProcurementHub categories={CATEGORIES} sellerId={sellerProfile?.id || 'sel-1'} userId={currentUser?.id} />
            </div>
          )
        )}

        {/* VIEW 3.5: Leads and Direct Chat CRM */}
        {activeTab === 'leads' && (
          currentUser?.role === 'guest' ? (
            <TabGuestRestrictionNotice 
              tabName="Interactive Discussion Threads & CRM Leads" 
              onTriggerRegister={() => setShowRegistrationModal(true)} 
              onFastLogin={setCurrentUser} 
            />
          ) : (
            <div className="space-y-6">
              <LeadsDashboard currentUserId={currentUser?.id} currentUserRole={currentUser?.role} />
            </div>
          )
        )}

        {/* VIEW 4: Admin Controls */}
        {activeTab === 'admin' && (
          currentUser?.role === 'guest' ? (
            <TabGuestRestrictionNotice 
              tabName="Administrative Command Center" 
              onTriggerRegister={() => setShowRegistrationModal(true)} 
              onFastLogin={setCurrentUser} 
            />
          ) : (
            <div className="space-y-6">
              <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-md">
                <h2 className="font-black text-xl flex items-center gap-2">
                  <ShieldCheck className="h-5.5 w-5.5 text-white" />
                  Administrative Command Centre
                </h2>
                <p className="text-xs text-indigo-100 mt-1 max-w-xl">
                  Authorize pending review equipment listings, confirm healthcare seller corporate registration certifications (CAC documents), view system logs, and inspect Cloud SQL snapshot queries.
                </p>
              </div>

              <AdminPanel onRefresh={fetchListings} />
            </div>
          )
        )}

        {/* VIEW 5: DevOps Deploy IaC blueprints */}
        {activeTab === 'devops' && (
          currentUser?.role === 'guest' ? (
            <TabGuestRestrictionNotice 
              tabName="IaC Blueprint Sizing Guide" 
              onTriggerRegister={() => setShowRegistrationModal(true)} 
              onFastLogin={setCurrentUser} 
            />
          ) : (
            <div className="space-y-6">
              <WorkspaceCloudGuide />
            </div>
          )
        )}

        {/* VIEW 6: Pricing / SaaS details */}
        {activeTab === 'pricing' && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="font-black text-slate-900 text-2xl tracking-tight">Sellers & Distributors Subscriptions</h2>
              <p className="text-slate-550 text-xs">Choose the right path for your medical distributions channel. Boost search index prioritization and automate CAC Corporate Trust badge assignments.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isPaid = plan.price_monthly > 0;
                return (
                  <div key={plan.id} className={`bg-white border border-slate-150 rounded-3xl p-6 shadow-xs flex flex-col justify-between h-full relative ${plan.badge ? 'border-2 border-indigo-600' : ''}`}>
                    {plan.badge && (
                      <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                        {plan.badge} Preferred
                      </span>
                    )}

                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{plan.name}</h4>
                      <div className="my-4 flex items-baseline">
                        <span className="text-3xl font-black text-slate-900">
                          ₦{(plan.price_monthly).toLocaleString()}
                        </span>
                        {isPaid && <span className="text-xs text-slate-400 font-bold">/ month</span>}
                      </div>

                      <ul className="space-y-3 pt-4 border-t border-slate-100">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start text-slate-600 text-xs">
                            <CheckCircle className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert(`Billing system initialized! Mapped references set for ${plan.name}. Proceeding to configure webhook listeners.`)}
                      className={`w-full mt-6 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        plan.badge 
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {plan.price_monthly === 0 ? 'Activate Free Account' : 'Choose Plan (Paystack Gateways)'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* 4. MODALS AND OVERLAYS */}
      {activeReportId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border shadow-2xl relative space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 uppercase text-rose-700">
              <AlertTriangle className="h-5 w-5" /> Report Listing
            </h4>
            <p className="text-xs text-slate-500">
              If this equipment contains fraudulent pricing, stolen CAC certificates or suspicious details, submit your report to moderators here.
            </p>

            {showReportSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-medium text-center">
                Report uploaded successfully! Back to safety...
              </div>
            ) : (
              <form onSubmit={handleReportListing} className="space-y-4">
                <textarea
                  required
                  rows={4}
                  placeholder="Provide clinical details regarding mispricing or suspicious numbers..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs w-full focus:outline-rose-500/40"
                />
                
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveReportId(null)}
                    className="px-4 py-2 border rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Submit Abuse Ticket
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. FOOTER ARCHITECTURE */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <span className="font-extrabold text-white text-base tracking-tight block">
                MediTrade <span className="text-emerald-400">Africa</span>
              </span>
              <p className="text-xs leading-relaxed max-w-xs">
                Transforming unstructured WhatsApp medical equipment trading chats into structured, clinical visual listings in Africa.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-xs text-white uppercase tracking-wider block mb-3">Core Modules</h5>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => { setActiveTab('marketplace'); }} className="hover:text-white transition-colors">Directory Search Index</button></li>
                <li><button onClick={() => setActiveTab('ai_magic')} className="hover:text-white transition-colors">WhatsApp AI Importer</button></li>
                <li><button onClick={() => setActiveTab('procure')} className="hover:text-white transition-colors">Hospital Procurement Hub</button></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-xs text-white uppercase tracking-wider block mb-3">SaaS Security</h5>
              <ul className="space-y-2 text-xs">
                <li><button onClick={() => setActiveTab('pricing')} className="hover:text-white transition-colors">Paystack Verification Plans</button></li>
                <li><button onClick={() => setActiveTab('admin')} className="hover:text-white transition-colors">Clinical Moderation Review Bench</button></li>
                <li><button onClick={() => setActiveTab('devops')} className="hover:text-white transition-colors">Terraform IaC Configurations</button></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-xs text-white uppercase tracking-wider block mb-3">West African Nodes</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Platform hosted dynamically in Europe-West2 Cloud Run containers. Low-latency edge databases cached locally in Lagos, Abuja FCT and Accra.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-center text-xs flex flex-col sm:flex-row justify-between items-center gap-4">
            <span>© 2026 MediTrade Africa. All medical equipment trademarks, brand labels and CAC certifications verified autonomously under Google AI.</span>
            <div className="flex gap-4 font-mono text-[10px]">
              <span>DB: PostgreSQL 15</span>
              <span>GCP Run Rev: v1.4-rc1</span>
            </div>
          </div>
        </div>
      </footer>
      
      <RegistrationModal 
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onRegisterSuccess={(newUser) => {
          // Switch active operator instantly to new workspace
          setCurrentUser(newUser);
          fetchAvailableUsers();
        }}
      />

    </div>
  );
}
