
import React from 'react';
import { X, Rocket, Star, Calendar, Hash, ChevronRight } from 'lucide-react';

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
              "Integrated comprehensive Privacy Policy and Terms of Service",
              "Added clear data collection and Google Drive usage disclosures",
              "Added proximity radar safety guidelines for location-aware features",
              "Refined Login UI with explicit policy consent links"
          ]
      },
      {
          version: "v1.8",
          date: "Jan 15, 2026",
          title: "Analytics & UI Polish",
          changes: [
              "Complete Dashboard overhaul with advanced data visualization",
              "Added Year-to-Date (YTD) completion progress chart",
              "Introduced Seasonal Balance metrics (Spring/Summer/Fall/Winter)",
              "New efficiency metric tracking average completion speed",
              "Itinerary Stop Mastery: Track global sub-stop progress",
              "Refined 'Bento Grid' UI for a professional, compact look"
          ]
      },
      {
          version: "v1.7",
          date: "Jan 12, 2026",
          title: "Trip Planner Upgrades",
          changes: [
              "Trip Planner enhancements with local-only focus",
              "New AI Magic Fill for itineraries to discover hidden gems",
              "Usability fixes for map marker navigation",
              "Theme redesign for Elsa and Batman modes"
          ]
      },
      {
          version: "v1.6",
          date: "Jan 2, 2026",
          title: "Navigation & Discovery",
          changes: [
              "Added 'GO' navigation button for instant Google Maps routing",
              "Itinerary Generator: Optimized limit to 15 top places",
              "Visual Update: Added photos for itinerary stops",
              "Smart Ranking: Star indicators for top landmarks",
              "Added details view for individual itinerary stops"
          ]
      },
      {
          version: "v1.5",
          date: "Dec 31, 2025",
          title: "Cloud Sync & Map Polish",
          changes: [
              "Automatic Google Drive Backup (Every 24h)",
              "Restored Icon-based Filter Toolbar (Todo/Done)",
              "Map Upgrade: Cleaner, smaller pin markers",
              "Map Status: Green pins for Done, Red for Pending"
          ]
      }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col h-[70vh] border border-gray-100 dark:border-gray-800">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-red-600 to-red-500 p-6 text-white shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Rocket className="w-20 h-20 rotate-12" />
            </div>
            
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <h2 className="text-2xl font-black tracking-tight leading-none">Version History</h2>
                    <p className="text-red-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 opacity-80">Evolution of Just Knock</p>
                </div>
                <button 
                    onClick={onClose}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors active:scale-90"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-10">
            {history.map((log, idx) => (
                <div key={log.version} className="relative animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                    {/* Connection Line */}
                    {idx !== history.length - 1 && (
                        <div className="absolute left-[13px] top-8 bottom-[-30px] w-0.5 bg-gray-100 dark:bg-gray-800" />
                    )}

                    <div className="flex items-start gap-4">
                        {/* Version Dot */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm z-10 ${idx === 0 ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                            <Hash className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 pt-0.5 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">
                                    {log.version} <span className="mx-2 text-gray-300 dark:text-gray-700">•</span> {log.title}
                                </h3>
                            </div>
                            
                            <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <Calendar className="w-3 h-3" />
                                {log.date}
                            </div>

                            <ul className="space-y-2.5">
                                {log.changes.map((change, cIdx) => (
                                    <li key={cIdx} className="flex gap-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed group">
                                        <ChevronRight className="w-3 h-3 mt-1 shrink-0 text-red-500/50 group-hover:text-red-500 transition-colors" />
                                        <span>{change}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            ))}

            <div className="pt-10 pb-4 text-center">
                 <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.5em]">Knock Your Limits</p>
            </div>
        </div>
      </div>
    </div>
  );
};
