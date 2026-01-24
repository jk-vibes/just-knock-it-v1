
import React, { useState, useEffect, useMemo } from 'react';
import { X, Moon, Sun, Monitor, Trash2, Plus, Cloud, Upload, Download, Loader2, CheckCircle2, Eraser, AlertCircle, Volume2, FileJson, FileSpreadsheet, PlayCircle, Database, LogOut, Car, Footprints, Bike, Bus, BellRing, Mic, Settings2, Tag, Hash, List, Users } from 'lucide-react';
import { Theme, TravelMode, AppSettings, BucketItem } from '../types';
import { driveService } from '../services/driveService';
import { sendNotification, speak } from '../utils/geo';
import { CategoryIcon } from './CategoryIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onClearData: () => void;
  onClearMockData: () => void;
  onAddMockData: () => void;
  categories: string[];
  interests: string[];
  familyMembers?: string[];
  onAddCategory: (cat: string) => void;
  onRemoveCategory: (cat: string) => void;
  onAddInterest: (int: string) => void;
  onRemoveInterest: (int: string) => void;
  onAddFamilyMember?: (name: string) => void;
  onRemoveFamilyMember?: (name: string) => void;
  onLogout: () => void;
  items?: BucketItem[];
  onRestore?: (items: BucketItem[]) => void;
  onRestartTour?: () => void;
  onReauth?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings,
  onUpdateSettings,
  onClearData,
  onClearMockData,
  onAddMockData,
  categories,
  interests,
  familyMembers = [],
  onAddCategory,
  onRemoveCategory,
  onAddInterest,
  onRemoveInterest,
  onAddFamilyMember,
  onRemoveFamilyMember,
  onLogout,
  items = [],
  onRestore,
  onRestartTour,
  onReauth
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'preferences' | 'data'>('general');
  const [addingType, setAddingType] = useState<'cat' | 'tag' | 'family' | null>(null);
  const [inputValue, setInputValue] = useState('');
  
  // Backup State
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const isGuest = !driveService.getAccessToken();

  useEffect(() => {
    if (isOpen) {
        setLastBackup(driveService.getLastBackupTime());
        setBackupStatus('idle');
        setRestoreStatus('idle');
        setStatusMessage('');
        setAddingType(null);
        setInputValue('');
    }
  }, [isOpen]);

  const activeThemeStyles = useMemo(() => {
    switch (settings.theme) {
      case 'marvel':
        return {
          activeTravel: 'border-red-600 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
          accentColor: 'text-red-500'
        };
      case 'elsa':
        return {
          activeTravel: 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
          accentColor: 'text-orange-500'
        };
      case 'batman':
      default:
        return {
          activeTravel: 'border-yellow-500 bg-yellow-900/10 text-yellow-500 dark:bg-yellow-900/20 dark:text-yellow-400',
          accentColor: 'text-yellow-500'
        };
    }
  }, [settings.theme]);

  if (!isOpen) return null;

  const handleUpdate = (updates: Partial<AppSettings>) => {
    onUpdateSettings({ ...settings, ...updates });
  };

  const handleQuickAdd = () => {
    const val = inputValue.trim();
    if (!val) return;

    if (addingType === 'cat') {
        if (!categories.includes(val)) onAddCategory(val);
    } else if (addingType === 'tag') {
        if (!interests.includes(val)) onAddInterest(val);
    } else if (addingType === 'family' && onAddFamilyMember) {
        if (!familyMembers.includes(val)) onAddFamilyMember(val);
    }

    setInputValue('');
    setAddingType(null);
  };

  const handleBackup = async () => {
    if (isGuest) {
      alert("Please sign in with Google to use cloud backups.");
      return;
    }
    setBackupStatus('loading');
    setStatusMessage('');

    let result = await driveService.backup(items);
    
    if (!result.success && result.error === 'Unauthorized' && onReauth) {
        try {
            setStatusMessage('Session expired. Reconnecting...');
            await onReauth();
            setStatusMessage('Retrying backup...');
            result = await driveService.backup(items);
        } catch (e) {
            console.error("Reauth failed", e);
        }
    }

    if (result.success) {
        setBackupStatus('success');
        setLastBackup(result.timestamp);
        setStatusMessage('');
        setTimeout(() => setBackupStatus('idle'), 3000);
    } else {
        setBackupStatus('error');
        setStatusMessage(result.error === 'Unauthorized' ? 'Sign-in required' : 'Backup failed');
        setTimeout(() => {
            setBackupStatus('idle');
            setStatusMessage('');
        }, 3000);
    }
  };

  const handleRestore = async () => {
    if (isGuest) {
      alert("Please sign in with Google to restore from cloud.");
      return;
    }
    if (!onRestore) return;
    
    setRestoreStatus('loading');
    setStatusMessage('');

    let result = await driveService.restore();

    if (!result.success && result.error === 'Unauthorized' && onReauth) {
        try {
            setStatusMessage('Session expired. Reconnecting...');
            await onReauth();
            setStatusMessage('Retrying restore...');
            result = await driveService.restore();
        } catch (e) {
            console.error("Reauth failed", e);
        }
    }

    if (result.success && result.items) {
        onRestore(result.items);
        setRestoreStatus('success');
        setStatusMessage('');
        setTimeout(() => setRestoreStatus('idle'), 3000);
    } else {
        setRestoreStatus('error');
        setStatusMessage(result.error || 'Restore failed');
        setTimeout(() => {
            setRestoreStatus('idle');
            setStatusMessage('');
        }, 3000);
    }
  };
  
  const handleTestNotification = () => {
    const title = "Test Notification 📍";
    const body = "Knock Knock! This is a test for your bucket list radar.";
    sendNotification(title, body, 'test-radar');
    if (settings.voiceAlertsEnabled) speak(body);
    alert("Sent! Check your notification center and ensure sound is on.");
  };

  const renderThemeOption = (theme: Theme, label: string, icon: React.ReactNode, colorClass: string) => (
      <button 
        key={theme}
        onClick={() => handleUpdate({ theme })}
        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all ${
          settings.theme === theme 
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
            : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden ${colorClass}`}>
            {icon}
        </div>
        <span className="text-[7px] font-black uppercase truncate w-full text-center">{label}</span>
      </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm h-[550px] max-h-[90vh] flex flex-col shadow-2xl scale-100 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0 overflow-x-auto no-scrollbar bg-gray-50/50 dark:bg-gray-900/20">
          {[
            { id: 'general', label: 'General' },
            { id: 'preferences', label: 'Alerts' },
            { id: 'data', label: 'Data' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-3 overflow-y-auto no-scrollbar flex-grow space-y-5">
          {activeTab === 'general' && (
            <div className="space-y-5 animate-in slide-in-from-left duration-300">
              {/* THEMES */}
              <div className="space-y-1.5">
                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Theme</h3>
                <div className="grid grid-cols-3 gap-2">
                    {renderThemeOption('marvel', 'Marvel', 
                        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><circle cx="12" cy="12" r="10" fill="#B91C1C" /><circle cx="12" cy="12" r="7" fill="#FFFFFF" /><circle cx="12" cy="12" r="5" fill="#B91C1C" /><circle cx="12" cy="12" r="3" fill="#1D4ED8" /><path d="M12 9L12.5 11H14.5L13 12.5L13.5 14.5L12 13L10.5 14.5L11 12.5L9.5 11H11.5L12 9Z" fill="#FFFFFF" /></svg>, 
                        'bg-red-50'
                    )}
                    {renderThemeOption('batman', 'Batman', 
                        <div className="w-full h-full flex items-center justify-center p-1"><svg viewBox="0 0 100 60" fill="none" className="w-full h-full"><ellipse cx="50" cy="30" rx="46" ry="26" fill="#FFD700" stroke="#000000" strokeWidth="3" /><path fill="#000000" d="M50 33 C50 33, 52 28, 54 27 C 56 26, 58 25, 58 25 C 58 25, 59 24, 60 25 C 61 26, 60.5 27, 60.5 27 C 60.5 27, 64 26.5, 68 26.5 C 72 26.5, 78 27.5, 80 28.5 C 82 29.5, 86 33, 86 33 C 86 33, 86 30, 85 29 C 84 28, 83 26, 83 26 C 83 26, 89 29, 93 34 C 97 39, 97 43, 97 43 C 97 43, 95 41, 91 40 C 87 39, 84 40, 84 40 C 84 40, 86 42, 86 44 C 86 46, 85 49, 83 52 C 81 55, 78 57, 74 57 C 70 57, 68 55, 66 54 C 64 53, 63 52, 62 52 C 61 52, 60 53, 58 54 C 56 55, 54 57, 50 57 C 46 57, 44 54, 42 54 C 40 53, 39 52, 38 52 C 37 52, 36 53, 34 54 C 32 55, 30 57, 26 57 C 22 57, 19 55, 17 52 C 15 49, 14 46, 14 44 C 14 42, 16 40, 16 40 C 16 40, 13 39, 9 40 C 5 41, 3 43, 3 43 C 3 43, 3 39, 7 34 C 11 29, 17 26, 17 26 C 17 26, 16 28, 15 29 C 14 30, 14 33, 14 33 C 14 33, 18 29.5, 20 28.5 C 22 27.5, 28 26.5, 32 26.5 C 36 26.5, 39.5 27, 39.5 27 C 39.5 27, 39 26, 40 25 C 41 24, 42 25, 42 25 C 42 25, 44 26, 46 27 C 48 28, 50 33, 50 33 Z" /></svg></div>, 
                        'bg-gray-800'
                    )}
                    {renderThemeOption('elsa', 'Frozen', 
                         <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"><circle cx="12" cy="12" r="12" fill="#06b6d4" /><g stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"><path d="M12 4V20" /><path d="M4 12H20" /><path d="M6.34 6.34L17.66 17.66" /><path d="M6.34 17.66L17.66 6.34" /></g></svg>, 
                        'bg-cyan-100'
                    )}
                </div>
              </div>

              {/* CATEGORIES */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><List className="w-2.5 h-2.5"/> Categories</h3>
                    <button onClick={() => setAddingType(addingType === 'cat' ? null : 'cat')} className={`p-0.5 ${activeThemeStyles.accentColor} hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors`}><Plus className="w-3 h-3"/></button>
                </div>
                {addingType === 'cat' && (
                    <div className="flex gap-1.5 animate-in slide-in-from-top-1 duration-200">
                        <input autoFocus value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()} placeholder="Add category..." className="flex-1 text-[10px] p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg outline-none border border-gray-100 dark:border-gray-600" />
                        <button onClick={handleQuickAdd} className={`bg-gray-900 dark:bg-gray-100 dark:text-black text-white p-1.5 rounded-lg`}><Plus className="w-3.5 h-3.5"/></button>
                    </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => (
                        <div key={cat} className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-full border border-gray-100 dark:border-gray-700 transition-colors">
                            <CategoryIcon category={cat} className="w-2.5 h-2.5 text-gray-400" />
                            <span className="text-[9px] font-bold text-gray-700 dark:text-gray-200">{cat}</span>
                            <button onClick={() => onRemoveCategory(cat)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-2.5 h-2.5"/></button>
                        </div>
                    ))}
                </div>
              </div>

              {/* TAGS / INTERESTS */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Hash className="w-2.5 h-2.5"/> Tags</h3>
                    <button onClick={() => setAddingType(addingType === 'tag' ? null : 'tag')} className="p-0.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"><Plus className="w-3 h-3"/></button>
                </div>
                {addingType === 'tag' && (
                    <div className="flex gap-1.5 animate-in slide-in-from-top-1 duration-200">
                        <input autoFocus value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()} placeholder="Add tag..." className="flex-1 text-[10px] p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg outline-none border border-gray-100 dark:border-gray-600" />
                        <button onClick={handleQuickAdd} className="bg-blue-600 text-white p-1.5 rounded-lg"><Plus className="w-3.5 h-3.5"/></button>
                    </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                    {interests.map(int => (
                        <div key={int} className="flex items-center gap-1 px-2 py-1 bg-blue-50/30 dark:bg-blue-900/10 rounded-full border border-blue-100/50 dark:border-blue-800/50 transition-colors">
                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">#{int}</span>
                            <button onClick={() => onRemoveInterest(int)} className="text-blue-300 hover:text-red-500 transition-colors"><X className="w-2.5 h-2.5"/></button>
                        </div>
                    ))}
                </div>
              </div>

              {/* FAMILY */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Users className="w-2.5 h-2.5"/> Family</h3>
                    <button onClick={() => setAddingType(addingType === 'family' ? null : 'family')} className="p-0.5 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"><Plus className="w-3 h-3"/></button>
                </div>
                {addingType === 'family' && (
                    <div className="flex gap-1.5 animate-in slide-in-from-top-1 duration-200">
                        <input autoFocus value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()} placeholder="Name..." className="flex-1 text-[10px] p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg outline-none border border-gray-100 dark:border-gray-600" />
                        <button onClick={handleQuickAdd} className="bg-emerald-600 text-white p-1.5 rounded-lg"><Plus className="w-3.5 h-3.5"/></button>
                    </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-full border border-emerald-100/50 dark:border-emerald-800/50">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex items-center justify-center text-[6px] font-black text-white">ME</div>
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">Me</span>
                    </div>
                    {familyMembers.map(member => (
                        <div key={member} className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-full border border-gray-100 dark:border-gray-700 transition-colors">
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[6px] font-black text-gray-500 dark:text-gray-300">{member.charAt(0).toUpperCase()}</div>
                            <span className="text-[9px] font-bold text-gray-700 dark:text-gray-200">{member}</span>
                            <button onClick={() => onRemoveFamilyMember?.(member)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-2.5 h-2.5"/></button>
                        </div>
                    ))}
                </div>
              </div>

                <div className="pt-1.5">
                    <button 
                        onClick={onRestartTour}
                        className="w-full flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 transition-colors group"
                    >
                        <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Restart App Tour</span>
                        <PlayCircle className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors" />
                    </button>
                </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="space-y-3">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Car className="w-3 h-3" /> Preferred Travel Mode
                    </h3>
                    <div className="grid grid-cols-4 gap-1.5">
                        {(['driving', 'walking', 'bicycling', 'transit'] as TravelMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => handleUpdate({ travelMode: mode })}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${settings.travelMode === mode ? activeThemeStyles.activeTravel : 'border-gray-100 dark:border-gray-700 grayscale opacity-60'}`}
                            >
                                {mode === 'driving' && <Car className="w-4 h-4" />}
                                {mode === 'walking' && <Footprints className="w-4 h-4" />}
                                {mode === 'bicycling' && <Bike className="w-4 h-4" />}
                                {mode === 'transit' && <Bus className="w-4 h-4" />}
                                <span className="text-[7px] font-black uppercase">{mode}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <BellRing className="w-3 h-3" /> Alerts & Notifications
                    </h3>
                    
                    <div className="space-y-2">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-gray-700 dark:text-gray-200">Radar Proximity</label>
                                <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-gray-100 dark:bg-gray-800 ${activeThemeStyles.accentColor}`}>{(settings.proximityRange / 1000).toFixed(1)} km</span>
                            </div>
                            <input
                                type="range"
                                min="500"
                                max="50000"
                                step="500"
                                value={settings.proximityRange}
                                onChange={(e) => handleUpdate({ proximityRange: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-600"
                            />
                        </div>

                        <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700 cursor-pointer">
                            <div className="flex items-center gap-2.5">
                                <BellRing className={`w-4 h-4 ${activeThemeStyles.accentColor}`} />
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-900 dark:text-white">Push Notifications</span>
                                    <span className="text-[8px] text-gray-400">Receive alerts for nearby dreams</span>
                                </div>
                            </div>
                            <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => handleUpdate({ notificationsEnabled: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 accent-red-600" />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700 cursor-pointer">
                            <div className="flex items-center gap-2.5">
                                <Mic className="w-4 h-4 text-blue-500" />
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-900 dark:text-white">Voice Alerts</span>
                                    <span className="text-[8px] text-gray-400">Announce nearby dreams via speech</span>
                                </div>
                            </div>
                            <input type="checkbox" checked={settings.voiceAlertsEnabled} onChange={(e) => handleUpdate({ voiceAlertsEnabled: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600" />
                        </label>
                    </div>

                    <button onClick={handleTestNotification} className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors">
                        Run Diagnostic Alert
                    </button>
                </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Cloud className="w-12 h-12" />
                    </div>
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <Cloud className="w-4 h-4" />
                        <h3 className="font-black uppercase tracking-widest text-[11px]">Cloud Sync</h3>
                    </div>
                    
                    {isGuest ? (
                        <p className="text-[9px] text-blue-100 mb-2 relative z-10 leading-relaxed">Sign in with Google to enable automatic backups.</p>
                    ) : (
                        <div className="relative z-10">
                            <label className="flex items-center justify-between mb-2 bg-white/10 p-2 rounded-xl backdrop-blur-sm cursor-pointer border border-white/10">
                                <span className="text-[9px] font-black uppercase tracking-widest">Auto Backup</span>
                                <input type="checkbox" checked={settings.autoBackupEnabled} onChange={(e) => handleUpdate({ autoBackupEnabled: e.target.checked })} className="w-3.5 h-3.5 rounded border-white/30 bg-transparent text-white focus:ring-white accent-white" />
                            </label>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={handleBackup}
                                    disabled={backupStatus === 'loading'}
                                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md ${backupStatus === 'success' ? 'bg-green-500' : (backupStatus === 'error' ? 'bg-red-500' : 'bg-white text-blue-600')}`}
                                >
                                    {backupStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                    {backupStatus === 'success' ? 'Synced' : (backupStatus === 'error' ? 'Failed' : 'Push')}
                                </button>

                                <button 
                                    onClick={handleRestore}
                                    disabled={restoreStatus === 'loading'}
                                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md bg-blue-900/30 border border-white/20`}
                                >
                                    {restoreStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                    {restoreStatus === 'success' ? 'Loaded' : 'Fetch'}
                                </button>
                            </div>
                            {statusMessage && (
                                <p className="text-[8px] text-center mt-1.5 font-bold opacity-80 animate-pulse">{statusMessage}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-1.5">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Management</h3>
                    <div className="space-y-1.5">
                         <button 
                            onClick={() => { if(confirm("Clear local data? Cloud backup remains.")) { onClearData(); onClose(); } }}
                            className="w-full flex items-center justify-between p-3 text-left rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Eraser className="w-4 h-4" />
                                <div>
                                    <span className="block text-[10px] font-bold">Clear Cache</span>
                                </div>
                            </div>
                        </button>
                        
                        <button 
                            onClick={onLogout}
                            className="w-full flex items-center gap-2.5 p-3 text-left rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-[10px] font-bold">Logout</span>
                        </button>
                    </div>
                </div>

                 <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Experimental</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={onAddMockData} className="px-2 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-xl text-[8px] font-black uppercase text-gray-500 flex items-center justify-center gap-1.5">
                            <Database className="w-2.5 h-2.5" /> Mock
                        </button>
                        <button onClick={onClearMockData} className="px-2 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-xl text-[8px] font-black uppercase text-gray-500 flex items-center justify-center gap-1.5">
                             <Trash2 className="w-2.5 h-2.5" /> Reset
                        </button>
                    </div>
                 </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
