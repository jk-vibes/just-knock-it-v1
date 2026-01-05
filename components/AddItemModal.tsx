
import React, { useState, useEffect, useRef, useMemo } from 'react';
// Added CheckCircle2 to the imports from lucide-react
import { Loader2, Sparkles, MapPin, Check, X, Tag, List, Lightbulb, Users, Calendar, Sun, Car, Navigation, RefreshCw, Hash, Target, AlertCircle, Mic, MicOff, CheckCircle2, Flag } from 'lucide-react';
import { analyzeBucketItem, suggestBucketItem, generateRoadTripStops, optimizeRouteOrder } from '../services/geminiService';
import { BucketItemDraft, BucketItem, ItineraryItem, Theme } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { triggerHaptic } from '../utils/haptics';

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

// Support for different browser implementations of SpeechRecognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const AddItemModal: React.FC<AddItemModalProps> = ({ 
  isOpen, onClose, onAdd, categories, availableInterests, initialData, mode = 'add', items, editingId, theme
}) => {
  const [input, setInput] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [tripType, setTripType] = useState<'destination' | 'roadtrip' | 'goal'>('destination');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInspiring, setIsInspiring] = useState(false);
  const [draft, setDraft] = useState<BucketItemDraft | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedDate, setCompletedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState<string>('');

  // Ref to track valid async requests. If modal closes, we increment this to "cancel" pending callbacks.
  const requestRef = useRef(0);
  const recognitionRef = useRef<any>(null);

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
                confirmBtn: 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20',
                micBtn: 'text-orange-500 hover:bg-orange-50',
                micActive: 'bg-orange-500 text-white ring-orange-200'
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
                confirmBtn: 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/20',
                micBtn: 'text-yellow-500 hover:bg-yellow-900/30',
                micActive: 'bg-yellow-500 text-black ring-yellow-900/40'
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
                confirmBtn: 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20',
                micBtn: 'text-red-500 hover:bg-red-50',
                micActive: 'bg-red-600 text-white ring-red-200'
            };
    }
  }, [theme]);

  // Voice Recognition Logic
  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      triggerHaptic('light');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
          setValidationError("Microphone access denied. Please enable it in settings.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
        setIsAnalyzing(false);
        setIsInspiring(false);
        setIsListening(false);
        setValidationError(null);

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
            setTargetDate(initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '');
            
            // Restore tripType from saved type
            if (initialData.type) {
                setTripType(initialData.type);
                if (initialData.type === 'roadtrip' && initialData.roadTrip) {
                    setStartLocation(initialData.roadTrip.startLocation || '');
                }
            } else {
                // Fallback for legacy items
                if (initialData.roadTrip) {
                    setTripType('roadtrip');
                    setStartLocation(initialData.roadTrip.startLocation || '');
                } else {
                    setTripType(!(initialData as any).coordinates ? 'goal' : 'destination');
                }
            }
        } else if (mode === 'add') {
            setDraft(null); 
            setInput(''); 
            setSelectedCategory('Travel'); 
            setSelectedInterests([]); 
            setTripType('destination');
            setTargetDate('');
        }
    } else {
        requestRef.current++;
        setIsAnalyzing(false);
        setIsInspiring(false);
        setIsListening(false);
        setValidationError(null);
        if (recognitionRef.current) recognitionRef.current.stop();
    }
  }, [isOpen, initialData, mode]);

  useEffect(() => {
      if (draft && draft.interests) {
          setSelectedInterests(prev => Array.from(new Set([...prev, ...draft.interests!])));
      }
      setValidationError(null);
  }, [draft]);

  const handleMagicFill = async () => {
    if (!input.trim()) return;
    const requestId = ++requestRef.current;
    setIsAnalyzing(true);
    setValidationError(null);
    try {
        let result: BucketItemDraft | null = null;
        if (tripType === 'destination' || tripType === 'goal') {
            result = await analyzeBucketItem(input, categories, tripType);
        } else {
            const stops = await generateRoadTripStops(startLocation || "current location", input);
            if (requestRef.current !== requestId) return;
            const optimized = await optimizeRouteOrder(stops);
            result = {
                title: `Road Trip to ${input}`,
                description: `A scenic journey from ${startLocation || 'here'} to ${input} with ${optimized.length} stops.`,
                type: 'roadtrip',
                locationName: input,
                category: 'Adventure',
                interests: ['Road Trip', 'Adventure', 'Driving'],
                roadTrip: { startLocation, stops: optimized }
            };
        }
        if (requestRef.current === requestId) {
            setDraft(result);
            if (result && result.category) setSelectedCategory(result.category);
            setIsAnalyzing(false);
        }
    } catch (e) {
        if (requestRef.current === requestId) setIsAnalyzing(false);
    }
  };

  const handleInspireMe = async () => {
      const requestId = ++requestRef.current;
      setIsInspiring(true);
      setValidationError(null);
      try {
          const result = await suggestBucketItem(categories, input);
          if (requestRef.current === requestId) {
              setDraft(result);
              if (result.category) setSelectedCategory(result.category);
              setIsInspiring(false);
          }
      } catch (e) {
          if (requestRef.current === requestId) setIsInspiring(false);
      }
  };

  const handleConfirm = () => {
    if (draft) {
      const isDuplicate = items.some(item => 
        item.title.toLowerCase().trim() === draft.title.toLowerCase().trim() && 
        item.id !== editingId
      );
      if (isDuplicate) {
        setValidationError("This dream is already on your list!");
        return;
      }
      const completedTimestamp = isCompleted ? new Date(completedDate).getTime() : undefined;
      const targetTimestamp = targetDate ? new Date(targetDate).getTime() : undefined;
      onAdd({
        ...draft,
        title: draft.title || input,
        type: tripType, // Ensure selected type is saved
        category: selectedCategory || draft.category,
        interests: selectedInterests,
        isCompleted: isCompleted,
        completedAt: completedTimestamp,
        dueDate: targetTimestamp,
      });
      onClose();
    }
  };

  const toggleVoiceInput = () => {
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setValidationError(null);
      recognitionRef.current.start();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`${s.modalBase} rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border transition-all duration-300`}>
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
                    Type your dream and let AI fill in the details.
                </p>

                <div className="relative group/input">
                    <textarea 
                        value={input} 
                        onChange={(e) => { setInput(e.target.value); setValidationError(null); }} 
                        rows={4} 
                        placeholder={tripType === 'goal' ? "What's your goal?" : "What's your dream destination?"} 
                        className={`w-full p-4 pr-12 rounded-xl border outline-none resize-none transition-all ${s.input} ${isListening ? 'ring-2 ring-red-500 border-transparent' : ''}`} 
                    />
                    <button 
                        onClick={toggleVoiceInput}
                        className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-300 ${isListening ? `${s.micActive} animate-pulse scale-110` : `${s.micBtn} hover:scale-110`}`}
                        title={isListening ? "Stop Listening" : "Voice Input"}
                    >
                        {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 opacity-60" />}
                    </button>
                </div>

                {input.trim().length > 0 && (
                    <div className="flex gap-4 animate-in fade-in slide-in-from-top-1 flex-wrap">
                        <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${s.radioText}`}>
                            <input type="radio" checked={tripType === 'destination'} onChange={() => setTripType('destination')} className={s.radioAccent} />
                            <MapPin className="w-3 h-3" /> <span>Destination</span>
                        </label>
                        <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${s.radioText}`}>
                            <input type="radio" checked={tripType === 'roadtrip'} onChange={() => setTripType('roadtrip')} className={s.radioAccent} />
                            <Car className="w-3 h-3" /> <span>Road Trip</span>
                        </label>
                        <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${s.radioText}`}>
                            <input type="radio" checked={tripType === 'goal'} onChange={() => setTripType('goal')} className={s.radioAccent} />
                            <Target className="w-3 h-3" /> <span>Goal</span>
                        </label>
                    </div>
                )}

                {tripType === 'roadtrip' && (
                    <div className="animate-in slide-in-from-left duration-300">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Starting From</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                value={startLocation}
                                onChange={(e) => setStartLocation(e.target.value)}
                                placeholder="City or 'current location'"
                                className={`w-full pl-9 p-3 rounded-xl border outline-none text-sm transition-all ${s.input}`}
                            />
                        </div>
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={handleMagicFill}
                        disabled={isAnalyzing || !input.trim()}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${s.magicBtn}`}
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isAnalyzing ? 'Analyzing...' : 'Magic Fill'}
                    </button>
                    <button 
                        onClick={handleInspireMe}
                        disabled={isInspiring}
                        className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm border transition-all ${s.inspireBtn}`}
                    >
                        {isInspiring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                    </button>
                </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className={`p-4 rounded-2xl border transition-all duration-500 ${s.draftCard}`}>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className={`text-lg font-black leading-tight ${s.draftTitle}`}>{draft.title}</h3>
                        <MapPin className="w-5 h-5 text-red-500" />
                    </div>
                    <p className={`text-xs leading-relaxed ${s.draftText}`}>{draft.description}</p>
                </div>

                <div>
                    <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ml-1 ${s.textSecondary}`}>Category</h4>
                    <div className="grid grid-cols-4 gap-2">
                        {categories.slice(0, 8).map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setSelectedCategory(cat)}
                                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-[9px] font-bold transition-all ${selectedCategory === cat ? s.catActive : s.catInactive}`}
                            >
                                <CategoryIcon category={cat} className="w-4 h-4" />
                                <span className="truncate w-full text-center">{cat}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ml-1 ${s.textSecondary}`}>Interests</h4>
                    <div className="flex flex-wrap gap-2">
                        {availableInterests.map(int => (
                            <button 
                                key={int}
                                onClick={() => {
                                    setSelectedInterests(prev => prev.includes(int) ? prev.filter(i => i !== int) : [...prev, int]);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${selectedInterests.includes(int) ? s.tagActive : s.tagInactive}`}
                            >
                                #{int}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg bg-blue-500/10 text-blue-600`}>
                                <Flag className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-bold ${s.textPrimary}`}>Target Date</span>
                        </div>
                        <input 
                            type="date" 
                            value={targetDate} 
                            onChange={(e) => setTargetDate(e.target.value)} 
                            className={`p-2 rounded-xl border outline-none text-[10px] ${s.input}`} 
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg bg-green-500/10 text-green-600`}>
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-bold ${s.textPrimary}`}>Knocked it out?</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isCompleted} onChange={(e) => setIsCompleted(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                    {isCompleted && (
                        <div className="animate-in slide-in-from-top duration-300">
                            <input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} className={`w-full p-3 rounded-xl border outline-none text-xs ${s.input}`} />
                        </div>
                    )}
                </div>
            </div>
          )}

          {validationError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center gap-2 text-xs font-bold animate-shake">
                  <AlertCircle className="w-4 h-4" />
                  {validationError}
              </div>
          )}
        </div>

        <div className={`p-6 border-t ${s.border} shrink-0 bg-white/50 dark:bg-black/20 backdrop-blur-sm`}>
            <div className="flex gap-3">
                {draft ? (
                    <>
                        <button onClick={() => setDraft(null)} className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all ${s.backBtn}`}>
                            Change Details
                        </button>
                        <button onClick={handleConfirm} className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all ${s.confirmBtn}`}>
                            Just Knock It
                        </button>
                    </>
                ) : (
                    <button onClick={onClose} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${s.backBtn}`}>
                        Cancel
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
