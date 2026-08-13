import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckSquare, 
  Activity, 
  BarChart3,
  ChevronRight,
  GanttChartSquare,
  AlertOctagon,
  FileSearch,
  Clock,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TaskManager from './TaskManager';
import BaselineSummary from './BaselineSummary';
import GanttChart from './GanttChart';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface ProjectTask {
  id: string;
  title: string;
  startDate?: string;
  dueDate?: string;
  isMilestone: boolean;
  status: string;
  dependencyIds?: string[];
}

interface ProjectPlanningHubProps {
  user: any;
  userData?: any;
  projectTarget: any;
}

export default function ProjectPlanningHub({ user, userData, projectTarget }: ProjectPlanningHubProps) {
  const [activeSubView, setActiveSubView] = useState<'schedule' | 'tasks' | 'risks' | 'baseline'>('schedule');
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    const q = query(collection(db, `projects/${projectTarget.id}/tasks`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectTask)));
      setLoadingTasks(false);
    });
    return unsubscribe;
  }, [projectTarget.id]);

  const subViews = [
    { id: 'schedule', label: 'MASTER SCHEDULE', icon: GanttChartSquare, description: 'Visual timeline & milestone roadmap' },
    { id: 'tasks', label: 'TASK & MILESTONES', icon: CheckSquare, description: 'Granular activity tracking & status' },
    { id: 'baseline', label: 'BASELINE INTEGRITY', icon: FileSearch, description: 'PDF Programme analysis & slippage prediction' },
    { id: 'risks', label: 'CRITICAL PATH RISKS', icon: AlertOctagon, description: 'AI-powered delay & bottleneck forecasting' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-80 space-y-2 shrink-0">
          <div className="p-6 bg-architect-coal text-white rounded-none border border-architect-coal mb-4">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-olive-primary animate-pulse rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Planning Command</h3>
             </div>
             <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">Strategic Scheduling & Programme Integrity Unit.</p>
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
               {activeSubView === 'schedule' && (
                 loadingTasks ? (
                   <div className="p-12 text-center">
                     <Loader2 className="w-8 h-8 text-zinc-200 animate-spin mx-auto" />
                   </div>
                 ) : tasks.length === 0 ? (
                   <div className="bg-white border border-zinc-100 p-12 text-center">
                      <Clock className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                      <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Visual Timeline Coming Soon</h4>
                      <p className="text-[9px] text-zinc-400 mt-2">Integrating with Baseline extraction for dynamic roadmap rendering.</p>
                   </div>
                 ) : (
                   <GanttChart tasks={tasks} />
                 )
               )}
               {activeSubView === 'tasks' && <TaskManager user={user} projectId={projectTarget.id} />}
               {activeSubView === 'baseline' && <BaselineSummary projectId={projectTarget.id} user={user} />}
               {activeSubView === 'risks' && (
                  <div className="bg-architect-coal text-white p-12 text-center aspect-video flex flex-col items-center justify-center">
                    <AlertOctagon className="w-12 h-12 text-olive-primary animate-pulse mb-6" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">AI Risk Engine Active</h4>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-[0.1em] mt-4 max-w-xs">Monitoring baseline vs. captured site records for automatic bottleneck detection and critical path alerts.</p>
                 </div>
               )}
             </motion.div>
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

