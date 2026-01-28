import React, { useMemo, useState } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  Trophy, 
  TrendingUp, 
  ChevronRight, 
  Activity, 
  Globe, 
  Flame, 
  Target, 
  ArrowUpRight,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  Zap,
  Star,
  Layers,
  Sun,
  Moon,
  Compass,
  Wind,
  CloudRain,
  Snowflake,
  SunMedium,
  Route,
  BarChart,
  Lightbulb,
  Loader2,
  Plus
} from 'lucide-react';
import { BucketItem, BucketItemDraft, Theme } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';
import { CategoryIcon } from './CategoryIcon';
import { suggestBucketItem } from '../services/geminiService';
import { triggerHaptic } from '../utils/haptics';

interface DashboardProps {
  onBack: () => void;
  items: BucketItem[];
  theme: Theme;
  aiInsight?: { title: string; message: string } | null;
  onNavigateToItem?: (id: string) => void;
  onFilterAction?: (query: string, filterType: 'active' | 'completed') => void;
  currentCity?: string;
  onSuggestItem: (suggestion: BucketItemDraft) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onBack, 
  items, 
  theme, 
  aiInsight, 
  onNavigateToItem, 
  onFilterAction,
  currentCity,
  onSuggestItem
}) => {
  const stats = useMemo(() => {
    const completed = items.filter(i => i.completed).sort((a, b) => {
        const dateA = typeof a.completedAt === 'number' ? a.completedAt : 0;
        const dateB = typeof b.completedAt === 'number' ? b.completedAt : 0;
        return dateB - dateA;
    });
    const pending = items.filter(i => !i.completed);
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const currentYear = new Date().getFullYear();
    
    let totalDist = 0;
    for (let i = 1; i < completed.length; i++) {
        const prevItem = completed[i - 1];
        const currItem = completed[i];
        if (prevItem?.coordinates && currItem?.coordinates) {
            totalDist += calculateDistance(prevItem.coordinates, currItem.coordinates);
        }
    }

    const recentCompletions = completed.filter(i => i.completedAt && i.completedAt > thirtyDaysAgo).length;
    
    const ytdMonthly = Array.from({ length: 12 }).map((_, i) => {
        const d = new Date(currentYear, i, 1);
        const monthLabel = d.toLocaleString('default', { month: 'narrow' });
        const count = completed.filter(item => {
            if (!item.completedAt) return false;
            const itemDate = new Date(item.completedAt);
            return itemDate.getFullYear() === currentYear && itemDate.getMonth() === i;
        }).length;
        return { label: monthLabel, count, isCurrent: i === new Date().getMonth() };
    });

    const totalYtd = ytdMonthly.reduce((sum, m) => sum + m.count, 0);

    const dayProfile = completed.reduce((acc, item) => {
        if (!item.completedAt) return acc;
        const day = new Date(item.completedAt).getDay();
        const isWeekend = day === 0 || day === 6;
        if (isWeekend) acc.weekend++; else acc.weekday++;
        return acc;
    }, { weekday: 0, weekend: 0 });

    const seasonalCounts = completed.reduce((acc, item) => {
        if (!item.completedAt) return acc;
        const month = new Date(item.completedAt).getMonth();
        if (month >= 2 && month <= 4) acc.spring++;
        else if (month >= 5 && month <= 7) acc.summer++;
        else if (month >= 8 && month <= 10) acc.fall++;
        else acc.winter++;
        return acc;
    }, { spring: 0, summer: 0, fall: 0, winter: 0 });

    let totalStops = 0;
    let completedStops = 0;
    items.forEach(item => {
        if (item.itinerary) {
            totalStops += item.itinerary.length;
            completedStops += item.itinerary.filter(s => s.completed).length;
        }
    });

    const completionTimes = completed
        .filter(i => i.completedAt && i.createdAt)
        .map(i => (i.completedAt! - i.createdAt) / (1000 * 60 * 60 * 24));
    const avgDaysToKnock = completionTimes.length > 0 
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : 0;

    const globalRank = totalDist > 10000000 ? 'Legend' : totalDist > 5000000 ? 'Globetrotter' : totalDist > 1000000 ? 'Voyager' : 'Beginner';

    return {
        totalCompleted: completed.length,
        totalItems: items.length,
        totalDist,
        recentCompletions,
        globalRank,
        dayProfile,
        seasonalCounts,
        ytdMonthly,
        totalYtd,
        currentYear,
        totalStops,
        completedStops,
        avgDaysToKnock,
        recentAchievements: completed.slice(0, 4),
        uniqueCities: new Set(items.map(i => i.locationName).filter(Boolean)).size,
    };
  }, [items]);

  const s = useMemo(() => {
    switch(theme) {
        case 'elsa': return { 
          card: 'bg-white/95 border-cyan-100 backdrop-blur-xl rounded-xl', 
          accent: 'text-orange-500', 
          accentBg: 'bg-orange-500',
          headerBg: 'from-cyan-600 to-sky-500',
          progressTrack: 'bg-cyan-50',
          progressFill: 'bg-orange-500',
          chartBar: 'bg-orange-300',
          chartBarActive: 'bg-orange-600',
          badgeBg: 'bg-white/95',
          badgeText: 'text-orange-600',
          badgeLabel: 'text-cyan-600',
          badgeBorder: 'border-orange-200',
          stampShadow: 'shadow-[3px_3px_0px_0px_rgba(249,115,22,0.3)]'
        };
        case 'batman': return { 
          card: 'bg-gray-950 border-gray-800 backdrop-blur-xl rounded-xl', 
          accent: 'text-yellow-500', 
          accentBg: 'bg-yellow-500',
          headerBg: 'from-gray-900 to-black',
          progressTrack: 'bg-gray-800',
          progressFill: 'bg-yellow-500',
          chartBar: 'bg-gray-700',
          chartBarActive: 'bg-yellow-500',
          badgeBg: 'bg-yellow-500',
          badgeText: 'text-black',
          badgeLabel: 'text-gray-400',
          badgeBorder: 'border-yellow-600',
          stampShadow: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]'
        };
        default: return { 
          card: 'bg-white border-slate-200 backdrop-blur-xl rounded-xl', 
          accent: 'text-red-500', 
          accentBg: 'bg-red-500',
          headerBg: 'from-blue-950 to-blue-800',
          progressTrack: 'bg-slate-100',
          progressFill: 'bg-red-500',
          chartBar: 'fill-slate-200',
          chartBarActive: 'fill-red-500',
          badgeBg: 'bg-white',
          badgeText: 'text-red-600',
          badgeLabel: 'text-slate-400',
          badgeBorder: 'border-red-100',
          stampShadow: 'shadow-[3px_3px_0px_0px_rgba(239,68,68,0.2)]'
        };
    }
  }, [theme]);

  const completionRate = stats.totalItems > 0 ? (stats.totalCompleted / stats.totalItems) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-black animate-in fade-in duration-500 overflow-hidden">
        {/* Compact Hero Header */}
        <div className="px-4 pt-4 pb-0 shrink-0 relative">
          <div className={`px-5 py-3 flex items-center justify-between bg-gradient-to-br ${s.headerBg} text-white shadow-xl rounded-xl border border-white/10 relative overflow-hidden group min-h-[75px]`}>
            <div className="absolute top-0 left-0 p-4 opacity-5 pointer-events-none">
                <Zap className="w-16 h-16" />
            </div>
            
            <div className="flex flex-col relative z-10">
                <div className="flex items-center gap-2 mb-0.5">
                    <Activity className="w-2.5 h-2.5 text-red-400 animate-pulse" />
                    <h2 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Life Progress</h2>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black">{Math.round(completionRate)}%</span>
                    <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Achieved</span>
                </div>
            </div>

            <div className="relative z-10 opacity-30">
               <Trophy className="w-8 h-8" />
            </div>
          </div>

          {/* 3D Stamp City Badge */}
          {currentCity && (
            <div className={`absolute -bottom-2 right-8 z-30 transition-all transform rotate-[-3deg] active:scale-95 duration-500 animate-in slide-in-from-right-4`}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border-2 ${s.badgeBg} ${s.badgeBorder} ${s.stampShadow} transition-all cursor-default`}>
                  <MapPin className={`w-2.5 h-2.5 ${s.badgeText}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${s.badgeText} font-mono`}>
                    {currentCity}
                  </span>
                </div>
            </div>
          )}
        </div>

        {/* Bento Grid Content */}
        <div className="p-4 space-y-3 overflow-y-auto no-scrollbar pb-32 mt-1">
            <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 ${s.card} flex flex-col justify-between h-28`}>
                    <div className="flex justify-between items-start">
                        <Flame className="w-5 h-5 text-orange-500" />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Efficiency</span>
                    </div>
                    <div>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.avgDaysToKnock}d</span>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Avg. Dream Age</p>
                    </div>
                </div>

                <div className={`p-4 ${s.card} flex flex-col justify-between h-28`}>
                    <div className="flex justify-between items-start">
                        <Route className="w-5 h-5 text-blue-500" />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Stop Mastery</span>
                    </div>
                    <div>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">
                            {stats.totalStops > 0 ? Math.round((stats.completedStops / stats.totalStops) * 100) : 0}%
                        </span>
                        <p className="text-[9px] font-bold text-gray-500 uppercase">Itinerary Completion</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`p-4 ${s.card}`}>
                    <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-gray-800 pb-2">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Seasonal Balance</h3>
                        <SunMedium className={`w-3 h-3 ${s.accent}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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
                                <div key={key} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            {icon}
                                            <span className="text-[7px] font-black uppercase text-gray-400">{label}</span>
                                        </div>
                                        <span className="text-[8px] font-bold">{count}</span>
                                    </div>
                                    <div className={`h-1 w-full rounded-full ${s.progressTrack}`}>
                                        <div className={`h-full rounded-full ${s.progressFill}`} style={{ width: `${width}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={`p-4 ${s.card}`}>
                    <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-gray-800 pb-2">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400">{stats.currentYear} Progress</h3>
                        <BarChart className={`w-3 h-3 ${s.accent}`} />
                    </div>
                    <div className="flex items-end justify-between h-16 gap-1 px-0.5">
                        {stats.ytdMonthly.map((m, i) => {
                            const max = Math.max(...stats.ytdMonthly.map(v => v.count), 1);
                            const height = (m.count / max) * 100;
                            return (
                                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                                    <div className="w-full h-12 flex items-end relative">
                                        <div 
                                            className={`w-full rounded-t-sm transition-all duration-500 ${m.isCurrent ? s.chartBarActive : s.chartBar}`} 
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        />
                                    </div>
                                    <span className={`text-[6px] font-black ${m.isCurrent ? s.accent : 'text-gray-400'}`}>{m.label}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50 dark:border-gray-800">
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">YTD KNOCKS</span>
                        <span className="text-xs font-black text-gray-900 dark:text-white">{stats.totalYtd}</span>
                    </div>
                </div>
            </div>

            <div className={`p-4 ${s.card} flex items-center justify-between group overflow-hidden relative active:scale-[0.99] transition-transform`}>
                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-gray-50 dark:from-white/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm transition-transform group-hover:rotate-6">
                        <Globe className={`w-5 h-5 ${s.accent}`} />
                    </div>
                    <div>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Explorer Rank</span>
                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-1.5">
                            {stats.globalRank}
                            <ArrowUpRight className="w-2.5 h-2.5 opacity-30" />
                        </span>
                    </div>
                </div>
                <div className="text-right relative z-10">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Global Distance</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white font-mono">{formatDistance(stats.totalDist)}</span>
                </div>
            </div>

            <div className={`p-4 ${s.card}`}>
                <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-gray-800 pb-2">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Momentum Profile</h3>
                    <Clock className="w-3 h-3 text-blue-500" />
                </div>
                <div className="flex items-center gap-8 py-1">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Sun className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Weekdays</span>
                                    <span className="text-xs font-black">{stats.dayProfile.weekday}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${(stats.dayProfile.weekday / (stats.totalCompleted || 1)) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                <Moon className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Weekends</span>
                                    <span className="text-xs font-black">{stats.dayProfile.weekend}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: `${(stats.dayProfile.weekend / (stats.totalCompleted || 1)) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <HistoryIcon className="w-3 h-3 opacity-50" /> Logged Milestones
                    </h3>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {stats.recentAchievements.map((item, idx) => (
                        <button 
                            key={item.id}
                            onClick={() => onNavigateToItem?.(item.id)}
                            className={`w-full flex items-center justify-between p-3 ${s.card} border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-all group animate-in slide-in-from-right duration-500`}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-700 group-hover:scale-105 transition-transform">
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
                </div>
            </div>

            <div className="text-center py-8 opacity-20">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.4em]">Analytics Engine v2.3 • Just Knock It</p>
            </div>
        </div>
    </div>
  );
};

const HistoryIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
);
