import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, Sparkles, MapPin, Check, X, Tag, List, Lightbulb, Users, Calendar, Sun, Car, Navigation, RefreshCw, Hash, Target, AlertCircle, Mic, MicOff, CheckCircle2, Flag, Save } from 'lucide-react';
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

  const requestRef = useRef(0);
  const recognitionRef = useRef<any>(null);

  const isEditMode = mode === 'edit';

  const s = useMemo(() => {
    // Standardized dark UI to match requested screenshot
    return {
        modalBase: 'bg-[#121212] border-gray-800',
        textPrimary: 'text-white',
        textSecondary: 'text-gray-400',
        heading: 'text-white',
        closeBtn: 'text-gray-500 hover:text-white',
        input: 'bg-[#1a1a1a] border-[#ff5f5f] text-white placeholder:text-gray-500 focus:border-[#ef4444]',
        radioText: 'text-gray-400 hover:text-white',
        radioAccent: 'accent-red-500',
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
        micActive: 'bg-red-500 text-white ring-red-900/40'
    };
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
      <div className={`${s.modalBase} rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[95vh] border transition-all duration-300`}>
        <div className="p-8 overflow-y-auto no-scrollbar flex-1">
          <div className="flex justify-between items-center mb-2">
            <h2 className={`text-xl font-black ${s.heading}`}>
              {isEditMode ? 'Edit Dream' : 'New Dream'}
            </h2>
            <button onClick={onClose} className={`p-2 rounded-full ${s.closeBtn}`}><X className="w-5 h-5" /></button>
          </div>

          {(!draft && !isEditMode) ? (
            <div className="space-y-6">
                <p className={`text-[12px] font-medium leading-relaxed ${s.textSecondary}`}>
                    Type your dream (e.g., "See the Northern Lights" or "Visit Tokyo") and let AI fill in the details.
                </p>

                <div className="relative">
                    <textarea 
                        value={input} 
                        onChange={(e) => { setInput(e.target.value); setValidationError(null); }} 
                        rows={4} 
                        placeholder="What's your dream? (e.g. Travel to Paris, Learn Guitar, Buy a House...)" 
                        className={`w-full p-6 pr-12 rounded-3xl border-2 outline-none resize-none transition-all text-sm font-medium ${s.input}`} 
                    />
                    <button 
                        onClick={() => { if (!SpeechRecognition) return; isListening ? recognitionRef.current.stop() : recognitionRef.current.start(); }}
                        className={`absolute bottom-4 right-4 p-2 rounded-full transition-all ${isListening ? `${s.micActive} animate-pulse` : `${s.micBtn}`}`}
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
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className={`p-5 rounded-3xl border transition-all duration-500 ${s.draftCard}`}>
                    <div className="flex justify-between items-start mb-3">
                        <input 
                            type="text" 
                            value={draft?.title || input} 
                            onChange={(e) => setDraft(p => p ? {...p, title: e.target.value} : null)} 
                            className={`bg-transparent border-none outline-none text-xl font-black leading-tight w-full ${s.draftTitle}`}
                        />
                        <Sparkles className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
                    </div>
                    <textarea 
                        value={draft?.description || ''} 
                        onChange={(e) => setDraft(p => p ? {...p, description: e.target.value} : null)}
                        rows={3}
                        className={`w-full bg-transparent border-none outline-none text-xs leading-relaxed resize-none ${s.draftText}`}
                        placeholder="Add a description..."
                    />
                </div>

                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 ml-1 text-gray-500">Category</h4>
                    <div className="grid grid-cols-4 gap-2">
                        {categories.slice(0, 8).map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-[9px] font-black transition-all ${selectedCategory === cat ? s.catActive : s.catInactive}`}>
                                <CategoryIcon category={cat} className="w-4 h-4" />
                                <span className="truncate w-full text-center">{cat}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 ml-1 text-gray-500">Interests</h4>
                    <div className="flex flex-wrap gap-2">
                        {availableInterests.map(int => (
                            <button key={int} onClick={() => setSelectedInterests(prev => prev.includes(int) ? prev.filter(i => i !== int) : [...prev, int])} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedInterests.includes(int) ? s.tagActive : s.tagInactive}`}>
                                #{int}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-black uppercase tracking-widest ${s.textPrimary}`}>Knocked it?</span>
                        <input type="checkbox" checked={isCompleted} onChange={(e) => setIsCompleted(e.target.checked)} className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-red-500" />
                    </div>
                    {isCompleted && (
                        <input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} className="w-full p-4 rounded-xl border border-gray-800 bg-[#1a1a1a] text-white outline-none text-xs" />
                    )}
                </div>
            </div>
          )}

          {validationError && (
              <div className="mt-4 p-4 rounded-xl bg-red-950/30 text-red-400 border border-red-900/50 flex items-center gap-3 text-xs font-bold animate-shake">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {validationError}
              </div>
          )}
        </div>

        {(draft || isEditMode) && (
            <div className="p-8 border-t border-gray-800 shrink-0 bg-black/40 backdrop-blur-md">
                <button onClick={handleConfirm} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${s.confirmBtn}`}>
                    <Save className="w-4 h-4" />
                    {isEditMode ? 'Save Changes' : 'Just Knock It'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};