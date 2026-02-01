import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, Sparkles, MapPin, Check, X, Tag, List, Lightbulb, Users, Calendar, Sun, Car, Navigation, RefreshCw, Hash, Target, AlertCircle, Mic, MicOff, CheckCircle2, Flag, Save, Moon, Snowflake, Star } from 'lucide-react';
import { analyzeBucketItem, suggestBucketItem } from '../services/geminiService';
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

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const ThemeCharacter = ({ theme }: { theme: Theme }) => {
    switch (theme) {
        case 'moon':
            return <div className="absolute -bottom-10 -left-10 w-48 h-48 opacity-[0.1] pointer-events-none z-0 text-zinc-400"><Moon className="w-full h-full fill-current" /></div>;
        case 'elsa':
            return <div className="absolute -bottom-10 -left-10 w-48 h-48 opacity-[0.05] pointer-events-none z-0 rotate-12"><Snowflake className="w-full h-full text-cyan-500" /></div>;
        case 'batman':
            return (
                <div className="absolute -bottom-8 -left-12 w-64 h-40 opacity-[0.05] pointer-events-none z-0 -rotate-12">
                    <svg viewBox="0 0 100 60" fill="currentColor" className="w-full h-full text-yellow-500">
                        <path d="M50 33 C50 33, 52 28, 54 27 C 56 26, 58 25, 58 25 C 58 25, 59 24, 60 25 C 61 26, 60.5 27, 60.5 27 C 60.5 27, 64 26.5, 68 26.5 C 72 26.5, 78 27.5, 80 28.5 C 82 29.5, 86 33, 86 33 C 86 33, 86 30, 85 29 C 84 28, 83 26, 83 26 C 83 26, 89 29, 93 34 C 97 39, 97 43, 97 43 C 97 43, 95 41, 91 40 C 87 39, 84 40, 84 40 C 84 40, 86 42, 86 44 C 86 46, 85 49, 83 52 C 81 55, 78 57, 74 57 C 70 57, 68 55, 66 54 C 64 53, 63 52, 62 52 C 61 52, 60 53, 58 54 C 56 55, 54 57, 50 57 C 46 57, 44 54, 42 54 C 40 53, 39 52, 38 52 C 37 52, 36 53, 34 54 C 32 55, 30 57, 26 57 C 22 57, 19 55, 17 52 C 15 49, 14 46, 14 44 C 14 42, 16 40, 16 40 C 16 40, 13 39, 9 40 C 5 41, 3 43, 3 43 C 3 43, 3 39, 7 34 C 11 29, 17 26, 17 26 C 17 26, 16 28, 15 29 C 14 30, 14 33, 14 33 C 14 33, 18 29.5, 20 28.5 C 22 27.5, 28 26.5, 32 26.5 C 36 26.5, 39.5 27, 39.5 27 C 39.5 27, 39 26, 40 25 C 41 24, 42 25, 42 25 C 42 25, 44 26, 46 27 C 48 28, 50 33, 50 33 Z" />
                    </svg>
                </div>
            );
        case 'marvel':
            return (
                <div className="absolute -bottom-10 -left-10 w-48 h-48 opacity-[0.04] pointer-events-none z-0">
                     <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-blue-900">
                         <circle cx="12" cy="12" r="11" fill="currentColor" />
                         <circle cx="12" cy="12" r="8" fill="#f8fafc" /> 
                         <circle cx="12" cy="12" r="5" fill="#ef4444" />
                         <circle cx="12" cy="12" r="2.5" fill="#1e3a8a" />
                         <path d="M12 4 L13.5 8.5 H18 L14.5 11 L16 15.5 L12 13 L8 15.5 L9.5 11 L6 8.5 H10.5 L12 4 Z" fill="white" />
                     </svg>
                </div>
            );
        default: return null;
    }
};

export const AddItemModal: React.FC<AddItemModalProps> = ({ 
  isOpen, onClose, onAdd, categories, availableInterests, initialData, mode = 'add', items, editingId, theme
}) => {
  const [input, setInput] = useState('');
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

  const requestRef = useRef(0);
  const recognitionRef = useRef<any>(null);

  const isEditMode = mode === 'edit';

  const s = useMemo(() => {
    switch (theme) {
        case 'moon':
            return {
                modalBase: 'bg-zinc-950 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]',
                textPrimary: 'text-white',
                textSecondary: 'text-zinc-400',
                heading: 'text-white',
                closeBtn: 'text-zinc-500 hover:text-white',
                input: 'bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-red-500',
                magicBtn: 'bg-red-600 text-white shadow-xl shadow-red-900/20 hover:bg-red-500',
                inspireBtn: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
                draftCard: 'bg-white/5 border-white/10',
                draftTitle: 'text-white',
                draftText: 'text-zinc-400',
                catActive: 'bg-red-600 text-white border-red-500',
                catInactive: 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20',
                tagActive: 'bg-red-600 text-white border-red-500',
                tagInactive: 'bg-white/5 text-zinc-500 border-white/10',
                backBtn: 'bg-white/5 text-zinc-400 hover:bg-white/10',
                confirmBtn: 'bg-red-600 text-white hover:bg-red-500 shadow-red-900/20',
                micBtn: 'text-white hover:bg-white/10',
                micActive: 'bg-red-600 text-white ring-red-900/40',
                typeActive: 'border-red-500 bg-red-600/10 text-red-500',
                typeInactive: 'border-white/10 bg-white/5 text-zinc-600'
            };
        case 'elsa':
            return {
                modalBase: 'bg-[#f0f9ff] border-cyan-100',
                textPrimary: 'text-cyan-950',
                textSecondary: 'text-cyan-700/70',
                heading: 'text-cyan-900',
                closeBtn: 'text-cyan-300 hover:text-cyan-600',
                input: 'bg-white border-cyan-200 text-cyan-950 placeholder:text-cyan-200 focus:border-orange-400',
                magicBtn: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20',
                inspireBtn: 'bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-50',
                draftCard: 'bg-orange-50 border-orange-100',
                draftTitle: 'text-orange-600',
                draftText: 'text-cyan-800/60',
                catActive: 'bg-orange-500 border-orange-500 text-white',
                catInactive: 'bg-white border-cyan-200 text-cyan-600 hover:border-cyan-400',
                tagActive: 'bg-orange-500 text-white border-orange-500',
                tagInactive: 'bg-cyan-50 text-cyan-400 border-cyan-100',
                backBtn: 'bg-cyan-100 text-cyan-600 hover:bg-cyan-200',
                confirmBtn: 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-600/20',
                micBtn: 'text-orange-500 hover:bg-orange-50',
                micActive: 'bg-orange-500 text-white ring-orange-200',
                typeActive: 'border-orange-500 bg-orange-50 text-orange-600',
                typeInactive: 'border-cyan-100 bg-white text-cyan-300'
            };
        case 'batman':
            return {
                modalBase: 'bg-gray-950 border-gray-800',
                textPrimary: 'text-white',
                textSecondary: 'text-gray-500',
                heading: 'text-yellow-500',
                closeBtn: 'text-gray-600 hover:text-yellow-500',
                input: 'bg-gray-900 border-gray-800 text-white placeholder:text-gray-700 focus:border-yellow-500',
                magicBtn: 'bg-yellow-500 text-black font-black shadow-xl shadow-yellow-500/10 hover:bg-yellow-400',
                inspireBtn: 'bg-black border border-gray-800 text-gray-400 hover:text-yellow-500 hover:border-yellow-500/30',
                draftCard: 'bg-yellow-500/5 border-yellow-500/20',
                draftTitle: 'text-yellow-500',
                draftText: 'text-gray-500',
                catActive: 'bg-yellow-500 border-yellow-500 text-black',
                catInactive: 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600',
                tagActive: 'bg-yellow-500 text-black border-yellow-500',
                tagInactive: 'bg-gray-900 text-gray-600 border-gray-800',
                backBtn: 'bg-gray-900 text-gray-500 hover:bg-gray-800',
                confirmBtn: 'bg-yellow-600 text-black hover:bg-yellow-500 shadow-yellow-500/20',
                micBtn: 'text-yellow-500 hover:bg-yellow-900/20',
                micActive: 'bg-yellow-500 text-black ring-yellow-900/40',
                typeActive: 'border-yellow-500 bg-yellow-500/10 text-yellow-500',
                typeInactive: 'border-gray-800 bg-black text-gray-600'
            };
        case 'marvel':
        default:
            return {
                modalBase: 'bg-[#121212] border-gray-800',
                textPrimary: 'text-white',
                textSecondary: 'text-gray-400',
                heading: 'text-white',
                closeBtn: 'text-gray-500 hover:text-white',
                input: 'bg-[#1a1a1a] border-[#ff5f5f] text-white placeholder:text-gray-500 focus:border-[#ef4444]',
                magicBtn: 'bg-gradient-to-r from-[#cc392b] to-[#8e1c14] text-white shadow-xl',
                inspireBtn: 'bg-[#1a1c2e] border border-blue-900/50 text-white hover:bg-[#252945]',
                draftCard: 'bg-red-900/10 border-red-900/30',
                draftTitle: 'text-red-500',
                draftText: 'text-red-200/70',
                catActive: 'bg-red-900/20 border-red-500 text-red-500',
                catInactive: 'bg-[#2a2a2a] border-gray-700 text-gray-400 hover:border-gray-500',
                tagActive: 'bg-red-500 text-white border-red-500',
                tagInactive: 'bg-[#2a2a2a] text-gray-400 border-gray-700 hover:border-gray-500',
                backBtn: 'bg-[#2a2a2a] text-gray-400 hover:bg-[#333]',
                confirmBtn: 'bg-red-600 text-white hover:bg-red-500 shadow-red-500/20',
                micBtn: 'text-red-500 hover:bg-red-900/30',
                micActive: 'bg-red-500 text-white ring-red-900/40',
                typeActive: 'border-red-500 bg-red-500/10 text-red-500',
                typeInactive: 'border-gray-800 bg-black text-gray-500'
            };
    }
  }, [theme]);

  useEffect(() => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => { setIsListening(true); triggerHaptic('light'); };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0]).map((result: any) => result.transcript).join('');
      setInput(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  useEffect(() => {
    if (isOpen) {
        setIsAnalyzing(false);
        setIsInspiring(false);
        setIsListening(false);
        setValidationError(null);

        if (initialData && isEditMode) {
            const mappedDraft: BucketItemDraft = { ...initialData };
            setDraft(mappedDraft);
            setSelectedCategory(initialData.category || 'Travel');
            setSelectedInterests(initialData.interests || []);
            setIsCompleted(initialData.isCompleted || false);
            setCompletedDate(initialData.completedAt ? new Date(initialData.completedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            setInput(initialData.title);
            setTargetDate(initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '');
            if (initialData.type) setTripType(initialData.type);
        } else {
            setDraft(null); 
            setInput(''); 
            setSelectedCategory('Travel'); 
            setSelectedInterests([]); 
            setTripType('destination');
            setTargetDate('');
            setIsCompleted(false);
        }
    } else {
        requestRef.current++;
    }
  }, [isOpen, initialData, isEditMode]);

  const handleMagicFill = async () => {
    if (!input.trim()) return;
    const requestId = ++requestRef.current;
    setIsAnalyzing(true);
    setValidationError(null);
    try {
        const result = await analyzeBucketItem(input, categories, tripType);
        if (requestRef.current === requestId) {
            setDraft(result);
            if (result && result.category) setSelectedCategory(result.category);
            if (result && result.interests) setSelectedInterests(result.interests);
            setIsAnalyzing(false);
            triggerHaptic('success');
        }
    } catch (e) { if (requestRef.current === requestId) setIsAnalyzing(false); }
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
              if (result.interests) setSelectedInterests(result.interests);
              setIsInspiring(false);
              triggerHaptic('light');
          }
      } catch (e) { if (requestRef.current === requestId) setIsInspiring(false); }
  };

  const handleConfirm = () => {
    if (draft || input.trim()) {
      const finalTitle = draft?.title || input;
      const isDuplicate = items.some(item => 
        item.title.toLowerCase().trim() === finalTitle.toLowerCase().trim() && 
        item.id !== editingId
      );

      if (isDuplicate) {
        setValidationError("This dream is already on your list!");
        triggerHaptic('warning');
        return;
      }

      onAdd({
        ...(draft || {}),
        title: finalTitle,
        type: tripType,
        category: selectedCategory || draft?.category || 'Travel',
        interests: selectedInterests,
        isCompleted: isCompleted,
        completedAt: isCompleted ? new Date(completedDate).getTime() : undefined,
        dueDate: targetDate ? new Date(targetDate).getTime() : undefined,
      } as BucketItemDraft);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`${s.modalBase} rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border transition-all duration-300 relative`}>
        <ThemeCharacter theme={theme} />
        
        <div className="p-8 overflow-y-auto no-scrollbar flex-1 relative z-10">
          <div className="flex justify-between items-center mb-2">
            <h2 className={`text-xl font-black ${s.heading}`}>
              {isEditMode ? 'Edit Dream' : 'New Dream'}
            </h2>
            <button onClick={onClose} className={`p-2 rounded-full ${s.closeBtn}`}><X className="w-5 h-5" /></button>
          </div>

          {(!draft && !isEditMode) ? (
            <div className="space-y-6">
                <p className={`text-[12px] font-medium leading-relaxed ${s.textSecondary}`}>
                    Type your dream (e.g., "See the Northern Lights") and let AI fill in the details.
                </p>

                <div className="relative">
                    <textarea 
                        value={input} 
                        onChange={(e) => { setInput(e.target.value); setValidationError(null); }} 
                        rows={4} 
                        placeholder="What's your dream? (e.g. Travel to Paris, Learn Guitar...)" 
                        className={`w-full p-6 pr-12 rounded-3xl border-2 outline-none resize-none transition-all text-sm font-medium ${s.input}`} 
                    />
                    <button 
                        onClick={() => { if (!SpeechRecognition) return; isListening ? recognitionRef.current.stop() : recognitionRef.current.start(); }}
                        className={`absolute bottom-4 right-4 p-2 rounded-full transition-all ${isListening ? `${s.micActive} animate-pulse shadow-lg` : `${s.micBtn}`}`}
                    >
                        {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 opacity-40" />}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleMagicFill} disabled={isAnalyzing || !input.trim()} className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 ${s.magicBtn}`}>
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isAnalyzing ? 'Filling...' : 'Magic Fill'}
                    </button>
                    <button onClick={handleInspireMe} disabled={isInspiring} className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 ${s.inspireBtn}`}>
                         {isInspiring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                         Inspire Me
                    </button>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Journey Type</h3>
                    <div className="grid grid-cols-3 gap-3">
                         {[
                             { id: 'destination', label: 'Destination', icon: <MapPin className="w-4 h-4" /> },
                             { id: 'roadtrip', label: 'Road Trip', icon: <Car className="w-4 h-4" /> },
                             { id: 'goal', label: 'Growth', icon: <Target className="w-4 h-4" /> }
                         ].map((t) => (
                             <button
                                key={t.id}
                                onClick={() => setTripType(t.id as any)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${tripType === t.id ? s.typeActive : s.typeInactive}`}
                             >
                                {t.icon}
                                <span className="text-[9px] font-black uppercase">{t.label}</span>
                             </button>
                         ))}
                    </div>
                </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                <div className={`p-4 rounded-2xl border-2 border-dashed ${s.draftCard}`}>
                    <div className="flex justify-between items-start mb-2">
                         <h3 className={`text-base font-black ${s.draftTitle}`}>{draft?.title || input}</h3>
                         <button onClick={() => setDraft(null)} className="opacity-40 hover:opacity-100 transition-opacity p-1"><RefreshCw className="w-3.5 h-3.5" /></button>
                    </div>
                    <p className={`text-[11px] leading-relaxed font-medium italic ${s.draftText}`}>
                        {draft?.description || "Finalize your journey details below."}
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Category</label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCategory === cat ? s.catActive : s.catInactive}`}>
                                    <div className="flex items-center gap-2"><CategoryIcon category={cat} className="w-3 h-3" />{cat}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> Key Interests</label>
                        <div className="flex flex-wrap gap-1.5">
                            {availableInterests.map(int => (
                                <button key={int} onClick={() => setSelectedInterests(prev => prev.includes(int) ? prev.filter(i => i !== int) : [...prev, int])} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${selectedInterests.includes(int) ? s.tagActive : s.tagInactive}`}>
                                    #{int}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Target Date</label>
                            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={`w-full p-4 rounded-xl border-2 outline-none text-xs font-bold ${s.input}`} />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> Status</label>
                            <div className="flex items-center gap-2 h-[52px]">
                                <button onClick={() => setIsCompleted(!isCompleted)} className={`flex-1 h-full rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${isCompleted ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                    {isCompleted ? 'Finished' : 'In Progress'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {isCompleted && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Date Knocked Out</label>
                            <input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} className={`w-full p-4 rounded-xl border-2 outline-none text-xs font-bold ${s.input}`} />
                        </div>
                    )}
                </div>
            </div>
          )}

          {validationError && (
              <div className="mt-4 p-4 rounded-2xl bg-red-950/40 border border-red-500/50 flex items-center gap-3 text-red-400 text-xs font-bold animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {validationError}
              </div>
          )}
        </div>

        <div className="p-8 pt-0 flex gap-3 shrink-0 relative z-10">
          <button onClick={onClose} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${s.backBtn}`}>Cancel</button>
          <button onClick={handleConfirm} disabled={!draft && !input.trim()} className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl ${s.confirmBtn}`}>
            <Save className="w-4 h-4" />
            {isEditMode ? 'Update' : 'Bucket It'}
          </button>
        </div>
      </div>
    </div>
  );
};