import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XSquare, 
  Building2, 
  ShieldCheck, 
  Loader2,
  Mail,
  UserCheck,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

interface InvitationPortalProps {
  inviteId: string;
  projectId: string;
  onDone: () => void;
}

export default function InvitationPortal({ inviteId, projectId, onDone }: InvitationPortalProps) {
  const [stakeholder, setStakeholder] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'ACCEPTED' | 'DECLINED'>('IDLE');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const sDoc = await getDoc(doc(db, `projects/${projectId}/stakeholders`, inviteId));
        const pDoc = await getDoc(doc(db, 'projects', projectId));

        if (sDoc.exists() && pDoc.exists()) {
          setStakeholder(sDoc.data());
          setProject(pDoc.data());
          
          if (sDoc.data().status === 'Invited') {
             setStatus('ACCEPTED');
          }
        } else {
          setError("Invitation not found or has expired.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to verify invitation credentials.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [inviteId, projectId]);

  const handleResponse = async (accept: boolean) => {
    setStatus('PROCESSING');
    try {
      if (accept) {
        await updateDoc(doc(db, `projects/${projectId}/stakeholders`, inviteId), {
          status: 'Invited', // As requested: status becomes 'Invited' when accepted
          acceptedAt: serverTimestamp()
        });
        setStatus('ACCEPTED');
      } else {
        await updateDoc(doc(db, `projects/${projectId}/stakeholders`, inviteId), {
          status: 'Pending_Verification', // Reset or handle as declined
          declinedAt: serverTimestamp()
        });
        setStatus('DECLINED');
      }
    } catch (err) {
      console.error(err);
      setError("Failed to record response. Please try again.");
      setStatus('IDLE');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-architect-coal flex items-center justify-center p-12">
         <Loader2 className="w-12 h-12 text-olive-primary animate-spin" strokeWidth={1} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-architect-coal flex items-center justify-center p-12">
        <div className="max-w-md w-full bg-white p-12 text-center">
           <XSquare className="w-16 h-16 text-red-500 mx-auto mb-6" strokeWidth={1} />
           <h2 className="text-2xl font-light text-architect-coal uppercase tracking-tight mb-4">Registry Error</h2>
           <p className="text-xs text-zinc-400 font-medium tracking-widest uppercase mb-8">{error}</p>
           <button onClick={onDone} className="w-full py-4 bg-architect-coal text-white text-[10px] font-black uppercase tracking-widest">Return to Base</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-architect-coal flex items-center justify-center p-6 lg:p-12 z-[100]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full bg-white shadow-2xl flex flex-col md:flex-row overflow-hidden"
      >
        <div className="w-full md:w-80 bg-zinc-50 p-12 border-r border-zinc-100 flex flex-col justify-between">
           <div>
              <div className="w-12 h-12 bg-white flex items-center justify-center border border-zinc-100 mb-10">
                 <ShieldCheck className="w-6 h-6 text-olive-primary" strokeWidth={1} />
              </div>
              <h1 className="text-3xl font-light text-olive-primary uppercase tracking-tight mb-6 leading-tight">Stakeholder Admission</h1>
              <p className="text-[9px] text-zinc-400 font-black tracking-widest leading-loose uppercase">
                Welcome to the Olive Governance Matrix. You have been assigned as a critical professional partner for a high-value infrastructure project.
              </p>
           </div>
           
           <div className="pt-10 border-t border-zinc-200">
              <div className="flex items-center gap-3 text-zinc-300 mb-4 opacity-50">
                 <Globe className="w-4 h-4" />
                 <span className="text-[8px] font-black tracking-widest uppercase">Secured by Unicon Global</span>
              </div>
           </div>
        </div>

        <div className="flex-1 p-12 lg:p-16 relative">
           <AnimatePresence mode="wait">
              {status === 'IDLE' || status === 'PROCESSING' ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-10"
                >
                  <div>
                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em] mb-4 block">Official Invitation</span>
                    <h2 className="text-4xl font-light text-architect-coal tracking-tighter uppercase mb-4">Hello, {stakeholder.name}</h2>
                    <div className="flex items-center gap-4 p-6 bg-olive-light/5 border border-olive-primary/10 rounded-2xl">
                       <Building2 className="w-6 h-6 text-olive-primary" strokeWidth={1} />
                       <div>
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Target Project</p>
                          <p className="text-lg font-bold text-architect-coal uppercase tracking-tight">{project.name}</p>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-sm font-medium text-zinc-500 leading-relaxed italic">
                      "I hereby acknowledge my appointment as <span className="text-olive-primary font-black not-italic">{stakeholder.role}</span> for this project and agree to the digital governance protocols of Unicon Construction."
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                       <button 
                        onClick={() => handleResponse(true)}
                        disabled={status === 'PROCESSING'}
                        className="py-6 bg-olive-primary text-white font-black text-[10px] uppercase tracking-[0.4em] hover:bg-olive-dark transition-all flex items-center justify-center gap-4"
                       >
                         {status === 'PROCESSING' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                         Accept Appointment
                       </button>
                       <button 
                        onClick={() => handleResponse(false)}
                        disabled={status === 'PROCESSING'}
                        className="py-6 border border-zinc-200 text-zinc-400 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-zinc-50 transition-all"
                       >
                         Decline Position
                       </button>
                    </div>
                  </div>
                </motion.div>
              ) : status === 'ACCEPTED' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center"
                >
                   <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-10">
                      <CheckCircle2 className="w-12 h-12 text-olive-primary" strokeWidth={1} />
                   </div>
                   <h2 className="text-3xl font-light text-architect-coal uppercase tracking-tighter mb-4">Registry Updated</h2>
                   <p className="text-xs text-zinc-400 font-medium tracking-widest uppercase mb-10 leading-loose">
                      Your professional standing is now active within the {project.name} matrix.<br/>You may now close this window or continue to the dashboard.
                   </p>
                   <button onClick={onDone} className="px-12 py-5 bg-architect-coal text-white text-[10px] font-black uppercase tracking-widest">Access System</button>
                </motion.div>
              ) : (
                <motion.div
                  key="declined"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center"
                >
                   <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mb-10 text-zinc-300">
                      <Mail className="w-12 h-12" strokeWidth={1} />
                   </div>
                   <h2 className="text-3xl font-light text-zinc-400 uppercase tracking-tighter mb-4">Response Recorded</h2>
                   <p className="text-xs text-zinc-300 font-medium tracking-widest uppercase mb-10">
                      Appointment declined. The Project Manager has been notified.
                   </p>
                   <button onClick={onDone} className="px-12 py-5 border border-zinc-100 text-zinc-300 text-[10px] font-black uppercase tracking-widest">Return</button>
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
