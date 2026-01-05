
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, Sparkles, MapPin, Check, X, Tag, List, Lightbulb, Users, Calendar, Sun, Car, Navigation, RefreshCw, Hash, Target } from 'lucide-react';
import { analyzeBucketItem, suggestBucketItem, generateRoadTripStops, optimizeRouteOrder } from '../services/geminiService';
import { BucketItemDraft, BucketItem, ItineraryItem, Theme } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: BucketItemDraft) => void;
  categories: string[];
  availableInterests: string[];
  initialData?: BucketItemDraft | null;
  mode?: 'add' | 'edit';
  items: BucketItem[];
  editingId?: string;
  theme: Theme;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ 
  isOpen, onClose, onAdd, categories, availableInterests, initialData, mode = 'add', items, editingId, theme
}) => {
  const [input, setInput] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [tripType, setTripType] = useState<'destination' | 'roadtrip' | 'goal'>('destination');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInspiring, setIsInspiring] = useState(false);
  const [draft, setDraft] = useState<BucketItemDraft | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedDate, setCompletedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Ref to track valid async requests. If modal closes, we increment this to "cancel" pending callbacks.
  const requestRef = useRef(0);

  // Dynamic Theme Styles
  const s = useMemo(() => {
    switch(theme) {
        case 'elsa':
            return {
                modalBase: 'bg-[#f0f9ff] border-cyan-200',
                textPrimary: 'text-cyan-950',
                textSecondary: 'text-cyan-600/80',
                heading: 'text-cyan-900',
                closeBtn: 'text-cyan-400 hover:text-cyan-600',
                input: 'bg-white border-cyan-200 text-cyan-900 placeholder:text-cyan-400 focus:border-orange-400',
                radioText: 'text-cyan-600/80 hover:text-cyan-900',
                radioAccent: 'accent-orange-500',
                magicBtn: 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-orange-500/20',
                inspireBtn: 'bg-white border-cyan-200 text-cyan-600 hover:bg-cyan-50',
                draftCard: 'bg-white border-cyan-200',
                draftTitle: 'text-cyan-900',
                draftText: 'text-cyan-700/80',
                catActive: 'bg-orange-50 border-orange-400 text-orange-600',
                catInactive: 'bg-white border-cyan-200 text-cyan-500 hover:border-cyan-300',
                tagActive: 'bg-orange-500 text-white border-orange-500',
                tagInactive: 'bg-white text-cyan-600 border-cyan-200 hover:border-cyan-300',
                backBtn: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200',
                confirmBtn: 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'
            };
        case 'batman':
            return {
                modalBase: 'bg-[#1e1e1e] border-gray-800',
                textPrimary: 'text-white',
                textSecondary: 'text-gray-400',
                heading: 'text-white',
                closeBtn: 'text-gray-500 hover:text-white',
                input: 'bg-[#2a2a2a] border-gray-800 text-white placeholder:text-gray-500 focus:border-yellow-500',
                radioText: 'text-gray-400 hover:text-white',
                radioAccent: 'accent-yellow-500',
                magicBtn: 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-yellow-500/20',
                inspireBtn: 'bg-[#2c3e50] border-gray-700 text-gray-300 hover:bg-[#34495e]',
                draftCard: 'bg-yellow-900/10 border-yellow-900/30',
                draftTitle: 'text-yellow-500',
                draftText: 'text-yellow-200/70',
                catActive: 'bg-yellow-900/20 border-yellow-500 text-yellow-500',
                catInactive: 'bg-[#2a2a2a] border-gray-700 text-gray-400 hover:border-gray-500',
                tagActive: 'bg-yellow-500 text-black border-yellow-500',
                tagInactive: 'bg-[#2a2a2a] text-gray-400 border-gray-700 hover:border-gray-500',
                backBtn: 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]',
                confirmBtn: 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/20'
            };
        case 'marvel':
        default:
            return {
                modalBase: 'bg-white border-slate-200',
                textPrimary: 'text-slate-900',
                textSecondary: 'text-slate-500',
                heading: 'text-slate-900',
                closeBtn: 'text-slate-400 hover:text-slate-600',
                input: 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-red-500',
                radioText: 'text-slate-500 hover:text-slate-900',
                radioAccent: 'accent-red-500',
                magicBtn: 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-600/20',
                inspireBtn: 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200',
                draftCard: 'bg-red-50 border-red-100',
                draftTitle: 'text-red-900',
                draftText: 'text-red-800/70',
                catActive: 'bg-red-50 border-red-500 text-red-600',
                catInactive: 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300',
                tagActive: 'bg-slate-900 text-white border-slate-900',
                tagInactive: 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                backBtn: 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                confirmBtn: 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20'
            };
    }
  }, [theme]);

  useEffect(() => {
    if (isOpen) {
        // Reset states whenever modal opens to prevent "stuck" loading states
        setIsAnalyzing(false);
        setIsInspiring(false);

        if (initialData && mode === 'edit') {
            const mappedDraft: BucketItemDraft = { ...initialData };
            if ((initialData as any).coordinates) {
                mappedDraft.latitude = (initialData as any).coordinates.latitude;
                mappedDraft.longitude = (initialData as any).coordinates.longitude;
            }
            setDraft(mappedDraft);
            setSelectedCategory(initialData.category || 'Travel');
            setSelectedInterests(initialData.interests || []);
            setInput(initialData.title);
            if (initialData.roadTrip) {
                setTripType('roadtrip');
                setStartLocation(initialData.roadTrip.startLocation || '');
            } else {
                setTripType(!(initialData as any).coordinates ? 'goal' : 'destination');
            }
        } else if (mode === 'add') {
            // Clean slate for new item
            setDraft(null); 
            setInput(''); 
            setSelectedCategory('Travel'); 
            setSelectedInterests([]); 
            setTripType('destination'); 
        }
    } else {
        // When closing, invalidate any running requests
        requestRef.current++;
        setIsAnalyzing(false);
        setIsInspiring(false);
    }
  }, [isOpen, initialData, mode]);

  // Sync interests when draft is updated by Magic Fill
  useEffect(() => {
      if (draft && draft.interests) {
          setSelectedInterests(prev => Array.from(new Set([...prev, ...draft.interests!])));
      }
  }, [draft]);

  const handleMagicFill = async () => {
    if (!input.trim()) return;
    
    // Increment request ID to ensure we only handle the latest valid request
    const requestId = ++requestRef.current;
    
    setIsAnalyzing(true);
    
    try {
        let result: BucketItemDraft | null = null;

        if (tripType === 'destination' || tripType === 'goal') {
            result = await analyzeBucketItem(input, categories, tripType);
        } else {
            const stops = await generateRoadTripStops(startLocation || "current location", input);
            // Check request validity before continuing to expensive optimization
            if (requestRef.current !== requestId) return;
            
            const optimized = await optimizeRouteOrder(stops);
            result = {
                title: `Road Trip to ${input}`,
                description: `A scenic journey from ${startLocation || 'here'} to ${input} with ${optimized.length} stops.`,
                locationName: input,
                category: 'Adventure',
                interests: ['Road Trip', 'Adventure', 'Driving'],
                roadTrip: { startLocation, stops: optimized }
            };
        }

        // Only update state if this request is still the active one
        if (requestRef.current === requestId) {
            setDraft(result);
            if (result && result.category) setSelectedCategory(result.category);
            setIsAnalyzing(false);
        }
    } catch (e) {
        console.error(e);
        if (requestRef.current === requestId) setIsAnalyzing(false);
    }
  };

  const handleInspireMe = async () => {
      const requestId = ++requestRef.current;
      setIsInspiring(true);
      
      try {
          const result = await suggestBucketItem(categories, input);
          
          if (requestRef.current === requestId) {
              setDraft(result);
              if (result.category) setSelectedCategory(result.category);
              setIsInspiring(false);
          }
      } catch (e) {
          console.error(e);
          if (requestRef.current === requestId) setIsInspiring(false);
      }
  };

  const handleConfirm = () => {
    if (draft) {
      const completedTimestamp = isCompleted ? new Date(completedDate).getTime() : undefined;
      onAdd({
        ...draft,
        category: selectedCategory || draft.category,
        interests: selectedInterests,
        isCompleted: isCompleted,
        completedAt: completedTimestamp,
      });
      onClose();
    }
  };

  const toggleInterest = (interest: string) => {
      setSelectedInterests(prev => 
          prev.includes(interest) 
              ? prev.filter(i => i !== interest)
              : [...prev, interest]
      );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`${s.modalBase} rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border transition-colors duration-300`}>
        <div className="p-6 overflow-y-auto no-scrollbar flex-1">
          <div className="flex justify-between items-center mb-1">
            <h2 className={`text-xl font-bold ${s.heading}`}>
              {mode === 'edit' ? 'Edit Dream' : 'New Dream'}
            </h2>
            <button onClick={onClose} className={`p-1 ${s.closeBtn}`}><X className="w-5 h-5" /></button>
          </div>

          {!draft ? (
            <div className="space-y-4">
                
                <p className={`text-sm leading-relaxed mb-2 ${s.textSecondary}`}>
                    Type your dream (e.g., "See the Northern Lights" or "Learn Guitar") and let AI fill in the details.
                </p>

                <div className="relative">
                    <textarea 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        rows={4} 
                        placeholder={tripType === 'goal' ? "What's your goal? (e.g. Run a Marathon, Learn French...)" : "What's your dream destination?"} 
                        className={`w-full p-4 rounded-xl border outline-none resize-none transition-all ${s.input}`} 
                    />
                </div>

                {/* --- Trip Type Toggle --- */}
                {input.trim().length > 0 && (
                    <div className="flex gap-4 animate-in fade-in slide-in-from-top-1 flex-wrap">
                        <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${s.radioText}`}>
                            <input type="radio" checked={tripType === 'destination'} onChange={() => setTripType('destination')} className={`${s.radioAccent}`} />
                            <MapPin className="w-3 h-3" />
                            <span>Destination</span>
                        </label>
                        <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${s.radioText}`}>
                            <input type="radio" checked={tripType === 'roadtrip'} onChange={() => setTripType('roadtrip')} className={`${s.radioAccent}`} />
                            <Car className="w-3 h-3" />
                            <span>Road Trip</span>
                        </label>
                        <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${s.radioText}`}>
                            <input type="radio" checked={tripType === 'goal'} onChange={() => setTripType('goal')} className={`${s.radioAccent}`} />
                            <Target className="w-3 h-3" />
                            <span>Goal</span>
                        </label>
                    </div>
                )}

                {/* --- ACTION BUTTONS --- */}
                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={handleMagicFill} 
                        disabled={isAnalyzing || !input.trim()} 
                        className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-transparent ${s.magicBtn}`}
                    >
                        {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {isAnalyzing ? 'Analyzing...' : 'Magic Fill'}
                    </button>
                    
                    <button 
                        onClick={handleInspireMe} 
                        disabled={isInspiring}
                        className={`flex-1 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 ${s.inspireBtn}`}
                    >
                        {isInspiring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lightbulb className="w-5 h-5 fill-current" />}
                        {isInspiring ? 'Thinking...' : 'Inspire Me'}
                    </button>
                </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className={`p-5 rounded-3xl border ${s.draftCard}`}>
                    <h3 className={`font-black text-lg uppercase leading-tight ${s.draftTitle}`}>{draft.title}</h3>
                    <p className={`text-xs mt-2 leading-relaxed ${s.draftText}`}>{draft.description}</p>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                        {draft.locationName && <div className={`px-3 py-1.5 bg-black/5 rounded-xl text-[10px] font-bold border border-black/10 flex items-center gap-1.5 ${s.draftTitle}`}><MapPin className="w-3 h-3" /> {draft.locationName}</div>}
                        {draft.roadTrip && <div className={`px-3 py-1.5 bg-black/5 rounded-xl text-[10px] font-bold border border-black/10 flex items-center gap-1.5 ${s.draftTitle}`}><Navigation className="w-3 h-3" /> {draft.roadTrip.stops.length} Stops Planned</div>}
                        {!draft.locationName && !draft.roadTrip && <div className={`px-3 py-1.5 bg-black/5 rounded-xl text-[10px] font-bold border border-black/10 flex items-center gap-1.5 ${s.draftTitle}`}><Target className="w-3 h-3" /> Goal</div>}
                    </div>
                </div>

                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${s.textSecondary}`}>Category</label>
                    <div className="grid grid-cols-4 gap-2">
                        {categories.slice(0, 8).map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setSelectedCategory(cat)} 
                                className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${selectedCategory === cat ? s.catActive : s.catInactive}`}
                            >
                                <CategoryIcon category={cat} className="w-5 h-5" />
                                <span className="text-[8px] font-black uppercase text-center truncate w-full">{cat}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${s.textSecondary}`}>Interests & Tags</label>
                    <div className="flex flex-wrap gap-2">
                        {availableInterests.map(interest => (
                            <button 
                                key={interest} 
                                onClick={() => toggleInterest(interest)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${selectedInterests.includes(interest) ? s.tagActive : s.tagInactive}`}
                            >
                                #{interest}
                            </button>
                        ))}
                        {selectedInterests.filter(i => !availableInterests.includes(i)).map(interest => (
                             <button 
                                key={interest} 
                                onClick={() => toggleInterest(interest)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${s.tagActive}`}
                            >
                                #{interest}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => { setDraft(null); }} className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors ${s.backBtn}`}>Back</button>
                    <button onClick={handleConfirm} className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors ${s.confirmBtn}`}>Confirm</button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
