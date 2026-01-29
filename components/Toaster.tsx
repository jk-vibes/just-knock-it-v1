import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, X, ShieldAlert, Zap, Snowflake, Bell, Shield, Ghost, Star, Sparkles } from 'lucide-react';
import { toast, ToastOptions } from '../utils/toast';
import { Theme } from '../types';

interface ToasterProps {
  theme: Theme;
}

interface ToastItemProps {
  t: ToastOptions;
  theme: Theme;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ t, theme, onRemove }) => {
  const [progress, setProgress] = useState(100);
  const duration = t.duration || 3000;
  const isSmart = t.title === "Smart Notifier";

  useEffect(() => {
    if (t.duration === 0) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 16);

    return () => clearInterval(interval);
  }, [t.duration, duration]);

  const getIcon = (type: ToastOptions['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5" />;
      case 'error': return <ShieldAlert className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'loading': return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'info': return isSmart ? <Sparkles className="w-5 h-5" /> : <Zap className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const renderMarvel = () => {
    const titleText = t.title || "S.H.I.E.L.D Comms";
    return (
      <div className="relative group animate-in slide-in-from-left-8 fade-in duration-300 pointer-events-auto mb-4">
        <div className={`flex flex-col shadow-2xl rounded-2xl overflow-hidden border backdrop-blur-xl transition-all ${
          isSmart 
            ? 'bg-red-600/70 border-white/30 text-white shadow-red-500/20 min-w-[240px] max-w-[70vw]' 
            : 'bg-white/80 border-slate-200/50 text-slate-900 min-w-[280px] max-w-[85vw]'
        }`}>
          <div className={`flex items-center justify-between px-4 py-2 ${isSmart ? 'bg-white/10' : 'bg-slate-900/5'} border-b border-white/10`}>
             <div className="flex items-center gap-2">
                {isSmart ? <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> : <Shield className="w-3.5 h-3.5 opacity-50" />}
                <span className={`text-[10px] font-black uppercase tracking-widest ${isSmart ? 'text-white' : 'text-slate-500'}`}>
                    {titleText}
                </span>
             </div>
             <button onClick={() => onRemove(t.id)} className="p-1 rounded-full hover:bg-black/10 transition-colors">
                <X className="w-3 h-3" />
             </button>
          </div>
          <div className="flex items-start gap-3 p-3">
            <div className={`p-2 rounded-xl shrink-0 ${isSmart ? 'bg-white/20 text-white' : 'bg-red-600 text-white shadow-lg shadow-red-500/30'}`}>
                {getIcon(t.type)}
            </div>
            <p className={`text-[12px] font-bold leading-relaxed capitalize-first mt-0.5 ${isSmart ? 'text-white' : 'text-slate-800'}`}>
                {t.message}
            </p>
          </div>
          {t.duration !== 0 && (
            <div className="h-1 w-full bg-black/5">
              <div className="h-full bg-red-600 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBatman = () => {
    const titleText = t.title || "Tactical Briefing";
    return (
      <div className="relative group animate-in slide-in-from-bottom-4 fade-in duration-300 pointer-events-auto mb-4">
        <div className={`flex flex-col backdrop-blur-2xl rounded-xl shadow-2xl border transition-all overflow-hidden ${
          isSmart 
            ? 'bg-yellow-500/80 border-white/40 text-black shadow-yellow-500/20 min-w-[240px] max-w-[70vw]' 
            : 'bg-black/70 border-gray-800/80 text-white min-w-[300px] max-w-[85vw]'
        }`}>
          <div className={`flex items-center justify-between px-4 py-2 border-b ${isSmart ? 'bg-black/10 border-black/10' : 'bg-white/5 border-white/5'}`}>
             <div className="flex items-center gap-2">
                 <Ghost className={`w-3.5 h-3.5 ${isSmart ? 'text-black' : 'text-yellow-500'}`} />
                 <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isSmart ? 'text-black' : 'text-yellow-500'}`}>
                    {titleText}
                 </span>
             </div>
             <button onClick={() => onRemove(t.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                <X className="w-3.5 h-3.5" />
             </button>
          </div>
          <div className="flex items-start gap-4 p-4">
             <div className={`${isSmart ? 'text-black' : 'text-yellow-500'} shrink-0`}>
                {getIcon(t.type)}
             </div>
             <div className="flex-1">
                <p className="text-[11px] font-bold leading-relaxed capitalize-first">{t.message}</p>
             </div>
          </div>
          {t.duration !== 0 && (
            <div className="h-[2px] w-full bg-white/5">
              <div className={`h-full transition-all duration-100 ease-linear ${isSmart ? 'bg-black' : 'bg-yellow-500'}`} style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderElsa = () => {
    const titleText = t.title || "Observation";
    return (
      <div className="relative group animate-in slide-in-from-left-4 fade-in duration-300 pointer-events-auto mb-4">
        <div className={`flex flex-col backdrop-blur-xl rounded-[2rem] shadow-xl border transition-all overflow-hidden ${
          isSmart 
            ? 'bg-cyan-500/60 border-white/50 text-white shadow-cyan-500/20 min-w-[240px] max-w-[70vw]' 
            : 'bg-white/60 border-white/80 text-cyan-900 shadow-cyan-100/50 min-w-[280px] max-w-[85vw]'
        }`}>
          <div className={`flex items-center justify-between px-6 py-2.5 border-b ${isSmart ? 'bg-white/10 border-white/10' : 'bg-orange-400 border-orange-500'}`}>
             <div className="flex items-center gap-2">
                 <Snowflake className="w-3.5 h-3.5 text-white" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white">
                    {titleText}
                 </span>
             </div>
             <button onClick={() => onRemove(t.id)} className="text-white/70 hover:text-white transition-colors">
               <X className="w-3.5 h-3.5" />
             </button>
          </div>
          <div className="flex items-start gap-3 p-4">
             <div className={`shrink-0 p-2 rounded-full shadow-sm ${isSmart ? 'bg-white/20 text-white' : 'bg-white text-cyan-500'}`}>
                {getIcon(t.type)}
             </div>
             <div className="flex-1 min-w-0 pt-0.5">
               <p className={`text-[12px] font-bold leading-relaxed capitalize-first ${isSmart ? 'text-white' : 'text-cyan-900'}`}>{t.message}</p>
             </div>
          </div>
          {t.duration !== 0 && (
            <div className="h-1 w-[70%] mx-auto mb-2 bg-black/5 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-100 ease-linear ${isSmart ? 'bg-white' : 'bg-gradient-to-r from-orange-400 to-cyan-400'}`} style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  switch (theme) {
    case 'marvel': return renderMarvel();
    case 'batman': return renderBatman();
    case 'elsa': return renderElsa();
    default: return renderMarvel();
  }
};

export const Toaster: React.FC<ToasterProps> = ({ theme }) => {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  useEffect(() => {
    return toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);
      
      if (newToast.duration !== 0) {
        setTimeout(() => {
          removeToast(newToast.id);
        }, newToast.duration || 3000);
      }
    });
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-8 left-4 z-[200] flex flex-col items-start pointer-events-none pr-6 max-w-full">
      <style>{`
        .capitalize-first::first-letter {
            text-transform: uppercase;
        }
      `}</style>
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} theme={theme} onRemove={removeToast} />
      ))}
    </div>
  );
};
