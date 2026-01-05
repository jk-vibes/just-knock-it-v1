
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as L from 'leaflet';
import { ArrowLeft, MapPin, Navigation, Plus, Trash2, Save, Map as MapIcon, List as ListIcon, Sparkles, Loader2, Footprints, MoreVertical, Zap, Flag, GripVertical, Star, Clock, X, Info, Circle, CheckCircle2 } from 'lucide-react';
import { BucketItem, Coordinates, ItineraryItem, Theme } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';
import { getPlaceDetails, optimizeRouteOrder, generateItineraryForLocation } from '../services/geminiService';
import { CategoryIcon } from './CategoryIcon';
import { CompleteDateModal } from './CompleteDateModal';

interface TripPlannerProps {
  item: BucketItem | null;
  onClose: () => void;
  onUpdateItem: (updatedItem: BucketItem) => void;
  onAddSeparateItem: (item: BucketItem) => void;
  userLocation?: Coordinates | null;
  theme: Theme;
}

// --- SUB-COMPONENT: FULL SCREEN MAP ---
const RouteMap = ({ 
    stops, 
    center, 
    onClose, 
    theme 
}: { 
    stops: ItineraryItem[], 
    center?: Coordinates, 
    onClose: () => void,
    theme: Theme
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const [activeStopIndex, setActiveStopIndex] = useState(0);

    // Color Palette based on theme
    const themeColor = useMemo(() => {
        if (theme === 'marvel') return '#EF4444';
        if (theme === 'elsa') return '#F97316'; // Orange 500 for Frozen
        return '#f59e0b'; // Batman/Default
    }, [theme]);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // 1. Initialize Map
        const map = L.map(mapContainerRef.current, { zoomControl: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);
        L.control.zoom({ position: 'topright' }).addTo(map);
        
        mapInstanceRef.current = map;

        // 2. Plot Markers
        const bounds = L.latLngBounds([]);
        const points: L.LatLngExpression[] = [];

        // Destination Center
        if (center) {
            const centerIcon = L.divIcon({
                className: 'bg-transparent',
                html: `<div style="width: 20px; height: 20px; background: ${themeColor}; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            L.marker([center.latitude, center.longitude], { icon: centerIcon }).addTo(map);
            bounds.extend([center.latitude, center.longitude]);
        }

        stops.forEach((stop, idx) => {
            if (stop.coordinates) {
                points.push([stop.coordinates.latitude, stop.coordinates.longitude]);
                bounds.extend([stop.coordinates.latitude, stop.coordinates.longitude]);

                const stopIcon = L.divIcon({
                    className: 'bg-transparent',
                    html: `
                        <div style="width: 30px; height: 30px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; color: ${themeColor}; border: 2px solid ${themeColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            ${idx + 1}
                        </div>
                    `,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });

                const m = L.marker([stop.coordinates.latitude, stop.coordinates.longitude], { icon: stopIcon })
                    .addTo(map)
                    .on('click', () => setActiveStopIndex(idx));
            }
        });

        // 3. Draw Route Line
        if (points.length > 0) {
            L.polyline(points, { color: themeColor, weight: 4, opacity: 0.7, dashArray: '10, 10' }).addTo(map);
        }

        // 4. Fit Bounds & Invalidate Size (Crucial for rendering)
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (center) {
            map.setView([center.latitude, center.longitude], 13);
        }

        setTimeout(() => {
            map.invalidateSize();
        }, 300);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []); // Run once on mount

    // Pan map when active carousel item changes
    useEffect(() => {
        const stop = stops[activeStopIndex];
        if (stop?.coordinates && mapInstanceRef.current) {
            mapInstanceRef.current.panTo([stop.coordinates.latitude, stop.coordinates.longitude], { animate: true });
        }
    }, [activeStopIndex, stops]);

    return (
        <div className="absolute inset-0 z-[20] bg-white dark:bg-slate-900 flex flex-col">
            <div className="absolute top-4 left-4 z-[1000]">
                <button onClick={onClose} className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </div>
            
            <div ref={mapContainerRef} className="flex-1 w-full h-full z-0" />

            {/* Carousel at Bottom */}
            {stops.length > 0 && (
                <div className="absolute bottom-8 left-0 right-0 z-[1000] px-4">
                    <div className="flex overflow-x-auto gap-4 no-scrollbar snap-x snap-mandatory py-4">
                        {stops.map((stop, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => setActiveStopIndex(idx)}
                                className={`snap-center shrink-0 w-[85%] max-w-sm bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border-2 transition-all cursor-pointer ${activeStopIndex === idx ? `border-[${themeColor}] scale-100` : 'border-transparent scale-95 opacity-80'}`}
                                style={{ borderColor: activeStopIndex === idx ? themeColor : 'transparent' }}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">Stop {idx + 1}</span>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight mb-1">{stop.name}</h3>
                                        {stop.description && <p className="text-xs text-gray-500 line-clamp-1">{stop.description}</p>}
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (stop.coordinates) {
                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.latitude},${stop.coordinates.longitude}`, '_blank');
                                            }
                                        }}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"
                                    >
                                        <Navigation className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: PLACE DETAILS MODAL ---
const StopDetailsModal = ({ stop, onClose }: { stop: ItineraryItem, onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                
                {/* Image Header */}
                <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                    {stop.images && stop.images.length > 0 ? (
                        <img src={stop.images[0]} alt={stop.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <MapIcon className="w-12 h-12 text-gray-400" />
                        </div>
                    )}
                    <button 
                        onClick={onClose} 
                        className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    {stop.category && (
                        <div className="absolute bottom-3 left-3 px-3 py-1 bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-full text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5 shadow-sm">
                            <CategoryIcon category={stop.category} className="w-3 h-3" />
                            {stop.category}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight mb-2">{stop.name}</h2>
                    
                    {stop.bestVisitingTime && (
                        <div className="flex items-center gap-2 mb-4 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-100 dark:border-orange-800/50">
                            <Clock className="w-4 h-4" />
                            <span>Best Time: {stop.bestVisitingTime}</span>
                        </div>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                        {stop.description}
                    </p>

                    {stop.interests && stop.interests.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Interests</h4>
                            <div className="flex flex-wrap gap-2">
                                {stop.interests.map((tag, i) => (
                                    <span key={i} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold border border-gray-200 dark:border-gray-600">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {stop.coordinates && (
                        <button 
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates!.latitude},${stop.coordinates!.longitude}`, '_blank')}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                        >
                            <Navigation className="w-4 h-4" />
                            Get Directions
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const TripPlanner: React.FC<TripPlannerProps> = ({ item, onClose, onUpdateItem, onAddSeparateItem, userLocation, theme }) => {
  const [stops, setStops] = useState<ItineraryItem[]>(item?.itinerary || []);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isMagicFilling, setIsMagicFilling] = useState(false);
  const [newPlace, setNewPlace] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStop, setSelectedStop] = useState<ItineraryItem | null>(null);
  const [completingStop, setCompletingStop] = useState<ItineraryItem | null>(null);

  // --- Theme Styles ---
  const s = useMemo(() => {
    // Shared Vibrant Orange for highlights (Badge, Best Time)
    const orange = {
        marvel: 'bg-orange-500 text-white shadow-lg shadow-orange-500/20',
        elsa: 'bg-orange-400 text-white shadow-lg shadow-orange-400/20',
        batman: 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
    };

    switch (theme) {
        case 'marvel': return { 
            bg: 'bg-slate-50',
            surface: 'bg-white',
            header: 'bg-white border-slate-100',
            text: 'text-slate-900',
            textDim: 'text-slate-500',
            accent: 'text-red-600',
            border: 'border-slate-200',
            line: 'bg-slate-200',
            dot: 'bg-red-600 border-white',
            badge: orange.marvel,
            btnPrimary: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
            btnGhost: 'bg-red-50 text-red-600 hover:bg-red-100',
            cardHover: 'hover:border-red-200 hover:shadow-red-500/5',
        };
        case 'elsa': return { 
            bg: 'bg-[#f0f9ff]', // Very light blue
            surface: 'bg-white',
            header: 'bg-white/80 backdrop-blur-md border-cyan-100',
            text: 'text-cyan-950',
            textDim: 'text-cyan-600/70',
            accent: 'text-orange-600', // Orange Accent
            border: 'border-cyan-100',
            line: 'bg-cyan-200',
            dot: 'bg-orange-500 border-white', // Orange Dot
            badge: orange.elsa,
            btnPrimary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20', // Orange Button
            btnGhost: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100',
            cardHover: 'hover:border-cyan-200 hover:shadow-cyan-500/5',
        };
        case 'batman': 
        default: return { 
            bg: 'bg-[#000000]',
            surface: 'bg-[#111827]', // Gray 900
            header: 'bg-[#111827] border-gray-800',
            text: 'text-gray-100',
            textDim: 'text-gray-400',
            accent: 'text-yellow-500',
            border: 'border-gray-800',
            line: 'bg-gray-800',
            dot: 'bg-yellow-500 border-gray-900',
            badge: orange.batman,
            btnPrimary: 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20',
            btnGhost: 'bg-gray-800 text-gray-300 hover:text-yellow-500 hover:bg-gray-700',
            cardHover: 'hover:border-yellow-500/30 hover:shadow-yellow-500/10',
        };
    }
  }, [theme]);

  // Sync stops when item changes
  useEffect(() => {
      setStops(item?.itinerary || []);
  }, [item?.id]);

  const handleAddStop = async () => {
      if (!newPlace.trim()) return;
      setIsAdding(true);
      const details = await getPlaceDetails(newPlace, item?.locationName);
      const newStop: ItineraryItem = details || { name: newPlace, completed: false };
      
      const updated = [...stops, newStop];
      setStops(updated);
      onUpdateItem({ ...item!, itinerary: updated });
      setNewPlace('');
      setIsAdding(false);
  };

  const handleMagicFill = async () => {
      if (!item?.locationName) return;
      setIsMagicFilling(true);
      try {
          const suggestions = await generateItineraryForLocation(item.locationName);
          const existingNames = new Set(stops.map(s => s.name.toLowerCase()));
          const newItems = suggestions.filter(s => !existingNames.has(s.name.toLowerCase()));
          
          if (newItems.length > 0) {
            const updated = [...stops, ...newItems];
            setStops(updated);
            onUpdateItem({ ...item, itinerary: updated });
          }
      } catch (error) {
          console.error("Magic fill failed", error);
      } finally {
          setIsMagicFilling(false);
      }
  };

  const handleOptimize = async () => {
      if (stops.length < 2) return;
      setIsOptimizing(true);
      const optimized = await optimizeRouteOrder(stops);
      setStops(optimized);
      onUpdateItem({ ...item!, itinerary: optimized });
      setIsOptimizing(false);
  };

  const handleRemoveStop = (index: number) => {
      const updated = stops.filter((_, i) => i !== index);
      setStops(updated);
      onUpdateItem({ ...item!, itinerary: updated });
  };

  const handleStopCompletionConfirm = (date: number) => {
      if (!completingStop) return;

      // 1. Mark as completed in the itinerary
      const updatedStops = stops.map(s => 
          s.name === completingStop.name ? { ...s, completed: true } : s
      );
      setStops(updatedStops);
      onUpdateItem({ ...item!, itinerary: updatedStops });

      // 2. Create a new BucketItem for this specific stop
      const newCompletedItem: BucketItem = {
          id: crypto.randomUUID(),
          title: completingStop.name,
          description: completingStop.description || `Visited during trip to ${item?.title}`,
          locationName: item?.locationName,
          coordinates: completingStop.coordinates,
          completed: true,
          completedAt: date,
          createdAt: Date.now(),
          category: completingStop.category || 'Travel',
          interests: completingStop.interests || [],
          images: completingStop.images,
          owner: item?.owner || 'Me'
      };
      onAddSeparateItem(newCompletedItem);

      setCompletingStop(null);
  };

  const calculateTotalStats = () => {
      if (!item?.coordinates) return { dist: 0, time: 0 };
      let dist = 0;
      let prevCoords = item.coordinates;
      stops.forEach(stop => {
          if (stop.coordinates) {
              dist += calculateDistance(prevCoords, stop.coordinates);
              prevCoords = stop.coordinates;
          }
      });
      return { dist, time: Math.round(dist / 500) }; // Crude time est
  };

  const stats = calculateTotalStats();

  if (!item) return null;

  // --- RENDER MAP MODE ---
  if (viewMode === 'map') {
      return (
          <RouteMap 
            stops={stops} 
            center={item.coordinates} 
            onClose={() => setViewMode('list')} 
            theme={theme} 
          />
      );
  }

  // --- RENDER TIMELINE MODE ---
  return (
    <div className={`absolute inset-0 z-0 flex flex-col ${s.bg}`}>
        {/* HEADER */}
        <div className={`px-5 pt-4 pb-4 border-b shadow-sm shrink-0 z-20 transition-colors ${s.header} ${s.border}`}>
            <div className="flex justify-between items-start gap-3">
                
                {/* Left: Title & Meta */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <h1 className={`text-xl font-black leading-tight truncate mb-2 ${s.text}`}>
                        {item.title}
                    </h1>
                    
                    <div className="flex items-center flex-wrap gap-2">
                         <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${s.badge}`}>
                            Trip Planner
                         </span>
                         <span className={`${s.textDim} text-[10px]`}>|</span>
                         <div className={`flex items-center gap-3 text-[10px] font-medium ${s.textDim}`}>
                            {item.locationName && <span>{item.locationName}</span>}
                            <span className="flex items-center gap-1"><Footprints className="w-3 h-3" /> {formatDistance(stats.dist)}</span>
                            <span className="flex items-center gap-1"><Flag className="w-3 h-3" /> {stops.length}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex gap-1.5 shrink-0">
                     <button 
                        onClick={handleMagicFill}
                        disabled={isMagicFilling || !item.locationName}
                        className={`p-2 rounded-full disabled:opacity-50 transition-colors ${s.btnGhost}`}
                        title="Magic Fill Suggestions"
                    >
                        {isMagicFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-current" />}
                    </button>
                    <button 
                        onClick={handleOptimize}
                        disabled={isOptimizing || stops.length < 2}
                        className={`p-2 rounded-full disabled:opacity-50 transition-colors ${s.btnGhost}`}
                        title="Optimize Route"
                    >
                        {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                    </button>
                    <button 
                        onClick={() => setViewMode('map')}
                        className={`p-2 rounded-full transition-all shadow-lg hover:brightness-110 ${s.btnPrimary}`}
                    >
                        <MapIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={onClose} 
                        className={`p-2 rounded-full transition-colors ${s.btnGhost}`}
                        title="Close"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        {/* TIMELINE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 relative">
            {/* Start Node */}
            <div className="flex gap-4 relative mb-2">
                <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-4 border-white shadow-md z-10 ${s.dot} ${theme === 'batman' ? 'shadow-none' : ''}`}></div>
                    <div className={`w-0.5 flex-1 my-1 ${s.line}`}></div>
                </div>
                <div className="pb-8">
                    <h3 className={`text-sm font-bold ${s.text}`}>Start</h3>
                    <p className={`text-xs ${s.textDim}`}>{item.locationName || 'Current Location'}</p>
                </div>
            </div>

            {/* Stops */}
            {stops.map((stop, idx) => (
                <div key={idx} className="flex gap-4 relative group animate-in slide-in-from-bottom-2 fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                    {/* Line & Dot */}
                    <div className="flex flex-col items-center pt-1.5">
                        {/* Distance Badge on Line */}
                        {idx >= 0 && (
                            <div className={`absolute -top-5 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full z-0 transform -translate-x-1/2 ${theme === 'batman' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-400 border border-gray-100'}`}>
                                {stop.coordinates && (idx === 0 ? item.coordinates : stops[idx-1].coordinates) 
                                    ? formatDistance(calculateDistance(stop.coordinates, idx === 0 ? item.coordinates! : stops[idx-1].coordinates!))
                                    : '---'}
                            </div>
                        )}
                        
                        <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center z-10 shadow-sm ${s.dot} ${theme === 'batman' ? 'border-gray-900' : 'border-white'}`}>
                            <span className={`text-xs font-bold ${theme === 'batman' ? 'text-black' : 'text-white'}`}>{idx + 1}</span>
                        </div>
                        {idx !== stops.length - 1 && <div className={`w-0.5 flex-1 my-1 ${s.line}`}></div>}
                    </div>

                    {/* Card */}
                    <div className="flex-1 pb-8 min-w-0">
                        <div className={`p-4 rounded-2xl shadow-sm border relative transition-all ${s.surface} ${s.border} ${s.cardHover} ${stop.completed ? 'opacity-60' : ''}`}>
                            <div className="flex justify-between items-start mb-1 gap-2">
                                <div className="flex-1 flex items-start gap-3 min-w-0">
                                    {/* Radio Button for Completion */}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!stop.completed) setCompletingStop(stop);
                                        }}
                                        className={`shrink-0 mt-0.5 transition-all ${stop.completed ? 'text-green-500 cursor-default' : `${s.textDim} hover:text-green-500`}`}
                                        title={stop.completed ? "Completed" : "Mark as Completed"}
                                    >
                                        {stop.completed ? <CheckCircle2 className="w-5 h-5 fill-current" /> : <Circle className="w-5 h-5" />}
                                    </button>

                                    <button 
                                        onClick={() => setSelectedStop(stop)}
                                        className={`text-left font-bold truncate hover:text-blue-500 transition-colors flex items-center gap-2 group/title ${stop.completed ? `${s.textDim} line-through` : s.text}`}
                                    >
                                        {stop.name}
                                        <Info className={`w-3 h-3 ${s.textDim} group-hover/title:text-blue-500 shrink-0 opacity-50`} />
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={() => handleRemoveStop(idx)}
                                    className={`${s.textDim} hover:text-red-500 transition-colors`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {stop.description && <p className={`text-xs ${s.textDim} line-clamp-2 mb-3 cursor-pointer pl-8`} onClick={() => setSelectedStop(stop)}>{stop.description}</p>}
                            
                            <div className="flex flex-wrap gap-2 pl-8">
                                {stop.isImportant && (
                                    <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-yellow-500/20">
                                        <Star className="w-3 h-3 fill-current" /> Must See
                                    </span>
                                )}
                                {stop.category && (
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border ${theme === 'batman' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                        <CategoryIcon category={stop.category} className="w-3 h-3" />
                                        {stop.category}
                                    </span>
                                )}
                                {stop.bestVisitingTime && (
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${s.badge}`}>
                                        <Clock className="w-3 h-3" />
                                        {stop.bestVisitingTime}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* End Node */}
            <div className="flex gap-4 relative opacity-50">
                 <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-2 bg-transparent ${theme === 'batman' ? 'border-gray-700' : 'border-gray-300'}`}></div>
                </div>
                 <div>
                    <h3 className={`text-sm font-medium ${s.textDim}`}>Trip End</h3>
                </div>
            </div>

            {/* Add Stop Input Area */}
            <div className="mt-8 pb-20">
                <div className={`flex items-center gap-2 p-2 rounded-xl border shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 transition-all ${s.surface} ${s.border}`}>
                    <Plus className={`w-5 h-5 ml-2 ${s.textDim}`} />
                    <input 
                        type="text" 
                        value={newPlace}
                        onChange={(e) => setNewPlace(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
                        placeholder="Add another stop..."
                        className={`flex-1 bg-transparent border-none outline-none text-sm h-10 ${s.text}`}
                        disabled={isAdding}
                    />
                    <button 
                        onClick={handleAddStop}
                        disabled={!newPlace.trim() || isAdding}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 ${theme === 'batman' ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
                    >
                        {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                    </button>
                </div>
            </div>
        </div>
        
        {/* DETAILS POPUP */}
        {selectedStop && (
            <StopDetailsModal stop={selectedStop} onClose={() => setSelectedStop(null)} />
        )}

        {/* COMPLETION DATE POPUP */}
        <CompleteDateModal 
            isOpen={!!completingStop}
            onClose={() => setCompletingStop(null)}
            onConfirm={handleStopCompletionConfirm}
            itemTitle={completingStop?.name}
        />
    </div>
  );
};
