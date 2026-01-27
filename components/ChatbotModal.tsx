
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Send, Loader2, Sparkles, MapPin, ExternalLink, MessageCircle, Lightbulb, Compass, Target, Zap, Brain, ShieldCheck, TrendingUp, History, RefreshCw, ChevronRight } from 'lucide-react';
import { chatWithGemini as askGemini } from '../services/geminiService';
import { Coordinates, BucketItem, Theme } from '../types';

interface AIResult {
    text: string;
    urls?: string[];
    timestamp: number;
}

interface ChatbotModalProps {
    isOpen: boolean;
    onClose: () => void;
    userLocation: Coordinates | null;
    items: BucketItem[];
    theme: Theme;
    cityContext?: string;
}

const FormattedText = ({ text }: { text: string }) => {
    const lines = text.split('\n');
    return (
        <div className="space-y-3">
            {lines.map((line, i) => {
                let processedLine = line.trim();
                if (!processedLine) return <div key={i} className="h-1" />;
                
                const isBullet = processedLine.startsWith('* ') || processedLine.startsWith('- ');
                const content = isBullet ? processedLine.substring(2) : processedLine;

                const parts = content.split(/(\*\*.*?\*\*)/g);

                const renderedLine = (
                    <span key={i}>
                        {parts.map((part, pi) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={pi} className="font-black text-indigo-700 dark:text-indigo-400">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                        })}
                    </span>
                );

                return (
                    <div key={i} className={isBullet ? "pl-4 relative" : "text-gray-700 dark:text-gray-200"}>
                        {isBullet && <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500/50" />}
                        {renderedLine}
                    </div>
                );
            })}
        </div>
    );
};

export const ChatbotModal: React.FC<ChatbotModalProps> = ({ isOpen, onClose, userLocation, items, theme, cityContext }) => {
    const [result, setResult] = useState<AIResult | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'prompt' | 'thinking' | 'result'>('prompt');
    const [thinkingText, setThinkingText] = useState('Consulting Global Neural Grid...');
    const resultEndRef = useRef<HTMLDivElement>(null);

    const thinkingMessages = [
        "Consulting Global Neural Grid...",
        "Scanning Local Hidden Gems...",
        "Synthesizing Travel Insights...",
        "Aligning with your Bucket List...",
        "Finalizing Strategic Guidance..."
    ];

    useEffect(() => {
        if (isOpen) {
            setViewMode('prompt');
            setResult(null);
            setInput('');
        }
    }, [isOpen]);

    useEffect(() => {
        let interval: number;
        if (viewMode === 'thinking') {
            let i = 0;
            interval = window.setInterval(() => {
                i = (i + 1) % thinkingMessages.length;
                setThinkingText(thinkingMessages[i]);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [viewMode]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        setViewMode('thinking');
        setIsLoading(true);

        const bucketListSummary = items.map(i => i.title).join(', ');
        const locationToUse = cityContext || 'Current location';
        
        try {
            const response = await askGemini(input, locationToUse, bucketListSummary);

            setResult({ 
                text: response.text || "I processed your request but couldn't generate a specific response.", 
                urls: response.urls,
                timestamp: Date.now() 
            });
            setViewMode('result');
        } catch (error) {
            setResult({ 
                text: "I encountered an error while consulting the neural grid. Please try again later.", 
                timestamp: Date.now() 
            });
            setViewMode('result');
        } finally {
            setIsLoading(false);
        }
    };

    const s = useMemo(() => {
        switch (theme) {
            case 'elsa': return { 
                bg: 'bg-white', 
                bubbleAi: 'bg-cyan-50/50 border-cyan-100 text-cyan-900', 
                accent: 'text-orange-500',
                iconBg: 'bg-orange-500',
                btnGradient: 'from-orange-600 to-orange-400 shadow-orange-500/30',
                chip: 'bg-cyan-100/50 text-cyan-700'
            };
            case 'batman': return { 
                bg: 'bg-gray-950', 
                bubbleAi: 'bg-gray-900 border-gray-800 text-gray-100', 
                accent: 'text-yellow-500',
                iconBg: 'bg-yellow-500',
                btnGradient: 'from-yellow-600 to-yellow-500 shadow-yellow-500/30',
                chip: 'bg-gray-800 text-gray-300'
            };
            default: return { 
                bg: 'bg-white', 
                bubbleAi: 'bg-slate-50 border-slate-100 text-slate-900', 
                accent: 'text-red-500',
                iconBg: 'bg-indigo-600',
                btnGradient: 'from-indigo-700 to-blue-600 shadow-indigo-600/30',
                chip: 'bg-slate-100 text-slate-600'
            };
        }
    }, [theme]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-md ${s.bg} rounded-[2.5rem] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 border border-white/20 flex flex-col max-h-[75vh]`}>
                
                {/* Header */}
                <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className={`absolute -inset-1 rounded-2xl ${s.iconBg} opacity-20 blur ${viewMode === 'thinking' ? 'animate-pulse' : ''}`} />
                            <div className={`w-10 h-10 rounded-2xl ${s.iconBg} flex items-center justify-center shadow-lg relative z-10`}>
                                <Sparkles className={`w-5 h-5 text-white ${viewMode === 'thinking' ? 'animate-spin' : ''}`} />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-[12px] font-black uppercase tracking-widest text-gray-900 dark:text-white leading-none mb-0.5">Dream Advisor</h2>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Strategic Intelligence</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600 rounded-full transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {viewMode === 'prompt' && (
                        <div className="p-8 space-y-6 flex-1 overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1">What's on your mind?</label>
                                <textarea 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="e.g. Should I visit the Swiss Alps this December for a week?"
                                    className="w-full h-32 p-6 rounded-[1.8rem] border border-indigo-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium outline-none transition-all focus:border-indigo-300 focus:ring-8 focus:ring-indigo-50 dark:focus:ring-indigo-900/10 text-gray-700 dark:text-gray-200 resize-none placeholder:text-gray-300"
                                />
                            </div>

                            <button 
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className={`w-full flex items-center justify-center gap-3 py-4 rounded-[1.2rem] transition-all disabled:opacity-50 active:scale-95 bg-gradient-to-r ${s.btnGradient} text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:brightness-110`}
                            >
                                <Brain className="w-4 h-4" />
                                Consulting Neural Grid
                            </button>

                            <div className="flex flex-col items-center gap-4 pt-4">
                                <div className="flex items-center gap-8 opacity-20">
                                    <Target className="w-3.5 h-3.5" />
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <TrendingUp className="w-3.5 h-3.5" />
                                </div>
                                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-300 dark:text-gray-600 text-center">
                                    Authorized by JK Advisory Cloud
                                </p>
                            </div>
                        </div>
                    )}

                    {viewMode === 'thinking' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in duration-500">
                            <div className="relative">
                                <div className={`absolute -inset-10 rounded-full ${s.iconBg} opacity-10 blur-3xl animate-pulse`} />
                                <div className={`w-24 h-24 rounded-[2rem] ${s.iconBg} flex items-center justify-center shadow-2xl relative z-10 animate-bounce`}>
                                    <Brain className="w-10 h-10 text-white animate-pulse" />
                                </div>
                                <div className="absolute top-0 left-0 w-full h-full animate-ping opacity-20">
                                    <div className={`w-full h-full rounded-[2rem] ${s.iconBg}`} />
                                </div>
                            </div>
                            
                            <div className="text-center space-y-2">
                                <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${s.accent} animate-pulse`}>
                                    {thinkingText}
                                </h3>
                                <div className="w-48 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mx-auto">
                                    <div className={`h-full ${s.accentBg} animate-[shimmer_2s_infinite_linear] w-1/3 rounded-full`} />
                                </div>
                            </div>
                        </div>
                    )}

                    {viewMode === 'result' && result && (
                        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                                <div className="flex items-center gap-2 mb-2 opacity-40">
                                    <Sparkles className="w-3 h-3" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Strategy Report</span>
                                </div>
                                
                                <div className={`p-6 rounded-[2rem] ${s.bubbleAi} border border-indigo-100/50 dark:border-gray-800 shadow-sm relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                                        <Target className="w-32 h-32" />
                                    </div>
                                    <div className="relative z-10 text-[12px] md:text-[13px] leading-relaxed">
                                        <FormattedText text={result.text} />
                                    </div>
                                </div>

                                {result.urls && result.urls.length > 0 && (
                                    <div className="pt-2 space-y-3">
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Knowledge Sources</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.urls.map((url, i) => (
                                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${s.chip} text-[9px] font-bold border border-transparent hover:border-black/5 transition-all`}>
                                                    <ExternalLink className="w-2.5 h-2.5" /> 
                                                    <span className="max-w-[120px] truncate">{new URL(url).hostname}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 pt-0 shrink-0">
                                <button 
                                    onClick={() => setViewMode('prompt')}
                                    className="w-full flex items-center justify-center gap-3 py-4 rounded-[1.2rem] transition-all bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 group"
                                >
                                    <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                                    Fresh Dream Advice
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
