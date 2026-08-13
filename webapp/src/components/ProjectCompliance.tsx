import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, Circle, AlertTriangle, Plus, Trash2, Bot, ShieldCheck, MapPin, ShieldAlert } from 'lucide-react';

export default function ProjectComplianceHub({ projectTarget, user, userData }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Health_Safety' as any,
  });
  const [processing, setProcessing] = useState(false);
  const country = 'South Africa'; // Ideally we could derive from coords using reverse geocoding, but let's assume South Africa for Unicon SA or we let AI guess based on project name/location string. Wait, we can ask Gemini. Let's hardcode South Africa or use project.location if we do AI generation.

  useEffect(() => {
    if (!projectTarget?.id) return;
    const q = query(collection(db, 'projects', projectTarget.id, 'compliance'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, [projectTarget]);

  const toggleStatus = async (item: any) => {
    try {
      const newStatus = item.status === 'Met' ? 'Pending' : 'Met';
      await updateDoc(doc(db, 'projects', projectTarget.id, 'compliance', item.id), {
        status: newStatus,
        metByUserId: newStatus === 'Met' ? user.uid : null,
        metAt: newStatus === 'Met' ? serverTimestamp() : null
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Remove compliance tracking for this item?")) return;
    try {
      await deleteDoc(doc(db, 'projects', projectTarget.id, 'compliance', id));
    } catch(e) { console.error(e); }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    try {
      await addDoc(collection(db, 'projects', projectTarget.id, 'compliance'), {
        ...formData,
        status: 'Pending',
        country: projectTarget.location || 'South Africa',
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setFormData({ title: '', description: '', category: 'Health_Safety' });
    } catch(e) { console.error(e); }
  };

  const handleAiAssist = async () => {
    setProcessing(true);
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a JSON array of 5 crucial statutory compliance items required for a construction project located in ${projectTarget.location || 'South Africa'}. Each item should have: "title" (string), "description" (string), "category" (enum: "Health_Safety", "Environmental", "Labour", "Quality", "General"). Return ONLY valid JSON array.`
            }]
          }]
        })
      });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '');
      const newItems = JSON.parse(cleanJson);
      
      for (const item of newItems) {
        await addDoc(collection(db, 'projects', projectTarget.id, 'compliance'), {
          ...item,
          status: 'Pending',
          country: projectTarget.location || 'South Africa',
          createdBy: "AI_ASSISTANT",
          createdAt: serverTimestamp()
        });
      }
    } catch(e) {
      console.error(e);
      alert("AI failed to generate compliance checklist.");
    } finally {
      setProcessing(false);
    }
  };

  const isAdmin = userData?.role === 'Super_Admin' || userData?.role === 'Org_Admin';

  const icons = {
    Health_Safety: ShieldAlert,
    Environmental: MapPin,
    Labour: ShieldCheck,
    Quality: CheckCircle2,
    General: AlertTriangle
  } as any;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white p-8 border border-zinc-100 mb-8 rounded-[2rem] shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-architect-coal mb-2 flex items-center gap-3">
             <ShieldCheck className="w-8 h-8 text-olive-primary" strokeWidth={1.5} />
             Statutory & Regulatory Compliance
          </h2>
          <p className="text-sm font-medium text-zinc-500 max-w-2xl">
             Monitoring adherence to the National Building Regulations, OHS Act, and relevant Municipal Bylaws for the project jurisdiction.
          </p>
        </div>
        <div className="flex flex-col gap-2">
            <button
               onClick={handleAiAssist}
               disabled={processing}
               className="px-6 py-3 bg-olive-light/10 text-olive-primary text-[10px] uppercase font-black tracking-widest rounded-xl hover:bg-olive-light/20 transition-all border border-olive-primary/10 flex items-center gap-2 group disabled:opacity-50"
             >
               {processing ? <div className="w-4 h-4 border-2 border-olive-primary border-t-transparent rounded-full animate-spin" /> : <Bot className="w-4 h-4 group-hover:scale-110 transition-transform" /> }
               {processing ? 'Auditing...' : 'AI Statutory Compliance Audit'}
             </button>
            {isAdmin && (
             <button
                onClick={() => setIsAdding(!isAdding)}
                className="px-6 py-3 bg-architect-coal text-white text-[10px] uppercase tracking-widest font-black rounded-xl hover:bg-opacity-90 transition-all"
             >
               {isAdding ? 'Cancel' : 'Add Custom Check'}
             </button>
            )}
        </div>
      </div>

      {isAdding && isAdmin && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-[2rem] border border-olive-primary/20 space-y-4 shadow-xl shadow-olive-primary/5">
           <h3 className="text-sm font-black text-architect-coal uppercase tracking-widest mb-4">New Statutory Requirement</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Regulation or Check Title" className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl w-full font-bold text-sm outline-none focus:border-olive-primary" />
             <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl w-full font-bold text-sm outline-none focus:border-olive-primary">
                <option value="Health_Safety">Occupational Health & Safety</option>
                <option value="Environmental">Environmental</option>
                <option value="Labour">Labour & Welfare</option>
                <option value="Quality">Quality Standards</option>
                <option value="General">General / Municipal</option>
             </select>
           </div>
           <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed description of the requirement..." className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm min-h-[100px] outline-none focus:border-olive-primary focus:bg-white resize-none" />
           <button type="submit" className="px-6 py-3 bg-olive-primary text-white text-[10px] uppercase font-black tracking-widest rounded-xl hover:bg-opacity-90">Save Requirement</button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map(item => {
          const Icon = icons[item.category] || CheckCircle2;
          return (
            <div key={item.id} className={`p-6 rounded-[2rem] border transition-all ${item.status === 'Met' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-zinc-100 hover:border-olive-primary/30'} flex flex-col gap-4 relative overflow-hidden group`}>
               {item.status === 'Met' && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl pointer-events-none" />}
               
               <div className="flex items-start justify-between">
                 <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.status === 'Met' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
                     <Icon className="w-5 h-5" />
                   </div>
                   <div>
                     <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded inline-block mb-2 ${item.status === 'Met' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                       {item.category.replace('_', ' ')}
                     </span>
                     <h4 className={`text-lg font-black leading-tight ${item.status === 'Met' ? 'text-emerald-900' : 'text-architect-coal'}`}>{item.title}</h4>
                   </div>
                 </div>
                 
                 {isAdmin && (
                   <button onClick={() => handleDelete(item.id)} className="text-zinc-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Trash2 className="w-4 h-4" />
                   </button>
                 )}
               </div>

               <p className={`text-sm ${item.status === 'Met' ? 'text-emerald-700/70' : 'text-zinc-500'} flex-1`}>{item.description}</p>
               
               <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                 <div className="flex flex-col">
                   <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Jurisdiction Context</p>
                   <p className={`text-xs font-bold font-mono ${item.status === 'Met' ? 'text-emerald-800' : 'text-zinc-500'}`}>{item.country}</p>
                 </div>
                 {isAdmin && (
                   <button 
                     onClick={() => toggleStatus(item)}
                     className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${
                       item.status === 'Met' 
                       ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                       : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-architect-coal'
                     }`}
                   >
                     {item.status === 'Met' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                     {item.status === 'Met' ? 'Compliant' : 'Mark Compliant'}
                   </button>
                 )}
               </div>
            </div>
          )
        })}
        {items.length === 0 && !processing && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <ShieldCheck className="w-16 h-16 text-zinc-200 mb-6" />
            <h3 className="text-xl font-black text-zinc-400 uppercase tracking-widest">No Compliance Data</h3>
            <p className="text-sm text-zinc-400 mt-2">Use the AI Assistant to auto-detect requirements for {projectTarget.location || 'this region'}.</p>
          </div>
        )}
      </div>
    </div>
  )
}
