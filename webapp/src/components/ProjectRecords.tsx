import React, { useState } from 'react';
import { 
  ClipboardList, 
  CloudSun, 
  FileCheck, 
  LayoutGrid, 
  List,
  ChevronRight,
  Camera,
  Users,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SiteDiary from './SiteDiary';
import WeatherLogger from './WeatherLogger';

import ProjectPhotos from './ProjectPhotos';
import LaborPlantLog from './LaborPlantLog';
import DeliveryLog from './DeliveryLog';

interface ProjectRecordsProps {
  user: any;
  userData?: any;
  projectTarget: any;
}

export default function ProjectRecords({ user, userData, projectTarget }: ProjectRecordsProps) {
  const [activeSubView, setActiveSubView] = useState<'diary' | 'weather' | 'photos' | 'resources' | 'supply'>('diary');

  const subViews = [
    { id: 'diary', label: 'SITE DIARY', icon: ClipboardList, description: 'Daily site progress and event records' },
    { id: 'weather', label: 'WEATHER LOG', icon: CloudSun, description: 'Daily atmospheric records for claim support' },
    { id: 'resources', label: 'LABOUR & PLANT', icon: Users, description: 'Site resources and equipment tracking' },
    { id: 'supply', label: 'MATERIAL DELIVERIES', icon: Truck, description: 'Material delivery verification and records' },
    { id: 'photos', label: 'PROGRESS PHOTOS', icon: Camera, description: 'Visual evidence and progress archive' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-80 space-y-2 shrink-0">
          <div className="p-6 bg-architect-coal text-white rounded-none border border-architect-coal mb-4">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-olive-primary animate-pulse rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Site Records</h3>
             </div>
             <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">Statutory site records and daily progress tracking.</p>
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
               {activeSubView === 'diary' && <SiteDiary user={user} userData={userData} projectTarget={projectTarget} />}
               {activeSubView === 'weather' && <WeatherLogger projectId={projectTarget.id} projectCoordinates={projectTarget.coordinates} />}
               {activeSubView === 'resources' && <LaborPlantLog projectId={projectTarget.id} user={user} />}
               {activeSubView === 'supply' && <DeliveryLog projectId={projectTarget.id} />}
               {activeSubView === 'photos' && <ProjectPhotos user={user} userData={userData} projectTarget={projectTarget} />}
             </motion.div>
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
