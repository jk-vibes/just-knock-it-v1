import React from 'react';
import { X, Rocket, Calendar, Hash, ChevronRight } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const history = [
      {
          version: "v1.9",
          date: "Jan 18, 2026",
          title: "Legal & Safety Update",
          changes: [
              "Integrated Privacy Policy & Terms of Service",
              "Google Drive usage disclosures",
              "Proximity radar safety guidelines",
              "Refined policy consent links"
          ]
      },
      {
          version: "v1.8",
          date: "Jan 15, 2026",
          title: "Analytics & UI Polish",
          changes: [
              "Dashboard overhaul with data viz",
              "Year-to-Date (YTD) completion progress",
              "Seasonal Balance metrics",
              "New efficiency tracking metric"
          ]
      },
      {
          version: "v1.7",
          date: "Jan 12, 2026",
          title: "Trip Planner Upgrades",
          changes: [
              "Local-only focus improvements",
              "AI Magic Fill for hidden gems",
              "Map marker navigation fixes",
              "Theme redesign for Elsa/Batman"
          ]
      }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col h-[60vh] border border-white/30 dark:border-gray-800/50">
        
        {/* Header */}
        <div className="p-6 shrink-0 relative flex justify-between items-start">
            <div>
                <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white leading-none">Changes</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1.5 text-gray-500 dark:text-gray-400">Project Pulse</p>
            </div>
            <button 
                onClick={onClose}
                className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
            >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 space-y-6">
            {history.map((log, idx) => (
                <div key={log.version} className="relative animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 bg-white/50 dark:bg-gray-800/50 border border-white/20 dark:border-gray-700/50 shadow-sm">
                            <Hash className="w-3.5 h-3.5 text-red-500" />
                        </div>

                        <div className="flex-1 pt-0.5">
                            <div className="flex items-center justify-between mb-0.5">
                                <h3 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                    {log.version} • {log.title}
                                </h3>
                            </div>
                            
                            <div className="flex items-center gap-1 mb-2 text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                <Calendar className="w-2.5 h-2.5" />
                                {log.date}
                            </div>

                            <ul className="space-y-1.5">
                                {log.changes.map((change, cIdx) => (
                                    <li key={cIdx} className="flex gap-2 text-[10px] text-gray-600 dark:text-gray-400 font-medium leading-snug">
                                        <ChevronRight className="w-2.5 h-2.5 mt-0.5 shrink-0 text-red-500/40" />
                                        <span>{change}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ))}

            <div className="pt-6 pb-2 text-center border-t border-black/5 dark:border-white/5">
                 <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.4em]">JK Metrics • Knock It</p>
            </div>
        </div>
      </div>
    </div>
  );
};
