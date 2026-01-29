import React from 'react';
import { MapPin, Navigation, CheckCircle2, Circle, Trash2, Calendar, Route, Image as ImageIcon, Check, Snowflake, Flag } from 'lucide-react';
import { BucketItem, Coordinates, Theme, TravelMode } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';
import { CategoryIcon } from './CategoryIcon';

interface BucketListCardProps {
  item: BucketItem;
  userLocation: Coordinates | null;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: BucketItem) => void;
  onViewImages: (item: BucketItem) => void;
  onPlanTrip: (item: BucketItem) => void;
  proximityRange?: number;
  theme?: Theme;
  isCompact?: boolean;
  onSearch: (term: string) => void;
  isHighlighted?: boolean;
  travelMode?: TravelMode;
}

const ThemeBackgroundIcon = ({ theme }: { theme?: Theme }) => {
    if (!theme) return null;
    
    switch(theme) {
        case 'batman':
            return (
                <div className="absolute -bottom-4 -right-2 w-36 h-24 opacity-[0.15] pointer-events-none rotate-[-15deg] z-0 animate-float">
                   <svg viewBox="0 0 100 60" fill="currentColor" className="w-full h-full text-yellow-500">
                       <path d="M50 33 C50 33, 52 28, 54 27 C 56 26, 58 25, 58 25 C 58 25, 59 24, 60 25 C 61 26, 60.5 27, 60.5 27 C 60.5 27, 64 26.5, 68 26.5 C 72 26.5, 78 27.5, 80 28.5 C 82 29.5, 86 33, 86 33 C 86 33, 86 30, 85 29 C 84 28, 83 26, 83 26 C 83 26, 89 29, 93 34 C 97 39, 97 43, 97 43 C 97 43, 95 41, 91 40 C 87 39, 84 40, 84 40 C 84 40, 86 42, 86 44 C 86 46, 85 49, 83 52 C 81 55, 78 57, 74 57 C 70 57, 68 55, 66 54 C 64 53, 63 52, 62 52 C 61 52, 60 53, 58 54 C 56 55, 54 57, 50 57 C 46 57, 44 54, 42 54 C 40 53, 39 52, 38 52 C 37 52, 36 53, 34 54 C 32 55, 30 57, 26 57 C 22 57, 19 55, 17 52 C 15 49, 14 46, 14 44 C 14 42, 16 40, 16 40 C 16 40, 13 39, 9 40 C 5 41, 3 43, 3 43 C 3 43, 3 39, 7 34 C 11 29, 17 26, 17 26 C 17 26, 16 28, 15 29 C 14 30, 14 33, 14 33 C 14 33, 18 29.5, 20 28.5 C 22 27.5, 28 26.5, 32 26.5 C 36 26.5, 39.5 27, 39.5 27 C 39.5 27, 39 26, 40 25 C 41 24, 42 25, 42 25 C 42 25, 44 26, 46 27 C 48 28, 50 33, 50 33 Z" />
                   </svg>
                </div>
            );
        case 'elsa':
            return (
                 <div className="absolute -bottom-4 -right-4 w-24 h-24 opacity-[0.2] pointer-events-none z-0 animate-float">
                    <Snowflake className="w-full h-full text-cyan-400" />
                </div>
            );
        case 'marvel':
            return (
                 <div className="absolute -bottom-4 -right-4 w-24 h-24 opacity-[0.1] pointer-events-none z-0 rotate-[-12deg] animate-float">
                     <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-blue-900">
                         <circle cx="12" cy="12" r="11" fill="currentColor" />
                         <circle cx="12" cy="12" r="8" fill="#f8fafc" /> 
                         <circle cx="12" cy="12" r="5" fill="#ef4444" />
                         <circle cx="12" cy="12" r="2.5" fill="#1e3a8a" />
                         <path d="M12 4 L13.5 8.5 H18 L14.5 11 L16 15.5 L12 13 L8 15.5 L9.5 11 L6 8.5 H10.5 L12 4 Z" fill="white" />
                     </svg>
                 </div>
            );
        default:
            return null;
    }
}

export const BucketListCard: React.FC<BucketListCardProps> = ({ 
  item, userLocation, onToggleComplete, onDelete, onEdit, onViewImages, onPlanTrip, theme, isCompact = false, onSearch, isHighlighted, travelMode = 'driving'
}) => {
  const hasCoords = item.coordinates && item.coordinates.latitude !== 0;

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasCoords) {
      const mode = travelMode === 'bicycling' ? 'bicycling' : travelMode;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${item.coordinates!.latitude},${item.coordinates!.longitude}&travelmode=${mode}`;
      window.open(url, '_blank');
    }
  };

  const getStyles = () => {
      switch (theme) {
          case 'marvel':
              return {
                  card: 'bg-gradient-to-br from-white via-slate-50 to-blue-50/20 border-slate-200',
                  text: 'text-slate-900',
                  subText: 'text-slate-500',
                  checkChecked: 'text-green-500',
                  checkUnchecked: 'border-slate-400 hover:border-blue-500',
                  pill: 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white',
                  tagPill: 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100',
                  interestPill: 'text-slate-600 bg-slate-50 border-slate-100 hover:bg-slate-100',
                  icon: 'text-blue-600',
                  shareBtn: 'text-blue-600 bg-blue-50 hover:bg-blue-100 hover:scale-110',
                  navBtn: 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100 hover:scale-110',
                  imgBtn: 'bg-purple-50 border-purple-100 text-purple-600 hover:bg-purple-100 hover:scale-110',
                  titleCompleted: 'text-slate-400'
              };
          case 'elsa':
              return {
                  card: 'bg-gradient-to-br from-white/95 via-cyan-50/20 to-sky-100/30 border-cyan-100 shadow-cyan-100/50',
                  text: 'text-cyan-950',
                  subText: 'text-cyan-600/80',
                  checkChecked: 'text-orange-500', 
                  checkUnchecked: 'border-cyan-300 hover:border-orange-400',
                  pill: 'bg-cyan-50/50 border-cyan-100 text-cyan-700 hover:bg-cyan-100',
                  tagPill: 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100', 
                  interestPill: 'text-cyan-600 bg-cyan-50/50 border-cyan-100 hover:bg-cyan-100',
                  icon: 'text-orange-500', 
                  shareBtn: 'text-orange-500 bg-orange-50 hover:bg-orange-100 hover:scale-110', 
                  navBtn: 'bg-sky-50 border-sky-100 text-sky-600 hover:bg-sky-100 hover:scale-110',
                  imgBtn: 'bg-indigo-50 border-indigo-100 text-indigo-500 hover:bg-indigo-100 hover:scale-110',
                  titleCompleted: 'text-cyan-900/40'
              };
          case 'batman':
          default:
              return {
                  card: 'bg-gradient-to-br from-zinc-900 via-gray-900 to-black border-gray-700', 
                  text: 'text-white',
                  subText: 'text-gray-300',
                  checkChecked: 'text-green-500',
                  checkUnchecked: 'border-gray-500 hover:border-gray-300',
                  pill: 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700',
                  tagPill: 'bg-yellow-900/20 text-yellow-500 border-yellow-900/30 hover:bg-yellow-900/40',
                  interestPill: 'text-gray-400 bg-gray-800 border-gray-700 hover:bg-gray-700',
                  icon: 'text-red-500',
                  shareBtn: 'text-blue-400 hover:bg-slate-700 hover:scale-110',
                  navBtn: 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:scale-110',
                  imgBtn: 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:scale-110',
                  titleCompleted: 'text-gray-500'
              };
      }
  };

  const s = getStyles();

  const formatDate = (ts?: number) => {
      if (!ts) return '';
      return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div 
      id={`card-${item.id}`}
      className={`${s.card} border rounded-2xl p-3 shadow-sm relative group transition-all duration-300 hover:shadow-xl overflow-hidden relative active:scale-[0.98] ${isHighlighted ? 'ring-4 ring-offset-2 ring-red-500 scale-[1.02] z-20' : 'hover:-translate-y-1'}`}
      onClick={() => onEdit(item)}
    >
      <ThemeBackgroundIcon theme={theme} />

      <div className="relative z-10">
        <div className="flex items-start gap-3">
            <button 
                onClick={(e) => { e.stopPropagation(); onToggleComplete(item.id); }} 
                className="mt-0.5 shrink-0 transition-transform hover:scale-125 active:scale-90"
            >
                {item.completed ? (
                    <CheckCircle2 className={`w-5 h-5 ${s.checkChecked} animate-pop`} />
                ) : (
                    <div className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${s.checkUnchecked}`} />
                )}
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                    <div className="flex flex-col gap-1 pr-2">
                        <h3 className={`font-bold ${isCompact ? 'text-sm' : 'text-base'} leading-tight transition-all duration-500 ${item.completed ? 'line-through ' + s.titleCompleted : s.text}`}>
                            {item.title}
                        </h3>
                        {item.dueDate && !item.completed && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                                <Flag className="w-2.5 h-2.5" />
                                Target: {formatDate(item.dueDate)}
                            </div>
                        )}
                    </div>
                    
                    {item.type !== 'goal' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onPlanTrip(item); }} 
                            className={`p-1.5 rounded-full transition-all shrink-0 -mt-1 -mr-1 ${s.shareBtn}`}
                            title="Plan Trip"
                        >
                            <Route className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {!isCompact && (
                    <div className="mb-2 animate-in slide-in-from-top-2 fade-in duration-500">
                        <p className={`text-xs leading-relaxed line-clamp-3 mb-2 transition-colors duration-500 ${s.subText}`}>
                            {item.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-1.5 mb-1">
                            {item.category && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onSearch(item.category || ''); }}
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 transition-all duration-300 ${s.tagPill} active:scale-95`}
                                >
                                    <CategoryIcon category={item.category} className="w-3 h-3" />
                                    {item.category}
                                </button>
                            )}
                            {item.bestTimeToVisit && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 flex items-center gap-1 animate-in fade-in slide-in-from-left duration-700">
                                    <Calendar className="w-3 h-3" />
                                    {item.bestTimeToVisit}
                                </span>
                            )}
                            {item.interests && item.interests.map((interest, i) => (
                                <button
                                    key={interest}
                                    onClick={(e) => { e.stopPropagation(); onSearch(interest); }}
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-medium border transition-all duration-300 ${s.interestPill} active:scale-95 animate-in fade-in duration-700`}
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    #{interest}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                    {item.locationName && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md border max-w-[150px] transition-all duration-300 ${s.pill} group-hover:shadow-sm`}>
                            <MapPin className={`w-3 h-3 shrink-0 ${s.icon} animate-pulse`} />
                            <span className="text-[10px] font-bold truncate">
                                {item.locationName}
                            </span>
                        </div>
                    )}

                    {userLocation && item.coordinates && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all duration-300 ${s.pill} group-hover:shadow-sm`}>
                            <span className="text-[10px] font-bold">
                                {formatDistance(calculateDistance(userLocation, item.coordinates))}
                            </span>
                        </div>
                    )}
                    
                    {hasCoords && (
                        <button 
                            onClick={handleNavigate}
                            className={`p-1 border rounded-md transition-all duration-300 ${s.navBtn}`}
                            title={`Navigate (${travelMode})`}
                        >
                            <Navigation className="w-3 h-3" />
                        </button>
                    )}

                    <button 
                        onClick={(e) => { e.stopPropagation(); onViewImages(item); }}
                        className={`p-1 border rounded-md transition-all duration-300 ${s.imgBtn}`}
                        title="Images"
                    >
                        <ImageIcon className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};