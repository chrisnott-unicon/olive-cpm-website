import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Filter,
  Send,
  Download,
  Link as LinkIcon
} from 'lucide-react';

interface SiteInstructionManagerProps {
  user: any;
  projectTarget: any;
  stakeholders?: any[];
}

export default function SiteInstructionManager({ user, projectTarget, stakeholders = [] }: SiteInstructionManagerProps) {
  const currentUserStakeholder = stakeholders.find(s => s.id === user.uid);
  const isPA = currentUserStakeholder?.role?.toLowerCase().includes('agent') || 
               currentUserStakeholder?.role?.toLowerCase().includes('engineer') || 
               currentUserStakeholder?.role?.toLowerCase().includes('architect') ||
               currentUserStakeholder?.role?.toLowerCase().includes('principal');
  const isContractor = currentUserStakeholder?.role?.toLowerCase().includes('contractor');

  const [instructions, setInstructions] = useState<any[]>([]);
  const [activeSIId, setActiveSIId] = useState<string | null>(null);
  const activeSI = instructions.find(i => i.id === activeSIId) || null;
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [newSI, setNewSI] = useState({
    title: '',
    description: '',
    issuedToId: ''
  });

  const [editSI, setEditSI] = useState({
    id: '',
    title: '',
    description: '',
    issuedToId: ''
  });

  useEffect(() => {
    if (!projectTarget?.id) return;

    setLoading(true);
    const q = query(
      collection(db, 'projects', projectTarget.id, 'site_instructions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInstructions(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectTarget.id}/site_instructions`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectTarget?.id]);

  const handleCreateSI = async (e: React.FormEvent, status: string = 'Issued') => {
    e.preventDefault();
    if (!projectTarget?.id || !newSI.title || !newSI.description) return;

    try {
      const siSnap = await getDocs(collection(db, 'projects', projectTarget.id, 'site_instructions'));
      const siCount = siSnap.docs.length + 1;
      const siNumber = `SI-${String(siCount).padStart(3, '0')}`;
      
      const siData = {
        siNumber,
        title: newSI.title,
        description: newSI.description,
        issuedById: user.uid,
        issuedByName: user.displayName || user.email,
        issuedToId: newSI.issuedToId,
        status: status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'projects', projectTarget.id, 'site_instructions'), siData);
      
      setIsCreating(false);
      setNewSI({ title: '', description: '', issuedToId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectTarget.id}/site_instructions`);
    }
  };

  const handleUpdateDraft = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault();
    if (!projectTarget?.id || !editSI.id) return;

    try {
      await updateDoc(doc(db, 'projects', projectTarget.id, 'site_instructions', editSI.id), {
        title: editSI.title,
        description: editSI.description,
        issuedToId: editSI.issuedToId,
        status: publish ? 'Issued' : 'Draft',
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectTarget.id}/site_instructions/${editSI.id}`);
    }
  };

  const handleUpdateStatus = async (siId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'projects', projectTarget.id, 'site_instructions', siId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectTarget.id}/site_instructions/${siId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-zinc-100 text-zinc-500 border-zinc-200';
      case 'Issued': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'Acknowledged': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'Completed': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'Cancelled': return 'bg-red-100 text-red-600 border-red-200';
      default: return 'bg-zinc-100 text-zinc-500 border-zinc-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <div className="w-6 h-1 bg-red-600" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Formal Instructions</span>
           </div>
           <h1 className="text-4xl font-black text-architect-coal tracking-tight lowercase">Site Instructions</h1>
        </div>

        {isPA && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-architect-coal text-white rounded-xl font-bold text-sm shadow-xl shadow-architect-coal/20 hover:bg-red-600 transition-all"
          >
            <Plus className="w-5 h-5" />
            Issue Instruction
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SI List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                 <Filter className="w-4 h-4" /> Filter
               </h2>
             </div>
             
             {loading ? (
               <div className="py-12 flex flex-col items-center">
                 <div className="w-8 h-8 border-2 border-zinc-200 border-t-red-600 rounded-full animate-spin mb-4" />
                 <span className="text-[10px] font-black uppercase text-zinc-300">Syncing Register...</span>
               </div>
             ) : instructions.length === 0 ? (
               <div className="py-20 text-center">
                 <FileText className="w-12 h-12 text-zinc-100 mx-auto mb-4" strokeWidth={1} />
                 <p className="text-[10px] font-black text-zinc-300 uppercase">No Site Instructions issued.</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {instructions.map(si => (
                   <div 
                     key={si.id}
                     onClick={() => setActiveSIId(si.id)}
                     className={`p-4 rounded-2xl border transition-all cursor-pointer ${activeSIId === si.id ? 'border-red-600 bg-red-50/10' : 'border-zinc-50 hover:border-zinc-200 bg-zinc-50/50'}`}
                   >
                     <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black text-zinc-400">{si.siNumber}</span>
                       <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${getStatusColor(si.status)}`}>
                         {si.status}
                       </span>
                     </div>
                     <h3 className="text-xs font-bold text-architect-coal mb-2 line-clamp-1">{si.title}</h3>
                     <div className="flex items-center gap-4 text-[9px] text-zinc-400 font-medium">
                       <div className="flex items-center gap-1">
                         <User className="w-3 h-3" /> {si.issuedByName}
                       </div>
                       <div className="flex items-center gap-1">
                         <Clock className="w-3 h-3" /> {si.createdAt?.toDate ? si.createdAt.toDate().toLocaleDateString() : 'Pending'}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

        {/* SI Detail View */}
        <div className="lg:col-span-2">
          {activeSI ? (
            <div className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col h-[700px]">
              <div className="p-8 border-b border-zinc-50 bg-zinc-50/30 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-black text-red-600">{activeSI.siNumber}</span>
                    <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{activeSI.status}</span>
                  </div>
                  <h2 className="text-2xl font-black text-architect-coal">{activeSI.title}</h2>
                </div>
                <div className="flex items-center gap-3">
                  {activeSI.status === 'Draft' && isPA && (
                    <button 
                      onClick={() => {
                        setEditSI({ id: activeSI.id, title: activeSI.title, description: activeSI.description, issuedToId: activeSI.issuedToId });
                        setIsEditing(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-architect-coal transition-all"
                    >
                      Edit Draft
                    </button>
                  )}
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all">
                    <Download className="w-4 h-4" /> Export PDF
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* SI Content */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Instruction Description</h3>
                  <div className="p-8 bg-zinc-50 rounded-3xl min-h-[200px]">
                    <p className="text-sm text-architect-coal leading-relaxed whitespace-pre-wrap">
                      {activeSI.description}
                    </p>
                  </div>
                </div>

                {/* Meta Information */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-6 bg-zinc-50/50 rounded-3xl border border-zinc-50">
                      <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest block mb-2">Issued By</label>
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-red-600" />
                         </div>
                         <p className="text-xs font-bold text-architect-coal">{activeSI.issuedByName}</p>
                      </div>
                   </div>
                   {activeSI.rfiId && (
                     <div className="p-6 bg-blue-50/30 rounded-3xl border border-blue-50">
                        <label className="text-[8px] font-black uppercase text-blue-400 tracking-widest block mb-2">Linked RFI</label>
                        <div className="flex items-center gap-3">
                           <LinkIcon className="w-4 h-4 text-blue-500" />
                           <p className="text-xs font-bold text-blue-600">Reference RFI Traceable</p>
                        </div>
                     </div>
                   )}
                </div>

                {/* Audit and Verification */}
                <div className="space-y-4 pt-8 border-t border-zinc-100">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Lifecycle Verification</h3>
                   <div className="space-y-3">
                      <div className="flex items-center gap-4 p-4 bg-emerald-50/30 border border-emerald-50 rounded-2xl">
                         <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                         <div>
                            <p className="text-xs font-bold text-emerald-900 uppercase tracking-tight">Instruction Logged</p>
                            <p className="text-[8px] font-black text-emerald-600 uppercase mt-0.5">{activeSI.createdAt?.toDate ? activeSI.createdAt.toDate().toLocaleString() : 'Pending'}</p>
                         </div>
                      </div>
                      
                      {activeSI.status === 'Issued' && (
                        <div className="flex items-center gap-4 p-4 bg-zinc-50 border border-zinc-100 rounded-2xl opacity-50">
                           <div className="w-5 h-5 rounded-full border-2 border-zinc-200" />
                           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Awaiting Acknowledgement</p>
                        </div>
                      )}

                      {activeSI.status === 'Acknowledged' && (
                        <div className="flex items-center gap-4 p-4 bg-emerald-50/30 border border-emerald-50 rounded-2xl">
                           <ShieldCheck className="w-5 h-5 text-emerald-500" />
                           <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Acknowledged by Contractor</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-8 bg-zinc-50/50 border-t border-zinc-100">
                <div className="flex gap-4">
                  {activeSI.status === 'Draft' && isPA && (
                    <button 
                      onClick={() => handleUpdateStatus(activeSI.id, 'Issued')}
                      className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Issue Formal Instruction
                    </button>
                  )}

                  {activeSI.status === 'Issued' && user.uid === activeSI.issuedToId && (
                    <button 
                      onClick={() => handleUpdateStatus(activeSI.id, 'Acknowledged')}
                      className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Acknowledge Instruction
                    </button>
                  )}
                  
                  {activeSI.status === 'Acknowledged' && (
                    <button 
                      onClick={() => handleUpdateStatus(activeSI.id, 'Completed')}
                      className="px-6 py-3 bg-architect-coal text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-olive-primary transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Mark as Completed
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[700px] border-2 border-dashed border-zinc-100 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center bg-zinc-50/20">
               <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
                 <AlertCircle className="w-10 h-10 text-zinc-100" />
               </div>
               <h3 className="text-xl font-black text-zinc-400 uppercase tracking-tight mb-2">Select SI</h3>
               <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest max-w-sm">Select a formal Site Instruction from the register to view the scope and audit history.</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-architect-coal/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <form onSubmit={handleCreateSI} className="p-6 md:p-12 space-y-6 md:space-y-8 overflow-y-auto w-full">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-architect-coal lowercase">New Site Instruction</h2>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Formal Contractual Direction</p>
                  </div>
                  <XCircle 
                    className="w-8 h-8 text-zinc-200 hover:text-architect-coal cursor-pointer transition-colors" 
                    onClick={() => setIsCreating(false)}
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Instruction Subject</label>
                    <input 
                      type="text"
                      required
                      value={newSI.title}
                      onChange={e => setNewSI({ ...newSI, title: e.target.value })}
                      className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold focus:border-red-600 transition-all outline-none"
                      placeholder="e.g. Relocation of electrical distribution board"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Description / Scope of Work</label>
                    <textarea 
                      required
                      value={newSI.description}
                      onChange={e => setNewSI({ ...newSI, description: e.target.value })}
                      rows={6}
                      className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium leading-relaxed focus:border-red-600 transition-all outline-none resize-none"
                      placeholder="Detail the instructions to the contractor..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Issue To (Contractor)</label>
                    <select 
                      required
                      value={newSI.issuedToId}
                      onChange={e => setNewSI({ ...newSI, issuedToId: e.target.value })}
                      className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold focus:border-red-600 transition-all outline-none appearance-none"
                    >
                      <option value="">Select Target...</option>
                      {stakeholders.filter(s => s.role.includes('Contractor')).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.company})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-200"
                  >
                    <Send className="w-4 h-4" /> Issue SI
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => handleCreateSI(e, 'Draft')}
                    className="flex-1 py-4 bg-architect-coal text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3"
                  >
                    <FileText className="w-4 h-4" /> Save as Draft
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-8 py-4 bg-zinc-100 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-architect-coal/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <form onSubmit={(e) => handleUpdateDraft(e, true)} className="p-6 md:p-12 space-y-6 md:space-y-8 overflow-y-auto w-full">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-architect-coal lowercase">Edit Site Instruction Draft</h2>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Reviewing Contractual Data</p>
                  </div>
                  <XCircle 
                    className="w-8 h-8 text-zinc-200 hover:text-architect-coal cursor-pointer transition-colors" 
                    onClick={() => setIsEditing(false)}
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Instruction Subject</label>
                    <input 
                      type="text"
                      required
                      value={editSI.title}
                      onChange={e => setEditSI({ ...editSI, title: e.target.value })}
                      className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold focus:border-red-600 transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Description / Scope of Work</label>
                    <textarea 
                      required
                      value={editSI.description}
                      onChange={e => setEditSI({ ...editSI, description: e.target.value })}
                      rows={6}
                      className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium leading-relaxed focus:border-red-600 transition-all outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Issue To (Contractor)</label>
                    <select 
                      required
                      value={editSI.issuedToId}
                      onChange={e => setEditSI({ ...editSI, issuedToId: e.target.value })}
                      className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold focus:border-red-600 transition-all outline-none appearance-none"
                    >
                      <option value="">Select Target...</option>
                      {stakeholders.filter(s => s.role.includes('Contractor')).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.company})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-200"
                  >
                    <Send className="w-4 h-4" /> Finalize & Issue SI
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => handleUpdateDraft(e, false)}
                    className="flex-1 py-4 bg-architect-coal text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3"
                  >
                    <FileText className="w-4 h-4" /> Update Draft
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-8 py-4 bg-zinc-100 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
