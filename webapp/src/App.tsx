import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  LogOut,
  Menu,
  X,
  GanttChartSquare,
  ChevronDown,
  ChevronUp,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';
import { CraneMotif } from './components/ArchitecturalDoodles';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Login from './components/Login';
import InvitationPortal from './components/InvitationPortal';
import NotificationCenter from './components/NotificationCenter';
import AgentDataGatheringFAB from './components/AgentDataGatheringFAB';

type Tab = 'dashboard' | 'settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // Invitation tracking
  const [invitationData, setInvitationData] = useState<{ inviteId: string; projectId: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('inviteId');
    const projectId = params.get('projectId');
    
    if (inviteId && projectId) {
      setInvitationData({ inviteId, projectId });
    }

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        let currentUserData: any = null;
        if (userDoc.exists()) {
          currentUserData = userDoc.data();
          if ((authUser.email === 'chris.nott@uniconsa.co.za' || authUser.email === 'chris.nott@unicons.co.za') && currentUserData.role !== 'Super_Admin') {
            currentUserData.role = 'Super_Admin';
            await setDoc(doc(db, 'users', authUser.uid), { role: 'Super_Admin' }, { merge: true });
          }
          setUserData(currentUserData);
        } else {
          currentUserData = {
            email: authUser.email,
            fullName: authUser.displayName,
            role: (authUser.email === 'chris.nott@uniconsa.co.za' || authUser.email === 'chris.nott@unicons.co.za') ? 'Super_Admin' : 'User',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', authUser.uid), currentUserData);
          setUserData(currentUserData);
        }

        // Fetch Projects for sidebar
        let constraints: any[] = [orderBy('createdAt', 'desc')];
        if (currentUserData.role !== 'Super_Admin' && currentUserData.orgId) {
           constraints.push(where('orgId', '==', currentUserData.orgId));
        }
        const q = query(collection(db, 'projects'), ...constraints);
        
        onSnapshot(q, (snapshot) => {
          let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProjects(data);
        });

      } else {
        setUser(null);
        setUserData(null);
        setProjects([]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = () => auth.signOut();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-architect-paper">
        <div className="relative">
          <GanttChartSquare className="w-12 h-12 text-olive-primary animate-pulse" strokeWidth={1} />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 overflow-hidden w-24 h-[1px] bg-zinc-100">
            <motion.div 
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-1/2 h-full bg-olive-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!user && !invitationData) {
    return <Login />;
  }

  const handleInviteDone = () => {
    setInvitationData(null);
    window.history.replaceState({}, document.title, "/");
  };

  if (invitationData) {
    return <InvitationPortal inviteId={invitationData.inviteId} projectId={invitationData.projectId} onDone={handleInviteDone} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'PROJECT DASHBOARD', icon: LayoutDashboard },
    { id: 'settings', label: 'GENERAL SETTINGS', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-architect-paper overflow-hidden font-sans text-architect-coal">
      <Toaster position="top-right" expand={true} />
      
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="fixed h-full bg-white border-r border-zinc-100 flex flex-col z-50 overflow-hidden shadow-2xl shrink-0"
          >
            <div className="absolute bottom-0 left-0 w-full h-80 pointer-events-none opacity-40">
               <CraneMotif />
            </div>
            
            <div className="p-8 md:p-10 border-b border-zinc-50 border-dashed relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <GanttChartSquare className="w-8 h-8 md:w-10 md:h-10 text-olive-primary" strokeWidth={1} />
                  <div className="flex flex-col">
                    <span className="text-olive-primary font-light text-base md:text-lg tracking-[0.1em] leading-tight">OLIVE</span>
                    <span className="text-[7px] md:text-[8px] font-black tracking-[0.2em] text-zinc-400">BY UNICON SOUTH AFRICA</span>
                  </div>
                </div>
                {/* Mobile Close Button */}
                <button 
                  onClick={() => setIsSidebarOpen(false)} 
                  className="md:hidden p-2 -mr-2 text-zinc-400 hover:text-architect-coal transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={1} />
                </button>
              </div>
            </div>
            
            <nav className="flex-1 p-6 space-y-4 mt-8 overflow-y-auto scrollbar-none">
              <p className="text-[8px] font-black text-zinc-300 tracking-[0.3em] mb-4 uppercase">Projects</p>
              
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setSelectedProjectId(null);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-4 transition-all duration-500 border-l ${
                  activeTab === 'dashboard' && !selectedProjectId
                  ? 'border-olive-primary text-olive-primary bg-olive-light/20' 
                  : 'border-transparent text-zinc-400 hover:text-architect-coal'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" strokeWidth={activeTab === 'dashboard' && !selectedProjectId ? 2 : 1} />
                <span className={`text-[10px] font-black tracking-[0.2em] uppercase transition-all ${activeTab === 'dashboard' && !selectedProjectId ? 'opacity-100' : 'opacity-60'}`}>
                  PROJECT DASHBOARD
                </span>
              </button>

              {/* Projects List */}
              <div className="space-y-1 mt-2">
                {projects.filter(p => !p.isArchived).map(project => (
                  <div key={project.id}>
                    <button
                      onClick={() => {
                        setActiveTab('dashboard');
                        setSelectedProjectId(project.id);
                        setActiveSubTab('overview');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left pl-14 pr-4 py-3 text-[9px] font-black tracking-[0.1em] uppercase transition-all border-l-2 ${
                        selectedProjectId === project.id 
                        ? 'border-olive-primary text-olive-primary bg-olive-light/10' 
                        : 'border-transparent text-zinc-400 hover:text-architect-coal'
                      }`}
                    >
                      {project.name}
                    </button>
                    
                    {/* Sub-tools for active project */}
                    <AnimatePresence>
                      {selectedProjectId === project.id && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden border-l border-zinc-100 ml-14 mb-2"
                        >
                          {[
                            { id: 'overview', label: 'OVERVIEW', alwaysShow: true },
                            { id: 'drawings', label: 'DOCUMENTS', policyKey: 'enableDocuments' },
                            { id: 'planning', label: 'PLANNING', policyKey: 'enablePlanning' },
                            { id: 'compliance', label: 'COMPLIANCE', policyKey: 'enableCompliance' },
                            { id: 'records', label: 'RECORDS', policyKey: 'enableRecords' },
                            { id: 'resources', label: 'RESOURCES', policyKey: 'enableResources' },
                            { id: 'finance', label: 'FINANCE', policyKey: 'enableFinance' },
                            ...(userData?.role === 'Super_Admin' || userData?.role === 'Org_Admin' ? [{ id: 'admin', label: 'ADMIN', alwaysShow: true }] : []),
                          ].filter(tool => tool.alwaysShow || project.policies?.[tool.policyKey!] !== false).map(tool => (
                            <button
                              key={tool.id}
                              onClick={() => {
                                setActiveSubTab(tool.id);
                                setIsSidebarOpen(false);
                              }}
                              className={`w-full text-left pl-6 py-2 text-[7px] font-black tracking-[0.2em] uppercase transition-all ${
                                activeSubTab === tool.id ? 'text-olive-primary' : 'text-zinc-300 hover:text-zinc-500'
                              }`}
                            >
                              {tool.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="pl-14 py-3 text-[8px] text-zinc-300 uppercase tracking-widest italic">No active projects</p>
                )}
              </div>

              {userData?.role === 'Super_Admin' && (
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-4 transition-all duration-500 border-l ${
                    activeTab === 'settings' 
                    ? 'border-olive-primary text-olive-primary bg-olive-light/20' 
                    : 'border-transparent text-zinc-400 hover:text-architect-coal'
                  }`}
                >
                  <SettingsIcon className="w-5 h-5" strokeWidth={activeTab === 'settings' ? 2 : 1} />
                  <span className={`text-[10px] font-black tracking-[0.2em] uppercase transition-all ${activeTab === 'settings' ? 'opacity-100' : 'opacity-60'}`}>
                    GENERAL SETTINGS
                  </span>
                </button>
              )}
            </nav>

            <div className="p-8 mt-auto border-t border-zinc-50">
              <div className="flex items-center gap-4 mb-8 p-4 bg-zinc-50 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-white border border-zinc-100 flex items-center justify-center text-xs font-black text-olive-primary">
                  {userData?.fullName?.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-[10px] tracking-widest truncate uppercase">{userData?.fullName}</p>
                  <p className="text-[8px] text-zinc-400 font-black uppercase tracking-[0.2em]">{userData?.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 border-b border-zinc-100 bg-white/60 backdrop-blur-xl flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-zinc-400 hover:text-olive-primary transition-colors">
              {isSidebarOpen ? <X className="w-5 h-5" strokeWidth={1} /> : <Menu className="w-5 h-5" strokeWidth={1} />}
            </button>
            <div className="h-6 w-[1px] bg-zinc-100" />
            <h2 className="text-[10px] font-black text-zinc-400 tracking-[0.4em] uppercase">
              {activeTab === 'dashboard' ? 'Project Portfolio' : 'General Settings'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <NotificationCenter user={user} />
             <div className="hidden sm:flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-full border border-zinc-100">
               <div className="w-1.5 h-1.5 bg-olive-primary rounded-full" />
               <span className="text-[8px] font-black tracking-widest uppercase text-zinc-500">System Active</span>
             </div>
             <div className="h-6 w-[1px] bg-zinc-100" />
             <button 
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-red-800 transition-all text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" strokeWidth={1} />
                <span className="hidden sm:inline">Sign Out</span>
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="p-4 md:p-10 lg:p-16 max-w-7xl pb-24 md:pb-10"
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  user={user} 
                  userData={userData} 
                  selectedProjectId={selectedProjectId}
                  onSelectProject={setSelectedProjectId}
                  activeSubTab={activeSubTab}
                  onSetActiveSubTab={setActiveSubTab}
                />
              )}
              {activeTab === 'settings' && <Settings user={user} userData={userData} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <AgentDataGatheringFAB />
      </main>
    </div>
  );
}
