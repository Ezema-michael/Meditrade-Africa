import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Image as ImageIcon, 
  Video, 
  Link as LinkIcon, 
  Eye, 
  Check, 
  X, 
  Globe, 
  PlayCircle, 
  ShoppingBag, 
  Info, 
  ExternalLink, 
  AlertCircle, 
  PlusCircle, 
  RefreshCw, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  ShieldCheck,
  ChevronDown,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { Listing, Category, Seller, ListingStatus } from '../types';
import { NIGERIAN_STATES } from '../data';
import FileUpload from './FileUpload';
import CustomSelect from './CustomSelect';

interface VendorDashboardProps {
  sellerProfile: Seller | null;
  categories: Category[];
  onListingChanged: () => void;
  currentUser: any;
}

export default function VendorDashboard({ sellerProfile, categories, onListingChanged, currentUser }: VendorDashboardProps) {
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState<Listing['condition']>('working_used');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [negotiable, setNegotiable] = useState(true);
  const [state, setState] = useState('Lagos');
  const [city, setCity] = useState('Ikeja');
  const [description, setDescription] = useState('');
  const [listingType, setListingType] = useState<Listing['listing_type']>('fixed');
  const [stockStatus, setStockStatus] = useState<Listing['stock_status']>('in_stock');

  // Media & Resource Lists State
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [videosList, setVideosList] = useState<string[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [linksList, setLinksList] = useState<string[]>([]); // Formatted as "label|url"
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Wizard Navigation functions
  const handleNextStep = () => {
    setStepError(null);
    if (currentStep === 1) {
      if (!title.trim()) {
        setStepError("Equipment Title is required to proceed.");
        return;
      }
      if (!categoryId) {
        setStepError("Equipment Category is required to proceed.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!price || Number(price) <= 0) {
        setStepError("A valid Price is required to proceed.");
        return;
      }
      if (!city.trim()) {
        setStepError("Sourcing Warehouse City is required to proceed.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    setStepError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Fetch Vendor Listings
  const fetchMyListings = async () => {
    if (!sellerProfile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings`);
      if (res.ok) {
        const data: Listing[] = await res.json();
        // Filter by current seller
        const filtered = data.filter(l => l.seller_id === sellerProfile.id);
        setMyListings(filtered);
      } else {
        setError('Failed to fetch your inventory.');
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred while loading your listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, [sellerProfile?.id]);

  // Open Edit/Create Modal
  const openModal = (listing?: Listing) => {
    if (listing) {
      setEditingListing(listing);
      setTitle(listing.title);
      setCategoryId(listing.category_id);
      setBrand(listing.brand);
      setModel(listing.model);
      setCondition(listing.condition);
      setPrice(listing.price.toString());
      setCurrency(listing.currency);
      setNegotiable(listing.negotiable);
      setState(listing.state);
      setCity(listing.city);
      setDescription(listing.description);
      setListingType(listing.listing_type || 'fixed');
      setStockStatus(listing.stock_status || 'in_stock');
      setImagesList(listing.images || []);
      setVideosList(listing.videos || []);
      setLinksList(listing.links || []);
    } else {
      setEditingListing(null);
      setTitle('');
      setCategoryId(categories[0]?.id || '');
      setBrand('');
      setModel('');
      setCondition('working_used');
      setPrice('');
      setCurrency('NGN');
      setNegotiable(true);
      setState('Lagos');
      setCity('Ikeja');
      setDescription('');
      setListingType('fixed');
      setStockStatus('in_stock');
      setImagesList([]);
      setVideosList([]);
      setLinksList([]);
    }
    setCurrentStep(1);
    setStepError(null);
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerProfile) {
      alert('Please connect or register your vendor account first.');
      return;
    }

    if (!title || !price || !categoryId) {
      alert('Required fields missing: Title, Price, and Category are required.');
      return;
    }

    // Prepare payload
    const payload = {
      seller_id: sellerProfile.id,
      category_id: categoryId,
      title,
      brand: brand || 'Generic',
      model: model || '',
      condition,
      price: Number(price),
      currency,
      negotiable,
      state,
      city,
      description,
      listing_type: listingType,
      stock_status: stockStatus,
      images: imagesList.length > 0 ? imagesList : ['https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80'],
      videos: videosList,
      links: linksList
    };

    try {
      let res;
      if (editingListing) {
        // PATCH existing
        res = await fetch(`/api/listings/${editingListing.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.id || ''}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // POST new
        res = await fetch(`/api/listings`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser?.id || ''}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchMyListings();
        onListingChanged();
        alert(editingListing ? 'Clinical asset listing updated successfully!' : 'Clinical listing submitted for approval board review!');
      } else {
        const errData = await res.json();
        alert(`Action failed: ${errData.error || 'Server rejected the parameters.'}`);
      }
    } catch (err) {
      console.error(err);
      alert('A network error occurred. Please try again.');
    }
  };

  // Delete Listing
  const handleDeleteListing = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this diagnostic asset listing? This action is irreversible.')) {
      return;
    }

    try {
      const res = await fetch(`/api/listings/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser?.id || ''}`
        }
      });
      if (res.ok) {
        fetchMyListings();
        onListingChanged();
      } else {
        alert('Could not delete listing. Please contact an administrative moderator.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Images Handler
  const addImage = () => {
    if (!newImageUrl || !newImageUrl.startsWith('http')) {
      alert('Please enter a valid HTTP/HTTPS image URL.');
      return;
    }
    setImagesList([...imagesList, newImageUrl]);
    setNewImageUrl('');
  };

  const removeImage = (index: number) => {
    setImagesList(imagesList.filter((_, i) => i !== index));
  };

  // Videos Handler
  const addVideo = () => {
    if (!newVideoUrl || !newVideoUrl.startsWith('http')) {
      alert('Please enter a valid HTTP/HTTPS video URL.');
      return;
    }
    setVideosList([...videosList, newVideoUrl]);
    setNewVideoUrl('');
  };

  const removeVideo = (index: number) => {
    setVideosList(videosList.filter((_, i) => i !== index));
  };

  // Links Handler
  const addLink = () => {
    if (!newLinkUrl || !newLinkUrl.startsWith('http')) {
      alert('Please enter a valid HTTP/HTTPS url.');
      return;
    }
    const label = newLinkLabel.trim() || 'Reference Spec sheet';
    setLinksList([...linksList, `${label}|${newLinkUrl}`]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const removeLink = (index: number) => {
    setLinksList(linksList.filter((_, i) => i !== index));
  };

  // Stats Counters
  const totalCount = myListings.length;
  const publishedCount = myListings.filter(l => l.status === 'published').length;
  const reviewCount = myListings.filter(l => l.status === 'pending_review').length;
  const totalViews = myListings.reduce((acc, curr) => acc + (curr.view_count || 0), 0);
  const totalInquiries = myListings.reduce((acc, curr) => acc + (curr.whatsapp_click_count || 0), 0);

  if (!sellerProfile) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto shadow-sm">
        <div className="mx-auto h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h3 className="font-extrabold text-slate-900 text-lg">Setup Vendor Identity</h3>
        <p className="text-slate-500 text-xs leading-relaxed">
          Please select or register a valid <strong>Healthcare Vendor / Seller</strong> node from the top menu workspace selector to launch your personalized inventory dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Header and Profile summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-5">
        <div>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-indigo-655" /> Vendor Workspace
          </span>
          <h2 className="font-black text-slate-900 text-2xl tracking-tight mt-1.5">
            Merchant Inventory & Sourcing CRM
          </h2>
          <p className="text-slate-500 text-xs">
            Manage your clinical catalog, append high-fidelity spec documentation, video demonstrations, and track buyer inquiry stats.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Listing Manually</span>
          </button>
          <button
            onClick={fetchMyListings}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 px-4 py-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Refresh current list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Catalog</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800">{totalCount}</span>
            <span className="text-[10px] text-slate-400">items</span>
          </div>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Published (Live)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-650">{publishedCount}</span>
            <span className="text-[10px] text-emerald-500 font-semibold">Ready</span>
          </div>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending Review</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-600">{reviewCount}</span>
            <span className="text-[10px] text-amber-500 font-semibold">Moderation</span>
          </div>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Visual Reads</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800">{totalViews}</span>
            <span className="text-[10px] text-indigo-500">views</span>
          </div>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-2xs space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Buyer Leads Inquiries</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-600">{totalInquiries}</span>
            <span className="text-[10px] text-indigo-400">WhatsApp clicks</span>
          </div>
        </div>
      </div>

      {/* 3. Listings Grid / Table list */}
      <div className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4 text-slate-400" />
            <span>Storefront Catalog ({totalCount})</span>
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold uppercase">
            Merchant: {sellerProfile.business_name}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-2">
            <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto" />
            <span className="text-xs text-slate-400 block font-medium">Synchronizing medical warehouse listings...</span>
          </div>
        ) : myListings.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="h-10 w-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-700 text-xs uppercase tracking-wider">No Machinery Catalogued</p>
              <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                You haven't added any clinical systems manually or imported any via AI WhatsApp scraper. Click below to begin.
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Your First Item</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-6">Item</th>
                  <th className="py-3 px-4">Commerce Model</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Price / Cost</th>
                  <th className="py-3 px-4">Media / Resource Assets</th>
                  <th className="py-3 px-4">Moderation State</th>
                  <th className="py-3 px-6 text-right">Control Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myListings.map(listing => (
                  <tr key={listing.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 bg-slate-50 border border-slate-150 rounded-xl overflow-hidden flex-shrink-0">
                          <img
                            src={listing.images[0] || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80'}
                            alt={listing.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-xs truncate max-w-xs">{listing.title}</h4>
                          <span className="text-[10px] text-indigo-500 font-bold uppercase block tracking-wide mt-0.5">
                            {categories.find(c => c.id === listing.category_id)?.name || 'Equipment'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4.5 px-4">
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {listing.listing_type === 'make_offer' ? 'Make Offer' : 
                         listing.listing_type === 'auction_parts_faulty' ? 'Auction: Parts' :
                         listing.listing_type === 'scrap_salvage' ? 'Scrap/Salvage' :
                         listing.listing_type === 'auction_only' ? 'Auction Only' : 'Fixed Price'}
                      </span>
                    </td>
                    <td className="py-4.5 px-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {listing.condition.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4.5 px-4 font-mono text-xs font-bold text-slate-800">
                      {listing.currency} {listing.price.toLocaleString()}
                    </td>
                    <td className="py-4.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1" title={`${listing.images.length} images`}>
                          <ImageIcon className="h-3.5 w-3.5 text-slate-400" /> {listing.images.length}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1" title={`${(listing.videos || []).length} videos`}>
                          <Video className="h-3.5 w-3.5 text-slate-400" /> {(listing.videos || []).length}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1" title={`${(listing.links || []).length} reference links`}>
                          <LinkIcon className="h-3.5 w-3.5 text-slate-400" /> {(listing.links || []).length}
                        </span>
                      </div>
                    </td>
                    <td className="py-4.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                        listing.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        listing.status === 'pending_review' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {listing.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openModal(listing)}
                          className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all cursor-pointer"
                          title="Edit clinical details & media"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteListing(listing.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all cursor-pointer"
                          title="Delete diagnostic listing"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Rich Media Edit/Create Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-indigo-600" />
                  <span>{editingListing ? 'Edit Diagnostic Asset Listing' : 'Catalog New Clinical Sourcing Asset'}</span>
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Fill all details to present detailed technical spec datasheets and videos to clinical procurement buyers.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Steps Progress Indicator */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest">
                  Step {currentStep} of 4: {
                    currentStep === 1 ? 'General Details' :
                    currentStep === 2 ? 'Commercial & Location' :
                    currentStep === 3 ? 'Asset Profile & Specs' :
                    'Media & Gallery'
                  }
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {Math.round((currentStep / 4) * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>

              {/* Stepper Steps Row */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { step: 1, label: 'Details', icon: Info },
                  { step: 2, label: 'Pricing', icon: DollarSign },
                  { step: 3, label: 'Specs', icon: FileText },
                  { step: 4, label: 'Media', icon: ImageIcon }
                ].map((s) => {
                  const IconComponent = s.icon;
                  const isActive = currentStep === s.step;
                  const isCompleted = currentStep > s.step;
                  const isDisabled = s.step > currentStep && (
                    (s.step === 2 && !title.trim()) ||
                    (s.step === 3 && (!title.trim() || !price || Number(price) <= 0 || !city.trim())) ||
                    (s.step === 4 && (!title.trim() || !price || Number(price) <= 0 || !city.trim()))
                  );
                  return (
                    <button
                      key={s.step}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        setStepError(null);
                        setCurrentStep(s.step);
                      }}
                      className={`flex items-center justify-center sm:justify-start gap-2 p-2 rounded-xl transition-all border text-left ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isActive 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold' 
                          : isCompleted 
                            ? 'bg-emerald-50/40 border-emerald-100 text-emerald-700 font-semibold' 
                            : 'bg-white border-slate-105 text-slate-400 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className={`h-5 w-5 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive 
                          ? 'bg-indigo-600 text-white' 
                          : isCompleted 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isCompleted ? <Check className="h-3 w-3" /> : <IconComponent className="h-3 w-3" />}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider hidden sm:block">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (currentStep === 4) {
                handleSubmit(e);
              } else {
                handleNextStep();
              }
            }} className="flex-grow overflow-y-auto p-6 space-y-6 text-left">
              
              {stepError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs font-bold text-rose-700">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{stepError}</span>
                </div>
              )}

              {/* STEP 1: General clinical asset attributes */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    <span>Equipment Demographics</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Equipment / System Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mindray Resona 7 Premium Diagnostic Ultrasound System"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (e.target.value.trim() && stepError?.includes("Title")) setStepError(null);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Equipment Category *</label>
                      <CustomSelect
                        value={categoryId}
                        onChange={(val) => {
                          setCategoryId(val);
                          if (val && stepError?.includes("Category")) setStepError(null);
                        }}
                        options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                        placeholder="Select Category"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Brand / Maker</label>
                        <input
                          type="text"
                          placeholder="e.g. GE Healthcare"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Model Name / ID</label>
                        <input
                          type="text"
                          placeholder="e.g. Voluson E8"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Machinery Condition</label>
                      <CustomSelect
                        value={condition}
                        onChange={(val) => setCondition(val as any)}
                        options={[
                          { value: 'new', label: 'Brand New (Tear Rubber)' },
                          { value: 'foreign_used', label: 'Foreign Used (Tokunbo / Direct Import)' },
                          { value: 'local_used', label: 'Local Used (Nigerian Used)' },
                          { value: 'refurbished', label: 'Refurbished Standard' },
                          { value: 'working_used', label: 'Working Used / Pre-Owned' },
                          { value: 'faulty', label: 'Faulty (Needs repair / servicing)' },
                          { value: 'parts_only', label: 'For Parts Only' },
                          { value: 'scrap', label: 'Scrap (Salvage value)' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Warehouse Stock Status</label>
                      <CustomSelect
                        value={stockStatus}
                        onChange={(val) => setStockStatus(val as any)}
                        options={[
                          { value: 'in_stock', label: 'In Stock (Available immediately)' },
                          { value: 'out_of_stock', label: 'Out of Stock' },
                          { value: 'on_demand', label: 'On Demand (Pre-order required)' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Pricing & Commerce, Location */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Pricing, Commerce Mode & Location</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Price / Cost *</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          placeholder="e.g. 4500000"
                          value={price}
                          onChange={(e) => {
                            setPrice(e.target.value);
                            if (e.target.value && Number(e.target.value) > 0 && stepError?.includes("Price")) setStepError(null);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Currency</label>
                      <CustomSelect
                        value={currency}
                        onChange={(val) => setCurrency(val as any)}
                        options={[
                          { value: 'NGN', label: 'NGN (₦ - Nigerian Naira)' },
                          { value: 'USD', label: 'USD ($ - US Dollar)' },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Trading Model</label>
                      <CustomSelect
                        value={listingType}
                        onChange={(val) => setListingType(val as any)}
                        options={[
                          { value: 'fixed', label: 'Fixed Standard Price' },
                          { value: 'make_offer', label: 'Accept Price Offers (Private Negotiation)' },
                          { value: 'auction_parts_faulty', label: 'Bid For Parts / Faulty Assets' },
                          { value: 'scrap_salvage', label: 'Bid Scrap & Salvage Value' },
                          { value: 'auction_only', label: 'Direct Competitive Bid (Auction)' },
                        ]}
                      />
                    </div>

                    <div className="md:col-span-3 flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-150">
                      <input
                        type="checkbox"
                        id="negotiable-check"
                        checked={negotiable}
                        onChange={(e) => setNegotiable(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300"
                      />
                      <label htmlFor="negotiable-check" className="text-xs text-slate-600 font-bold cursor-pointer">
                        Allow clinical prospective buyers to negotiate final quote price (Open Negotiation Mode)
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Warehouse Location (Nigerian State)</label>
                      <CustomSelect
                        value={state}
                        onChange={(val) => setState(val)}
                        options={NIGERIAN_STATES.map(st => ({ value: st, label: st }))}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Local City / Sourcing Warehouse *</label>
                      <input
                        type="text"
                        placeholder="e.g. Ikeja / Surulere Warehouse"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (e.target.value.trim() && stepError?.includes("City")) setStepError(null);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Specifications & Reference sheets */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Technical Condition & Datasheet References</span>
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Technical Condition & Description</label>
                      <textarea
                        rows={4}
                        placeholder="Detail warranty information, hardware updates, battery duration capacity, calibration status, and number/types of diagnostic transducers included..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold leading-relaxed"
                      />
                    </div>

                    <div className="space-y-3.5 border-t border-slate-100 pt-4">
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase">Manufacturer Specs & Reference Sheets</h5>
                      <p className="text-[11px] text-slate-400">
                        Attach manufacturer datasheets, hospital validation forms, or equipment user manual links.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Link Label (e.g. GE Voluson E8 Datasheet PDF)"
                          value={newLinkLabel}
                          onChange={(e) => setNewLinkLabel(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Reference URL (HTTPS)"
                            value={newLinkUrl}
                            onChange={(e) => setNewLinkUrl(e.target.value)}
                            className="flex-grow bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          />
                          <button
                            type="button"
                            onClick={addLink}
                            className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-4 rounded-xl cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {linksList.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          {linksList.map((item, idx) => {
                            const parts = item.split('|');
                            const label = parts[0] || 'Reference Link';
                            const url = parts[1] || '';
                            return (
                              <div key={idx} className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5">
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-800 block truncate">{label}</span>
                                  <span className="text-[10px] text-slate-400 block truncate font-mono">{url}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-emerald-100 rounded text-emerald-600" title="Visit link">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => removeLink(idx)}
                                    className="p-1 hover:bg-rose-100 text-rose-500 rounded"
                                    title="Remove link"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
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

              {/* STEP 4: Media Uploads */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Images Catalog */}
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      <span>Multiple Image Catalog</span>
                    </h4>
                    
                    <p className="text-[11px] text-slate-400">
                      Provide multiple clear image references (exterior chassis, monitor screen active, and model label tags).
                    </p>

                    <div className="space-y-3">
                      <FileUpload 
                        onUploadSuccess={(url) => setImagesList(prev => [...prev, url])} 
                        acceptType="image" 
                        label="Upload Listing Image" 
                      />
                      
                      <div className="relative flex py-1.5 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink mx-3 text-[9px] font-bold text-slate-400 uppercase">Or link an existing image url</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste image HTTPS link (e.g. https://images.unsplash.com/...)"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        className="flex-grow bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={addImage}
                        className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-4 rounded-xl cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    {imagesList.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                        {imagesList.map((url, idx) => (
                          <div key={idx} className="relative group border border-slate-150 rounded-xl overflow-hidden aspect-video bg-slate-50">
                            <img src={url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1.5 right-1.5 bg-rose-500 text-white rounded-full h-5 w-5 flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm cursor-pointer text-xs"
                              title="Remove image"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Videos Catalog */}
                  <div className="space-y-4 border-t border-slate-100 pt-6">
                    <h4 className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      <span>Clinical Video Demonstrations</span>
                    </h4>
                    
                    <p className="text-[11px] text-slate-400">
                      Add hardware demo walk-throughs to show clinicians the system operating.
                    </p>

                    <div className="space-y-3">
                      <FileUpload 
                        onUploadSuccess={(url) => setVideosList(prev => [...prev, url])} 
                        acceptType="video" 
                        label="Upload Listing Video" 
                      />
                      
                      <div className="relative flex py-1.5 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink mx-3 text-[9px] font-bold text-slate-400 uppercase">Or link an existing video url</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. https://www.youtube.com/watch?v=demo123"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        className="flex-grow bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={addVideo}
                        className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold px-4 rounded-xl cursor-pointer"
                      >
                        Add
                      </button>
                    </div>

                    {videosList.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        {videosList.map((url, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5">
                            <span className="text-xs text-slate-700 truncate max-w-md font-mono">{url}</span>
                            <div className="flex items-center gap-1.5">
                              <a href={url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-indigo-100 rounded text-indigo-600" title="Test play">
                                <PlayCircle className="h-4 w-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => removeVideo(idx)}
                                className="p-1 hover:bg-rose-100 text-rose-500 rounded"
                                title="Remove video"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex justify-between items-center">
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Back</span>
                  </button>
                )}
              </div>
              
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="bg-emerald-650 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    {editingListing ? 'Apply Changes' : 'Submit Clinical Listing'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
