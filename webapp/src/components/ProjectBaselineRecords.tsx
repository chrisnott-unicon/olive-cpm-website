import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FileText, UploadCloud, File, Download, Search, AlertCircle, Link, FileArchive, Trash2, Calendar, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BaselineSetupStepper from './BaselineSetupStepper';

interface BaselineRecord {
  id: string;
  title: string;
  category: 'Contract Agreement' | 'Sub-contractor Agreement' | 'Tender Drawing' | 'Tender Programme' | 'Tender Qualification' | 'Other';
  description?: string;
  fileUrl?: string;
  referenceNo: string;
  uploadedBy: string;
  createdAt: any;
  status: 'Active' | 'Superseded' | 'Draft';
}

interface ProjectBaselineRecordsProps {
  projectTarget: any;
  user: any;
  userData: any;
}

export default function ProjectBaselineRecords({ projectTarget, user, userData }: ProjectBaselineRecordsProps) {
  const [records, setRecords] = useState<BaselineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSetupStepper, setShowSetupStepper] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'Contract Agreement',
    description: '',
    referenceNo: '',
  });

  const categories = [
    'Contract Agreement',
    'Sub-contractor Agreement',
    'Tender Drawing',
    'Tender Programme',
    'Tender Qualification',
    'Other'
  ];

  useEffect(() => {
    if (!projectTarget?.id) return;

    const q = query(collection(db, 'projects', projectTarget.id, 'baseline_records'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BaselineRecord[];
      setRecords(recs.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectTarget.id]);

  const handleAddRecord = async () => {
    try {
      await addDoc(collection(db, 'projects', projectTarget.id, 'baseline_records'), {
        ...formData,
        uploadedBy: userData?.fullName || user.email,
        status: 'Active',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'projects', projectTarget.id, 'audit_logs'), {
        action: 'BASELINE_RECORD_COMMITTED',
        details: `Committed permanent baseline record: ${formData.title} (${formData.category})`,
        userId: user.uid,
        userName: userData?.fullName || user.email,
        timestamp: serverTimestamp()
      });

      setShowAddModal(false);
      setFormData({
        title: '',
        category: 'Contract Agreement',
        description: '',
        referenceNo: '',
      });
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Failed to add record');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this baseline record?")) {
      try {
        await deleteDoc(doc(db, 'projects', projectTarget.id, 'baseline_records', id));
      } catch (err) {
        console.error("Failed to delete record:", err);
      }
    }
  };

  const filteredRecords = records.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const setupSteps = ['Contract Agreement', 'Tender Programme', 'Tender Drawing'];
  const setupComplete = setupSteps.every(cat => records.some(r => r.category === cat));
  const completedSteps = setupSteps.filter(cat => records.some(r => r.category === cat)).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-architect-coal p-8 flex justify-between items-center text-white">
        <div>
          <h2 className="text-xl font-black uppercase tracking-[0.3em] font-sans">Permanent Project Records</h2>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2 max-w-xl leading-relaxed">
            Contractual baseline records including original agreements, tender drawings, tender programmes, and qualifications. These form the permanent statutory foundation for all subsequent site actions.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-4 bg-olive-primary text-olive-light rounded-none font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 hover:bg-olive-dark shrink-0"
        >
          <UploadCloud className="w-4 h-4" /> Add Baseline Record
        </button>
      </div>

      {!loading && !setupComplete && userData?.role === 'Super_Admin' && (
        <div className="bg-amber-50 border border-amber-200 p-6 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-architect-coal uppercase tracking-widest mb-1">Contractual Baseline Incomplete</h3>
              <p className="text-xs text-zinc-600">The core contractual baseline for '{projectTarget.name}' has not been fully established. Missing core statutory documents. ({completedSteps}/{setupSteps.length} deposited)</p>
            </div>
          </div>
          <button 
            onClick={() => setShowSetupStepper(true)}
            className="px-6 py-4 bg-architect-coal text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-olive-primary transition-colors shrink-0 shadow-lg"
          >
            Guided Baseline Setup <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-2">
        <div className="flex items-center gap-3 px-4 flex-1">
          <Search className="w-4 h-4 text-zinc-400" />
          <input 
            type="text"
            placeholder="Search baseline records..."
            className="bg-transparent border-none focus:outline-none text-xs font-bold uppercase tracking-widest text-zinc-600 w-full placeholder:text-zinc-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredRecords.map((record) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-zinc-100 p-6 shadow-sm hover:border-olive-primary transition-colors flex flex-col h-full group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-zinc-50 text-architect-coal">
                    {record.category.includes('Drawing') ? <FileText className="w-5 h-5" /> : 
                     record.category.includes('Programme') ? <Calendar className="w-5 h-5" /> : 
                     <FileArchive className="w-5 h-5" />}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400">
                    {record.createdAt?.toDate ? new Date(record.createdAt.toDate()).toLocaleDateString('en-ZA') : 'Pending'}
                  </span>
                </div>
                
                <div className="flex-1">
                  <p className="text-[9px] font-black text-olive-primary uppercase tracking-widest mb-2">{record.category}</p>
                  <h3 className="font-bold text-architect-coal mb-2 leading-tight">{record.title}</h3>
                  <p className="text-[10px] text-zinc-500 line-clamp-2">{record.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">Ref No.</p>
                    <p className="text-[10px] font-mono font-bold text-zinc-700">{record.referenceNo || 'N/A'}</p>
                  </div>
                  <div className="flex gap-2">
                     <button
                        className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition-colors"
                        title="Download Baseline Record"
                     >
                        <Download className="w-4 h-4" />
                     </button>
                     {userData?.role === 'Super_Admin' && (
                       <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Record"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl shadow-2xl"
          >
             <div className="bg-architect-coal text-white p-6 flex justify-between items-center">
                <div>
                   <h3 className="text-sm font-black uppercase tracking-[0.2em]">Upload Baseline Record</h3>
                   <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Establish Permanent Contractual Reference</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                  <AlertCircle className="w-6 h-6" />
                </button>
             </div>

             <div className="p-8 space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Record Title</label>
                   <input 
                      type="text"
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-xs font-bold"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Principal Contract Agreement JBCC"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Category</label>
                     <select 
                       className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-xs font-bold uppercase"
                       value={formData.category}
                       onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                     >
                       {categories.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Reference No.</label>
                     <input 
                        type="text"
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-xs font-mono"
                        value={formData.referenceNo}
                        onChange={(e) => setFormData({...formData, referenceNo: e.target.value})}
                        placeholder="e.g. CON-2024-001"
                     />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Description</label>
                   <textarea 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-xs h-24 resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Enter brief description of this baseline record..."
                   />
                </div>
                
                <div className="border-2 border-dashed border-zinc-200 bg-zinc-50 p-8 text-center flex flex-col items-center justify-center cursor-pointer hover:border-olive-primary transition-colors">
                   <UploadCloud className="w-8 h-8 text-zinc-400 mb-3" />
                   <p className="text-xs font-bold text-architect-coal uppercase tracking-widest">Upload File</p>
                   <p className="text-[10px] text-zinc-500 mt-2">PDF, DOCX, ZIP up to 50MB</p>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100">
                   <button 
                     onClick={() => setShowAddModal(false)}
                     className="px-6 py-3 border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-architect-coal transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleAddRecord}
                     disabled={!formData.title}
                     className="px-6 py-3 bg-olive-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-olive-dark transition-all disabled:opacity-50"
                   >
                     Save Baseline Record
                   </button>
                </div>
             </div>
          </motion.div>
        </div>
      )}

      {showSetupStepper && (
        <BaselineSetupStepper 
          projectTarget={projectTarget}
          user={user}
          userData={userData}
          records={records}
          onClose={() => setShowSetupStepper(false)}
        />
      )}
    </div>
  );
}
