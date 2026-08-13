import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { 
  GanttChartSquare, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Fingerprint,
  Mail,
  Lock
} from 'lucide-react';
import { ConstructionGrid, SkeletalFrame } from './ArchitecturalDoodles';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEmailView, setIsEmailView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isIframe, setIsIframe] = useState(false);
  const [systemCheck, setSystemCheck] = useState<'checking' | 'ready' | 'error'>('checking');

  useEffect(() => {
    // Detect if we are in an iframe (common in previews)
    setIsIframe(window.self !== window.top);

    // Verify Firebase initialization is stable
    const verifySystem = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        setSystemCheck('ready');
      } catch (err) {
        console.error("System Initialization Failed:", err);
        setSystemCheck('error');
      }
    };
    verifySystem();
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      // Success is handled by App.tsx observer
      console.log("Authentication successful for:", result.user.email);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      
      if (err.code === 'auth/popup-blocked') {
        setError("AUTHENTICATION BLOCKED: Pop-up windows are restricted by your browser. Please allow pop-ups for this domain or open the application in a new tab.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("ACCESS CANCELLED: The authentication window was closed.");
      } else if (err.code === 'auth/internal-error') {
        setError("SYSTEM ERROR: Failed to establish secure handshake with Google Workspace.");
      } else {
        setError(err.message || "An unexpected error occurred during the authentication sequence.");
      }
      setLoading(false);
    }
  };

  const loginWithCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Credential Login Error:", err);
      setError("INVALID ACCESS: Username or password verification failed.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-architect-paper text-architect-coal p-4 md:p-8 relative overflow-hidden font-sans">
      <ConstructionGrid />
      
      {/* Background Architectural Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <SkeletalFrame className="absolute -top-20 -left-20 w-1/2 opacity-[0.03] rotate-12" />
        <SkeletalFrame className="absolute -bottom-40 -right-20 w-2/3 opacity-[0.05] -rotate-12" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_32px_64px_-16px_rgba(45,64,32,0.15)] rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
          
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-olive-primary/10 mb-6 relative group">
              <GanttChartSquare className="w-8 h-8 text-olive-primary transition-transform group-hover:scale-110" strokeWidth={1.5} />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-olive-primary/20 rounded-3xl border-dashed"
              />
            </div>
            <h1 className="text-3xl font-light tracking-[0.2em] text-olive-primary mb-2">OLIVE CPM</h1>
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-4 bg-zinc-200" />
              <span className="text-[10px] font-black tracking-[0.3em] text-zinc-400 uppercase">Unicon Construction SA</span>
              <div className="h-px w-4 bg-zinc-200" />
            </div>
          </div>

          {/* System Status Banner */}
          <AnimatePresence>
            {systemCheck === 'error' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-8 flex items-start gap-3"
              >
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-[10px] leading-relaxed text-red-800 font-medium uppercase tracking-wider">
                  System connectivity issues detected. Please check your internet connection or site permissions.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-8"
              >
                <div className="flex items-center gap-2 mb-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Login Error</span>
                </div>
                <p className="text-[11px] text-red-800 font-medium leading-relaxed uppercase tracking-wider">
                  {error}
                </p>
                {isIframe && error.includes('Pop-up') && (
                  <button 
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-red-600 hover:underline"
                  >
                    Open in New Tab <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auth Controllers */}
          <div className="space-y-4">
            {!isEmailView ? (
              <div className="space-y-4">
                <button 
                  onClick={loginWithGoogle}
                  disabled={loading || systemCheck === 'checking'}
                  className="w-full h-16 bg-architect-coal text-white rounded-2xl flex items-center justify-between px-8 hover:bg-olive-primary transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-4">
                    <Fingerprint className="w-5 h-5 text-zinc-400 group-hover:text-white" strokeWidth={1.5} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                      {loading ? 'Authenticating...' : 'Sign in with Google'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <p className="text-[9px] text-zinc-400 font-medium text-center uppercase tracking-widest mt-6 mb-2">Or Use Credentials</p>
                
                <button 
                  onClick={() => setIsEmailView(true)}
                  disabled={loading}
                  className="w-full h-16 bg-transparent border border-zinc-200 text-zinc-500 rounded-2xl flex items-center justify-center gap-3 hover:border-olive-primary hover:text-olive-primary transition-all disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Email Sign In</span>
                </button>
              </div>
            ) : (
              <form onSubmit={loginWithCredentials} className="space-y-4">
                <div className="space-y-4 mb-6">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" strokeWidth={1.5} />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="EMAIL@UNICONSA.CO.ZA"
                      className="w-full h-14 pl-12 pr-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:border-olive-primary focus:bg-white transition-all text-architect-coal"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" strokeWidth={1.5} />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="ACCESS KEY"
                      className="w-full h-14 pl-12 pr-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:border-olive-primary focus:bg-white transition-all text-architect-coal"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsEmailView(false)}
                    className="h-14 w-14 border border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-architect-coal hover:border-zinc-300 transition-all font-black text-xs"
                  >
                    ←
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-14 bg-olive-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-olive-dark transition-all disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Sign In'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="mt-12 pt-8 border-t border-zinc-50 flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest mb-1">Unicon Construction SA</p>
              <p className="text-[8px] font-medium text-zinc-400 uppercase tracking-[0.2em] opacity-40">Hilton, KwaZulu-Natal, South Africa</p>
            </div>
          </div>
        </div>

        {/* Global Access Link */}
        {isIframe && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center"
          >
            <button 
              onClick={() => window.open(window.location.href, '_blank')}
              className="px-6 py-3 bg-white/50 backdrop-blur-md rounded-full border border-white/20 text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] hover:bg-white transition-all flex items-center gap-2 mx-auto"
            >
              Streamline Experience: Open in New Tab <ExternalLink className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
