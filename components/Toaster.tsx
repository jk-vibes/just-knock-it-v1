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

  const renderMarvel = () => {
    const colors = {
      success: 'bg-emerald-600',
      error: 'bg-red-700',
      warning: 'bg-orange-500',
      loading: 'bg-blue-600',
      info: 'bg-blue-900'
    };
    const accent = colors[t.type as keyof typeof colors] || 'bg-slate-900';

    return (
      <div className="relative group animate-in slide-in-from-left-8 fade-in duration-300 pointer-events-auto mb-4">
        <div className={`flex flex-col min-w-[280px] max-w-[85vw] shadow-[8px_8px_0px_rgba(0,0,0,0.3)] border-2 border-black ${accent} text-white overflow-hidden relative`}>
          {/* Character Icon Top Right */}
          <div className="absolute top-1.5 right-1.5 opacity-40 pointer-events-none">
            <Shield className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-black/30 border-b border-black/10">
            <button onClick={() => onRemove(t.id)} className="p-0.5 hover:bg-white/20 rounded transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest italic opacity-70">S.H.I.E.L.D Comms</span>
          </div>
          <div className="flex items-start gap-4 p-4 pr-10">
            <div className="bg-white text-black p-2 rounded-sm rotate-3 shadow-md shrink-0 mt-0.5">{getIcon(t.type)}</div>
            <p className="text-[13px] font-medium leading-relaxed capitalize-first">{t.message}</p>
          </div>
          {t.duration !== 0 && (
            <div className="h-1 w-full bg-black/30">
              <div className="h-full bg-red-500 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBatman = () => {
    const colors = {
      success: 'text-green-400 border-green-500/40',
      error: 'text-red-500 border-red-500/40',
      warning: 'text-yellow-500 border-yellow-500/40',
      loading: 'text-blue-400 border-blue-500/40',
      info: 'text-yellow-400 border-yellow-500/40'
    };
    const style = colors[t.type as keyof typeof colors] || 'text-white border-white/20';

    return (
      <div className="relative group animate-in zoom-in-95 slide-in-from-left-4 fade-in duration-300 pointer-events-auto mb-4">
        <div className={`flex flex-col min-w-[300px] max-w-[85vw] bg-zinc-950 border ${style} shadow-[0_15px_40px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden relative`}>
          {/* Character Icon Top Right */}
          <div className="absolute top-3 right-3 opacity-20 pointer-events-none">
            <Ghost className="w-6 h-6 text-yellow-500" />
          </div>

          <div className="flex items-start gap-3 p-4 pr-12">
             <button onClick={() => onRemove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity p-1 -mt-1 -ml-1 hover:bg-white/10 rounded-md">
                <X className="w-4 h-4" />
             </button>
             <div className="shrink-0 p-2 rounded-md bg-black border border-current opacity-90">{getIcon(t.type)}</div>
             <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[7px] font-black uppercase tracking-[0.4em] opacity-40">Tactical Briefing</span>
                </div>
                <p className="text-[12px] font-normal leading-relaxed text-gray-200 capitalize-first">{t.message}</p>
             </div>
          </div>
          {t.duration !== 0 && (
            <div className="h-[2px] w-full bg-white/5">
              <div className="h-full bg-yellow-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(234,179,8,0.5)]" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderElsa = () => {
    return (
      <div className="relative group animate-in slide-in-from-bottom-4 slide-in-from-left-4 fade-in duration-500 pointer-events-auto mb-4">
        <div className="flex flex-col min-w-[280px] max-w-[85vw] bg-white/80 backdrop-blur-3xl border border-white shadow-[0_20px_40px_rgba(6,182,212,0.2)] rounded-[2rem] overflow-hidden relative">
          {/* Character Icon Top Right */}
          <div className="absolute top-4 right-5 opacity-30 pointer-events-none">
            <Snowflake className="w-6 h-6 text-cyan-400 animate-spin-slow" />
          </div>

          <div className="flex items-start gap-4 p-5 pr-14">
             <button onClick={() => onRemove(t.id)} className="p-1.5 bg-cyan-50 rounded-full text-cyan-500 hover:bg-cyan-100 transition-colors shrink-0 -mt-0.5">
               <X className="w-4 h-4" />
             </button>
             <div className="flex-1 min-w-0">
               <h4 className="text-[9px] font-black uppercase tracking-widest text-cyan-600 mb-1.5 opacity-60">Observation</h4>
               <p className="text-[13px] font-medium text-cyan-900 leading-relaxed capitalize-first">{t.message}</p>
             </div>
          </div>
          {t.duration !== 0 && (
            <div className="h-1.5 w-full bg-cyan-50">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
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
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
        }
      `}</style>
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} theme={theme} onRemove={removeToast} />
      ))}
    </div>
  );
};
