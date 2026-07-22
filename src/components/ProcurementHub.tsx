/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ProcurementRequest, ProcurementResponse, Category } from '../types';
import { FileText, PlusCircle, Clock, MapPin, Tag, ShieldAlert, CheckCircle, Send, PhoneCall, Sparkles, MessageSquare, Truck, Share2 } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { InterStateLogisticsEstimator } from './InterStateLogisticsEstimator';
import { ShareModal } from './ShareModal';
import { VendorStorefrontModal } from './VendorStorefrontModal';

interface ProcurementHubProps {
  categories: Category[];
  sellerId: string;
  userId?: string;
}

export default function ProcurementHub({ categories, sellerId, userId }: ProcurementHubProps) {
  const [rfqs, setRfqs] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [activeResponseRfqId, setActiveResponseRfqId] = useState<string | null>(null);
  const [selectedShareRfq, setSelectedShareRfq] = useState<ProcurementRequest | null>(null);
  const [selectedVendorForStorefront, setSelectedVendorForStorefront] = useState<{ id: string; name?: string } | null>(null);


  // Active responses list
  const [quotes, setQuotes] = useState<ProcurementResponse[]>([]);

  // Post Request Form Data
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cat-8');
  const [quantity, setQuantity] = useState('3');
  const [budget, setBudget] = useState('1500000');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [state, setState] = useState('Abuja (FCT)');
  const [description, setDescription] = useState('');
  const [buyerContact, setBuyerContact] = useState('');

  // Senders Response Form Data
  const [offeredProduct, setOfferedProduct] = useState('');
  const [price, setPrice] = useState('');
  const [availability, setAvailability] = useState('Immediate delivery');
  const [message, setMessage] = useState('');
  const [whatsappContact, setWhatsappContact] = useState('+2348031234567');

  // AI Matching states
  const [aiMatchingResult, setAiMatchingResult] = useState<any>(null);
  const [matchingLoading, setMatchingLoading] = useState(false);

  const fetchProcurements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/procurement-requests');
      const data = await res.json();
      setRfqs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !buyerContact) {
      alert('Must complete title, buyer contact and medical description.');
      return;
    }

    try {
      const res = await fetch('/api/procurement-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId || 'usr-5',
          title,
          category_id: category,
          quantity,
          budget,
          currency: 'NGN',
          urgency,
          state,
          city: 'Central Clinic Area',
          description,
          buyer_contact: buyerContact
        })
      });

      if (res.ok) {
        setShowPostForm(false);
        // Clear
        setTitle('');
        setDescription('');
        setBuyerContact('');
        fetchProcurements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitQuote = async (e: React.FormEvent, rfqId: string) => {
    e.preventDefault();
    if (!offeredProduct || !price) {
      alert('Provide offered brand/model and your competitive bid price.');
      return;
    }

    try {
      const res = await fetch(`/api/procurement-requests/${rfqId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: sellerId,
          price,
          message,
          availability,
          whatsapp_contact: whatsappContact,
          offered_product: offeredProduct
        })
      });

      if (res.ok) {
        const addedQuote = await res.json();
        setQuotes(prev => [addedQuote, ...prev]);
        setActiveResponseRfqId(null);
        setOfferedProduct('');
        setPrice('');
        setMessage('');
        alert('Response sent directly to Garki specialists group inbox! WhatsApp links updated.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const runAiMatching = async (rfqId: string) => {
    setMatchingLoading(true);
    setAiMatchingResult(null);
    try {
      // Simulate querying Gemini with the listings we have in state to find optimal sourcing scores
      const res = await fetch('/api/listings');
      const allListings = await res.json();
      const currentRfq = rfqs.find(r => r.id === rfqId);
      
      const prompt = `Match this medical RFQ: "${currentRfq?.title}" detail: "${currentRfq?.description}" budgeting: "${currentRfq?.budget}"
      Against our inventory:
      ${allListings.map((l: any) => `Listing ID: ${l.id}, Title: ${l.title}, Price: ${l.price}, State: ${l.state}, Condition: ${l.condition}`).join('\n')}`;

      const gemStyleRes = await fetch('/api/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: prompt })
      });
      // Mock score simulation
      setTimeout(() => {
        setAiMatchingResult({
          rfqId,
          matchings: allListings.map((l: any) => {
            const similarity = l.title.toLowerCase().includes('monitor') || l.title.toLowerCase().includes('ultrasound') ? 92 : 34;
            return {
              title: l.title,
              relevance: similarity,
              matchReason: `Fits technical demands in ${currentRfq?.state} for ${l.condition ?? 'refurbished'} spec.`
            };
          })
        });
        setMatchingLoading(false);
      }, 1000);
    } catch {
      setMatchingLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurements();
    // Fetch simulated quotes
    setQuotes([
      {
        id: 'resp-1',
        request_id: 'req-1',
        seller_id: 'sel-1',
        price: 1350000,
        message: 'We have extremely clean, US-used Mindray patient monitors ready for delivery inside Abuja tomorrow.',
        availability: 'Immediate delivery',
        whatsapp_contact: '+2348031234567',
        seller_name: 'MedLink Diagnostics Ltd',
        offered_product: 'Mindray uMec 12 Patient Monitor',
        created_at: new Date().toISOString()
      }
    ]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Hospital RFQ & Procurement Hub
          </h3>
          <p className="text-slate-500 text-xs mt-0.5 max-w-xl">
            Check urgent medical demands uploaded directly by verified Clinics, Teaching Hospitals, and Nursing homes. Submit your quotes instantly over click-to-chat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowLogisticsModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
          >
            <Truck className="h-4.5 w-4.5 text-cyan-400" />
            <span>Estimate Inter-State Logistics</span>
          </button>

          <button
            onClick={() => setShowPostForm(!showPostForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
          >
            <PlusCircle className="h-4.5 w-4.5" />
            <span>Post Hospital Procurement RFQ</span>
          </button>
        </div>
      </div>


      {/* Post form trigger */}
      {showPostForm && (
        <form onSubmit={submitRfq} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
          <h4 className="font-bold text-slate-800 text-sm">Post Equipment Procurement Demand</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Request Summary Title
              </label>
              <input
                type="text"
                placeholder="e.g. Need 3 patient monitors in Abuja"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-indigo-600/40"
              />
            </div>
            
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Estimated Category
              </label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val)}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select Category"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Qty Needed
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Budget (Per unit ₦)
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Urgency Tier
              </label>
              <CustomSelect
                value={urgency}
                onChange={(val) => setUrgency(val as any)}
                options={[
                  { value: 'low', label: 'Low - General stock refresh' },
                  { value: 'medium', label: 'Medium - Coming weeks' },
                  { value: 'high', label: 'High - Opening theatre next week' },
                  { value: 'critical', label: 'Critical - Patient waiting' },
                ]}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                State Location (Nigeria)
              </label>
              <CustomSelect
                value={state}
                onChange={(val) => setState(val)}
                options={[
                  { value: 'Lagos', label: 'Lagos State' },
                  { value: 'Abuja (FCT)', label: 'Abuja FCT' },
                  { value: 'Enugu', label: 'Enugu State' },
                  { value: 'Rivers', label: 'Rivers State' },
                ]}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Hospital Procurement Contact Profile
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Alabi (Garki Specialists)"
                value={buyerContact}
                onChange={(e) => setBuyerContact(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-indigo-600/40"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Clinical Requirements & Specifications
            </label>
            <textarea
              placeholder="Provide exact transducers configuration, bedside brackets, battery capacity, warranty expectations, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs focus:outline-indigo-600/40"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowPostForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-xl cursor-pointer"
            >
              Broadcast RFQ Demand
            </button>
          </div>
        </form>
      )}

      {/* RFQ listings timeline */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading open Hospital RFQs...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rfqs.map(rfq => {
            const rfqQuotes = quotes.filter(q => q.request_id === rfq.id);
            const isUrgent = rfq.urgency === 'critical' || rfq.urgency === 'high';
            
            return (
              <div key={rfq.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-200/80 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">
                      RFQ #{rfq.id.split('-')[1] || rfq.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold border tracking-wider ${
                      isUrgent ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      {rfq.urgency} Action
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-base mb-1 line-clamp-1">
                    {rfq.title}
                  </h4>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" /> {rfq.state}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-slate-400" /> Quantity: {rfq.quantity} units
                    </span>
                    <span>•</span>
                    <span className="font-bold text-indigo-600">
                      Budget: ₦{(rfq.budget).toLocaleString()} max each
                    </span>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed mb-4 bg-slate-50/50 p-4 rounded-2xl font-mono text-justify border border-slate-100">
                    {rfq.description}
                  </p>

                  <div className="text-[11px] text-slate-500 mb-4">
                    Contact: <strong className="text-slate-800 font-semibold">{rfq.buyer_contact}</strong>
                  </div>

                  {/* Existing Quotes Submitted by Sellers */}
                  {rfqQuotes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Submitted Distributor Quotes ({rfqQuotes.length})
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {rfqQuotes.map(quote => (
                          <div key={quote.id} className="p-3 bg-emerald-50/40 rounded-2xl border border-emerald-100/50 text-xs">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedVendorForStorefront({ id: quote.seller_id, name: quote.seller_name })}
                                  className="text-slate-800 hover:text-indigo-600 font-bold hover:underline text-left cursor-pointer transition-colors"
                                  title={`View Storefront for ${quote.seller_name}`}
                                >
                                  {quote.seller_name}
                                </button>
                                <span className="text-[10px] text-slate-400 block">Offered: {quote.offered_product}</span>
                              </div>
                              <span className="text-indigo-600 font-bold">₦{quote.price.toLocaleString()}</span>
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed mb-2 font-mono">{quote.message}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-medium">Availability: {quote.availability}</span>
                              <a
                                href={`https://wa.me/${quote.whatsapp_contact.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-700 bg-white border border-emerald-100 px-2 py-0.5 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-1 font-bold shadow-xs"
                              >
                                <PhoneCall className="h-2.5 w-2.5" /> Speak
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI matching recommendation results widget */}
                  {aiMatchingResult && aiMatchingResult.rfqId === rfq.id && (
                    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-1 text-xs">
                      <span className="font-bold text-indigo-900 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-indigo-600 animate-pulse" />
                        AI Stock Match recommendation:
                      </span>
                      <div className="space-y-1 pt-1">
                        {aiMatchingResult.matchings.slice(0, 2).map((m: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] border-b border-indigo-100/40 pb-1">
                            <span className="text-slate-700 truncate max-w-[180px]">{m.title}</span>
                            <span className="text-indigo-800 font-bold">{m.relevance}% score</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => runAiMatching(rfq.id)}
                    className="flex-shrink-0 text-indigo-600 border border-indigo-100 hover:bg-indigo-50 px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                    title="Run Intelligent Inventory Match Score"
                  >
                    {matchingLoading ? 'Thinking...' : 'AI Stock Match'}
                  </button>

                  <button
                    onClick={() => setSelectedShareRfq(rfq)}
                    className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="Share RFQ to WhatsApp & Social Apps"
                  >
                    <Share2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Share</span>
                  </button>

                  <button
                    onClick={() => setActiveResponseRfqId(activeResponseRfqId === rfq.id ? null : rfq.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Respond Quote / Bid
                  </button>
                </div>

                {/* Seller responsive Form overlay */}
                {activeResponseRfqId === rfq.id && (
                  <form onSubmit={(e) => submitQuote(e, rfq.id)} className="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-slate-50/50 p-4 rounded-2xl">
                    <h5 className="text-xs font-bold text-slate-800">Submit Bid Details</h5>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Offered Equipment / Spec</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Mindray uMec12 Refurb"
                          value={offeredProduct}
                          onChange={(e) => setOfferedProduct(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Your Bid Price (₦)</label>
                        <input
                          type="number"
                          required
                          placeholder="₦ 1,300,000"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Lead Time / Delivery</label>
                        <select
                          value={availability}
                          onChange={(e) => setAvailability(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                        >
                          <option value="Immediate delivery">Immediate delivery</option>
                          <option value="1-3 days delivery">1-3 days delivery</option>
                          <option value="On demand">On supply demand contract</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block">WhatsApp Contact Click Link</label>
                        <input
                          type="text"
                          value={whatsappContact}
                          onChange={(e) => setWhatsappContact(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Private message details</label>
                      <textarea
                        placeholder="Offer warranty terms or clinical training details inside Oyo State..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full h-16 bg-white border border-slate-200 rounded-lg p-2 text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveResponseRfqId(null)}
                        className="px-3 py-1 bg-white border text-slate-600 rounded-lg text-[11px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        Submit Offer Bid
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* INTER-STATE LOGISTICS ESTIMATOR MODAL */}
      {showLogisticsModal && (
        <InterStateLogisticsEstimator
          isOpen={showLogisticsModal}
          onClose={() => setShowLogisticsModal(false)}
          initialOriginState="Lagos"
          initialDestinationState="Abuja (FCT)"
        />
      )}

      {/* SHARE RFQ MODAL */}
      {selectedShareRfq && (
        <ShareModal
          isOpen={!!selectedShareRfq}
          onClose={() => setSelectedShareRfq(null)}
          title={`Hospital RFQ: ${selectedShareRfq.title}`}
          text={`Urgent Clinical Sourcing Request from ${selectedShareRfq.hospital_name || 'Healthcare Facility'} (${selectedShareRfq.location_state}): Target Budget ₦${selectedShareRfq.budget_max_ngn ? selectedShareRfq.budget_max_ngn.toLocaleString() : 'N/A'}.`}
          url={`${window.location.origin}/procurement?rfqId=${selectedShareRfq.id}`}
          priceFormatted={selectedShareRfq.budget_max_ngn ? `Budget: ₦${selectedShareRfq.budget_max_ngn.toLocaleString()}` : undefined}
          category="Hospital Sourcing Request (RFQ)"
        />
      )}

      {/* VENDOR STOREFRONT MODAL */}
      {selectedVendorForStorefront && (
        <VendorStorefrontModal
          isOpen={!!selectedVendorForStorefront}
          onClose={() => setSelectedVendorForStorefront(null)}
          sellerId={selectedVendorForStorefront.id}
          sellerNameFallback={selectedVendorForStorefront.name}
          categories={categories}
        />
      )}
    </div>
  );
}

