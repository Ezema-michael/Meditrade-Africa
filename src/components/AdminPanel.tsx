/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, CheckCircle, XCircle, AlertTriangle, Layers, Database, 
  BarChart2, Bell, FileText, RefreshCw, Search, Eye, TrendingUp, 
  Users, Package, Phone, MousePointer, Filter, Edit, Trash2, 
  Star, Check, ExternalLink, Activity, MessageSquare, ArrowUpRight,
  ChevronRight, Building2, MapPin, DollarSign, Tag, Info
} from 'lucide-react';

interface AdminPanelProps {
  onRefresh?: () => void;
}

export default function AdminPanel({ onRefresh }: AdminPanelProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'vendors' | 'equipments' | 'analytics' | 'insights' | 'kyc' | 'reports' | 'logs' | 'db'
  >('vendors');

  // Vendor Management State
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorStatusFilter, setVendorStatusFilter] = useState('');

  // Equipment Management State
  const [allEquipments, setAllEquipments] = useState<any[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentStatusFilter, setEquipmentStatusFilter] = useState('');
  const [equipmentConditionFilter, setEquipmentConditionFilter] = useState('');
  const [editingEquipment, setEditingEquipment] = useState<any | null>(null);

  // Engagement & Clicks Telemetry State
  const [engagementData, setEngagementData] = useState<any>(null);

  // Search Insights
  const [searchInsights, setSearchInsights] = useState<any>(null);

  // Pending lists & Moderation
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [pendingSellers, setPendingSellers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [schemaSnap, setSchemaSnap] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // General dashboard metrics
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }

      // Vendors overview
      const vRes = await fetch('/api/admin/vendors');
      if (vRes.ok) {
        const vData = await vRes.json();
        setVendors(vData);
      }

      // Equipments inventory
      const eRes = await fetch('/api/admin/equipments');
      if (eRes.ok) {
        const eData = await eRes.json();
        setAllEquipments(eData);
      }

      // Engagement Analytics (Views, WhatsApp clicks, Call clicks, Actions)
      const engRes = await fetch('/api/admin/engagement-analytics');
      if (engRes.ok) {
        const engData = await engRes.json();
        setEngagementData(engData);
      }

      // Search Insights
      const siRes = await fetch('/api/admin/search-insights');
      if (siRes.ok) {
        const siData = await siRes.json();
        setSearchInsights(siData);
      }

      // Pending verification lists
      const plRes = await fetch('/api/admin/listings/pending');
      if (plRes.ok) setPendingListings(await plRes.json());

      const psRes = await fetch('/api/admin/sellers/pending-verification');
      if (psRes.ok) setPendingSellers(await psRes.json());

      const rRes = await fetch('/api/admin/reports');
      if (rRes.ok) setReports(await rRes.json());

      const schRes = await fetch('/api/diagnostics/schema');
      if (schRes.ok) setSchemaSnap(await schRes.json());

      const catRes = await fetch('/api/categories');
      if (catRes.ok) setCategories(await catRes.json());

    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Vendor Action Handlers
  const handleUpdateVendorStatus = async (id: string, status?: string, verificationStatus?: string) => {
    try {
      const res = await fetch(`/api/admin/vendors/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, verification_status: verificationStatus })
      });
      if (res.ok) {
        alert('Vendor record status updated successfully!');
        fetchAdminData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVendor = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove merchant store "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Vendor profile deleted.');
        fetchAdminData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Equipment Action Handlers
  const handleApproveListing = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/listings/${id}/approve`, { method: 'PATCH' });
      if (res.ok) {
        alert('Listing has been officially approved and published!');
        fetchAdminData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectListing = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/listings/${id}/reject`, { method: 'PATCH' });
      if (res.ok) {
        alert('Listing rejected.');
        fetchAdminData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const res = await fetch(`/api/admin/equipments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !currentFeatured })
      });
      if (res.ok) {
        fetchAdminData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEquipment = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete equipment listing "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/equipments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Equipment item deleted from system.');
        fetchAdminData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEquipmentEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment) return;
    try {
      const res = await fetch(`/api/admin/equipments/${editingEquipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEquipment)
      });
      if (res.ok) {
        alert('Equipment details updated successfully!');
        setEditingEquipment(null);
        fetchAdminData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifySeller = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/sellers/${id}/verify`, { method: 'PATCH' });
      if (res.ok) {
        alert('Seller approved! Verified Shield badge awarded to business store.');
        fetchAdminData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveReport = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${id}/resolve`, { method: 'PATCH' });
      if (res.ok) {
        alert('Report resolved.');
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Vendors List
  const filteredVendors = vendors.filter(v => {
    const matchesSearch = 
      v.business_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.contact_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      (v.state && v.state.toLowerCase().includes(vendorSearch.toLowerCase())) ||
      (v.cac_number && v.cac_number.toLowerCase().includes(vendorSearch.toLowerCase()));
    
    const matchesStatus = !vendorStatusFilter || 
      (vendorStatusFilter === 'verified' && v.verification_status === 'verified') ||
      (vendorStatusFilter === 'pending' && v.verification_status === 'pending') ||
      (vendorStatusFilter === 'suspended' && (v.status === 'suspended' || v.user_status === 'suspended'));
    
    return matchesSearch && matchesStatus;
  });

  // Filtered Equipments List
  const filteredEquipments = allEquipments.filter(e => {
    const matchesSearch = 
      e.title.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
      (e.brand && e.brand.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
      (e.model && e.model.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
      (e.seller_business_name && e.seller_business_name.toLowerCase().includes(equipmentSearch.toLowerCase()));

    const matchesStatus = !equipmentStatusFilter || e.status === equipmentStatusFilter;
    const matchesCondition = !equipmentConditionFilter || e.condition === equipmentConditionFilter;

    return matchesSearch && matchesStatus && matchesCondition;
  });

  if (loading && !metrics) {
    return (
      <div className="py-16 text-center text-xs font-semibold text-slate-500 space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
        <p>Loading administrative operations and management telemetry console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Metrics Board Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Vendors</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-slate-900">{vendors.length || metrics?.total_sellers || 3}</span>
          <span className="text-[10px] text-emerald-600 font-bold mt-1">
            {vendors.filter(v => v.verification_status === 'verified').length} Verified
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Equipments</span>
            <Package className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-slate-900">{allEquipments.length || metrics?.total_listings || 5}</span>
          <span className="text-[10px] text-indigo-600 font-bold mt-1">
            {allEquipments.filter(e => e.status === 'published').length} Active Live
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Views</span>
            <Eye className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-blue-700">
            {engagementData?.total_views || allEquipments.reduce((s, e) => s + (e.view_count || 0), 0)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-1">Page Impressions</span>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between bg-emerald-50/20 border-emerald-100">
          <div className="flex justify-between items-center text-emerald-700 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">WhatsApp Clicks</span>
            <Phone className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700">
            {engagementData?.total_whatsapp_clicks || allEquipments.reduce((s, e) => s + (e.whatsapp_click_count || 0), 0)}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold mt-1">Direct Leads</span>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Call Inquiries</span>
            <Phone className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-indigo-800">
            {engagementData?.total_call_clicks || allEquipments.reduce((s, e) => s + (e.phone_click_count || 0), 0)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-1">Direct Calls</span>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Pending Rev.</span>
            <Shield className="h-4 w-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-600">{pendingListings.length}</span>
          <span className="text-[10px] text-amber-600 font-medium mt-1">Awaiting Vetting</span>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex flex-col justify-between bg-rose-50/20 border-rose-100/50">
          <div className="flex justify-between items-center text-rose-600 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Flags & Reports</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <span className="text-2xl font-black text-rose-700">{reports.length}</span>
          <span className="text-[10px] text-rose-600 font-medium mt-1">Action Required</span>
        </div>

      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Left Side Navigation Switches */}
        <div className="bg-slate-50 border border-slate-200/70 rounded-3xl p-3.5 flex flex-col gap-1 xl:col-span-1 shadow-2xs">
          <span className="text-[10px] uppercase font-black text-slate-400 px-3 py-2 block border-b border-slate-200/60 tracking-wider">
            Management Modules
          </span>

          <button
            onClick={() => setActiveTab('vendors')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'vendors' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Vendors & Merchants
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
              activeTab === 'vendors' ? 'bg-white text-indigo-600' : 'bg-slate-200 text-slate-700'
            }`}>
              {vendors.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('equipments')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'equipments' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Equipment Inventory
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
              activeTab === 'equipments' ? 'bg-white text-indigo-600' : 'bg-slate-200 text-slate-700'
            }`}>
              {allEquipments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <MousePointer className="h-4 w-4" /> Views, Clicks & Actions
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black uppercase">
              Live
            </span>
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'insights' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" /> Sourcing Search Telemetry
            </span>
          </button>

          <div className="my-2 border-t border-slate-200/60"></div>

          <span className="text-[10px] uppercase font-black text-slate-400 px-3 py-1 block tracking-wider">
            Verification & Safety
          </span>

          <button
            onClick={() => setActiveTab('kyc')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'kyc' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> Seller CAC Verification
            </span>
            {pendingSellers.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-bold">
                {pendingSellers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Flagged Listing Reports
            </span>
            {reports.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-bold">
                {reports.length}
              </span>
            )}
          </button>

          <div className="my-2 border-t border-slate-200/60"></div>

          <span className="text-[10px] uppercase font-black text-slate-400 px-3 py-1 block tracking-wider">
            System Diagnostics
          </span>

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <Layers className="h-4 w-4" /> Audit Activity Trails
          </button>

          <button
            onClick={() => setActiveTab('db')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'db' ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <Database className="h-4 w-4" /> Cloud SQL Relational Schema
          </button>

          <button
            onClick={fetchAdminData}
            className="w-full text-center mt-3 bg-slate-200/80 hover:bg-slate-200 text-slate-800 text-xs font-extrabold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Cloud State
          </button>
        </div>

        {/* Right Side Tab Views */}
        <div className="xl:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
          
          {/* ======================================================== */}
          {/* TAB 1: VENDORS MANAGEMENT OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === 'vendors' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-600" /> Vendor Store Management & CRM Controls
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Complete oversight of equipment dealers, bio-medical suppliers, and corporate stores registered across Nigeria.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search vendor name, state, CAC..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-600 w-48 md:w-60"
                    />
                  </div>

                  {/* Filter select */}
                  <select
                    value={vendorStatusFilter}
                    onChange={(e) => setVendorStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-600"
                  >
                    <option value="">All Statuses</option>
                    <option value="verified">Verified CAC Badge</option>
                    <option value="pending">Pending KYC Review</option>
                    <option value="suspended">Suspended Accounts</option>
                  </select>
                </div>
              </div>

              {/* Vendors List Cards */}
              <div className="space-y-4">
                {filteredVendors.length === 0 ? (
                  <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center">
                    <span className="text-slate-400 text-xs font-medium">No vendors matched your query criteria.</span>
                  </div>
                ) : (
                  filteredVendors.map((v) => (
                    <div key={v.id} className="p-5 border border-slate-200/80 rounded-2xl hover:border-indigo-200 transition-all bg-slate-50/30 space-y-4">
                      
                      {/* Top Header */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-slate-900 text-sm">{v.business_name}</h4>
                            {v.verification_status === 'verified' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-md flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-emerald-600" /> CAC Verified
                              </span>
                            ) : v.verification_status === 'pending' ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-md">
                                Pending KYC
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-md">
                                Unverified
                              </span>
                            )}

                            {v.status === 'suspended' && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black uppercase rounded-md">
                                Suspended
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-1 flex-wrap">
                            <span className="flex items-center gap-1"><Users className="h-3 w-3 text-slate-400" /> Contact: {v.contact_name}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-400" /> {v.city || 'Lagos'}, {v.state || 'Lagos'} State</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" /> {v.whatsapp_number}</span>
                          </div>
                        </div>

                        {/* Direct Vendor Management Actions */}
                        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                          {v.verification_status !== 'verified' && (
                            <button
                              onClick={() => handleUpdateVendorStatus(v.id, 'active', 'verified')}
                              className="px-3 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <Shield className="h-3.5 w-3.5" /> Award Verified Badge
                            </button>
                          )}

                          {v.status === 'suspended' ? (
                            <button
                              onClick={() => handleUpdateVendorStatus(v.id, 'active', v.verification_status)}
                              className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
                            >
                              Reactivate Account
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateVendorStatus(v.id, 'suspended', v.verification_status)}
                              className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-bold cursor-pointer transition-all"
                            >
                              Suspend Store
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteVendor(v.id, v.business_name)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-all cursor-pointer"
                            title="Delete vendor profile"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Performance Metrics Bar for Vendor */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-3 rounded-xl border border-slate-150">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Equipment Listed</span>
                          <span className="text-sm font-black text-slate-900">{v.total_listings || 0} items</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Published Active</span>
                          <span className="text-sm font-black text-emerald-700">{v.published_listings || 0} live</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Equipment Views</span>
                          <span className="text-sm font-black text-blue-700">{v.total_views || 0} views</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">WhatsApp Contacts</span>
                          <span className="text-sm font-black text-emerald-700">{v.total_whatsapp_clicks || 0} clicks</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">RFQ Bids Placed</span>
                          <span className="text-sm font-black text-indigo-700">{v.total_rfq_bids || 0} quotes</span>
                        </div>
                      </div>

                      {/* CAC info note */}
                      {v.cac_number && (
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                          <span className="font-bold text-slate-700">CAC Registration #:</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-extrabold text-slate-800">{v.cac_number}</span>
                        </div>
                      )}

                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: EQUIPMENT INVENTORY MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'equipments' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-600" /> Equipment Listings Master Desk
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage, edit, approve, feature, or remove clinical medical devices uploaded across Nigeria.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search title, brand, merchant..."
                      value={equipmentSearch}
                      onChange={(e) => setEquipmentSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-600 w-44 md:w-56"
                    />
                  </div>

                  <select
                    value={equipmentStatusFilter}
                    onChange={(e) => setEquipmentStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-600"
                  >
                    <option value="">All Statuses</option>
                    <option value="published">Published Live</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="rejected">Rejected / Revoked</option>
                    <option value="draft">Drafts</option>
                  </select>

                  <select
                    value={equipmentConditionFilter}
                    onChange={(e) => setEquipmentConditionFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-600"
                  >
                    <option value="">All Conditions</option>
                    <option value="new">Brand New</option>
                    <option value="foreign_used">Foreign Used (Tokunbo)</option>
                    <option value="local_used">Local Used (Nigerian)</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="working_used">Working Used</option>
                    <option value="faulty">Faulty (Needs Repair)</option>
                    <option value="scrap">Scrap/Salvage</option>
                  </select>
                </div>
              </div>

              {/* Equipments Table / Cards */}
              <div className="space-y-3">
                {filteredEquipments.length === 0 ? (
                  <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center">
                    <span className="text-slate-400 text-xs font-medium">No equipment listings match your filter parameters.</span>
                  </div>
                ) : (
                  filteredEquipments.map((item) => (
                    <div key={item.id} className="p-4 border border-slate-200/80 rounded-2xl hover:border-indigo-200 transition-all bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md ${
                            item.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'pending_review' ? 'bg-amber-100 text-amber-800' :
                            item.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.status === 'published' ? 'Published Live' :
                             item.status === 'pending_review' ? 'Pending Review' : item.status}
                          </span>

                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[9px] font-bold uppercase rounded-md">
                            {item.condition === 'new' ? 'Brand New' :
                             item.condition === 'foreign_used' ? 'Foreign Used (Tokunbo)' :
                             item.condition === 'local_used' ? 'Local Used' :
                             item.condition === 'refurbished' ? 'Refurbished' :
                             item.condition === 'faulty' ? 'Faulty' : item.condition}
                          </span>

                          {item.featured && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded-md flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5 fill-white" /> Featured Highlight
                            </span>
                          )}

                          {item.pending_reports_count > 0 && (
                            <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black uppercase rounded-md">
                              🚩 {item.pending_reports_count} Complaint
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-slate-900 text-sm">{item.title}</h4>

                        <div className="text-[11px] text-slate-500 space-x-3 font-mono flex flex-wrap items-center">
                          <span>Brand: <strong className="text-slate-800">{item.brand}</strong> ({item.model || 'N/A'})</span>
                          <span>•</span>
                          <span>Price: <strong className="text-indigo-700 font-extrabold">₦{Number(item.price).toLocaleString()}</strong></span>
                          <span>•</span>
                          <span>Merchant: <strong className="text-slate-800">{item.seller_business_name}</strong></span>
                          <span>•</span>
                          <span>State: <strong className="text-slate-800">{item.state}</strong></span>
                        </div>

                        {/* Views & Clicks Telemetry Badges */}
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 pt-1">
                          <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                            <Eye className="h-3 w-3" /> {item.view_count || 0} Views
                          </span>
                          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <Phone className="h-3 w-3" /> {item.whatsapp_click_count || 0} WhatsApp Clicks
                          </span>
                          {item.phone_click_count > 0 && (
                            <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              <Phone className="h-3 w-3" /> {item.phone_click_count} Direct Calls
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Equipment Direct Management Action Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap self-end lg:self-auto">
                        {item.status === 'pending_review' && (
                          <button
                            onClick={() => handleApproveListing(item.id)}
                            className="px-3 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve Live
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleFeatured(item.id, item.featured)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 border ${
                            item.featured 
                              ? 'bg-amber-100 text-amber-900 border-amber-300' 
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                          title="Toggle featured banner placement"
                        >
                          <Star className={`h-3.5 w-3.5 ${item.featured ? 'fill-amber-600 text-amber-600' : ''}`} />
                          {item.featured ? 'Featured' : 'Feature'}
                        </button>

                        <button
                          onClick={() => setEditingEquipment(item)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Edit className="h-3.5 w-3.5 text-indigo-600" /> Edit Details
                        </button>

                        <button
                          onClick={() => handleDeleteEquipment(item.id, item.title)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-all cursor-pointer"
                          title="Delete equipment listing"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* EDIT EQUIPMENT MODAL */}
          {editingEquipment && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-3 border-b">
                  <h3 className="font-extrabold text-slate-900 text-base">Edit Equipment Listing Parameters</h3>
                  <button
                    onClick={() => setEditingEquipment(null)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                <form onSubmit={handleSaveEquipmentEdits} className="space-y-4 text-xs font-medium">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Equipment Title</label>
                    <input
                      type="text"
                      value={editingEquipment.title}
                      onChange={(e) => setEditingEquipment({ ...editingEquipment, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-hidden focus:border-indigo-600 text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Brand Name</label>
                      <input
                        type="text"
                        value={editingEquipment.brand || ''}
                        onChange={(e) => setEditingEquipment({ ...editingEquipment, brand: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Model / Serial #</label>
                      <input
                        type="text"
                        value={editingEquipment.model || ''}
                        onChange={(e) => setEditingEquipment({ ...editingEquipment, model: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Price (₦ NGN)</label>
                      <input
                        type="number"
                        value={editingEquipment.price}
                        onChange={(e) => setEditingEquipment({ ...editingEquipment, price: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Listing Status</label>
                      <select
                        value={editingEquipment.status}
                        onChange={(e) => setEditingEquipment({ ...editingEquipment, status: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                      >
                        <option value="published">Published Live</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="rejected">Rejected / Hidden</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Equipment Condition</label>
                      <select
                        value={editingEquipment.condition}
                        onChange={(e) => setEditingEquipment({ ...editingEquipment, condition: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                      >
                        <option value="new">Brand New</option>
                        <option value="foreign_used">Foreign Used (Tokunbo)</option>
                        <option value="local_used">Local Used (Nigerian Used)</option>
                        <option value="refurbished">Refurbished Standard</option>
                        <option value="working_used">Working Used</option>
                        <option value="faulty">Faulty (Needs repair)</option>
                        <option value="scrap">Scrap/Salvage</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">State Location</label>
                    <input
                      type="text"
                      value={editingEquipment.state || 'Lagos'}
                      onChange={(e) => setEditingEquipment({ ...editingEquipment, state: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Description</label>
                    <textarea
                      rows={4}
                      value={editingEquipment.description || ''}
                      onChange={(e) => setEditingEquipment({ ...editingEquipment, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setEditingEquipment(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                    >
                      Save Equipment Edits
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: VIEWS, CLICKS & ACTIONS ENGAGEMENT TELEMETRY */}
          {/* ======================================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <MousePointer className="h-5 w-5 text-indigo-600" /> Buyer Views, WhatsApp Clicks & Actions Analytics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time conversion telemetry measuring hospital buyer interest, WhatsApp inquiries, phone calls, and quote requests.
                </p>
              </div>

              {/* Engagement Summary Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Equipment Impressions</span>
                  <span className="text-2xl font-black text-blue-700 mt-1 block">
                    {engagementData?.total_views || 0}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Catalog item views</span>
                </div>

                <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">WhatsApp Inquiries</span>
                  <span className="text-2xl font-black text-emerald-700 mt-1 block">
                    {engagementData?.total_whatsapp_clicks || 0}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">High Intent Direct Leads</span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Direct Phone Calls</span>
                  <span className="text-2xl font-black text-indigo-700 mt-1 block">
                    {engagementData?.total_call_clicks || 0}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Contact reveals</span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">RFQ Bids Placed</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">
                    {engagementData?.total_rfqs || 0}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">Formal tender requests</span>
                </div>
              </div>

              {/* Top Rankings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Most Viewed Equipment */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-700">
                    <Eye className="h-4 w-4" /> Top 10 Most Viewed Equipment Items
                  </h4>
                  <div className="space-y-2">
                    {engagementData?.top_viewed?.map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                        <div className="space-y-0.5 max-w-xs">
                          <span className="font-bold text-slate-800 block truncate">{item.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">₦{Number(item.price).toLocaleString()} • {item.seller_name || 'Dealer'}</span>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md font-black text-xs">
                          {item.view_count || 0} views
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Clicked / Inquired Equipment */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 text-emerald-700">
                    <Phone className="h-4 w-4" /> Top 10 Most Contacted (WhatsApp / Calls)
                  </h4>
                  <div className="space-y-2">
                    {engagementData?.top_clicked?.map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                        <div className="space-y-0.5 max-w-xs">
                          <span className="font-bold text-slate-800 block truncate">{item.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">₦{Number(item.price).toLocaleString()} • {item.seller_name || 'Dealer'}</span>
                        </div>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md font-black text-xs">
                          {(item.whatsapp_click_count || 0) + (item.phone_click_count || 0)} inquiries
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Live Action Telemetry Stream */}
              <div className="p-5 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-indigo-600" /> Live Interaction & Click Telemetry Feed
                  </h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                    Captured Buyer Actions
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {!engagementData?.recent_interactions || engagementData.recent_interactions.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No click events captured yet.</div>
                  ) : (
                    engagementData.recent_interactions.map((act: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-mono flex flex-col md:flex-row justify-between md:items-center gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              act.action_type === 'whatsapp_click' ? 'bg-emerald-100 text-emerald-800' :
                              act.action_type === 'call_click' ? 'bg-indigo-100 text-indigo-800' :
                              act.action_type === 'rfq_submit' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {act.action_type}
                            </span>
                            <span className="font-bold text-slate-800">{act.listing_title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            By: {act.user_info || 'Hospital Purchasing Desk'} • Merchant: {act.seller_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 self-start md:self-auto">
                          {new Date(act.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SOURCING SEARCH INSIGHTS */}
          {/* ======================================================== */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-indigo-600" /> Sourcing Demands & Search Telemetry
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Analyze real-time inquiries made by hospitals, and identify unmet device inventory gaps to invite matching local equipment merchants.
                </p>
              </div>

              {/* Analytics summary rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual section: Unmet Demands */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-650" /> Gaps / Unmet Demands (0 Results)
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Needs Inventory</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Clinical buyers searched for these items, but the current query yielded absolutely zero active merchant listings:
                  </p>

                  {!searchInsights?.unmet_demands || searchInsights.unmet_demands.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No zero-result search terms recorded yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {searchInsights?.unmet_demands.map((u: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center gap-3">
                          <div>
                            <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
                              <span className="text-amber-600">"{u.term}"</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2">
                              <span>Cat: {u.category}</span>
                              <span>•</span>
                              <span>State: {u.state}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-black">{u.count} searches</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Last: {new Date(u.last_searched).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Search Keywords */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> High Sourcing Intents
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Frequency Metrics</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Which medical equipment keywords and device brands are queried most frequently:
                  </p>

                  {!searchInsights?.popular_queries || searchInsights.popular_queries.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">No keyword search queries recorded yet.</div>
                  ) : (
                    <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                      {searchInsights?.popular_queries.map((p: any, idx: number) => {
                        const hitPercent = Math.min(100, Math.round((p.count / (searchInsights.total_searches || 10)) * 100));
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span>"{p.term}"</span>
                              <span>{p.count} hits ({hitPercent}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-indigo-600 h-full rounded-full transition-all" 
                                style={{ width: `${hitPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: CAC SELLER VERIFICATION */}
          {/* ======================================================== */}
          {activeTab === 'kyc' && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base">Seller CAC Verification Desk</h3>
                <p className="text-xs text-indigo-600">Confirm Corporate Affairs Commission registrations documentations to assign Verified Badges to sellers.</p>
              </div>

              {pendingSellers.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center">
                  <span className="text-slate-400 text-xs">No pending Corporate verification files. Verified badges are up to date!</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSellers.map((s: any) => (
                    <div key={s.id} className="p-4 border border-slate-200 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h5 className="font-bold text-slate-800 text-sm">{s.business_name}</h5>
                        <div className="text-[11px] text-slate-500 space-y-0.5 mt-1 font-mono">
                          <div>Contact Officer: {s.contact_name}</div>
                          <div>WhatsApp: {s.whatsapp_number} | Email: {s.email}</div>
                          <div>CAC Registration File No: <span className="font-bold text-slate-900 bg-indigo-50 px-1 py-0.5 rounded-md">{s.cac_number || 'Pending Input'}</span></div>
                        </div>
                        <a
                          href="https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-indigo-600 underline block mt-2"
                        >
                          View Uploaded CAC document.pdf
                        </a>
                      </div>

                      <button
                        onClick={() => handleVerifySeller(s.id)}
                        className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
                      >
                        Approve Corporate KYC Badge
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: FLAGGED LISTING REPORTS */}
          {/* ======================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base">Suspicious Listing Warnings & Safety Flags</h3>
                <p className="text-xs text-slate-400">Moderators review complaints sent anonymously by hospitals regarding mispriced or spam clinical inventory.</p>
              </div>

              {reports.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center">
                  <span className="text-slate-400 text-xs">No reports or warnings active in system. Directory health is good!</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((r: any) => (
                    <div key={r.id} className="p-4 border border-rose-100 bg-rose-50/20 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 text-rose-700 font-bold text-xs uppercase">
                          <AlertTriangle className="h-4 w-4" /> Reported Listing: {r.listing_title || 'Hospital Equipment'}
                        </div>
                        <div className="text-slate-600 text-xs font-mono leading-relaxed bg-white p-3 rounded-xl border border-rose-100">
                          Complaint: "{r.reason}"
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">Report ticket created at {new Date(r.created_at).toLocaleString()}</span>
                      </div>

                      <button
                        onClick={() => handleResolveReport(r.id)}
                        className="bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                      >
                        Resolve Concern / Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: AUDIT ACTIVITY TRAILS */}
          {/* ======================================================== */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base">System Audit Trails & Admin Activity Logging</h3>
                <p className="text-xs text-slate-400 font-mono">Trace GCP VPC events, Gemini API extraction runs, CAC doc evaluations, and WhatsApp clicks tracker endpoints.</p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {metrics?.audit_trail?.map((l: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100/80 font-mono text-[11px] flex justify-between items-start gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600">{l.actor}</span>
                        <span className="bg-slate-200 text-slate-600 px-1 text-[9px] rounded font-semibold">{l.action}</span>
                        <span className="text-slate-400">({l.category})</span>
                      </div>
                      <span className="text-slate-600 text-xs block">{l.description}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 flex-shrink-0">{new Date(l.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 8: CLOUD SQL SCHEMA SNAPSHOT */}
          {/* ======================================================== */}
          {activeTab === 'db' && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base">Cloud SQL - PostgreSQL Database Studio</h3>
                <p className="text-xs text-slate-400">View exact relational SQL schema structures initialized for this Africa-wide Medical Procurement portal.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Current Table Snapshots & Integrity metrics:
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400">TABLE: USERS</div>
                      <div className="text-sm font-black text-slate-800">{schemaSnap?.metrics?.users_count || 5} records</div>
                    </div>
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400">TABLE: SELLERS</div>
                      <div className="text-sm font-black text-slate-800">{schemaSnap?.metrics?.sellers_count || vendors.length} records</div>
                    </div>
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400">TABLE: CATEGORIES</div>
                      <div className="text-sm font-black text-slate-800">{schemaSnap?.metrics?.categories_count || categories.length || 16} records</div>
                    </div>
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400">TABLE: LISTINGS</div>
                      <div className="text-sm font-black text-indigo-600">{schemaSnap?.metrics?.listings_count || allEquipments.length} records</div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl text-[11px] font-mono whitespace-pre overflow-x-auto max-h-72">
                  <div>-- SQL QUERY snapshot: SELECT id, title, price, state FROM listings_table; --</div>
                  {`--------------------------------------------------------------------------------------
 id       |   title                             |   price (₦)  |   state       |  status
--------------------------------------------------------------------------------------`}
                  {schemaSnap?.tables?.listings?.map((l: any, idx: number) => {
                    const padTitle = l.title.padEnd(32).substring(0, 32);
                    const padPrice = l.price.toString().padStart(12);
                    const padState = l.state.padEnd(12).substring(0, 12);
                    return (
                      <div key={idx} className="mt-0.5">
                        {` ${l.id.padEnd(8)} | ${padTitle} | ${padPrice} | ${padState} | ${l.status}`}
                      </div>
                    );
                  })}
                  {`--------------------------------------------------------------------------------------
(Returned ${schemaSnap?.tables?.listings?.length || allEquipments.length} rows dynamically using Cloud SQL PostgreSQL adapter snapshot)`}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
