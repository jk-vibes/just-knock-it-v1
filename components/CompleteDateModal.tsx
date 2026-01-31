import React, { useState } from 'react';
import { Calendar, Check, X, ArrowRight, AlertCircle } from 'lucide-react';

interface CompleteDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (completionDate: number, startDate?: number, endDate?: number) => void;
  itemTitle?: string;
}

export const CompleteDateModal: React.FC<CompleteDateModalProps> = ({ isOpen, onClose, onConfirm, itemTitle }) => {
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasTripDates, setHasTripDates] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
      setError(null);
      const cDate = new Date(completionDate);
      cDate.setHours(12, 0, 0, 0);

      let sDateTs: number | undefined;
      let eDateTs: number | undefined;

      if (hasTripDates) {
          if (!startDate || !endDate) {
              setError("Please select both start and end dates.");
              return;
          }
          const sDate = new Date(startDate);
          const eDate = new Date(endDate);
          
          if (eDate < sDate) {
              setError("End date cannot be before start date.");
              return;
          }
          sDateTs = sDate.getTime();
          eDateTs = eDate.getTime();
      }

      onConfirm(cDate.getTime(), sDateTs, eDateTs);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1b1e] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95">
        <div className="flex justify-between items-start p-6 pb-0">
            <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Knocked it! 🎉</h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">"{itemTitle}"</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>
        
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> When was this finished?
                </label>
                <input 
                    type="date" 
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-red-500 transition-all"
                />
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Log Trip Duration</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={hasTripDates} onChange={(e) => setHasTripDates(e.target.checked)} className="sr-only peer" />
                        <div className="w-10 h-5 bg-gray-200 dark:bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                </div>

                {hasTripDates && (
                    <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1.5">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest pl-1">Start</span>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-2.5 text-[10px] font-bold text-gray-900 dark:text-white outline-none" />
                        </div>
                        <div className="pt-5 flex justify-center">
                            <ArrowRight className="w-3 h-3 text-gray-300" />
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest pl-1">End</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-2.5 text-[10px] font-bold text-gray-900 dark:text-white outline-none" />
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-[10px] font-bold animate-shake">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                </div>
            )}

            <button 
                onClick={handleConfirm}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
            >
                Confirm Knockout
            </button>
        </div>
      </div>
    </div>
  );
};