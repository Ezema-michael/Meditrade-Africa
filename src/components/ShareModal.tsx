/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  MessageSquare, 
  Mail, 
  Send, 
  Smartphone, 
  Globe,
  Sparkles
} from 'lucide-react';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  url: string;
  image?: string;
  priceFormatted?: string;
  category?: string;
}

export function ShareModal({
  isOpen,
  onClose,
  title,
  text = 'Check out this verified medical equipment on MediTrade Marketplace:',
  url,
  image,
  priceFormatted,
  category
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [nativeShared, setNativeShared] = useState(false);

  if (!isOpen) return null;

  const fullShareText = `${title}${priceFormatted ? ` (${priceFormatted})` : ''}\n${customNote ? customNote + '\n' : ''}${text ? text + '\n' : ''}${url}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title}${priceFormatted ? ` - ${priceFormatted}` : ''}. ${text}`,
          url
        });
        setNativeShared(true);
        setTimeout(() => setNativeShared(false), 2500);
      } catch (err) {
        // User cancelled or share failed
        console.log('Share dismissed or failed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  // Supported sharing platforms
  const sharePlatforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500',
      iconColor: 'text-white',
      badge: 'Popular',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`,
      svgIcon: (
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      )
    },
    {
      id: 'facebook',
      name: 'Facebook',
      color: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500',
      iconColor: 'text-white',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      svgIcon: (
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      color: 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700',
      iconColor: 'text-white',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title}${priceFormatted ? ` (${priceFormatted})` : ''}`)}&url=${encodeURIComponent(url)}`,
      svgIcon: (
        <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      color: 'bg-sky-700 hover:bg-sky-800 text-white border-sky-600',
      iconColor: 'text-white',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      svgIcon: (
        <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
      )
    },
    {
      id: 'telegram',
      name: 'Telegram',
      color: 'bg-sky-500 hover:bg-sky-600 text-white border-sky-400',
      iconColor: 'text-white',
      url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(fullShareText)}`,
      svgIcon: (
        <Send className="h-4.5 w-4.5" />
      )
    },
    {
      id: 'email',
      name: 'Email',
      color: 'bg-slate-700 hover:bg-slate-800 text-white border-slate-600',
      iconColor: 'text-white',
      url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullShareText)}`,
      svgIcon: (
        <Mail className="h-4.5 w-4.5" />
      )
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative space-y-5 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <Share2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">
                Share Medical Equipment
              </h3>
              <p className="text-slate-400 text-xs font-medium">
                Choose your preferred app or platform to share this asset
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Item Preview Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex gap-3.5 items-center">
          {image ? (
            <img
              src={image}
              alt={title}
              referrerPolicy="no-referrer"
              className="h-14 w-14 object-cover rounded-xl border border-slate-200 shrink-0"
            />
          ) : (
            <div className="h-14 w-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-extrabold text-lg shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {category && (
              <span className="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                {category}
              </span>
            )}
            <h4 className="font-bold text-slate-900 text-xs truncate mt-0.5">{title}</h4>
            {priceFormatted && (
              <p className="text-xs font-extrabold text-indigo-600 mt-0.5">
                {priceFormatted}
              </p>
            )}
            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
              {url}
            </p>
          </div>
        </div>

        {/* Device Native Apps Share Button */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white rounded-2xl py-3 px-4 font-black text-xs transition-all cursor-pointer shadow-md shadow-indigo-900/20 flex items-center justify-center gap-2 border border-indigo-500/30 group"
          >
            <Smartphone className="h-4 w-4 text-cyan-300 group-hover:scale-110 transition-transform" />
            <span>{nativeShared ? 'Opened Native Share Menu!' : 'Share via Installed Apps (WhatsApp, Messenger, etc.)'}</span>
          </button>
        )}

        {/* Grid of Platform Share Buttons */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2.5">
            Select Share Destination
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {sharePlatforms.map((platform) => (
              <a
                key={platform.id}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between p-3 rounded-2xl border font-extrabold text-xs transition-all cursor-pointer shadow-2xs hover:shadow-sm group ${platform.color}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={platform.iconColor}>{platform.svgIcon}</span>
                  <span className="truncate">{platform.name}</span>
                </div>
                {platform.badge && (
                  <span className="text-[8.5px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">
                    {platform.badge}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* Custom Message Field */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
            Optional Custom Message / Note
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. Hi Doctor, check this CT scanner for our radiology department..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
          />
        </div>

        {/* Direct Link Input & Copy Button */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Direct Share Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-600 font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                copied 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-800 shadow-xs'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
