
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Map as MapIcon, Settings, Bell, Radar, LayoutList, Trophy, Circle, LogOut, Users, ArrowUpDown, Filter, ChevronDown, Menu, Share2, User as UserIcon, SlidersHorizontal, AlignLeft, List, Search, X, ListChecks, BarChart3, Sparkles, MapPin } from 'lucide-react';
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
import { Dashboard } from './components/Dashboard';
import { ProfileMenu } from './components/ProfileMenu';
import { ChatbotModal } from './components/ChatbotModal';
import { MOCK_BUCKET_ITEMS } from './utils/mockData';
import { calculateDistance, requestNotificationPermission, sendNotification, speak } from './utils/geo';
import { triggerHaptic } from './utils/haptics';
import { driveService } from './services/driveService';
import { generateStatsInsight, reverseGeocode } from './services/geminiService';

const APP_VERSION = 'v1.8';

const LiquidBucket = ({ theme, isFab = false, percent = 50, label = "JK" }: { theme: Theme | 'brand-red', isFab?: boolean, percent?: number, label?: string }) => {
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
            {(label !== "JK" || !isFab) && (
                <text 
                    x="256" 
                    y="460" 
                    fontFamily="Arial Black, Arial, sans-serif" 
                    fontWeight="900" 
                    fontSize={label === "?" ? "240" : "100"} 
                    fill={textFill} 
                    textAnchor="middle"
                    className="transition-colors duration-500 select-none"
                    style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.4))' }}
                >
                    {label}
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
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
  const [isRadarEnabled, setIsRadarEnabled] = useState(true);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [currentCity, setCurrentCity] = useState<string>('');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [galleryItem, setGalleryItem] = useState<BucketItem | null>(null);
  const [plannerItem, setPlannerItem] = useState<BucketItem | null>(null);
  const [editingItem, setEditingItem] = useState<BucketItem | null>(null);
  const [completingItemId, setCompletingItemId] = useState<string | null>(null);
  const [latestAiInsight, setLatestAiInsight] = useState<{ title: string; message: string } | null>(null);
  const notifiedItemsRef = useRef<Set<string>>(new Set());

  const updateCityName = async (coords: Coordinates) => {
    try {
        const city = await reverseGeocode(coords.latitude, coords.longitude);
        if (city) setCurrentCity(city);
    } catch (e) { console.warn("City name error", e); }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('jk_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    setItems(localStorage.getItem('jk_items') ? JSON.parse(localStorage.getItem('jk_items')!) : MOCK_BUCKET_ITEMS);
    if (localStorage.getItem('jk_family')) setFamilyMembers(JSON.parse(localStorage.getItem('jk_family')!));
    if (localStorage.getItem('jk_categories')) setCategories(JSON.parse(localStorage.getItem('jk_categories')!));
    if (localStorage.getItem('jk_interests')) setInterests(JSON.parse(localStorage.getItem('jk_interests')!));
    if (localStorage.getItem('jk_settings')) setSettings(prev => ({ ...prev, ...JSON.parse(localStorage.getItem('jk_settings')!) }));
    if (localStorage.getItem('jk_notifications')) setNotifications(JSON.parse(localStorage.getItem('jk_notifications')!).filter((n: any) => n.timestamp > Date.now() - 86400000));
    requestNotificationPermission();
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition((pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }), (err) => console.warn(err), { enableHighAccuracy: true });
    }
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    updateCityName(userLocation);
    const interval = setInterval(() => userLocation && updateCityName(userLocation), 14400000);
    return () => clearInterval(interval);
  }, [userLocation === null]);

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
        const insight = await generateStatsInsight(items.filter(i => i.completed));
        setLatestAiInsight(insight);
        setNotifications(prev => [{ id: crypto.randomUUID(), title: insight.title, message: insight.message, timestamp: Date.now(), read: false, type: 'insight' }, ...prev]);
        if (settings.notificationsEnabled) sendNotification(insight.title, insight.message, 'jk-insight');
        triggerHaptic('success');
    };
    const t = setTimeout(fetchInsight, 5000);
    const i = setInterval(fetchInsight, 900000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, [user, items.length, settings.notificationsEnabled]);

  useEffect(() => {
      if (!isRadarEnabled || !userLocation) return;
      const checkProximity = () => {
         const history = JSON.parse(localStorage.getItem('jk_notify_history') || '{}');
         const now = Date.now();
         items.forEach(item => {
            if (item.completed || !item.coordinates) return;
            const distance = calculateDistance(userLocation, item.coordinates);
            if (distance <= settings.proximityRange && now - (history[item.id] || 0) > 86400000) {
                if (settings.voiceAlertsEnabled) speak(`You are near ${item.title}`);
                if (settings.notificationsEnabled) sendNotification(`Near ${item.title}!`, `${(distance/1000).toFixed(1)}km away!`, item.id);
                triggerHaptic('heavy');
                setNotifications(prev => [{ id: crypto.randomUUID(), title: `Near ${item.title}`, message: `${(distance/1000).toFixed(1)}km away.`, timestamp: now, read: false, type: 'location', relatedItemId: item.id }, ...prev]);
                history[item.id] = now;
            }
         });
         localStorage.setItem('jk_notify_history', JSON.stringify(history));
      };
      const interval = setInterval(checkProximity, 10000);
      return () => clearInterval(interval);
  }, [userLocation, items, isRadarEnabled, settings.proximityRange, settings.voiceAlertsEnabled, settings.notificationsEnabled]);

  const themeStyles = useMemo(() => {
      switch (settings.theme) {
          case 'marvel': return { headerWrapper: 'bg-white', topRowBg: 'bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950', topRowText: 'text-white', topRowBorder: 'border-b-2 border-red-600', progressRowBg: 'bg-white', toolbarBg: 'bg-white', toolbarBorder: 'border-slate-200', toolbarText: 'text-slate-600', toolbarHover: 'hover:bg-slate-100', toolbarActive: 'bg-slate-100', progressActive: 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]', progressInactive: 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white', iconSecondary: 'text-white', headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm', headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white shadow-sm', fabIcon: 'text-red-500', fabBorder: 'border-blue-900', accentText: 'text-red-600' };
          case 'elsa': return { headerWrapper: 'bg-cyan-50', topRowBg: 'bg-gradient-to-r from-sky-50 via-white to-cyan-50', topRowText: 'text-cyan-900', topRowBorder: 'border-b-2 border-orange-400', progressRowBg: 'bg-[#f0f9ff]', toolbarBg: 'bg-[#f0f9ff]', toolbarBorder: 'border-cyan-200', toolbarText: 'text-cyan-900', toolbarHover: 'hover:bg-cyan-100', toolbarActive: 'bg-cyan-100', progressActive: 'bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 text-white shadow-[0_0_15px_rgba(249,115,22,0.6)]', progressInactive: 'bg-gradient-to-r from-cyan-200 via-cyan-100 to-cyan-50 text-cyan-800 hover:from-cyan-200', iconSecondary: 'text-cyan-500', headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-orange-300 bg-white/40 text-cyan-800 hover:bg-white/60', headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-orange-300 hover:border-orange-500 shadow-sm', fabIcon: 'text-orange-500', fabBorder: 'border-cyan-600', accentText: 'text-orange-500' };
          case 'batman':
          default: return { headerWrapper: 'bg-[#0f172a]', topRowBg: 'bg-gradient-to-r from-gray-900 via-black to-gray-900', topRowText: 'text-white', topRowBorder: 'border-b-2 border-yellow-500', progressRowBg: 'bg-[#0f172a]', toolbarBg: 'bg-[#0f172a]', toolbarBorder: 'border-gray-800', toolbarText: 'text-white', toolbarHover: 'hover:bg-white/10', toolbarActive: 'bg-white/10', progressActive: 'bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]', progressInactive: 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-400', iconSecondary: 'text-yellow-500', headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10', headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/50 shadow-sm', fabIcon: 'text-yellow-500', fabBorder: 'border-gray-700', accentText: 'text-yellow-500' };
      }
  }, [settings.theme]);

  const searchResults = useMemo(() => items.filter(item => {
      const familyMatch = selectedFamilyMember === 'All' ? true : selectedFamilyMember === 'Me' ? (item.owner === 'Me' || !item.owner) : item.owner === selectedFamilyMember;
      let searchMatch = true;
      if (searchQuery.trim()) {
          const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.trim());
          searchMatch = terms.every(q => (item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || (item.locationName?.toLowerCase().includes(q)) || (item.category?.toLowerCase().includes(q))));
      }
      return familyMatch && searchMatch;
  }), [items, selectedFamilyMember, searchQuery]);

  const stats = useMemo(() => ({ done: searchResults.filter(i => i.completed).length, pending: searchResults.length - searchResults.filter(i => i.completed).length, percent: searchResults.length > 0 ? Math.round((searchResults.filter(i => i.completed).length / searchResults.length) * 100) : 0, total: searchResults.length }), [searchResults]);

  const displayItems = useMemo(() => searchResults.filter(item => listFilter === 'completed' ? item.completed : !item.completed).sort((a, b) => {
      if (sortBy === 'distance' && userLocation && a.coordinates && b.coordinates) return calculateDistance(userLocation, a.coordinates) - calculateDistance(userLocation, b.coordinates);
      return (listFilter === 'completed' ? (b.completedAt || 0) - (a.completedAt || 0) : b.createdAt - a.createdAt);
  }), [searchResults, listFilter, sortBy, userLocation]);

  if (!user) return <LoginScreen onLogin={(u) => setUser(u)} />;
  const isDashboardTab = activeTab === 'stats';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500">
        <header className={`sticky top-0 z-[60] shadow-xl ${themeStyles.headerWrapper}`}>
            <div className={`flex items-center justify-between px-2 pt-3 pb-2 ${themeStyles.topRowBg} ${themeStyles.topRowText} ${themeStyles.topRowBorder}`}>
                <div className="flex flex-col items-start relative">
                     <div className="flex items-start" onClick={() => setIsChangelogOpen(true)}>
                         <div className="w-12 h-12"><LiquidBucket theme="brand-red" percent={50} /></div>
                         <button className={`px-1.5 py-0.5 rounded-md ${settings.theme === 'marvel' ? 'bg-red-600' : settings.theme === 'elsa' ? 'bg-orange-400' : 'bg-yellow-500 text-black'} border text-[9px] font-bold mt-0 -ml-1.5 z-10`}>{APP_VERSION}</button>
                    </div>
                     <span className={`text-[10px] font-black tracking-widest lowercase ml-2 ${themeStyles.iconSecondary}`}>just knock it</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { setActiveTab(isDashboardTab ? 'list' : 'stats'); triggerHaptic('light'); }} className={themeStyles.headerBtn}>{isDashboardTab ? <List className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}</button>
                    <button onClick={() => setIsSettingsOpen(true)} className={themeStyles.headerBtn}><Settings className="w-5 h-5" /></button>
                    <button onClick={() => setIsNotificationsOpen(true)} className={`${themeStyles.headerBtn} relative`}><Bell className="w-5 h-5" />{notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white px-1">{notifications.filter(n => !n.read).length}</span>}</button>
                    <div className="relative">
                        <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className={themeStyles.headerProfileBtn}><img src={user.photoUrl || "https://ui-avatars.com/api/?name=User"} className="w-full h-full object-cover" /></button>
                        {isProfileMenuOpen && <ProfileMenu user={user} theme={settings.theme} onLogout={() => setUser(null)} onClose={() => setIsProfileMenuOpen(false)} onOpenSettings={() => setIsSettingsOpen(true)} />}
                    </div>
                </div>
            </div>
            {!isDashboardTab && !plannerItem && (
                <>
                    <div className={`px-2 pt-2 pb-1 ${themeStyles.progressRowBg}`}>
                        {searchQuery && <div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar">{searchQuery.trim().split(/\s+/).map((t, i) => <button key={i} onClick={() => setSearchQuery('')} className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-white text-xs font-bold shrink-0"><span>{t}</span><X className="w-3 h-3" /></button>)}</div>}
                        <div className="flex h-8 w-full rounded-lg overflow-hidden border border-black/5">
                            <button onClick={() => setListFilter('completed')} className={`relative overflow-hidden transition-all duration-1000 ease-out font-black text-[10px] uppercase flex items-center justify-center ${themeStyles.progressActive}`} style={{ width: `${stats.percent}%` }}>{stats.percent > 15 ? `Knocked ${stats.done}` : `${stats.percent}%`}</button>
                            <button onClick={() => setListFilter('active')} className={`flex-1 transition-colors font-black text-[10px] uppercase flex items-center justify-center ${themeStyles.progressInactive}`}>Dreaming {stats.pending}</button>
                        </div>
                    </div>
                    <div className={`flex items-center justify-between px-2 py-1 ${themeStyles.toolbarBg} border-t`}>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setListFilter(f => f === 'active' ? 'completed' : 'active')} className={`p-2 rounded-xl ${listFilter === 'completed' ? 'text-green-600 bg-green-100' : 'opacity-60'}`}><ListChecks className="w-5 h-5" /></button>
                            <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-2 rounded-xl ${isSearchOpen ? 'bg-red-500 text-white' : 'opacity-60'}`}><Search className="w-5 h-5" /></button>
                            <button onClick={() => setActiveTab('map')} className={`p-2 rounded-xl ${activeTab === 'map' ? 'bg-orange-500 text-white' : 'opacity-60'}`}><MapIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="flex items-center -space-x-2">
                            <button onClick={() => setSelectedFamilyMember('All')} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-0 ${selectedFamilyMember === 'All' ? 'border-white bg-slate-600' : 'border-slate-200 opacity-60 bg-slate-400'}`}><Users className="w-3 h-3 text-white" /></button>
                            {familyMembers.map((m, i) => <button key={m} onClick={() => setSelectedFamilyMember(m)} className={`w-8 h-8 rounded-full border-2 text-[10px] font-bold text-white ${selectedFamilyMember === m ? 'border-white scale-125 z-10 shadow-lg' : 'border-slate-200 opacity-80'} ${getAvatarColor(m)}`}>{getInitials(m)}</button>)}
                        </div>
                        <div className="flex gap-1">
                            <button className={`p-2 rounded-xl ${!isCompact ? 'bg-slate-100 scale-110' : 'opacity-60'}`} onClick={() => setIsCompact(!isCompact)}>{isCompact ? <List className="w-5 h-5" /> : <AlignLeft className="w-5 h-5" />}</button>
                            <button onClick={() => setSortBy(s => s === 'date' ? 'distance' : 'date')} className={`p-2 rounded-xl ${sortBy === 'distance' ? 'bg-slate-100 scale-110' : 'opacity-60'}`}><ArrowUpDown className="w-5 h-5" /></button>
                        </div>
                    </div>
                </>
            )}
        </header>
        <main className={`flex-1 flex flex-col ${plannerItem || isDashboardTab ? 'overflow-hidden' : 'overflow-y-auto px-2 pb-28 pt-4 no-scrollbar'}`}>
            {plannerItem ? (
                 <div className="flex-1 w-full relative h-full animate-in fade-in-scale duration-500"><TripPlanner item={plannerItem} onClose={() => setPlannerItem(null)} onUpdateItem={(u) => setItems(prev => prev.map(i => i.id === u.id ? u : i))} onAddSeparateItem={(n) => setItems(p => [n, ...p])} userLocation={userLocation} theme={settings.theme} travelMode={settings.travelMode} /></div>
            ) : isDashboardTab ? (
                 <Dashboard onBack={() => setActiveTab('list')} items={items} theme={settings.theme} aiInsight={latestAiInsight} onNavigateToItem={(id) => { setActiveTab('list'); setHighlightedItemId(id); }} currentCity={currentCity} />
            ) : activeTab === 'list' ? (
                listFilter === 'completed' ? <TimelineView items={displayItems} onEdit={(i) => { setEditingItem(i); setIsAddModalOpen(true); }} pendingCount={stats.pending} onViewPending={() => setListFilter('active')} highlightedId={highlightedItemId} /> : <div className="space-y-4">{displayItems.length === 0 ? <div className="flex flex-col items-center justify-center py-16 opacity-80"><div className="w-40 h-40 mb-4 animate-float"><LiquidBucket theme={settings.theme} percent={15} /></div><h3 className="text-xl font-black text-gray-400">Your bucket is empty</h3></div> : displayItems.map((item, idx) => <BucketListCard key={item.id} item={item} userLocation={userLocation} onToggleComplete={() => setCompletingItemId(item.id)} onDelete={() => setItems(p => p.filter(x => x.id !== item.id))} onEdit={() => { setEditingItem(item); setIsAddModalOpen(true); }} onViewImages={() => setGalleryItem(item)} onPlanTrip={setPlannerItem} theme={settings.theme} isCompact={isCompact} isHighlighted={highlightedItemId === item.id} onSearch={setSearchQuery} />)}</div>
            ) : <div className="h-[75vh] rounded-3xl overflow-hidden shadow-xl relative animate-in fade-in duration-700"><MapView items={displayItems} userLocation={userLocation} proximityRange={settings.proximityRange} onMarkerClick={(id) => { setActiveTab('list'); setHighlightedItemId(id); }} /></div>}
        </main>
        {!plannerItem && (
            <>
                {isDashboardTab ? (
                    <button onClick={() => setIsChatOpen(true)} className="fixed bottom-8 right-6 z-40 w-24 h-24 hover:scale-110 active:scale-90 group"><div className="animate-float"><LiquidBucket theme={settings.theme} isFab={true} percent={65} label="?" /><div className={`absolute top-0 right-0 bg-white rounded-full p-2 shadow-md border-2 ${themeStyles.fabBorder}`}><Sparkles className={`w-5 h-5 ${themeStyles.fabIcon} fill-current`} /></div></div></button>
                ) : (
                    <button onClick={() => { setEditingItem(null); setIsAddModalOpen(true); }} className="fixed bottom-8 right-6 z-40 w-24 h-24 hover:scale-110 active:scale-90 group"><div className="animate-float"><LiquidBucket theme={settings.theme} isFab={true} percent={stats.percent} /><div className={`absolute top-0 right-0 bg-white rounded-full p-1 shadow-md border-2 ${themeStyles.fabBorder}`}><Plus className={`w-6 h-6 ${themeStyles.fabIcon} stroke-[3]`} /></div></div></button>
                )}
            </>
        )}
        <AddItemModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingItem(null); }} onAdd={(d) => { const n = { id: editingItem?.id || crypto.randomUUID(), ...d, completed: d.isCompleted || false, createdAt: editingItem?.createdAt || Date.now(), owner: 'Me' }; if(editingItem) setItems(p => p.map(i => i.id === n.id ? n : i)); else setItems(p => [n, ...p]); }} categories={categories} availableInterests={interests} items={items} initialData={editingItem} mode={editingItem ? 'edit' : 'add'} editingId={editingItem?.id} theme={settings.theme} />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={setSettings} onClearData={() => setItems([])} onClearMockData={() => setItems(prev => prev.filter(i => !MOCK_BUCKET_ITEMS.find(m => m.id === i.id)))} onAddMockData={() => setItems(prev => [...prev, ...MOCK_BUCKET_ITEMS])} categories={categories} interests={interests} familyMembers={familyMembers} onAddCategory={(c) => setCategories(p => [...p, c])} onRemoveCategory={(c) => setCategories(p => p.filter(x => x !== c))} onAddFamilyMember={(m) => setFamilyMembers(p => [...p, m])} onRemoveFamilyMember={(m) => setFamilyMembers(p => p.filter(x => x !== m))} onAddInterest={(i) => setInterests(p => [...p, i])} onRemoveInterest={(i) => setInterests(p => p.filter(x => x !== i))} onLogout={() => setUser(null)} items={items} onRestore={setItems} onRestartTour={() => setIsTourActive(true)} />
        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} notifications={notifications} onMarkAllRead={() => setNotifications(prev => prev.map(n => ({...n, read: true})))} onClearAll={() => setNotifications([])} />
        <CompleteDateModal isOpen={!!completingItemId} onClose={() => setCompletingItemId(null)} onConfirm={(date) => { setItems(prev => prev.map(i => i.id === completingItemId ? {...i, completed: true, completedAt: date} : i)); setCompletingItemId(null); triggerHaptic('success'); }} itemTitle={items.find(i => i.id === completingItemId)?.title} />
        {galleryItem && <ImageGalleryModal item={galleryItem} onClose={() => setGalleryItem(null)} />}
        <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
        <OnboardingTour isActive={isTourActive} onComplete={() => { setIsTourActive(false); localStorage.setItem('jk_tour_seen', 'true'); }} />
        <ChatbotModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} userLocation={userLocation} items={items} theme={settings.theme} cityContext={currentCity} />
    </div>
  );
}
export default App;
