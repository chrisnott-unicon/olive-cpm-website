import React, { useState } from 'react';
import { 
  FolderOpen, 
  FileText, 
  ClipboardCheck, 
  ShieldCheck,
  ChevronRight,
  Gavel,
  DraftingCompass,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DocumentManager from './DocumentManager';
import GenericDocumentManager from './GenericDocumentManager';
import RFIManager from './RFIManager';
import SiteInstructionManager from './SiteInstructionManager';

interface ProjectInformationHubProps {
  user: any;
  userData?: any;
  projectTarget: any;
  initialFileRef?: string;
  pinningContext?: { rfiId: string; drawingId: string } | null;
  onPinComplete?: () => void;
  onPinToDrawing?: (rfiId: string, drawingId: string) => void;
}

export default function ProjectDocuments({ user, userData, projectTarget, initialFileRef, pinningContext, onPinComplete, onPinToDrawing }: ProjectInformationHubProps) {
  const [activeSubView, setActiveSubView] = useState<'drawings' | 'specs' | 'agreements' | 'contracts' | 'rfis' | 'si'>(pinningContext ? 'drawings' : 'drawings');

  const handleInnerPinToDrawing = (rfiId: string, drawingId: string) => {
    setActiveSubView('drawings');
    if (onPinToDrawing) onPinToDrawing(rfiId, drawingId);
  };

  const subViews = [
    { id: 'drawings', label: 'DRAWINGS & PLANS', icon: DraftingCompass, description: 'Latest architectural & engineering drawings' },
    { id: 'rfis', label: 'RFIs (Request Info)', icon: MessageSquare, description: 'Spatial queries pinned to drawings' },
    { id: 'si', label: 'SITE INSTRUCTIONS', icon: ClipboardCheck, description: 'Formal instructions to contractor' },
    { id: 'specs', label: 'SPECIFICATIONS', icon: FileText, description: 'Project specifications & standards' },
    { id: 'agreements', label: 'STATUTORY APPROVALS', icon: ShieldCheck, description: 'Statutory approvals & client agreements' },
    { id: 'contracts', label: 'CONTRACT DOCUMENTS', icon: Gavel, description: 'Principal Contract & JBCC/GCC/NEC forms' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-80 space-y-2 shrink-0">
          <div className="p-6 bg-architect-coal text-white rounded-none border border-architect-coal mb-4">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-olive-primary animate-pulse rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Project Documentation</h3>
             </div>
             <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">Controlled document register for the project.</p>
          </div>

          <div className="bg-white border border-zinc-100 p-2 space-y-1">
            {subViews.map(view => (
              <button
                key={view.id}
                onClick={() => setActiveSubView(view.id as any)}
                className={`w-full group flex items-start gap-4 p-4 text-left transition-all ${
                  activeSubView === view.id 
                    ? 'bg-zinc-50 border border-zinc-100' 
                    : 'border border-transparent hover:bg-zinc-50/50'
                }`}
              >
                 <div className={`p-2 rounded-xl border transition-all ${
                   activeSubView === view.id 
                     ? 'bg-white border-zinc-100 text-olive-primary shadow-sm' 
                     : 'bg-zinc-50 border-zinc-100 text-zinc-300 group-hover:text-zinc-500'
                 }`}>
                   <view.icon className="w-5 h-5" strokeWidth={1} />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${activeSubView === view.id ? 'text-architect-coal' : 'text-zinc-400'}`}>
                      {view.label}
                    </p>
                    <p className="text-[8px] text-zinc-300 font-bold uppercase tracking-tighter mt-0.5 truncate group-hover:text-zinc-400">
                      {view.description}
                    </p>
                 </div>
                 <ChevronRight className={`w-3 h-3 self-center transition-all ${activeSubView === view.id ? 'text-olive-primary translate-x-0' : 'text-zinc-100 -translate-x-2'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
           <AnimatePresence mode="wait">
             <motion.div
               key={activeSubView}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.4 }}
               className="h-full"
             >
               {activeSubView === 'drawings' && (
                 <DocumentManager 
                    user={user} 
                    userData={userData} 
                    projectTarget={projectTarget} 
                    initialFileRef={initialFileRef}
                    pinningContext={pinningContext}
                    onPinComplete={onPinComplete}
                 />
               )}
               {activeSubView === 'rfis' && <RFIManager user={user} projectTarget={projectTarget} stakeholders={projectTarget.stakeholders || []} onPinToDrawing={handleInnerPinToDrawing} />}
               {activeSubView === 'si' && <SiteInstructionManager user={user} projectTarget={projectTarget} stakeholders={projectTarget.stakeholders || []} />}
               {activeSubView === 'specs' && <GenericDocumentManager projectId={projectTarget.id} category="Specification" user={user} />}
               {activeSubView === 'agreements' && <GenericDocumentManager projectId={projectTarget.id} category="Agreement" user={user} />}
               {activeSubView === 'contracts' && <GenericDocumentManager projectId={projectTarget.id} category="Contract" user={user} />}
             </motion.div>
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
