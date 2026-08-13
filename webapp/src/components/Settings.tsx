import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, setDoc, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shield, Users, Building, Bell, Palette, Globe, Plus, Save } from 'lucide-react';

export default function Settings({ user, userData }: { user: any, userData?: any }) {
  const [activeTab, setActiveTab] = useState<'organization' | 'team' | 'preferences'>('organization');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [orgData, setOrgData] = useState({
    name: '',
    registrationNumber: '',
    vatNumber: '',
    physicalAddress: '',
    postalAddress: '',
    contactPhone: '',
    contactEmail: '',
    professionalBody: '',
    professionalRegNumber: '',
    practiceNumber: '',
  });
  const [loading, setLoading] = useState(true);
  
  // App preferences state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [theme, setTheme] = useState('Light');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (userData?.orgId) {
          const orgSnap = await getDocs(query(collection(db, 'organizations'), where('__name__', '==', userData.orgId)));
          if (!orgSnap.empty) {
             const oData = orgSnap.docs[0].data();
             setOrganization({ id: orgSnap.docs[0].id, ...oData });
             setOrgData({
               name: oData.name || '',
               registrationNumber: oData.registrationNumber || '',
               vatNumber: oData.vatNumber || '',
               physicalAddress: oData.physicalAddress || '',
               postalAddress: oData.postalAddress || '',
               contactPhone: oData.contactPhone || '',
               contactEmail: oData.contactEmail || '',
               professionalBody: oData.professionalBody || '',
               professionalRegNumber: oData.professionalRegNumber || '',
               practiceNumber: oData.practiceNumber || '',
             });
          }
          
          const usersSnap = await getDocs(query(collection(db, 'users'), where('orgId', '==', userData.orgId)));
          setTeamMembers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else if (userData?.role === 'Super_Admin') {
           const usersSnap = await getDocs(collection(db, 'users'));
           setTeamMembers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    if (userData) {
      fetchData();
    }
  }, [userData]);

  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role });
      setTeamMembers(teamMembers.map(u => u.id === userId ? { ...u, role } : u));
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleSaveOrganization = async () => {
    if (!orgData.name) return;
    try {
      if (organization) {
         await updateDoc(doc(db, 'organizations', organization.id), { ...orgData });
      } else {
         const orgRef = await addDoc(collection(db, 'organizations'), { ...orgData, createdAt: serverTimestamp() });
         setOrganization({ id: orgRef.id, ...orgData });
         await updateDoc(doc(db, 'users', user.uid), { orgId: orgRef.id, role: 'Org_Admin' });
         // Alert user that they need to reload to get new claims
         alert('Organization created successfully. You are now the Org Admin.');
      }
    } catch(err) {
       console.error("Error saving org", err);
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'organization':
        return (
          <div className="space-y-6 max-w-2xl">
             <div className="flex items-center gap-4 mb-8">
               <Building className="w-6 h-6 text-olive-primary" />
               <h2 className="text-2xl font-light text-architect-coal uppercase tracking-tighter">Organization Profile</h2>
             </div>
             <p className="text-xs text-zinc-500 font-medium mb-6">Manage your organization's identity and core details.</p>
             <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 flex flex-col gap-6">
               <div className="flex gap-4 items-end">
                 <div className="flex-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Organization Name</label>
                   <input 
                     type="text" 
                     value={orgData.name} 
                     onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                     className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold focus:border-olive-primary outline-none"
                     placeholder="E.g., Unicon SA"
                   />
                 </div>
                 <button 
                   onClick={handleSaveOrganization}
                   disabled={userData?.role !== 'Org_Admin' && userData?.role !== 'Super_Admin' && organization}
                   className="px-6 py-3 h-[46px] bg-olive-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-olive-dark transition-colors disabled:opacity-50"
                 >
                   <Save className="w-4 h-4" /> Save
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-200/50">
                 <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Company Reg Number</label>
                   <input 
                     type="text"
                     placeholder="Reg Number"
                     value={orgData.registrationNumber}
                     onChange={(e) => setOrgData({ ...orgData, registrationNumber: e.target.value })}
                     className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-olive-primary transition-colors"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">VAT Number</label>
                   <input 
                     type="text"
                     placeholder="VAT Number"
                     value={orgData.vatNumber}
                     onChange={(e) => setOrgData({ ...orgData, vatNumber: e.target.value })}
                     className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-olive-primary transition-colors"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Contact Email</label>
                   <input 
                     type="text"
                     placeholder="info@company.com"
                     value={orgData.contactEmail}
                     onChange={(e) => setOrgData({ ...orgData, contactEmail: e.target.value })}
                     className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-olive-primary transition-colors"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Contact Phone</label>
                   <input 
                     type="text"
                     placeholder="+27..."
                     value={orgData.contactPhone}
                     onChange={(e) => setOrgData({ ...orgData, contactPhone: e.target.value })}
                     className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-olive-primary transition-colors"
                   />
                 </div>
                 <div className="md:col-span-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Physical Address</label>
                   <input 
                     type="text"
                     placeholder="Head office address"
                     value={orgData.physicalAddress}
                     onChange={(e) => setOrgData({ ...orgData, physicalAddress: e.target.value })}
                     className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-olive-primary transition-colors"
                   />
                 </div>
               </div>

               <div className="pt-4 border-t border-zinc-200/50">
                 <h3 className="text-[10px] font-black tracking-widest text-olive-primary uppercase mb-4">Professional Registration</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Professional Body</label>
                     <input 
                       type="text"
                       placeholder="E.g., SACAP, ECSA, SACQSP"
                       value={orgData.professionalBody}
                       onChange={(e) => setOrgData({ ...orgData, professionalBody: e.target.value })}
                       className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-olive-primary transition-colors"
                     />
                   </div>
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Registration Number</label>
                     <input 
                       type="text"
                       placeholder="Registration Number"
                       value={orgData.professionalRegNumber}
                       onChange={(e) => setOrgData({ ...orgData, professionalRegNumber: e.target.value })}
                       className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-olive-primary transition-colors"
                     />
                   </div>
                   <div className="md:col-span-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Practice Number</label>
                     <input 
                       type="text"
                       placeholder="Practice Number (if applicable)"
                       value={orgData.practiceNumber}
                       onChange={(e) => setOrgData({ ...orgData, practiceNumber: e.target.value })}
                       className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-bold outline-none focus:border-olive-primary transition-colors"
                     />
                   </div>
                 </div>
               </div>

               {!organization && (
                  <p className="mt-4 text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-lg border border-amber-100">You are not currently linked to an organization. Create one above to establish your multi-tenant workspace.</p>
               )}
             </div>
          </div>
        );
      case 'team':
        if (userData?.role !== 'Org_Admin' && userData?.role !== 'Super_Admin') {
           return <p className="text-sm text-red-500 font-bold bg-red-50 p-4 rounded-xl border border-red-100">You must be an Organization Admin to manage the team.</p>;
        }
        return (
          <div className="space-y-6">
             <div className="flex justify-between items-end mb-8">
               <div className="flex items-center gap-4">
                 <Users className="w-6 h-6 text-olive-primary" />
                 <h2 className="text-2xl font-light text-architect-coal uppercase tracking-tighter">Team Management</h2>
               </div>
               <button className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl font-bold flex items-center gap-2 text-xs shadow-xl hover:bg-zinc-800 transition-colors">
                 <Plus className="w-4 h-4" /> Invite Member
               </button>
             </div>
             
             <div className="bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-100">
                    <tr>
                      <th className="py-4 px-6 text-[10px] font-black text-zinc-400 w-full uppercase tracking-widest">Team Member</th>
                      <th className="py-4 px-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Access Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {teamMembers.map(member => (
                      <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-4 px-6">
                           <p className="font-bold text-zinc-900">{member.fullName || 'Unknown'}</p>
                           <p className="text-xs text-zinc-500 mt-1">{member.email}</p>
                        </td>
                        <td className="py-4 px-6">
                           <select 
                             value={member.role}
                             onChange={(e) => handleUpdateUserRole(member.id, e.target.value)}
                             disabled={member.id === user.uid}
                             className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold outline-none cursor-pointer disabled:opacity-50"
                           >
                              <option value="User">Standard User</option>
                              <option value="Org_Admin">Org Admin</option>
                              {userData?.role === 'Super_Admin' && <option value="Super_Admin">Super Admin</option>}
                           </select>
                        </td>
                      </tr>
                    ))}
                    {teamMembers.length === 0 && (
                       <tr><td colSpan={2} className="py-8 text-center text-zinc-400 font-bold text-xs">No team members found.</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        );
      case 'preferences':
        return (
          <div className="space-y-6 max-w-2xl">
             <div className="flex items-center gap-4 mb-8">
               <Palette className="w-6 h-6 text-olive-primary" />
               <h2 className="text-2xl font-light text-architect-coal uppercase tracking-tighter">App Preferences</h2>
             </div>
             <p className="text-xs text-zinc-500 font-medium mb-6">Customize your workspace experience.</p>
             
             <div className="space-y-4">
                <div className="bg-white border border-zinc-100 p-6 rounded-2xl flex justify-between items-center shadow-sm">
                   <div className="flex items-center gap-4">
                      <Bell className="w-5 h-5 text-zinc-400" />
                      <div>
                         <p className="font-bold text-sm text-zinc-900">System Notifications</p>
                         <p className="text-xs text-zinc-500 mt-1">Receive alerts for contract updates and BOQ warnings.</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                     className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${notificationsEnabled ? 'bg-olive-primary' : 'bg-zinc-200'}`}
                   >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                   </button>
                </div>

                <div className="bg-white border border-zinc-100 p-6 rounded-2xl flex justify-between items-center shadow-sm">
                   <div className="flex items-center gap-4">
                      <Globe className="w-5 h-5 text-zinc-400" />
                      <div>
                         <p className="font-bold text-sm text-zinc-900">Regional Format</p>
                         <p className="text-xs text-zinc-500 mt-1">Date and currency formats for your region.</p>
                      </div>
                   </div>
                   <select className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none cursor-pointer">
                      <option>South Africa (ZAR, DD/MM/YYYY)</option>
                      <option>United Kingdom (GBP, DD/MM/YYYY)</option>
                      <option>United States (USD, MM/DD/YYYY)</option>
                   </select>
                </div>
             </div>
          </div>
        );
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-sm font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Loading Workspace Data...</div>;
  }

  return (
    <div className="space-y-12 pb-20 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-px bg-olive-primary" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400">Workspace Management</span>
          </div>
          <h1 className="text-4xl font-light text-olive-primary tracking-tight uppercase">General Settings</h1>
        </div>
      </div>

      <div className="flex gap-12 flex-col md:flex-row items-start">
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 relative">
           <div className="absolute top-0 bottom-0 left-[18px] w-px bg-zinc-100 z-0 hidden md:block" />
           {[
             { id: 'organization', icon: Building, label: 'Organization' },
             { id: 'team', icon: Users, label: 'Team Members' },
             { id: 'preferences', icon: Palette, label: 'Preferences' }
           ].map(tab => {
             const active = activeTab === tab.id;
             return (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`flex items-center gap-4 p-3 rounded-xl transition-all relative z-10 text-left ${
                   active ? 'bg-white shadow-sm border border-zinc-100' : 'hover:bg-zinc-50/50'
                 }`}
               >
                 <div className={`p-2 rounded-lg transition-colors ${active ? 'bg-olive-light/20 text-olive-primary' : 'bg-transparent text-zinc-400'}`}>
                    <tab.icon className="w-4 h-4" />
                 </div>
                 <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'text-zinc-900' : 'text-zinc-500'}`}>
                   {tab.label}
                 </span>
               </button>
             );
           })}
        </div>
        
        <div className="flex-1 bg-white p-10 border border-zinc-100 rounded-[2.5rem] shadow-sm w-full">
           {renderContent()}
        </div>
      </div>
    </div>
  );
}
