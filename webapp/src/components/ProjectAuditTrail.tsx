import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldCheck, Clock, Search, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuditLog {
  id: string;
  action: string;
  details: string;
  userId: string;
  userName: string;
  timestamp: any;
}

interface ProjectAuditTrailProps {
  projectTarget: any;
}

export default function ProjectAuditTrail({ projectTarget }: ProjectAuditTrailProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!projectTarget?.id) return;

    const q = query(
      collection(db, 'projects', projectTarget.id, 'audit_logs'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const auditRecs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
      setLogs(auditRecs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectTarget.id]);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-architect-coal p-8 flex justify-between items-center text-white">
        <div>
          <h2 className="text-xl font-black uppercase tracking-[0.3em] font-sans flex items-center gap-3">
             <ShieldCheck className="w-6 h-6 text-olive-primary" />
             Project Audit Trail
          </h2>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2 max-w-xl leading-relaxed">
            Immutable log of statutory compliance actions, baseline commitments, and critical system events.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-2">
        <div className="flex items-center gap-3 px-4 flex-1">
          <Search className="w-4 h-4 text-zinc-400" />
          <input 
            type="text"
            placeholder="Search audit logs..."
            className="bg-transparent border-none focus:outline-none text-xs font-bold uppercase tracking-widest text-zinc-600 w-full placeholder:text-zinc-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-zinc-100" />)}
        </div>
      ) : filteredLogs.length === 0 ? (
         <div className="text-center py-16 bg-zinc-50 border border-zinc-100">
            <ShieldCheck className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">No Audit Events Logged</h3>
            <p className="text-[10px] text-zinc-400 mt-2">Critical events and baseline commitments will appear here.</p>
         </div>
      ) : (
        <div className="bg-white border border-zinc-100">
           <AnimatePresence>
             {filteredLogs.map((log) => (
               <motion.div
                 key={log.id}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="flex items-center gap-6 p-4 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors"
               >
                 <div className="text-[10px] font-mono font-bold text-zinc-500 w-32 shrink-0 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleString('en-ZA', { 
                       year: 'numeric', month: 'short', day: 'numeric', 
                       hour: '2-digit', minute: '2-digit' 
                    }) : 'Pending'}
                 </div>
                 
                 <div className="flex-1">
                    <p className="text-xs font-bold text-architect-coal uppercase tracking-widest mb-1">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-zinc-500 max-w-3xl leading-relaxed">{log.details}</p>
                 </div>

                 <div className="w-48 shrink-0 flex items-center gap-3 justify-end text-zinc-400">
                    <div className="text-right">
                       <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Committed By</p>
                       <p className="text-xs font-bold text-architect-coal truncate w-32">{log.userName}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                       <User className="w-4 h-4 text-zinc-400" />
                    </div>
                 </div>
               </motion.div>
             ))}
           </AnimatePresence>
        </div>
      )}
    </div>
  );
}
