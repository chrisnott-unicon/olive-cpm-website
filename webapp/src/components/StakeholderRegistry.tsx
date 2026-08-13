import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Mail, 
  Phone, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  UserPlus, 
  MoreHorizontal,
  Search,
  Check,
  X,
  Smartphone,
  ShieldCheck,
  Briefcase,
  Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import StakeholderMindMap from './StakeholderMindMap';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';

interface Stakeholder {
  id: string;
  name: string;
  displayName?: string;
  role: string;
  email: string;
  phone: string;
  company?: string;
  tags?: string[];
  digitalAgreement: boolean;
  status: 'Active' | 'Invited' | 'Pending_Verification' | 'Awaiting_Response';
  invitedBy?: string;
  invitedAt?: any;
  approvedBy?: string;
  approvedAt?: any;
  acceptedAt?: any;
}

interface StakeholderRegistryProps {
  projectTarget: any;
  user: any;
  userData: any;
}

export default function StakeholderRegistry({ projectTarget, user, userData }: StakeholderRegistryProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRequestingContacts, setIsRequestingContacts] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Principal Agent',
    email: '',
    phone: '',
    company: '',
    tagString: '',
    digitalAgreement: true
  });

  const roleGroups = {
    "Client & Reps": ["Client", "Client Representative"],
    "Professional Services": [
      "Principal Agent", "Project Manager", "Architect", 
      "Quantity Surveyor", "Structural Engineer", "Civil Engineer", 
      "Mechanical Engineer", "Electrical Engineer", "Fire Engineer", 
      "Health & Safety Agent"
    ],
    "Construction & Site Management": [
      "Construction Manager", "Site Manager", "General Foreman",
      "Principal Contractor", "N/S Contractor", "Trade Contractor"
    ]
  };

  useEffect(() => {
    if (!projectTarget?.id) return;

    const q = query(collection(db, `projects/${projectTarget.id}/stakeholders`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stakeholder));
      setStakeholders(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectTarget.id]);

  const handleAddStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) return;

    try {
      const payload = {
        name: formData.name,
        role: formData.role,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        digitalAgreement: formData.digitalAgreement,
        tags: formData.tagString ? formData.tagString.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: 'Pending_Verification',
        invitedBy: user.uid,
        invitedByName: userData?.fullName || user.displayName,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, `projects/${projectTarget.id}/stakeholders`), payload);
      setShowAddModal(false);
      setFormData({
        name: '',
        role: 'Principal Agent',
        email: '',
        phone: '',
        company: '',
        tagString: '',
        digitalAgreement: true
      });
    } catch (error) {
      console.error("Error adding stakeholder:", error);
    }
  };

  const approveInvite = async (stakeholder: Stakeholder) => {
    if (userData?.role !== 'Super_Admin') return;
    
    try {
      await updateDoc(doc(db, `projects/${projectTarget.id}/stakeholders`, stakeholder.id), {
        status: 'Awaiting_Response',
        approvedBy: user.uid,
        approvedByName: userData?.fullName,
        approvedAt: serverTimestamp(),
        invitedAt: serverTimestamp()
      });
      
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/?inviteId=${stakeholder.id}&projectId=${projectTarget.id}`;

      // Dropped email functionality per user request
      toast.success(
        <div>
           <p className="font-bold">Invitation Approved.</p>
           <p className="text-xs opacity-80 mt-1">Share this link directly: {inviteUrl}</p>
        </div>,
        { duration: 10000 }
      );
    } catch (error) {
      console.error("Error approving invite:", error);
    }
  };

  const removeStakeholder = async (id: string) => {
    if (window.confirm("Terminate this stakeholder assignment?")) {
      try {
        await deleteDoc(doc(db, `projects/${projectTarget.id}/stakeholders`, id));
      } catch (error) {
        console.error("Error removing stakeholder:", error);
      }
    }
  };

  const importFromContacts = async () => {
    setIsRequestingContacts(true);
    // Attempting to use the Contacts API if available
    try {
      if (window.self !== window.top) {
        alert("Contacts API cannot be used within the preview iframe. Please open the app in a new tab to use this feature, or enter details manually.");
      } else if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
        const props = ['name', 'email', 'tel'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        if (contacts.length > 0) {
          const contact = contacts[0];
          setFormData(prev => ({
            ...prev,
            name: contact.name?.[0] || '',
            email: contact.email?.[0] || '',
            phone: contact.tel?.[0] || ''
          }));
        }
      } else {
        alert("Mobile device contacts API not available in this browser environment. Permissions granted, please enter manually.");
      }
    } catch (err: any) {
      console.warn("Contact selection failed:", err);
      if (err.message && err.message.includes('top frame')) {
        alert("Contacts API cannot be used within the preview iframe. Please open the app in a new tab.");
      }
    } finally {
      setIsRequestingContacts(false);
    }
  };

  // Contractual Compliance Recommendations
  const getComplianceCheck = () => {
    const requiredRoles = ['Client', 'Principal Agent', 'Architect', 'Quantity Surveyor', 'Health & Safety Agent'];
    if (projectTarget.contractType === 'JBCC') {
        requiredRoles.push('Principal Contractor');
    }
    
    const missingRoles = requiredRoles.filter(role => 
      !stakeholders.some(s => s.role === role && s.status !== 'Pending_Verification')
    );

    return missingRoles;
  };

  const missingRoles = getComplianceCheck();
  const allTags = Array.from(new Set(stakeholders.flatMap(s => s.tags || []))).sort();

  const filteredStakeholders = stakeholders.filter(s => 
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.company?.toLowerCase().includes(searchTerm.toLowerCase() || '')) &&
    (!selectedTag || (s.tags && s.tags.includes(selectedTag)))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-olive-primary" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300">Professional Team & Stakeholders</span>
          </div>
          <h1 className="text-4xl font-light text-olive-primary tracking-tight uppercase leading-none">Stakeholder Registry</h1>
          <p className="text-zinc-500 mt-3 text-[10px] font-medium tracking-[0.2em] uppercase opacity-60">Directory of professional appointments and authorized site personnel.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => setShowMindMap(true)}
            className="px-6 py-4 border border-zinc-100 text-zinc-400 hover:text-olive-primary transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]"
          >
             <Network className="w-4 h-4" /> View Relationship Map
          </button>
          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" strokeWidth={1} />
             <input 
                type="text"
                placeholder="Search Registry..."
                className="w-full pl-12 pr-6 py-4 bg-white border border-zinc-100 rounded-none outline-none focus:border-olive-primary text-[10px] font-bold tracking-widest uppercase"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-8 py-4 bg-olive-primary text-olive-light rounded-none font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 hover:bg-olive-dark shrink-0"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1} /> Appoint Professional
          </button>
        </div>
      </div>

      {/* Tags Filter */}
      {allTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mt-4 custom-scrollbar">
          <button 
            onClick={() => setSelectedTag(null)}
            className={`px-4 py-2 border text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${!selectedTag ? 'bg-architect-coal text-white border-architect-coal' : 'bg-transparent text-zinc-400 border-zinc-200 hover:border-olive-primary'}`}
          >
            All Disciplines
          </button>
          {allTags.map(tag => (
            <button 
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 border text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedTag === tag ? 'bg-olive-primary text-white border-olive-primary' : 'bg-transparent text-zinc-400 border-zinc-200 hover:border-olive-primary'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Compliance Warning */}
      {missingRoles.length > 0 && (
        <motion.div 
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-zinc-50 p-6 border-l-4 border-olive-primary flex items-start gap-6"
        >
          <div className="w-12 h-12 bg-white flex items-center justify-center border border-zinc-100 shrink-0">
             <ShieldCheck className="w-6 h-6 text-olive-primary" strokeWidth={1} />
          </div>
          <div>
            <h4 className="text-[10px] font-black tracking-widest uppercase mb-2">Mandatory Appointments</h4>
            <p className="text-xs text-zinc-500 leading-relaxed font-medium"> To ensure alignment with <span className="text-olive-primary font-bold">{projectTarget.contractType}</span> framework, the following mandatory appointments are missing or pending verification:</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {missingRoles.map(role => (
                <span key={role} className="px-3 py-1 bg-white border border-zinc-100 text-[8px] font-black uppercase tracking-widest text-zinc-400">
                  {role}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stakeholders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
        <AnimatePresence>
          {filteredStakeholders.map((s, i) => (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key={s.id}
              className="bg-white p-8 border border-zinc-50 group hover:border-olive-primary transition-all relative"
            >
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-zinc-50 border border-zinc-100 flex items-center justify-center text-xs font-black text-olive-primary group-hover:bg-olive-primary group-hover:text-white transition-all">
                      {s.name.charAt(0)}
                   </div>
                   <div>
                     <span className="text-[8px] font-black text-zinc-300 tracking-[0.2em] uppercase leading-none">{s.role}</span>
                     <h4 className="text-sm font-bold text-architect-coal uppercase mt-1 tracking-tight">{s.name}</h4>
                   </div>
                 </div>
                 {s.status === 'Pending_Verification' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-sm">
                       <Clock className="w-3 h-3" strokeWidth={2} />
                       <span className="text-[7px] font-black uppercase tracking-widest">Pending</span>
                    </div>
                 )}
                 {s.status === 'Awaiting_Response' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-50 text-blue-700 border border-blue-100 rounded-sm">
                       <Mail className="w-3 h-3" strokeWidth={2} />
                       <span className="text-[7px] font-black uppercase tracking-widest">Awaiting Link</span>
                    </div>
                 )}
                 {s.status === 'Invited' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-sm">
                       <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                       <span className="text-[7px] font-black uppercase tracking-widest">Accepted</span>
                    </div>
                 )}
              </div>

              {s.tags && s.tags.length > 0 && (
                <div className="flex gap-2 mb-6 flex-wrap">
                  {s.tags.map(t => (
                    <span key={t} className="px-2 py-1 bg-zinc-50 border border-zinc-100 text-[8px] font-black uppercase tracking-widest text-zinc-500 rounded-sm">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-3 mb-8">
                {s.company && (
                  <div className="flex items-center gap-3 text-zinc-400">
                    <Building2 className="w-4 h-4" strokeWidth={1} />
                    <span className="text-[10px] font-medium tracking-tight uppercase">{s.company}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-zinc-400">
                  <Mail className="w-4 h-4" strokeWidth={1} />
                  <span className="text-[10px] font-medium truncate tracking-tight">{s.email}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400">
                  <Smartphone className="w-4 h-4" strokeWidth={1} />
                  <span className="text-[10px] font-medium tracking-tight">{s.phone}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
                 <div className="flex gap-2">
                    {s.status === 'Pending_Verification' && userData?.role === 'Super_Admin' && (
                      <button 
                        onClick={() => approveInvite(s)}
                        className="px-4 py-2 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
                      >
                         <Check className="w-3 h-3" /> Approve Invite
                      </button>
                    )}
                    {s.status === 'Awaiting_Response' && (
                      <button 
                        onClick={async () => {
                          const now = new Date();
                          const invitedTime = s.invitedAt?.toDate ? s.invitedAt.toDate() : new Date(0);
                          const minutesSinceInvite = (now.getTime() - invitedTime.getTime()) / 60000;
                          
                          if (minutesSinceInvite < 30) {
                            alert(`Please wait at least 30 minutes before resending. (${Math.ceil(30 - minutesSinceInvite)}m remaining)`);
                            return;
                          }
                          
                          try {
                            await updateDoc(doc(db, `projects/${projectTarget.id}/stakeholders`, s.id), {
                              invitedAt: serverTimestamp()
                            });
                            
                            const baseUrl = window.location.origin;
                            const inviteUrl = `${baseUrl}/?inviteId=${s.id}&projectId=${projectTarget.id}`;

                            // Dropped email functionality
                            toast.success(
                              <div>
                                 <p className="font-bold">Invitation Resent.</p>
                                 <p className="text-xs opacity-80 mt-1">Share this link directly: {inviteUrl}</p>
                              </div>,
                              { duration: 10000 }
                            );
                          } catch (err) {
                            console.error('Failed to resend:', err);
                            alert('Failed to resend invitation.');
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                      >
                         <Mail className="w-3 h-3" /> Resend Invite
                      </button>
                    )}
                 </div>
                 <button 
                    onClick={() => removeStakeholder(s.id)}
                    className="p-3 text-zinc-200 hover:text-red-700 transition-colors"
                 >
                    <X className="w-4 h-4" strokeWidth={1} />
                 </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 lg:p-12">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowAddModal(false)}
               className="absolute inset-0 bg-architect-coal/60 backdrop-blur-xl"
             />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row max-h-[90vh] rounded-3xl md:rounded-[2.5rem]"
             >
                <div className="w-full md:w-64 bg-zinc-50 p-6 md:p-10 border-b md:border-b-0 md:border-r border-zinc-100 hidden md:block shrink-0">
                   <div className="w-10 h-10 md:w-12 md:h-12 bg-white flex items-center justify-center mb-6 md:mb-10 border border-zinc-100">
                      <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-olive-primary" strokeWidth={1} />
                   </div>
                   <h3 className="text-lg md:text-xl font-light text-olive-primary uppercase tracking-tight mb-4 leading-tight">Professional Appointment</h3>
                   <p className="text-[9px] text-zinc-400 font-medium tracking-widest leading-loose uppercase">All professional team members must be recorded for contractual compliance.</p>
                </div>

                <div className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto">
                   <div className="flex justify-between items-center mb-6 md:mb-10">
                      <h4 className="text-[10px] font-black tracking-[0.4em] text-zinc-300 uppercase">Input Credentials</h4>
                      <button onClick={() => setShowAddModal(false)} className="text-zinc-300 hover:text-architect-coal">
                         <X className="w-6 h-6" strokeWidth={1} />
                      </button>
                   </div>

                   <form onSubmit={handleAddStakeholder} className="space-y-6">
                      <div className="flex justify-between items-center">
                         <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Name & Title</label>
                         <button 
                            type="button"
                            onClick={importFromContacts}
                            className="text-[8px] font-black text-olive-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-80 disabled:opacity-30"
                            disabled={isRequestingContacts}
                         >
                            <Smartphone className="w-3 h-3" /> Quick Pull Contacts
                         </button>
                      </div>
                      <input 
                         required
                         type="text"
                         placeholder="Authorized Full Name"
                         className="w-full px-8 py-5 bg-zinc-50 border border-transparent focus:border-olive-primary outline-none text-[12px] font-bold tracking-widest uppercase transition-all"
                         value={formData.name}
                         onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />

                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Assigned Role</label>
                           <select 
                             className="w-full px-6 py-4 bg-zinc-50 border border-transparent focus:border-olive-primary outline-none text-[10px] font-black uppercase appearance-none tracking-widest"
                             value={formData.role}
                             onChange={(e) => setFormData({...formData, role: e.target.value})}
                           >
                             {Object.entries(roleGroups).map(([group, roles]) => (
                               <optgroup key={group} label={group}>
                                 {roles.map(r => <option key={r} value={r}>{r}</option>)}
                               </optgroup>
                             ))}
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Firm / Entity</label>
                           <input 
                             type="text"
                             placeholder="Firm / Entity"
                             className="w-full px-6 py-4 bg-zinc-50 border border-transparent focus:border-olive-primary outline-none text-[10px] font-bold tracking-widest uppercase"
                             value={formData.company}
                             onChange={(e) => setFormData({...formData, company: e.target.value})}
                           />
                         </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tags / Disciplines (Comma Separated)</label>
                        <input 
                           type="text"
                           placeholder="e.g. Site Management, Surveying, Executive"
                           className="w-full px-8 py-5 bg-zinc-50 border border-transparent focus:border-olive-primary outline-none text-[10px] font-bold tracking-widest uppercase transition-all"
                           value={formData.tagString}
                           onChange={(e) => setFormData({...formData, tagString: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Address</label>
                           <input 
                             required
                             type="email"
                             className="w-full px-6 py-4 bg-zinc-50 border border-transparent focus:border-olive-primary outline-none text-[10px] font-bold tracking-widest uppercase"
                             value={formData.email}
                             onChange={(e) => setFormData({...formData, email: e.target.value})}
                           />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Phone Number</label>
                           <input 
                             type="tel"
                             className="w-full px-6 py-4 bg-zinc-50 border border-transparent focus:border-olive-primary outline-none text-[10px] font-bold tracking-widest uppercase"
                             value={formData.phone}
                             onChange={(e) => setFormData({...formData, phone: e.target.value})}
                           />
                         </div>
                      </div>

                      <div className="flex items-center gap-4 p-6 bg-zinc-50 border border-dashed border-zinc-200">
                         <input 
                            type="checkbox"
                            checked={formData.digitalAgreement}
                            onChange={(e) => setFormData({...formData, digitalAgreement: e.target.checked})}
                            className="w-4 h-4 text-olive-primary focus:ring-olive-primary border-zinc-300"
                         />
                         <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-loose">Individual agrees to digital transmission of all contractual notices (JBCC / Cl. 1.5)</span>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-6 bg-olive-primary text-olive-light font-black text-[10px] uppercase tracking-[0.4em] hover:bg-olive-dark transition-all shadow-2xl shadow-olive-primary/20"
                      >
                         Confirm Appointment
                      </button>
                   </form>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMindMap && (
          <StakeholderMindMap 
            stakeholders={stakeholders} 
            projectName={projectTarget.name} 
            onClose={() => setShowMindMap(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
