
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as L from 'leaflet';
import { ArrowLeft, MapPin, Navigation, Plus, Trash2, Save, Map as MapIcon, List as ListIcon, Sparkles, Loader2, Footprints, MoreVertical, Zap, Flag, GripVertical, Star, Clock, X, Info, Circle, CheckCircle2, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { BucketItem, Coordinates, ItineraryItem, Theme, TravelMode } from '../types';
import { calculateDistance, formatDistance } from '../utils/geo';
import { getPlaceDetails, optimizeRouteOrder, generateItineraryForLocation } from '../services/geminiService';
import { CategoryIcon } from './CategoryIcon';
import { CompleteDateModal } from './CompleteDateModal';
import { triggerHaptic } from '../utils/haptics';

interface TripPlannerProps {
  item: BucketItem | null;
  onClose: () => void;
  onUpdateItem: (updatedItem: BucketItem) => void;
  onAddSeparateItem: (item: BucketItem) => void;
  userLocation?: Coordinates | null;
  theme: Theme;
  travelMode?: TravelMode;
}

// --- SUB-COMPONENT: FULL SCREEN MAP ---
const RouteMap = ({ 
    stops, 
    center, 
    onClose, 
    theme,
    travelMode = 'driving'
}: { 
    stops: ItineraryItem[], 
    center?: Coordinates, 
    onClose: () => void,
    theme: Theme,
    travelMode?: TravelMode
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const [activeStopIndex, setActiveStopIndex] = useState(0);

    const themeColor = useMemo(() => {
        if (theme === 'marvel') return '#EF4444';
        if (theme === 'elsa') return '#F97316';
        return '#f59e0b';
    }, [theme]);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const map = L.map(mapContainerRef.current, { zoomControl: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);
        L.control.zoom({ position: 'topright' }).addTo(map);
        
        mapInstanceRef.current = map;

        const bounds = L.latLngBounds([]);
        const points: L.LatLngExpression[] = [];

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

                L.marker([stop.coordinates.latitude, stop.coordinates.longitude], { icon: stopIcon })
                    .addTo(map)
                    .on('click', () => setActiveStopIndex(idx));
            }
        });

        if (points.length > 0) {
            L.polyline(points, { color: themeColor, weight: 4, opacity: 0.7, dashArray: '10, 10' }).addTo(map);
        }

        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (center) {
            map.setView([center.latitude, center.longitude], 13);
        }

        setTimeout(() => map.invalidateSize(), 300);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

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
                                                const mode = travelMode === 'bicycling' ? 'bicycling' : travelMode;
                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.latitude},${stop.coordinates.longitude}&travelmode=${mode}`, '_blank');
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
const StopDetailsModal = ({ stop, onClose, travelMode = 'driving' }: { stop: ItineraryItem, onClose: () => void, travelMode?: TravelMode }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                
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
                            onClick={() => {
                                const mode = travelMode === 'bicycling' ? 'bicycling' : travelMode;
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates!.latitude},${stop.coordinates!.longitude}&travelmode=${mode}`, '_blank');
                            }}
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

export const TripPlanner: React.FC<TripPlannerProps> = ({ item, onClose, onUpdateItem, onAddSeparateItem, userLocation, theme, travelMode = 'driving' as TravelMode }) => {
  const [stops, setStops] = useState<ItineraryItem[]>(item?.itinerary || []);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isMagicFilling, setIsMagicFilling] = useState(false);
  const [newPlace, setNewPlace] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStop, setSelectedStop] = useState<ItineraryItem | null>(null);
  const [completingStop, setCompletingStop] = useState<ItineraryItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const s = useMemo(() => {
    const orange = {
        marvel: 'bg-orange-500 text-white shadow-lg shadow-orange-500/20',
        elsa: 'bg-orange-400 text-white shadow-lg shadow-orange-400/20',
        batman: 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
    };

    switch (theme) {
        case 'marvel': return { 
            bg: 'bg-slate-50', surface: 'bg-white', header: 'bg-white border-slate-100', text: 'text-slate-900', textDim: 'text-slate-500', accent: 'text-red-600', border: 'border-slate-200', line: 'bg-slate-200', dot: 'bg-red-600 border-white', badge: orange.marvel, btnPrimary: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20', btnGhost: 'bg-red-50 text-red-600 hover:bg-red-100', cardHover: 'hover:border-red-200 hover:shadow-red-500/5',
        };
        case 'elsa': return { 
            bg: 'bg-[#f0f9ff]', surface: 'bg-white', header: 'bg-white/80 backdrop-blur-md border-cyan-100', text: 'text-cyan-950', textDim: 'text-cyan-600/70', accent: 'text-orange-600', border: 'border-cyan-100', line: 'bg-cyan-200', dot: 'bg-orange-500 border-white', badge: orange.elsa, btnPrimary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20', btnGhost: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100', cardHover: 'hover:border-cyan-200 hover:shadow-cyan-500/5',
        };
        case 'batman': 
        default: return { 
            bg: 'bg-[#000000]', surface: 'bg-[#111827]', header: 'bg-[#111827] border-gray-800', text: 'text-gray-100', textDim: 'text-gray-400', accent: 'text-yellow-500', border: 'border-gray-800', line: 'bg-gray-800', dot: 'bg-yellow-500 border-gray-900', badge: orange.batman, btnPrimary: 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20', btnGhost: 'bg-gray-800 text-gray-300 hover:text-yellow-500 hover:bg-gray-700', cardHover: 'hover:border-yellow-500/30 hover:shadow-yellow-500/10',
        };
    }
  }, [theme]);

  useEffect(() => {
      setStops(item?.itinerary || []);
  }, [item?.id]);

  const handleAddStop = async () => {
      if (!newPlace.trim()) return;
      setIsAdding(true);
      setErrorMsg(null);
      const details = await getPlaceDetails(newPlace, item?.locationName);
      const newStop: ItineraryItem = details || { name: newPlace, completed: false };
      
      const updated = [...stops, newStop];
      setStops(updated);
      onUpdateItem({ ...item!, itinerary: updated });
      setNewPlace('');
      setIsAdding(false);
  };

  const handleMagicFill = async () => {
      if (!item?.locationName || !item?.coordinates) return;
      setIsMagicFilling(true);
      setErrorMsg(null);
      try {
          const suggestions = await generateItineraryForLocation(item.locationName);
          const existingNames = new Set(stops.map(s => s.name.toLowerCase()));
          
          const filteredSuggestions = suggestions.filter(s => {
              return !existingNames.has(s.name.toLowerCase());
          });
          
          if (filteredSuggestions.length > 0) {
            const updated = [...stops, ...filteredSuggestions];
            setStops(updated);
            onUpdateItem({ ...item, itinerary: updated });
          } else {
              setErrorMsg("No more new local spots found.");
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
      triggerHaptic('warning');
  };

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= stops.length) return;
      
      const updated = [...stops];
      const temp = updated[index];
      updated[index] = updated[newIndex];
      updated[newIndex] = temp;
      
      setStops(updated);
      onUpdateItem({ ...item!, itinerary: updated });
      triggerHaptic('light');
  };

  const handleStopCompletionConfirm = (date: number) => {
      if (!completingStop) return;
      const updatedStops = stops.map(s => 
          s.name === completingStop.name ? { ...s, completed: true } : s
      );
      setStops(updatedStops);
      onUpdateItem({ ...item!, itinerary: updatedStops });

      const newCompletedItem: BucketItem = {
          id: crypto.randomUUID(),
          title: completingStop.name,
          description: completingStop.description || `Visited during trip to ${item?.title}`,
          type: 'destination',
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
      return { dist, time: Math.round(dist / 500) };
  };

  const stats = calculateTotalStats();

  if (!item) return null;

  if (viewMode === 'map') {
      return (
          <RouteMap 
            stops={stops} 
            center={item.coordinates} 
            onClose={() => setViewMode('list')} 
            theme={theme} 
            travelMode={travelMode as TravelMode}
          />
      );
  }

  return (
    <div className={`absolute inset-0 z-0 flex flex-col ${s.bg}`}>
        {/* HEADER */}
        <div className={`px-5 pt-4 pb-4 border-b shadow-sm shrink-0 z-20 transition-colors ${s.header} ${s.border}`}>
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0 pt-0.5">
                    <h1 className={`text-xl font-black leading-tight truncate mb-2 ${s.text}`}>
                        {item.title}
                    </h1>
                    
                    <div className="flex items-center flex-wrap gap-2">
                         <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${s.badge}`}>
                            Local Itinerary
                         </span>
                         <span className={`${s.textDim} text-[10px]`}>|</span>
                         <div className={`flex items-center gap-3 text-[10px] font-medium ${s.textDim}`}>
                            {item.locationName && <span className="truncate max-w-[80px]">{item.locationName}</span>}
                            <span className="flex items-center gap-1"><Footprints className="w-3 h-3" /> {formatDistance(stats.dist)}</span>
                            <span className="flex items-center gap-1"><Flag className="w-3 h-3" /> {stops.length}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-1.5 shrink-0">
                     <button 
                        onClick={handleMagicFill}
                        disabled={isMagicFilling || !item.locationName}
                        className={`p-2 rounded-full disabled:opacity-50 transition-colors ${s.btnGhost}`}
                        title="Magic Fill Nearby Spots"
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
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        {/* TIMELINE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 relative no-scrollbar">
            {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 animate-in slide-in-from-top duration-300">
                    <AlertTriangle className="w-4 h-4" />
                    {errorMsg}
                </div>
            )}

            <div className="flex gap-4 relative mb-2">
                <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-4 border-white shadow-md z-10 ${s.dot}`}></div>
                    <div className={`w-0.5 flex-1 my-1 ${s.line}`}></div>
                </div>
                <div className="pb-8">
                    <h3 className={`text-sm font-bold ${s.text}`}>Start</h3>
                    <p className={`text-xs ${s.textDim}`}>{item.locationName || 'Destination Center'}</p>
                </div>
            </div>

            {stops.map((stop, idx) => (
                <div key={`${stop.name}-${idx}`} className="flex gap-4 relative group animate-in slide-in-from-bottom-2 fade-in">
                    <div className="flex flex-col items-center pt-1.5">
                        <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all duration-300 z-10 ${stop.completed ? 'bg-green-500 border-green-100 text-white' : 'bg-white dark:bg-slate-800 ' + s.border + ' ' + s.text}`}>
                            {stop.completed ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                        </div>
                        <div className={`w-0.5 flex-1 my-1 ${s.line}`}></div>
                    </div>
                    
                    <div className="pb-10 flex-1 min-w-0">
                        <div 
                            className={`p-4 rounded-2xl border transition-all duration-300 ${s.surface} ${s.border} ${s.cardHover} flex gap-3`}
                        >
                            {/* Reordering Controls */}
                            {!stop.completed && (
                                <div className="flex flex-col gap-2 shrink-0">
                                    <button 
                                        disabled={idx === 0}
                                        onClick={() => handleMoveStop(idx, 'up')}
                                        className={`p-1 rounded-md transition-colors disabled:opacity-10 ${s.btnGhost}`}
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button 
                                        disabled={idx === stops.length - 1}
                                        onClick={() => handleMoveStop(idx, 'down')}
                                        className={`p-1 rounded-md transition-colors disabled:opacity-10 ${s.btnGhost}`}
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex-1 min-w-0" onClick={() => setSelectedStop(stop)}>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-black text-sm md:text-base leading-tight truncate ${stop.completed ? 'line-through opacity-50' : s.text}`}>
                                        {stop.name}
                                    </h4>
                                    {stop.isImportant && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                                </div>
                                <p className={`text-[10px] line-clamp-2 leading-relaxed ${s.textDim}`}>{stop.description}</p>
                            </div>

                            <div className="flex flex-col items-center gap-2 shrink-0">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveStop(idx); }} 
                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {!stop.completed && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setCompletingStop(stop); }} 
                                        className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                                    >
                                        <Circle className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* ADD NEW PLACE INPUT */}
            <div className="flex gap-4 relative">
                <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${s.border} ${s.textDim}`}>
                         {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </div>
                </div>
                <div className="flex-1 pb-12">
                    <div className={`flex items-center gap-2 p-1.5 pr-2 rounded-2xl border bg-white dark:bg-slate-800 ${s.border}`}>
                        <input 
                            type="text" 
                            value={newPlace}
                            onChange={(e) => { setNewPlace(e.target.value); setErrorMsg(null); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
                            placeholder="Add a specific local spot..."
                            className={`flex-1 bg-transparent text-sm outline-none px-3 py-2 ${s.text} placeholder:text-gray-400`}
                        />
                        <button 
                            onClick={handleAddStop}
                            disabled={!newPlace.trim() || isAdding}
                            className={`p-2 rounded-xl transition-all disabled:opacity-30 ${s.btnPrimary}`}
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 mt-2 px-1 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Focus on gems within the city area.
                    </p>
                </div>
            </div>
        </div>

        {selectedStop && <StopDetailsModal stop={selectedStop} onClose={() => setSelectedStop(null)} travelMode={travelMode as TravelMode} />}
        
        <CompleteDateModal 
            isOpen={!!completingStop} 
            onClose={() => setCompletingStop(null)} 
            onConfirm={handleStopCompletionConfirm} 
            itemTitle={completingStop?.name}
        />
    </div>
  );
};
