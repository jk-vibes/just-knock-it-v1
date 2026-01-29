import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Map as MapIcon, Settings, Bell, LayoutList, Users, ArrowUpDown, List, Search, X, ListChecks, BarChart3, Sparkles, AlignLeft } from 'lucide-react';
import { BucketItem, Coordinates, Theme, User, AppNotification, BucketItemDraft, ActiveTab, TravelMode, AppSettings } from './types';
import { LoginScreen } from './components/LoginScreen';
import { BucketListCard } from './components/BucketListCard';
import { AddItemModal } from './components/AddItemModal';
import { SettingsModal } from './components/SettingsModal';
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
import { Toaster } from './components/Toaster';
import { LiquidBucket } from './components/LiquidBucket';
import { MOCK_BUCKET_ITEMS } from './utils/mockData';
import { calculateDistance, requestNotificationPermission, sendNotification, speak } from './utils/geo';
import { triggerHaptic } from './utils/haptics';
import { generateSmartNotification, reverseGeocode } from './services/geminiService';
import { toast } from './utils/toast';

const APP_VERSION = 'v1.9';

const DEFAULT_CATEGORIES = ['Adventure', 'Travel', 'Food', 'Culture', 'Nature', 'Luxury', 'Personal Growth'];
const DEFAULT_INTERESTS = ['History', 'Art', 'Architecture', 'Hiking', 'Music', 'Photography', 'Shopping', 'Relaxation'];

const getInitials = (name: string) => name.substring(0, 1).toUpperCase();
const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600', 'bg-orange-600'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<BucketItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [interests, setInterests] = useState<string[]>(DEFAULT_INTERESTS);
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [listFilter, setListFilter] = useState<'active' | 'completed'>('active'); 
  
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeInterests, setActiveInterests] = useState<string[]>([]);
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
  const [searchInputValue, setSearchInputValue] = useState('');

  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'distance'>('date');
  const [isCompact, setIsCompact] = useState(false);
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

  const updateCityName = async (coords: Coordinates) => {
    try {
        const city = await reverseGeocode(coords);
        if (city) setCurrentCity(city);
    } catch (e) { console.warn("City name error", e); }
  };

  const fetchSmartNotification = useCallback(async () => {
    if (!user) return;
    try {
        const smartData = await generateSmartNotification(items, currentCity);
        setLatestAiInsight({ title: smartData.title, message: smartData.message });
        
        const typeMap: any = { 'trivia': 'info', 'insight': 'insight', 'discovery': 'system' };
        const notifType = typeMap[smartData.type] || 'info';

        setNotifications(prev => [{ 
            id: crypto.randomUUID(), 
            title: smartData.title, 
            message: smartData.message, 
            timestamp: Date.now(), 
            read: false, 
            type: notifType 
        }, ...prev]);

        toast.info(smartData.message, 0, "Smart Notifier");

        if (settings.notificationsEnabled) {
            sendNotification(smartData.title, smartData.message, 'jk-smart');
        }
        triggerHaptic('success');
    } catch (e) {
        console.error("Failed to fetch intelligence pulse", e);
    }
  }, [user, items, currentCity, settings.notificationsEnabled]);

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
  }, [userLocation]);

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
    const t = setTimeout(fetchSmartNotification, 3000); 
    return () => clearTimeout(t);
  }, [user === null]);

  useEffect(() => {
    if (activeTab === 'stats' && user) {
        const t = setTimeout(fetchSmartNotification, 800);
        return () => clearTimeout(t);
    }
  }, [activeTab, user, fetchSmartNotification]);

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
                toast.info(`Near ${item.title}! Check your list.`);
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
          case 'marvel': return { headerWrapper: 'bg-white', topRowBg: 'bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950', topRowText: 'text-white', topRowBorder: 'border-b-2 border-red-600', progressRowBg: 'bg-white', toolbarBg: 'bg-white', toolbarBorder: 'border-slate-200', toolbarText: 'text-slate-600', toolbarHover: 'hover:bg-slate-100', toolbarActive: 'bg-slate-100', progressFillColor: '#EF4444', progressTrackColor: '#1E3A8A', iconSecondary: 'text-white', headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm', headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white shadow-sm', fabIcon: 'text-red-500', fabBorder: 'border-blue-900', accentText: 'text-red-600', activeBg: 'bg-red-600', activeText: 'text-white', chipBg: 'bg-red-600', chipText: 'text-white', chipInactive: 'bg-slate-100 text-slate-500', chipInterest: 'bg-indigo-600 text-white' };
          case 'elsa': return { headerWrapper: 'bg-cyan-50', topRowBg: 'bg-gradient-to-r from-sky-50 via-white to-cyan-50', topRowText: 'text-cyan-900', topRowBorder: 'border-b-2 border-orange-400', progressRowBg: 'bg-[#f0f9ff]', toolbarBg: 'bg-[#f0f9ff]', toolbarBorder: 'border-cyan-200', toolbarText: 'text-cyan-900', toolbarHover: 'hover:bg-cyan-100', toolbarActive: 'bg-cyan-100', progressFillColor: '#F97316', progressTrackColor: '#0891B2', iconSecondary: 'text-cyan-500', headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-orange-300 bg-white/40 text-cyan-800 hover:bg-white/60', headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-orange-300 hover:border-orange-500 shadow-sm', fabIcon: 'text-orange-500', fabBorder: 'border-cyan-600', accentText: 'text-orange-500', activeBg: 'bg-orange-500', activeText: 'text-white', chipBg: 'bg-orange-500', chipText: 'text-white', chipInactive: 'bg-cyan-100/50 text-cyan-600', chipInterest: 'bg-sky-600 text-white' };
          case 'batman':
          default: return { headerWrapper: 'bg-[#0f172a]', topRowBg: 'bg-gradient-to-r from-gray-900 via-black to-gray-900', topRowText: 'text-white', topRowBorder: 'border-b-2 border-gray-800', progressRowBg: 'bg-[#0f172a]', toolbarBg: 'bg-[#0f172a]', toolbarBorder: 'border-gray-800', toolbarText: 'text-white', toolbarHover: 'hover:bg-white/10', toolbarActive: 'bg-white/10', progressFillColor: '#EAB308', progressTrackColor: '#374151', iconSecondary: 'text-yellow-500', headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10', headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/50 shadow-sm', fabIcon: 'text-yellow-500', fabBorder: 'border-gray-700', accentText: 'text-yellow-500', activeBg: 'bg-yellow-500', activeText: 'text-black', chipBg: 'bg-yellow-500', chipText: 'text-black', chipInactive: 'bg-gray-800 text-gray-500', chipInterest: 'bg-gray-600 text-white' };
      }
  }, [settings.theme]);

  const searchResults = useMemo(() => items.filter(item => {
      const familyMatch = selectedFamilyMember === 'All' ? true : selectedFamilyMember === 'Me' ? (item.owner === 'Me' || !item.owner) : item.owner === selectedFamilyMember;
      const categoryMatch = activeCategories.length === 0 ? true : activeCategories.includes(item.category || '');
      const interestMatch = activeInterests.length === 0 ? true : activeInterests.every(ai => item.interests?.includes(ai));
      
      let searchMatch = true;
      if (searchKeywords.length > 0) {
          searchMatch = searchKeywords.every(q => {
              const lowerQ = q.toLowerCase();
              return (
                item.title.toLowerCase().includes(lowerQ) || 
                item.description.toLowerCase().includes(lowerQ) || 
                (item.locationName?.toLowerCase().includes(lowerQ)) || 
                (item.category?.toLowerCase().includes(lowerQ))
              );
          });
      }
      return familyMatch && categoryMatch && interestMatch && searchMatch;
  }), [items, selectedFamilyMember, activeCategories, activeInterests, searchKeywords]);

  const stats = useMemo(() => ({ done: searchResults.filter(i => i.completed).length, pending: searchResults.length - searchResults.filter(i => i.completed).length, percent: searchResults.length > 0 ? Math.round((searchResults.filter(i => i.completed).length / searchResults.length) * 100) : 0, total: searchResults.length }), [searchResults]);

  const displayItems = useMemo(() => searchResults.filter(item => listFilter === 'completed' ? item.completed : !item.completed).sort((a, b) => {
      if (sortBy === 'distance' && userLocation && a.coordinates && b.coordinates) return calculateDistance(userLocation, a.coordinates) - calculateDistance(userLocation, b.coordinates);
      return (listFilter === 'completed' ? (b.completedAt || 0) - (a.completedAt || 0) : b.createdAt - a.createdAt);
  }), [searchResults, listFilter, sortBy, userLocation]);

  const handleSuggestItem = (suggestion: BucketItemDraft) => {
      setEditingItem(suggestion as any);
      setIsAddModalOpen(true);
      triggerHaptic('success');
  };

  const handleAddOrEditItem = (d: BucketItemDraft) => {
      const n = { 
          id: editingItem?.id || crypto.randomUUID(), 
          ...d, 
          completed: d.isCompleted || false, 
          createdAt: editingItem?.createdAt || Date.now(), 
          owner: 'Me' 
      };
      
      if(editingItem && (editingItem as any).id) {
          setItems(p => p.map(i => i.id === n.id ? n : i));
          toast.success("Dream updated successfully!");
      } else {
          setItems(p => [n, ...p]);
          toast.success("New dream added to your bucket! ✨");
      }
  };

  const handleDeleteItem = (id: string) => {
      if (confirm("Remove this dream from your list?")) {
          setItems(p => p.filter(x => x.id !== id));
          toast.warning("Dream removed.");
          triggerHaptic('warning');
      }
  };

  const handleLogout = () => {
    setUser(null);
    toast.info("Logged out successfully.");
  };

  const handleRestore = (imported: BucketItem[]) => {
    setItems(imported);
    setIsSettingsOpen(false); 
    triggerHaptic('success');
    toast.success(`Successfully imported ${imported.length} dreams! ✨`);
  };

  const handleSortToggle = () => {
      if (sortBy === 'distance') {
          if (!userLocation) {
              toast.warning("Location access needed for distance sort.");
              return;
          }
          setSortBy('distance');
          toast.info("Sorting by proximity.");
      } else {
          setSortBy('date');
          toast.info("Sorting by newest.");
      }
      triggerHaptic('light');
  };

  const handleKeywordAdd = (word: string) => {
      const trimmed = word.trim();
      if (!trimmed) return;
      if (!searchKeywords.includes(trimmed)) {
          setSearchKeywords(prev => [...prev, trimmed]);
      }
      setSearchInputValue('');
      triggerHaptic('medium');
  };

  const isAnyFilterActive = searchKeywords.length > 0 || activeCategories.length > 0 || activeInterests.length > 0;
  const isDashboardTab = activeTab === 'stats';

  if (!user) return <LoginScreen onLogin={(u) => setUser(u)} />;

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500">
        <Toaster theme={settings.theme} />
        <header className={`sticky top-0 z-[60] ${themeStyles.headerWrapper}`}>
            <div className={`flex items-center justify-between px-2 pt-1 pb-2 ${themeStyles.topRowBg} ${themeStyles.topRowText} ${themeStyles.topRowBorder}`}>
                <div className="flex items-center gap-2 cursor-pointer active:opacity-70 transition-opacity" onClick={() => setIsChangelogOpen(true)}>
                    <div className="w-14 h-14 shrink-0"><LiquidBucket theme="brand-red" percent={75} /></div>
                    <div className="flex flex-col pt-1">
                        <span className={`text-[13px] font-black tracking-widest lowercase leading-tight ${themeStyles.iconSecondary}`}>just knock it</span>
                        <div className="mt-0.5">
                            <span className={`px-1.5 py-px rounded-sm text-[8px] font-bold tracking-wider ${
                                settings.theme === 'marvel' ? 'bg-white/20 text-white' : 
                                settings.theme === 'elsa' ? 'bg-orange-100 text-orange-600' : 
                                'bg-white/10 text-yellow-400'
                            } backdrop-blur-sm inline-block`}>{APP_VERSION}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { setActiveTab(isDashboardTab ? 'list' : 'stats'); triggerHaptic('light'); }} className={themeStyles.headerBtn}>{isDashboardTab ? <List className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}</button>
                    <button onClick={() => setIsSettingsOpen(true)} className={themeStyles.headerBtn}><Settings className="w-5 h-5" /></button>
                    <button onClick={() => setIsNotificationsOpen(true)} className={`${themeStyles.headerBtn} relative`}><Bell className="w-5 h-5" />{notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white px-1">{notifications.filter(n => !n.read).length}</span>}</button>
                    <div className="relative">
                        <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className={themeStyles.headerProfileBtn}><img src={user.photoUrl || "https://ui-avatars.com/api/?name=User"} className="w-full h-full object-cover" alt="Profile" /></button>
                        {isProfileMenuOpen && <ProfileMenu user={user} theme={settings.theme} onLogout={handleLogout} onClose={() => setIsProfileMenuOpen(false)} onOpenSettings={() => setIsSettingsOpen(true)} />}
                    </div>
                </div>
            </div>
            {!isDashboardTab && !plannerItem && (
                <>
                    <div className={`px-2 pt-2 pb-1.5 ${themeStyles.progressRowBg}`}>
                        <div 
                            className={`relative h-9 w-full rounded-2xl overflow-hidden border shadow-inner flex items-center transition-all duration-500 ${settings.theme === 'batman' ? 'border-gray-700' : 'border-gray-200'}`}
                            style={{
                                background: `linear-gradient(to right, ${themeStyles.progressFillColor} 0%, ${themeStyles.progressFillColor} ${stats.percent}%, ${themeStyles.progressTrackColor} ${Math.max(0, stats.percent - 2)}%, ${themeStyles.progressTrackColor} 100%)`
                            }}
                        >
                            <button 
                                onClick={() => { setListFilter('completed'); triggerHaptic('light'); }}
                                className={`relative z-10 flex-1 h-full flex items-center justify-start pl-4 transition-all duration-300 outline-none focus:bg-white/10 active:bg-white/20 ${listFilter === 'completed' ? 'scale-[1.02]' : 'opacity-90'}`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-tight leading-none whitespace-nowrap text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${listFilter === 'completed' ? 'underline decoration-2 underline-offset-4' : ''}`}>
                                    Knocked {stats.done} ({stats.percent}%)
                                </span>
                            </button>

                            <button 
                                onClick={() => { setListFilter('active'); triggerHaptic('light'); }}
                                className={`relative z-10 flex-1 h-full flex items-center justify-end pr-4 transition-all duration-300 outline-none focus:bg-white/10 active:bg-white/20 ${listFilter === 'active' ? 'scale-[1.02]' : 'opacity-90'}`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-tight leading-none whitespace-nowrap text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${listFilter === 'active' ? 'underline decoration-2 underline-offset-4' : ''}`}>
                                    Dreaming {stats.pending}
                                </span>
                            </button>
                        </div>

                        {isAnyFilterActive && (
                            <div className="mt-1.5 flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                                {activeCategories.map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => { setActiveCategories(prev => prev.filter(c => c !== cat)); triggerHaptic('light'); }}
                                        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${themeStyles.chipBg} ${themeStyles.chipText} text-[9px] font-black uppercase tracking-tight shrink-0 shadow-md transition-all active:scale-90`}
                                    >
                                        <span>Cat: {cat}</span>
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                ))}
                                {activeInterests.map(interest => (
                                    <button 
                                        key={interest}
                                        onClick={() => { setActiveInterests(prev => prev.filter(i => i !== interest)); triggerHaptic('light'); }}
                                        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${themeStyles.chipInterest} text-[9px] font-black uppercase tracking-tight shrink-0 shadow-md transition-all active:scale-90`}
                                    >
                                        <span>#{interest}</span>
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                ))}
                                {searchKeywords.map((word, i) => (
                                    <button 
                                        key={`search-${i}`} 
                                        onClick={() => {
                                            setSearchKeywords(prev => prev.filter(w => w !== word));
                                            triggerHaptic('light');
                                        }} 
                                        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${themeStyles.chipBg} ${themeStyles.chipText} text-[9px] font-black uppercase tracking-tight shrink-0 shadow-md transition-all active:scale-90`}
                                    >
                                        <span>{word}</span>
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className={`flex items-center justify-between px-2 py-0.5 ${themeStyles.toolbarBg} relative`}>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setListFilter(f => f === 'active' ? 'completed' : 'active')} className={`p-2 rounded-xl transition-all ${listFilter === 'completed' ? `${themeStyles.activeBg} ${themeStyles.activeText}` : `opacity-60 ${themeStyles.toolbarText}`}`}><ListChecks className="w-5 h-5" /></button>
                            
                            <div className="relative">
                                <button onClick={() => { setIsSearchOpen(!isSearchOpen); triggerHaptic('light'); }} className={`p-2 rounded-xl transition-all ${isSearchOpen || isAnyFilterActive ? `${themeStyles.activeBg} ${themeStyles.activeText}` : `opacity-60 ${themeStyles.toolbarText}`}`}><Search className="w-5 h-5" /></button>
                                
                                {isSearchOpen && (
                                     <div className={`absolute top-full left-0 mt-1 z-[100] w-64 animate-in zoom-in-95 slide-in-from-top-1 duration-200`}>
                                        <div className={`p-2 rounded-2xl shadow-2xl border flex flex-col gap-3 ${settings.theme === 'batman' ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                                            <div className="flex items-center bg-slate-50 dark:bg-gray-900 rounded-xl px-2">
                                                <input 
                                                    autoFocus
                                                    ref={searchInputRef}
                                                    value={searchInputValue}
                                                    onChange={(e) => setSearchInputValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleKeywordAdd(searchInputValue);
                                                            if (!searchInputValue) setIsSearchOpen(false);
                                                        }
                                                    }}
                                                    placeholder="Type & Enter to add..."
                                                    className={`flex-1 pl-1 pr-2 py-2 outline-none text-xs bg-transparent ${settings.theme === 'batman' ? 'text-white placeholder:text-gray-600' : 'text-slate-900 placeholder:text-slate-400'}`}
                                                />
                                                {searchInputValue && (
                                                    <button onClick={() => setSearchInputValue('')} className="p-1.5 text-gray-400 hover:text-gray-600">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="px-1">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Append Categories</p>
                                                <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1">
                                                    <button 
                                                        onClick={() => { setActiveCategories([]); triggerHaptic('light'); }}
                                                        className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all whitespace-nowrap ${activeCategories.length === 0 ? `${themeStyles.activeBg} ${themeStyles.activeText}` : 'bg-slate-100 dark:bg-gray-700 text-gray-500'}`}
                                                    >
                                                        Clear
                                                    </button>
                                                    {categories.map(cat => (
                                                        <button 
                                                            key={cat} 
                                                            onClick={() => { 
                                                                setActiveCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
                                                                triggerHaptic('light'); 
                                                            }}
                                                            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all whitespace-nowrap ${activeCategories.includes(cat) ? `${themeStyles.activeBg} ${themeStyles.activeText}` : 'bg-slate-100 dark:bg-gray-700 text-gray-500'}`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="px-1">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">Append Interests</p>
                                                <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1">
                                                    {interests.map(int => (
                                                        <button 
                                                            key={int} 
                                                            onClick={() => {
                                                                setActiveInterests(prev => prev.includes(int) ? prev.filter(i => i !== int) : [...prev, int]);
                                                                triggerHaptic('light');
                                                            }}
                                                            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all whitespace-nowrap ${activeInterests.includes(int) ? `bg-indigo-600 text-white` : 'bg-slate-100 dark:bg-gray-700 text-gray-500'}`}
                                                        >
                                                            #{int}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => setIsSearchOpen(false)}
                                                className="w-full py-2 bg-gray-50 dark:bg-gray-700 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
                                            >
                                                Finish Search
                                            </button>
                                        </div>
                                     </div>
                                )}
                            </div>

                            <button onClick={() => { setActiveTab(activeTab === 'map' ? 'list' : 'map'); triggerHaptic('light'); }} className={`p-2 rounded-xl transition-all ${activeTab === 'map' ? `${themeStyles.activeBg} ${themeStyles.activeText}` : `opacity-60 ${themeStyles.toolbarText}`}`}>{activeTab === 'map' ? <LayoutList className="w-5 h-5" /> : <MapIcon className="w-5 h-5" />}</button>
                        </div>
                        <div className="flex items-center -space-x-2">
                            <button onClick={() => setSelectedFamilyMember('All')} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-0 transition-all ${selectedFamilyMember === 'All' ? 'border-white bg-slate-600 scale-110 z-10' : 'border-slate-200 opacity-60 bg-slate-400'}`}><Users className="w-3.5 h-3.5 text-white" /></button>
                            {familyMembers.map((m) => <button key={m} onClick={() => setSelectedFamilyMember(m)} className={`w-8 h-8 rounded-full border-2 text-[10px] font-bold text-white transition-all ${selectedFamilyMember === m ? 'border-white scale-125 z-10 shadow-lg' : 'border-slate-200 opacity-80'} ${getAvatarColor(m)}`}>{getInitials(m)}</button>)}
                        </div>
                        <div className="flex gap-1">
                            <button className={`p-2 rounded-xl transition-all ${isCompact ? `${themeStyles.activeBg} ${themeStyles.activeText}` : `opacity-60 ${themeStyles.toolbarText}`}`} onClick={() => { setIsCompact(!isCompact); triggerHaptic('light'); }}>{isCompact ? <AlignLeft className="w-5 h-5" /> : <List className="w-5 h-5" />}</button>
                            <button onClick={handleSortToggle} className={`p-2 rounded-xl transition-all ${sortBy === 'distance' ? `${themeStyles.activeBg} ${themeStyles.activeText}` : `opacity-60 ${themeStyles.toolbarText}`}`}><ArrowUpDown className="w-5 h-5" /></button>
                        </div>
                    </div>
                </>
            )}
        </header>
        <main className={`flex-1 flex flex-col ${plannerItem || isDashboardTab ? 'overflow-hidden' : 'overflow-y-auto px-2 pb-28 pt-0 no-scrollbar'}`}>
            {plannerItem ? (
                 <div className="flex-1 w-full relative h-full animate-in fade-in-scale duration-500"><TripPlanner item={plannerItem} onClose={() => setPlannerItem(null)} onUpdateItem={(u) => setItems(prev => prev.map(i => i.id === u.id ? u : i))} onAddSeparateItem={(n) => setItems(p => [n, ...p])} userLocation={userLocation} theme={settings.theme} travelMode={settings.travelMode} /></div>
            ) : isDashboardTab ? (
                 <Dashboard onBack={() => setActiveTab('list')} items={items} theme={settings.theme} aiInsight={latestAiInsight} onNavigateToItem={(id) => { setActiveTab('list'); setHighlightedItemId(id); }} currentCity={currentCity} onSuggestItem={handleSuggestItem} />
            ) : activeTab === 'list' ? (
                listFilter === 'completed' ? <TimelineView items={displayItems} onEdit={(i) => { setEditingItem(i); setIsAddModalOpen(true); }} pendingCount={stats.pending} onViewPending={() => setListFilter('active')} highlightedId={highlightedItemId} /> : <div className="space-y-1.5">{displayItems.length === 0 ? <div className="flex flex-col items-center justify-center py-16 opacity-80"><div className="w-40 h-40 mb-4 animate-float"><LiquidBucket theme={settings.theme} percent={15} /></div><h3 className="text-xl font-black text-gray-400">Your bucket is empty</h3></div> : displayItems.map((item) => <BucketListCard key={item.id} item={item} userLocation={userLocation} onToggleComplete={() => setCompletingItemId(item.id)} onDelete={handleDeleteItem} onEdit={() => { setEditingItem(item); setIsAddModalOpen(true); }} onViewImages={() => setGalleryItem(item)} onPlanTrip={setPlannerItem} theme={settings.theme} isCompact={isCompact} isHighlighted={highlightedItemId === item.id} onSearch={(term) => handleKeywordAdd(term)} />)}</div>
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
        <AddItemModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingItem(null); }} onAdd={handleAddOrEditItem} categories={categories} availableInterests={interests} items={items} initialData={editingItem} mode={editingItem && (editingItem as any).id ? 'edit' : 'add'} editingId={(editingItem as any)?.id} theme={settings.theme} />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={setSettings} onClearData={() => { setItems([]); toast.warning("All local data cleared."); }} onClearMockData={() => { setItems(prev => prev.filter(i => !MOCK_BUCKET_ITEMS.find(m => m.id === i.id))); toast.info("Mock data removed."); }} onAddMockData={() => { setItems(prev => [...prev, ...MOCK_BUCKET_ITEMS]); toast.success("Mock data loaded."); }} categories={categories} interests={interests} familyMembers={familyMembers} onAddCategory={(c) => { setCategories(p => [...p, c]); toast.success(`Category "${c}" added.`); }} onRemoveCategory={(c) => { setCategories(p => p.filter(x => x !== c)); toast.info(`Category "${c}" removed.`); }} onAddFamilyMember={(m) => { setFamilyMembers(p => [...p, m]); toast.success(`Family member "${m}" added.`); }} onRemoveFamilyMember={(m) => { setFamilyMembers(p => p.filter(x => x !== m)); toast.info(`Family member "${m}" removed.`); }} onAddInterest={(i) => { setInterests(p => [...p, i]); toast.success(`Interest "${i}" added.`); }} onRemoveInterest={(i) => { setInterests(p => p.filter(x => x !== i)); toast.info(`Interest "${i}" removed.`); }} onLogout={handleLogout} items={items} onRestore={handleRestore} onRestartTour={() => { setIsTourActive(true); toast.info("Tour restarted."); }} />
        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} notifications={notifications} onMarkAllRead={() => { setNotifications(prev => prev.map(n => ({...n, read: true}))); toast.info("All caught up!"); }} onClearAll={() => { setNotifications([]); toast.info("Notifications cleared."); }} />
        <CompleteDateModal isOpen={!!completingItemId} onClose={() => setCompletingItemId(null)} onConfirm={(date) => { setItems(prev => prev.map(i => i.id === completingItemId ? {...i, completed: true, completedAt: date} : i)); setCompletingItemId(null); triggerHaptic('success'); toast.success("Dream Knocked Out! 🎉"); }} itemTitle={items.find(i => i.id === completingItemId)?.title} />
        {galleryItem && <ImageGalleryModal item={galleryItem} onClose={() => setGalleryItem(null)} />}
        <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
        <OnboardingTour isActive={isTourActive} onComplete={() => { setIsTourActive(false); localStorage.setItem('jk_tour_seen', 'true'); }} />
        <ChatbotModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} userLocation={userLocation} items={items} theme={settings.theme} cityContext={currentCity} />
    </div>
  );
}
