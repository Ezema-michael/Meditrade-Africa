/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, MessageSquare, AlertCircle, RefreshCw, Send, CheckCircle, ShieldAlert, FileText, ArrowRight, Layers, HelpCircle } from 'lucide-react';

const SAMPLE_WHATSAPP_MESSAGES = [
  {
    label: "Ultrasound Machine ad",
    text: "Refurbished GE Voluson P8 available in Lagos state, clean transducers, OBGYN software package included, ₦7,500,000, call or WhatsApp Dr. Chidi on 08031234567, negotiable warranty 3 months included."
  },
  {
    label: "Consumables gloves ad",
    text: "Tear rubber! Medical Latex Examination Gloves sterile boxes of 100 available for wholesale container supply in Ibadan Oyo. ₦4500 per box. Call Adebayo on 07055555123 fast delivery, cash on deliver acceptable."
  },
  {
    label: "ICU Patient Monitor ad",
    text: "Very fresh US used Mindray uMec12 monitor with original probes, battery health 100% tested, ₦1.1M serious buyers only, location Garki Abuja. 08123456789. WhatsApp only text me."
  },
  {
    label: "Vague / Spam Risk ad",
    text: "Earn fast income clinical agents! Double your money we sell secret medical ventilators stolen from foreign military stores. No CAC registration needed. Send bitcoin deposit now to 08039999999."
  }
];

interface AIDashboardProps {
  onListingPublished: () => void;
  sellerId: string;
}

export default function AIDashboard({ onListingPublished, sellerId }: AIDashboardProps) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  // Parsed structure
  const [extractedData, setExtractedData] = useState<any>(null);

  // Duplicate states
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<any>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);

  // Custom Edit modes
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('cat-8');
  const [description, setDescription] = useState('');
  const [state, setState] = useState('Lagos');
  const [condition, setCondition] = useState<'new' | 'refurbished' | 'working_used' | 'used' | 'faulty' | 'parts_only' | 'scrap'>('working_used');
  const [listingType, setListingType] = useState<'fixed' | 'make_offer' | 'auction_parts_faulty' | 'scrap_salvage' | 'auction_only'>('make_offer');

  const handleConditionChange = (newCond: 'new' | 'refurbished' | 'working_used' | 'used' | 'faulty' | 'parts_only' | 'scrap') => {
    setCondition(newCond);
    // Automatically suggest sales method based on condition
    if (newCond === 'new' || newCond === 'refurbished') {
      setListingType('fixed');
    } else if (newCond === 'working_used' || newCond === 'used') {
      setListingType('make_offer');
    } else if (newCond === 'faulty' || newCond === 'parts_only') {
      setListingType('auction_parts_faulty');
    } else if (newCond === 'scrap') {
      setListingType('scrap_salvage');
    }
  };

  const handleSelectSample = (text: string) => {
    setInputText(text);
    setError('');
  };

  const handleRunExtraction = async () => {
    if (!inputText.trim()) {
      setError('Please paste a WhatsApp broadcast or pick one of the sample presets to run the parser.');
      return;
    }

    setLoading(true);
    setError('');
    setExtractedData(null);
    setDuplicateCheckResult(null);
    setStatusMsg('Running Gemini-3.5-flash AI clinical parsing pipeline...');

    try {
      const response = await fetch('/api/ai/extract-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: inputText })
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Gemini extraction failed');
      }

      setExtractedData(data);
      
      // Bootstrap form elements with AI output
      setTitle(data.title || '');
      setPrice(data.price ? data.price.toString() : '0');
      setDescription(data.description || '');
      setState(data.location_state || 'Lagos');
      
      const rawCondition = (data.condition || '').toLowerCase();
      let detectedCondition: 'new' | 'refurbished' | 'working_used' | 'faulty' | 'parts_only' | 'scrap' = 'working_used';
      if (rawCondition.includes('new')) {
        detectedCondition = 'new';
      } else if (rawCondition.includes('refurbished')) {
        detectedCondition = 'refurbished';
      } else if (rawCondition.includes('scrap') || rawCondition.includes('salvage')) {
        detectedCondition = 'scrap';
      } else if (rawCondition.includes('parts')) {
        detectedCondition = 'parts_only';
      } else if (rawCondition.includes('faulty') || rawCondition.includes('defect') || rawCondition.includes('broken')) {
        detectedCondition = 'faulty';
      } else {
        detectedCondition = 'working_used';
      }
      handleConditionChange(detectedCondition);

      // Detect standard category recommended
      handleAutoClassify(data.title);

    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your setup integration details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoClassify = async (productTitle: string) => {
    try {
      const res = await fetch('/api/ai/classify-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: productTitle })
      });
      const catData = await res.json();
      if (catData.category_id) {
        setCategory(catData.category_id);
      }
    } catch {
      // safe fallback
    }
  };

  const handleImproveDescription = async () => {
    if (!description) return;
    setStatusMsg('Enhancing grammar and formatting with Gemini AI...');
    try {
      const res = await fetch('/api/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      const data = await res.json();
      if (data.enhanced) {
        setDescription(data.enhanced);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatusMsg('');
    }
  };

  const handleDuplicateCheck = async () => {
    if (!title) return;
    setDuplicateLoading(true);
    setDuplicateCheckResult(null);
    try {
      const res = await fetch('/api/ai/detect-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, details: description })
      });
      const data = await res.json();
      setDuplicateCheckResult(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDuplicateLoading(false);
    }
  };

  const handlePublishListing = async () => {
    if (!title || !price) {
      setError('Title and price are required to publish listings.');
      return;
    }

    setLoading(true);
    setStatusMsg('Publishing new verified list to the database...');

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: sellerId,
          category_id: category,
          title,
          brand: extractedData?.brand || 'Generic',
          model: extractedData?.model || '',
          condition,
          price,
          currency: extractedData?.currency || 'NGN',
          negotiable: true,
          state,
          city: extractedData?.location_city || 'City Center',
          description,
          is_ai_extracted: true,
          listing_type: listingType
        })
      });

      if (!res.ok) {
        throw new Error('Could not submit listings. Please review fields.');
      }

      setStatusMsg('');
      alert('Listing created! Since it was parsed with AI, it has been routed to the pending_review shelf. Admins are notified!');
      
      // Reset
      setInputText('');
      setExtractedData(null);
      setDuplicateCheckResult(null);
      onListingPublished();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Input panel */}
      <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">WhatsApp Broadcast Parser</h3>
          </div>
          
          <p className="text-slate-500 text-xs mb-5 leading-relaxed">
            WhatsApp ads are unstructured, unsearchable, and disappear quickly. Paste any raw message to convert it into a structured database record automatically.
          </p>

          {/* Preset Prompts */}
          <div className="mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Select Sample WhatsApp Broadcast:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_WHATSAPP_MESSAGES.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSample(s.text)}
                  className="px-3 py-1.5 text-[11px] rounded-lg border border-slate-100 hover:border-indigo-600/40 bg-slate-50 text-slate-700 hover:bg-slate-100/50 transition-all font-medium text-left cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div className="relative mb-4">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste raw hospital trading message here (e.g. 'Very clean used Mindray patient monitor for sale in Ikeja Lagos, 1.2M...')"
              className="w-full h-64 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-800 focus:outline-indigo-600/40"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex gap-2 items-start text-xs mb-4">
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {statusMsg && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl flex gap-2 items-center text-xs mb-4 animate-pulse">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="font-medium">{statusMsg}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleRunExtraction}
          disabled={loading || !inputText}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl py-3 text-xs font-bold cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-all"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Processing with Gemini 3.5...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Convert broadcast with Gemini</span>
            </>
          )}
        </button>
      </div>

      {/* Structured Output Panel */}
      <div className="lg:col-span-12 xl:col-span-7">
        {!extractedData ? (
          <div className="h-full min-h-[400px] border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 bg-slate-50/50 text-center">
            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1.5">Structured Listing Outcome Area</h4>
            <p className="max-w-md text-slate-400 text-xs leading-relaxed">
              When Gemini extracts data from your paste, the structured JSON fields will load dynamically here with interactive cleanup options.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-rose-100/40">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  AI Structural Evaluation Complete
                </span>
              </div>

              {/* Spam caution flag trigger */}
              {extractedData.spam_flag ? (
                <div className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-1.5 text-[11px] font-bold">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Flagged as Spam / FRAUD Risk</span>
                </div>
              ) : (
                <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-1.5 text-[11px] font-bold">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Clinical Safety Pass</span>
                </div>
              )}
            </div>

            {/* Spam risk description block if flagged */}
            {extractedData.spam_flag && extractedData.spam_reasons && extractedData.spam_reasons.length > 0 && (
              <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100 text-slate-700 text-xs space-y-1">
                <span className="font-bold text-rose-800 flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4" /> AI Moderation Warnings:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 mt-1 text-slate-600 font-mono text-[11px]">
                  {extractedData.spam_reasons.map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Structured editing form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  AI-Refined Product Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Database Category Mapping
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none"
                >
                  <option value="cat-8">Patient Monitors</option>
                  <option value="cat-2">Ultrasound Machines</option>
                  <option value="cat-3">X-Ray Equipment</option>
                  <option value="cat-5">Laboratory Equipment</option>
                  <option value="cat-9">Hospital Beds & Furniture</option>
                  <option value="cat-11">Syringes & Needles</option>
                  <option value="cat-12">Gloves</option>
                  <option value="cat-14">Autoclaves</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Extracted Price ({extractedData.currency || 'NGN'})
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Diagnosed Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => handleConditionChange(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none"
                >
                  <option value="new">New (Brand New / Unused)</option>
                  <option value="refurbished">Refurbished Standard</option>
                  <option value="working_used">Working Used</option>
                  <option value="faulty">Faulty (Needs repair/calibration)</option>
                  <option value="parts_only">For Parts Only</option>
                  <option value="scrap">Scrap (Salvage value only)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  State Location (Nigeria)
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none"
                >
                  <option value="Lagos">Lagos State</option>
                  <option value="Abuja (FCT)">Abuja FCT</option>
                  <option value="Oyo">Oyo State (Ibadan)</option>
                  <option value="Rivers">Rivers State (Port Harcourt)</option>
                  <option value="Enugu">Enugu State</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Detected Seller Phone
                </label>
                <input
                  type="text"
                  readOnly
                  value={extractedData.seller_phone || 'None found'}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 font-mono"
                />
              </div>
            </div>

            {/* LISTING TYPE SELECTOR (Expanded to 5 Sales Methods) */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5 space-y-3">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                  Select Equipment Listing Agreement Type
                </h4>
                <p className="text-slate-400 text-[10.5px] mt-0.5">
                  Choose how prospective clinical buyers negotiating with your store can transact. Based on condition, we suggest the optimal commercial method.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* 1. Fixed Price */}
                <button
                  type="button"
                  onClick={() => setListingType('fixed')}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                    listingType === 'fixed'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${listingType === 'fixed' ? 'text-indigo-650' : 'text-slate-700'}`}>
                      ◉ Fixed Price
                    </span>
                    {listingType === 'fixed' && <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded">Active</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-normal font-medium mb-3">
                    Buyers buy at the exact listed retail rate. Best for standard consumables or generic machinery.
                  </p>
                  {(condition === 'new' || condition === 'refurbished' || condition === 'working_used' || condition === 'used') && (
                    <div className="text-[9.5px] bg-amber-50 border border-amber-250 text-amber-800 font-extrabold px-2 py-0.5 rounded-md self-start">
                      ★ Recommended for {condition === 'new' ? 'New' : condition === 'refurbished' ? 'Refurbished' : 'Working Used'}
                    </div>
                  )}
                </button>

                {/* 2. Make Offer */}
                <button
                  type="button"
                  onClick={() => setListingType('make_offer')}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                    listingType === 'make_offer'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${listingType === 'make_offer' ? 'text-indigo-650' : 'text-slate-700'}`}>
                      ◉ Make Offer
                    </span>
                    {listingType === 'make_offer' && <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded">Active</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-normal font-medium mb-3">
                    Enables negotiations. Clinicians submit offers according to their exact healthcare facility budget.
                  </p>
                  {(condition === 'working_used' || condition === 'used') && (
                    <div className="text-[9.5px] bg-amber-50 border border-amber-250 text-amber-800 font-extrabold px-2 py-0.5 rounded-md self-start">
                      ★ Recommended for Working Used
                    </div>
                  )}
                </button>

                {/* 3. Auction: For Parts / Faulty */}
                <button
                  type="button"
                  onClick={() => setListingType('auction_parts_faulty')}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                    listingType === 'auction_parts_faulty'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${listingType === 'auction_parts_faulty' ? 'text-indigo-650' : 'text-slate-700'}`}>
                      ◉ For Parts / Faulty
                    </span>
                    {listingType === 'auction_parts_faulty' && <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded">Active</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-normal font-medium mb-3">
                    Auction system for non-functional/untested devices. Buyers bid to salvage specific diagnostic subcomponents.
                  </p>
                  {(condition === 'faulty' || condition === 'parts_only') && (
                    <div className="text-[9.5px] bg-amber-50 border border-amber-250 text-amber-800 font-extrabold px-2 py-0.5 rounded-md self-start">
                      ★ Recommended for {condition === 'faulty' ? 'Faulty' : 'Parts Only'}
                    </div>
                  )}
                </button>

                {/* 4. Scrap / Salvage */}
                <button
                  type="button"
                  onClick={() => setListingType('scrap_salvage')}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                    listingType === 'scrap_salvage'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${listingType === 'scrap_salvage' ? 'text-indigo-650' : 'text-slate-700'}`}>
                      ◉ Scrap / Salvage
                    </span>
                    {listingType === 'scrap_salvage' && <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded">Active</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-normal font-medium mb-3">
                    Immediate liquidation or bidding on decommissioned metal/materials. Stated solely for baseline pricing.
                  </p>
                  {condition === 'scrap' && (
                    <div className="text-[9.5px] bg-amber-50 border border-amber-250 text-amber-800 font-extrabold px-2 py-0.5 rounded-md self-start">
                      ★ Recommended for Scrap
                    </div>
                  )}
                </button>

                {/* 5. Auction Only */}
                <button
                  type="button"
                  onClick={() => setListingType('auction_only')}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                    listingType === 'auction_only'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${listingType === 'auction_only' ? 'text-indigo-650' : 'text-slate-700'}`}>
                      ◉ Auction Only
                    </span>
                    {listingType === 'auction_only' && <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded">Active</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-normal font-medium mb-3">
                    General medical asset bidding channel. Set opening bid price and clear bidding expiration window.
                  </p>
                  {(condition === 'faulty' || condition === 'parts_only' || condition === 'scrap') && (
                    <div className="text-[9.5px] bg-amber-50 border border-amber-250 text-amber-800 font-extrabold px-2 py-0.5 rounded-md self-start">
                      ★ Recommended for Auction Only
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Description improvement panel with side controls */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  AI Professional Description Enhancement
                </label>
                <button
                  type="button"
                  onClick={handleImproveDescription}
                  className="text-indigo-600 hover:text-indigo-700 text-[11px] font-bold flex items-center gap-1 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-md transition-all cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-indigo-600" />
                  <span>Improve Grammar & Clarity</span>
                </button>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 leading-relaxed font-mono focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* AI Evaluation checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                  Missing Fields Diagnosis:
                </span>
                {extractedData.missing_fields && extractedData.missing_fields.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {extractedData.missing_fields.map((f: string, idx: number) => (
                      <span key={idx} className="bg-amber-100 text-amber-800 text-[10px] font-medium px-2 py-0.5 rounded-md">
                        {f} missing
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500">All procurement fields complete!</span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                  Extracted Info Diagnostics:
                </span>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div>Brand identified: <strong className="text-slate-700">{extractedData.brand || 'None'}</strong></div>
                  <div>Model diagnosed: <strong className="text-slate-700">{extractedData.model || 'None'}</strong></div>
                </div>
              </div>
            </div>

            {/* Duplicate check triggers */}
            <div className="border bg-indigo-50/20 border-indigo-100/50 rounded-2xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-indigo-500 animate-pulse" />
                    Intelligent Duplicate Shield
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Check if a duplicate ad was posted to the marketplace within the active session.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDuplicateCheck}
                  disabled={duplicateLoading}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  {duplicateLoading ? 'Scanning...' : 'Run Scan'}
                </button>
              </div>

              {duplicateCheckResult && (
                <div className="mt-3 p-3.5 bg-indigo-50 border border-indigo-100 text-xs rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-900 font-bold flex items-center gap-1">
                      Duplicate Likelihood: 
                      <span className={duplicateCheckResult.similarityPercentage > 50 ? 'text-red-600 font-extrabold text-sm' : 'text-emerald-600 font-bold'}>
                        {duplicateCheckResult.similarityPercentage}%
                      </span>
                    </span>
                    <span className="text-[11px] font-medium bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                      {duplicateCheckResult.isDuplicate ? 'High Duplicate risk' : 'Safe to proceed'}
                    </span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1 text-slate-600 font-mono text-[10px]">
                    {duplicateCheckResult.reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                  {duplicateCheckResult.matchingOffer && (
                    <div className="text-[10px] text-slate-500 mt-1">Matched index key: {duplicateCheckResult.matchingOffer}</div>
                  )}
                </div>
              )}
            </div>

            {/* Publishing buttons */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setExtractedData(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Clear Parser Outcomes
              </button>
              <button
                type="button"
                onClick={handlePublishListing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Publish to Marketplace (Review Desk)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
