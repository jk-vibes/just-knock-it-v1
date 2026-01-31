import React, { useMemo } from 'react';
import { 
  Trophy, 
  Activity, 
  Flame, 
  MapPin, 
  Zap, 
  SunMedium, 
  Route, 
  Timer,
  Compass,
  PieChart,
  CalendarDays,
  ChevronRight,
  TrendingUp,
  Wind,
  CloudRain,
  Snowflake
} from 'lucide-react';
import { BucketItem, BucketItemDraft, Theme, AppSettings } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';
import { CategoryIcon } from './CategoryIcon';

interface DashboardProps {
  onBack: () => void;
  items: BucketItem[];
  theme: Theme;
  aiInsight?: { title: string; message: string } | null;
  onNavigateToItem?: (id: string) => void;
  onFilterAction?: (params: { year?: number, month?: number, season?: string, category?: string }) => void;
  currentCity?: string;
  onSuggestItem: (suggestion: BucketItemDraft) => void;
  settings: AppSettings;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  items, 
  theme, 
  onNavigateToItem, 
  onFilterAction,
  currentCity,
  settings
}) => {
  const stats = useMemo(() => {
    const completed = items.filter(i => i.completed).sort((a, b) => (Number(b.completedAt) || 0) - (Number(a.completedAt) || 0));
    
    // Distance Calculation (Raw Meters)
    let totalDistMeters = 0;
    for (let i = 1; i < completed.length; i++) {
        if (completed[i-1].coordinates && completed[i].coordinates) {
            totalDistMeters += calculateDistance(completed[i-1].coordinates!, completed[i].coordinates!);
        }
    }

    // Monthly performance
    const monthlyCounts = Array(12).fill(0);
    completed.forEach(item => {
        if (item.completedAt) {
            monthlyCounts[new Date(item.completedAt).getMonth()]++;
        }
    });
    const peakMonthIndex = monthlyCounts.indexOf(Math.max(...monthlyCounts));
    const peakMonth = new Date(2000, peakMonthIndex).toLocaleString('default', { month: 'long' });

    // Category distribution
    const categoryCounts = completed.reduce((acc, item) => {
        const cat = item.category || 'Other';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryCounts)
        // Fix: Use Number() to ensure numeric subtraction for sort on line 73
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 4);

    const seasonalCounts = completed.reduce((acc, item) => {
        if (!item.completedAt) return acc;
        const month = new Date(item.completedAt).getMonth();
        if (month >= 2 && month <= 4) acc.spring++;
        else if (month >= 5 && month <= 7) acc.summer++;
        else if (month >= 8 && month <= 10) acc.fall++;
        else acc.winter++;
        return acc;
    }, { spring: 0, summer: 0, fall: 0, winter: 0 });

    const completionTimes = completed
        .filter(i => i.completedAt !== undefined && i.createdAt !== undefined)
        /* Fix: Use explicit type casting to ensure number type for subtraction */
        .map(i => ((i.completedAt as number) - (i.createdAt as number)) / (1000 * 60 * 60 * 24));
    const avgDaysToKnock = completionTimes.length > 0 
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : 0;

    return {
        totalCompleted: completed.length,
        totalItems: items.length,
        totalDistMeters,
        peakMonth,
        topCategories,
        seasonalCounts,
        avgDaysToKnock,
        recentAchievements: completed.slice(0, 4),
        uniqueCities: new Set(items.map(i => i.locationName).filter(Boolean)).size,
    };
  }, [items]);

  const s = useMemo(() => {
    switch(theme) {
        case 'elsa': return { 
          card: 'bg-white/95 border-cyan-100 rounded-xl', 
          accent: 'text-orange-500', 
          accentHex: '#F97316',
          headerBg: 'from-cyan-600 to-sky-500',
          progressTrack: 'bg-cyan-50',
          progressFill: 'bg-orange-500',
          badgeBg: 'bg-white/95',
          badgeText: 'text-orange-600',
          badgeBorder: 'border-orange-200',
          stampShadow: 'shadow-[3px_3px_0px_0px_rgba(249,115,22,0.3)]',
        };
        case 'batman': return { 
          card: 'bg-gray-950 border-gray-800 rounded-xl', 
          accent: 'text-yellow-500', 
          accentHex: '#EAB308',
          headerBg: 'from-gray-900 to-black',
          progressTrack: 'bg-gray-800',
          progressFill: 'bg-yellow-500',
          badgeBg: 'bg-yellow-500',
          badgeText: 'text-black',
          badgeBorder: 'border-yellow-600',
          stampShadow: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]',
        };
        default: return { 
          card: 'bg-white border-slate-200 rounded-xl', 
          accent: 'text-red-500', 
          accentHex: '#EF4444',
          headerBg: 'from-blue-950 to-blue-800',
          progressTrack: 'bg-slate-100',
          progressFill: 'bg-red-500',
          badgeBg: 'bg-white',
          badgeText: 'text-red-600',
          badgeBorder: 'border-red-100',
          stampShadow: 'shadow-[3px_3px_0px_0px_rgba(239,68,68,0.2)]',
        };
    }
  }, [theme]);

  const completionRate = stats.totalItems > 0 ? (stats.totalCompleted / stats.totalItems) * 100 : 0;

  // Doughnut Chart Logic - Circumference of 100 units (R=15.9)
  const doughnutData = useMemo(() => {
    const total = stats.topCategories.reduce((acc, [_, count]) => acc + count, 0);
    let cumulative = 0;
    return stats.topCategories.map(([cat, count], i) => {
        const percent = total > 0 ? (count / total) * 100 : 0;
        const currentCumulative = cumulative;
        cumulative += percent;
        const opacities = [1, 0.7, 0.4, 0.2];
        return { 
            cat, 
            count, 
            percent, 
            offset: 100 - currentCumulative, // Standard clockwise SVG dashoffset
            color: s.accentHex,
            opacity: opacities[i % opacities.length]
        };
    });
  }, [stats.topCategories, s.accentHex]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-black animate-in fade-in duration-500 overflow-hidden">
        {/* Dynamic Header */}
        <div className="px-4 pt-4 pb-0 shrink-0 relative">
          <div className={`px-5 py-4 flex items-center justify-between bg-gradient-to-br ${s.headerBg} text-white shadow-xl rounded-xl border border-white/10 relative overflow-hidden group`}>
            <div className="absolute top-0 left-0 p-4 opacity-5 pointer-events-none">
                <Zap className="w-16 h-16" />
            </div>
            
            <div className="flex flex-col relative z-10">
                <div className="flex items-center gap-2 mb-0.5">
                    <Activity className="w-3 h-3 text-red-400 animate-pulse" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest opacity-80">Life Progress</h2>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black">{Math.round(completionRate)}%</span>
                    <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest whitespace-nowrap">dreams knocked</span>
                </div>
            </div>

            <div className="relative z-10 opacity-30">
               <Trophy className="w-10 h-10" />
            </div>
          </div>

          {currentCity && (
            <div className="absolute -bottom-2 right-8 z-30 transition-all transform rotate-[-3deg]">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border-2 ${s.badgeBg} ${s.badgeBorder} ${s.stampShadow}`}>
                  <MapPin className={`w-3 h-3 ${s.badgeText}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${s.badgeText} font-mono`}>
                    {currentCity}
                  </span>
                </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3 overflow-y-auto no-scrollbar pb-32 mt-2">
            
            <div className="grid grid-cols-3 gap-2">
                <div className={`p-3 ${s.card} flex flex-col justify-between h-24`}>
                    <Flame className="w-4 h-4 text-orange-500" />
                    <div>
                        <span className="text-lg font-black text-gray-900 dark:text-white leading-none">{stats.avgDaysToKnock}d</span>
                        <p className="text-[7px] font-black text-gray-500 uppercase leading-tight mt-0.5">Avg. Cycle</p>
                    </div>
                </div>

                <div className={`p-3 ${s.card} flex flex-col justify-between h-24`}>
                    <Route className="w-4 h-4 text-blue-500" />
                    <div>
                        <span className="text-lg font-black text-gray-900 dark:text-white leading-none">
                            {stats.uniqueCities}
                        </span>
                        <p className="text-[7px] font-black text-gray-500 uppercase leading-tight mt-0.5">Cities Tagged</p>
                    </div>
                </div>

                <div className={`p-3 ${s.card} flex flex-col justify-between h-24`}>
                    <Timer className="w-4 h-4 text-purple-500" />
                    <div>
                        <span className="text-lg font-black text-gray-900 dark:text-white leading-none">{stats.totalCompleted}</span>
                        <p className="text-[7px] font-black text-gray-500 uppercase leading-tight mt-0.5">Achievements</p>
                    </div>
                </div>
            </div>

            {/* Travel Distance Card - Dynamic Units */}
            <div className={`p-5 ${s.card} flex items-center justify-between group overflow-hidden relative`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-gray-50 dark:to-white/5 pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm">
                        <Compass className={`w-6 h-6 ${s.accent}`} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total Distance</h3>
                        <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                            {formatDistance(stats.totalDistMeters, settings.distanceUnit)}
                        </span>
                    </div>
                </div>
                <div className="relative z-10 text-right">
                    <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest mb-1">Peak Month</p>
                    <span className="text-[10px] font-bold text-gray-900 dark:text-white uppercase px-2 py-1 bg-slate-100 dark:bg-gray-800 rounded-lg">{stats.peakMonth}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`p-4 ${s.card}`}>
                    <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-gray-800 pb-2">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Seasonal Balance</h3>
                        <SunMedium className={`w-3 h-3 ${s.accent}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                        {[
                            { label: 'Spring', key: 'spring', icon: <Wind className="w-3 h-3 text-emerald-400" /> },
                            { label: 'Summer', key: 'summer', icon: <SunMedium className="w-3 h-3 text-orange-400" /> },
                            { label: 'Fall', key: 'fall', icon: <CloudRain className="w-3 h-3 text-amber-500" /> },
                            { label: 'Winter', key: 'winter', icon: <Snowflake className="w-3 h-3 text-blue-400" /> }
                        ].map(({ label, key, icon }) => {
                            const count = (stats.seasonalCounts as any)[key];
                            const maxVal = Math.max(...(Object.values(stats.seasonalCounts) as number[]), 1);
                            const width = (count / maxVal) * 100;
                            return (
                                <button key={key} onClick={() => onFilterAction?.({ season: label })} className="space-y-1 text-left group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            {icon}
                                            <span className="text-[8px] font-black uppercase text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">{label}</span>
                                        </div>
                                        <span className="text-[8px] font-bold">{count}</span>
                                    </div>
                                    <div className={`h-1 w-full rounded-full ${s.progressTrack}`}>
                                        <div className={`h-full rounded-full ${s.progressFill} transition-all duration-700`} style={{ width: `${width}%` }} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={`p-4 ${s.card}`}>
                    <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-gray-800 pb-2">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Top Categories</h3>
                        <PieChart className={`w-3 h-3 ${s.accent}`} />
                    </div>
                    <div className="flex flex-row items-center gap-6">
                        {/* Interactive Doughnut Chart SVG */}
                        <div className="relative w-24 h-24 shrink-0">
                            <svg viewBox="0 0 33.8 33.8" className="w-full h-full transform -rotate-90 overflow-visible">
                                {doughnutData.map((d, i) => (
                                    <circle
                                        key={d.cat}
                                        cx="16.9"
                                        cy="16.9"
                                        r="15.9"
                                        fill="transparent"
                                        stroke={d.color}
                                        strokeWidth="2.5"
                                        strokeDasharray={`${d.percent} 100`}
                                        strokeDashoffset={d.offset}
                                        opacity={d.opacity}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                ))}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-black text-gray-900 dark:text-white leading-none">MIX</span>
                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">Top 4</span>
                            </div>
                        </div>

                        {/* Legend with Filtering functionality */}
                        <div className="flex-1 space-y-2">
                            {doughnutData.map((d) => (
                                <button 
                                    key={d.cat} 
                                    onClick={() => onFilterAction?.({ category: d.cat })}
                                    className="flex items-center justify-between w-full group/item"
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div 
                                            className="w-2 h-2 rounded-full shrink-0 group-hover/item:scale-125 transition-transform" 
                                            style={{ backgroundColor: d.color, opacity: d.opacity }} 
                                        />
                                        <span className="text-[8px] font-bold text-gray-500 uppercase truncate group-hover/item:text-gray-900 dark:group-hover/item:text-white">{d.cat}</span>
                                    </div>
                                    <span className="text-[8px] font-black text-gray-900 dark:text-white ml-2">{d.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2.5 pt-1">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 px-1">
                    <TrendingUp className="w-3 h-3 opacity-50" /> Logged Milestones
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    {stats.recentAchievements.map((item, idx) => (
                        <button 
                            key={item.id}
                            onClick={() => onNavigateToItem?.(item.id)}
                            className={`w-full flex items-center justify-between p-3 ${s.card} border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-all group animate-in slide-in-from-right duration-500`}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-700">
                                    <CategoryIcon category={item.category} className={`w-4 h-4 ${s.accent}`} />
                                </div>
                                <div className="text-left overflow-hidden">
                                    <h4 className="text-[11px] font-bold text-gray-900 dark:text-white truncate leading-tight">{item.title}</h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                                            {item.completedAt ? new Date(item.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Knocked'}
                                        </span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                        <span className="text-[8px] font-bold text-gray-500 truncate">{item.locationName || 'Anywhere'}</span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-all" />
                        </button>
                    ))}
                    {stats.recentAchievements.length === 0 && (
                        <div className="py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-900 rounded-xl">
                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">No milestones yet</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="text-center py-8 opacity-10">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.4em]">Analytics Pulse • Just Knock It</p>
            </div>
        </div>
    </div>
  );
};
