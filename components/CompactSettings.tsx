
import React from 'react';
import { Theme } from '../types';

interface CompactSettingsProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  proximityRange: number;
  onProximityRangeChange: (range: number) => void;
}

export const CompactSettings: React.FC<CompactSettingsProps> = ({
  currentTheme,
  onThemeChange,
  proximityRange,
  onProximityRangeChange,
}) => {
  const renderThemeOption = (theme: Theme, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => onThemeChange(theme)}
      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all w-full aspect-square ${
        currentTheme === theme
          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md scale-105'
          : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
      }`}
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wide ${currentTheme === theme ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 animate-in slide-in-from-top-2 fade-in duration-200">
      
      {/* Themes Section */}
      <div className="mb-6">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {renderThemeOption('marvel', 'Marvel', (
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
               {/* Captain America Shield Style */}
              <circle cx="12" cy="12" r="11" fill="#B91C1C" />
              <circle cx="12" cy="12" r="8" fill="#F3F4F6" />
              <circle cx="12" cy="12" r="5" fill="#B91C1C" />
              <circle cx="12" cy="12" r="2.5" fill="#1D4ED8" />
              <path d="M12 10.5L12.4 11.7H13.7L12.6 12.5L13 13.7L12 12.9L11 13.7L11.4 12.5L10.3 11.7H11.6L12 10.5Z" fill="white" />
            </svg>
          ))}
          {renderThemeOption('batman', 'Batman', (
            <svg viewBox="0 0 100 60" className="w-full h-full drop-shadow-sm">
                <ellipse cx="50" cy="30" rx="48" ry="28" fill="#FFD700" stroke="#000000" strokeWidth="2" />
                <path fill="#000000" d="M50 33 C50 33, 52 28, 54 27 C 56 26, 58 25, 58 25 C 58 25, 59 24, 60 25 C 61 26, 60.5 27, 60.5 27 C 60.5 27, 64 26.5, 68 26.5 C 72 26.5, 78 27.5, 80 28.5 C 82 29.5, 86 33, 86 33 C 86 33, 86 30, 85 29 C 84 28, 83 26, 83 26 C 83 26, 89 29, 93 34 C 97 39, 97 43, 97 43 C 97 43, 95 41, 91 40 C 87 39, 84 40, 84 40 C 84 40, 86 42, 86 44 C 86 46, 85 49, 83 52 C 81 55, 78 57, 74 57 C 70 57, 68 55, 66 54 C 64 53, 63 52, 62 52 C 61 52, 60 53, 58 54 C 56 55, 54 57, 50 57 C 46 57, 44 54, 42 54 C 40 53, 39 52, 38 52 C 37 52, 36 53, 34 54 C 32 55, 30 57, 26 57 C 22 57, 19 55, 17 52 C 15 49, 14 46, 14 44 C 14 42, 16 40, 16 40 C 16 40, 13 39, 9 40 C 5 41, 3 43, 3 43 C 3 43, 3 39, 7 34 C 11 29, 17 26, 17 26 C 17 26, 16 28, 15 29 C 14 30, 14 33, 14 33 C 14 33, 18 29.5, 20 28.5 C 22 27.5, 28 26.5, 32 26.5 C 36 26.5, 39.5 27, 39.5 27 C 39.5 27, 39 26, 40 25 C 41 24, 42 25, 42 25 C 42 25, 44 26, 46 27 C 48 28, 50 33, 50 33 Z" />
            </svg>
          ))}
          {renderThemeOption('elsa', 'Frozen', (
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full drop-shadow-sm">
                <circle cx="12" cy="12" r="11" fill="#06b6d4" />
                <path d="M12 4V20M4 12H20M6.34 6.34L17.66 17.66M6.34 17.66L17.66 6.34" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ))}
        </div>
      </div>

      {/* Radar Section */}
      <div>
        <div className="flex justify-between items-center mb-3">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Radar Settings</h3>
             <span className="text-xs font-bold text-red-500">{(proximityRange / 1000).toFixed(1)} km</span>
        </div>
        <div className="relative h-6 flex items-center">
            <input
                type="range"
                min="1000"
                max="50000"
                step="500"
                value={proximityRange}
                onChange={(e) => onProximityRangeChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
        </div>
        <p className="text-[9px] text-gray-400 mt-2">
            Alert me when I am within this distance of a dream.
        </p>
      </div>
    </div>
  );
};
