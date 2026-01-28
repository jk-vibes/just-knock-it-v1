
import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, Loader2, X, Sparkles, ShieldAlert } from 'lucide-react';
import { toast, ToastOptions } from '../utils/toast';
import { Theme } from '../types';

interface ToasterProps {
  theme: Theme;
}

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

  const getStyles = (type: ToastOptions['type']) => {
    const base = "flex items-center gap-3 p-4 pr-12 rounded-2xl shadow-2xl border backdrop-blur-md transition-all animate-in slide-in-from-top-4 duration-300 pointer-events-auto max-w-[90vw] md:max-w-md cursor-pointer active:scale-95";
    
    switch (theme) {
      case 'batman':
        switch (type) {
          case 'success': return `${base} bg-zinc-900/90 border-green-500/50 text-green-400`;
          case 'error': return `${base} bg-zinc-900/90 border-red-500/50 text-red-400`;
          case 'warning': return `${base} bg-zinc-900/90 border-yellow-500/50 text-yellow-400`;
          case 'loading': return `${base} bg-zinc-900/90 border-gray-700 text-gray-400`;
          default: return `${base} bg-zinc-900/90 border-yellow-500/50 text-white`;
        }
      case 'elsa':
        switch (type) {
          case 'success': return `${base} bg-white/90 border-green-200 text-green-600`;
          case 'error': return `${base} bg-white/90 border-red-200 text-red-600`;
          case 'warning': return `${base} bg-white/90 border-orange-200 text-orange-600`;
          case 'loading': return `${base} bg-white/90 border-cyan-100 text-cyan-500`;
          default: return `${base} bg-white/90 border-orange-200 text-cyan-950`;
        }
      case 'marvel':
      default:
        switch (type) {
          case 'success': return `${base} bg-white/95 border-green-100 text-green-600 shadow-green-500/10`;
          case 'error': return `${base} bg-white/95 border-red-100 text-red-600 shadow-red-500/10`;
          case 'warning': return `${base} bg-white/95 border-amber-100 text-amber-600 shadow-amber-500/10`;
          case 'loading': return `${base} bg-white/95 border-blue-100 text-blue-500 shadow-blue-500/10`;
          default: return `${base} bg-white/95 border-blue-100 text-slate-900 shadow-blue-500/10`;
        }
    }
  };

  const getIcon = (type: ToastOptions['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 shrink-0 animate-pop" />;
      case 'error': return <ShieldAlert className="w-5 h-5 shrink-0" />;
      case 'warning': return <AlertCircle className="w-5 h-5 shrink-0" />;
      case 'loading': return <Loader2 className="w-5 h-5 shrink-0 animate-spin" />;
      case 'info': return <Sparkles className="w-5 h-5 shrink-0" />;
      default: return <Info className="w-5 h-5 shrink-0" />;
    }
  };

  return (
    <div className="fixed top-6 left-0 right-0 z-[120] flex flex-col items-center gap-3 pointer-events-none px-4">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className={getStyles(t.type)}
          onClick={() => removeToast(t.id)}
          role="status"
          aria-live="polite"
        >
          <div className="shrink-0">{getIcon(t.type)}</div>
          <p className="text-sm font-bold leading-tight select-none">{t.message}</p>
          <button 
            className="absolute right-3 p-1 opacity-50 hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); removeToast(t.id); }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
