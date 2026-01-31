import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Moon, Sun, Trash2, Plus, Cloud, Upload, Download, Loader2, 
  Eraser, BellRing, Mic, Tag, Users, FileDown, FileSpreadsheet, 
  Clock, Star, Car, Footprints, Bike, Bus, Database, LogOut, 
  PlayCircle, ListFilter, Hash, CheckCircle2, Ruler
} from 'lucide-react';
import { Theme, TravelMode, AppSettings, BucketItem, DistanceUnit } from '../types';
import { driveService } from '../services/driveService';
import { parseCsvToBucketItems, exportToCsv, exportToJson } from '../utils/dataConverter';
import { triggerHaptic } from '../utils/haptics';
import { toast } from '../utils/toast';

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
  isOpen, onClose, settings, onUpdateSettings, onClearData, onClearMockData, onAddMockData,
  categories, interests, familyMembers = [], onAddCategory, onRemoveCategory,
  onAddInterest, onRemoveInterest, onAddFamilyMember, onRemoveFamilyMember,
  onLogout, items = [], onRestore, onRestartTour, onReauth
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'preferences' | 'data'>('general');
  const [addingType, setAddingType] = useState<'cat' | 'tag' | 'family' | null>(null);
  const [inputValue, setInputValue] = useState('');
  
  // Backup State
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const isGuest = !driveService.getAccessToken();

  useEffect(() => {
    if (isOpen) {
        setLastBackup(driveService.getLastBackupTime());
        setBackupStatus('idle');
        setRestoreStatus('idle');
        setAddingType(null);
        setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (updates: Partial<AppSettings>) => {
    onUpdateSettings({ ...settings, ...updates });
  };

  const handleQuickAdd = () => {
    const val = inputValue.trim();
    if (!val) return;
    if (addingType === 'cat') { if (!categories.includes(val)) onAddCategory(val); }
    else if (addingType === 'tag') { if (!interests.includes(val)) onAddInterest(val); }
    else if (addingType === 'family' && onAddFamilyMember) { if (!familyMembers.includes(val)) onAddFamilyMember(val); }
    setInputValue('');
    setAddingType(null);
  };

  const handleBackup = async () => {
    if (isGuest) { 
        toast.warning("Sign in with Google to use cloud backups."); 
        return; 
    }
    setBackupStatus('loading');
    toast.info("Connecting to Google Drive...");
    let result = await driveService.backup(items || []);
    if (!result.success && result.error === 'Unauthorized' && onReauth) {
        try {
            await onReauth();
            result = await driveService.backup(items || []);
        } catch (e) { console.error(e); }
    }
    if (result.success) {
        setBackupStatus('success');
        setLastBackup(result.timestamp);
        toast.success("Dreams backed up successfully!");
        setTimeout(() => setBackupStatus('idle'), 3000);
    } else {
        setBackupStatus('error');
        toast.error("Cloud backup failed.");
        setTimeout(() => setBackupStatus('idle'), 3000);
    }
  };

  const handleRestore = async () => {
    if (isGuest) { 
        toast.warning("Sign in with Google to restore dreams."); 
        return; 
    }
    setRestoreStatus('loading');
    toast.info("Retrieving your dreams from the cloud...");
    let result = await driveService.restore();
    if (result.success && result.items && onRestore) {
        onRestore(result.items);
        setRestoreStatus('success');
        toast.success("Restoration complete! Welcome back.");
        setTimeout(() => setRestoreStatus('idle'), 3000);
    } else {
        setRestoreStatus('error');
        toast.error("Could not find backup file.");
        setTimeout(() => setRestoreStatus('idle'), 3000);
    }
  };

  const handleFileImport = (type: 'json' | 'csv') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info(`Importing ${file.name}...`);
    const reader = new FileReader();

    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) {
            toast.error("File is empty or could not be read.");
            return;
        }

        try {
            let importedItems: BucketItem[] = [];
            if (type === 'json') {
                importedItems = JSON.parse(text);
            } else {
                importedItems = parseCsvToBucketItems(text);
            }
            
            if (Array.isArray(importedItems) && importedItems.length > 0 && onRestore) {
                if (confirm(`Found ${importedItems.length} dreams. Import them now? This will replace your current list.`)) {
                    onRestore(importedItems);
                    triggerHaptic('success');
                    e.target.value = '';
                }
            } else if (importedItems.length === 0) {
                toast.warning("No valid items found. Please check your CSV format.");
                e.target.value = '';
            } else {
                throw new Error("Invalid format");
            }
        } catch (err) {
            console.error("Import error detail:", err);
            toast.error(`Failed to parse ${type.toUpperCase()}. Check the schema.`);
            e.target.value = '';
        }
    };

    reader.onerror = (err) => {
        console.error("FileReader error:", err);
        toast.error("Disk error reading the file.");
        e.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleDownload = (type: 'json' | 'csv') => {
    const content = type === 'json' ? exportToJson(items || []) : exportToCsv(items || []);
    const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `just_knock_backup_${new Date().toISOString().split('T')[0]}.${type}`;
    a.click();
    URL.revokeObjectURL(url);
    triggerHaptic('medium');
    toast.success(`${type.toUpperCase()} export started.`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1b1e] text-white rounded-3xl w-full max-w-sm h-[620px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-800">
        
        <div className="fixed -top-96 -left-96 opacity-0 pointer-events-none">
            <input 
              type="file" 
              ref={jsonInputRef} 
              onChange={handleFileImport('json')} 
              accept="application/json,.json" 
            />
            <input 
              type="file" 
              ref={csvInputRef} 
              onChange={handleFileImport('csv')} 
              accept=".csv,text/csv,application/vnd.ms-excel" 
            />
        </div>

        <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex px-2 border-b border-gray-800 shrink-0 bg-[#1a1b1e]">
          {[
            { id: 'general', label: 'General' },
            { id: 'preferences', label: 'Preferences' },
            { id: 'data', label: 'Data' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === tab.id ? 'border-red-500 text-white' : 'border-transparent text-gray-500'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto no-scrollbar flex-grow">
          {activeTab === 'general' && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Visual Theme</h3>
                    <div className="grid grid-cols-3 gap-3">
                         {['marvel', 'batman', 'elsa'].map((t) => (
                             <button 
                                key={t}
                                onClick={() => { handleUpdate({ theme: t as Theme }); toast.info(`Theme set to ${t}.`); }}
                                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${settings.theme === t ? 'border-red-500 bg-red-500/10' : 'border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700'}`}
                             >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t === 'marvel' ? 'bg-red-600' : t === 'batman' ? 'bg-yellow-500' : t === 'elsa' ? 'bg-cyan-500' : ''}`}>
                                    {t === 'marvel' && <Star className="w-4 h-4 text-white" />}
                                    {t === 'batman' && <Moon className="w-4 h-4 text-black" />}
                                    {t === 'elsa' && <Sun className="w-4 h-4 text-white" />}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest">{t}</span>
                             </button>
                         ))}
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-800">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Radar Proximity</h3>
                        <span className="text-xs font-black text-red-500">{settings.proximityRange / 1000} km</span>
                    </div>
                    <input 
                        type="range" 
                        min="500" max="10000" step="500" 
                        value={settings.proximityRange} 
                        onChange={(e) => handleUpdate({ proximityRange: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                    <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                        Alert distance for nearby dreams
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-800">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Distance Unit</h3>
                    <div className="grid grid-cols-2 gap-3">
                         {(['km', 'mi'] as DistanceUnit[]).map((unit) => (
                             <button 
                                key={unit}
                                onClick={() => { handleUpdate({ distanceUnit: unit }); toast.info(`Units set to ${unit === 'km' ? 'Kilometers' : 'Miles'}.`); }}
                                className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${settings.distanceUnit === unit ? 'border-red-500 bg-red-500/10' : 'border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700'}`}
                             >
                                <Ruler className={`w-4 h-4 ${settings.distanceUnit === unit ? 'text-red-500' : 'text-gray-600'}`} />
                                <span className="text-[11px] font-black uppercase tracking-widest">{unit === 'km' ? 'Kilometers' : 'Miles'}</span>
                             </button>
                         ))}
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-800">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Travel Mode</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {(['driving', 'walking', 'bicycling', 'transit'] as TravelMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => { handleUpdate({ travelMode: mode }); toast.info(`Travel mode: ${mode}`); }}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${settings.travelMode === mode ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-800 bg-gray-900/50 text-gray-500'}`}
                            >
                                {mode === 'driving' && <Car className="w-4 h-4" />}
                                {mode === 'walking' && <Footprints className="w-4 h-4" />}
                                {mode === 'bicycling' && <Bike className="w-4 h-4" />}
                                {mode === 'transit' && <Bus className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <BellRing className="w-5 h-5 text-red-500" />
                             <span className="text-xs font-bold">Push Notifications</span>
                         </div>
                         <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => handleUpdate({ notificationsEnabled: e.target.checked })} className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-red-500 focus:ring-0" />
                    </div>
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <Mic className="w-5 h-5 text-blue-500" />
                             <span className="text-xs font-bold">Voice Alerts</span>
                         </div>
                         <input type="checkbox" checked={settings.voiceAlertsEnabled} onChange={(e) => handleUpdate({ voiceAlertsEnabled: e.target.checked })} className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-0" />
                    </div>
                </div>
             </div>
          )}

          {activeTab === 'preferences' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" /> Family Members
                          </h3>
                          <button onClick={() => setAddingType('family')} className="p-1.5 bg-gray-800 rounded-lg hover:text-red-500 transition-colors"><Plus className="w-3.5 h-3.5"/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {familyMembers.map(item => (
                            <div key={item} className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-xl group">
                                <span className="text-[11px] font-bold">{item}</span>
                                <button onClick={() => onRemoveFamilyMember?.(item)} className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button>
                            </div>
                        ))}
                      </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-800">
                      <div className="flex justify-between items-center">
                          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <ListFilter className="w-3.5 h-3.5" /> Categories
                          </h3>
                          <button onClick={() => setAddingType('cat')} className="p-1.5 bg-gray-800 rounded-lg hover:text-red-500 transition-colors"><Plus className="w-3.5 h-3.5"/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(item => (
                            <div key={item} className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-xl group">
                                <span className="text-[11px] font-bold">{item}</span>
                                <button onClick={() => onRemoveCategory(item)} className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button>
                            </div>
                        ))}
                      </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-800">
                      <div className="flex justify-between items-center">
                          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Hash className="w-3.5 h-3.5" /> Interests
                          </h3>
                          <button onClick={() => setAddingType('tag')} className="p-1.5 bg-gray-800 rounded-lg hover:text-red-500 transition-colors"><Plus className="w-3.5 h-3.5"/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {interests.map(item => (
                            <div key={item} className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-xl group">
                                <span className="text-[11px] font-bold">#{item}</span>
                                <button onClick={() => onRemoveInterest(item)} className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button>
                            </div>
                        ))}
                      </div>
                  </div>

                  {addingType && (
                      <div className="fixed inset-0 z-[110] flex items-end p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                          <div className="w-full bg-[#2a2d35] p-6 rounded-3xl shadow-2xl border border-gray-700 animate-in slide-up duration-300">
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Add {addingType === 'family' ? 'Member' : addingType === 'cat' ? 'Category' : 'Interest'}</h4>
                            <div className="flex gap-2">
                                <input 
                                    autoFocus 
                                    value={inputValue} 
                                    onChange={(e) => setInputValue(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()} 
                                    placeholder="Enter name..." 
                                    className="flex-1 text-sm p-4 bg-gray-900 border border-gray-800 rounded-2xl outline-none focus:border-red-500" 
                                />
                                <button onClick={handleQuickAdd} className="bg-red-600 p-4 rounded-2xl text-white font-bold"><CheckCircle2 className="w-5 h-5"/></button>
                                <button onClick={() => setAddingType(null)} className="bg-gray-800 p-4 rounded-2xl text-gray-400"><X className="w-5 h-5"/></button>
                            </div>
                          </div>
                      </div>
                  )}

                  <div className="pt-4 border-t border-gray-800 space-y-3">
                      <button onClick={onRestartTour} className="w-full flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-2xl hover:bg-gray-800 transition-colors">
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Restart App Tour</span>
                          <PlayCircle className="w-5 h-5 text-red-500" />
                      </button>
                  </div>
              </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Cloud Backup</h3>
                    <div className="bg-[#1e293b] rounded-2xl p-3 border border-blue-500/20 shadow-xl relative overflow-hidden group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/20 rounded-xl">
                                <Cloud className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-white">Google Drive</h4>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400/80">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span className="truncate">Last synced: {lastBackup ? new Date(lastBackup).toLocaleString() : 'Never'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={handleBackup} disabled={backupStatus === 'loading'} className="flex items-center justify-center gap-2 py-3 bg-[#2a2d35] rounded-xl border border-gray-800 hover:bg-[#323640] transition-all font-bold text-[11px]">
                            {backupStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin text-blue-400" /> : <Upload className="w-3 h-3 text-blue-400" />}
                            Backup
                        </button>
                        <button type="button" onClick={handleRestore} disabled={restoreStatus === 'loading'} className="flex items-center justify-center gap-2 py-3 bg-[#2a2d35] rounded-xl border border-gray-800 hover:bg-[#323640] transition-all font-bold text-[11px]">
                            {restoreStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin text-emerald-400" /> : <Download className="w-3 h-3 text-emerald-400" />}
                            Restore
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Export & Import</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                            <button type="button" onClick={() => handleDownload('json')} className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600/10 border border-purple-500/30 text-purple-400 rounded-xl hover:bg-purple-600/20 transition-all text-[10px] font-black uppercase tracking-widest">
                                <FileDown className="w-3 h-3" /> JSON
                            </button>
                            <button type="button" onClick={() => jsonInputRef.current?.click()} className="w-full py-2 bg-gray-900 border border-gray-800 text-gray-500 rounded-lg hover:text-white transition-all text-[8px] font-bold uppercase tracking-widest">Import JSON</button>
                        </div>
                        <div className="space-y-1.5">
                            <button type="button" onClick={() => handleDownload('csv')} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-600/20 transition-all text-[10px] font-black uppercase tracking-widest">
                                <FileSpreadsheet className="w-3 h-3" /> CSV
                            </button>
                            <button type="button" onClick={() => csvInputRef.current?.click()} className="w-full py-2 bg-gray-900 border border-gray-800 text-gray-500 rounded-lg hover:text-white transition-all text-[8px] font-bold uppercase tracking-widest">Import CSV</button>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Local Data</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={onAddMockData} className="flex items-center justify-center gap-2 py-3 bg-[#1e2a3b] border border-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-900/30 transition-all text-[10px] font-bold">
                            <Database className="w-3 h-3" /> Add Mock Data
                        </button>
                        <button type="button" onClick={onClearMockData} className="flex items-center justify-center gap-2 py-3 bg-orange-500/5 border border-orange-500/20 text-orange-400 rounded-xl hover:bg-orange-500/10 transition-all text-[10px] font-bold">
                            <Eraser className="w-3 h-3" /> Clear Mock
                        </button>
                    </div>
                    <button type="button" onClick={() => { if(confirm("Permanently delete ALL data?")) onClearData(); }} className="w-full flex items-center justify-center gap-2 py-3 bg-[#2a1a1a] border border-red-500/20 text-red-500 rounded-xl hover:bg-red-900/20 transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                        <Trash2 className="w-3 h-3" /> Reset All Data
                    </button>
                </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-800 flex justify-between items-center bg-[#1a1b1e]">
            <button onClick={onLogout} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" /> Logout
            </button>
            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">v1.9 • JK</p>
        </div>
      </div>
    </div>
  );
};