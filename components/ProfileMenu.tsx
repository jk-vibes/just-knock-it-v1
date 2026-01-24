
import React, { useRef, useEffect } from 'react';
import { LogOut, User as UserIcon, Settings, Shield, X } from 'lucide-react';
import { User, Theme } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface ProfileMenuProps {
  user: User;
  theme: Theme;
  onLogout: () => void;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ user, theme, onLogout, onClose, onOpenSettings }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('warning');
    onLogout();
  };

  const s = (() => {
    switch (theme) {
      case 'elsa':
        return {
          card: 'bg-white/95 border-cyan-100 backdrop-blur-xl shadow-cyan-200/50',
          text: 'text-cyan-900',
          subText: 'text-cyan-600/70',
          hover: 'hover:bg-cyan-50',
          accent: 'text-orange-500',
          border: 'border-cyan-50'
        };
      case 'batman':
        return {
          card: 'bg-gray-900/95 border-gray-800 backdrop-blur-xl shadow-black/50',
          text: 'text-white',
          subText: 'text-gray-400',
          hover: 'hover:bg-white/5',
          accent: 'text-yellow-500',
          border: 'border-gray-800'
        };
      default:
        return {
          card: 'bg-white/95 border-slate-200 backdrop-blur-xl shadow-slate-200/50',
          text: 'text-slate-900',
          subText: 'text-slate-500',
          hover: 'hover:bg-slate-50',
          accent: 'text-red-500',
          border: 'border-slate-100'
        };
    }
  })();

  return (
    <div 
      ref={menuRef}
      className={`absolute top-full right-0 mt-2 w-64 rounded-[2rem] border shadow-2xl z-[100] overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 ${s.card}`}
    >
      {/* User Header */}
      <div className={`p-5 pb-4 border-b ${s.border}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/20 shadow-sm">
            <img src={user.photoUrl || "https://ui-avatars.com/api/?name=User"} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-black text-sm truncate leading-tight ${s.text}`}>{user.name}</h4>
            <p className={`text-[10px] font-bold truncate opacity-60 ${s.subText}`}>{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 text-green-600 w-fit">
          <Shield className="w-3 h-3" />
          <span className="text-[8px] font-black uppercase tracking-widest">Authenticated</span>
        </div>
      </div>

      {/* Menu Options */}
      <div className="p-2">
        <button 
          type="button"
          onClick={() => { onOpenSettings(); onClose(); }}
          className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group ${s.hover}`}
        >
          <div className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-800 group-hover:scale-110 transition-transform`}>
            <Settings className="w-4 h-4 text-gray-400" />
          </div>
          <span className={`text-xs font-bold ${s.text}`}>Preferences</span>
        </button>

        <button 
          type="button"
          onClick={handleLogoutClick}
          className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group ${s.hover} active:scale-95`}
        >
          <div className={`p-2 rounded-xl bg-red-50 dark:bg-red-900/20 group-hover:scale-110 transition-transform`}>
            <LogOut className={`w-4 h-4 ${s.accent}`} />
          </div>
          <span className={`text-xs font-bold ${s.text}`}>Logout session</span>
        </button>
      </div>

      <div className={`p-3 bg-gray-50/50 dark:bg-black/20 text-center border-t ${s.border}`}>
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Just Knock It • {user.id.substring(0, 8)}</p>
      </div>
    </div>
  );
};
