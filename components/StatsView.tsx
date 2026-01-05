
import React, { useMemo } from 'react';
import { ArrowLeft, Utensils, Footprints, Heart, Zap, BarChart3, PieChart, Sparkles, Target, Trophy, TrendingUp, ChevronRight, MapPin, Calendar, Clock, Activity, Star, Sun, Moon, Sunrise, Sunset, Rocket } from 'lucide-react';
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
  const currentYear = new Date().getFullYear();

  const stats = useMemo(() => {
    const completed = items.filter(i => i.completed).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    const ytdCompleted = completed.filter(i => i.completedAt && new Date(i.completedAt).getFullYear() === currentYear);
    
    let totalDist = 0;
    for (let i = 1; i < completed.length; i++) {
        if (completed[i].coordinates && completed[i-1].coordinates) {
            totalDist += calculateDistance(completed[i-1].coordinates!, completed[i].coordinates!);
        }
    }

    const now = new Date();
    const monthlyActivity = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('default', { month: 'short' });
        const fullMonthLabel = d.toLocaleString('default', { month: 'long' });
        const count = completed.filter(item => {
            if (!item.completedAt) return false;
            const itemDate = new Date(item.completedAt);
            return itemDate.getMonth() === d.getMonth() && itemDate.getFullYear() === d.getFullYear();
        }).length;
        return { label: monthLabel, fullLabel: fullMonthLabel, count };
    }).reverse();

    const ytdMonthly = Array(12).fill(0);
    ytdCompleted.forEach(item => {
        if (item.completedAt) {
            ytdMonthly[new Date(item.completedAt).getMonth()]++;
        }
    });
    const ytdCumulative = ytdMonthly.reduce((acc, curr, i) => {
        acc.push((acc[i - 1] || 0) + curr);
        return acc;
    }, [] as number[]);

    const timeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    completed.forEach(item => {
        if (item.completedAt) {
            const hour = new Date(item.completedAt).getHours();
            if (hour >= 5 && hour < 12) timeOfDay.morning++;
            else if (hour >= 12 && hour < 17) timeOfDay.afternoon++;
            else if (hour >= 17 && hour < 21) timeOfDay.evening++;
            else timeOfDay.night++;
        }
    });

    const categoryCounts = items.reduce((acc, item) => {
        if (item.completed) {
            const cat = item.category || 'Other';
            acc[cat] = (acc[cat] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const recentAchievements = completed.slice(0, 3);

    const interestMap = new Map<string, number>();
    completed.forEach(item => {
        item.interests?.forEach(tag => {
            interestMap.set(tag, (interestMap.get(tag) || 0) + 1);
        });
    });
    const topInterests = Array.from(interestMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    return {
        totalCompleted: completed.length,
        totalItems: items.length,
        totalDist,
        ytdCompletedCount: ytdCompleted.length,
        ytdCumulative,
        timeOfDay,
        monthlyActivity,
        recentAchievements,
        topInterests,
        categoryCounts: Object.entries(categoryCounts).sort((a, b) => (b[1] as number) - (a[1] as number))
    };
  }, [items, currentYear]);

  const s = useMemo(() => {
    switch(theme) {
        case 'elsa': return { 
          card: 'bg-white/90 border-cyan-100/50 backdrop-blur-sm', 
          accent: 'text-orange-500', 
          accentBg: 'bg-orange-500',
          bar: 'bg-gradient-to-t from-orange-500 to-orange-300', 
          headerBg: 'from-cyan-600 via-sky-500 to-cyan-600',
          donutTrack: 'stroke-cyan-50',
          donutFill: 'stroke-orange-500',
          chartFill: 'rgba(249, 115, 22, 0.1)',
          chartStroke: '#F97316'
        };
        case 'batman': return { 
          card: 'bg-gray-850/90 border-gray-700/50 backdrop-blur-sm', 
          accent: 'text-yellow-500', 
          accentBg: 'bg-yellow-500',
          bar: 'bg-gradient-to-t from-yellow-600 to-yellow-400', 
          headerBg: 'from-gray-900 via-slate-900 to-black',
          donutTrack: 'stroke-gray-900',
          donutFill: 'stroke-yellow-500',
          chartFill: 'rgba(234, 179, 8, 0.1)',
          chartStroke: '#EAB308'
        };
        default: return { 
          card: 'bg-white/90 border-slate-200/50 backdrop-blur-sm', 
          accent: 'text-red-500', 
          accentBg: 'bg-red-500',
          bar: 'bg-gradient-to-t from-red-600 to-red-400', 
          headerBg: 'from-blue-900 via-blue-800 to-blue-900',
          donutTrack: 'stroke-slate-50',
          donutFill: 'stroke-red-500',
          chartFill: 'rgba(239, 68, 68, 0.1)',
          chartStroke: '#EF4444'
        };
    }
  }, [theme]);

  const completionRate = stats.totalItems > 0 ? (stats.totalCompleted / stats.totalItems) * 100 : 0;
  
  const ytdChartData = useMemo(() => {
      const max = Math.max(...stats.ytdCumulative, 1);
      const points = stats.ytdCumulative.map((val, i) => {
          const x = (i / 11) * 100;
          const y = 90 - (val / max) * 80;
          return { x, y, val };
      });
      const pathStr = `M 0,100 L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L 100,100 Z`;
      const lineStr = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
      return { pathStr, lineStr, points };
  }, [stats.ytdCumulative]);

  const handleAction = (query: string) => {
      if (onFilterAction) onFilterAction(query, 'completed');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-gray-950 animate-in fade-in duration-500 overflow-hidden">
        {/* Header Pane */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className={`px-5 py-3 flex items-center justify-between bg-gradient-to-r ${s.headerBg} text-white shadow-2xl rounded-3xl border border-white/10 relative overflow-hidden group`}>
            <Rocket className="absolute -right-4 -top-4 w-20 h-20 opacity-10 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
                <h2 className="text-xs font-black uppercase tracking-widest drop-shadow-md flex items-center gap-2">
                    <Activity className="w-3 h-3 text-red-400" /> Pulse Dashboard
                </h2>
                <span className="text-[9px] font-bold opacity-60">Dreaming progress for {currentYear}</span>
            </div>
            <button 
                onClick={onBack} 
                className="p-2 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-90 border border-white/10"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Scroll Area */}
        <div className="p-4 space-y-4 overflow-y-auto no-scrollbar pb-32">
            
            {/* Actionable Summary Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Completion Donut Tile */}
                <button 
                    onClick={() => handleAction('')}
                    className={`p-6 rounded-[2.5rem] border shadow-xl ${s.card} flex flex-col items-center justify-center group active:scale-95 transition-transform`}
                >
                    <div className="relative w-24 h-24 mb-3">
                        <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="transparent" strokeWidth="10" className={s.donutTrack} />
                            <circle 
                                cx="50" cy="50" r="42" fill="transparent" strokeWidth="10" 
                                className={`${s.donutFill} transition-all duration-1000 ease-out`}
                                strokeDasharray="263.9" strokeDashoffset={263.9 - (completionRate / 100) * 263.9}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-gray-900 dark:text-white leading-none">{Math.round(completionRate)}%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Trophy className="w-3 h-3 text-green-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stats.totalCompleted} Knocked</span>
                    </div>
                </button>

                <div className="space-y-4">
                    {/* Secondary Metrics */}
                    <div className={`p-5 rounded-[2rem] border shadow-lg ${s.card} flex flex-col justify-center h-[calc(50%-8px)] group overflow-hidden relative`}>
                        <MapPin className="absolute -right-2 -bottom-2 w-16 h-16 opacity-[0.03] text-blue-500" />
                        <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">Global Travel</span>
                        <span className="text-lg font-black text-gray-800 dark:text-white">{formatDistance(stats.totalDist)}</span>
                    </div>
                    <button 
                        onClick={() => onBack()}
                        className={`p-5 rounded-[2rem] border shadow-lg ${s.card} flex flex-col justify-center h-[calc(50%-8px)] active:scale-95 transition-transform group relative overflow-hidden text-left`}
                    >
                        <Target className="absolute -right-2 -bottom-2 w-16 h-16 opacity-[0.03] text-red-500" />
                        <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">Bucket Items</span>
                        <div className="flex items-end gap-1.5">
                            <span className="text-lg font-black text-gray-800 dark:text-white">{stats.totalItems}</span>
                            <span className="text-[10px] font-bold text-gray-400 mb-1">Wishlist</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* AI Insight Module */}
            {aiInsight && (
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <Sparkles className="absolute -top-10 -right-10 w-40 h-40 text-white/10 rotate-12 group-hover:scale-110 transition-transform" />
                  <div className="flex items-center gap-2.5 mb-4">
                      <div className="p-1.5 bg-yellow-400/20 rounded-lg">
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">AI Genius Insight</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 leading-tight pr-10">{aiInsight.title}</h3>
                  <p className="text-xs text-indigo-100 leading-relaxed opacity-90">{aiInsight.message}</p>
              </div>
            )}

            {/* Mastery Grid */}
            <div className={`p-7 rounded-[2.5rem] border shadow-xl ${s.card}`}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 rounded-2xl bg-purple-500/10">
                        <PieChart className={`w-5 h-5 ${s.accent}`} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-white">Mastery distribution</h3>
                </div>
                <div className="space-y-5">
                    {stats.categoryCounts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-xs font-bold uppercase tracking-widest opacity-50">Locked Mastery</div>
                    ) : (
                        stats.categoryCounts.map(([cat, count], idx) => {
                            const percent = (count / (stats.totalCompleted || 1)) * 100;
                            return (
                                <button 
                                    key={cat} 
                                    onClick={() => handleAction(cat)}
                                    className="w-full text-left space-y-2.5 group active:scale-[0.98] transition-all"
                                >
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <CategoryIcon category={cat} className="w-3 h-3 text-gray-400 group-hover:scale-110 transition-transform" />
                                            <span className="text-gray-700 dark:text-gray-300">{cat}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={s.accent}>{count}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner border border-gray-100 dark:border-gray-800/50">
                                        <div 
                                            className={`h-full ${s.accentBg} transition-all duration-1000 ease-out shadow-lg`} 
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Interactive Momentum Module */}
            <div className={`p-7 rounded-[2.5rem] border shadow-xl ${s.card}`}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-blue-500/10">
                            <TrendingUp className={`w-5 h-5 ${s.accent}`} />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-white">Momentum</h3>
                    </div>
                </div>
                
                <div className="flex items-end justify-between h-32 gap-3 px-1">
                    {stats.monthlyActivity.map((m, idx) => {
                        const maxCount = Math.max(...stats.monthlyActivity.map(x => x.count), 1);
                        const height = (m.count / maxCount) * 100;
                        return (
                            <button 
                                key={idx} 
                                onClick={() => m.count > 0 && handleAction(m.fullLabel)}
                                className="flex-1 flex flex-col items-center group cursor-pointer active:scale-90 transition-transform"
                            >
                                <div className="relative w-full flex flex-col items-center justify-end h-full">
                                    <div 
                                        className={`w-full max-w-[12px] rounded-full ${s.bar} transition-all duration-700 group-hover:brightness-125 shadow-lg group-hover:shadow-xl`} 
                                        style={{ height: `${Math.max(height, 8)}%` }} 
                                    />
                                    {m.count > 0 && (
                                        <div className="absolute -top-7 text-[10px] font-black text-gray-800 dark:text-white transition-opacity">
                                            {m.count}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-gray-400 mt-4 uppercase">{m.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Activity Cycle (Interactive Time Blocks) */}
            <div className={`p-7 rounded-[2.5rem] border shadow-xl ${s.card}`}>
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 text-center">Dream Cycle</h3>
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { id: 'morning', icon: Sunrise, label: 'Morn', count: stats.timeOfDay.morning },
                        { id: 'afternoon', icon: Sun, label: 'Noon', count: stats.timeOfDay.afternoon },
                        { id: 'evening', icon: Sunset, label: 'Eve', count: stats.timeOfDay.evening },
                        { id: 'night', icon: Moon, label: 'Night', count: stats.timeOfDay.night }
                    ].map(block => (
                        <button 
                            key={block.id}
                            onClick={() => block.count > 0 && handleAction('')} // Search logic for time-of-day can be complex, currently just navs
                            className="flex flex-col items-center justify-center p-3 rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:scale-105 active:scale-95 transition-all group"
                        >
                            <block.icon className="w-5 h-5 text-gray-400 group-hover:text-orange-400 transition-colors mb-2" />
                            <span className="text-xs font-black text-gray-900 dark:text-white leading-none">{block.count}</span>
                            <span className="text-[7px] font-bold text-gray-400 uppercase mt-1">{block.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Interest Tags Tile */}
            <div className={`p-7 rounded-[2.5rem] border shadow-xl ${s.card}`}>
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-yellow-500/10">
                        <Star className="w-5 h-5 text-yellow-500" />
                    </div>
                    Focus Areas
                </h3>
                <div className="flex flex-wrap gap-2.5">
                    {stats.topInterests.map(([tag, count]) => (
                        <button 
                            key={tag} 
                            onClick={() => handleAction(tag)}
                            className="px-5 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center gap-3 shadow-sm hover:scale-105 active:scale-95 transition-all group"
                        >
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-500 transition-colors">#{tag}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white dark:bg-gray-900 shadow-inner ${s.accent}`}>{count}</span>
                        </button>
                    ))}
                    {stats.topInterests.length === 0 && (
                         <div className="w-full text-center py-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest opacity-50">Empty Cloud</div>
                    )}
                </div>
            </div>

            {/* Recent Milestones */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Recent Milestones
                </h3>
                <div className="space-y-3">
                    {stats.recentAchievements.map((item, idx) => (
                        <button 
                            key={item.id}
                            onClick={() => onNavigateToItem?.(item.id)}
                            className={`w-full flex items-center justify-between p-5 rounded-[2.2rem] border shadow-lg ${s.card} hover:scale-[1.02] active:scale-95 transition-all group animate-in slide-in-from-bottom duration-500`}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className={`p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform`}>
                                    <CategoryIcon category={item.category} className={`w-5 h-5 ${s.accent}`} />
                                </div>
                                <div className="text-left overflow-hidden">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight mb-1">{item.title}</h4>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                            {item.completedAt ? new Date(item.completedAt).toLocaleDateString('default', { month: 'short', day: 'numeric' }) : 'Recently'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="text-center py-12 opacity-30">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                    <span className="w-12 h-px bg-gray-300"></span>
                    Just Knock It
                    <span className="w-12 h-px bg-gray-300"></span>
                </p>
            </div>
        </div>
    </div>
  );
};
