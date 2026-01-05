
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Map as MapIcon, Settings, Bell, Radar, LayoutList, Trophy, Circle, LogOut, Users, ArrowUpDown, Filter, ChevronDown, Menu, Share2, User as UserIcon, SlidersHorizontal, AlignLeft, List, Search, X, ListChecks, BarChart3, Sparkles } from 'lucide-react';
import { BucketItem, Coordinates, Theme, User, AppNotification, BucketItemDraft, ActiveTab, TravelMode, AppSettings } from './types';
import { LoginScreen } from './components/LoginScreen';
import { BucketListCard } from './components/BucketListCard';
import { AddItemModal } from './components/AddItemModal';
import { SettingsModal } from './components/SettingsModal';
import { CompactSettings } from './components/CompactSettings';
import { MapView } from './components/MapView';
import { TimelineView } from './components/TimelineView';
import { NotificationsModal } from './components/NotificationsModal';
import { TripPlanner } from './components/ItineraryRouteModal';
import { ImageGalleryModal } from './components/ImageGalleryModal';
import { OnboardingTour } from './components/OnboardingTour';
import { ChangelogModal } from './components/ChangelogModal';
import { CompleteDateModal } from './components/CompleteDateModal';
import { StatsView } from './components/StatsView';
import { MOCK_BUCKET_ITEMS } from './utils/mockData';
import { calculateDistance, requestNotificationPermission, sendNotification, speak } from './utils/geo';
import { triggerHaptic } from './utils/haptics';
import { driveService } from './services/driveService';
import { generateStatsInsight } from './services/geminiService';

const APP_VERSION = 'v1.8';

// --- THEME-AWARE LIQUID BUCKET LOGO ---
const LiquidBucket = ({ theme, isFab = false, percent = 50 }: { theme: Theme | 'brand-red', isFab?: boolean, percent?: number }) => {
    const themes = {
        marvel: { liquid: "#EF4444", bg: isFab ? "#FFFFFF" : "transparent", stroke: "#1e3a8a", text: "#1e3a8a" },
        batman: { liquid: "#EAB308", bg: "#111827", stroke: "#374151", text: "#FFFFFF" },
        elsa: { liquid: "#F97316", bg: isFab ? "#F0F9FF" : "transparent", stroke: "#0891B2", text: "#0E7490" },
        'brand-red': { liquid: "#EF4444", bg: isFab ? "#FFFFFF" : "transparent", stroke: "#EF4444", text: "#EF4444" }
    };
    
    const activeKey = (themes[theme as keyof typeof themes] ? theme : 'marvel') as keyof typeof themes;
    const style = themes[activeKey];
    const fillP = Math.min(100, Math.max(0, percent));
    const liquidHeight = (fillP / 100) * 320; 
    const liquidTopY = 480 - liquidHeight;
    const uniqueId = `mask-${isFab ? 'fab' : 'head'}-${activeKey}-${Math.random().toString(36).substr(2, 5)}`;
    
    // User requested white color for JK letters
    const textFill = "#FFFFFF";

    return (
        <svg viewBox="0 0 512 512" className={`w-full h-full transition-all duration-700 ease-in-out ${isFab ? 'drop-shadow-lg' : ''}`} xmlns="http://www.w3.org/2000/svg">
            <defs>
                <clipPath id={uniqueId}><path d="M56 160 L96 480 L416 480 L456 160 Z" /></clipPath>
            </defs>
            <path d="M56 160c0-100 400-100 400 0" fill="none" stroke={style.stroke} strokeWidth="30" strokeLinecap="round" />
            <path d="M56 160 L96 480 L416 480 L456 160 Z" fill={isFab ? style.bg : 'none'} opacity={isFab ? 0.95 : 0} />
            <g clipPath={`url(#${uniqueId})`}>
                 <path d={`M 0 ${liquidTopY} Q 128 ${liquidTopY - 20} 256 ${liquidTopY} T 512 ${liquidTopY} T 768 ${liquidTopY} T 1024 ${liquidTopY} V 500 H 0 Z`} fill={style.liquid} className="animate-wave transition-all duration-700 ease-out" />
            </g>
            <path d="M56 160 L96 480 L416 480 L456 160 Z" fill="none" stroke={style.stroke} strokeWidth="30" strokeLinejoin="round" />
            {!isFab && (
                <text 
                    x="256" 
                    y="460" 
                    fontFamily="Arial Black, Arial, sans-serif" 
                    fontWeight="900" 
                    fontSize="100" 
                    fill={textFill} 
                    textAnchor="middle"
                    className="transition-colors duration-500 select-none"
                    style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.4))' }}
                >
                    JK
                </text>
            )}
        </svg>
    );
};

const DEFAULT_CATEGORIES = ['Adventure', 'Travel', 'Food', 'Culture', 'Nature', 'Luxury', 'Personal Growth'];
const DEFAULT_INTERESTS = ['History', 'Art', 'Architecture', 'Hiking', 'Music', 'Photography', 'Shopping', 'Relaxation'];

const getInitials = (name: string) => name.substring(0, 1).toUpperCase();
const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600', 'bg-orange-600'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<BucketItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [interests, setInterests] = useState<string[]>(DEFAULT_INTERESTS);
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('stats');
  const [listFilter, setListFilter] = useState<'active' | 'completed'>('active'); 
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'distance'>('date');
  const [isCompact, setIsCompact] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'marvel',
    proximityRange: 2000,
    travelMode: 'driving',
    notificationsEnabled: true,
    voiceAlertsEnabled: true,
    autoBackupEnabled: true
  });

  const [isRadarEnabled, setIsRadarEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [galleryItem, setGalleryItem] = useState<BucketItem | null>(null);
  const [plannerItem, setPlannerItem] = useState<BucketItem | null>(null);
  const [editingItem, setEditingItem] = useState<BucketItem | null>(null);
  const [completingItemId, setCompletingItemId] = useState<string | null>(null);
  const [latestAiInsight, setLatestAiInsight] = useState<{ title: string; message: string } | null>(null);

  const notifiedItemsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const storedUser = localStorage.getItem('jk_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    const storedItems = localStorage.getItem('jk_items');
    setItems(storedItems ? JSON.parse(storedItems) : MOCK_BUCKET_ITEMS);
    const storedFamily = localStorage.getItem('jk_family');
    if (storedFamily) setFamilyMembers(JSON.parse(storedFamily));
    const storedCategories = localStorage.getItem('jk_categories');
    if (storedCategories) setCategories(JSON.parse(storedCategories));
    const storedInterests = localStorage.getItem('jk_interests');
    if (storedInterests) setInterests(JSON.parse(storedInterests));
    
    const storedSettings = localStorage.getItem('jk_settings');
    if (storedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(storedSettings) }));
    }

    const storedNotifs = localStorage.getItem('jk_notifications');
    if (storedNotifs) {
        try {
            const parsed = JSON.parse(storedNotifs);
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            setNotifications(parsed.filter((n: AppNotification) => n.timestamp > oneDayAgo));
        } catch (e) {}
    }
    
    requestNotificationPermission();
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
          (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => console.warn("GPS Denied", err),
          { enableHighAccuracy: true }
        );
    }
  }, []);

  useEffect(() => {
      localStorage.setItem('jk_items', JSON.stringify(items));
      localStorage.setItem('jk_family', JSON.stringify(familyMembers));
      localStorage.setItem('jk_categories', JSON.stringify(categories));
      localStorage.setItem('jk_interests', JSON.stringify(interests));
      localStorage.setItem('jk_settings', JSON.stringify(settings));
      
      document.body.setAttribute('data-theme', settings.theme);
      if (settings.theme === 'batman') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  }, [items, familyMembers, categories, interests, settings]);

  useEffect(() => { localStorage.setItem('jk_notifications', JSON.stringify(notifications)); }, [notifications]);

  useEffect(() => {
    if (!user) return;
    const fetchInsight = async () => {
        const completed = items.filter(i => i.completed);
        const insight = await generateStatsInsight(completed);
        setLatestAiInsight(insight);
        const newNotif: AppNotification = { id: crypto.randomUUID(), title: insight.title, message: insight.message, timestamp: Date.now(), read: false, type: 'insight' };
        setNotifications(prev => [newNotif, ...prev]);
        if (settings.notificationsEnabled) {
            sendNotification(`AI Milestone: ${insight.title}`, insight.message, 'jk-insight');
        }
        triggerHaptic('success');
    };
    const initialTimer = setTimeout(fetchInsight, 5000);
    const interval = setInterval(fetchInsight, 15 * 60 * 1000); 
    return () => { clearTimeout(initialTimer); clearInterval(interval); };
  }, [user, items.length, settings.notificationsEnabled]);

  useEffect(() => {
      if (!isRadarEnabled || !userLocation) return;
      const checkProximity = () => {
         const historyStr = localStorage.getItem('jk_notify_history');
         const history = historyStr ? JSON.parse(historyStr) : {};
         const now = Date.now();
         const COOLDOWN = 24 * 60 * 60 * 1000; 
         items.forEach(item => {
            if (item.completed || !item.coordinates) return;
            const distance = calculateDistance(userLocation, item.coordinates);
            const lastNotified = history[item.id] || 0;
            if (distance <= settings.proximityRange && now - lastNotified > COOLDOWN) {
                if (settings.voiceAlertsEnabled) {
                    speak(`Guess what? You are near ${item.title}`);
                }
                if (settings.notificationsEnabled) {
                    sendNotification(`Near ${item.title}! 📍`, `You're ${(distance/1000).toFixed(1)}km away!`, item.id);
                }
                triggerHaptic('heavy');
                setNotifications(prev => [{ id: crypto.randomUUID(), title: `Near ${item.title}`, message: `You are ${(distance/1000).toFixed(1)}km away. Go knock it!`, timestamp: now, read: false, type: 'location', relatedItemId: item.id }, ...prev]);
                history[item.id] = now;
                notifiedItemsRef.current.add(item.id);
            }
         });
         localStorage.setItem('jk_notify_history', JSON.stringify(history));
      };
      checkProximity();
      const interval = setInterval(checkProximity, 10000);
      return () => clearInterval(interval);
  }, [userLocation, items, isRadarEnabled, settings.proximityRange, settings.voiceAlertsEnabled, settings.notificationsEnabled]);

  const themeStyles = useMemo(() => {
      switch (settings.theme) {
          case 'marvel': return { headerWrapper: 'bg-white', topRowBg: 'bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900', topRowText: 'text-white', topRowBorder: 'border-b-2 border-red-600', progressRowBg: 'bg-white', toolbarBg: 'bg-white', toolbarBorder: 'border-slate-200', toolbarText: 'text-slate-600', toolbarHover: 'hover:bg-slate-100', toolbarActive: 'bg-slate-100', progressActive: 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]', progressInactive: 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white', tabGroupBg: 'bg-slate-100 border-slate-200', tabActive: 'bg-white text-blue-700 shadow-sm border border-slate-100', tabInactive: 'text-slate-400 hover:text-slate-600', iconPrimary: 'text-white', iconSecondary: 'text-white', headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm hover:scale-110 active:scale-90', headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white transition-all box-border shadow-sm hover:scale-110 active:scale-90', fabIcon: 'text-red-500', fabBorder: 'border-blue-900' };
          case 'elsa': return { headerWrapper: 'bg-cyan-50', topRowBg: 'bg-gradient-to-r from-sky-50 via-white to-cyan-50', topRowText: 'text-cyan-900', topRowBorder: 'border-b-2 border-orange-400', progressRowBg: 'bg-[#f0f9ff]', toolbarBg: 'bg-[#f0f9ff]', toolbarBorder: 'border-cyan-200', toolbarText: 'text-cyan-900', toolbarHover: 'hover:bg-cyan-100', toolbarActive: 'bg-cyan-100', progressActive: 'bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 text-white shadow-[0_0_15px_rgba(249,115,22,0.6)]', progressInactive: 'bg-gradient-to-r from-cyan-200 via-cyan-100 to-cyan-50 text-cyan-800 hover:from-cyan-200 hover:to-cyan-100', tabGroupBg: 'bg-cyan-50 border-cyan-100', tabActive: 'bg-white text-orange-600 shadow-sm border border-cyan-100', tabInactive: 'text-cyan-400 hover:text-cyan-600', iconPrimary: 'text-orange-500', iconSecondary: 'text-cyan-500', headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-orange-300 bg-white/40 text-cyan-800 hover:bg-white/60 transition-all backdrop-blur-sm hover:scale-110 active:scale-90', headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-orange-300 hover:border-orange-500 transition-all box-border shadow-sm hover:scale-110 active:scale-90', fabIcon: 'text-orange-500', fabBorder: 'border-cyan-600' };
          case 'batman':
          default: return { headerWrapper: 'bg-[#0f172a]', topRowBg: 'bg-gradient-to-r from-gray-900 via-black to-gray-900', topRowText: 'text-white', topRowBorder: 'border-b-2 border-yellow-500', progressRowBg: 'bg-[#0f172a]', toolbarBg: 'bg-[#0f172a]', toolbarBorder: 'border-gray-800', toolbarText: 'text-white', toolbarHover: 'hover:bg-white/10', toolbarActive: 'bg-white/10', progressActive: 'bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]', progressInactive: 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-400 hover:from-gray-800 hover:to-gray-700', tabGroupBg: 'bg-slate-800 border-slate-700', tabActive: 'bg-slate-800 text-yellow-500', tabInactive: 'text-slate-500 hover:text-slate-300', iconPrimary: 'text-white', iconSecondary: 'text-yellow-500', headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all hover:scale-110 active:scale-90', headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/50 transition-all box-border shadow-sm hover:scale-110 active:scale-90', fabIcon: 'text-yellow-500', fabBorder: 'border-gray-700' };
      }
  }, [settings.theme]);

  const searchResults = useMemo(() => {
      return items.filter(item => {
          const familyMatch = selectedFamilyMember === 'All' ? true : selectedFamilyMember === 'Me' ? (item.owner === 'Me' || !item.owner) : item.owner === selectedFamilyMember;
          let searchMatch = true;
          if (searchQuery.trim()) {
              const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.trim());
              searchMatch = terms.every(q => (item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || (item.locationName && item.locationName.toLowerCase().includes(q)) || (item.category && item.category.toLowerCase().includes(q)) || (item.interests && item.interests.some(i => i.toLowerCase().includes(q)))));
          }
          return familyMatch && searchMatch;
      });
  }, [items, selectedFamilyMember, searchQuery]);

  const stats = useMemo(() => {
    const total = searchResults.length;
    const done = searchResults.filter(i => i.completed).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, pending: total - done, percent, total };
  }, [searchResults]);

  const displayItems = useMemo(() => {
      const filtered = searchResults.filter(item => listFilter === 'completed' ? item.completed : !item.completed);
      return filtered.sort((a, b) => {
          if (sortBy === 'distance' && userLocation) {
              const distA = a.coordinates ? calculateDistance(userLocation, a.coordinates) : Infinity;
              const distB = b.coordinates ? calculateDistance(userLocation, b.coordinates) : Infinity;
              return distA - distB;
          }
          const dateA = listFilter === 'completed' ? (a.completedAt || 0) : a.createdAt;
          const dateB = listFilter === 'completed' ? (b.completedAt || 0) : b.createdAt;
          return dateB - dateA; 
      });
  }, [searchResults, listFilter, sortBy, userLocation]);

  const handleLogin = (u: User) => { setUser(u); localStorage.setItem('jk_user', JSON.stringify(u)); };
  const handleLogout = () => { if (confirm("Log out? Local data will remain.")) { setUser(null); localStorage.removeItem('jk_user'); driveService.setAccessToken(''); } };

  const handleAddItem = (draft: BucketItemDraft) => {
      const newItem: BucketItem = { id: crypto.randomUUID(), ...draft, completed: draft.isCompleted || false, createdAt: Date.now(), owner: selectedFamilyMember === 'All' ? 'Me' : selectedFamilyMember };
      if (editingItem) { setItems(prev => prev.map(i => i.id === editingItem.id ? { ...newItem, id: editingItem.id, createdAt: editingItem.createdAt } : i)); setEditingItem(null); }
      else setItems(prev => [newItem, ...prev]);
  };

  const removeSearchTerm = (termToRemove: string) => {
      setSearchQuery(prev => {
          const terms = prev.split(/\s+/).filter(t => t.trim());
          return terms.filter(t => t.toLowerCase() !== termToRemove.toLowerCase()).join(' ');
      });
  };

  const handleMarkerClick = (itemId: string) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      setActiveTab('list');
      setListFilter(item.completed ? 'completed' : 'active');
      setHighlightedItemId(itemId);
      setTimeout(() => { const el = document.getElementById(`card-${itemId}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); triggerHaptic('medium'); } }, 300);
      setTimeout(() => setHighlightedItemId(null), 2500);
  };

  const handleFilterNavigate = (query: string, filterType: 'active' | 'completed' = 'completed') => {
      setSearchQuery(query);
      setListFilter(filterType);
      setActiveTab('list');
      triggerHaptic('medium');
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  const isPlannerActive = !!plannerItem;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500`}>
        <header className={`sticky top-0 z-[60] shadow-xl transition-colors duration-500 ${themeStyles.headerWrapper}`}>
            <div className={`flex items-center justify-between px-2 pt-3 pb-2 ${themeStyles.topRowBg} ${themeStyles.topRowText} ${themeStyles.topRowBorder} animate-in slide-in-from-top duration-500`}>
                <div className="flex flex-col items-start justify-center relative">
                     <div className="flex items-start gap-0">
                         <div className="w-12 h-12 cursor-pointer relative hover:scale-105 active:scale-95 transition-transform" onClick={() => setIsChangelogOpen(true)}>
                            <LiquidBucket theme="brand-red" percent={50} />
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); setIsChangelogOpen(true); }} className={`px-1.5 py-0.5 rounded-md ${settings.theme === 'marvel' ? 'bg-red-600 border-red-700' : settings.theme === 'elsa' ? 'bg-orange-400 border-orange-500' : 'bg-yellow-500 text-black border-yellow-600'} border text-[9px] font-bold transition-all shadow-sm mt-0 -ml-1.5 z-10 hover:scale-110`}>{APP_VERSION}</button>
                    </div>
                     <span className={`text-[10px] font-black tracking-widest cursor-pointer mt-0 lowercase ml-2 ${themeStyles.iconSecondary} transition-opacity hover:opacity-80`} onClick={() => setIsChangelogOpen(true)}>just knock it</span>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => { setIsRadarEnabled(!isRadarEnabled); triggerHaptic('light'); }} className={isRadarEnabled ? `w-10 h-10 flex items-center justify-center rounded-full border border-red-500 bg-red-500/20 text-red-500 animate-pulse` : themeStyles.headerBtn} title="Toggle Radar" data-tour="radar-btn"><Radar className="w-5 h-5" /></button>
                    <button onClick={() => setIsNotificationsOpen(true)} className={`${themeStyles.headerBtn} relative`}><Bell className="w-5 h-5" />{notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-bold text-white px-1 animate-pop">{notifications.filter(n => !n.read).length}</span>}</button>
                    <button onClick={() => setIsSettingsOpen(true)} className={themeStyles.headerBtn} title="Full Settings"><Settings className="w-5 h-5" /></button>
                    <button onClick={handleLogout} className={themeStyles.headerProfileBtn} title="Profile (Tap to Logout)"><img src={user.photoUrl || "https://ui-avatars.com/api/?name=User"} alt="Profile" className="w-full h-full object-cover" /></button>
                </div>
            </div>

            {!isPlannerActive && (
                <>
                    <div className={`px-2 pt-2 pb-1 ${themeStyles.progressRowBg} animate-in fade-in duration-700`}>
                        {searchQuery && (
                            <div className={`mb-2 bg-transparent flex gap-2 overflow-x-auto no-scrollbar animate-in slide-in-from-top-1 fade-in`}>
                                <div className="flex items-center gap-2">
                                    {searchQuery.trim().split(/\s+/).map((term, idx) => (
                                        <button key={`${term}-${idx}`} onClick={() => removeSearchTerm(term)} className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 animate-pop"><span>{term}</span><X className="w-3 h-3 opacity-80" /></button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex h-8 w-full rounded-lg overflow-hidden shadow-inner border border-black/5 dark:border-white/5 transition-all duration-500">
                            <button onClick={() => { setActiveTab('list'); setListFilter('completed'); }} className={`relative overflow-hidden transition-all duration-1000 ease-out font-black text-[10px] uppercase tracking-widest flex items-center justify-center group ${themeStyles.progressActive}`} style={{ width: `${Math.max(stats.percent, 0)}%` }}><div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-shimmer"></div>{stats.percent > 0 && <span className="relative z-10 truncate px-2 drop-shadow-sm animate-in fade-in zoom-in-90 duration-500">{stats.percent > 15 ? `Knocked ${stats.done}` : `${stats.percent}%`}</span>}</button>
                            <button onClick={() => { setActiveTab('list'); setListFilter('active'); }} className={`flex-1 transition-colors font-black text-[10px] uppercase tracking-widest flex items-center justify-center relative overflow-hidden ${themeStyles.progressInactive}`}><span className="relative z-10 truncate px-2 drop-shadow-sm">Dreaming {stats.pending}</span></button>
                        </div>
                    </div>

                    <div className={`flex items-center justify-between px-2 py-1 transition-colors ${themeStyles.toolbarBg} ${themeStyles.toolbarBorder} relative animate-in fade-in duration-700`}>
                        <div className="flex items-center gap-1 relative">
                            <button 
                                onClick={() => { 
                                    if(activeTab === 'stats') setActiveTab('list');
                                    setIsSearchOpen(!isSearchOpen); 
                                    if(isSearchOpen) setSearchQuery(''); 
                                }} 
                                className={`p-2 rounded-xl transition-all ${isSearchOpen ? 'bg-red-500 text-white scale-110 shadow-lg' : themeStyles.toolbarText + ' ' + themeStyles.toolbarHover}`}
                            >
                                {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                            </button>

                            <button 
                                onClick={() => setActiveTab('stats')} 
                                className={`p-2 rounded-xl transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white scale-110 shadow-lg' : themeStyles.toolbarText + ' ' + themeStyles.toolbarHover}`}
                                title="Statistics"
                            >
                                <BarChart3 className="w-5 h-5" />
                            </button>

                            <button 
                                onClick={() => setActiveTab('map')} 
                                className={`p-2 rounded-xl transition-all ${activeTab === 'map' ? 'bg-orange-500 text-white scale-110 shadow-lg' : themeStyles.toolbarText + ' ' + themeStyles.toolbarHover}`}
                                title="Map View"
                                data-tour="view-toggle"
                            >
                                <MapIcon className="w-5 h-5" />
                            </button>

                            {isSearchOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-2 z-[100] animate-in slide-in-from-top-2 fade-in border border-gray-100 dark:border-gray-700">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setIsSearchOpen(false); searchInputRef.current?.blur(); } }} placeholder="Search dreams, tags..." className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-gray-100 transition-all focus:shadow-inner" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center -space-x-2">
                            <button onClick={() => setSelectedFamilyMember('All')} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-0 transition-all hover:scale-125 hover:z-50 ${selectedFamilyMember === 'All' ? 'border-white bg-slate-600 scale-110 shadow-lg' : 'border-slate-200 opacity-60 bg-slate-400'}`} title="All"><Users className="w-3 h-3 text-white" /></button>
                            <button onClick={() => setSelectedFamilyMember('Me')} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-all hover:scale-125 hover:z-50 ${selectedFamilyMember === 'Me' ? 'border-white bg-blue-600 scale-110 shadow-lg' : 'border-slate-200 bg-slate-400'}`} title="Me"><UserIcon className="w-3 h-3 text-white" /></button>
                            {familyMembers.map((member, i) => (
                                <button key={member} onClick={() => setSelectedFamilyMember(member)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white transition-all hover:scale-125 hover:z-50 ${selectedFamilyMember === member ? 'border-white scale-125 z-50 shadow-lg' : 'border-slate-200 opacity-80'} ${getAvatarColor(member)}`} style={{ zIndex: 10 + i + 1 }} title={member}>{getInitials(member)}</button>
                            ))}
                        </div>

                        <div className="flex gap-1 relative">
                            <button onClick={() => { if (activeTab === 'stats') setActiveTab('list'); setListFilter(prev => prev === 'active' ? 'completed' : 'active'); }} className={`p-2 rounded-xl transition-all ${listFilter === 'completed' ? 'text-green-600 bg-green-100 dark:bg-green-900/30 shadow-sm scale-110' : 'opacity-60 hover:opacity-100 ' + themeStyles.toolbarText + ' ' + themeStyles.toolbarHover}`} title="Toggle Completed Items"><ListChecks className="w-5 h-5" /></button>
                            <button className={`p-2 rounded-xl transition-all ${!isCompact ? themeStyles.toolbarText + ' ' + themeStyles.toolbarActive + ' scale-110' : 'opacity-60 hover:opacity-100 ' + themeStyles.toolbarText + ' ' + themeStyles.toolbarHover}`} onClick={() => setIsCompact(!isCompact)} title={isCompact ? "Detailed View" : "Compact View"}>{isCompact ? <List className="w-5 h-5" /> : <AlignLeft className="w-5 h-5" />}</button>
                            <button onClick={() => setSortBy(prev => prev === 'date' ? 'distance' : 'date')} className={`p-2 rounded-xl transition-all ${sortBy === 'distance' ? themeStyles.toolbarText + ' ' + themeStyles.toolbarActive + ' scale-110' : 'opacity-60 hover:opacity-100 ' + themeStyles.toolbarText + ' ' + themeStyles.toolbarHover}`} title="Sort"><ArrowUpDown className="w-5 h-5" /></button>
                        </div>
                    </div>
                </>
            )}
        </header>

        <main className={`flex-1 flex flex-col ${isPlannerActive || activeTab === 'stats' ? 'overflow-hidden relative p-0' : 'overflow-y-auto px-2 pb-28 pt-4 no-scrollbar'}`}>
            {isPlannerActive && plannerItem ? (
                 <div className="flex-1 w-full relative h-full animate-in fade-in-scale duration-500">
                     <TripPlanner item={plannerItem} onClose={() => setPlannerItem(null)} onUpdateItem={(updated) => { setItems(prev => prev.map(i => i.id === updated.id ? updated : i)); }} onAddSeparateItem={(newItem) => { setItems(prev => [newItem, ...prev]); }} userLocation={userLocation} theme={settings.theme} travelMode={settings.travelMode} />
                 </div>
            ) : activeTab === 'stats' ? (
                 <StatsView onBack={() => setActiveTab('list')} items={items} theme={settings.theme} aiInsight={latestAiInsight} onNavigateToItem={handleMarkerClick} onFilterAction={handleFilterNavigate} />
            ) : activeTab === 'list' ? (
                listFilter === 'completed' ? (
                    <TimelineView items={displayItems} onEdit={(i) => { setEditingItem(i); setIsAddModalOpen(true); }} pendingCount={stats.pending} onViewPending={() => setListFilter('active')} highlightedId={highlightedItemId} />
                ) : (
                    <div className="space-y-4">
                        {displayItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                                {items.length === 0 ? (
                                    <div className="animate-in zoom-in duration-700 flex flex-col items-center opacity-80">
                                        <div className="w-40 h-40 mb-4 opacity-60 animate-float"><LiquidBucket theme={settings.theme} percent={15} /></div>
                                        <h3 className="text-xl font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Your bucket is empty</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">The adventure begins with a wish. <br/>Tap <span className="font-bold text-red-500 animate-pulse inline-block">+</span> to start.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center opacity-50 py-4 animate-in fade-in duration-500">
                                        <Filter className="w-12 h-12 text-gray-300 mb-2" />
                                        <p className="text-sm font-medium text-gray-500">{searchQuery ? `No matches for "${searchQuery}"` : "No dreams match your filters."}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            displayItems.map((item, idx) => (
                                <div key={item.id} className={`animate-slide-up stagger-${(idx % 5) + 1}`}>
                                    <BucketListCard item={item} userLocation={userLocation} onToggleComplete={() => setCompletingItemId(item.id)} onDelete={() => { if(confirm("Delete this item?")) setItems(prev => prev.filter(x => x.id !== item.id)); }} onEdit={() => { setEditingItem(item); setIsAddModalOpen(true); }} onViewImages={() => setGalleryItem(item)} onPlanTrip={(i) => setPlannerItem(i)} theme={settings.theme} isCompact={isCompact} isHighlighted={highlightedItemId === item.id} onSearch={(term) => { setSearchQuery(prev => { const currentTerms = prev.toLowerCase().split(/\s+/).filter(t => t); const newTerms = term.trim().split(/\s+/).filter(t => t); const uniqueNewTerms = newTerms.filter(nt => !currentTerms.includes(nt.toLowerCase())); if (uniqueNewTerms.length === 0) return prev; return prev ? `${prev} ${uniqueNewTerms.join(' ')}` : uniqueNewTerms.join(' '); }); setIsSearchOpen(false); }} travelMode={settings.travelMode} />
                                </div>
                            ))
                        )}
                    </div>
                )
            ) : (
                <div className="h-[75vh] rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl relative z-0 animate-in fade-in duration-700">
                    <MapView items={displayItems} userLocation={userLocation} proximityRange={settings.proximityRange} onMarkerClick={handleMarkerClick} />
                </div>
            )}
        </main>

        {!isPlannerActive && activeTab !== 'stats' && (
            <button onClick={() => { setEditingItem(null); setIsAddModalOpen(true); triggerHaptic('medium'); }} className="fixed bottom-8 right-6 z-40 w-24 h-24 transition-all hover:scale-110 active:scale-90 group" data-tour="add-btn">
                <div className="animate-float">
                    <LiquidBucket theme={settings.theme} isFab={true} percent={stats.percent} />
                    <div className={`absolute top-0 right-0 bg-white dark:bg-slate-800 rounded-full p-1 shadow-md border-2 transition-transform group-hover:rotate-12 ${themeStyles.fabBorder}`}>
                        <Plus className={`w-6 h-6 ${themeStyles.fabIcon} stroke-[3]`} />
                    </div>
                </div>
            </button>
        )}

        <AddItemModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingItem(null); }} onAdd={handleAddItem} categories={categories} availableInterests={interests} items={items} initialData={editingItem} mode={editingItem ? 'edit' : 'add'} editingId={editingItem?.id} theme={settings.theme} />
        
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            settings={settings}
            onUpdateSettings={setSettings}
            onClearData={() => setItems([])} 
            onClearMockData={() => setItems(prev => prev.filter(i => !MOCK_BUCKET_ITEMS.find(m => m.id === i.id)))} 
            onAddMockData={() => setItems(prev => [...prev, ...MOCK_BUCKET_ITEMS])} 
            categories={categories} 
            interests={interests} 
            familyMembers={familyMembers} 
            onAddCategory={(c) => setCategories(p => [...p, c])} 
            onRemoveCategory={(c) => setCategories(p => p.filter(x => x !== c))} 
            onAddFamilyMember={(m) => setFamilyMembers(p => [...p, m])} 
            onRemoveFamilyMember={(m) => setFamilyMembers(p => p.filter(x => x !== m))} 
            onAddInterest={(i) => setInterests(p => [...p, i])} 
            onRemoveInterest={(i) => setInterests(p => p.filter(x => x !== i))} 
            onLogout={handleLogout} 
            items={items} 
            onRestore={setItems} 
            onRestartTour={() => { setIsSettingsOpen(false); setIsTourActive(true); }}
        />

        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} notifications={notifications} onMarkAllRead={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} onClearAll={() => setNotifications([])} />
        <CompleteDateModal isOpen={!!completingItemId} onClose={() => setCompletingItemId(null)} onConfirm={(date) => { setItems(prev => prev.map(i => i.id === completingItemId ? {...i, completed: true, completedAt: date} : i)); setCompletingItemId(null); triggerHaptic('success'); }} itemTitle={items.find(i => i.id === completingItemId)?.title} />
        {galleryItem && <ImageGalleryModal item={galleryItem} onClose={() => setGalleryItem(null)} />}
        <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
        <OnboardingTour isActive={isTourActive} onComplete={() => { setIsTourActive(false); localStorage.setItem('jk_tour_seen', 'true'); }} />
    </div>
  );
}

export default App;
