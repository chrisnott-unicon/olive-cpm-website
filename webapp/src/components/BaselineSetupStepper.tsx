import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, UploadCloud, AlertCircle, ChevronRight, X } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface BaselineSetupStepperProps {
  projectTarget: any;
  user: any;
  userData: any;
  records: any[];
  onClose: () => void;
}

export default function BaselineSetupStepper({ projectTarget, user, userData, records, onClose }: BaselineSetupStepperProps) {
  const steps = [
    { id: 'Contract Agreement', title: 'Contract Agreement', desc: 'Principal building agreement or initial contract framework.' },
    { id: 'Tender Drawing', title: 'Tender Drawings', desc: 'Approved drawing baseline for construction reference.' },
    { id: 'Tender Programme', title: 'Tender Programme', desc: 'Baseline schedule against which progress is measured.' }
  ];

  const getStepStatus = (categoryId: string) => {
    return records.some(r => r.category === categoryId);
  };

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    referenceNo: '',
    description: ''
  });

  const handleUpload = async (categoryId: string) => {
    try {
      await addDoc(collection(db, 'projects', projectTarget.id, 'baseline_records'), {
        ...formData,
        category: categoryId,
        uploadedBy: userData?.fullName || user.email,
        status: 'Active',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'projects', projectTarget.id, 'audit_logs'), {
        action: 'BASELINE_RECORD_COMMITTED',
        details: `Guided setup committed permanent baseline record: ${formData.title} (${categoryId})`,
        userId: user.uid,
        userName: userData?.fullName || user.email,
        timestamp: serverTimestamp()
      });

      setFormData({ title: '', referenceNo: '', description: '' });
      
      const nextIncomplete = steps.findIndex((step, idx) => idx > activeStep && !getStepStatus(step.id));
      if (nextIncomplete !== -1) {
        setActiveStep(nextIncomplete);
      } else {
        const anyIncomplete = steps.findIndex(step => !getStepStatus(step.id));
        if (anyIncomplete !== -1) {
          setActiveStep(anyIncomplete);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Failed to add record');
    }
  };

  const isCurrentStepComplete = getStepStatus(steps[activeStep].id);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-4xl shadow-2xl flex overflow-hidden min-h-[600px]"
      >
        {/* Sidebar */}
        <div className="w-1/3 bg-architect-coal text-white p-8 border-r border-zinc-800">
          <div className="mb-12">
            <h2 className="text-xl font-black uppercase tracking-[0.2em] mb-2">Baseline Setup</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
              Complete the project contractual baseline to establish the foundation for all subsequent tracking.
            </p>
          </div>

          <div className="space-y-6">
            {steps.map((step, idx) => {
              const isComplete = getStepStatus(step.id);
              const isActive = activeStep === idx;
              
              return (
                <button 
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left flex items-start gap-4 transition-all ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
                >
                  <div className="mt-1 shrink-0">
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-olive-primary" />
                    ) : (
                      <Circle className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                    )}
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 pr-4">{step.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white flex flex-col">
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-olive-primary">Step {activeStep + 1} of {steps.length}</p>
              <h3 className="text-lg font-bold text-architect-coal mt-1">{steps[activeStep].title}</h3>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-architect-coal transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 flex-1 overflow-y-auto">
            {isCurrentStepComplete ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-olive-50 rounded-full flex items-center justify-center border-4 border-olive-100 mb-2">
                  <CheckCircle2 className="w-10 h-10 text-olive-primary" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-architect-coal uppercase tracking-widest mb-2">Category Satisfied</h4>
                  <p className="text-xs text-zinc-500 max-w-sm">
                    A baseline record for {steps[activeStep].title} has already been securely deposited into the project vault.
                  </p>
                </div>
                
                <div className="pt-8">
                  <button 
                    onClick={() => {
                      const next = activeStep + 1;
                      if (next < steps.length) setActiveStep(next);
                      else onClose();
                    }}
                    className="px-8 py-4 bg-architect-coal text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-olive-primary transition-colors"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Required Baseline Missing</p>
                    <p className="text-[10px] text-amber-700 font-medium">Please upload the accepted {steps[activeStep].title} to establish the official project baseline against which future variations will be measured.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Record Title</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-xs font-bold"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder={`e.g. Principal ${steps[activeStep].title}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Reference No.</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-xs font-mono"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData({...formData, referenceNo: e.target.value})}
                    placeholder="e.g. REV-00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Description</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-xs h-24 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description of the record limits or inclusions..."
                  />
                </div>

                <div className="border-2 border-dashed border-zinc-200 bg-zinc-50 p-8 text-center flex flex-col items-center justify-center cursor-pointer hover:border-olive-primary hover:bg-olive-50 transition-colors group">
                  <UploadCloud className="w-8 h-8 text-zinc-400 mb-3 group-hover:text-olive-primary transition-colors" />
                  <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest">Upload Associated File</p>
                  <p className="text-[10px] text-zinc-500 mt-2">Required: PDF, DOCX, ZIP</p>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex justify-end">
                  <button 
                    onClick={() => handleUpload(steps[activeStep].id)}
                    disabled={!formData.title}
                    className="px-8 py-4 bg-olive-primary text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-olive-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Commit Baseline Record <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
