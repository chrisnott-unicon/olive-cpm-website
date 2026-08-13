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
  where,
  getDocs,
  arrayUnion
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Plus, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  MapPin,
  ChevronRight,
  Filter,
  Send,
  ShieldCheck,
  History,
  MoreVertical,
  Mail,
  Edit2
} from 'lucide-react';

interface RFIManagerProps {
  user: any;
  projectTarget: any;
  stakeholders?: any[];
  onPinToDrawing?: (rfiId: string, drawingId: string) => void;
}

enum RFIStatus {
  Draft = 'Draft',
  Internal_Review = 'Internal_Review',
  Published_Open = 'Published_Open',
  Response_Received = 'Response_Received',
  Pending_Closure = 'Pending_Closure',
  Closed = 'Closed'
}

export default function RFIManager({ user, projectTarget, stakeholders = [], onPinToDrawing }: RFIManagerProps) {
  const [rfis, setRfis] = useState<any[]>([]);
  const [activeRfiId, setActiveRfiId] = useState<string | null>(null);
  const activeRfi = rfis.find(r => r.id === activeRfiId) || null;
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [showDrawingSelector, setShowDrawingSelector] = useState(false);
  
  // Form State
  const [newRfi, setNewRfi] = useState({
    title: '',
    query: '',
    internalCheckerId: '',
    responderId: '',
    observerIds: [] as string[]
  });

  const [responseText, setResponseText] = useState('');
  const currentUserStakeholder = stakeholders.find(s => s.id === user.uid);
  const isContractor = currentUserStakeholder?.role?.toLowerCase().includes('contractor');
  const isPA = currentUserStakeholder?.role?.toLowerCase().includes('agent') || currentUserStakeholder?.role?.toLowerCase().includes('engineer');
  const [responseType, setResponseType] = useState<'Clarification' | 'SiteInstruction'>('Clarification');
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    if (!projectTarget?.id) return;

    setLoading(true);
    const q = query(
      collection(db, 'projects', projectTarget.id, 'rfis'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRfis(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectTarget.id}/rfis`);
      setLoading(false);
    });

    // Fetch drawings for linking
    const drawingsQuery = query(
      collection(db, 'projects', projectTarget.id, 'documents'),
      where('category', '==', 'Drawing')
    );
    getDocs(drawingsQuery).then(snap => {
      setDrawings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [projectTarget?.id]);

  const handleCreateRfi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTarget?.id || !newRfi.title || !newRfi.query) return;

    try {
      const rfiCount = rfis.length + 1;
      const rfiNumber = `RFI-${String(rfiCount).padStart(3, '0')}`;
      
      const rfiData = {
        rfiNumber,
        title: newRfi.title,
        query: newRfi.query,
        originalQuery: newRfi.query,
        status: RFIStatus.Draft,
        creatorId: user.uid,
        creatorName: user.displayName || user.email,
        internalCheckerId: newRfi.internalCheckerId,
        responderId: newRfi.responderId,
        observerIds: newRfi.observerIds,
        edits: [],
        responses: [],
        closureVotes: { contractor: false, principalAgent: false },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'projects', projectTarget.id, 'rfis'), rfiData);
      
      setIsCreating(false);
      setNewRfi({ title: '', query: '', internalCheckerId: '', responderId: '', observerIds: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectTarget.id}/rfis`);
    }
  };

  const handleSubmitResponse = async () => {
    if (!activeRfi || !responseText || !projectTarget?.id) return;
    setIsResponding(true);

    try {
      let siteInstructionId = '';
      if (responseType === 'SiteInstruction') {
        const siSnap = await getDocs(collection(db, 'projects', projectTarget.id, 'site_instructions'));
        const siCount = siSnap.docs.length + 1;
        const siNumber = `SI-${String(siCount).padStart(3, '0')}`;

        const siData = {
          siNumber,
          title: `SI for ${activeRfi.rfiNumber}: ${activeRfi.title}`,
          description: responseText,
          rfiId: activeRfi.id,
          issuedById: user.uid,
          issuedByName: user.displayName || user.email,
          issuedToId: activeRfi.creatorId,
          status: 'Issued',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const siDoc = await addDoc(collection(db, 'projects', projectTarget.id, 'site_instructions'), siData);
        siteInstructionId = siDoc.id;
      }

      const newResponse = {
        content: responseText,
        authorId: user.uid,
        authorName: user.displayName || user.email,
        type: responseType,
        siteInstructionId: siteInstructionId,
        createdAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'projects', projectTarget.id, 'rfis', activeRfi.id), {
        response: responseText, // Keep legacy field for now if needed
        responseType: responseType,
        siteInstructionId: siteInstructionId,
        responseAuthorId: user.uid,
        responses: arrayUnion(newResponse),
        status: RFIStatus.Response_Received,
        updatedAt: serverTimestamp()
      });

      setResponseText('');
      setResponseType('Clarification');
      // Keep activeRfiId set to show updated state
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectTarget.id}/rfis/${activeRfi.id}`);
    } finally {
      setIsResponding(false);
    }
  };

  const handleUpdateStatus = async (rfiId: string, newStatus: RFIStatus) => {
    try {
      await updateDoc(doc(db, 'projects', projectTarget.id, 'rfis', rfiId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      // Keep activeRfiId set to show updated state
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectTarget.id}/rfis/${rfiId}`);
    }
  };

  const handleLinkDrawing = (drawingId: string) => {
    if (!activeRfi || !onPinToDrawing) return;
    onPinToDrawing(activeRfi.id, drawingId);
    setShowDrawingSelector(false);
  };

  const handleEditRfi = async (rfiId: string, newQuery: string) => {
    const rfi = rfis.find(r => r.id === rfiId);
    if (!rfi) return;

    const initials = (user.displayName || user.email || 'XX').split(' ').map((n: string) => n[0]).join('').toUpperCase();
    
    const newEdit = {
      content: newQuery,
      authorInitials: initials,
      timestamp: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'projects', projectTarget.id, 'rfis', rfiId), {
        query: newQuery,
        edits: [...(rfi.edits || []), newEdit],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectTarget.id}/rfis/${rfiId}`);
    }
  };

  const handleVoteClosure = async (rfiId: string, role: 'contractor' | 'principalAgent') => {
    const rfi = rfis.find(r => r.id === rfiId);
    if (!rfi) return;

    const newVotes = { ...rfi.closureVotes, [role]: true };
    const shouldClose = newVotes.contractor && newVotes.principalAgent;

    try {
      await updateDoc(doc(db, 'projects', projectTarget.id, 'rfis', rfiId), {
        closureVotes: newVotes,
        status: shouldClose ? RFIStatus.Closed : RFIStatus.Pending_Closure,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectTarget.id}/rfis/${rfiId}`);
    }
  };

  const getStatusColor = (status: RFIStatus) => {
    switch (status) {
      case RFIStatus.Draft: return 'bg-zinc-100 text-zinc-600';
      case RFIStatus.Internal_Review: return 'bg-blue-100 text-blue-600';
      case RFIStatus.Published_Open: return 'bg-orange-100 text-orange-600';
      case RFIStatus.Response_Received: return 'bg-emerald-100 text-emerald-600';
      case RFIStatus.Pending_Closure: return 'bg-purple-100 text-purple-600';
      case RFIStatus.Closed: return 'bg-zinc-900 text-white';
      default: return 'bg-zinc-100 text-zinc-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <div className="w-6 h-1 bg-olive-primary" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Technical Communication</span>
           </div>
           <h1 className="text-4xl font-black text-architect-coal tracking-tight lowercase">RFIs</h1>
        </div>

        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-6 py-3 bg-architect-coal text-white rounded-xl font-bold text-sm shadow-xl shadow-architect-coal/20 hover:bg-olive-primary transition-all"
        >
          <Plus className="w-5 h-5" />
          Request Info
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RFI List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                 <Filter className="w-4 h-4" /> Filter
               </h2>
             </div>
             
             {loading ? (
               <div className="py-12 flex flex-col items-center">
                 <div className="w-8 h-8 border-2 border-zinc-200 border-t-olive-primary rounded-full animate-spin mb-4" />
                 <span className="text-[10px] font-black uppercase text-zinc-300">Syncing Protocol...</span>
               </div>
             ) : rfis.length === 0 ? (
               <div className="py-20 text-center">
                 <MessageSquare className="w-12 h-12 text-zinc-100 mx-auto mb-4" strokeWidth={1} />
                 <p className="text-[10px] font-black text-zinc-300 uppercase">No RFIs logged for this node.</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {rfis.map(rfi => (
                   <div 
                     key={rfi.id}
                     onClick={() => setActiveRfiId(rfi.id)}
                     className={`p-4 rounded-2xl border transition-all cursor-pointer ${activeRfiId === rfi.id ? 'border-olive-primary bg-olive-primary/5' : 'border-zinc-50 hover:border-zinc-200 bg-zinc-50/50'}`}
                   >
                     <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black text-zinc-400">{rfi.rfiNumber}</span>
                       <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${getStatusColor(rfi.status as RFIStatus)}`}>
                         {rfi.status.replace('_', ' ')}
                       </span>
                     </div>
                     <h3 className="text-xs font-bold text-architect-coal mb-2 line-clamp-1">{rfi.title}</h3>
                     <div className="flex items-center gap-4 text-[9px] text-zinc-400 font-medium">
                       <div className="flex items-center gap-1">
                         <User className="w-3 h-3" /> {rfi.creatorName}
                       </div>
                       <div className="flex items-center gap-1">
                         <Clock className="w-3 h-3" /> {rfi.createdAt?.toDate ? rfi.createdAt.toDate().toLocaleDateString() : 'Pending'}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

        {/* RFI Detail View */}
        <div className="lg:col-span-2">
          {activeRfi ? (
            <div className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col h-[700px]">
              <div className="p-8 border-b border-zinc-50 bg-zinc-50/30 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-black text-olive-primary">{activeRfi.rfiNumber}</span>
                    <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{activeRfi.status.replace('_', ' ')}</span>
                  </div>
                  <h2 className="text-2xl font-black text-architect-coal">{activeRfi.title}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-2 text-zinc-400 hover:text-architect-coal transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Core Query */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Query Description</h3>
                    <div className="flex gap-2">
                      {activeRfi.drawingRef && (
                         <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                           <MapPin className="w-3 h-3" /> Location Pin
                         </button>
                      )}
                      {activeRfi.status === RFIStatus.Draft && (
                        <button 
                          onClick={() => setShowDrawingSelector(true)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-olive-primary/10 hover:text-olive-primary rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <Plus className="w-3 h-3" /> Pin to Drawing
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-6 bg-zinc-50 rounded-3xl relative group">
                    <p className="text-sm text-architect-coal leading-relaxed whitespace-pre-wrap">
                      {activeRfi.query}
                    </p>
                    {activeRfi.status === RFIStatus.Draft && (
                       <button className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-400 hover:text-olive-primary bg-white rounded-lg shadow-sm border border-zinc-100">
                         <Edit2 className="w-4 h-4" />
                       </button>
                    )}
                  </div>
                </div>

                {/* Audit Trail (Edits) */}
                {activeRfi.edits && activeRfi.edits.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                       <History className="w-4 h-4" /> Revision History
                    </h3>
                    <div className="space-y-3">
                       {activeRfi.edits.map((edit: any, idx: number) => (
                         <div key={idx} className="flex gap-4 items-start">
                           <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                             <span className="text-[10px] font-black text-red-600">{edit.authorInitials}</span>
                           </div>
                           <div className="flex-1 p-4 bg-red-50/20 border border-red-50 rounded-2xl">
                             <p className="text-xs text-red-800 line-through opacity-60 mb-2">{idx === 0 ? activeRfi.originalQuery : activeRfi.edits[idx-1].content}</p>
                             <p className="text-xs text-red-800 font-bold">{edit.content}</p>
                             <div className="mt-2 text-[8px] font-black text-red-400 uppercase tracking-widest">
                               {new Date(edit.timestamp).toLocaleString()}
                             </div>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* Response Audit Trail */}
                {(activeRfi.responses && activeRfi.responses.length > 0) && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                       <Clock className="w-4 h-4" /> Response Audit Trail
                    </h3>
                    <div className="space-y-4">
                       {activeRfi.responses.map((resp: any, idx: number) => (
                         <div key={idx} className={`p-6 rounded-3xl border ${resp.type === 'SiteInstruction' ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <div className="flex justify-between items-start mb-3">
                               <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${resp.type === 'SiteInstruction' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                 {resp.type === 'SiteInstruction' ? 'Site Instruction Issued' : 'Technical Clarification'}
                               </span>
                               <span className="text-[8px] font-black text-zinc-400 uppercase">
                                 {new Date(resp.createdAt).toLocaleString()}
                               </span>
                            </div>
                            <p className={`text-sm leading-relaxed italic whitespace-pre-wrap ${resp.type === 'SiteInstruction' ? 'text-red-900' : 'text-emerald-900'}`}>{resp.content}</p>
                            <div className="mt-4 pt-4 border-t opacity-30 flex items-center gap-2">
                               <User className="w-3 h-3" />
                               <span className="text-[9px] font-black uppercase">{resp.authorName}</span>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* Response Input Section */}
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                     {activeRfi.responses?.length > 0 ? 'Provide Supplementary Response' : 'Formal Response'}
                   </h3>
                   {activeRfi.status === RFIStatus.Published_Open || activeRfi.status === RFIStatus.Response_Received ? (
                      user.uid === activeRfi.responderId ? (
                        <div className="space-y-4">
                           <textarea 
                             value={responseText}
                             onChange={e => setResponseText(e.target.value)}
                             placeholder="Provide technical response or instruction..."
                             className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium leading-relaxed focus:border-olive-primary transition-all outline-none resize-none"
                             rows={4}
                           />
                           <div className="flex items-center justify-between">
                              <div className="flex gap-4">
                                <button 
                                  onClick={() => setResponseType('Clarification')}
                                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${responseType === 'Clarification' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}
                                >
                                  Clarification
                                </button>
                                {isPA && (
                                  <button 
                                    onClick={() => setResponseType('SiteInstruction')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${responseType === 'SiteInstruction' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-400'}`}
                                  >
                                    Site Instruction
                                  </button>
                                )}
                              </div>
                              <button 
                               disabled={!responseText || isResponding}
                               onClick={handleSubmitResponse}
                               className="px-6 py-2 bg-architect-coal text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-olive-primary transition-all disabled:opacity-50"
                              >
                               {isResponding ? 'Sending...' : 'Submit Response'}
                              </button>
                           </div>
                        </div>
                      ) : (
                        <div className="p-12 border-2 border-dashed border-zinc-100 rounded-3xl text-center">
                           <Clock className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
                           <p className="text-[10px] font-black text-zinc-300 uppercase">
                             {activeRfi.responses?.length > 0 ? 'Supplementary Response Pending' : 'Awaiting Professional Response'}
                           </p>
                        </div>
                      )
                   ) : activeRfi.status === RFIStatus.Closed ? (
                     <div className="p-6 bg-zinc-900 text-white rounded-3xl flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-olive-primary" />
                        <span className="text-xs font-black uppercase tracking-widest">Protocol Finalized & Closed</span>
                     </div>
                   ) : null}
                </div>

                {/* Closure Verification Section */}
                {(activeRfi.status === RFIStatus.Response_Received || activeRfi.status === RFIStatus.Pending_Closure || activeRfi.status === RFIStatus.Closed) && (
                  <div className="space-y-4 pt-8 border-t border-zinc-100">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4" /> Closure Votes & Verification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {/* Contractor Vote */}
                       <div className={`p-6 rounded-3xl border transition-all ${activeRfi.closureVotes?.contractor ? 'bg-emerald-50 border-emerald-100' : 'bg-zinc-50 border-zinc-100'}`}>
                          <div className="flex justify-between items-center mb-4">
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeRfi.closureVotes?.contractor ? 'bg-emerald-100' : 'bg-zinc-200'}`}>
                                   <User className={`w-4 h-4 ${activeRfi.closureVotes?.contractor ? 'text-emerald-600' : 'text-zinc-400'}`} />
                                </div>
                                <div>
                                   <p className="text-[10px] font-black uppercase text-zinc-400 tracking-tight">Contractor</p>
                                   <p className="text-xs font-bold text-architect-coal">Lead Construction Team</p>
                                </div>
                             </div>
                             {activeRfi.closureVotes?.contractor && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          </div>
                          
                          {!activeRfi.closureVotes?.contractor && activeRfi.status !== RFIStatus.Closed && isContractor && (
                            <button 
                              onClick={() => handleVoteClosure(activeRfi.id, 'contractor')}
                              className="w-full py-2 bg-white border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-olive-primary hover:text-olive-primary transition-all"
                            >
                              Approve Closure
                            </button>
                          )}
                          
                          {activeRfi.closureVotes?.contractor && (
                            <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest text-center py-2">
                              Verification Secured
                            </div>
                          )}
                       </div>

                       {/* PA Vote */}
                       <div className={`p-6 rounded-3xl border transition-all ${activeRfi.closureVotes?.principalAgent ? 'bg-emerald-50 border-emerald-100' : 'bg-zinc-50 border-zinc-100'}`}>
                          <div className="flex justify-between items-center mb-4">
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeRfi.closureVotes?.principalAgent ? 'bg-emerald-100' : 'bg-zinc-200'}`}>
                                   <ShieldCheck className={`w-4 h-4 ${activeRfi.closureVotes?.principalAgent ? 'text-emerald-600' : 'text-zinc-400'}`} />
                                </div>
                                <div>
                                   <p className="text-[10px] font-black uppercase text-zinc-400 tracking-tight">Principal Agent</p>
                                   <p className="text-xs font-bold text-architect-coal">Professional Oversight</p>
                                </div>
                             </div>
                             {activeRfi.closureVotes?.principalAgent && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          </div>
                          
                          {!activeRfi.closureVotes?.principalAgent && activeRfi.status !== RFIStatus.Closed && isPA && (
                            <button 
                              onClick={() => handleVoteClosure(activeRfi.id, 'principalAgent')}
                              className="w-full py-2 bg-white border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-olive-primary hover:text-olive-primary transition-all"
                            >
                              Approve Closure
                            </button>
                          )}

                          {activeRfi.closureVotes?.principalAgent && (
                            <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest text-center py-2">
                              Verification Secured
                            </div>
                          )}
                       </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-8 bg-zinc-50/50 border-t border-zinc-100">
                <div className="flex flex-wrap gap-4">
                  {activeRfi.status === RFIStatus.Draft && (
                    <button 
                      onClick={() => handleUpdateStatus(activeRfi.id, RFIStatus.Internal_Review)}
                      className="px-6 py-3 bg-architect-coal text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-olive-primary transition-all"
                    >
                      Issue to Internal QC
                    </button>
                  )}
                  
                  {activeRfi.status === RFIStatus.Internal_Review && (
                    <button 
                      onClick={() => handleUpdateStatus(activeRfi.id, RFIStatus.Published_Open)}
                      className="px-6 py-3 bg-architect-coal text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-olive-primary transition-all"
                    >
                      Publish to Professional Team
                    </button>
                  )}

                  {activeRfi.status === RFIStatus.Closed && (
                    <div className="w-full p-4 bg-zinc-900 rounded-2xl flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <CheckCircle2 className="w-5 h-5 text-olive-primary" />
                         <span className="text-[10px] font-black uppercase text-white tracking-widest">Protocol Finalized (Closed)</span>
                       </div>
                       <button 
                         onClick={() => handleUpdateStatus(activeRfi.id, RFIStatus.Published_Open)}
                         className="text-[9px] font-black uppercase text-zinc-400 hover:text-white"
                       >
                         Re-Open for Further Query
                       </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[700px] border-2 border-dashed border-zinc-100 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center bg-zinc-50/20">
               <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
                 <AlertCircle className="w-10 h-10 text-zinc-100" />
               </div>
               <h3 className="text-xl font-black text-zinc-400 uppercase tracking-tight mb-2">Select RFI</h3>
               <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest max-w-sm">Select an active RFI from the list to view the audit trail and communication history.</p>
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
              <form onSubmit={handleCreateRfi} className="p-6 md:p-12 space-y-6 md:space-y-8 overflow-y-auto w-full">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black text-olive-primary uppercase tracking-[0.3em]">Draft RFI-{String(rfis.length + 1).padStart(3, '0')}</span>
                    </div>
                    <h2 className="text-3xl font-black text-architect-coal lowercase">New Request</h2>
                  </div>
                  <XCircle 
                    className="w-8 h-8 text-zinc-200 hover:text-architect-coal cursor-pointer transition-colors" 
                    onClick={() => setIsCreating(false)}
                  />
                </div>

                <div className="space-y-6">
                  {/* Initiator (Auto-populated) */}
                  <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Initiator</label>
                      <p className="text-xs font-bold text-architect-coal">{user.displayName || user.email}</p>
                    </div>
                    <div className="text-right">
                      <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Date</label>
                      <p className="text-xs font-bold text-architect-coal">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Subject</label>
                    <input 
                      type="text"
                      required
                      value={newRfi.title}
                      onChange={e => setNewRfi({ ...newRfi, title: e.target.value })}
                      className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold focus:border-olive-primary transition-all outline-none"
                      placeholder="e.g. Foundation Level Discrepancy"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Query</label>
                    <textarea 
                      required
                      value={newRfi.query}
                      onChange={e => setNewRfi({ ...newRfi, query: e.target.value })}
                      rows={4}
                      className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium leading-relaxed focus:border-olive-primary transition-all outline-none resize-none"
                      placeholder="Describe the technical information required..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Internal Checker</label>
                      <select 
                        required
                        value={newRfi.internalCheckerId}
                        onChange={e => setNewRfi({ ...newRfi, internalCheckerId: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold focus:border-olive-primary transition-all outline-none appearance-none"
                      >
                        <option value="">Select Checker...</option>
                        {stakeholders.filter(s => s.company === 'Unicon').map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-1">Professional Responder (PA / Engineer)</label>
                      <select 
                        required
                        value={newRfi.responderId}
                        onChange={e => setNewRfi({ ...newRfi, responderId: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold focus:border-olive-primary transition-all outline-none appearance-none"
                      >
                        <option value="">Select Responder...</option>
                        {stakeholders.filter(s => s.role.includes('Agent') || s.role.includes('Architect') || s.role.includes('Engineer')).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-3">Distribute to Observers</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto scrollbar-none p-1">
                      {stakeholders
                        .filter(s => s.id !== user.uid && s.id !== newRfi.internalCheckerId && s.id !== newRfi.responderId)
                        .map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              const current = newRfi.observerIds;
                              const updated = current.includes(s.id)
                                ? current.filter(id => id !== s.id)
                                : [...current, s.id];
                              setNewRfi({ ...newRfi, observerIds: updated });
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                              newRfi.observerIds.includes(s.id)
                                ? 'bg-olive-primary/5 border-olive-primary'
                                : 'bg-white border-zinc-100 hover:border-zinc-200'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              newRfi.observerIds.includes(s.id) ? 'bg-olive-primary border-olive-primary' : 'bg-white border-zinc-300'
                            }`}>
                              {newRfi.observerIds.includes(s.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-bold text-architect-coal truncate">{s.name}</p>
                              <p className="text-[8px] text-zinc-400 font-medium uppercase truncate">{s.role}</p>
                            </div>
                          </button>
                        ))}
                      {stakeholders.length === 0 && (
                        <p className="text-[10px] text-zinc-400 italic py-4">No observers available in project register.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-architect-coal text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-olive-primary transition-all flex items-center justify-center gap-3"
                  >
                    <Send className="w-4 h-4" /> Save RFI
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-12 py-4 bg-zinc-100 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Drawing Selection Modal */}
      <AnimatePresence>
        {showDrawingSelector && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <div>
                  <h3 className="text-xl font-black text-architect-coal lowercase">Select Drawing</h3>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Select context for RFI Pin</p>
                </div>
                <button onClick={() => setShowDrawingSelector(false)} className="text-zinc-500 hover:text-architect-coal transition-colors p-2">
                  <XCircle className="w-8 h-8" strokeWidth={1.5} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-none">
                {drawings.map(drawing => (
                  <button
                    key={drawing.id}
                    onClick={() => handleLinkDrawing(drawing.id)}
                    className="w-full text-left p-4 rounded-2xl bg-white border border-zinc-100 hover:border-olive-primary transition-all group flex items-start justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0 group-hover:bg-olive-primary/10 transition-colors">
                        <FileText className="w-5 h-5 text-zinc-400 group-hover:text-olive-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-architect-coal group-hover:text-olive-primary transition-colors">{drawing.name}</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Rev: {drawing.version || '01'}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-olive-primary transition-colors" />
                  </button>
                ))}
                {drawings.length === 0 && (
                  <div className="p-12 text-center">
                    <FileText className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No technical drawings found.</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                <button 
                  onClick={() => setShowDrawingSelector(false)}
                  className="px-6 py-3 text-[10px] font-black uppercase text-zinc-500 hover:text-architect-coal transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
