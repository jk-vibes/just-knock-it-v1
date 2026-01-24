
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles, MapPin, ExternalLink, MessageCircle } from 'lucide-react';
// Fixed: chatWithGemini and reverseGeocode are exported from geminiService, not driveService
import { chatWithGemini as askGemini, reverseGeocode } from '../services/geminiService';
import { Coordinates, BucketItem, Theme } from '../types';

interface Message {
    role: 'user' | 'ai';
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

export const ChatbotModal: React.FC<ChatbotModalProps> = ({ isOpen, onClose, userLocation, items, theme, cityContext }) => {
    const [messages, setMessages] = useState<Message[]>([
        { 
            role: 'ai', 
            text: "Hi! I'm your Just Knock guide. Ask me anything about your bucket list, or for nearby recommendations!", 
            timestamp: Date.now() 
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', text: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        const bucketListSummary = items.map(i => i.title).join(', ');
        
        // Use cityContext if provided, fallback to standard check
        const locationToUse = cityContext || 'Current location';
        
        const response = await askGemini(input, locationToUse, bucketListSummary);

        const aiMsg: Message = { 
            role: 'ai', 
            text: response.text || "Sorry, I couldn't process that.", 
            urls: response.urls,
            timestamp: Date.now() 
        };
        
        setMessages(prev => [...prev, aiMsg]);
        setIsLoading(false);
    };

    if (!isOpen) return null;

    const s = (() => {
        switch (theme) {
            case 'elsa': return { bg: 'bg-cyan-50', bubbleAi: 'bg-white text-cyan-900 border-cyan-100', bubbleUser: 'bg-orange-500 text-white', accent: 'text-orange-500' };
            case 'batman': return { bg: 'bg-black', bubbleAi: 'bg-gray-800 text-white border-gray-700', bubbleUser: 'bg-yellow-500 text-black', accent: 'text-yellow-500' };
            default: return { bg: 'bg-slate-50', bubbleAi: 'bg-white text-slate-900 border-slate-200', bubbleUser: 'bg-red-600 text-white', accent: 'text-red-500' };
        }
    })();

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-lg ${s.bg} sm:rounded-3xl h-[85vh] sm:h-[600px] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-white/10 shrink-0 bg-white dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-gray-100 dark:bg-gray-800 ${s.accent}`}>
                             <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M56 160c0-100 400-100 400 0" stroke="currentColor" strokeWidth="30" strokeLinecap="round" fill="none" />
                                <path d="M56 160l40 320h320l40-320Z" fill="currentColor" opacity="0.2" />
                                <path d="M56 160L96 480L416 480L456 160Z" fill="none" stroke="currentColor" strokeWidth="30" />
                                <text x="256" y="380" fontFamily="Arial Black" fontWeight="900" fontSize="200" fill="currentColor" textAnchor="middle">?</text>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Dream Guide</h2>
                            {cityContext && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                                    <MapPin className="w-2 h-2 text-red-500" /> {cityContext}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium leading-relaxed border shadow-sm ${msg.role === 'user' ? s.bubbleUser : s.bubbleAi}`}>
                                {msg.text}
                                {msg.urls && msg.urls.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 space-y-1">
                                        <p className="text-[8px] font-black uppercase opacity-60">Sources:</p>
                                        {msg.urls.map((url, i) => (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] hover:underline truncate opacity-80">
                                                <ExternalLink className="w-2.5 h-2.5" /> {new URL(url).hostname}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="text-[8px] text-gray-400 mt-1 uppercase font-black tracking-tighter">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-gray-400 animate-pulse">
                            <div className={`p-2 rounded-xl bg-white border ${s.accent}`}>
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Searching...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white dark:bg-gray-900/50 border-t dark:border-white/10 shrink-0">
                    <div className="flex gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl border dark:border-white/5 shadow-inner">
                        <input 
                            type="text" 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about your list, food, nearby spots..." 
                            className="flex-1 bg-transparent text-sm outline-none px-3 py-2 text-gray-800 dark:text-gray-100"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={`p-2.5 rounded-xl transition-all disabled:opacity-30 ${s.bubbleUser}`}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
