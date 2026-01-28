
import React from 'react';
import { X, Scale, FileText, AlertTriangle, ShieldCheck, Zap, Globe } from 'lucide-react';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[85vh] border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 shrink-0 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white leading-none">Terms of Service</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Usage Guidelines</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto no-scrollbar space-y-8 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          <section className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> 1. Acceptance
            </h3>
            <p className="pl-6 border-l-2 border-blue-500/20">
              By accessing <strong>Just Knock</strong>, you agree to these terms. This app is provided for personal use to track and manage your bucket list.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" /> 2. AI Suggestions (Gemini)
            </h3>
            <p className="pl-6 border-l-2 border-indigo-500/20">
              We use <strong>Google Gemini API</strong> to generate "Magic Fills" and suggestions. While we strive for accuracy, AI content may contain errors regarding locations, opening hours, or travel feasibility. Always verify details independently before traveling.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" /> 3. Proximity Safety
            </h3>
            <p className="pl-6 border-l-2 border-yellow-500/20">
              The location-aware radar is designed for convenience. <strong>NEVER</strong> use this application while operating a motor vehicle or heavy machinery. Use location alerts responsibly and stay aware of your surroundings.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" /> 4. Cloud Sync & Backups
            </h3>
            <p className="pl-6 border-l-2 border-emerald-500/20">
              Data synced to <strong>Google Drive</strong> is your property. Just Knock acts as a client interface. You are responsible for maintaining your Google Account credentials and security.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-red-500" /> 5. Service Availability
            </h3>
            <p className="pl-6 border-l-2 border-red-500/20">
              Just Knock is provided "as is." We do not guarantee 100% uptime or that data loss will never occur. We highly recommend using the Backup feature regularly.
            </p>
          </section>

          <div className="pt-8 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Effective January 2026 • v1.9</p>
          </div>
        </div>
      </div>
    </div>
  );
};
