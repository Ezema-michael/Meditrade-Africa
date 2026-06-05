/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, Layers, Database, BarChart2, Bell, FileText, RefreshCw, LogIn, Search, Eye, TrendingUp } from 'lucide-react';

interface AdminPanelProps {
  onRefresh?: () => void;
}

export default function AdminPanel({ onRefresh }: AdminPanelProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'listings' | 'kyc' | 'reports' | 'insights' | 'db' | 'logs'>('listings');
  const [searchInsights, setSearchInsights] = useState<any>(null);
  
  // Pending lists
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [pendingSellers, setPendingSellers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [schemaSnap, setSchemaSnap] = useState<any>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      setMetrics(data);
      
      const plRes = await fetch('/api/admin/listings/pending');
      const plData = await plRes.json();
      setPendingListings(plData);

      const psRes = await fetch('/api/admin/sellers/pending-verification');
      const psData = await psRes.json();
      setPendingSellers(psData);

      const rRes = await fetch('/api/admin/reports');
      const rData = await rRes.json();
      setReports(rData);

      const schRes = await fetch('/api/diagnostics/schema');
      const schData = await schRes.json();
      setSchemaSnap(schData);

      // Fetch search insights telemetry
      const siRes = await fetch('/api/admin/search-insights');
      const siData = await siRes.json();
      setSearchInsights(siData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveListing = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/listings/${id}/approve`, { method: 'PATCH' });
      if (res.ok) {
        alert('Listing has been officially approved and published for surgical and diagnostic search buyers!');
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
        alert('Listing submission rejected.');
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
        alert('Seller approved! Standard corporate shield verified badge awarded to their business account and listed items.');
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

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading && !metrics) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading administrative operations dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metrics board */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Listings</span>
          <span className="text-2xl font-black text-slate-900">{metrics?.total_listings || 5}</span>
        </div>
        
        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pending Reviews</span>
          <span className="text-2xl font-black text-indigo-600">{metrics?.pending_reviews_listings || 0}</span>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Sellers Pending Verified</span>
          <span className="text-2xl font-black text-indigo-700">{metrics?.pending_verification_sellers || 0}</span>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Open RFQs</span>
          <span className="text-2xl font-black text-slate-900">{metrics?.active_rfqs || 2}</span>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs bg-indigo-50/10 border-indigo-100/40">
          <span className="text-[10px] uppercase font-bold text-indigo-650 block mb-1">Captured Searches</span>
          <span className="text-2xl font-black text-indigo-700">{metrics?.total_searches_recorded || 10}</span>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">User Base</span>
          <span className="text-2xl font-black text-slate-900">{metrics?.total_users || 5}</span>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs bg-rose-50/20 border-rose-100/50">
          <span className="text-[10px] uppercase font-bold text-rose-500 block mb-1">Flags/Reports</span>
          <span className="text-2xl font-black text-rose-700">{metrics?.reported_listings_count || 0}</span>
        </div>
      </div>

      {/* Main workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Left Side control switches */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-4 flex flex-col gap-1.5 xl:col-span-1">
          <span className="text-[9px] uppercase font-bold text-slate-400 px-3 pb-2 block border-b border-slate-200">
            Console Moderation Panels
          </span>
          <button
            onClick={() => setActiveTab('listings')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              activeTab === 'listings' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> Marketplace Listings Review
            </span>
            {pendingListings.length > 0 && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${activeTab === 'listings' ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                {pendingListings.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('kyc')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              activeTab === 'kyc' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Seller KYC Verification
            </span>
            {pendingSellers.length > 0 && (
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold">
                {pendingSellers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              activeTab === 'reports' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Reported Posts Flagged
            </span>
            {reports.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold">
                {reports.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              activeTab === 'insights' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" /> Sourcing Search Insights
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[9px] font-bold uppercase">
              Live Tracker
            </span>
          </button>

          <button
            onClick={() => setActiveTab('db')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'db' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Database className="h-4 w-4" /> Cloud SQL Relational Schema Snap
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Layers className="h-4 w-4" /> Admin Activity Audit Trails
          </button>

          <button
            onClick={fetchAdminData}
            className="w-full text-center mt-3 bg-slate-200/60 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reload Cloud States
          </button>
        </div>

        {/* Right Side views */}
        <div className="xl:col-span-3 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
          
          {/* TAB 1: Listings Review */}
          {activeTab === 'listings' && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">Medical Listing Verification Desk</h4>
                <p className="text-xs text-slate-400">All inventory uploaded by sellers must be vetted against spam indicators before publishing to the public search index.</p>
              </div>

              {pendingListings.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center">
                  <span className="text-slate-400 text-xs">No listing approvals pending standard review. All uploaded equipment indices are live!</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingListings.map((l: any) => (
                    <div key={l.id} className="p-4 border border-indigo-100 bg-indigo-50/10 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-md tracking-wider">
                            Pending Vetting
                          </span>
                          {l.is_ai_extracted && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-md tracking-wider flex items-center gap-0.5">
                              🤖 AI Parsing
                            </span>
                          )}
                        </div>
                        <h5 className="font-bold text-slate-800 text-sm">{l.title}</h5>
                        <p className="text-slate-500 text-xs max-w-xl leading-relaxed">{l.description}</p>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Seller: {l.seller_name} ({l.seller_whatsapp}) | State: {l.state} | Price: ₦{Number(l.price).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRejectListing(l.id)}
                          className="bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
                        >
                          Reject / Archive
                        </button>
                        <button
                          onClick={() => handleApproveListing(l.id)}
                          className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer"
                        >
                          Verify & Approve Live
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Corporate Verification KYC */}
          {activeTab === 'kyc' && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">Seller CAC Verification Desk</h4>
                <p className="text-xs text-indigo-600">Confirm Corporate Affairs Commission registrations documentations to assign Verified Badges to sellers.</p>
              </div>

              {pendingSellers.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center">
                  <span className="text-slate-400 text-xs">No pending Corporate verification files. Verified badges are up to date!</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSellers.map((s: any) => (
                    <div key={s.id} className="p-4 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

          {/* TAB 3: Reports moderation */}
          {activeTab === 'reports' && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">Suspicious Listing Warnings & Safety Flags</h4>
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

          {/* TAB 3.5: Search Insights & Unmet Sourcing Telemetry */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <BarChart2 className="h-5 w-5 text-indigo-600" /> Sourcing Demands & Search Analytics
                </h4>
                <p className="text-xs text-slate-500">
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
                            {/* Elegant percentage bar */}
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

              {/* Categorical and State hotspots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Categories queried */}
                <div className="p-4 bg-white border border-slate-150 rounded-2xl">
                  <h5 className="font-bold text-slate-800 text-xs uppercase text-slate-400 tracking-wider mb-3">Hotspot Medical Categories Asked</h5>
                  <div className="space-y-2">
                    {(!searchInsights?.popular_categories || searchInsights.popular_categories.length === 0) && (
                      <span className="text-slate-400 text-xs">No category statistics.</span>
                    )}
                    {searchInsights?.popular_categories?.map((c: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-bold text-slate-700">{c.category}</span>
                        <span className="bg-indigo-100 text-indigo-800 font-black px-2 py-0.5 rounded text-[10px]">{c.count} queries</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* States hotspot demand */}
                <div className="p-4 bg-white border border-slate-150 rounded-2xl">
                  <h5 className="font-bold text-slate-800 text-xs uppercase text-slate-400 tracking-wider mb-3">Hotspot Sourcing Locations (Port)</h5>
                  <div className="space-y-2">
                    {(!searchInsights?.popular_states || searchInsights.popular_states.length === 0) && (
                      <span className="text-slate-400 text-xs">No location statistics.</span>
                    )}
                    {searchInsights?.popular_states?.map((st: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="font-bold text-slate-700">{st.state} State</span>
                        <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded text-[10px]">{st.count} inquiries</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Search History stream */}
              <div className="p-5 border border-slate-150 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Live Sourcing Telemetry stream</h5>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">Captured Telemetry (Active Session)</span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {!searchInsights?.recent_searches || searchInsights.recent_searches.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">No queries recorded inside preview container nodes.</div>
                  ) : (
                    searchInsights.recent_searches.map((s: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100/80 text-[11px] font-mono flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-indigo-600">Term: "{s.query || 'Generic Catalog browse'}"</span>
                            {s.category_name && (
                              <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-semibold">{s.category_name}</span>
                            )}
                            {s.state && (
                              <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-bold">{s.state} State</span>
                            )}
                            {s.condition && (
                              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase">{s.condition}</span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[10px] block font-sans">Timestamp: {new Date(s.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 self-start md:self-auto">
                          <span className="text-slate-400">Results:</span>
                          <span className={`px-2 py-0.5 rounded-md font-bold font-sans text-[10px] ${s.results_count === 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {s.results_count} listings
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: Cloud SQL Snapshot */}
          {activeTab === 'db' && (
            <div className="space-y-5">
              <div className="pb-4 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">Cloud SQL - PostgreSQL Database Studio</h4>
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
                      <div className="text-sm font-black text-slate-800">{schemaSnap?.metrics?.sellers_count || 3} records</div>
                    </div>
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400">TABLE: CATEGORIES</div>
                      <div className="text-sm font-black text-slate-800">{schemaSnap?.metrics?.categories_count || 16} records</div>
                    </div>
                    <div className="bg-slate-50 border p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400">TABLE: LISTINGS</div>
                      <div className="text-sm font-black text-indigo-600">{schemaSnap?.metrics?.listings_count || 5} records</div>
                    </div>
                  </div>
                </div>

                {/* Show simulated listings mapping to cloud storage documents */}
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
(Returned ${schemaSnap?.tables?.listings?.length || 5} rows dynamically using Cloud SQL PostgreSQL adapter snapshot)`}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Activity Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">System Audit Trials & Cloud Logging</h4>
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

        </div>
      </div>
    </div>
  );
}
