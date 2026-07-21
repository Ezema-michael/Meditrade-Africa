/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Listing } from '../types';
import { 
  Sparkles, 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Zap, 
  Wrench, 
  DollarSign, 
  Award, 
  AlertTriangle, 
  Plus, 
  X, 
  Printer, 
  RefreshCw, 
  FileText, 
  SlidersHorizontal,
  ChevronRight,
  Building2,
  Lock,
  Layers
} from 'lucide-react';

interface DeviceComparisonEngineProps {
  listings: Listing[];
  initialSelectedIds?: string[];
  currentUser?: any;
  onNavigateToEscrow?: (listingId: string) => void;
  onNavigateToFinancing?: (listingId: string) => void;
}

export interface AIComparisonResult {
  executiveSummary: string;
  winningDeviceId?: string;
  winningDeviceTitle: string;
  winningReason: string;
  deviceEvaluations: {
    deviceId?: string;
    deviceTitle: string;
    clinicalSuitabilityScore: number;
    tco3YearEstimateNaira: number;
    keyPros: string[];
    keyCons: string[];
    powerGridReadiness: string;
    biomedicalMaintainabilityScore: number;
    consumableCostRating: string;
  }[];
  headToHeadGrid: {
    dimension: string;
    analysis: string;
    bestDeviceTitle: string;
  }[];
  procurementRecommendation: {
    negotiationAdvice: string;
    recommendedSpareParts: string[];
    escrowSafetyNotes: string;
  };
}

export default function DeviceComparisonEngine({
  listings,
  initialSelectedIds = [],
  currentUser,
  onNavigateToEscrow,
  onNavigateToFinancing
}: DeviceComparisonEngineProps) {
  // Target hospital / facility profile context
  const [facilityContext, setFacilityContext] = useState<string>('Secondary General Hospital / Surgical Center');

  // Selected listings for side-by-side comparison (max 4)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addSearchQuery, setAddSearchQuery] = useState<string>('');
  
  // Highlight differences toggle
  const [highlightDifferences, setHighlightDifferences] = useState<boolean>(false);

  // AI Analysis state
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIComparisonResult | null>(null);
  const [loadingStep, setLoadingStep] = useState<number>(0);

  // Initialize selected listings with passed initial selected IDs or default first 3 items
  useEffect(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      setSelectedIds(initialSelectedIds.slice(0, 4));
    } else if (listings.length >= 2) {
      // Pick first 2 or 3 items as default starting pair
      setSelectedIds(listings.slice(0, 3).map(l => l.id));
    }
  }, [listings, initialSelectedIds]);

  const selectedListings = selectedIds
    .map(id => listings.find(l => l.id === id))
    .filter((l): l is Listing => l !== undefined);

  // Preset Comparison Options
  const presets = [
    {
      name: 'Ultrasound Systems',
      description: '3D/4D Color Doppler vs High-end Portable Units',
      ids: listings.filter(l => l.category_id === 'cat-1' || l.title.toLowerCase().includes('ultrasound') || l.title.toLowerCase().includes('sonoscape') || l.title.toLowerCase().includes('voluson')).map(l => l.id).slice(0, 3)
    },
    {
      name: 'Patient Monitors & ICU',
      description: 'Multi-para Bedside Monitors vs Portable Monitors',
      ids: listings.filter(l => l.category_id === 'cat-7' || l.title.toLowerCase().includes('monitor') || l.title.toLowerCase().includes('mindray')).map(l => l.id).slice(0, 3)
    },
    {
      name: 'Anesthesia & Surgery',
      description: 'Invasive Surgical Workstations & Ventilators',
      ids: listings.filter(l => l.category_id === 'cat-5' || l.category_id === 'cat-6' || l.title.toLowerCase().includes('theatre') || l.title.toLowerCase().includes('anesthesia')).map(l => l.id).slice(0, 3)
    },
    {
      name: 'Radiography & X-Ray',
      description: 'Mobile C-Arm vs Fixed Digital Radiography',
      ids: listings.filter(l => l.category_id === 'cat-2' || l.category_id === 'cat-3' || l.title.toLowerCase().includes('x-ray') || l.title.toLowerCase().includes('ct')).map(l => l.id).slice(0, 3)
    }
  ].filter(p => p.ids.length >= 2);

  const handleApplyPreset = (presetIds: string[]) => {
    if (presetIds.length >= 2) {
      setSelectedIds(presetIds);
      setAiResult(null);
    }
  };

  const handleRemoveDevice = (id: string) => {
    if (selectedIds.length <= 2) {
      alert("At least 2 medical devices are required for side-by-side technical comparison.");
      return;
    }
    setSelectedIds(prev => prev.filter(item => item !== id));
    setAiResult(null);
  };

  const handleAddDevice = (id: string) => {
    if (selectedIds.includes(id)) return;
    if (selectedIds.length >= 4) {
      alert("You can compare up to 4 medical devices simultaneously.");
      return;
    }
    setSelectedIds(prev => [...prev, id]);
    setShowAddModal(false);
    setAiResult(null);
  };

  // Trigger AI Clinical Technical Analysis via Gemini
  const handleRunAiComparison = async () => {
    if (selectedListings.length < 2) {
      alert("Please select at least 2 medical devices to run AI comparison analysis.");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setLoadingStep(1);

    // Simulated progress steps for better feedback
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 900);

    try {
      const payload = {
        devices: selectedListings.map(l => ({
          id: l.id,
          title: l.title,
          brand: l.brand,
          model: l.model,
          condition: l.condition,
          price: l.price,
          currency: l.currency,
          category_id: l.category_id,
          state: l.state,
          description: l.description
        })),
        facility_context: facilityContext
      };

      const res = await fetch('/api/ai/compare-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(interval);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}: Failed to process AI comparison`);
      }

      const data: AIComparisonResult = await res.json();
      setAiResult(data);
    } catch (err: any) {
      console.error("AI comparison error:", err);
      setAiError(err.message || "Failed to generate AI technical analysis.");
    } finally {
      clearInterval(interval);
      setAiLoading(false);
    }
  };

  // Helper to format currency
  const formatMoney = (amount: number, currency: string = 'NGN') => {
    const symbol = currency === 'USD' ? '$' : '₦';
    return `${symbol}${amount.toLocaleString()}`;
  };

  // Helper to check if row values differ across selected devices
  const isRowDifferent = (getValue: (l: Listing) => any) => {
    if (selectedListings.length < 2) return false;
    const firstVal = getValue(selectedListings[0]);
    return selectedListings.some(l => String(getValue(l)) !== String(firstVal));
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-16 print:p-0">
      
      {/* HEADER HERO SECTION */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden print:hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>AI-Powered Biomedical Engineering Intelligence</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Medical Device Technical Comparison Engine
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
            Compare hospital equipment side-by-side across technical specifications, clinical applications, West African power grid resilience, Total Cost of Ownership (TCO), and AI-driven clinical suitability.
          </p>

          {/* FACILITY CONTEXT SELECTOR & ACTION HEADER */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-indigo-400 flex-shrink-0 ml-1" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Target Facility Type Context
                </label>
                <select
                  value={facilityContext}
                  onChange={(e) => {
                    setFacilityContext(e.target.value);
                    setAiResult(null);
                  }}
                  className="w-full bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="Tertiary Teaching Hospital / Apex Medical Center" className="bg-slate-900 text-white">
                    Tertiary Teaching Hospital (High Throughput & ICU Specialist)
                  </option>
                  <option value="Secondary General Hospital / Surgical Center" className="bg-slate-900 text-white">
                    Secondary General Hospital / Surgical Center
                  </option>
                  <option value="Private Diagnostic & Radiography Center" className="bg-slate-900 text-white">
                    Private Diagnostic & Radiography Imaging Center
                  </option>
                  <option value="Specialist ICU & Emergency Surgical Suite" className="bg-slate-900 text-white">
                    Specialist ICU & Critical Care Emergency Unit
                  </option>
                  <option value="Rural Primary Healthcare Center (Solar / Off-Grid)" className="bg-slate-900 text-white">
                    Rural Primary Healthcare Center (Surge Protection & Battery Dependent)
                  </option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunAiComparison}
              disabled={aiLoading || selectedListings.length < 2}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-50 text-white px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex-shrink-0"
            >
              {aiLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Analyzing with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Generate AI Clinical Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* QUICK PRESETS BANNER */}
      {presets.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-2 print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>Quick Technical Comparison Presets</span>
            </span>
            <span className="text-[11px] text-slate-500">Select pre-configured equipment sets</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(preset.ids)}
                className="text-left bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl p-3 transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 flex items-center justify-between">
                  <span>{preset.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LOADING STATE CARD */}
      {aiLoading && (
        <div className="bg-indigo-950 text-white border border-indigo-800 rounded-3xl p-8 shadow-xl space-y-6 text-center animate-pulse">
          <div className="h-12 w-12 bg-indigo-600/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
            <Sparkles className="h-6 w-6 animate-spin" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-lg font-bold">Processing Clinical & Technical Intelligence...</h3>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Gemini 3.6 Flash is synthesizing transducer specifications, power surge tolerances, 3-year TCO projections, and local biomedical engineer maintainability for West Africa.
            </p>
          </div>

          {/* Step Progress indicators */}
          <div className="max-w-md mx-auto grid grid-cols-4 gap-2 pt-2">
            {[
              "Spec Scan",
              "TCO Projections",
              "Grid Assessment",
              "Clinical Verdict"
            ].map((stepLabel, idx) => {
              const active = loadingStep >= idx + 1;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${active ? 'bg-indigo-400' : 'bg-slate-800'}`} />
                  <span className={`text-[10px] font-bold block ${active ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {stepLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {aiError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold">AI Analysis Failed: </span>
            <span>{aiError}</span>
          </div>
          <button
            onClick={handleRunAiComparison}
            className="bg-rose-600 text-white px-3 py-1.5 rounded-lg font-bold text-[11px] hover:bg-rose-700 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* AI ANALYSIS RESULTS DASHBOARD */}
      {aiResult && !aiLoading && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                <Award className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">AI Clinical & Technical Evaluation Report</h2>
                <p className="text-[11px] text-slate-400">Context: {facilityContext}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintReport}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              >
                <Printer className="h-3.5 w-3.5 text-slate-400" />
                <span>Export Report</span>
              </button>
            </div>
          </div>

          {/* EXECUTIVE CLINICAL SUMMARY */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
              Clinical Executive Summary
            </span>
            <p className="text-slate-200 text-xs leading-relaxed">
              {aiResult.executiveSummary}
            </p>
          </div>

          {/* WINNER SPOTLIGHT CARD */}
          {aiResult.winningDeviceTitle && (
            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 px-4 py-1 rounded-bl-2xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Award className="h-3 w-3" />
                <span>Recommended Top Pick</span>
              </div>

              <div className="space-y-2 max-w-3xl">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Target Facility Winner
                </span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{aiResult.winningDeviceTitle}</span>
                </h3>
                <p className="text-emerald-100 text-xs leading-relaxed">
                  {aiResult.winningReason}
                </p>
              </div>
            </div>
          )}

          {/* INDIVIDUAL EVALUATION CARDS GRID */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Device Technical Scores & 3-Year TCO Projections
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiResult.deviceEvaluations.map((evalItem, idx) => (
                <div key={idx} className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-white line-clamp-2">
                        {evalItem.deviceTitle}
                      </h4>
                      <div className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap">
                        {evalItem.clinicalSuitabilityScore}/100
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">3-Yr TCO (Est.)</span>
                        <span className="text-xs font-extrabold text-emerald-400">
                          {formatMoney(evalItem.tco3YearEstimateNaira)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Consumables</span>
                        <span className="text-xs font-bold text-slate-200">
                          {evalItem.consumableCostRating} Cost
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Power Grid Resilience</span>
                      <div className="text-[11px] text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg leading-snug">
                        {evalItem.powerGridReadiness}
                      </div>
                    </div>

                    {/* Pros & Cons */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Key Advantages:</span>
                      <ul className="space-y-1 text-[11px] text-slate-300">
                        {evalItem.keyPros.map((pro, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>

                      {evalItem.keyCons && evalItem.keyCons.length > 0 && (
                        <>
                          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block pt-1">Operational Considerations:</span>
                          <ul className="space-y-1 text-[11px] text-slate-400">
                            {evalItem.keyCons.map((con, cIdx) => (
                              <li key={cIdx} className="flex items-start gap-1.5">
                                <XCircle className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Biomedical Repairability:</span>
                    <span className="font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                      {evalItem.biomedicalMaintainabilityScore} / 10 Score
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HEAD TO HEAD BENCHMARKS */}
          {aiResult.headToHeadGrid && aiResult.headToHeadGrid.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Head-to-Head Dimension Benchmarks
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiResult.headToHeadGrid.map((bench, bIdx) => (
                  <div key={bIdx} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300">{bench.dimension}</span>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        Best: {bench.bestDeviceTitle}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {bench.analysis}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROCUREMENT COMMITTEE ADVISORY */}
          {aiResult.procurementRecommendation && (
            <div className="bg-slate-800/80 border border-indigo-500/30 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Procurement & Risk Mitigation Advisory</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Negotiation Terms</span>
                  <p className="text-slate-200 text-[11px] leading-relaxed">
                    {aiResult.procurementRecommendation.negotiationAdvice}
                  </p>
                </div>

                <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Recommended Spare Parts Kit</span>
                  <ul className="space-y-1 text-[11px] text-slate-200">
                    {aiResult.procurementRecommendation.recommendedSpareParts.map((sp, sIdx) => (
                      <li key={sIdx} className="flex items-center gap-1">
                        <span className="h-1 w-1 bg-indigo-400 rounded-full" />
                        <span>{sp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Escrow Protection Guidance</span>
                  <p className="text-slate-200 text-[11px] leading-relaxed">
                    {aiResult.procurementRecommendation.escrowSafetyNotes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SIDE-BY-SIDE TECHNICAL MATRIX TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        
        {/* CONTROL TOOLBAR ABOVE TABLE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-150">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
              <span>Technical Specification Matrix</span>
            </h2>
            <p className="text-xs text-slate-500">
              Comparing {selectedListings.length} equipment units. Highlight differences or customize device selection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setHighlightDifferences(!highlightDifferences)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                highlightDifferences
                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-amber-600" />
              <span>{highlightDifferences ? 'Differences Highlighted' : 'Highlight Differences'}</span>
            </button>

            {selectedIds.length < 4 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Equipment ({selectedIds.length}/4)</span>
              </button>
            )}
          </div>
        </div>

        {/* COMPARISON MATRIX TABLE */}
        {selectedListings.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-3">
            <Layers className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs">No equipment selected for side-by-side comparison.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer"
            >
              Select Medical Equipment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="w-48 bg-slate-50/80 p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky left-0 z-20 shadow-sm">
                    Equipment Specification
                  </th>
                  {selectedListings.map((listing) => (
                    <th key={listing.id} className="p-4 border-b border-slate-200 min-w-[240px] max-w-[280px] vertical-top">
                      <div className="space-y-3">
                        {/* Device Thumbnail */}
                        <div className="relative h-36 w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/80 group">
                          {listing.images && listing.images.length > 0 ? (
                            <img
                              src={listing.images[0]}
                              alt={listing.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                              No Image
                            </div>
                          )}

                          <button
                            onClick={() => handleRemoveDevice(listing.id)}
                            className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white p-1.5 rounded-full transition-all cursor-pointer"
                            title="Remove from comparison"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>

                          <div className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                            {listing.brand || 'Generic'}
                          </div>
                        </div>

                        {/* Title & Pricing */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                            {listing.title}
                          </h3>
                          <div className="text-sm font-black text-indigo-600 mt-1">
                            {formatMoney(listing.price, listing.currency)}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>Condition:</span>
                            <span className="font-bold capitalize text-slate-700">{listing.condition.replace('_', ' ')}</span>
                          </div>
                        </div>

                        {/* Direct CTAs */}
                        <div className="space-y-1.5 pt-1">
                          {onNavigateToEscrow && (
                            <button
                              onClick={() => onNavigateToEscrow(listing.id)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Escrow Purchase</span>
                            </button>
                          )}

                          {onNavigateToFinancing && (
                            <button
                              onClick={() => onNavigateToFinancing(listing.id)}
                              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer border border-slate-200"
                            >
                              <DollarSign className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Apply Financing</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                
                {/* CATEGORY 1: GENERAL SPECIFICATIONS */}
                <tr className="bg-slate-100/70 font-bold text-slate-800">
                  <td colSpan={selectedListings.length + 1} className="px-4 py-2 text-[10px] uppercase tracking-wider text-indigo-600">
                    1. Overview & Supplier Credentials
                  </td>
                </tr>

                <tr className={highlightDifferences && isRowDifferent(l => l.brand) ? 'bg-amber-50/70' : ''}>
                  <td className="p-4 font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-100">
                    Manufacturer / Brand
                  </td>
                  {selectedListings.map(l => (
                    <td key={l.id} className="p-4 font-semibold text-slate-900">
                      {l.brand || 'Generic Supplier'}
                    </td>
                  ))}
                </tr>

                <tr className={highlightDifferences && isRowDifferent(l => l.model) ? 'bg-amber-50/70' : ''}>
                  <td className="p-4 font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-100">
                    Model Number
                  </td>
                  {selectedListings.map(l => (
                    <td key={l.id} className="p-4 font-mono text-[11px] text-slate-800">
                      {l.model || 'Standard Edition'}
                    </td>
                  ))}
                </tr>

                <tr className={highlightDifferences && isRowDifferent(l => l.state) ? 'bg-amber-50/70' : ''}>
                  <td className="p-4 font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-100">
                    Warehouse State Location
                  </td>
                  {selectedListings.map(l => (
                    <td key={l.id} className="p-4 text-slate-800 font-medium">
                      {l.state}, Nigeria ({l.city})
                    </td>
                  ))}
                </tr>

                <tr className={highlightDifferences && isRowDifferent(l => l.seller_name) ? 'bg-amber-50/70' : ''}>
                  <td className="p-4 font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-100">
                    Authorized Supplier
                  </td>
                  {selectedListings.map(l => (
                    <td key={l.id} className="p-4">
                      <div className="font-bold text-slate-900">{l.seller_name || 'Verified Dealer'}</div>
                      {l.seller_verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                          <ShieldCheck className="h-3 w-3" /> CAC Verified
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* CATEGORY 2: FINANCIAL & LEASING */}
                <tr className="bg-slate-100/70 font-bold text-slate-800">
                  <td colSpan={selectedListings.length + 1} className="px-4 py-2 text-[10px] uppercase tracking-wider text-indigo-600">
                    2. Pricing, Escrow & Lease Estimates
                  </td>
                </tr>

                <tr className={highlightDifferences && isRowDifferent(l => l.price) ? 'bg-amber-50/70' : ''}>
                  <td className="p-4 font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-100">
                    Outright Acquisition Price
                  </td>
                  {selectedListings.map(l => (
                    <td key={l.id} className="p-4 font-extrabold text-slate-900">
                      {formatMoney(l.price, l.currency)}
                      {l.negotiable && <span className="block text-[10px] font-normal text-slate-500">Negotiable Offer</span>}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-100">
                    Est. Lease Repayment (24 Months)
                  </td>
                  {selectedListings.map(l => {
                    const financed = l.price * 0.85; // 15% down
                    const rate = 0.17 / 12;
                    const monthly = Math.round((financed * rate * Math.pow(1 + rate, 24)) / (Math.pow(1 + rate, 24) - 1));
                    return (
                      <td key={l.id} className="p-4">
                        <span className="font-bold text-indigo-600">{formatMoney(monthly, l.currency)} / mo</span>
                        <span className="block text-[10px] text-slate-400">15% Down payment ({formatMoney(Math.round(l.price * 0.15), l.currency)})</span>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-100">
                    Escrow Protection Status
                  </td>
                  {selectedListings.map(l => (
                    <td key={l.id} className="p-4">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Lock className="h-3 w-3" /> Eligible for Escrow
                      </span>
                    </td>
                  ))}
                </tr>

                {/* CATEGORY 3: TECHNICAL & CLINICAL SPECIFICATIONS */}
                <tr className="bg-slate-100/70 font-bold text-slate-800">
                  <td colSpan={selectedListings.length + 1} className="px-4 py-2 text-[10px] uppercase tracking-wider text-indigo-600">
                    3. Clinical Description & Functional Features
                  </td>
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-100">
                    Clinical Overview & Capabilities
                  </td>
                  {selectedListings.map(l => (
                    <td key={l.id} className="p-4 leading-relaxed text-slate-600 text-[11px]">
                      <p className="line-clamp-4">{l.description || 'Standard technical documentation available on order.'}</p>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-100">
                    Stock & Availability
                  </td>
                  {selectedListings.map(l => (
                    <td key={l.id} className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        l.stock_status === 'in_stock' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {l.stock_status ? l.stock_status.replace('_', ' ') : 'In Stock'}
                      </span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-100">
                    Biomedical Engineering Inspection
                  </td>
                  {selectedListings.map(l => (
                    <td key={l.id} className="p-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-bold">
                        <Wrench className="h-3.5 w-3.5" /> Sign-off Available
                      </span>
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD EQUIPMENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <span>Add Equipment to Comparison</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Search by product name, brand, or model..."
              value={addSearchQuery}
              onChange={(e) => setAddSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {listings
                .filter(l => !selectedIds.includes(l.id))
                .filter(l => l.title.toLowerCase().includes(addSearchQuery.toLowerCase()) || l.brand.toLowerCase().includes(addSearchQuery.toLowerCase()))
                .map(l => (
                  <div
                    key={l.id}
                    onClick={() => handleAddDevice(l.id)}
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 rounded-xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                        {l.images && l.images[0] ? (
                          <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">N/A</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 line-clamp-1">
                          {l.title}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {l.brand} • {formatMoney(l.price, l.currency)}
                        </div>
                      </div>
                    </div>

                    <button className="bg-indigo-600 text-white p-1.5 rounded-lg group-hover:scale-105 transition-transform">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
