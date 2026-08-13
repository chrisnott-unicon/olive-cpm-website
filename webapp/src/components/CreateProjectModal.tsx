import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Loader2, ChevronRight, ChevronLeft, CheckCircle2, Circle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export default function CreateProjectModal({ isOpen, onClose, userData }: { isOpen: boolean, onClose: () => void, userData?: any }) {
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    contractType: 'JBCC',
    currency: 'ZAR',
    status: 'Pre-construction',
    plannedStartDate: '',
    plannedDuration: '',
    location: '',
    clientName: '',
    clientAddress: '',
    clientEmail: '',
    clientPhone: '',
    clientDigitalAgreement: false,
    projectManager: '',
    paEmail: '',
    paPhone: '',
    paDigitalAgreement: false,
    architect: '',
    quantitySurveyor: '',
    structuralEngineer: '',
    civilEngineer: '',
    mechanicalEngineer: '',
    electricalEngineer: '',
    fireEngineer: '',
    healthSafety: '',
    principalContractor: '',
    nsContractors: '',
    tradeContractors: '',
    lat: '',
    lng: '',
    initialContractValue: '',
    initialActiveStaff: '',
    recordedIncidents: '',
    initialProgress: '',
    pendingVariations: ''
  });

  const steps = [
    { id: 'basics', title: 'Identity & Type', desc: 'Core contractual parameters' },
    { id: 'location', title: 'Location & Schedule', desc: 'Site details and timelines' },
    { id: 'kpis', title: 'Dashboard KPIs', desc: 'Baseline metrics for tracking' },
    { id: 'stakeholders', title: 'Stakeholders', desc: 'Key project participants' }
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) setActiveStep(s => s + 1);
  };

  const handleBack = () => {
    if (activeStep > 0) setActiveStep(s => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStep !== steps.length - 1) {
      handleNext();
      return;
    }
    
    setLoading(true);
    try {
      const retention = formData.contractType === 'JBCC' ? 0.10 : 0.05;
      await addDoc(collection(db, 'projects'), {
        name: formData.name,
        orgId: userData?.orgId || null,
        contractType: formData.contractType,
        currency: formData.currency,
        status: formData.status,
        plannedStartDate: formData.plannedStartDate,
        plannedDuration: formData.plannedDuration ? Number(formData.plannedDuration) : 0,
        location: formData.location,
        coordinates: { lat: Number(formData.lat) || 0, lng: Number(formData.lng) || 0 },
        clientDetails: {
          name: formData.clientName,
          address: formData.clientAddress,
          email: formData.clientEmail,
          phone: formData.clientPhone,
          digitalAgreement: formData.clientDigitalAgreement
        },
        professionals: {
          projectManager: formData.projectManager,
          paEmail: formData.paEmail,
          paPhone: formData.paPhone,
          paDigitalAgreement: formData.paDigitalAgreement,
          architect: formData.architect,
          quantitySurveyor: formData.quantitySurveyor,
          structuralEngineer: formData.structuralEngineer,
          civilEngineer: formData.civilEngineer,
          mechanicalEngineer: formData.mechanicalEngineer,
          electricalEngineer: formData.electricalEngineer,
          fireEngineer: formData.fireEngineer,
          healthSafety: formData.healthSafety
        },
        principalContractor: formData.principalContractor,
        nsContractors: formData.nsContractors,
        tradeContractors: formData.tradeContractors,
        retentionRate: retention,
        initialContractValue: formData.initialContractValue ? Number(formData.initialContractValue) : null,
        initialActiveStaff: formData.initialActiveStaff ? Number(formData.initialActiveStaff) : null,
        recordedIncidents: formData.recordedIncidents ? Number(formData.recordedIncidents) : 0,
        initialProgress: formData.initialProgress ? Number(formData.initialProgress) : null,
        pendingVariations: formData.pendingVariations ? Number(formData.pendingVariations) : 0,
        createdAt: serverTimestamp(),
      });
      setFormData({
        name: '', contractType: 'JBCC', currency: 'ZAR', status: 'Pre-construction', 
        plannedStartDate: '', plannedDuration: '', location: '', 
        clientName: '', clientAddress: '', clientEmail: '', clientPhone: '', clientDigitalAgreement: false,
        projectManager: '', paEmail: '', paPhone: '', paDigitalAgreement: false,
        architect: '', quantitySurveyor: '', structuralEngineer: '', civilEngineer: '', mechanicalEngineer: '', electricalEngineer: '', fireEngineer: '', healthSafety: '',
        principalContractor: '', nsContractors: '', tradeContractors: '', lat: '', lng: '',
        initialContractValue: '', initialActiveStaff: '', recordedIncidents: '', initialProgress: '', pendingVariations: ''
      });
      setActiveStep(0);
      onClose();
    } catch (error) {
      console.error("Error adding project:", error);
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-architect-coal/40 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white w-full max-w-5xl shadow-2xl relative z-10 flex overflow-hidden min-h-[600px] h-[80vh]"
      >
        {/* Sidebar */}
        <div className="w-1/3 bg-architect-coal text-white p-8 border-r border-zinc-800 flex flex-col">
          <div className="mb-12">
            <h2 className="text-xl font-black uppercase tracking-[0.2em] mb-2">New Project</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
              Guided setup for establishing a new contract parameter baseline.
            </p>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;
              
              return (
                <button 
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left flex items-start gap-4 transition-all ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
                >
                  <div className="mt-1 shrink-0">
                    {isPast ? (
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
          <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-olive-primary">Step {activeStep + 1} of {steps.length}</p>
              <h3 className="text-lg font-bold text-architect-coal mt-1">{steps[activeStep].title}</h3>
            </div>
          </div>

          <div className="p-8 flex-1 overflow-y-auto">
            <form id="project-form" onSubmit={handleSubmit} className="h-full">
              {activeStep === 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Project Identifier</label>
                    <input required type="text" placeholder="e.g. Pretoria High Phase 1" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none transition-all text-sm font-bold placeholder:text-zinc-300" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Standard form</label>
                      <select className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-sm font-bold" value={formData.contractType} onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}>
                        <option value="JBCC">JBCC</option>
                        <option value="GCC">GCC</option>
                        <option value="NEC">NEC</option>
                        <option value="FIDIC">FIDIC</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Base Currency</label>
                      <select className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-sm font-bold" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                        <option value="ZAR">ZAR (R)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="BWP">BWP (P)</option>
                        <option value="NAD">NAD (N$)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Location Details</label>
                    <input type="text" placeholder="Physical Address or general location" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-sm font-bold mb-2" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" step="any" placeholder="Latitude (e.g. -25.747)" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-sm font-bold" value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} />
                      <input type="number" step="any" placeholder="Longitude (e.g. 28.229)" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-sm font-bold" value={formData.lng} onChange={(e) => setFormData({ ...formData, lng: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Start Date</label>
                      <input type="date" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-sm font-bold text-zinc-500" value={formData.plannedStartDate} onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Planned Duration (Weeks)</label>
                      <input type="number" placeholder="e.g. 52" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-sm font-bold text-zinc-500" value={formData.plannedDuration} onChange={(e) => setFormData({ ...formData, plannedDuration: e.target.value })} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Phase Status</label>
                    <select className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none text-sm font-bold" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="Pre-Design">Pre-Design</option>
                      <option value="Design">Design</option>
                      <option value="Pre-construction">Pre-construction</option>
                      <option value="Construction">Construction</option>
                      <option value="Post-construction">Post-construction</option>
                    </select>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="bg-olive-50 p-6 border border-olive-100 mb-6">
                    <p className="text-[10px] text-olive-800 font-bold tracking-widest uppercase leading-relaxed">
                      These values will seed the initial state of your project dashboard KPIs.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Initial Contract Value ({formData.currency})</label>
                    <input type="number" step="any" placeholder="e.g. 15000000" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none font-bold text-sm" value={formData.initialContractValue} onChange={(e) => setFormData({ ...formData, initialContractValue: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Initial Staff Count</label>
                      <input type="number" placeholder="Estimated staff on site" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none font-bold text-sm" value={formData.initialActiveStaff} onChange={(e) => setFormData({ ...formData, initialActiveStaff: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Current Progress (%)</label>
                      <input type="number" min="0" max="100" placeholder="e.g. 15" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none font-bold text-sm" value={formData.initialProgress} onChange={(e) => setFormData({ ...formData, initialProgress: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Pending Variations</label>
                      <input type="number" placeholder="e.g. 2" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none font-bold text-sm" value={formData.pendingVariations} onChange={(e) => setFormData({ ...formData, pendingVariations: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Recorded Incidents</label>
                      <input type="number" placeholder="e.g. 0" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none font-bold text-sm" value={formData.recordedIncidents} onChange={(e) => setFormData({ ...formData, recordedIncidents: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Client / Employer Name</label>
                      <input type="text" placeholder="e.g. Department of Public Works" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none font-bold text-sm" value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Principal Contractor</label>
                      <input type="text" placeholder="Company & Details" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none font-bold text-sm" value={formData.principalContractor} onChange={(e) => setFormData({ ...formData, principalContractor: e.target.value })} />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Principal Agent / PM Details</label>
                      <input type="text" placeholder="Company Name" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 focus:border-olive-primary outline-none font-bold text-sm" value={formData.projectManager} onChange={(e) => setFormData({ ...formData, projectManager: e.target.value })} />
                    </div>
                    
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest pt-4">Additional stakeholders can be configured later in the project settings.</p>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="p-6 border-t border-zinc-100 flex items-center justify-between bg-zinc-50 shrink-0">
            <button 
              type="button"
              onClick={activeStep === 0 ? onClose : handleBack}
              className="px-6 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-architect-coal transition-colors flex items-center gap-2"
            >
              {activeStep === 0 ? 'Cancel' : <><ChevronLeft className="w-4 h-4" /> Back</>}
            </button>

            <button 
              form="project-form"
              disabled={loading}
              type="submit"
              className="px-8 py-3 bg-architect-coal text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-olive-primary transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : activeStep === steps.length - 1 ? (
                'Commit Project Baseline'
              ) : (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
