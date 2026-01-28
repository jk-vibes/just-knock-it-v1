
import React from 'react';
import { X, Shield, Lock, Eye, Server, MapPin, HardDrive, UserCheck, Trash2 } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[85vh] border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 shrink-0 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-xl shadow-lg shadow-red-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white leading-none">Privacy Policy</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Data Safety & Trust</p>
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
              <Eye className="w-4 h-4 text-blue-500" /> Data Collection
            </h3>
            <p className="pl-6 border-l-2 border-blue-500/20">
              <strong>Just Knock</strong> collects minimal data to enhance your experience. This includes your <strong>Google Profile</strong> (name, email, photo) for identification, <strong>Bucket List Content</strong> (titles, notes), and <strong>Location Tags</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" /> Geolocation & Radar
            </h3>
            <p className="pl-6 border-l-2 border-red-500/20">
              Real-time location data is used for the <strong>Proximity Radar</strong>. This data is processed <strong>locally on your device</strong>. We do not store your live location history on our servers. Location coordinates for your "Dreams" are stored in your encrypted local database or Google Drive.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-500" /> Google Drive Integration
            </h3>
            <p className="pl-6 border-l-2 border-purple-500/20">
              The App uses the <code>drive.file</code> scope to manage backups. This grants access <strong>only</strong> to files created by this application. We cannot see, read, or delete any other documents in your Drive. This integration is vital for data persistence across devices.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" /> User Consent
            </h3>
            <p className="pl-6 border-l-2 border-green-500/20">
              By using Google Sign-In or creating a local entry, you grant us consent to process your data for the application's core functions. You can revoke this consent at any time by logging out and disconnecting your Google Account from your security settings.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-orange-500" /> Data Deletion
            </h3>
            <p className="pl-6 border-l-2 border-orange-500/20">
              You maintain full control. You can delete individual dreams, clear your local database, or delete your backup from Google Drive directly through the <strong>Data Settings</strong> panel in the app.
            </p>
          </section>

          <div className="pt-8 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Updated January 2026 • v1.9</p>
          </div>
        </div>
      </div>
    </div>
  );
};
