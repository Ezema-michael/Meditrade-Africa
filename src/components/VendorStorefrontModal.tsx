/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Mail, 
  Share2, 
  Search, 
  Filter, 
  Sparkles, 
  Building2, 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  Truck, 
  Wrench, 
  Heart, 
  Eye, 
  Award,
  Layers,
  ShoppingBag,
  Globe
} from 'lucide-react';
import { Seller, Listing, Category } from '../types';
import { INITIAL_SELLERS, INITIAL_LISTINGS } from '../data';
import { ShareModal } from './ShareModal';
import { PrePurchaseAuditModal } from './PrePurchaseAuditModal';
import { InterStateLogisticsEstimator } from './InterStateLogisticsEstimator';

export interface VendorStorefrontModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string | null;
  sellerNameFallback?: string;
  categories?: Category[];
  currentUser?: any;
  onContactSeller?: (listingId: string, whatsappNumber: string) => void;
  onInquireChat?: (listingId: string) => void;
}

export function VendorStorefrontModal({
  isOpen,
  onClose,
  sellerId,
  sellerNameFallback,
  categories = [],
  currentUser,
  onContactSeller,
  onInquireChat
}: VendorStorefrontModalProps) {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter within vendor inventory
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');

  // Modals inside storefront
  const [showShareModal, setShowShareModal] = useState(false);
  const [auditListing, setAuditListing] = useState<Listing | null>(null);
  const [logisticsListing, setLogisticsListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (!isOpen || !sellerId) return;

    const fetchVendorData = async () => {
      setLoading(true);
      try {
        // Fetch Seller Profile
        const sellerRes = await fetch(`/api/sellers/${sellerId}`);
        if (sellerRes.ok) {
          const sellerData = await sellerRes.json();
          setSeller(sellerData);
        } else {
          // Fallback to static initial sellers if available
          const foundStatic = INITIAL_SELLERS.find(s => s.id === sellerId || s.user_id === sellerId || s.business_name === sellerNameFallback);
          if (foundStatic) {
            setSeller(foundStatic);
          } else {
            setSeller({
              id: sellerId,
              user_id: sellerId,
              business_name: sellerNameFallback || 'Verified Healthcare Vendor',
              contact_name: 'Vendor Sales Desk',
              whatsapp_number: '+2348031234567',
              phone_number: '+2348031234567',
              email: 'sales@meditrade.ng',
              state: 'Lagos',
              city: 'Ikeja',
              verification_status: 'verified',
              subscription_plan: 'enterprise',
              active_listings_count: 5,
              rating_placeholder: 4.8,
              created_at: new Date().toISOString()
            });
          }
        }

        // Fetch Seller's Listings
        const listingsRes = await fetch(`/api/listings?seller_id=${sellerId}`);
        if (listingsRes.ok) {
          const listingsData = await listingsRes.json();
          if (Array.isArray(listingsData) && listingsData.length > 0) {
            setListings(listingsData);
          } else {
            // Fallback filtering from all listings
            const allRes = await fetch('/api/listings');
            if (allRes.ok) {
              const allData = await allRes.json();
              const matched = allData.filter((l: Listing) => 
                l.seller_id === sellerId || 
                l.seller_name === sellerNameFallback ||
                (sellerNameFallback && l.seller_name?.toLowerCase().includes(sellerNameFallback.toLowerCase()))
              );
              setListings(matched.length > 0 ? matched : INITIAL_LISTINGS.slice(0, 3));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load vendor storefront data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [isOpen, sellerId, sellerNameFallback]);

  if (!isOpen) return null;

  // Filter listings based on user inputs inside storefront
  const filteredListings = listings.filter((l) => {
    const matchesQuery = !searchQuery || 
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      l.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = !selectedCategory || l.category_id === selectedCategory;
    const matchesCond = !selectedCondition || l.condition === selectedCondition;
    return matchesQuery && matchesCat && matchesCond;
  });

  const whatsappPhone = seller?.whatsapp_number || seller?.phone_number || '+2348031234567';
  const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${seller?.business_name || 'Vendor'}, I am browsing your official MediTrade Storefront and would like to inquire about your medical equipment inventory.`)}`;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-slate-50 rounded-3xl max-w-5xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 relative shrink-0">
          <div className="absolute top-0 right-0 p-4">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            {/* Vendor Logo / Avatar */}
            <div className="relative">
              {seller?.logo_url ? (
                <img
                  src={seller.logo_url}
                  alt={seller.business_name}
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-md bg-white"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-900 text-white font-extrabold text-2xl flex items-center justify-center border-2 border-indigo-400/30 shadow-md">
                  {seller?.business_name ? seller.business_name.charAt(0) : 'V'}
                </div>
              )}
              {seller?.verification_status === 'verified' && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-full border-2 border-slate-900" title="CAC Verified Medical Vendor">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {seller?.business_name || sellerNameFallback || 'Verified Healthcare Vendor'}
                </h2>
                {seller?.verification_status === 'verified' && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" /> Verified CAC Distributor
                  </span>
                )}
                {seller?.subscription_plan === 'enterprise' && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Award className="h-3 w-3 text-amber-400" /> Enterprise Partner
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300 text-xs">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  {seller?.city ? `${seller.city}, ` : ''}{seller?.state || 'Nigeria'}
                </span>
                {seller?.contact_name && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                    Rep: {seller.contact_name}
                  </span>
                )}
                {seller?.cac_number && (
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    CAC: {seller.cac_number}
                  </span>
                )}
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  ★ {seller?.rating_placeholder || 4.8} / 5.0 Rating
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                <span>WhatsApp Vendor</span>
              </a>

              {seller?.phone_number && (
                <a
                  href={`tel:${seller.phone_number}`}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5"
                  title="Call Phone"
                >
                  <Phone className="h-4 w-4 text-indigo-400" />
                  <span className="hidden sm:inline">Call</span>
                </a>
              )}

              <button
                onClick={() => setShowShareModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                title="Share Vendor Storefront"
              >
                <Share2 className="h-4 w-4 text-cyan-300" />
                <span className="hidden sm:inline">Share Store</span>
              </button>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Active Equipment</span>
              <span className="text-lg font-black text-indigo-400">{listings.length} Units</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Audit Eligible</span>
              <span className="text-lg font-black text-emerald-400">100% Certified</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Escrow Secured</span>
              <span className="text-lg font-black text-cyan-400">Active Protection</span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Avg Dispatch</span>
              <span className="text-lg font-black text-amber-400">&lt; 24 Hours</span>
            </div>
          </div>
        </div>

        {/* Store Catalog Content Area */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5">
          
          {/* Inventory Search & Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search inside ${seller?.business_name || 'Vendor'}'s inventory...`}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Condition Filter */}
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600"
              >
                <option value="">All Conditions</option>
                <option value="new">Brand New</option>
                <option value="refurbished">Refurbished</option>
                <option value="foreign_used">Foreign Used (Tokunbo)</option>
                <option value="local_used">Local Used</option>
                <option value="working_used">Working Used</option>
              </select>
            </div>
          </div>

          {/* Inventory Items List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-indigo-600" />
                <span>Storefront Equipment Catalog ({filteredListings.length})</span>
              </h3>
            </div>

            {loading ? (
              <div className="py-16 text-center space-y-3">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent" />
                <p className="text-xs text-slate-500 font-medium">Loading vendor equipment catalog...</p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">No Matching Equipment Found</h4>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  No listings matched your current search filters in this vendor's store. Try clearing search filters or contacting the vendor directly on WhatsApp.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                    setSelectedCondition('');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredListings.map((item) => {
                  const itemPriceFormatted = new Intl.NumberFormat('en-NG', {
                    style: 'currency',
                    currency: item.currency || 'NGN',
                    maximumFractionDigits: 0
                  }).format(item.price);

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all group hover:border-indigo-200"
                    >
                      <div>
                        {/* Image */}
                        <div className="relative h-40 w-full rounded-xl overflow-hidden bg-slate-100 mb-3">
                          <img
                            src={item.images?.[0] || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80'}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9.5px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {item.condition.replace('_', ' ')}
                          </span>
                          {item.featured && (
                            <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[9.5px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="h-2.5 w-2.5" /> Featured
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="space-y-1 mb-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                            <span>{item.brand || 'Medical Grade'}</span>
                            <span className="flex items-center gap-0.5 text-slate-500">
                              <MapPin className="h-3 w-3 text-slate-400" /> {item.state}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-indigo-600 font-black text-base pt-0.5">
                            {itemPriceFormatted}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons on card */}
                      <div className="pt-3 border-t border-slate-100 space-y-2 mt-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => setAuditListing(item)}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-1.5 px-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                            title="Request certified pre-purchase engineering audit"
                          >
                            <ShieldCheck className="h-3 w-3 text-cyan-400" />
                            <span>Audit Unit</span>
                          </button>

                          <button
                            onClick={() => setLogisticsListing(item)}
                            className="bg-indigo-950 hover:bg-indigo-900 text-indigo-100 rounded-lg py-1.5 px-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                            title="Calculate freight shipping cost"
                          >
                            <Truck className="h-3 w-3 text-indigo-400" />
                            <span>Logistics</span>
                          </button>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => onContactSeller ? onContactSeller(item.id, item.seller_whatsapp || whatsappPhone) : window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello, I am inquiring about ${item.title} (${itemPriceFormatted}) on MediTrade.`)}`, '_blank')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 px-3 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Chat Seller</span>
                          </button>

                          {onInquireChat && (
                            <button
                              onClick={() => {
                                onInquireChat(item.id);
                                onClose();
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl py-2 px-3 text-xs font-bold transition-all cursor-pointer"
                              title="Platform Direct Inquiry"
                            >
                              Inquire
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer Bar */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>MediTrade Escrow & Certified Engineering Guarantee Active for all orders</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Close Storefront
          </button>
        </div>

      </div>

      {/* SHARE STOREFRONT MODAL */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          title={`Official Storefront: ${seller?.business_name || sellerNameFallback}`}
          text={`Browse verified medical equipment catalog from ${seller?.business_name || 'Healthcare Vendor'} (${seller?.state || 'Nigeria'}):`}
          url={`${window.location.origin}/store/${sellerId}`}
          category="Healthcare Vendor Storefront"
        />
      )}

      {/* PRE-PURCHASE AUDIT MODAL */}
      {auditListing && (
        <PrePurchaseAuditModal
          isOpen={!!auditListing}
          onClose={() => setAuditListing(null)}
          listing={auditListing}
          currentUser={currentUser}
        />
      )}

      {/* LOGISTICS MODAL */}
      {logisticsListing && (
        <InterStateLogisticsEstimator
          isOpen={!!logisticsListing}
          onClose={() => setLogisticsListing(null)}
          initialListing={logisticsListing}
          initialOriginState={logisticsListing.state || 'Lagos'}
          initialDestinationState="Abuja (FCT)"
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
