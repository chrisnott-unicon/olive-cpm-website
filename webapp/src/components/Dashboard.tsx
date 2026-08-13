import { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  AlertCircle,
  Clock,
  ArrowUpRight,
  Building2,
  Calculator,
  Sun, Cloudy, CloudRain, Snowflake, Wind, CheckCircle2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import CreateProjectModal from './CreateProjectModal';
import ProjectDashboard from './ProjectDashboard';
import { ConstructionGrid, SkeletalFrame } from './ArchitecturalDoodles';
import TutorialOverlay from './TutorialOverlay';

const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
  { name: 'May', value: 700 },
];

const WeatherWidget = ({ project }: { project: any }) => {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (project.coordinates?.lat && project.coordinates?.lng) {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${project.coordinates.lat}&longitude=${project.coordinates.lng}&current_weather=true`);
          if (res.ok) {
            const data = await res.json();
            setWeather(data.current_weather);
          }
        } catch (e) {
          console.error("Failed to fetch weather", e);
        }
      }
    };
    fetchWeather();
  }, [project.coordinates]);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-6 h-6 text-yellow-500" />;
    if (code >= 1 && code <= 3) return <Cloudy className="w-6 h-6 text-gray-400" />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className="w-6 h-6 text-blue-400" />;
    if (code >= 71 && code <= 86) return <Snowflake className="w-6 h-6 text-teal-300" />;
    return <Wind className="w-6 h-6 text-zinc-400" />;
  };

  if (!weather) return <div className="text-xs text-zinc-400">Loading...</div>;

  return (
    <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-2 border border-zinc-100 italic">
      {getWeatherIcon(weather.weathercode)}
      <div>
        <div className="text-lg font-black text-architect-coal leading-none mb-1">{weather.temperature}°C</div>
        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{weather.windspeed} km/h</div>
      </div>
    </div>
  );
};

const FieldOpsSummaryWidget = ({ projectId }: { projectId: string }) => {
  const [summary, setSummary] = useState<string>("No recent field operations.");

  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, `projects/${projectId}/site_diaries`), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const entry = snap.docs[0].data();
        let dateStr = entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString() : 'Recent';
        let text = `${dateStr} - ${entry.userName || 'User'}: ${entry.note?.substring(0, 80) || ''}...`;
        setSummary(text);
      } else {
        setSummary("No recent field operations recorded.");
      }
    });
    return unsub;
  }, [projectId]);

  return (
    <div className="mt-4 p-5 bg-zinc-50/50 border border-zinc-100 rounded-none text-xs text-zinc-500">
      <div className="font-black text-olive-primary uppercase tracking-[0.2em] text-[9px] mb-2">Daily Site Record (Cl. 4.2)</div>
      <p className="font-medium leading-relaxed italic">{summary}</p>
    </div>
  );
};

export default function Dashboard({ user, userData, selectedProjectId, onSelectProject, activeSubTab, onSetActiveSubTab }: { 
  user: any, 
  userData?: any, 
  selectedProjectId: string | null,
  onSelectProject: (id: string | null) => void,
  activeSubTab: string,
  onSetActiveSubTab: (tab: any) => void
}) {
  const [projects, setProjects] = useState<any[]>([]);
  const isInternal = userData?.role === 'Super_Admin' || userData?.role === 'Org_Admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Find project object from id
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const [stats, setStats] = useState({
    activeProjects: 0,
    totalValuation: "R 0",
    activeStaff: 0,
    incidents: 0,
    overallProgress: 68,
    pendingVariations: 0
  });

  useEffect(() => {
    let constraints: any[] = [orderBy('createdAt', 'desc')];
    if (userData?.role !== 'Super_Admin' && userData?.orgId) {
       constraints.push(where('orgId', '==', userData.orgId));
    }
    const q = query(collection(db, 'projects'), ...(constraints as any));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(data);
      
      let mockStaff = data.reduce((acc, p: any) => {
        if (p.initialActiveStaff !== undefined && p.initialActiveStaff !== "") return acc + Number(p.initialActiveStaff);
        let staff = p.plannedDuration ? p.plannedDuration * 0.8 : 12;
        if (p.tradeContractors) staff += p.tradeContractors.split(/,|\n/).length * 5;
        if (p.nsContractors) staff += p.nsContractors.split(/,|\n/).length * 8;
        return acc + Math.round(staff);
      }, 0);
      
      let valNum = data.reduce((acc, p: any) => {
        if (p.initialContractValue !== undefined && p.initialContractValue !== "") return acc + Number(p.initialContractValue) / 1000000;
        let val = p.plannedDuration ? p.plannedDuration * 0.25 : 5.2; 
        if (p.contractType === 'FIDIC') val *= 1.5;
        if (p.contractType === 'NEC') val *= 1.2;
        return acc + val;
      }, 0);
      
      const currencyMap: any = {
        'ZAR': 'R ',
        'USD': '$',
        'GBP': '£',
        'EUR': '€',
        'BWP': 'P ',
        'NAD': 'N$ '
      };
      
      const dominantCurrencyCode = data[0]?.currency || 'ZAR';
      const dominantSymbol = currencyMap[dominantCurrencyCode] || 'R ';
      
      let incidentsNum = data.reduce((acc, p: any) => {
        return acc + (p.recordedIncidents ? Number(p.recordedIncidents) : 0);
      }, 0);
      
      let activeProjProgress = data.filter((p: any) => !p.isArchived && ['Construction', 'Active', 'Post-construction'].includes(p.status));
      let progress = activeProjProgress.length > 0 
        ? Math.round(activeProjProgress.reduce((acc, p: any) => acc + (p.initialProgress !== undefined && p.initialProgress !== "" ? Number(p.initialProgress) : (p.plannedDuration ? (p.plannedDuration % 60) + 20 : 68)), 0) / activeProjProgress.length)
        : (data.length > 0 ? 15 : 0);
        
      let pendingVars = data.reduce((acc, p: any) => acc + (p.pendingVariations !== undefined && p.pendingVariations !== "" ? Number(p.pendingVariations) : (['JBCC', 'FIDIC'].includes(p.contractType) ? 2 : 1)), 0);

      setStats({ 
        activeProjects: data.filter((p: any) => !p.isArchived).length,
        totalValuation: `${dominantSymbol}${valNum.toFixed(1)}M`,
        activeStaff: mockStaff,
        incidents: incidentsNum,
        overallProgress: progress,
        pendingVariations: pendingVars
      });
    });
    return unsubscribe;
  }, [userData]);

  const [portfolioTab, setPortfolioTab] = useState<'active' | 'archived'>('active');
  const activeProjectsList = projects.filter(p => !p.isArchived);
  const archivedProjectsList = projects.filter(p => p.isArchived);
  const currentProjectsDisplay = portfolioTab === 'active' ? activeProjectsList : archivedProjectsList;

  if (selectedProject) {
    return (
      <ProjectDashboard 
        project={selectedProject} 
        user={user} 
        userData={userData} 
        onBack={() => onSelectProject(null)} 
        activeTabProp={activeSubTab}
        onSetActiveTabProp={onSetActiveSubTab}
      />
    );
  }
  return (
    <div className="space-y-12 pb-24 relative overflow-hidden min-h-screen bg-white text-architect-coal selection:bg-olive-primary/20 selection:text-black">
      <ConstructionGrid className="opacity-[0.03]" />
      <SkeletalFrame className="absolute -top-12 -left-12 w-96 h-96 opacity-[0.03] rotate-12" />
      
      <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-12 pt-12 space-y-12">
        {userData?.role !== 'User' && (
          <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userData={userData} />
        )}
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-zinc-100 pb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-[2px] bg-olive-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-300">Portfolio Summary</span>
            </div>
            <h1 className="text-5xl font-light tracking-tighter uppercase italic leading-none">
              <span className="text-olive-primary font-black not-italic">{userData?.fullName?.split(' ')[0] || 'Executive'}'s</span> Portfolio
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden lg:flex items-center gap-6 px-6 py-4 bg-zinc-50 border border-zinc-100">
               <div className="flex flex-col">
                 <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Site Manpower</span>
                 <span className="text-xl font-light text-olive-primary">{stats.activeStaff} ACTIVE</span>
               </div>
               <div className="w-px h-8 bg-zinc-100" />
               <div className="flex flex-col">
                 <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Project Status</span>
                 <span className="text-xl font-light text-emerald-600 uppercase">In Order</span>
               </div>
            </div>
            {isInternal && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-10 py-5 bg-olive-primary text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 hover:bg-architect-coal active:scale-95 shadow-lg shadow-olive-primary/20"
              >
                <Plus className="w-4 h-4" /> Create New Project
              </button>
            )}
          </div>
        </div>

        {/* Portfolio Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-100 border border-zinc-100 shadow-sm">
          {[
            { label: 'Active Projects', value: stats.activeProjects, icon: Building2, trend: '+2 this month', color: 'text-olive-primary' },
            { label: 'Contract Sum Total', value: stats.totalValuation, icon: Calculator, trend: 'Net Value', color: 'text-architect-coal' },
            { label: 'Works Completion', value: `${stats.overallProgress}%`, icon: TrendingUp, trend: 'Weighted', color: 'text-emerald-600' },
            { label: 'Pending Instructions', value: stats.pendingVariations, icon: AlertCircle, trend: 'Action Required', color: 'text-olive-primary' },
          ].map((stat, i) => (
            <div key={stat.label} className="bg-white p-10 group hover:bg-zinc-50/50 transition-colors">
              <div className="p-3 w-fit bg-zinc-50 border border-zinc-100 text-zinc-400 group-hover:text-olive-primary mb-8 group-hover:scale-110 transition-transform">
                <stat.icon size={20} strokeWidth={1} />
              </div>
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{stat.label}</p>
              <h3 className={`text-4xl font-light tracking-tighter ${stat.color}`}>{stat.value}</h3>
              <div className="mt-4 text-[9px] font-bold text-zinc-300 uppercase tracking-widest">{stat.trend}</div>
            </div>
          ))}
        </div>

        {/* Project Portfolio Board */}
        <section className="space-y-8 pt-12">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-architect-coal uppercase tracking-[0.5em] flex items-center gap-4">
              <span className="w-2 h-2 bg-olive-primary" />
              Contract Portfolio
            </h3>
            <div className="flex items-center gap-2 bg-zinc-100 p-1">
              <button 
                onClick={() => setPortfolioTab('active')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${portfolioTab === 'active' ? 'bg-white text-architect-coal' : 'text-zinc-400 hover:text-architect-coal'}`}
              >
                Active ({activeProjectsList.length})
              </button>
              <button 
                onClick={() => setPortfolioTab('archived')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${portfolioTab === 'archived' ? 'bg-white text-architect-coal' : 'text-zinc-400 hover:text-architect-coal'}`}
              >
                Archived ({archivedProjectsList.length})
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-100 border border-zinc-100">
            {currentProjectsDisplay.map((project: any, i) => (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectProject(project.id)}
                className="group relative cursor-pointer bg-white p-8 space-y-6 hover:border-olive-primary hover:bg-zinc-50/30 transition-all border border-transparent"
              >
                {project.isArchived && (
                  <div className="absolute top-0 right-0 bg-red-50 text-red-600 px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                    Archived
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">ID-{(project.id || '').substring(0, 4)}</span>
                  <div className={`w-2 h-2 rounded-full ${['Construction', 'Active'].includes(project.status) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-zinc-200'}`} />
                </div>
                
                <div>
                  <h4 className="text-3xl font-light text-architect-coal group-hover:text-olive-primary transition-colors leading-tight uppercase mb-2">{project.name}</h4>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <MapPin size={10} className="text-olive-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{project.location || 'Site Location TBD'}</span>
                  </div>
                </div>
                
                <FieldOpsSummaryWidget projectId={project.id} />
                
                <div className="flex items-center justify-between pt-6 border-t border-zinc-50 group-hover:border-olive-primary/20">
                  {project.coordinates?.lat ? <WeatherWidget project={project} /> : <div />}
                  <ArrowUpRight size={24} strokeWidth={1} className="text-zinc-300 group-hover:text-olive-primary transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </motion.div>
            ))}
            {currentProjectsDisplay.length === 0 && (
              <div className="col-span-full py-24 text-center bg-zinc-50">
                 <Building2 className="w-12 h-12 text-zinc-100 mx-auto mb-6" />
                 <p className="text-xs font-black text-zinc-300 uppercase tracking-[0.3em]">{portfolioTab === 'active' ? 'No Active Contracts Detected' : 'No Archived Contracts Available'}</p>
              </div>
            )}
          </div>
        </section>

        {/* Global Action Board - Full Width Below Projects */}
        <section className="space-y-8 pt-12 border-t border-zinc-100">
           <div className="flex items-center justify-between">
             <h3 className="text-sm font-black text-architect-coal uppercase tracking-[0.5em] flex items-center gap-4">
               <CheckCircle2 size={16} className="text-olive-primary" />
               Compliance & Certification
             </h3>
             <div className="flex items-center gap-4 text-[10px] font-black text-red-500 uppercase tracking-widest border border-red-100 px-4 py-2 bg-red-50">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {Math.max(1, activeProjectsList.length)} Critical Requirements
             </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-100 border border-zinc-100 shadow-xl shadow-zinc-200/50">
             {activeProjectsList.slice(0, 3).map((project, i) => {
               const actions = [
                 { title: `Approve Payment Cert #0${i + 1}`, urgency: 'CRITICAL', due: 'By 17:00 Today', icon: Calculator },
                 { title: 'Safety Audit Response', urgency: 'HIGH', due: 'Tomorrow', icon: Clock },
                 { title: 'Variation Order Review', urgency: 'MEDIUM', due: 'In 3 Days', icon: AlertCircle }
               ];
               const action = actions[i % actions.length];
               return (
                <div key={i} className="bg-white p-10 hover:bg-olive-light/5 transition-colors cursor-pointer group flex flex-col justify-between h-48 border border-transparent hover:border-olive-primary/10">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-zinc-50 text-zinc-400 group-hover:bg-olive-primary group-hover:text-white transition-colors">
                      <action.icon size={18} strokeWidth={1} />
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 ${action.urgency === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-zinc-50 text-zinc-400'}`}>
                      {action.urgency}
                    </span>
                  </div>
                  <div>
                    <h5 className="text-xl font-light text-architect-coal mb-1 group-hover:text-olive-primary italic">{action.title}</h5>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{project.name || project.location || 'Unknown Site'} • {action.due}</p>
                  </div>
                </div>
               );
             })}
             {activeProjectsList.length === 0 && [
               { title: 'Approve Payment Cert #08', site: 'Sample Site A', urgency: 'CRITICAL', due: 'By 17:00 Today', icon: Calculator },
               { title: 'Safety Audit Response', site: 'Sample Site B', urgency: 'HIGH', due: 'Tomorrow', icon: Clock },
               { title: 'Variation Order Review', site: 'Sample Site C', urgency: 'MEDIUM', due: 'In 3 Days', icon: AlertCircle }
             ].map((action, i) => (
                <div key={i} className="bg-white p-10 hover:bg-olive-light/5 transition-colors cursor-pointer group flex flex-col justify-between h-48 border border-transparent hover:border-olive-primary/10">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-zinc-50 text-zinc-400 group-hover:bg-olive-primary group-hover:text-white transition-colors">
                      <action.icon size={18} strokeWidth={1} />
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 ${action.urgency === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-zinc-50 text-zinc-400'}`}>
                      {action.urgency}
                    </span>
                  </div>
                  <div>
                    <h5 className="text-xl font-light text-architect-coal mb-1 group-hover:text-olive-primary italic">{action.title}</h5>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{action.site} • {action.due}</p>
                  </div>
                </div>
             ))}
           </div>
        </section>

        {/* Portfolio Timeline - Bottom - KEEP DARK */}
        <section className="space-y-8 pt-12 border-t border-zinc-100 -mx-6 lg:-mx-12 px-6 lg:px-12 bg-zinc-950">
          <div className="flex items-center gap-6">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.5em] whitespace-nowrap">Recent Site Updates</h3>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
          
          <div className="max-w-5xl space-y-3 pb-24">
            {activeProjectsList.slice(0, 3).map((project, i) => {
              const updates = [
                'Initial site establishment completed',
                'Material deliveries arrived and checked',
                'Site inspection booked for next week'
              ];
              const times = ['2h ago', '4h ago', '5h ago'];
              return (
              <div key={i} className="flex gap-10 items-center py-5 px-8 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all group">
                <span className="text-[10px] font-mono text-zinc-600 w-20 uppercase">{times[i % times.length]}</span>
                <div className="flex-1 flex items-center justify-between">
                   <div>
                     <p className="text-[10px] font-black text-olive-primary uppercase tracking-widest mb-1">{project.name || project.location || 'Unknown Site'}</p>
                     <p className="text-sm font-light text-zinc-400 group-hover:text-white transition-colors">{updates[i % updates.length]}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] text-zinc-700 font-bold italic">User: {project.professionals?.projectManager || 'System'}</p>
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end mt-1">
                        <ArrowUpRight size={14} className="text-olive-primary" />
                     </div>
                   </div>
                </div>
              </div>
            )})}
            {activeProjectsList.length === 0 && [
              { site: 'Pretoria Hospital', update: 'Concrete pour finished for Slab B', user: 'Johannes K.', time: '2h ago' },
              { site: 'Sandton Office Park', update: 'Steel reinforcement inspection passed', user: 'Maria S.', time: '4h ago' },
              { site: 'Cape Town Villas', update: 'Delay due to high wind speeds', user: 'Pieter V.', time: '5h ago' },
            ].map((event, i) => (
              <div key={i} className="flex gap-10 items-center py-5 px-8 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all group">
                <span className="text-[10px] font-mono text-zinc-600 w-20 uppercase">{event.time}</span>
                <div className="flex-1 flex items-center justify-between">
                   <div>
                     <p className="text-[10px] font-black text-olive-primary uppercase tracking-widest mb-1">{event.site}</p>
                     <p className="text-sm font-light text-zinc-400 group-hover:text-white transition-colors">{event.update}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] text-zinc-700 font-bold italic">User: {event.user}</p>
                     <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end mt-1">
                        <ArrowUpRight size={14} className="text-olive-primary" />
                     </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <TutorialOverlay user={user} />
    </div>
  );
}
