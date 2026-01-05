
import React from 'react';
import { BucketItem } from '../types';
import { Plus } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface TimelineViewProps {
  items: BucketItem[];
  onEdit: (item: BucketItem) => void;
  pendingCount: number;
  onViewPending: () => void;
  highlightedId?: string | null;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ items, onEdit, pendingCount, onViewPending, highlightedId }) => {
  const sortedItems = [...items].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const grouped = sortedItems.reduce((groups, item) => {
    const date = new Date(item.completedAt || item.createdAt || Date.now());
    const year = date.getFullYear();
    if (!groups[year]) groups[year] = [];
    groups[year].push(item);
    return groups;
  }, {} as Record<number, BucketItem[]>);

  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  const getYearColor = (year: number) => {
    const colors = [
      'bg-blue-400', 
      'bg-emerald-400', 
      'bg-cyan-400', 
      'bg-purple-400', 
      'bg-rose-400', 
      'bg-amber-400'
    ];
    return colors[year % colors.length];
  };

  const getMonthName = (ts?: number) => {
    if(!ts) return '';
    return new Date(ts).toLocaleString('default', { month: 'long' }).toUpperCase();
  };

  let globalIndex = 0;

  return (
    <div className="relative py-4 px-2 max-w-2xl mx-auto w-full pb-20 animate-in fade-in duration-700">
      <div className="absolute left-1/2 top-0 bottom-10 w-1 bg-gray-200 dark:bg-gray-700 -translate-x-1/2 rounded-full transition-all duration-1000" />

      {items.length === 0 && (
          <div className="relative z-10 flex justify-center mb-10 animate-in zoom-in duration-500">
               <span className="px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs font-medium border border-gray-200 dark:border-gray-700">
                  No completed journeys yet
               </span>
          </div>
      )}

      {years.map((year, yIdx) => (
        <div key={year} className="relative z-10 mb-8">
          <div className={`flex justify-center mb-8 animate-in slide-in-from-top duration-700`} style={{ animationDelay: `${yIdx * 200}ms` }}>
            <span className={`px-6 py-2 rounded-full text-white font-bold text-sm shadow-md transition-all hover:scale-110 ${getYearColor(year)} ring-4 ring-gray-50 dark:ring-gray-900`}>
              {year}
            </span>
          </div>

          <div className="space-y-8">
            {grouped[year].map((item) => {
              const isContentLeft = globalIndex % 2 === 0;
              const delay = (globalIndex % 10) * 100;
              globalIndex++;
              
              const isHighlighted = item.id === highlightedId;

              return (
                <div key={item.id} className={`relative flex items-center justify-between w-full group animate-in slide-in-from-bottom duration-500`} style={{ animationDelay: `${delay}ms` }}>
                  
                  <div className={`w-1/2 pr-6 md:pr-10 flex flex-col items-end text-right`}>
                     {isContentLeft ? (
                         <TimelineContent item={item} onClick={() => onEdit(item)} align="right" isHighlighted={isHighlighted} />
                     ) : (
                         <span className="text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase py-2 transition-opacity group-hover:opacity-100 opacity-60">
                            {getMonthName(item.completedAt)}
                         </span>
                     )}
                  </div>

                  <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-20">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-gray-50 dark:border-gray-900 shadow-md flex items-center justify-center transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 ${isContentLeft ? 'bg-white dark:bg-gray-800 text-gray-500' : 'bg-white dark:bg-gray-800 text-gray-500'}`}>
                       <TimelineCategoryIcon category={item.category} />
                    </div>
                  </div>

                  <div className={`w-1/2 pl-6 md:pl-10 flex flex-col items-start text-left`}>
                    {!isContentLeft ? (
                         <TimelineContent item={item} onClick={() => onEdit(item)} align="left" isHighlighted={isHighlighted} />
                     ) : (
                         <span className="text-xs md:text-sm font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase py-2 transition-opacity group-hover:opacity-100 opacity-60">
                            {getMonthName(item.completedAt)}
                         </span>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      <div className="relative z-10 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col items-center">
            <div className="h-12 w-0.5 border-l-4 border-dotted border-gray-300 dark:border-gray-600 mb-2 animate-pulse"></div>

            <button
                onClick={onViewPending}
                className="group relative flex items-center gap-4 bg-white dark:bg-gray-800 p-2 pr-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-500 transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
            >
                <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 group-hover:border-red-200 transition-colors">
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition-all duration-300 group-hover:rotate-90" />
                </div>
                <div className="text-left">
                    <span className="block text-xl font-black text-gray-400 dark:text-gray-500 group-hover:text-red-600 dark:group-hover:text-red-400 leading-none transition-colors">
                        {pendingCount}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 group-hover:text-red-500/70 tracking-widest transition-colors">
                        Dreams to Go
                    </span>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};

const TimelineContent = ({ item, onClick, align, isHighlighted }: { item: BucketItem, onClick: () => void, align: 'left' | 'right', isHighlighted?: boolean }) => (
    <div 
        id={`card-${item.id}`}
        onClick={onClick}
        className={`cursor-pointer transition-all duration-300 p-3 rounded-2xl bg-white dark:bg-gray-800 border shadow-sm hover:shadow-xl hover:border-red-200 dark:hover:border-red-900/50 hover:-translate-y-1 active:scale-95 ${align === 'right' ? 'items-end' : 'items-start'} ${isHighlighted ? 'border-red-500 ring-4 ring-offset-2 ring-red-500 z-20 scale-105' : 'border-gray-100 dark:border-gray-700'}`}
    >
        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm md:text-base leading-tight line-clamp-2 transition-colors">
            {item.title}
        </h4>
        {item.locationName && (
             <span className={`text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1 font-medium transition-opacity group-hover:opacity-100 opacity-80`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                {item.locationName}
             </span>
        )}
    </div>
);

const TimelineCategoryIcon = ({ category }: { category?: string }) => {
    let colorClass = "text-gray-400";
    switch (category) {
        case 'Adventure': colorClass = "text-orange-500"; break;
        case 'Travel': colorClass = "text-blue-500"; break;
        case 'Food': colorClass = "text-red-500"; break;
        case 'Culture': colorClass = "text-purple-500"; break;
        case 'Nature': colorClass = "text-green-500"; break;
        case 'Luxury': colorClass = "text-yellow-500"; break;
        case 'Personal Growth': colorClass = "text-pink-500"; break;
        case 'Music': colorClass = "text-indigo-500"; break;
        case 'Photography': colorClass = "text-cyan-500"; break;
        case 'Art': colorClass = "text-rose-500"; break;
        case 'Career': colorClass = "text-slate-500"; break;
    }
    
    return <CategoryIcon category={category} className={`w-5 h-5 md:w-6 md:h-6 stroke-[1.5] ${colorClass}`} />;
};
