
import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Monitor, Trash2, Plus, Cloud, Upload, Download, Loader2, CheckCircle2, Eraser, AlertCircle, Volume2, FileJson, FileSpreadsheet, PlayCircle, Database, LogOut } from 'lucide-react';
import { Theme } from '../types';
import { driveService } from '../services/driveService';
import { BucketItem } from '../types';
import { sendNotification, speak } from '../utils/geo';
import { CategoryIcon } from './CategoryIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
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
  proximityRange: number;
  onProximityRangeChange: (range: number) => void;
  onRestartTour?: () => void;
  onReauth?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentTheme, 
  onThemeChange, 
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
  proximityRange,
  onProximityRangeChange,
  onRestartTour,
  onReauth
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'interests' | 'family' | 'data'>('general');
  const [newItemInput, setNewItemInput] = useState('');
  
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!newItemInput.trim()) return;
    if (activeTab === 'categories') onAddCategory(newItemInput.trim());
    if (activeTab === 'interests') onAddInterest(newItemInput.trim());
    if (activeTab === 'family' && onAddFamilyMember) onAddFamilyMember(newItemInput.trim());
    setNewItemInput('');
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
  
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `just_knock_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Description', 'Location', 'Latitude', 'Longitude', 'Category', 'Status', 'Completed Date', 'Owner', 'Interests'];
    const rows = items.map(item => {
      const escape = (val: string | undefined) => {
        if (!val) return '';
        return `"${String(val).replace(/"/g, '""')}"`;
      };
      
      const status = item.completed ? 'Completed' : 'Pending';
      const completedDate = item.completedAt ? new Date(item.completedAt).toISOString().split('T')[0] : '';
      const interests = item.interests ? item.interests.join(';') : '';
      
      return [
        escape(item.id),
        escape(item.title),
        escape(item.description),
        escape(item.locationName),
        item.coordinates?.latitude || '',
        item.coordinates?.longitude || '',
        escape(item.category),
        escape(status),
        escape(completedDate),
        escape(item.owner),
        escape(interests)
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `just_knock_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTestNotification = () => {
    const title = "Test Notification 📍";
    const body = "Knock Knock! This is a test for your bucket list radar.";
    sendNotification(title, body, 'test-radar');
    speak(body);
    alert("Sent! Check your notification center and ensure sound is on.");
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderThemeOption = (theme: Theme, label: string, icon: React.ReactNode, colorClass: string) => (
      <button 
        key={theme}
        onClick={() => {
            onThemeChange(theme);
            onClose();
        }}
        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
          currentTheme === theme 
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 scale-105' 
            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${colorClass}`}>
            {icon}
        </div>
        <span className="text-xs font-medium capitalize truncate w-full text-center">{label}</span>
      </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm h-[600px] max-h-[90vh] flex flex-col shadow-2xl scale-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 dark:border-gray-700 shrink-0 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            General
          </button>
          <button 
            onClick={() => setActiveTab('family')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'family' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Family
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Categories
          </button>
          <button 
            onClick={() => setActiveTab('interests')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'interests' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Interests
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'data' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            Data
          </button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar flex-grow">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                    {renderThemeOption('marvel', 'Marvel', 
                        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                            <circle cx="12" cy="12" r="10" fill="#B91C1C" />
                            <circle cx="12" cy="12" r="7" fill="#FFFFFF" />
                            <circle cx="12" cy="12" r="5" fill="#B91C1C" />
                            <circle cx="12" cy="12" r="3" fill="#1D4ED8" />
                            <path d="M12 9L12.5 11H14.5L13 12.5L13.5 14.5L12 13L10.5 14.5L11 12.5L9.5 11H11.5L12 9Z" fill="#FFFFFF" />
                        </svg>, 
                        'bg-red-50'
                    )}
                    
                    {renderThemeOption('batman', 'Batman', 
                        <div className="w-full h-full flex items-center justify-center p-1">
                           <svg viewBox="0 0 100 60" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                                <ellipse cx="50" cy="30" rx="46" ry="26" fill="#FFD700" stroke="#000000" strokeWidth="3" />
                                <path fill="#000000" d="M50 33 C50 33, 52 28, 54 27 C 56 26, 58 25, 58 25 C 58 25, 59 24, 60 25 C 61 26, 60.5 27, 60.5 27 C 60.5 27, 64 26.5, 68 26.5 C 72 26.5, 78 27.5, 80 28.5 C 82 29.5, 86 33, 86 33 C 86 33, 86 30, 85 29 C 84 28, 83 26, 83 26 C 83 26, 89 29, 93 34 C 97 39, 97 43, 97 43 C 97 43, 95 41, 91 40 C 87 39, 84 40, 84 40 C 84 40, 86 42, 86 44 C 86 46, 85 49, 83 52 C 81 55, 78 57, 74 57 C 70 57, 68 55, 66 54 C 64 53, 63 52, 62 52 C 61 52, 60 53, 58 54 C 56 55, 54 57, 50 57 C 46 57, 44 54, 42 54 C 40 53, 39 52, 38 52 C 37 52, 36 53, 34 54 C 32 55, 30 57, 26 57 C 22 57, 19 55, 17 52 C 15 49, 14 46, 14 44 C 14 42, 16 40, 16 40 C 16 40, 13 39, 9 40 C 5 41, 3 43, 3 43 C 3 43, 3 39, 7 34 C 11 29, 17 26, 17 26 C 17 26, 16 28, 15 29 C 14 30, 14 33, 14 33 C 14 33, 18 29.5, 20 28.5 C 22 27.5, 28 26.5, 32 26.5 C 36 26.5, 39.5 27, 39.5 27 C 39.5 27, 39 26, 40 25 C 41 24, 42 25, 42 25 C 42 25, 44 26, 46 27 C 48 28, 50 33, 50 33 Z" />
                            </svg>
                        </div>, 
                        'bg-gray-800'
                    )}
                    
                    {renderThemeOption('elsa', 'Frozen', 
                         <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                            <circle cx="12" cy="12" r="12" fill="#06b6d4" />
                            <circle cx="12" cy="12" r="10.5" fill="none" stroke="#a5f3fc" strokeWidth="0.5" />
                            <g stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M12 4V20" />
                                <path d="M4 12H20" />
                                <path d="M6.34 6.34L17.66 17.66" />
                                <path d="M6.34 17.66L17.66 6.34" />
                            </g>
                        </svg>, 
                        'bg-cyan-100'
                    )}
                </div>
              </div>

               <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Radar Settings</h3>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Proximity Range</label>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">{(proximityRange / 1000).toFixed(1)} km</span>
                        </div>
                        <input
                            type="range"
                            min="1000"
                            max="50000"
                            step="500"
                            value={proximityRange}
                            onChange={(e) => onProximityRangeChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-600"
                        />
                    </div>
                </div>

                {onRestartTour && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <button 
                            onClick={onRestartTour}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Restart Tour</span>
                            <PlayCircle className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  placeholder="New Category..."
                  className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none focus:ring-1 focus:ring-red-500 text-sm text-gray-900 dark:text-gray-100"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <button onClick={handleAddItem} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <span key={cat} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2 group border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                    <CategoryIcon category={cat} className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    {cat}
                    <button onClick={() => onRemoveCategory(cat)} className="ml-1 text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'family' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  placeholder="Add Family Member..."
                  className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none focus:ring-1 focus:ring-red-500 text-sm text-gray-900 dark:text-gray-100"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <button onClick={handleAddItem} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">ME</div>
                         <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Me (Owner)</span>
                    </div>
                </div>
                {familyMembers.map(member => (
                  <div key={member} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl group">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">
                             {getInitials(member)}
                         </div>
                         <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{member}</span>
                    </div>
                    {onRemoveFamilyMember && (
                        <button onClick={() => onRemoveFamilyMember(member)} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interests' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  placeholder="New Interest..."
                  className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none focus:ring-1 focus:ring-red-500 text-sm text-gray-900 dark:text-gray-100"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <button onClick={handleAddItem} className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map(int => (
                  <span key={int} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2 group">
                    {int}
                    <button onClick={() => onRemoveInterest(int)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
                
                {/* Backup / Cloud Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                        <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Google Drive Backup</h3>
                    </div>
                    
                    {isGuest ? (
                        <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">Sign in to enable cloud backups.</p>
                    ) : (
                        <>
                            {lastBackup && (
                                <p className="text-[10px] text-blue-600 dark:text-blue-300 mb-3 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Last saved: {new Date(lastBackup).toLocaleString()}
                                </p>
                            )}
                            
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={handleBackup}
                                    disabled={backupStatus === 'loading'}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold text-white transition-all ${backupStatus === 'success' ? 'bg-green-500' : (backupStatus === 'error' ? 'bg-red-500' : 'bg-blue-600 hover:bg-blue-700')}`}
                                >
                                    {backupStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    {backupStatus === 'success' ? 'Saved' : (backupStatus === 'error' ? 'Failed' : 'Backup Now')}
                                </button>

                                <button 
                                    onClick={handleRestore}
                                    disabled={restoreStatus === 'loading'}
                                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 transition-all`}
                                >
                                    {restoreStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    {restoreStatus === 'success' ? 'Restored' : 'Restore'}
                                </button>
                            </div>
                            {statusMessage && (
                                <p className="text-[10px] text-center mt-2 font-medium opacity-70 animate-pulse">{statusMessage}</p>
                            )}
                        </>
                    )}
                </div>

                {/* Export Section */}
                <div>
                     <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Export Data</h3>
                     <div className="grid grid-cols-2 gap-3">
                         <button onClick={handleExportJSON} className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                             <FileJson className="w-5 h-5 text-gray-500" />
                             <span className="text-xs font-medium text-gray-600 dark:text-gray-300">JSON</span>
                         </button>
                         <button onClick={handleExportCSV} className="flex flex-col items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                             <FileSpreadsheet className="w-5 h-5 text-green-600" />
                             <span className="text-xs font-medium text-gray-600 dark:text-gray-300">CSV</span>
                         </button>
                     </div>
                </div>

                {/* Reset Section */}
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Danger Zone</h3>
                    <div className="space-y-2">
                         <button 
                            onClick={() => { if(confirm("Clear local data? Cloud backup remains.")) { onClearData(); onClose(); } }}
                            className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                            <div>
                                <span className="block text-sm font-bold">Clear All Local Data</span>
                                <span className="block text-[10px] opacity-70">Removes items from device only</span>
                            </div>
                        </button>
                        
                        <button 
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-bold">Sign Out</span>
                        </button>
                    </div>
                </div>

                 {/* Testing Tools */}
                 <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dev Tools</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={onAddMockData} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-1">
                            <Database className="w-3 h-3" /> Add Mock Data
                        </button>
                        <button onClick={onClearMockData} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-1">
                             <Eraser className="w-3 h-3" /> Clear Mock
                        </button>
                        <button onClick={handleTestNotification} className="col-span-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-1">
                             <Volume2 className="w-3 h-3" /> Test Radar Alert
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
