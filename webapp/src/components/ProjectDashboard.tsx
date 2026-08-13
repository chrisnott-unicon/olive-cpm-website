import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Users, 
  CloudRain,
  Sun,
  Cloudy,
  Snowflake,
  Wind,
  FileText,
  Building,
  Target,
  ExternalLink,
  FolderOpen,
  ClipboardList,
  Calculator,
  Camera,
  ShieldAlert,
  Box
} from 'lucide-react';
import ProjectDocuments from './ProjectDocuments';
import SiteDiary from './SiteDiary';
import ProjectRecords from './ProjectRecords';
import ProjectPlanningHub from './ProjectPlanningHub';
import Valuations from './Valuations';
import ProjectPhotos from './ProjectPhotos';
import TaskManager from './TaskManager';
import ProjectAdminHub from './ProjectAdminHub';
import ProjectResourceHub from './ProjectResourceHub';
import ProjectComplianceHub from './ProjectCompliance';
import RFIManager from './RFIManager';
import { MessageSquare } from 'lucide-react';
import ProjectActivityFeed from './ProjectActivityFeed';

interface ProjectDashboardProps {
  project: any;
  onBack: () => void;
  user?: any;
  userData?: any;
  activeTabProp?: string;
  onSetActiveTabProp?: (tab: any) => void;
}

export default function ProjectDashboard({ 
  project, 
  onBack, 
  user, 
  userData,
  activeTabProp,
  onSetActiveTabProp
}: ProjectDashboardProps) {
  const [weather, setWeather] = useState<any>(null);
  const [localActiveTab, setLocalActiveTab] = useState<'overview' | 'drawings' | 'records' | 'planning' | 'finance' | 'admin' | 'resources' | 'compliance'>('overview');
  const [pinningContext, setPinningContext] = useState<{ rfiId: string; drawingId: string } | null>(null);

  const handlePinToDrawing = (rfiId: string, drawingId: string) => {
    setPinningContext({ rfiId, drawingId });
    setActiveTab('drawings');
  };
  
  const activeTab = (activeTabProp as any) || localActiveTab;
  const setActiveTab = onSetActiveTabProp || (setLocalActiveTab as any);
  
  useEffect(() => {
    // Fetch historical/live weather
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
    if (code === 0) return <Sun className="w-8 h-8 text-yellow-500" />;
    if (code >= 1 && code <= 3) return <Cloudy className="w-8 h-8 text-gray-400" />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (code >= 71 && code <= 86) return <Snowflake className="w-8 h-8 text-teal-300" />;
    return <Wind className="w-8 h-8 text-zinc-400" />;
  };

  const toolDescriptions: Record<string, { title: string; desc: string; tip: string }> = {
    overview: { title: 'Contract Overview', desc: 'A broad view of your project details, location, and professional team.', tip: 'Use this space to check your Start Date, Planned Duration, and the Professional Team all in one place.' },
    drawings: { title: 'Project Documents', desc: 'Your central place for all project plans, revisions, and site instructions.', tip: 'Ensure all drawings are the latest revision. You can link technical queries (RFIs) to specific areas on plans.' },
    records: { title: 'Statutory Site Records', desc: 'Daily Site Record (Cl. 4.2), weather, plant, and labour updates.', tip: 'Keeping accurate Daily Site Records protects against contractual claims. Log delays and labour daily.' },
    planning: { title: 'Programme Planning', desc: 'Track your master schedule, timeline, and task matrix.', tip: 'Keep the Baseline Programme updated to avoid penalties. Accurate planning helps contractors finish on time.' },
    finance: { title: 'Professional Payment Certification', desc: 'Manage interim valuations, payment certificates, and budgets.', tip: 'Certify payments accurately and on time according to JBCC/GCC/NEC timeframes to keep cash flow healthy.' },
    admin: { title: 'Project Admin', desc: 'Access settings and platform permissions.', tip: 'Only give access to required team members. Archive the file when the defects liability period has ended.' },
    resources: { title: 'Resource Hub', desc: 'Log materials, equipment, and supply chain tracking.', tip: 'Track when critical materials arrive to ensure they align with your Baseline Programme.' },
    compliance: { title: 'Compliance & Certification', desc: 'Health & Safety, environmental audits, and quality standards.', tip: 'Record statutory safety audits here to ensure the Principal Contractor follows local site rules.' },
  };

  const activeToolInfo = toolDescriptions[activeTab] || toolDescriptions.overview;

  const renderContent = () => {
    switch (activeTab) {
      case 'drawings':
        return (
          <ProjectDocuments 
            user={user} 
            userData={userData} 
            projectTarget={project} 
            initialFileRef={pinningContext?.drawingId}
            pinningContext={pinningContext}
            onPinComplete={() => setPinningContext(null)}
            onPinToDrawing={handlePinToDrawing}
          />
        );
      case 'records':
        return <ProjectRecords user={user} userData={userData} projectTarget={project} />;
      case 'planning':
        return <ProjectPlanningHub user={user} userData={userData} projectTarget={project} />;
      case 'finance':
        return <Valuations user={user} userData={userData} projectTarget={project} />;
      case 'admin':
        return <ProjectAdminHub user={user} userData={userData} projectTarget={project} />;
      case 'resources':
        return <ProjectResourceHub user={user} userData={userData} projectTarget={project} />;
      case 'compliance':
        return <ProjectComplianceHub user={user} userData={userData} projectTarget={project} />;
      case 'overview':
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Core Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-zinc-100 flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-zinc-100 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6 text-architect-coal" />
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest">Start Date</p>
                    <p className="text-xs md:text-sm font-bold text-zinc-900">{project.plannedStartDate || 'Not set'}</p>
                  </div>
                </div>
                
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-zinc-100 flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-olive-primary/10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 md:w-6 md:h-6 text-olive-primary" />
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest">Duration</p>
                    <p className="text-xs md:text-sm font-bold text-zinc-900">{project.plannedDuration ? `${project.plannedDuration} Weeks` : 'Not set'}</p>
                  </div>
                </div>
                
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-zinc-100 flex items-center gap-4 shadow-sm sm:col-span-2 md:col-span-1">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest">Contract</p>
                    <p className="text-xs md:text-sm font-bold text-zinc-900">{project.contractType}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-zinc-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-architect-coal/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                <h2 className="text-lg md:text-xl font-black text-architect-coal mb-4 md:mb-6 flex items-center gap-2">
                  <Building className="w-4 h-4 md:w-5 md:h-5 text-olive-primary" /> 
                  Client & Site Info
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Location</p>
                    <p className="text-sm font-bold text-zinc-900 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                      {project.location || 'Location not specified.'}
                    </p>
                    {project.coordinates?.lat && project.coordinates?.lng && (
                      <p className="text-xs text-zinc-400 mt-2 font-mono bg-zinc-50 py-1 px-2 rounded inline-block">
                        {project.coordinates.lat}, {project.coordinates.lng}
                      </p>
                    )}
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Client Details</p>
                     <p className="text-sm font-bold text-zinc-900">{project.clientDetails?.name || 'Not provided'}</p>
                     <p className="text-xs text-zinc-500 mt-1">{project.clientDetails?.address}</p>
                     <div className="mt-3 space-y-1">
                        {project.clientDetails?.email && <p className="text-xs text-zinc-500 flex items-center gap-2 font-medium tracking-tight">Email: {project.clientDetails.email}</p>}
                        {project.clientDetails?.phone && <p className="text-xs text-zinc-500 flex items-center gap-2 font-medium tracking-tight">Phone: {project.clientDetails.phone}</p>}
                        {project.clientDetails?.digitalAgreement && (
                          <div className="mt-2 text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block uppercase tracking-wider">
                            Electronic Communication Agreement Active
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              </div>

              {/* Professionals List */}
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-olive-primary" />
                  <h2 className="text-xl font-black text-architect-coal">Professional Team</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                   {/* Principal Agent Specialist Card */}
                  {project.professionals?.projectManager && (
                    <div className="p-4 bg-olive-light/10 rounded-2xl border border-olive-primary/10">
                      <p className="text-[10px] font-black text-olive-primary uppercase tracking-widest mb-1">Principal Agent / PM</p>
                      <p className="text-sm font-bold text-zinc-900">{project.professionals.projectManager}</p>
                      <div className="mt-2 space-y-1">
                         {project.professionals.paEmail && <p className="text-[10px] text-zinc-500 font-medium">E: {project.professionals.paEmail}</p>}
                         {project.professionals.paPhone && <p className="text-[10px] text-zinc-500 font-medium">T: {project.professionals.paPhone}</p>}
                         {project.professionals.paDigitalAgreement && (
                           <div className="mt-2 text-[7px] font-black text-emerald-600 uppercase tracking-widest">Electronic Agreement Active</div>
                         )}
                      </div>
                    </div>
                  )}

                  {[
                    { label: 'Architect', value: project.professionals?.architect },
                    { label: 'Quantity Surveyor', value: project.professionals?.quantitySurveyor },
                    { label: 'Structural Eng.', value: project.professionals?.structuralEngineer },
                    { label: 'Civil Eng.', value: project.professionals?.civilEngineer },
                    { label: 'Mechanical Eng.', value: project.professionals?.mechanicalEngineer },
                    { label: 'Electrical Eng.', value: project.professionals?.electricalEngineer },
                    { label: 'Fire Eng.', value: project.professionals?.fireEngineer },
                    { label: 'Health & Safety', value: project.professionals?.healthSafety }
                  ].filter(p => !!p.value).map((prof, idx) => (
                    <div key={idx} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{prof.label}</p>
                      <p className="text-sm font-bold text-zinc-900">{prof.value}</p>
                    </div>
                  ))}
                  {(!project.professionals || Object.values(project.professionals).every(v => !v)) && (
                    <p className="col-span-full text-zinc-400 text-sm italic">No professionals listed.</p>
                  )}
                </div>
              </div>

              {/* Agiligic Task Matrix */}
              <div className="lg:col-span-3">
                 <TaskManager projectId={project.id} user={user} />
              </div>

              {/* Project Activity Feed */}
              <div className="lg:col-span-3">
                 <ProjectActivityFeed projectId={project.id} user={userData} />
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              {weather && (
                <div className="bg-architect-coal shadow-2xl p-8 rounded-none border border-architect-coal text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
                   <h3 className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4">SITE WEATHER LOG</h3>
                   <div className="flex items-end gap-6">
                     {getWeatherIcon(weather.weathercode)}
                     <div>
                       <div className="text-4xl font-light tracking-tighter">{weather.temperature}°C</div>
                       <div className="text-[8px] font-black text-olive-primary mt-2 uppercase tracking-[0.2em]">Wind Velocity {weather.windspeed} km/h</div>
                     </div>
                   </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                 <h3 className="text-sm font-black text-architect-coal uppercase tracking-widest mb-4">Contractors</h3>
                 <div className="space-y-4">
                   <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Principal</p>
                      <p className="text-sm font-bold text-zinc-900">{project.principalContractor || 'Not assigned'}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">N/S Contractors</p>
                      <p className="text-sm text-zinc-600 whitespace-pre-wrap">{project.nsContractors || 'None listed'}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Trade Contractors</p>
                      <p className="text-sm text-zinc-600 whitespace-pre-wrap">{project.tradeContractors || 'None listed'}</p>
                   </div>
                 </div>
              </div>

              {project.driveLink && (
                 <a href={project.driveLink} target="_blank" rel="noreferrer" className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center justify-between group hover:border-architect-coal transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-50 text-architect-coal flex items-center justify-center">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900">Project Drive</p>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Access Files</p>
                      </div>
                    </div>
                 </a>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-white/80 backdrop-blur-md p-3 md:p-4 border-b border-zinc-100 flex items-center justify-between gap-4 md:gap-6 -mt-4 md:-mt-10 lg:-mt-16 -mx-4 md:-mx-10 lg:-mx-16 px-4 md:px-10 lg:px-16 mb-4 md:mb-6 sticky top-0 z-10 transition-all">
        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={onBack}
            className="w-8 md:w-10 h-8 md:h-10 bg-zinc-50 flex items-center justify-center text-zinc-500 hover:text-olive-primary transition-all rounded-full hover:bg-zinc-100 shrink-0"
          >
            <ArrowLeft className="w-3 md:w-4 h-3 md:h-4" strokeWidth={2} />
          </button>
          <div>
            <div className="flex items-center gap-2 md:gap-3 mb-1">
              <span className={`px-2 py-0.5 text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] rounded-sm ${
                ['Construction', 'Active'].includes(project.status) ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
              }`}>
                {project.status}
              </span>
              <span className="text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{activeTab}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-light text-zinc-900 tracking-tight uppercase leading-none truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-full">{project.name}</h1>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
        >
          <div className="bg-olive-light/10 border border-olive-primary/20 rounded-2xl p-4 mb-6 md:p-6 md:mb-8 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-architect-coal uppercase tracking-widest">{activeToolInfo.title}</h2>
              <p className="text-xs text-zinc-600 mt-1">{activeToolInfo.desc}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-zinc-100 flex-1 md:max-w-md shadow-sm">
              <p className="text-[10px] font-black text-olive-primary uppercase tracking-widest mb-1">💡 Quick Tip</p>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">{activeToolInfo.tip}</p>
            </div>
          </div>
          
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
