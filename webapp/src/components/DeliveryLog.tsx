import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  MapPin, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  History,
  ClipboardCheck,
  Search
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

interface MaterialDelivery {
  id: string;
  description: string;
  quantity: string;
  supplier: string;
  docketNumber: string;
  status: 'Accepted' | 'Rejected' | 'Partial';
  timestamp: any;
}

export default function DeliveryLog({ projectId }: { projectId: string }) {
  const [deliveries, setDeliveries] = useState<MaterialDelivery[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    description: '',
    quantity: '',
    supplier: '',
    docketNumber: '',
    status: 'Accepted' as const
  });

  useEffect(() => {
    const q = query(
      collection(db, `projects/${projectId}/material_deliveries`), 
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    return onSnapshot(q, (snapshot) => {
      setDeliveries(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as MaterialDelivery)));
    });
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `projects/${projectId}/material_deliveries`), {
        ...newDelivery,
        timestamp: serverTimestamp()
      });
      setIsAdding(false);
      setNewDelivery({
        description: '',
        quantity: '',
        supplier: '',
        docketNumber: '',
        status: 'Accepted'
      });
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
            <Truck className="w-4 h-4 text-olive-primary" />
            Supply Chain Manifest
          </h3>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Material Arrivials & Quality Verification</p>
        </div>
        
        <button 
           onClick={() => setIsAdding(true)}
           className="px-6 py-2 bg-architect-coal text-white text-[10px] font-black uppercase tracking-widest hover:bg-olive-primary transition-all flex items-center gap-2"
        >
           <Plus className="w-3 h-3" />
           Log Delivery
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-8 bg-zinc-50 border border-zinc-100 overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Supply Description</label>
                     <input 
                       required
                       className="w-full bg-white border border-zinc-200 p-3 text-xs font-bold"
                       value={newDelivery.description}
                       onChange={e => setNewDelivery({...newDelivery, description: e.target.value})}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Supplier Name</label>
                     <input 
                       required
                       className="w-full bg-white border border-zinc-200 p-3 text-xs font-bold"
                       value={newDelivery.supplier}
                       onChange={e => setNewDelivery({...newDelivery, supplier: e.target.value})}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Quantity/Volume</label>
                     <input 
                       required
                       className="w-full bg-white border border-zinc-200 p-3 text-xs font-bold"
                       value={newDelivery.quantity}
                       onChange={e => setNewDelivery({...newDelivery, quantity: e.target.value})}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Verification Status</label>
                     <select 
                       className="w-full bg-white border border-zinc-200 p-3 text-xs font-bold"
                       value={newDelivery.status}
                       onChange={e => setNewDelivery({...newDelivery, status: e.target.value as any})}
                     >
                        <option value="Accepted">ACCEPTED & VERIFIED</option>
                        <option value="Partial">PARTIAL DELIVERY</option>
                        <option value="Rejected">REJECTED / DAMAGED</option>
                     </select>
                  </div>
               </div>

               <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-zinc-200">
                  <button type="button" onClick={() => setIsAdding(false)} className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Abort</button>
                  <button 
                     type="submit" 
                     disabled={isSubmitting}
                     className="px-8 py-3 bg-architect-coal text-white text-[10px] font-black uppercase tracking-widest hover:bg-olive-primary transition-all flex items-center gap-2"
                  >
                     {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                     Commit to Ledger
                  </button>
               </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
         {deliveries.map(d => (
           <div key={d.id} className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 group hover:border-olive-primary transition-all">
              <div className="flex items-center gap-4">
                 <div className={`p-2 bg-white rounded-lg shadow-sm border ${
                   d.status === 'Accepted' ? 'border-emerald-100 text-olive-primary' : 
                   d.status === 'Rejected' ? 'border-red-100 text-red-500' : 'border-yellow-100 text-yellow-500'
                 }`}>
                    <Package className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest">{d.description}</p>
                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-tight">{d.supplier} • {d.quantity}</p>
                 </div>
              </div>
              <div className="text-right flex items-center gap-8">
                 <div>
                    <p className="text-[10px] font-black text-architect-coal uppercase">{d.status}</p>
                    <p className="text-[7px] text-zinc-300 font-black uppercase">STATUS</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-architect-coal uppercase">{d.timestamp.toLocaleDateString()}</p>
                    <p className="text-[7px] text-zinc-300 font-black uppercase">ARRIVAL</p>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
