
import React, { useMemo } from 'react';
import { Footprints, BarChart3, Sparkles, Trophy, TrendingUp, ChevronRight, MapPin, Calendar, Activity, Globe, History, Flame, Star, Target, PieChart, Timer, ArrowUpRight } from 'lucide-react';
import { BucketItem, Theme } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';
import { CategoryIcon } from './CategoryIcon';

interface StatsViewProps {
  onBack: () => void;
  items: BucketItem[];
  theme: Theme;
  aiInsight?: { title: string; message: string } | null;
  onNavigateToItem?: (id: string) => void;
  onFilterAction?: (query: string, filterType: 'active' | 'completed') => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ 
  onBack, 
  items, 
  theme, 
  aiInsight, 
  onNavigateToItem, 
  onFilterAction 
}) => {
  const stats = useMemo(() => {
    // Ensure sorting returns a clear number result and uses explicit numeric properties
    const completed = items.filter(i => i.completed).sort((a, b) => {
        const dateA = typeof a.completedAt === 'number' ? a.completedAt : 0;
        const dateB = typeof b.completedAt === 'number' ? b.completedAt : 0;
        return dateB - dateA;
    });
    const pending = items.filter(i => !i.completed);
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Distance Calculation
    let totalDist = 0;
    // Fix loop and arithmetic operations to ensure type safety
    for (let i = 1; i < completed.length; i++) {
        const prevItem = completed[i - 1];
        const currItem = completed[i];
        if (prevItem && currItem && prevItem.coordinates && currItem.coordinates) {
            totalDist += calculateDistance(prevItem.coordinates, currItem.coordinates);
        }
    }

    const recentCompletions = completed.filter(i => i.completedAt && i.completedAt > thirtyDaysAgo).length;
    
    // Category Breakdown
    const categoryCounts = completed.reduce((acc, item) => {
        const cat = item.category || 'Other';
        acc[cat] = (Number(acc[cat]) || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 5);

    const topCategory = sortedCategories[0]?.[0] || 'Explorer';
    
    // Yearly Distribution (Last 5 Years)
    const currentYear = new Date().getFullYear();
    const yearlyDistribution = [0, 1, 2, 3, 4].map(offset => {
        const year = currentYear - offset;
        const count = completed.filter(i => i.completedAt && new Date(i.completedAt).getFullYear() === year).length;
        return { year, count };
    }).reverse();

    // Upcoming Target
    const nextTarget = pending
        .filter(i => i.dueDate && i.dueDate > now)
        .sort((a, b) => (Number(a.dueDate) || 0) - (Number(b.dueDate) || 0))[0];

    const globalRank = totalDist > 10000000 ? 'Legend' : totalDist > 5000000 ? 'Globetrotter' : totalDist > 1000000 ? 'Voyager' : 'Beginner';

    return {
        totalCompleted: completed.length,
        totalItems: items.length,
        totalDist,
        topCategory,
        sortedCategories,
        recentCompletions,
        globalRank,
        yearlyDistribution,
        nextTarget,
        recentAchievements: completed.slice(0, 3),
        uniqueCities: new Set(items.map(i => i.locationName).filter(Boolean)).size,
    };
  }, [items]);

  const s = useMemo(() => {
    switch(theme) {
        case 'elsa': return { 
          card: 'bg-white/90 border-cyan-100 backdrop-blur-xl', 
          accent: 'text-orange-500', 
          accentBg: 'bg-orange-500',
          headerBg: 'from-cyan-600 to-sky-500',
          progressTrack: 'bg-cyan-50',
          progressFill: 'bg-orange-500',
          chartBar: 'fill-orange-400',
          chartBarActive: 'fill-orange-600'
        };
        case 'batman': return { 
          card: 'bg-gray-950 border-gray-800 backdrop-blur-xl', 
          accent: 'text-yellow-500', 
          accentBg: 'bg-yellow-500',
          headerBg: 'from-gray-900 to-black',
          progressTrack: 'bg-gray-800',
          progressFill: 'bg-yellow-500',
          chartBar: 'fill-gray-700',
          chartBarActive: 'fill-yellow-500'
        };
        default: return { 
          card: 'bg-white border-slate-200 backdrop-blur-xl', 
          accent: 'text-red-500', 
          accentBg: 'bg-red-500',
          headerBg: 'from-blue-950 to-blue-800',
          progressTrack: 'bg-slate-100',
          progressFill: 'bg-red-500',
          chartBar: 'fill-slate-200',
          chartBarActive: 'fill-red-500'
        };
    }
  }, [theme]);

  const completionRate = stats.totalItems > 0 ? (stats.totalCompleted / stats.totalItems) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-black animate-in fade-in duration-500 overflow-hidden">
        {/* Compact Hero Header */}
        <div className="px-4 pt-6 pb-2 shrink-0">
          <div className={`px-5 py-5 flex items-center justify-between bg-gradient-to-br ${s.headerBg} text-white shadow-2xl rounded-[2rem] border border-white/10 relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <BarChart3 className="w-32 h-32" />
            </div>
            <div className="flex flex-col relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-3 h-3 text-red-400 animate-pulse" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80">Life Progress Radar</h2>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{Math.round(completionRate)}%</span>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Complete</span>
                </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center relative z-10 shadow-inner">
                <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
            </div>
          </div>
        </div>

        {/* Bento Grid Content */}
        <div className="p-4 space-y-4 overflow-y-auto no-scrollbar pb-32">
            
            {/* Top Row: Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-[1.8rem] border shadow-sm ${s.card} flex flex-col justify-between h-32`}>
                    <div className="flex justify-between items-start">
                        <Flame className="w-5 h-5 text-orange-500" />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">30d Velocity</span>
                    </div>
                    <div>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.recentCompletions}</span>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Knocks this month</p>
                    </div>
                </div>

                <div className={`p-4 rounded-[1.8rem] border shadow-sm ${s.card} flex flex-col justify-between h-32`}>
                    <div className="flex justify-between items-start">
                        <Target className="w-5 h-5 text-blue-500" />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Next Target</span>
                    </div>
                    <div className="overflow-hidden">
                        {stats.nextTarget ? (
                            <>
                                <span className="text-[10px] font-black text-gray-900 dark:text-white truncate block">{stats.nextTarget.title}</span>
                                <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-blue-500">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(stats.nextTarget.dueDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            </>
                        ) : (
                            <p className="text-[10px] font-bold text-gray-400 italic">No dates set</p>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Insight (Elevated) */}
            {aiInsight && (
              <div className="bg-gradient-to-br from-indigo-600 to-blue-800 p-5 rounded-[2rem] text-white shadow-xl relative overflow-hidden group active:scale-[0.98] transition-transform">
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full" />
                  <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Intelligence Pulse</span>
                  </div>
                  <h3 className="font-bold text-sm mb-1 leading-tight">{aiInsight.title}</h3>
                  <p className="text-[10px] text-white/70 leading-relaxed italic line-clamp-2">"{aiInsight.message}"</p>
              </div>
            )}

            {/* Middle Row: Visual Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Yearly Growth Chart */}
                <div className={`p-5 rounded-[2rem] border shadow-sm ${s.card}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Yearly Output</h3>
                        <TrendingUp className={`w-3.5 h-3.5 ${s.accent}`} />
                    </div>
                    <div className="flex items-end justify-between h-20 px-2">
                        {stats.yearlyDistribution.map((d, i) => {
                            const max = Math.max(...stats.yearlyDistribution.map(v => v.count), 1);
                            const height = (d.count / max) * 100;
                            return (
                                <div key={d.year} className="flex flex-col items-center gap-2 flex-1 group">
                                    <div className="w-full px-1.5 relative h-16 flex items-end">
                                        <div 
                                            className={`w-full rounded-t-lg transition-all duration-700 ${i === stats.yearlyDistribution.length - 1 ? s.accentBg : 'bg-gray-200 dark:bg-gray-800'} group-hover:opacity-80`} 
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        />
                                    </div>
                                    <span className="text-[8px] font-black text-gray-400">{d.year.toString().slice(-2)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Category Breakdown Bars */}
                <div className={`p-5 rounded-[2rem] border shadow-sm ${s.card}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category Mix</h3>
                        <PieChart className={`w-3.5 h-3.5 ${s.accent}`} />
                    </div>
                    <div className="space-y-3">
                        {stats.sortedCategories.map(([cat, count]) => {
                            const maxVal = Number(stats.sortedCategories[0][1]);
                            const width = (Number(count) / maxVal) * 100;
                            return (
                                <div key={cat} className="space-y-1">
                                    <div className="flex justify-between items-center text-[9px] font-bold">
                                        <span className="text-gray-600 dark:text-gray-300 truncate w-24">{cat}</span>
                                        <span className="text-gray-400">{count}</span>
                                    </div>
                                    <div className={`h-1.5 w-full rounded-full ${s.progressTrack}`}>
                                        <div className={`h-full rounded-full ${s.progressFill} transition-all duration-1000`} style={{ width: `${width}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Travel Rank Row */}
            <div className={`p-5 rounded-[2rem] border shadow-sm ${s.card} flex items-center justify-between group overflow-hidden relative`}>
                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-gray-50 dark:from-white/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm transition-transform group-hover:rotate-12">
                        <Globe className={`w-6 h-6 ${s.accent}`} />
                    </div>
                    <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Explorer Rank</span>
                        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                            {stats.globalRank}
                            <ArrowUpRight className="w-3 h-3 opacity-30" />
                        </span>
                    </div>
                </div>
                <div className="text-right relative z-10">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Global Distance</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white font-mono">{formatDistance(stats.totalDist)}</span>
                </div>
            </div>

            {/* Recent History Table */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <HistoryIcon className="w-3.5 h-3.5 opacity-50" /> Logged Milestones
                    </h3>
                    <button className="text-[9px] font-bold text-blue-500 uppercase tracking-wider hover:opacity-70">View All</button>
                </div>
                <div className="space-y-2">
                    {stats.recentAchievements.map((item, idx) => (
                        <button 
                            key={item.id}
                            onClick={() => onNavigateToItem?.(item.id)}
                            className={`w-full flex items-center justify-between p-3.5 rounded-2xl border shadow-sm ${s.card} active:scale-[0.97] transition-all group animate-in slide-in-from-right duration-500`}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform">
                                    <CategoryIcon category={item.category} className={`w-5 h-5 ${s.accent}`} />
                                </div>
                                <div className="text-left overflow-hidden">
                                    <h4 className="text-[12px] font-bold text-gray-900 dark:text-white truncate leading-tight group-hover:text-red-500 transition-colors">{item.title}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                                            {item.completedAt ? new Date(item.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending'}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span className="text-[8px] font-bold text-gray-500 truncate">{item.locationName || 'Unspecified'}</span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-all" />
                        </button>
                    ))}
                    {stats.recentAchievements.length === 0 && (
                         <div className="text-center py-10 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                             <p className="text-[10px] font-bold text-gray-300 uppercase italic tracking-widest">No entries recorded yet</p>
                         </div>
                    )}
                </div>
            </div>

            <div className="text-center py-12 opacity-10">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.5em]">Analyze • Optimize • Achieve</p>
                <p className="text-[6px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">Just Knock It Metrics Engine v2.0</p>
            </div>
        </div>
    </div>
  );
};

const HistoryIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
);
