
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles, MapPin, Check, X, Tag, List, Lightbulb, Users, Calendar, Sun, Car, Navigation, RefreshCw, Hash, Target } from 'lucide-react';
import { analyzeBucketItem, suggestBucketItem, generateRoadTripStops, optimizeRouteOrder } from '../services/geminiService';
import { BucketItemDraft, BucketItem, ItineraryItem } from '../types';
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
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ 
  isOpen, onClose, onAdd, categories, availableInterests, initialData, mode = 'add', items, editingId
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
      <div className="bg-[#1e1e1e] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-gray-800">
        <div className="p-6 overflow-y-auto no-scrollbar flex-1">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xl font-bold text-white">
              {mode === 'edit' ? 'Edit Dream' : 'New Dream'}
            </h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          {!draft ? (
            <div className="space-y-4">
                
                <p className="text-sm text-gray-400 leading-relaxed mb-2">
                    Type your dream (e.g., "See the Northern Lights" or "Learn Guitar") and let AI fill in the details.
                </p>

                <div className="relative">
                    <textarea 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        rows={4} 
                        placeholder={tripType === 'goal' ? "What's your goal? (e.g. Run a Marathon, Learn French...)" : "What's your dream destination?"} 
                        className="w-full p-4 bg-[#2a2a2a] rounded-xl border border-red-500/50 focus:border-red-500 outline-none text-white placeholder:text-gray-500 resize-none transition-all" 
                    />
                </div>

                {/* --- Trip Type Toggle --- */}
                {input.trim().length > 0 && (
                    <div className="flex gap-4 animate-in fade-in slide-in-from-top-1 flex-wrap">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-white">
                            <input type="radio" checked={tripType === 'destination'} onChange={() => setTripType('destination')} className="accent-red-500" />
                            <MapPin className="w-3 h-3" />
                            <span>Destination</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-white">
                            <input type="radio" checked={tripType === 'roadtrip'} onChange={() => setTripType('roadtrip')} className="accent-red-500" />
                            <Car className="w-3 h-3" />
                            <span>Road Trip</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-white">
                            <input type="radio" checked={tripType === 'goal'} onChange={() => setTripType('goal')} className="accent-red-500" />
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
                        className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-transparent"
                    >
                        {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {isAnalyzing ? 'Analyzing...' : 'Magic Fill'}
                    </button>
                    
                    <button 
                        onClick={handleInspireMe} 
                        disabled={isInspiring}
                        className="flex-1 py-3 bg-[#2c3e50] border border-slate-600 text-blue-100 rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-[#34495e] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isInspiring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lightbulb className="w-5 h-5 text-yellow-400" />}
                        {isInspiring ? 'Thinking...' : 'Inspire Me'}
                    </button>
                </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="bg-red-900/10 p-5 rounded-3xl border border-red-900/30">
                    <h3 className="font-black text-red-200 text-lg uppercase leading-tight">{draft.title}</h3>
                    <p className="text-red-300 text-xs mt-2 leading-relaxed">{draft.description}</p>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                        {draft.locationName && <div className="px-3 py-1.5 bg-black/30 rounded-xl text-[10px] font-bold text-red-400 border border-red-900/50 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {draft.locationName}</div>}
                        {draft.roadTrip && <div className="px-3 py-1.5 bg-black/30 rounded-xl text-[10px] font-bold text-blue-400 border border-blue-900/50 flex items-center gap-1.5"><Navigation className="w-3 h-3" /> {draft.roadTrip.stops.length} Stops Planned</div>}
                        {!draft.locationName && !draft.roadTrip && <div className="px-3 py-1.5 bg-black/30 rounded-xl text-[10px] font-bold text-green-400 border border-green-900/50 flex items-center gap-1.5"><Target className="w-3 h-3" /> Goal</div>}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Category</label>
                    <div className="grid grid-cols-4 gap-2">
                        {categories.slice(0, 8).map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${selectedCategory === cat ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-[#2a2a2a] border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                                <CategoryIcon category={cat} className="w-5 h-5" />
                                <span className="text-[8px] font-black uppercase text-center truncate w-full">{cat}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Interests & Tags</label>
                    <div className="flex flex-wrap gap-2">
                        {availableInterests.map(interest => (
                            <button 
                                key={interest} 
                                onClick={() => toggleInterest(interest)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${selectedInterests.includes(interest) ? 'bg-white text-black border-white' : 'bg-[#2a2a2a] text-gray-400 border-gray-700 hover:border-gray-500'}`}
                            >
                                #{interest}
                            </button>
                        ))}
                        {selectedInterests.filter(i => !availableInterests.includes(i)).map(interest => (
                             <button 
                                key={interest} 
                                onClick={() => toggleInterest(interest)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all bg-white text-black border-white`}
                            >
                                #{interest}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => { setDraft(null); }} className="flex-1 py-4 bg-[#2a2a2a] text-gray-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#333] transition-colors">Back</button>
                    <button onClick={handleConfirm} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700 transition-colors">Confirm</button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
