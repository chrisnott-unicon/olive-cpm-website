import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Truck, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  History,
  HardHat,
  Construction,
  Hammer
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  limit 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface LaborEntry {
  trade: string;
  count: number;
  hours: number;
}

interface PlantEntry {
  type: string;
  status: 'Active' | 'Idle' | 'Broken';
  hours: number;
}

interface LaborPlantRecord {
  id: string;
  date: string;
  labor: LaborEntry[];
  plant: PlantEntry[];
  recordedBy: string;
  createdAt: any;
}

export default function LaborPlantLog({ projectId, user }: { projectId: string; user: any }) {
  const [records, setRecords] = useState<LaborPlantRecord[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLabor, setNewLabor] = useState<LaborEntry[]>([]);
  const [newPlant, setNewPlant] = useState<PlantEntry[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, `projects/${projectId}/labor_plant_logs`), 
      orderBy('date', 'desc'),
      limit(30)
    );
    return onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaborPlantRecord)));
    });
  }, [projectId]);

  const addLaborRow = () => setNewLabor([...newLabor, { trade: '', count: 1, hours: 8 }]);
  const addPlantRow = () => setNewPlant([...newPlant, { type: '', status: 'Active', hours: 8 }]);

  const handleSubmit = async () => {
    if (newLabor.length === 0 && newPlant.length === 0) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `projects/${projectId}/labor_plant_logs`), {
        date: new Date().toISOString().split('T')[0],
        labor: newLabor,
        plant: newPlant,
        recordedBy: user.uid,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewLabor([]);
      setNewPlant([]);
    } catch (e) {
       console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-100 p-8 space-y-8 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-architect-coal uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-olive-primary" />
            Resource Telemetry
          </h3>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Labour & Plant Utilization Matrix</p>
        </div>
        
        <button 
           onClick={() => setIsAdding(true)}
           className="px-6 py-2 bg-architect-coal text-white text-[10px] font-black uppercase tracking-widest hover:bg-olive-primary transition-all flex items-center gap-2"
        >
           <Plus className="w-3 h-3" />
           New Capture
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-8 bg-zinc-50 border border-zinc-100 space-y-8 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* Labour Capture */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-architect-coal">Daily Labour Force</span>
                     <button onClick={addLaborRow} className="text-olive-primary hover:text-architect-coal transition-all"><Plus className="w-4 h-4" /></button>
                  </div>
                  {newLabor.map((row, i) => (
                    <div key={i} className="flex gap-2">
                       <input 
                         placeholder="Trade/Sub" 
                         className="flex-1 bg-white border border-zinc-200 p-2 text-[10px] font-bold"
                         value={row.trade}
                         onChange={e => {
                           const next = [...newLabor];
                           next[i].trade = e.target.value;
                           setNewLabor(next);
                         }}
                       />
                       <input 
                         type="number" 
                         placeholder="Qty" 
                         className="w-16 bg-white border border-zinc-200 p-2 text-[10px] font-bold"
                         value={row.count}
                         onChange={e => {
                           const next = [...newLabor];
                           next[i].count = parseInt(e.target.value);
                           setNewLabor(next);
                         }}
                       />
                       <button onClick={() => setNewLabor(newLabor.filter((_, idx) => idx !== i))} className="text-zinc-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  ))}
               </div>

               {/* Plant Capture */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-architect-coal">Site Plant & Equipment</span>
                     <button onClick={addPlantRow} className="text-olive-primary hover:text-architect-coal transition-all"><Plus className="w-4 h-4" /></button>
                  </div>
                  {newPlant.map((row, i) => (
                    <div key={i} className="flex gap-2">
                       <input 
                         placeholder="Machine/Tool" 
                         className="flex-1 bg-white border border-zinc-200 p-2 text-[10px] font-bold"
                         value={row.type}
                         onChange={e => {
                           const next = [...newPlant];
                           next[i].type = e.target.value;
                           setNewPlant(next);
                         }}
                       />
                       <select 
                         className="bg-white border border-zinc-200 p-2 text-[10px] font-bold"
                         value={row.status}
                         onChange={e => {
                           const next = [...newPlant];
                           next[i].status = e.target.value as any;
                           setNewPlant(next);
                         }}
                       >
                         <option>Active</option>
                         <option>Idle</option>
                         <option>Broken</option>
                       </select>
                       <button onClick={() => setNewPlant(newPlant.filter((_, idx) => idx !== i))} className="text-zinc-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  ))}
               </div>
            </div>

            <div className="flex justify-end gap-4 border-t border-zinc-200 pt-6">
               <button onClick={() => setIsAdding(false)} className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cancel</button>
               <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-architect-coal text-white text-[10px] font-black uppercase tracking-widest hover:bg-olive-primary transition-all flex items-center gap-2"
               >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Commit Resources
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
         {records.map(record => (
           <div key={record.id} className="p-6 bg-zinc-50 border border-zinc-100 group hover:border-olive-primary transition-all">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-200 pb-2">
                 <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest">{record.date}</p>
                 <div className="flex gap-4">
                    <span className="text-[8px] font-black text-zinc-400 uppercase bg-white px-2 py-1 border border-zinc-100">
                      {record.labor.reduce((acc, l) => acc + l.count, 0)} TOTAL HANDS
                    </span>
                    <span className="text-[8px] font-black text-zinc-400 uppercase bg-white px-2 py-1 border border-zinc-100">
                      {record.plant.length} TOTAL UNITS
                    </span>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-1">
                    {record.labor.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase">
                         <span>{l.trade}</span>
                         <span className="text-architect-coal">{l.count} Staff</span>
                      </div>
                    ))}
                 </div>
                 <div className="space-y-1 border-l border-zinc-200 pl-8">
                    {record.plant.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase">
                         <span>{p.type}</span>
                         <span className={p.status === 'Broken' ? 'text-red-500' : p.status === 'Idle' ? 'text-yellow-600' : 'text-emerald-600'}>{p.status}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
