import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateValuationAnalysis } from '../services/aiService';
import { 
  Calculator, 
  FileCheck, 
  Sparkles, 
  TrendingUp,
  Download,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Valuations({ user, userData, projectTarget }: { user: any, userData?: any, projectTarget?: any }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [valuations, setValuations] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);

  const getCurrencySymbol = (currencyCode?: string) => {
    switch (currencyCode) {
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'EUR': return '€';
      case 'AUD': return 'A$';
      case 'ZAR': return 'R';
      default: return 'R';
    }
  };

  const currentProject = projectTarget || projects.find(p => p.id === selectedProject);
  const currencySymbol = getCurrencySymbol(currentProject?.currency);

  useEffect(() => {
    if (projectTarget) {
      setSelectedProject(projectTarget.id);
      return;
    }
    const q = query(collection(db, 'projects'), where('status', 'in', ['Pre-construction', 'Construction']));
    getDocs(q).then((snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (userData?.role !== 'Super_Admin') {
        const allowed = userData?.allowedProjects || [];
        data = data.filter(p => allowed.includes(p.id));
      }
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0].id);
    });
  }, [projectTarget]);

  useEffect(() => {
    if (!selectedProject) return;
    const q = query(
      collection(db, `projects/${selectedProject}/valuations`), 
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setValuations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [selectedProject]);

  const handleRunValuation = async () => {
    if (!selectedProject) return;
    setIsGenerating(true);
    
    try {
      const project = projectTarget || projects.find(p => p.id === selectedProject);
      const boq = [
        { section: 'Earthworks', total: 450000, progress: 0.8 },
        { section: 'Concrete Works', total: 1200000, progress: 0.4 },
        { section: 'Brickwork', total: 800000, progress: 0.1 },
      ];
      const fieldProgress = [
        { task: 'Foundations', status: 'Completed', date: '2024-04-10' },
        { task: 'Ground Floor Columns', status: 'In Progress', date: '2024-04-25' },
      ];

      const analysis = await generateValuationAnalysis(boq, fieldProgress, project?.contractType || 'JBCC');
      
      const valAmount = boq.reduce((acc, curr) => acc + (curr.total * curr.progress), 0);
      const retentionVal = valAmount * (project?.retentionRate || 0.1);

      await addDoc(collection(db, `projects/${selectedProject}/valuations`), {
        projectId: selectedProject,
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        certificateNumber: `VAL-${valAmount.toString().slice(-4)}`,
        grossAmount: valAmount,
        retention: retentionVal,
        netAmount: valAmount - retentionVal,
        status: 'Draft',
        aiAnalysis: analysis,
        createdAt: serverTimestamp(),
      });

      setActiveAnalysis(analysis);
    } catch (error) {
      console.error("Valuation error:", error);
    }
    setIsGenerating(false);
  };

  return (
    <div className="space-y-12 pb-20">
      {!projectTarget && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-px bg-olive-primary" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300">CLAUSE 25.0 / 31.0</span>
            </div>
            <h1 className="text-4xl font-light text-olive-primary tracking-tight uppercase">Interim Certificates</h1>
            <p className="text-zinc-500 mt-3 text-[10px] font-medium tracking-[0.2em] uppercase opacity-60">Interim payment certificates based on BOQ progress.</p>
          </div>
          <div className="w-full md:w-96 border-l border-zinc-100 pl-10">
            <label className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.3em] mb-4 block">Select Certificate Ledger</label>
            <div className="relative">
               <Calculator className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-primary" strokeWidth={1} />
               <select 
                className="w-full pl-14 pr-6 py-5 bg-white border border-zinc-100 rounded-none outline-none focus:border-olive-primary text-[10px] font-black tracking-widest uppercase appearance-none transition-all"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="">Select Contract...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {!selectedProject ? (
        <div className="py-32 text-center bg-white border border-dashed border-zinc-200 rounded-[3rem]">
          <div className="inline-flex p-10 bg-zinc-100 rounded-full mb-6">
            <Calculator className="w-16 h-16 text-zinc-200" />
          </div>
          <h3 className="text-xl font-black text-architect-coal">No ledger selected</h3>
          <p className="text-zinc-400 max-w-xs mx-auto mt-2 font-medium">Please select a project to view and generate payment certificates.</p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-center bg-architect-coal p-12 rounded-none text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            <div className="mb-8 md:mb-0">
              <h2 className="text-2xl font-light uppercase tracking-[0.1em]">Professional Payment Certification</h2>
              <p className="text-white/40 text-[9px] font-black tracking-[0.2em] uppercase mt-3">Cross-check progress against BOQ for {projects.find(p => p.id === selectedProject)?.name}</p>
            </div>
            <button 
              onClick={handleRunValuation}
              disabled={isGenerating}
              className="px-10 py-5 bg-olive-primary text-olive-light font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-olive-dark transition-all flex items-center gap-4 rounded-none disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" strokeWidth={1} />}
              {isGenerating ? 'VERIFYING VALUATION...' : 'GENERATE INTERIM CERTIFICATE'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {valuations.map((val, i) => (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                key={val.id}
                className="bg-white p-10 border border-zinc-100 flex flex-col md:flex-row items-center gap-10 group hover:border-olive-primary transition-all rounded-none"
              >
                <div className="flex items-center gap-8 flex-1">
                  <div className="w-16 h-16 bg-zinc-50 flex items-center justify-center font-black text-zinc-300 border border-zinc-100 group-hover:bg-olive-primary group-hover:text-white transition-all text-[10px] tracking-widest uppercase">
                    {val.certificateNumber || 'VAL-01'}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300 leading-none">STATUS:</span>
                       <span className="text-[10px] font-black uppercase tracking-[0.1em] text-olive-primary">{val.status}</span>
                    </div>
                    <h4 className="text-2xl font-light text-architect-coal tracking-tight uppercase">CERTIFIED PORTION: {currencySymbol} {val.netAmount?.toLocaleString()}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-10 px-10 md:border-l border-zinc-100">
                  <div>
                    <p className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.3em] mb-2">GROSS VALUE</p>
                    <p className="text-sm font-bold text-zinc-900">{currencySymbol} {val.grossAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.3em] mb-2">RETENTION</p>
                    <p className="text-sm font-bold text-zinc-900 text-red-800">{currencySymbol} {val.retention?.toLocaleString()}</p>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.3em] mb-2">CLAIM DATE</p>
                    <p className="text-sm font-bold text-zinc-900">{val.createdAt?.toDate ? val.createdAt.toDate().toLocaleDateString() : 'Just now'}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveAnalysis(val.aiAnalysis)}
                    className="p-5 bg-zinc-50 text-zinc-400 hover:bg-olive-primary hover:text-white transition-all border border-zinc-50"
                  >
                    <FileCheck className="w-4 h-4" strokeWidth={1} />
                  </button>
                  <button className="p-5 bg-zinc-50 text-zinc-300 hover:text-architect-coal transition-all border border-zinc-50">
                    <Download className="w-4 h-4" strokeWidth={1} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Overlay */}
      <AnimatePresence>
        {activeAnalysis && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveAnalysis(null)}
              className="absolute inset-0 bg-architect-coal/60 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-olive-primary flex items-center justify-center shadow-lg shadow-olive-primary/20">
                     <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-architect-coal uppercase tracking-tight">Valuation Verification</h2>
                </div>
                <div className="prose prose-zinc max-w-none">
                  <div className="bg-zinc-50 p-8 rounded-3xl border border-zinc-100 max-h-[400px] overflow-y-auto">
                    <p className="text-sm text-zinc-700 leading-relaxed font-medium whitespace-pre-wrap">{activeAnalysis}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveAnalysis(null)}
                  className="w-full mt-10 py-5 bg-architect-coal text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-opacity-90 transition-all"
                >
                  Confirm Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
