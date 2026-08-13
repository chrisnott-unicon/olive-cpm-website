import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldAlert, Users, Settings as SettingsIcon, Save, Lock, UserPlus, Trash2, Key, UsersIcon, FileArchive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SkeletalFrame } from './ArchitecturalDoodles';
import StakeholderRegistry from './StakeholderRegistry';
import ProjectBaselineRecords from './ProjectBaselineRecords';
import ProjectAuditTrail from './ProjectAuditTrail';
import { FileArchive, ShieldCheck } from 'lucide-react';

interface ProjectAdminHubProps {
  projectTarget: any;
  user: any;
  userData: any;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'Super_Admin' | 'User';
  allowedProjects?: string[];
}

export default function ProjectAdminHub({ projectTarget, user, userData }: ProjectAdminHubProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<'settings' | 'stakeholders' | 'baseline-records' | 'audit-trail'>('settings');
  const [projectPolicies, setProjectPolicies] = useState({
    requirePhotosForDiary: false,
    auditLevel: 'Standard',
    automaticWeatherAlerts: true,
    rfiEmailNotifications: true,
    rfiReminderDays: 3,
    enableDocuments: true,
    enablePlanning: true,
    enableCompliance: true,
    enableRecords: true,
    enableResources: true,
    enableFinance: true,
    ...(projectTarget.policies || {})
  });
  
  const [projectDetails, setProjectDetails] = useState({
    name: projectTarget.name || '',
    location: projectTarget.location || '',
    currency: projectTarget.currency || 'ZAR',
    coordinates: {
      lat: projectTarget.coordinates?.lat || '',
      lng: projectTarget.coordinates?.lng || ''
    }
  });

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [projectUsers, setProjectUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const saveProjectDetails = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectTarget.id), {
        ...projectDetails
      });
    } catch (error) {
      console.error("Error saving project details:", error);
    }
    setSaving(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
        setAllUsers(usersData);
        setProjectUsers(usersData.filter(u => u.allowedProjects?.includes(projectTarget.id) || u.role === 'Super_Admin'));
      } catch (error) {
        console.error("Error fetching users:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [projectTarget.id]);

  const savePolicies = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', projectTarget.id), {
        policies: projectPolicies
      });
      // Optionally notify user
    } catch (error) {
      console.error("Error saving policies:", error);
    }
    setSaving(false);
  };

  const toggleUserAccess = async (userId: string, hasAccess: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        let allowed = uData.allowedProjects || [];
        if (hasAccess) {
          if (!allowed.includes(projectTarget.id)) allowed.push(projectTarget.id);
        } else {
          allowed = allowed.filter((id: string) => id !== projectTarget.id);
        }
        await updateDoc(userRef, { allowedProjects: allowed });
        
        // Update local state
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, allowedProjects: allowed } : u));
        setProjectUsers(prev => {
          if (hasAccess) {
            const addedUser = allUsers.find(u => u.id === userId);
            return addedUser ? [...prev, { ...addedUser, allowedProjects: allowed }] : prev;
          } else {
            return prev.filter(u => u.id !== userId);
          }
        });
      }
    } catch (error) {
      console.error("Error toggling user access:", error);
    }
  };

  if (userData?.role !== 'Super_Admin' && userData?.role !== 'Org_Admin') {
    return (
      <div className="bg-white border border-zinc-100 p-20 text-center rounded-none shadow-sm flex flex-col items-center relative overflow-hidden">
         <SkeletalFrame className="absolute inset-0 w-full h-full opacity-[0.05]" />
         <div className="relative z-10 flex flex-col items-center">
            <Lock className="w-16 h-16 text-zinc-100 mb-6" strokeWidth={1} />
            <h2 className="text-xl font-black text-architect-coal uppercase tracking-widest">Restricted Access</h2>
            <p className="text-xs text-zinc-400 mt-4 max-w-xs font-medium uppercase tracking-widest leading-relaxed">This section is restricted to administrative personnel only.</p>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex gap-4 border-b border-zinc-100 pb-4">
        <button
          onClick={() => setActiveAdminTab('settings')}
          className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === 'settings' ? 'bg-architect-coal text-white shadow-lg' : 'bg-white text-zinc-400 hover:text-architect-coal border border-zinc-100'}`}
        >
          <SettingsIcon className="w-4 h-4" /> System Settings
        </button>
        <button
          onClick={() => setActiveAdminTab('stakeholders')}
          className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === 'stakeholders' ? 'bg-architect-coal text-white shadow-lg' : 'bg-white text-zinc-400 hover:text-architect-coal border border-zinc-100'}`}
        >
          <UsersIcon className="w-4 h-4" /> Stakeholder Registry
        </button>
        <button
          onClick={() => setActiveAdminTab('baseline-records')}
          className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === 'baseline-records' ? 'bg-architect-coal text-white shadow-lg' : 'bg-white text-zinc-400 hover:text-architect-coal border border-zinc-100'}`}
        >
          <FileArchive className="w-4 h-4" /> Permanent Records
        </button>
        <button
          onClick={() => setActiveAdminTab('audit-trail')}
          className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === 'audit-trail' ? 'bg-architect-coal text-white shadow-lg' : 'bg-white text-zinc-400 hover:text-architect-coal border border-zinc-100'}`}
        >
          <ShieldCheck className="w-4 h-4" /> Audit Trail
        </button>
      </div>

      {activeAdminTab === 'stakeholders' ? (
        <StakeholderRegistry user={user} userData={userData} projectTarget={projectTarget} />
      ) : activeAdminTab === 'baseline-records' ? (
        <ProjectBaselineRecords user={user} userData={userData} projectTarget={projectTarget} />
      ) : activeAdminTab === 'audit-trail' ? (
        <ProjectAuditTrail projectTarget={projectTarget} />
      ) : (
        <>
          {/* Core Project Parameters */}
          <div className="space-y-8 bg-zinc-50 border border-zinc-100 p-8">
        <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
           <div className="w-12 h-12 bg-architect-coal flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-olive-primary" strokeWidth={1.5} />
           </div>
           <div>
             <h3 className="text-sm font-black text-architect-coal uppercase tracking-[0.3em]">Project Settings</h3>
             <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Core details and localization for {projectTarget.name}</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Project Name</label>
              <input 
                type="text"
                value={projectDetails.name}
                onChange={(e) => setProjectDetails({...projectDetails, name: e.target.value})}
                className="w-full bg-white border border-zinc-100 px-4 py-3 text-[11px] font-bold text-architect-coal uppercase tracking-widest focus:border-olive-primary outline-none transition-all"
              />
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Site Location</label>
              <input 
                type="text"
                value={projectDetails.location}
                onChange={(e) => setProjectDetails({...projectDetails, location: e.target.value})}
                className="w-full bg-white border border-zinc-100 px-4 py-3 text-[11px] font-bold text-architect-coal uppercase tracking-widest focus:border-olive-primary outline-none transition-all"
              />
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Reporting Currency</label>
              <select 
                value={projectDetails.currency}
                onChange={(e) => setProjectDetails({...projectDetails, currency: e.target.value})}
                className="w-full bg-white border border-zinc-100 px-4 py-3 text-[11px] font-bold text-architect-coal uppercase tracking-widest focus:border-olive-primary outline-none transition-all"
              >
                <option value="ZAR">ZAR (South African Rand)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="AUD">AUD (Australian Dollar)</option>
              </select>
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">GPS Coordinates (Lat, Lng)</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Lat"
                  value={projectDetails.coordinates.lat}
                  onChange={(e) => setProjectDetails({...projectDetails, coordinates: {...projectDetails.coordinates, lat: e.target.value}})}
                  className="w-1/2 bg-white border border-zinc-100 px-4 py-3 text-[11px] font-bold text-architect-coal uppercase tracking-widest focus:border-olive-primary outline-none transition-all"
                />
                <input 
                  type="text"
                  placeholder="Lng"
                  value={projectDetails.coordinates.lng}
                  onChange={(e) => setProjectDetails({...projectDetails, coordinates: {...projectDetails.coordinates, lng: e.target.value}})}
                  className="w-1/2 bg-white border border-zinc-100 px-4 py-3 text-[11px] font-bold text-architect-coal uppercase tracking-widest focus:border-olive-primary outline-none transition-all"
                />
              </div>
           </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100">
          <div>
            <h4 className="text-[10px] font-black text-architect-coal uppercase tracking-widest">Archive Project</h4>
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Archived projects are hidden from active menus but remain accessible.</p>
          </div>
          <button 
            onClick={async () => {
              if (window.confirm(`Are you sure you want to ${projectTarget.isArchived ? 'unarchive' : 'archive'} this project?`)) {
                setSaving(true);
                try {
                  await updateDoc(doc(db, 'projects', projectTarget.id), { isArchived: !projectTarget.isArchived });
                  window.location.reload();
                } catch (error) {
                  console.error("Error archiving project:", error);
                }
                setSaving(false);
              }
            }}
            disabled={saving}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${projectTarget.isArchived ? 'bg-olive-primary text-white border border-olive-primary w-[140px]' : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 w-[140px]'}`}
          >
            {projectTarget.isArchived ? 'Restore' : 'Archive'}
          </button>
        </div>

        <button 
          onClick={saveProjectDetails}
          disabled={saving}
          className="w-full flex items-center justify-center gap-3 py-4 bg-architect-coal text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 bg-white/20 animate-pulse rounded-full" /> : <Save className="w-4 h-4 text-olive-primary" />}
          Update Settings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Project Policies */}
        <div className="space-y-8">
           <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
              <div className="w-12 h-12 bg-architect-coal flex items-center justify-center">
                 <SettingsIcon className="w-6 h-6 text-olive-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-black text-architect-coal uppercase tracking-[0.3em]">Governance Policies</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Stipulate operational rules for {projectTarget.name}</p>
              </div>
           </div>

           <div className="bg-white border border-zinc-50 p-8 space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 hover:border-olive-primary transition-all group">
                 <div>
                    <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest">Site Diary Photo Enforcement</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter mt-1">Requires at least one photo per site diary entry</p>
                 </div>
                 <button 
                  onClick={() => setProjectPolicies({...projectPolicies, requirePhotosForDiary: !projectPolicies.requirePhotosForDiary})}
                  className={`w-12 h-6 flex items-center p-1 transition-colors ${projectPolicies.requirePhotosForDiary ? 'bg-olive-primary' : 'bg-zinc-200'}`}
                 >
                    <div className={`w-4 h-4 bg-white transition-transform ${projectPolicies.requirePhotosForDiary ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 hover:border-olive-primary transition-all group">
                 <div>
                    <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest">Weather Alerts</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter mt-1">Automatic notification on weather events</p>
                 </div>
                 <button 
                  onClick={() => setProjectPolicies({...projectPolicies, automaticWeatherAlerts: !projectPolicies.automaticWeatherAlerts})}
                  className={`w-12 h-6 flex items-center p-1 transition-colors ${projectPolicies.automaticWeatherAlerts ? 'bg-olive-primary' : 'bg-zinc-200'}`}
                 >
                    <div className={`w-4 h-4 bg-white transition-transform ${projectPolicies.automaticWeatherAlerts ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>

               <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 hover:border-olive-primary transition-all group">
                 <div>
                    <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest">RFI Email Notifications</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter mt-1">Automatic emails for new and updated RFIs</p>
                 </div>
                 <button 
                  onClick={() => setProjectPolicies({...projectPolicies, rfiEmailNotifications: !projectPolicies.rfiEmailNotifications})}
                  className={`w-12 h-6 flex items-center p-1 transition-colors ${projectPolicies.rfiEmailNotifications ? 'bg-olive-primary' : 'bg-zinc-200'}`}
                 >
                    <div className={`w-4 h-4 bg-white transition-transform ${projectPolicies.rfiEmailNotifications ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-100">
                 <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest mb-4">RFI Overdue Reminder (Days)</p>
                 <div className="flex gap-2">
                    {[1, 3, 7, 14].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setProjectPolicies({...projectPolicies, rfiReminderDays: days})}
                        className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${
                          projectPolicies.rfiReminderDays === days 
                            ? 'bg-architect-coal text-white border-architect-coal shadow-lg' 
                            : 'bg-white text-zinc-400 border border-zinc-100 hover:text-architect-coal'
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                 </div>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-100">
                 <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest mb-4">Contractual Audit Tier</p>
                 <div className="grid grid-cols-3 gap-2">
                    {['Standard', 'High', 'Critical'].map(level => (
                      <button
                        key={level}
                        onClick={() => setProjectPolicies({...projectPolicies, auditLevel: level})}
                        className={`py-3 text-[9px] font-black uppercase tracking-widest transition-all ${
                          projectPolicies.auditLevel === level 
                            ? 'bg-architect-coal text-white border-architect-coal shadow-lg' 
                            : 'bg-white text-zinc-400 border border-zinc-100 hover:text-architect-coal'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-100">
                 <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest mb-4">Module Availability</p>
                 <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'enableDocuments', label: 'Documents & Drawings' },
                      { key: 'enablePlanning', label: 'Programme Planning' },
                      { key: 'enableCompliance', label: 'Compliance & Safety' },
                      { key: 'enableRecords', label: 'Statutory Site Records' },
                      { key: 'enableResources', label: 'Resource Hub' },
                      { key: 'enableFinance', label: 'Valuations & Finance' }
                    ].map(module => (
                      <div key={module.key} className="flex items-center justify-between border-b border-zinc-100 pb-2 border-dashed">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{module.label}</span>
                        <button 
                          onClick={() => setProjectPolicies({...projectPolicies, [module.key]: !(projectPolicies as any)[module.key]})}
                          className={`w-8 h-4 flex items-center p-0.5 transition-colors ${projectPolicies[module.key as keyof typeof projectPolicies] ? 'bg-olive-primary' : 'bg-zinc-200'}`}
                        >
                          <div className={`w-3 h-3 bg-white transition-transform ${(projectPolicies as any)[module.key] ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    ))}
                 </div>
              </div>

              <button 
                onClick={savePolicies}
                disabled={saving}
                className="w-full flex items-center justify-center gap-3 py-4 bg-olive-primary text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-olive-dark transition-all disabled:opacity-50"
              >
                {saving ? <div className="w-4 h-4 bg-white/20 animate-pulse rounded-full" /> : <Save className="w-4 h-4" />}
                Apply Policies
              </button>
           </div>
        </div>

        {/* User Rights Management */}
        <div className="space-y-8">
           <div className="flex items-center gap-4 border-b border-zinc-100 pb-6">
              <div className="w-12 h-12 bg-architect-coal flex items-center justify-center">
                 <ShieldAlert className="w-6 h-6 text-olive-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-black text-architect-coal uppercase tracking-[0.3em]">Project Access</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Manage personnel access for this project</p>
              </div>
           </div>

           <div className="bg-white border border-zinc-100 min-h-[400px] flex flex-col">
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                 <span className="text-[10px] font-black text-architect-coal uppercase tracking-widest">Authorized Personnel ({projectUsers.length})</span>
                 <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">Admin Rights are Inherited</p>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[500px] scrollbar-none p-2 space-y-1">
                 {projectUsers.map(u => (
                   <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-zinc-50 group transition-all">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-zinc-50 flex items-center justify-center text-xs font-black text-zinc-400 group-hover:text-olive-primary transition-colors">
                            {u.fullName?.charAt(0)}
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-architect-coal uppercase tracking-tight">{u.fullName}</p>
                            <p className="text-[9px] text-zinc-400 font-medium tracking-tighter truncate max-w-[150px]">{u.email}</p>
                         </div>
                      </div>
                      
                      {u.role !== 'Super_Admin' ? (
                        <button 
                          onClick={() => toggleUserAccess(u.id, false)}
                          className="p-2 text-zinc-200 hover:text-red-500 transition-colors"
                          title="Revoke Access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="px-3 py-1 bg-architect-coal text-white text-[7px] font-black uppercase tracking-widest">ADMIN</div>
                      )}
                   </div>
                 ))}
                 
                 {projectUsers.length === 0 && (
                   <div className="p-12 text-center">
                      <Users className="w-12 h-12 text-zinc-100 mx-auto mb-4" />
                      <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest italic">No personnel assigned to this project.</p>
                   </div>
                 )}
              </div>

              <div className="p-6 border-t border-zinc-100">
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Assign New Personnel</p>
                 <select 
                   onChange={(e) => {
                     if (e.target.value) {
                       toggleUserAccess(e.target.value, true);
                       e.target.value = '';
                     }
                   }}
                   className="w-full bg-zinc-50 border border-zinc-100 px-4 py-3 text-[10px] font-black text-architect-coal uppercase tracking-widest focus:border-olive-primary outline-none transition-all"
                 >
                    <option value="">SELECT USER...</option>
                    {allUsers
                      .filter(u => !u.allowedProjects?.includes(projectTarget.id) && u.role !== 'Super_Admin')
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                      ))
                    }
                 </select>
              </div>
           </div>
        </div>
      </div>

      {/* Global Rights Warning */}
      <div className="bg-architect-coal p-10 border-l-4 border-olive-primary flex items-start gap-8">
         <ShieldAlert className="w-10 h-10 text-olive-primary shrink-0" />
         <div>
            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.4em] mb-2">Access Control</h4>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest leading-relaxed max-w-2xl">
              Changes made in this terminal have immediate implications. All modifications of project policies or personnel access are recorded for audit trails. Personnel with "Super Admin" status inherit all project-level rights.
            </p>
         </div>
      </div>
     </>
    )}
    </div>
  );
}
