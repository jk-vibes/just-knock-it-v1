
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { driveService } from '../services/driveService';
import { Settings, LogIn, Copy, Shield, Scale, AlertCircle, Info, ExternalLink, ChevronRight, HelpCircle } from 'lucide-react';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { TermsOfServiceModal } from './TermsOfServiceModal';
import { LiquidBucket } from './LiquidBucket';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

declare global {
    interface Window {
        google: any;
    }
}

// Updated with user-provided Client ID
const DEFAULT_CLIENT_ID = '620152015803-lfm3kmpnl2tgoih7pet817tb2j4amb7u.apps.googleusercontent.com';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [clientId, setClientId] = useState(() => localStorage.getItem('jk_client_id') || DEFAULT_CLIENT_ID);
  
  const tokenClient = useRef<any>(null);
  const currentOrigin = window.location.origin;

  useEffect(() => {
    tokenClient.current = null;
    
    const initializeGoogleAuth = () => {
        if (window.google?.accounts?.oauth2) {
            try {
                tokenClient.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                    callback: async (tokenResponse: any) => {
                        if (tokenResponse.access_token) {
                            driveService.setAccessToken(tokenResponse.access_token);
                            try {
                                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                                });
                                if (!userInfoResponse.ok) throw new Error("Failed to fetch profile");
                                const userInfo = await userInfoResponse.json();
                                onLogin({
                                    id: userInfo.sub,
                                    name: userInfo.name,
                                    email: userInfo.email,
                                    photoUrl: userInfo.picture
                                });
                            } catch (error) {
                                console.error("Login failed:", error);
                                alert("Failed to retrieve user profile details.");
                            }
                        }
                        setIsLoading(false);
                    },
                    error_callback: (error: any) => {
                        setIsLoading(false);
                        if (error.type === 'popup_closed') return;
                        console.error("Google Auth Error:", error);
                        setShowConfig(true);
                    }
                });
            } catch (e) {
                console.error("GSI Initialization Error:", e);
            }
        }
    };

    initializeGoogleAuth();
    const intervalId = setInterval(() => {
        if (tokenClient.current) clearInterval(intervalId);
        else initializeGoogleAuth();
    }, 500);
    return () => clearInterval(intervalId);
  }, [onLogin, clientId]);

  const handleGoogleLogin = () => {
    if (!tokenClient.current) {
        alert("Google Sign-In is initializing. Please wait.");
        return;
    }
    setIsLoading(true);
    tokenClient.current.requestAccessToken();
  };

  const handleGuestLogin = () => {
      onLogin({
          id: 'guest',
          name: 'Guest Dreamer',
          email: 'guest@example.com',
          photoUrl: 'https://ui-avatars.com/api/?name=Guest+Dreamer&background=random'
      });
  };

  const handleSaveConfig = () => {
      localStorage.setItem('jk_client_id', clientId);
      window.location.reload();
  };

  const copyOrigin = () => {
      // Fix: Use writeText instead of non-existent text method on Clipboard API
      navigator.clipboard.writeText(currentOrigin);
      alert("Origin copied! Add this to your Google Cloud Console.");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500 border border-gray-100 dark:border-gray-800 overflow-y-auto no-scrollbar max-h-[95vh]">
        <div className="w-20 h-20 mb-6 drop-shadow-2xl">
            <LiquidBucket theme="brand-red" percent={85} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">just knock it</h1>
        <p className="text-gray-400 dark:text-gray-500 mb-8 font-medium">dream it. bucket it. knock it.</p>

        <div className="space-y-4 w-full">
            <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-sm hover:shadow-md disabled:opacity-70 group relative overflow-hidden active:scale-95"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span>Sign in with Google</span>
                    </>
                )}
            </button>

            <button
                onClick={handleGuestLogin}
                className="w-full flex items-center justify-center gap-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold py-4 px-4 rounded-2xl transition-all active:scale-95"
            >
                <LogIn className="w-5 h-5" />
                <span>Continue as Guest</span>
            </button>
            
            <div className="pt-4 flex justify-center">
                <button 
                    onClick={() => setShowConfig(!showConfig)}
                    className={`text-[10px] flex items-center gap-1.5 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 ${showConfig ? 'text-red-500 font-black uppercase tracking-widest' : 'text-gray-400 font-bold hover:text-gray-600'}`}
                >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {showConfig ? 'Hide Guide' : 'Fix "Access Blocked / Invalid Request"'}
                </button>
            </div>

            {showConfig && (
                <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-[2rem] border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-2 text-left">
                    <div className="flex items-start gap-3 mb-5">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl">
                            <Info className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                        </div>
                        <div>
                            {/* Fix: Added missing opening bracket '<' to the h3 tag */}
                            <h3 className="text-xs font-black text-red-800 dark:text-red-400 uppercase tracking-widest mb-1">Authorization Guide</h3>
                            <p className="text-[10px] text-red-700/80 dark:text-red-300/60 leading-relaxed font-medium">
                                Google blocks access because this website's URL hasn't been added to your Google Project's "Authorized Origins."
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="p-4 bg-white dark:bg-gray-850 rounded-2xl border border-red-100 dark:border-red-900/20 shadow-sm">
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                STEP 1: Copy your current URL
                            </label>
                            <div className="flex gap-2">
                                <code className="flex-grow p-2.5 text-[10px] bg-gray-50 dark:bg-gray-900 rounded-xl font-mono text-red-600 dark:text-red-400 truncate border border-gray-100 dark:border-gray-800">
                                    {currentOrigin}
                                </code>
                                <button 
                                    onClick={copyOrigin}
                                    className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors active:scale-90"
                                >
                                    <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-gray-850 rounded-2xl border border-red-100 dark:border-red-900/20 shadow-sm">
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                STEP 2: Configure Console
                            </label>
                            <ol className="text-[10px] space-y-2 text-gray-600 dark:text-gray-300 font-medium">
                                <li className="flex gap-2 items-start">
                                    <span className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 text-[8px] font-bold">1</span>
                                    <span>Go to <strong>APIs & Services > Credentials</strong> in Google Cloud.</span>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <span className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 text-[8px] font-bold">2</span>
                                    <span>Edit your <strong>OAuth 2.0 Client ID</strong>.</span>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <span className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 text-[8px] font-bold">3</span>
                                    <span>Paste the URL into <strong>"Authorized JavaScript origins"</strong> and Save.</span>
                                </li>
                            </ol>
                            
                            <a 
                                href="https://console.cloud.google.com/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                            >
                                Open Cloud Console <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>

                        <div className="p-4 bg-white/50 dark:bg-gray-850/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                OPTIONAL: Use your own Client ID
                            </label>
                            <input 
                                type="text" 
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="Paste custom Client ID..."
                                className="w-full p-3 text-[10px] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl mb-3 focus:ring-2 focus:ring-red-500/20 outline-none text-gray-900 dark:text-gray-100 font-mono shadow-inner"
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleSaveConfig}
                                    className="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                                >
                                    Apply
                                </button>
                                <button 
                                    onClick={() => {
                                        setClientId(DEFAULT_CLIENT_ID);
                                        localStorage.removeItem('jk_client_id');
                                        window.location.reload();
                                    }}
                                    className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
                <span className="flex-shrink-0 mx-4 text-gray-300 text-[9px] font-black uppercase tracking-[0.3em]">Identity Secure</span>
                <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
            </div>
        </div>
        
        <div className="mt-6 text-[10px] text-gray-400 text-center px-4 space-y-4 pb-4">
            <p className="font-medium">By continuing, you agree to our policies.</p>
            <div className="flex justify-center gap-8">
                <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-red-500 transition-colors underline underline-offset-8 font-bold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Privacy
                </button>
                <button onClick={() => setIsTermsOpen(true)} className="hover:text-red-500 transition-colors underline underline-offset-8 font-bold flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> Terms
                </button>
            </div>
        </div>
      </div>

      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
};
