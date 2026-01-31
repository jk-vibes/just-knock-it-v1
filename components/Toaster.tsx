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

  const getThemeStyles = () => {
    switch (theme) {
      case 'batman':
        return {
          gradient: 'from-[#EAB308]/80 to-[#111827]/90',
          border: 'border-yellow-500/30',
          accent: 'text-yellow-500',
          progressBar: 'bg-yellow-500',
          iconContainer: 'bg-black/40',
          text: 'text-white',
          title: 'text-yellow-500',
          header: 'bg-white/5 border-white/5'
        };
      case 'elsa':
        return {
          gradient: 'from-[#F97316]/80 to-[#0891B2]/80',
          border: 'border-orange-200/30',
          accent: 'text-white',
          progressBar: 'bg-white',
          iconContainer: 'bg-white/20',
          text: 'text-white',
          title: 'text-white',
          header: 'bg-black/10 border-white/10'
        };
      case 'marvel':
      default:
        return {
          gradient: 'from-[#EF4444]/80 to-[#1E3A8A]/90',
          border: 'border-white/30',
          accent: 'text-white',
          progressBar: 'bg-yellow-400',
          iconContainer: 'bg-white/10',
          text: 'text-white',
          title: 'text-white/90',
          header: 'bg-white/5 border-white/10'
        };
    }
  };

  const s = getThemeStyles();
  const titleText = t.title || (isSmart ? "AI Dream Pulse" : "System Alert");

  return (
    <div className="relative group animate-in slide-in-from-left-8 fade-in duration-300 pointer-events-auto mb-4">
      <div className={`flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden border backdrop-blur-2xl transition-all min-w-[280px] max-w-[85vw] bg-gradient-to-br ${s.gradient} ${s.border}`}>
        
        {/* Toast Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${s.header}`}>
           <div className="flex items-center gap-2">
              {isSmart ? <Sparkles className={`w-3.5 h-3.5 ${s.accent}`} /> : <Shield className={`w-3.5 h-3.5 ${s.accent} opacity-70`} />}
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${s.title}`}>
                  {titleText}
              </span>
           </div>
           <button onClick={() => onRemove(t.id)} className="p-1 rounded-full hover:bg-black/20 transition-colors">
              <X className="w-3 h-3 text-white/50 hover:text-white" />
           </button>
        </div>

        {/* Toast Body */}
        <div className="flex items-start gap-3 p-4">
          <div className={`p-2.5 rounded-xl shrink-0 shadow-lg ${s.iconContainer} ${s.accent}`}>
              {getIcon(t.type)}
          </div>
          <div className="flex-1 pt-0.5">
            <p className={`text-[13px] font-bold leading-relaxed capitalize-first ${s.text}`}>
                {t.message}
            </p>
          </div>
        </div>

        {/* Progress Bar (Timer) */}
        {t.duration !== 0 && (
          <div className="h-1.5 w-[90%] mx-auto mb-2 rounded-full overflow-hidden bg-black/20">
            <div 
              className={`h-full transition-all duration-100 ease-linear rounded-full ${s.progressBar}`} 
              style={{ width: `${progress}%` }} 
            />
          </div>
        )}
      </div>
      
      {/* Subtle Glow for Smart Notifier */}
      {isSmart && (
        <div className={`absolute -inset-1 rounded-3xl bg-gradient-to-br ${s.gradient} opacity-20 blur-xl -z-10 animate-pulse`} />
      )}
    </div>
  );
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