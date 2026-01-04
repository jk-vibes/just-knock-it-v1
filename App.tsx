
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Map as MapIcon, Settings, Bell, Radar, LayoutList, Trophy, Circle, LogOut, Users, ArrowUpDown, Filter, ChevronDown, Menu, Share2, User as UserIcon, SlidersHorizontal, AlignLeft, List, Search, X, ListChecks } from 'lucide-react';
import { BucketItem, Coordinates, Theme, User, AppNotification, BucketItemDraft } from './types';
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
import { MOCK_BUCKET_ITEMS } from './utils/mockData';
import { calculateDistance, requestNotificationPermission, sendNotification, speak } from './utils/geo';
import { triggerHaptic } from './utils/haptics';
import { driveService } from './services/driveService';

const APP_VERSION = 'v1.7';

// --- THEME-AWARE LIQUID BUCKET LOGO ---
const LiquidBucket = ({ theme, isFab = false, percent = 50 }: { theme: Theme | 'brand-red', isFab?: boolean, percent?: number }) => {
    // Theme configurations
    const themes = {
        marvel: { 
            liquid: "#EF4444", // Red 500
            bg: isFab ? "#FFFFFF" : "transparent",
            stroke: "#1e3a8a", // Blue 900
            text: "#1e3a8a" 
        },
        batman: { 
            liquid: "#EAB308", // Yellow 500
            bg: "#111827", 
            stroke: "#374151", 
            text: "#FFFFFF"
        },
        elsa: { 
            liquid: "#22D3EE", // Cyan 400
            bg: isFab ? "#F0F9FF" : "transparent", 
            stroke: "#0891B2", // Cyan 600
            text: "#0E7490" 
        },
        'brand-red': {
            liquid: "#EF4444", 
            bg: isFab ? "#FFFFFF" : "transparent",
            stroke: "#EF4444", 
            text: "#EF4444"
        }
    };
    
    // Normalize theme and get style
    const activeKey = (themes[theme as keyof typeof themes] ? theme : 'marvel') as keyof typeof themes;
    const style = themes[activeKey];
    
    // Liquid Calculation
    // Bounds from Login Design: Y=160 (Top) to Y=480 (Bottom). Height = 320.
    const fillP = Math.min(100, Math.max(0, percent));
    const liquidHeight = (fillP / 100) * 320; 
    const liquidTopY = 480 - liquidHeight;

    const uniqueId = `mask-${isFab ? 'fab' : 'head'}-${activeKey}-${Math.random().toString(36).substr(2, 5)}`;

    // Text Color Logic: White if submerged in red liquid (Header), or style.text
    const textFill = !isFab && (activeKey === 'brand-red' || activeKey === 'marvel') && fillP >= 40 
        ? '#FFFFFF' 
        : style.text;

    return (
        <svg viewBox="0 0 512 512" className={`w-full h-full ${isFab ? 'drop-shadow-lg' : ''}`} xmlns="http://www.w3.org/2000/svg">
            <defs>
                 <style>
                    {`
                        @keyframes wave {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(-512px); }
                        }
                        .wave-anim {
                            animation: wave 3s linear infinite;
                        }
                    `}
                </style>
                <clipPath id={uniqueId}>
                     <path d="M56 160 L96 480 L416 480 L456 160 Z" />
                </clipPath>
            </defs>

            {/* Handle - Matches LoginScreen Design */}
            <path 
                d="M56 160c0-100 400-100 400 0" 
                fill="none" 
                stroke={style.stroke} 
                strokeWidth="30" 
                strokeLinecap="round"
            />

            {/* Bucket Background Body (Empty state) */}
            <path 
                d="M56 160 L96 480 L416 480 L456 160 Z" 
                fill={isFab ? style.bg : 'none'} 
                stroke="none"
                opacity={isFab ? 0.95 : 0} 
            />

            {/* Liquid Content with Wave */}
            {/* Extended path to 1024 to allow seamless loop with -512px translation */}
            <g clipPath={`url(#${uniqueId})`}>
                 <path 
                    d={`M 0 ${liquidTopY} Q 128 ${liquidTopY - 20} 256 ${liquidTopY} T 512 ${liquidTopY} T 768 ${liquidTopY} T 1024 ${liquidTopY} V 500 H 0 Z`} 
                    fill={style.liquid} 
                    className="wave-anim"
                 />
            </g>

            {/* Bucket Outline (Front) */}
            <path 
                d="M56 160 L96 480 L416 480 L456 160 Z" 
                fill="none" 
                stroke={style.stroke} 
                strokeWidth="30" 
                strokeLinejoin="round"
            />
            
            {/* Text Label (JK) - Only for Header */}
            {!isFab && (
                <text 
                    x="256" 
                    y="420" 
                    fontFamily="Arial Black, Arial, sans-serif" 
                    fontWeight="900" 
                    fontSize="160" 
                    fill={textFill} 
                    textAnchor="middle"
                >
                    JK
                </text>
            )}
        </svg>
    );
};

const DEFAULT_CATEGORIES = ['Adventure', 'Travel', 'Food', 'Culture', 'Nature', 'Luxury', 'Personal Growth'];
const DEFAULT_INTERESTS = ['History', 'Art', 'Architecture', 'Hiking', 'Music', 'Photography', 'Shopping', 'Relaxation'];

// Helper for Initials
const getInitials = (name: string) => name.substring(0, 1).toUpperCase();
const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600', 'bg-orange-600'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

function App() {
  // --- Data State ---
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<BucketItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [interests, setInterests] = useState<string[]>(DEFAULT_INTERESTS);
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  
  // --- View State ---
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [listFilter, setListFilter] = useState<'active' | 'completed'>('active'); 
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'distance'>('date');
  const [isCompact, setIsCompact] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  
  // --- Config State ---
  const [theme, setTheme] = useState<Theme>('marvel');
  const [proximityRange, setProximityRange] = useState(2000);
  const [isRadarEnabled, setIsRadarEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // --- Modals & Popovers ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [galleryItem, setGalleryItem] = useState<BucketItem | null>(null);
  const [plannerItem, setPlannerItem] = useState<BucketItem | null>(null);
  const [editingItem, setEditingItem] = useState<BucketItem | null>(null);
  const [completingItemId, setCompletingItemId] = useState<string | null>(null);

  const notifiedItemsRef = useRef<Set<string>>(new Set());

  // --- Initialization ---
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

    const storedTheme = localStorage.getItem('jk_theme') as Theme;
    if (storedTheme) {
        if (['light', 'dark', 'system'].includes(storedTheme)) {
            setTheme('marvel');
        } else {
            setTheme(storedTheme);
        }
    }

    const hasSeenTour = localStorage.getItem('jk_tour_seen');
    if (!hasSeenTour) setIsTourActive(true);

    requestNotificationPermission();

    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
          (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => console.warn("GPS Denied", err),
          { enableHighAccuracy: true }
        );
    }
  }, []);

  // --- Persistence & Theme Logic ---
  useEffect(() => {
      localStorage.setItem('jk_items', JSON.stringify(items));
      localStorage.setItem('jk_family', JSON.stringify(familyMembers));
      localStorage.setItem('jk_categories', JSON.stringify(categories));
      localStorage.setItem('jk_interests', JSON.stringify(interests));
      localStorage.setItem('jk_theme', theme);
      
      // Update body theme attribute
      document.body.setAttribute('data-theme', theme);

      // Toggle Tailwind 'dark' class on HTML element for Batman theme
      if (theme === 'batman') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [items, familyMembers, categories, interests, theme]);

  // Focus search input when opened
  useEffect(() => {
      if (isSearchOpen && searchInputRef.current) {
          searchInputRef.current.focus();
      }
  }, [isSearchOpen]);

  // --- Logic: Proximity Radar ---
  useEffect(() => {
      if (!isRadarEnabled || !userLocation) return;
      items.forEach(item => {
          if (item.completed || !item.coordinates) return;
          const distance = calculateDistance(userLocation, item.coordinates);
          if (distance <= proximityRange && !notifiedItemsRef.current.has(item.id)) {
              notifiedItemsRef.current.add(item.id);
              sendNotification(`Near ${item.title}! 📍`, `You're ${(distance/1000).toFixed(1)}km away!`, item.id);
              speak(`Heads up! You are near ${item.title}`);
              triggerHaptic('heavy');
              setNotifications(prev => [{
                  id: crypto.randomUUID(), title: `Near ${item.title}`, message: 'Tap to view route', 
                  timestamp: Date.now(), read: false, type: 'location', relatedItemId: item.id
              }, ...prev]);
          } else if (distance > proximityRange + 1000) {
              notifiedItemsRef.current.delete(item.id);
          }
      });
  }, [userLocation, items, isRadarEnabled, proximityRange]);

  // --- Theme Styles Logic ---
  const themeStyles = useMemo(() => {
      switch (theme) {
          case 'marvel':
              return {
                  headerWrapper: 'bg-white', // Main header container is white to support split color
                  
                  // Top Row (Logo, Profile)
                  topRowBg: 'bg-[#1e3a8a]', // Dark Blue
                  topRowText: 'text-white',
                  topRowBorder: 'border-b-2 border-red-600', // Reduced Red Separator
                  
                  // Progress Row
                  progressRowBg: 'bg-white', // White Background as requested
                  
                  // Toolbar specifics (White bg)
                  toolbarBg: 'bg-white',
                  toolbarBorder: 'border-slate-200',
                  toolbarText: 'text-slate-600',
                  toolbarHover: 'hover:bg-slate-100',
                  toolbarActive: 'bg-slate-100',
                  
                  // Progress Bars
                  progressActive: 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]',
                  progressInactive: 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white',
                  
                  // Tabs
                  tabGroupBg: 'bg-slate-100 border-slate-200',
                  tabActive: 'bg-white text-blue-700 shadow-sm border border-slate-100',
                  tabInactive: 'text-slate-400 hover:text-slate-600',
                  
                  iconPrimary: 'text-white',
                  iconSecondary: 'text-white',
                  
                  // Circular Header Buttons
                  headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-sm',
                  headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white transition-all box-border shadow-sm'
              };
          case 'elsa':
              return {
                  headerWrapper: 'bg-[#f0f9ff]',
                  
                  topRowBg: 'bg-[#f0f9ff]',
                  topRowText: 'text-cyan-900',
                  topRowBorder: 'border-b-2 border-cyan-300', // Reduced Light Blue
                  
                  progressRowBg: 'bg-[#f0f9ff]',
                  
                  toolbarBg: 'bg-[#f0f9ff]',
                  toolbarBorder: 'border-cyan-200',
                  toolbarText: 'text-cyan-900',
                  toolbarHover: 'hover:bg-cyan-100',
                  toolbarActive: 'bg-cyan-100',

                  progressActive: 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-300 text-white shadow-[0_0_15px_rgba(34,211,238,0.6)]',
                  progressInactive: 'bg-gradient-to-r from-sky-200 via-sky-100 to-sky-50 text-sky-700 hover:from-sky-200 hover:to-sky-100',
                  
                  tabGroupBg: 'bg-cyan-50 border-cyan-100',
                  tabActive: 'bg-white text-cyan-600 shadow-sm border border-cyan-100',
                  tabInactive: 'text-cyan-400 hover:text-cyan-600',
                  
                  iconPrimary: 'text-cyan-600',
                  iconSecondary: 'text-sky-500',
                  
                  headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-cyan-200 bg-white/40 text-cyan-700 hover:bg-white/60 transition-all backdrop-blur-sm',
                  headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-200 hover:border-cyan-400 transition-all box-border shadow-sm'
              };
          case 'batman':
          default:
              return {
                  headerWrapper: 'bg-[#0f172a]',

                  topRowBg: 'bg-[#0f172a]',
                  topRowText: 'text-white',
                  topRowBorder: 'border-b-2 border-yellow-500', // Reduced Yellow

                  progressRowBg: 'bg-[#0f172a]',
                  
                  toolbarBg: 'bg-[#0f172a]',
                  toolbarBorder: 'border-gray-800',
                  toolbarText: 'text-white',
                  toolbarHover: 'hover:bg-white/10',
                  toolbarActive: 'bg-white/10',

                  progressActive: 'bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]',
                  progressInactive: 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-400 hover:from-gray-800 hover:to-gray-700',
                  
                  tabGroupBg: 'bg-slate-800 border-slate-700',
                  tabActive: 'bg-slate-800 text-yellow-500',
                  tabInactive: 'text-slate-500 hover:text-slate-300',
                  
                  iconPrimary: 'text-white',
                  iconSecondary: 'text-yellow-500',
                  
                  headerBtn: 'w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all',
                  headerProfileBtn: 'w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/50 transition-all box-border shadow-sm'
              };
      }
  }, [theme]);

  // Helper for hover states on dark vs light backgrounds
  const topRowHoverClass = (theme === 'marvel' || theme === 'batman') ? 'hover:bg-white/10' : 'hover:bg-black/5';

  // --- Logic: Filtering & Sorting ---

  // 1. Base Search Results (Filters: Family + Search Query)
  // This separates the "viewable set" from the "status tab" (active/completed)
  const searchResults = useMemo(() => {
      return items.filter(item => {
          // Family Filter
          const familyMatch = selectedFamilyMember === 'All' 
              ? true 
              : selectedFamilyMember === 'Me' 
                  ? (item.owner === 'Me' || !item.owner) 
                  : item.owner === selectedFamilyMember;
          
          // Search Filter (Nested & Multi-term)
          let searchMatch = true;
          if (searchQuery.trim()) {
              const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.trim());
              searchMatch = terms.every(q => (
                  item.title.toLowerCase().includes(q) ||
                  item.description.toLowerCase().includes(q) ||
                  (item.locationName && item.locationName.toLowerCase().includes(q)) ||
                  (item.category && item.category.toLowerCase().includes(q)) ||
                  (item.interests && item.interests.some(i => i.toLowerCase().includes(q))) ||
                  (item.itinerary && item.itinerary.some(i => 
                      i.name.toLowerCase().includes(q) || 
                      (i.description && i.description.toLowerCase().includes(q))
                  )) ||
                  (item.roadTrip && item.roadTrip.stops.some(i => 
                      i.name.toLowerCase().includes(q) ||
                      (i.description && i.description.toLowerCase().includes(q))
                  ))
              ));
          }

          return familyMatch && searchMatch;
      });
  }, [items, selectedFamilyMember, searchQuery]);

  // 2. Stats derived from the Search Results
  // This ensures the progress bar reflects the current search context
  const stats = useMemo(() => {
    const total = searchResults.length;
    const done = searchResults.filter(i => i.completed).length;
    const pending = total - done;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, pending, percent, total };
  }, [searchResults]);

  // 3. Display Items (Filtered by Status Tab & Sorted)
  const displayItems = useMemo(() => {
      const filtered = searchResults.filter(item => 
          listFilter === 'completed' ? item.completed : !item.completed
      );

      return filtered.sort((a, b) => {
          if (sortBy === 'distance' && userLocation) {
              const distA = a.coordinates ? calculateDistance(userLocation, a.coordinates) : Infinity;
              const distB = b.coordinates ? calculateDistance(userLocation, b.coordinates) : Infinity;
              return distA - distB;
          }
          const dateA = listFilter === 'completed' ? (a.completedAt || 0) : a.createdAt;
          const dateB = listFilter === 'completed' ? (b.completedAt || 0) : b.createdAt;
          return dateB - dateA; // Newest first
      });
  }, [searchResults, listFilter, sortBy, userLocation]);

  // --- Handlers ---
  const handleLogin = (u: User) => { setUser(u); localStorage.setItem('jk_user', JSON.stringify(u)); };
  const handleLogout = () => {
      if (confirm("Log out? Local data will remain.")) {
          setUser(null);
          localStorage.removeItem('jk_user');
          driveService.setAccessToken('');
      }
  };

  const handleAddItem = (draft: BucketItemDraft) => {
      const newItem: BucketItem = {
          id: crypto.randomUUID(),
          ...draft,
          completed: draft.isCompleted || false,
          createdAt: Date.now(),
          owner: selectedFamilyMember === 'All' ? 'Me' : selectedFamilyMember
      };
      
      if (editingItem) {
          setItems(prev => prev.map(i => i.id === editingItem.id ? { ...newItem, id: editingItem.id, createdAt: editingItem.createdAt } : i));
          setEditingItem(null);
      } else {
          setItems(prev => [newItem, ...prev]);
      }
  };

  const removeSearchTerm = (termToRemove: string) => {
      setSearchQuery(prev => {
          const terms = prev.split(/\s+/).filter(t => t.trim());
          const newTerms = terms.filter(t => t.toLowerCase() !== termToRemove.toLowerCase());
          return newTerms.join(' ');
      });
  };

  const handleMarkerClick = (itemId: string) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      // 1. Switch View & Filter
      setActiveTab('list');
      setListFilter(item.completed ? 'completed' : 'active');

      // 2. Highlight Item
      setHighlightedItemId(itemId);

      // 3. Scroll to Item (delayed to allow render)
      setTimeout(() => {
          const el = document.getElementById(`card-${itemId}`);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              triggerHaptic('medium');
          }
      }, 300);

      // 4. Clear Highlight after delay
      setTimeout(() => setHighlightedItemId(null), 2500);
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const isPlannerActive = !!plannerItem;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300`}>
        
        {/* --- HEADER --- */}
        <header className={`sticky top-0 z-[60] shadow-xl transition-colors duration-300 ${themeStyles.headerWrapper}`}>
            
            {/* Top Row: Logo, Actions */}
            <div className={`flex items-center justify-between px-2 pt-3 pb-2 ${themeStyles.topRowBg} ${themeStyles.topRowText} ${themeStyles.topRowBorder}`}>
                {/* Left: Logo & Text - LEFT ALIGNED */}
                <div className="flex flex-col items-start justify-center relative">
                     <div className="flex items-start gap-0">
                         <div 
                            className="w-12 h-12 cursor-pointer relative"
                            onClick={() => setIsChangelogOpen(true)}
                         >
                            <LiquidBucket theme="brand-red" percent={50} />
                         </div>
                         {/* Version Badge - Next to bucket - TOP ALIGNED */}
                         <button 
                           onClick={(e) => { e.stopPropagation(); setIsChangelogOpen(true); }}
                           className={`px-1.5 py-0.5 rounded-md ${theme === 'marvel' ? 'bg-blue-950 text-blue-200 border-blue-800' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'} border text-[9px] font-bold transition-colors shadow-sm mt-0 -ml-1.5 z-10`}
                        >
                           {APP_VERSION}
                        </button>
                    </div>
                     <span 
                        className={`text-[10px] font-black tracking-widest cursor-pointer mt-0 lowercase ml-2 ${themeStyles.iconSecondary}`}
                        onClick={() => setIsChangelogOpen(true)}
                    >
                        just knock it
                    </span>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { setIsRadarEnabled(!isRadarEnabled); triggerHaptic('light'); }}
                      className={isRadarEnabled 
                          ? `w-10 h-10 flex items-center justify-center rounded-full border border-red-500 bg-red-500/20 text-red-500 animate-pulse` 
                          : themeStyles.headerBtn}
                      title="Toggle Radar"
                    >
                        <Radar className="w-5 h-5" />
                    </button>
                    
                    <button 
                        onClick={() => setIsNotificationsOpen(true)} 
                        className={`${themeStyles.headerBtn} relative`}
                    >
                        <Bell className="w-5 h-5" />
                        {notifications.filter(n => !n.read).length > 0 && (
                             <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-bold text-white px-1">
                                {notifications.filter(n => !n.read).length}
                             </span>
                        )}
                    </button>
                    
                    <button 
                        onClick={() => setIsSettingsOpen(true)} 
                        className={themeStyles.headerBtn}
                        title="Full Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    <button 
                        onClick={handleLogout}
                        className={themeStyles.headerProfileBtn}
                        title="Profile (Tap to Logout)"
                    >
                        <img src={user.photoUrl || "https://ui-avatars.com/api/?name=User"} alt="Profile" className="w-full h-full object-cover" />
                    </button>
                </div>
            </div>

            {!isPlannerActive && (
                <>
                    {/* --- PROGRESS BAR ROW --- */}
                    <div className={`px-2 pt-2 pb-1 ${themeStyles.progressRowBg}`}>
                        
                        {/* Search Tags (Optional, Overlay) */}
                        {searchQuery && (
                            <div className={`mb-2 bg-transparent flex gap-2 overflow-x-auto no-scrollbar animate-in slide-in-from-top-1 fade-in`}>
                                <div className="flex items-center gap-2">
                                    {searchQuery.trim().split(/\s+/).map((term, idx) => (
                                        <button
                                            key={`${term}-${idx}`}
                                            onClick={() => removeSearchTerm(term)}
                                            className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
                                        >
                                            <span>{term}</span>
                                            <X className="w-3 h-3 opacity-80" />
                                        </button>
                                    ))}
                                    {searchQuery.trim().split(/\s+/).length > 1 && (
                                        <button
                                            onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                                            className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
                                        >
                                            <span>Clear</span>
                                            <X className="w-3 h-3 opacity-80" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex h-8 w-full rounded-lg overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
                            <button 
                                onClick={() => setListFilter('completed')}
                                className={`relative overflow-hidden transition-all duration-1000 ease-out font-black text-[10px] uppercase tracking-widest flex items-center justify-center group ${themeStyles.progressActive}`}
                                style={{ width: `${Math.max(stats.percent, 0)}%` }} 
                            >
                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-shimmer"></div>
                                
                                {stats.percent > 0 && (
                                    <span className="relative z-10 truncate px-2 drop-shadow-sm">
                                        {stats.percent > 15 ? `Knocked ${stats.done}` : `${stats.percent}%`}
                                    </span>
                                )}
                            </button>
                            <button 
                                onClick={() => setListFilter('active')}
                                className={`flex-1 transition-colors font-black text-[10px] uppercase tracking-widest flex items-center justify-center relative overflow-hidden ${themeStyles.progressInactive}`}
                            >
                                <span className="relative z-10 truncate px-2 drop-shadow-sm">Dreaming {stats.pending}</span>
                            </button>
                        </div>
                    </div>

                    {/* --- TOOLBAR ROW --- */}
                    <div className={`flex items-center justify-between px-2 py-1 transition-colors ${themeStyles.toolbarBg} ${themeStyles.toolbarBorder} relative`}>
                        <div className="flex items-center gap-2 relative">
                            <div className={`flex p-0.5 rounded-lg shrink-0 border ${themeStyles.tabGroupBg}`}>
                                <button 
                                    onClick={() => setActiveTab('list')} 
                                    className={`p-1.5 rounded-md transition-all ${activeTab === 'list' ? themeStyles.tabActive : themeStyles.tabInactive}`}
                                    title="List View"
                                >
                                    <LayoutList className="w-4 h-4" />
                                </button>
                                <button onClick={() => setActiveTab('map')} className={`p-1.5 rounded-md transition-all ${activeTab === 'map' ? themeStyles.tabActive : themeStyles.tabInactive}`}>
                                    <MapIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => { setIsSearchOpen(!isSearchOpen); if(isSearchOpen) setSearchQuery(''); }}
                                    className={`p-1.5 rounded-md transition-all ${isSearchOpen ? themeStyles.tabActive : themeStyles.tabInactive}`}
                                    title="Search"
                                >
                                    {isSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* INLINE SEARCH POPUP */}
                            {isSearchOpen && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-2 z-[100] animate-in slide-in-from-top-2 fade-in border border-gray-100 dark:border-gray-700">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { setIsSearchOpen(false); searchInputRef.current?.blur(); } }}
                                            placeholder="Search dreams, tags..."
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center -space-x-2">
                            <button 
                                onClick={() => setSelectedFamilyMember('All')}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-0 transition-transform hover:scale-110 hover:z-10 ${selectedFamilyMember === 'All' ? 'border-white bg-slate-600' : 'border-slate-200 opacity-60 bg-slate-400'}`}
                                title="All"
                            >
                                <Users className="w-3 h-3 text-white" />
                            </button>

                            <button 
                                onClick={() => setSelectedFamilyMember('Me')}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 transition-transform hover:scale-110 hover:z-20 ${selectedFamilyMember === 'Me' ? 'border-white bg-blue-600' : 'border-slate-200 bg-slate-400'}`}
                                title="Me"
                            >
                                <UserIcon className="w-3 h-3 text-white" />
                            </button>

                            {familyMembers.map((member, i) => (
                                <button 
                                    key={member}
                                    onClick={() => setSelectedFamilyMember(member)}
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white transition-transform hover:scale-110 hover:z-20 ${selectedFamilyMember === member ? 'border-white scale-110 z-30' : 'border-slate-200 opacity-80'} ${getAvatarColor(member)}`}
                                    style={{ zIndex: 10 + i + 1 }}
                                    title={member}
                                >
                                    {getInitials(member)}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2 relative">
                            <button 
                                onClick={() => { 
                                    if (activeTab !== 'list') setActiveTab('list');
                                    setListFilter(prev => prev === 'active' ? 'completed' : 'active');
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${listFilter === 'completed' ? 'text-green-600 bg-green-100 dark:bg-green-900/30 shadow-sm' : 'opacity-60 hover:opacity-100 ' + themeStyles.toolbarText + ' ' + themeStyles.toolbarHover}`}
                                title="Toggle Completed Items"
                            >
                                <ListChecks className="w-4 h-4" />
                            </button>

                            <button 
                                className={`p-1.5 rounded-lg transition-colors ${!isCompact ? themeStyles.toolbarText + ' ' + themeStyles.toolbarActive : 'opacity-60 hover:opacity-100 ' + themeStyles.toolbarText + ' ' + themeStyles.toolbarHover}`}
                                onClick={() => setIsCompact(!isCompact)}
                                title={isCompact ? "Switch to Detailed View" : "Switch to Compact View"}
                            >
                                {isCompact ? <List className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
                            </button>
                            <button 
                                onClick={() => setSortBy(prev => prev === 'date' ? 'distance' : 'date')}
                                className={`p-1.5 rounded-lg transition-colors ${sortBy === 'distance' ? themeStyles.toolbarText + ' ' + themeStyles.toolbarActive : 'opacity-60 hover:opacity-100 ' + themeStyles.toolbarText + ' ' + themeStyles.toolbarHover}`}
                                title="Sort"
                            >
                                <ArrowUpDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className={`flex-1 flex flex-col ${isPlannerActive ? 'overflow-hidden relative p-0' : 'overflow-y-auto px-2 pb-28 pt-4 no-scrollbar'}`}>
            {isPlannerActive && plannerItem ? (
                 <div className="flex-1 w-full relative h-full">
                     <TripPlanner 
                        item={plannerItem} 
                        onClose={() => setPlannerItem(null)} 
                        onUpdateItem={(updated) => {
                            setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
                        }}
                        onAddSeparateItem={(newItem) => {
                            setItems(prev => [newItem, ...prev]);
                        }}
                        userLocation={userLocation}
                        theme={theme}
                    />
                 </div>
            ) : activeTab === 'list' ? (
                listFilter === 'completed' ? (
                    <TimelineView 
                        items={displayItems} 
                        onEdit={(i) => { setEditingItem(i); setIsAddModalOpen(true); }} 
                        pendingCount={stats.pending} 
                        onViewPending={() => setListFilter('active')}
                        highlightedId={highlightedItemId}
                    />
                ) : (
                    <div className="space-y-4">
                        {displayItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Filter className="w-12 h-12 text-gray-300 mb-2" />
                                <p className="text-sm font-medium text-gray-500">
                                    {searchQuery ? `No matches for "${searchQuery}"` : "No dreams match your filters."}
                                </p>
                            </div>
                        ) : (
                            displayItems.map(item => (
                                <BucketListCard 
                                    key={item.id} 
                                    item={item} 
                                    userLocation={userLocation} 
                                    onToggleComplete={() => setCompletingItemId(item.id)} 
                                    onDelete={() => { if(confirm("Delete this item?")) setItems(prev => prev.filter(x => x.id !== item.id)); }} 
                                    onEdit={() => { setEditingItem(item); setIsAddModalOpen(true); }} 
                                    onViewImages={() => setGalleryItem(item)} 
                                    onPlanTrip={(i) => setPlannerItem(i)}
                                    proximityRange={proximityRange}
                                    theme={theme}
                                    isCompact={isCompact}
                                    isHighlighted={highlightedItemId === item.id}
                                    onSearch={(term) => { 
                                        setSearchQuery(prev => {
                                            const currentTerms = prev.toLowerCase().split(/\s+/).filter(t => t);
                                            const newTerms = term.trim().split(/\s+/).filter(t => t);
                                            const uniqueNewTerms = newTerms.filter(nt => !currentTerms.includes(nt.toLowerCase()));
                                            
                                            if (uniqueNewTerms.length === 0) return prev;
                                            return prev ? `${prev} ${uniqueNewTerms.join(' ')}` : uniqueNewTerms.join(' ');
                                        });
                                        setIsSearchOpen(false); 
                                    }}
                                />
                            ))
                        )}
                    </div>
                )
            ) : (
                <div className="h-[75vh] rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl relative z-0">
                    <MapView 
                        items={displayItems} 
                        userLocation={userLocation} 
                        proximityRange={proximityRange}
                        onMarkerClick={handleMarkerClick} 
                    />
                </div>
            )}
        </main>

        {/* --- FAB (Add Button) --- */}
        {!isPlannerActive && (
            <button 
                onClick={() => { setEditingItem(null); setIsAddModalOpen(true); triggerHaptic('medium'); }} 
                className="fixed bottom-8 right-6 z-40 w-24 h-24 transition-transform hover:scale-105 active:scale-95 group"
            >
                <LiquidBucket theme={theme} isFab={true} percent={stats.percent} />
                <div className="absolute top-0 right-0 bg-white dark:bg-slate-800 rounded-full p-1 shadow-md border border-gray-100 dark:border-gray-700">
                <Plus className="w-4 h-4 text-red-500 stroke-[3]" />
                </div>
            </button>
        )}

        {/* --- MODALS --- */}
        <AddItemModal 
            isOpen={isAddModalOpen} 
            onClose={() => { setIsAddModalOpen(false); setEditingItem(null); }} 
            onAdd={handleAddItem} 
            categories={categories} 
            availableInterests={interests} 
            items={items} 
            initialData={editingItem} 
            mode={editingItem ? 'edit' : 'add'} 
            editingId={editingItem?.id} 
        />
        
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            currentTheme={theme} 
            onThemeChange={setTheme} 
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
            proximityRange={proximityRange} 
            onProximityRangeChange={setProximityRange} 
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
