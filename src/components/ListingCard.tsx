/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Listing } from '../types';
import { MapPin, Phone, ShieldCheck, Heart, Share2, Sparkles, AlertTriangle, MessageSquare, CheckCircle, Eye, X } from 'lucide-react';

interface ListingCardProps {
  key?: string | number;
  listing: Listing;
  onContactClick: (id: string, whatsappNumber: string) => any;
  onReportClick: (id: string) => void;
  onRefresh?: () => void;
  onInquireChat?: (listingId: string) => void;
  currentUser?: any;
}

export default function ListingCard({ listing, onContactClick, onReportClick, onRefresh, onInquireChat, currentUser }: ListingCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Offers integration states
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);

  const handleOpenOfferModal = () => {
    setBuyerName(currentUser?.displayName || currentUser?.businessName || 'Fatima');
    setBuyerContact(currentUser?.phone || currentUser?.email || 'buyer@riversidememorial.org');
    setOfferAmount(Math.round(listing.price * 0.9).toString()); // Pre-fill with standard 10% discount negotiation block
    setOfferMessage(`Hello, we are interested in purchasing the ${listing.title} for our clinical facility. We would like to place an official offer of ${listing.currency === 'USD' ? '$' : '₦'}${Math.round(listing.price * 0.9).toLocaleString()}. Please let us know if this works.`);
    setShowOfferModal(true);
    setOfferSuccess(false);
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName || !buyerContact || !offerAmount) {
      alert('Please fill out all required fields.');
      return;
    }

    setOfferSubmitting(true);
    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listing_id: listing.id,
          buyer_id: currentUser?.id,
          buyer_name: buyerName,
          buyer_contact: buyerContact,
          offer_amount: Number(offerAmount),
          currency: listing.currency,
          message: offerMessage
        })
      });

      if (response.ok) {
        setOfferSuccess(true);
        setTimeout(() => {
          setShowOfferModal(false);
          setOfferSuccess(false);
          if (onRefresh) onRefresh();
        }, 1800);
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to submit offer.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting offer.');
    } finally {
      setOfferSubmitting(false);
    }
  };

  const priceFormatted = listing.currency === 'NGN'
    ? `₦${listing.price.toLocaleString()}`
    : `$${listing.price.toLocaleString()}`;

  const getUrgencyBadgeColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'refurbished': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'working_used':
      case 'used': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'faulty': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'parts_only': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'scrap': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'new': return 'New';
      case 'refurbished': return 'Refurbished';
      case 'working_used':
      case 'used': return 'Working Used';
      case 'faulty': return 'Faulty';
      case 'parts_only': return 'For Parts';
      case 'scrap': return 'Scrap / Salvage';
      default: return condition;
    }
  };

  const getListingTypeBadge = (type: string | undefined) => {
    switch (type) {
      case 'make_offer':
        return (
          <span className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-indigo-100 text-indigo-850 border border-indigo-200 flex items-center gap-0.5 shadow-2xs">
            ◉ Make Offer
          </span>
        );
      case 'auction_parts_faulty':
        return (
          <span className="px-2.5 py-1 text-[10.5px] font-black rounded-lg bg-amber-600 text-white border border-amber-500 flex items-center gap-0.5 shadow-2xs uppercase tracking-tight">
            ⚒ Auction: Parts / Faulty
          </span>
        );
      case 'scrap_salvage':
        return (
          <span className="px-2.5 py-1 text-[10.5px] font-black rounded-lg bg-rose-600 text-white border border-rose-500 flex items-center gap-0.5 shadow-2xs uppercase tracking-tight">
            ☠ Scrap / Salvage
          </span>
        );
      case 'auction_only':
        return (
          <span className="px-2.5 py-1 text-[10.5px] font-black rounded-lg bg-purple-600 text-white border border-purple-500 flex items-center gap-0.5 shadow-2xs uppercase tracking-tight">
            ⚿ Auction Only
          </span>
        );
      case 'fixed':
      default:
        return (
          <span className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-0.5 shadow-2xs">
            ◉ Fixed Price
          </span>
        );
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
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none z-10">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border uppercase tracking-wider ${getUrgencyBadgeColor(listing.condition)}`}>
            {getConditionLabel(listing.condition)}
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
          {getListingTypeBadge(listing.listing_type)}
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
              {listing.listing_type && listing.listing_type !== 'fixed' ? (
                <button
                  onClick={handleOpenOfferModal}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer ring-1 ring-indigo-500/10"
                  title={
                    listing.listing_type.startsWith('auction') || listing.listing_type === 'scrap_salvage'
                      ? "Place a bidding offer on this clinical asset"
                      : "Place a price offer to purchase this equipment"
                  }
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                  <span>
                    {listing.listing_type === 'make_offer'
                      ? 'Make Offer'
                      : listing.listing_type === 'auction_parts_faulty'
                      ? 'Bid For Parts'
                      : listing.listing_type === 'scrap_salvage'
                      ? 'Bid Scrap/Salvage'
                      : 'Place Bid'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => onContactClick(listing.id, listing.seller_whatsapp || '+2348000000000')}
                  className="flex-1 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Open WhatsApp chat with vendor"
                >
                  <Phone className="h-3.5 w-3.5 fill-white" />
                  <span>WhatsApp</span>
                </button>
              )}
              
              <button
                onClick={() => onInquireChat?.(listing.id)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl py-2 px-2 flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Send inquiry on MediTrade Platform Chat"
              >
                <MessageSquare className="h-3.5 w-3.5 text-indigo-650" />
                <span>Inquire / Chat</span>
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

      {/* MAKE OFFER MODAL OVERLAY */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-150 shadow-2xl relative space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles className="h-5 w-5 text-indigo-650 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                    {listing.listing_type && (listing.listing_type.startsWith('auction') || listing.listing_type === 'scrap_salvage')
                      ? 'Submit Clinical Asset Bid'
                      : 'Submit Private Negotiation Offer'}
                  </h4>
                  <p className="text-slate-400 text-[10px] font-bold uppercase mt-0.5">
                    MediTrade Clinical Sourcing CRM
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOfferModal(false)}
                className="text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Selected Listing Context Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex gap-3 items-center">
              <img
                src={listing.images[0]}
                alt={listing.title}
                referrerPolicy="no-referrer"
                className="h-12 w-12 object-cover rounded-lg border"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[9.5px] bg-slate-200 text-slate-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {listing.listing_type && (listing.listing_type.startsWith('auction') || listing.listing_type === 'scrap_salvage')
                    ? 'Bidding Item'
                    : 'Negotiating Item'}
                </span>
                <h5 className="font-bold text-slate-800 text-xs truncate mt-0.5">{listing.title}</h5>
                <p className="text-[11px] text-slate-400 font-medium">
                  Listed retail price: <strong className="text-indigo-600">{priceFormatted}</strong>
                </p>
              </div>
            </div>

            {offerSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">Offer Transmitted Successfully!</h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto">
                    Your customized proposal has been recorded on the vendor's CRM dashboard and entered into direct platform chats.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOfferSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Buyer Hospital / Facility Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="e.g. Riverside Memorial Hospital"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Direct Whatsapp / Email Contact *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerContact}
                      onChange={(e) => setBuyerContact(e.target.value)}
                      placeholder="e.g. buyer@riverside.org or +234..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex justify-between">
                    <span>
                      {listing.listing_type && (listing.listing_type.startsWith('auction') || listing.listing_type === 'scrap_salvage')
                        ? 'Proposed Bid Amount'
                        : 'Proposed Offer Amount'}{' '}
                      ({listing.currency}) *
                    </span>
                    <span className="text-slate-350">Stated in {listing.currency} currency</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">
                      {listing.currency === 'USD' ? '$' : '₦'}
                    </span>
                    <input
                      type="number"
                      required
                      min={100}
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="e.g. 15000000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-8 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Listed Price: {priceFormatted}. Prefilled with a standard 10% commercial negotiation target.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Negotiation Terms / Personal Message
                  </label>
                  <textarea
                    rows={3}
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    placeholder="Provide details about delivery conditions, calibration warranties, or special payment schedules..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>

                {/* Modal Footer Actions */}
                <div className="flex justify-end gap-2.5 pt-2 text-xs border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowOfferModal(false)}
                    className="px-4.5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={offerSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                  >
                    {offerSubmitting ? 'Transmitting Proposal...' : 'Transmit Official Offer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
