import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, TrendingUp, User, DollarSign, Clock, 
  Edit3, Send, RefreshCw, FileText, Check, AlertCircle, ChevronRight, Phone, Mail, Sparkles
} from 'lucide-react';
import { Lead, LeadStatus, ChatMessage } from '../types';

interface LeadsDashboardProps {
  currentUserId: string;
  currentUserRole: string;
}

export default function LeadsDashboard({ currentUserId, currentUserRole }: LeadsDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [notesText, setNotesText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Active negotiation offer states
  const [activeOffer, setActiveOffer] = useState<any | null>(null);
  const [counterAmountText, setCounterAmountText] = useState('');
  const [negotiatingStatus, setNegotiatingStatus] = useState(false);

  const fetchActiveOffer = async (buyerId: string, listingId: string) => {
    try {
      const res = await fetch(`/api/offers?buyer_id=${buyerId}&listing_id=${listingId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setActiveOffer(data[0]);
          setCounterAmountText(data[0].counter_amount?.toString() || '');
        } else {
          setActiveOffer(null);
        }
      }
    } catch (err) {
      console.error('Error fetching active offer:', err);
    }
  };

  const handleUpdateOfferStatus = async (status: 'accepted' | 'declined' | 'countered', counterAmt?: number) => {
    if (!activeOffer) return;
    setNegotiatingStatus(true);
    try {
      const res = await fetch(`/api/offers/${activeOffer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          counter_amount: counterAmt
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveOffer(updated);
        // Refresh leads pipeline state to update deal size / statuses
        fetchLeads(true);
        alert(`Offer successfully ${status}!`);
      } else {
        alert('Failed to update offer status.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating offer negotiation.');
    } finally {
      setNegotiatingStatus(false);
    }
  };

  // Fetch leads
  const fetchLeads = async (silent = false) => {
    if (!silent) setLoadingLeads(true);
    try {
      const res = await fetch(`/api/leads?user_id=${currentUserId}`);
      const data = await res.json();
      setLeads(data);
      
      // Keep selected lead synchronized with backend data if it exists
      if (selectedLead) {
        const updated = data.find((l: Lead) => l.id === selectedLead.id);
        if (updated) {
          setSelectedLead(updated);
        }
      } else if (data.length > 0 && !silent) {
        // Auto-select the first lead on initial load
        setSelectedLead(data[0]);
        setNotesText(data[0].notes || '');
        setPriceText(data[0].price_offered?.toString() || '');
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      if (!silent) setLoadingLeads(false);
    }
  };

  // Fetch chats for the active lead
  const fetchChats = async (leadId: string, silent = false) => {
    if (!silent) setLoadingChat(true);
    try {
      const res = await fetch(`/api/chats/${leadId}`);
      const data = await res.json();
      setChatMessages(data);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      if (!silent) setLoadingChat(false);
    }
  };

  // Poll for message updates
  useEffect(() => {
    fetchLeads();
    const interval = setInterval(() => {
      fetchLeads(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Load and poll chat when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      fetchChats(selectedLead.id);
      setNotesText(selectedLead.notes || '');
      setPriceText(selectedLead.price_offered?.toString() || '');
      
      // Load active negotiation offer if it exists
      fetchActiveOffer(selectedLead.buyer_id, selectedLead.source_id);

      const chatInterval = setInterval(() => {
        fetchChats(selectedLead.id, true);
        fetchActiveOffer(selectedLead.buyer_id, selectedLead.source_id);
      }, 3000);
      return () => clearInterval(chatInterval);
    } else {
      setChatMessages([]);
      setActiveOffer(null);
    }
  }, [selectedLead?.id]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedLead) return;

    setSendingMsg(true);
    try {
      const res = await fetch('/api/chats/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          sender_id: currentUserId,
          message: newMsg
        })
      });
      if (res.ok) {
        const msg = await res.json();
        setChatMessages(prev => [...prev, msg]);
        setNewMsg('');
        // Refresh leads status list to update last activity
        fetchLeads(true);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  // Update CRM Lead Status
  const handleUpdateStatus = async (status: LeadStatus) => {
    if (!selectedLead) return;
    try {
      const res = await fetch('/api/leads/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          status
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedLead(updated);
        // Sync with leads list
        setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Save CRM Private Notes & Negotiated Price
  const handleSaveCRMDetails = async () => {
    if (!selectedLead) return;
    setSavingNotes(true);
    try {
      const res = await fetch('/api/leads/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          notes: notesText,
          price_offered: Number(priceText) || 0
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedLead(updated);
        setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
        alert('CRM Lead details updated successfully.');
      }
    } catch (err) {
      console.error('Failed to save CRM details:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Helper for status styling
  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-rose-200">New Lead</span>;
      case 'discussion':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-amber-200">In Discussion</span>;
      case 'quote_sent':
        return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-indigo-200">Quote Placed</span>;
      case 'won':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-emerald-200">Won</span>;
      case 'lost':
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-slate-200">Closed / Lost</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro section */}
      <div className="bg-white border border-slate-150 rounded-2.5xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <span>Sourcing Leads & Direct Chat CRM</span>
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
              Track active hospital purchasing pipelines, communicate with verified buyers directly in real-time, log negotiation parameters, and convert leads into closed equipment transactions.
            </p>
          </div>
          <button 
            onClick={() => fetchLeads()} 
            className="self-start md:self-auto bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLeads ? 'animate-spin' : ''}`} />
            Refresh Pipeline
          </button>
        </div>
      </div>

      {/* Leads and chats container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* LEFT COLUMN: Leads list (col-span-4) */}
        <div className="lg:col-span-4 bg-white border border-slate-150 rounded-2.5xl flex flex-col shadow-xs overflow-hidden h-[650px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              My Sourcing Leads ({leads.length})
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-md uppercase">
              {currentUserRole} Pipeline
            </span>
          </div>

          <div className="flex-grow overflow-y-auto divide-y divide-slate-100">
            {loadingLeads && leads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2 mt-12">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium">No active leads found.</p>
                <p className="text-[10px] text-slate-400">
                  {currentUserRole === 'seller' 
                    ? "Go to the 'Hospital Procurement RFQs' tab and submit an equipment offer to generate a CRM lead!"
                    : "Go to 'Search Directory' and submit an equipment inquiry to create an active chat lead."}
                </p>
              </div>
            ) : (
              leads.map(lead => {
                const isActive = selectedLead?.id === lead.id;
                return (
                  <div 
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`p-4 text-left cursor-pointer hover:bg-slate-50/80 transition-all space-y-2 relative border-l-3 ${
                      isActive ? 'bg-indigo-50/40 border-indigo-600' : 'border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1 flex-grow">
                        {lead.title}
                      </h4>
                      {getStatusBadge(lead.status)}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      <span className="font-semibold text-slate-700 line-clamp-1">{lead.buyer_name}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium capitalize text-[9px]">
                        {lead.type === 'rfq_offer' ? 'RFQ Response' : 'Listing Inquiry'}
                      </span>
                      <span className="flex items-center gap-0.5 font-medium">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(lead.last_activity_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>

                    {lead.price_offered && (
                      <p className="text-xs font-black text-indigo-700">
                        ₦{Number(lead.price_offered).toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Lead details & Chat (col-span-8) */}
        <div className="lg:col-span-8 bg-white border border-slate-150 rounded-2.5xl flex flex-col shadow-xs overflow-hidden h-[650px]">
          {selectedLead ? (
            <div className="flex flex-col h-full">
              {/* Lead Top Header info */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block mb-0.5">
                      CRM Record ID: {selectedLead.id}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {selectedLead.title}
                    </h3>
                  </div>
                  
                  {/* Status update controller */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Pipeline:</span>
                    <select
                      value={selectedLead.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as LeadStatus)}
                      className="bg-white border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="new">🔴 New Lead</option>
                      <option value="discussion">🟡 In Discussion</option>
                      <option value="quote_sent">🔵 Quote Placed</option>
                      <option value="won">🟢 Won / Fulfilled</option>
                      <option value="lost">⚫ Lost / Closed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                  {/* Buyer detail section */}
                  <div className="bg-white border border-slate-150 p-3 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Buyer Context</span>
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-indigo-500" />
                      {selectedLead.buyer_name}
                    </p>
                    <p className="text-slate-500 flex items-center gap-1.5 text-[11px] font-mono">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {selectedLead.buyer_contact}
                    </p>
                  </div>

                  {/* Negotiation Parameters & private note controls */}
                  <div className="bg-white border border-slate-150 p-3 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deal Size Value</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <input
                          type="number"
                          value={priceText}
                          onChange={(e) => setPriceText(e.target.value)}
                          className="font-black text-slate-900 text-sm w-36 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="₦ Offer size"
                        />
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 italic">Adjust lead price to keep your projections accurate.</span>
                  </div>
                </div>

                {/* CRM Note update row */}
                <div className="bg-slate-100/60 p-3 rounded-xl flex flex-col md:flex-row gap-3 items-start md:items-center justify-between border border-slate-150">
                  <div className="flex-grow w-full">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Internal CRM Private Notes & Action Plan</span>
                    <input
                      type="text"
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder="e.g. Hospital administrator Fatima requested formal brochure. Meeting set for next Wednesday."
                      className="w-full text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handleSaveCRMDetails}
                    disabled={savingNotes}
                    className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10.5px] px-3.5 py-2 rounded-lg cursor-pointer transition-all shrink-0 self-end md:self-auto"
                  >
                    {savingNotes ? 'Saving...' : 'Save CRM parameters'}
                  </button>
                </div>

                {/* DYNAMIC NEGOTIATION OFFER MANAGEMENT SHEET */}
                {activeOffer && (
                  <div className="bg-indigo-50/50 border border-indigo-150 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                        <span className="text-[10.5px] font-black text-indigo-950 uppercase tracking-wider">
                          Active Price Negotiation (Make Offer Listing)
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        activeOffer.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        activeOffer.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        activeOffer.status === 'countered' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        Offer: {activeOffer.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white/80 p-3 rounded-xl border border-indigo-100/50 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Buyer's Proposed Amount</span>
                        <p className="text-sm font-black text-slate-800">
                          {activeOffer.currency === 'USD' ? '$' : '₦'}{activeOffer.offer_amount.toLocaleString()}
                        </p>
                        {activeOffer.message && (
                          <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100 line-clamp-2" title={activeOffer.message}>
                            "{activeOffer.message}"
                          </p>
                        )}
                      </div>

                      <div className="bg-white/80 p-3 rounded-xl border border-indigo-100/50 space-y-1.5 flex flex-col justify-center">
                        {activeOffer.status === 'pending' && (
                          <div className="space-y-2">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Negotiation Actions</span>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateOfferStatus('accepted')}
                                disabled={negotiatingStatus}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-md cursor-pointer transition-all shadow-2xs"
                              >
                                Accept Offer
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateOfferStatus('declined')}
                                disabled={negotiatingStatus}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-md cursor-pointer transition-all shadow-2xs"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        )}

                        {activeOffer.status === 'countered' && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Counter-Offer Sent</span>
                            <p className="text-xs font-bold text-indigo-750">
                              {activeOffer.currency === 'USD' ? '$' : '₦'}{Number(activeOffer.counter_amount).toLocaleString()}
                            </p>
                            <span className="text-[9px] text-slate-400">Waiting for buyer response.</span>
                          </div>
                        )}

                        {activeOffer.status === 'accepted' && (
                          <div className="text-emerald-700 font-bold space-y-0.5">
                            <span className="text-[11px] block">✓ Accepted Sourcing Price</span>
                            <p className="text-[10px] text-slate-500 font-normal leading-normal">Deal finalized. An invoice template has been processed in direct secure chat!</p>
                          </div>
                        )}

                        {activeOffer.status === 'declined' && (
                          <div className="text-rose-700 font-bold space-y-0.5">
                            <span className="text-[11px] block">✗ Offer Declined</span>
                            <p className="text-[10px] text-slate-500 font-normal leading-normal">This deal negotiation has been officially closed as unsuccessful.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Counter offer dialog trigger if pending */}
                    {activeOffer.status === 'pending' && (
                      <div className="pt-2.5 border-t border-indigo-100/50 flex items-center gap-2">
                        <input
                          type="number"
                          value={counterAmountText}
                          onChange={(e) => setCounterAmountText(e.target.value)}
                          placeholder={`Counter Offer size (${activeOffer.currency})`}
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs w-48 font-bold focus:outline-none focus:border-indigo-650"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!counterAmountText) return alert('Enter counter offer amount first.');
                            handleUpdateOfferStatus('countered', Number(counterAmountText));
                          }}
                          disabled={negotiatingStatus}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0"
                        >
                          Send Counter Proposal
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat Window section */}
              <div className="flex-grow bg-slate-50 overflow-y-auto p-5 space-y-3 flex flex-col">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-[10px] font-semibold text-indigo-800 text-center flex items-center justify-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
                  <span>Secure direct clinical chat session. Both buyers and vendors can exchange real-time updates.</span>
                </div>

                <div className="space-y-3 flex-grow">
                  {chatMessages.map(msg => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                      <div 
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] ${
                          isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <span className="text-[9px] text-slate-400 font-bold mb-0.5 px-1">
                          {isMe ? 'You' : msg.sender_name}
                        </span>
                        <div 
                          className={`p-3 rounded-2xl text-xs shadow-xs font-medium leading-relaxed ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-br-none' 
                              : 'bg-white border border-slate-150 text-slate-800 rounded-bl-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                        <span className="text-[8px] text-slate-400 mt-0.5 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    );
                  })}
                  
                  {chatMessages.length === 0 && !loadingChat && (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No message history found. Type below to send the first direct chat.
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex gap-2">
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder={`Type a message to ${selectedLead.buyer_name.split('Hospital')[0].trim()}...`}
                  className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !newMsg.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {sendingMsg ? 'Sending...' : 'Send'}
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-full text-slate-400 p-8 space-y-3">
              <MessageSquare className="h-12 w-12 text-slate-200 animate-bounce" />
              <p className="font-bold text-slate-700 text-sm">No lead selected</p>
              <p className="text-xs text-slate-500 text-center max-w-sm">
                Select an active sourcing pipeline on the left sidebar to access CRM metrics, set parameters, and chat securely with clinical operators.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
