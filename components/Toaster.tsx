import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, X, ShieldAlert, Zap, Snowflake, Bell, Shield, Ghost, Star } from 'lucide-react';
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
      case 'info': return <Zap className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const isSmart = t.title === "JK Smart Notifier";

  const renderMarvel = () => {
    const titleText = t.title || "S.H.I.E.L.D Comms";
    
    // Solid styles for Marvel
    const isSmartStyle = isSmart 
        ? 'bg-blue-900 border-black text-white' 
        : 'bg-white border-slate-200 text-slate-900';
    
    const headerBg = isSmart ? 'bg-red-600 border-b border-red-700' : 'bg-slate-50 border-b border-slate-100';
    const headerText = isSmart ? 'text-white' : 'text-slate-500';
    
    // Icon Background
    let iconWrapperClass = 'bg-slate-100 text-slate-600';
    if (isSmart) iconWrapperClass = 'bg-blue-800 text-blue-200 border border-blue-700';
    else if (t.type === 'success') iconWrapperClass = 'bg-green-100 text-green-600';
    else if (t.type === 'error') iconWrapperClass = 'bg-red-100 text-red-600';
    else if (t.type === 'warning') iconWrapperClass = 'bg-orange-100 text-orange-600';

    return (
      <div className="relative group animate-in slide-in-from-left-8 fade-in duration-300 pointer-events-auto mb-4">
        <div className={`flex flex-col min-w-[280px] max-w-[85vw] shadow-xl border-2 rounded-xl overflow-hidden relative ${isSmartStyle}`}>
          
          {/* Header */}
          <div className={`flex items-center justify-between px-3 py-2 ${headerBg}`}>
             <div className="flex items-center gap-2">
                <Shield className={`w-3.5 h-3.5 ${headerText}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${headerText}`}>
                    {titleText}
                </span>
             </div>
             <button onClick={() => onRemove(t.id)} className={`p-0.5 rounded hover:bg-black/10 transition-colors ${headerText}`}>
                <X className="w-3.5 h-3.5" />
             </button>
          </div>

          {/* Body */}
          <div className="flex items-start gap-3 p-4 pr-6">
            <div className={`p-2 rounded-lg shrink-0 ${iconWrapperClass}`}>
                {getIcon(t.type)}
            </div>
            <p className="text-[13px] font-bold leading-relaxed capitalize-first mt-0.5">
                {t.message}
            </p>
          </div>

          {/* Progress Bar */}
          {t.duration !== 0 && (
            <div className={`h-1 w-full ${isSmart ? 'bg-blue-950' : 'bg-slate-100'}`}>
              <div 
                className="h-full bg-red-600 transition-all duration-100 ease-linear" 
                style={{ width: `${progress}%` }} 
              />
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
        <div className="flex flex-col min-w-[300px] max-w-[85vw] bg-[#1a1b1e] border border-gray-800 rounded-lg shadow-2xl overflow-hidden relative">
          
          {/* Header Strip */}
          <div className="flex items-center justify-between px-4 py-2 bg-black border-b border-gray-800">
             <div className="flex items-center gap-2">
                 <Ghost className="w-3.5 h-3.5 text-yellow-500" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-500">
                    {titleText}
                 </span>
             </div>
             <button onClick={() => onRemove(t.id)} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
             </button>
          </div>

          <div className="flex items-start gap-4 p-4 bg-[#1a1b1e]">
             <div className="shrink-0 text-yellow-500">
                {getIcon(t.type)}
             </div>
             <div className="flex-1">
                <p className="text-[12px] font-medium leading-relaxed text-gray-200 capitalize-first">{t.message}</p>
             </div>
          </div>

          {t.duration !== 0 && (
            <div className="h-[2px] w-full bg-gray-900">
              <div 
                className="h-full bg-yellow-500 transition-all duration-100 ease-linear" 
                style={{ width: `${progress}%` }} 
              />
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
        <div className="flex flex-col min-w-[280px] max-w-[85vw] bg-white border border-cyan-100 shadow-xl shadow-cyan-100/50 rounded-2xl overflow-hidden relative">
          
          {/* Header - Orange Background */}
          <div className="flex items-center justify-between px-4 py-2 bg-orange-400 border-b border-orange-500">
             <div className="flex items-center gap-2">
                 <Snowflake className="w-3.5 h-3.5 text-white" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white">
                    {titleText}
                 </span>
             </div>
             <button onClick={() => onRemove(t.id)} className="text-orange-100 hover:text-white transition-colors">
               <X className="w-3.5 h-3.5" />
             </button>
          </div>

          <div className="flex items-start gap-4 p-4">
             <div className="shrink-0 p-2 bg-cyan-50 rounded-full text-cyan-500">
                {getIcon(t.type)}
             </div>

             <div className="flex-1 min-w-0 pt-1">
               <p className="text-[13px] font-medium text-cyan-900 leading-relaxed capitalize-first">{t.message}</p>
             </div>
          </div>

          {t.duration !== 0 && (
            <div className="h-1 w-full bg-cyan-50">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-cyan-400 transition-all duration-100 ease-linear" 
                style={{ width: `${progress}%` }} 
              />
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
    <div className="fixed bottom-8 left-4 z-[200] flex flex-col items-start pointer-events-none pr-6">
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