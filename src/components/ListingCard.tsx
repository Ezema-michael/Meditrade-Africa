/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Listing } from '../types';
import { MapPin, Phone, ShieldCheck, Heart, Share2, Sparkles, AlertTriangle, MessageSquare, CheckCircle, Eye } from 'lucide-react';

interface ListingCardProps {
  key?: string | number;
  listing: Listing;
  onContactClick: (id: string, whatsappNumber: string) => any;
  onReportClick: (id: string) => void;
  onRefresh?: () => void;
  onInquireChat?: (listingId: string) => void;
}

export default function ListingCard({ listing, onContactClick, onReportClick, onRefresh, onInquireChat }: ListingCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const priceFormatted = listing.currency === 'NGN'
    ? `₦${listing.price.toLocaleString()}`
    : `$${listing.price.toLocaleString()}`;

  const getUrgencyBadgeColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'refurbished': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/listings/${listing.slug}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div id={`listing-card-${listing.id}`} className="group relative bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full hover:border-indigo-600/30">
      {/* Listing Images Carousel / Hero */}
      <div className="relative h-48 w-full bg-slate-50 overflow-hidden">
        <img
          src={listing.images[0]}
          alt={listing.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border uppercase tracking-wider ${getUrgencyBadgeColor(listing.condition)}`}>
            {listing.condition}
          </span>
          {listing.featured && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
              <Sparkles className="h-3 w-3" /> Featured
            </span>
          )}
          {listing.is_ai_extracted && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
              <Sparkles className="h-3 w-3" /> AI Extracted
            </span>
          )}
        </div>

        {/* Favorite Trigger */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className={`p-2 rounded-xl backdrop-blur-md transition-all border ${
              isFavorite 
                ? 'bg-rose-50 border-rose-100 text-rose-500' 
                : 'bg-white/80 hover:bg-white border-slate-100 text-slate-500 hover:text-rose-500'
            }`}
          >
            <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Status indicator for seller inventory review */}
        {listing.status !== 'published' && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-center p-3">
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white shadow-sm uppercase tracking-wider">
              {listing.status.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Location & Brand details */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2.5">
            <span className="bg-slate-50 px-2 py-1 rounded-md max-w-[120px] truncate">
              {listing.brand || 'No Brand'}
            </span>
            <span className="flex items-center gap-1 font-normal">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {listing.city ? `${listing.city}, ` : ''}{listing.state}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors mb-2 line-clamp-2">
            {listing.title}
          </h3>

          {/* Price and negotiation stance */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xl font-bold text-indigo-600">{priceFormatted}</span>
            {listing.negotiable && (
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-md">
                Negotiable
              </span>
            )}
          </div>

          {/* Short Description excerpt */}
          <p className="text-slate-600 text-xs leading-relaxed mb-4 line-clamp-3">
            {listing.description || 'No detailed documentation offered by the healthcare supplier.'}
          </p>
        </div>

        {/* Bottom Panel Actions & Analytics */}
        <div className="pt-4 border-t border-slate-100 mt-auto">
          {/* Seller micro profile */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-indigo-50 rounded-full flex items-center justify-center font-bold text-xs text-indigo-600">
                {listing.seller_name ? listing.seller_name.trim().charAt(0) : 'S'}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1 max-w-[130px] truncate">
                  {listing.seller_name || 'Verified Supplier'}
                  {listing.seller_verified && (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 fill-emerald-100 flex-shrink-0" title="CAC Verification Approved" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span>Rating: 4.8</span>
                </div>
              </div>
            </div>

            {/* View indicators */}
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-0.5">
                <Eye className="h-3 w-3" /> {listing.view_count}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5" title="WhatsApp clicks">
                <MessageSquare className="h-3 w-3 text-emerald-500" /> {listing.whatsapp_click_count}
              </span>
            </div>
          </div>

          {/* Instant Contact & Secure Chat actions */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => onContactClick(listing.id, listing.seller_whatsapp || '+2348000000000')}
                className="flex-1 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Open WhatsApp chat with vendor"
              >
                <Phone className="h-3.5 w-3.5 fill-white" />
                <span>WhatsApp</span>
              </button>
              
              <button
                onClick={() => onInquireChat?.(listing.id)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 px-2.5 flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Send inquiry on MediTrade Platform Chat"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Secure Chat</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className={`flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer ${isCopied ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : ''}`}
                title="Share Listing link"
              >
                {isCopied ? <CheckCircle className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>Share Link</span>
              </button>
              
              <button
                onClick={() => onReportClick(listing.id)}
                className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                title="Report listing as suspicious"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold">Flag</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
