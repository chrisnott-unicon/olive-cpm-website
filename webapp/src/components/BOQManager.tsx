import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Plus, Trash2, ClipboardList, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BOQItem {
  id: string;
  description: string;
  unit?: string;
  quantity: number;
  rate: number;
  total?: number;
  progressPercent?: number;
}

export default function BOQManager({ projectId, currencySymbol }: { projectId: string; currencySymbol: string }) {
  const [items, setItems] = useState<BOQItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [formData, setFormData] = useState({ description: '', unit: '', quantity: '', rate: '' });

  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, `projects/${projectId}/boq`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/boq`);
    });
    return unsubscribe;
  }, [projectId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = Number(formData.quantity);
    const rate = Number(formData.rate);
    if (!formData.description || !Number.isFinite(quantity) || !Number.isFinite(rate)) return;

    try {
      await addDoc(collection(db, `projects/${projectId}/boq`), {
        description: formData.description,
        unit: formData.unit || undefined,
        quantity,
        rate,
        total: quantity * rate,
        progressPercent: 0,
        createdAt: serverTimestamp(),
      });
      setFormData({ description: '', unit: '', quantity: '', rate: '' });
      setShowAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/boq`);
    }
  };

  const handleImportCsv = async () => {
    // Deliberately simple: "description, unit, quantity, rate" per line —
    // no external CSV library, since BOQ exports from Excel/QS software
    // paste cleanly as plain comma-separated text.
    const rows = csvText.split('\n').map(r => r.trim()).filter(Boolean);
    for (const row of rows) {
      const parts = row.split(',').map(p => p.trim());
      if (parts.length < 3) continue;
      const [description, unit, quantityStr, rateStr] = parts.length === 4 ? parts : [parts[0], '', parts[1], parts[2]];
      const quantity = Number(quantityStr);
      const rate = Number(rateStr);
      if (!description || !Number.isFinite(quantity) || !Number.isFinite(rate)) continue;
      try {
        await addDoc(collection(db, `projects/${projectId}/boq`), {
          description,
          unit: unit || undefined,
          quantity,
          rate,
          total: quantity * rate,
          progressPercent: 0,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/boq`);
      }
    }
    setCsvText('');
    setShowImport(false);
  };

  const handleProgressChange = async (item: BOQItem, progressPercent: number) => {
    try {
      await updateDoc(doc(db, `projects/${projectId}/boq`, item.id), { progressPercent });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}/boq/${item.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this BOQ line item?')) return;
    try {
      await deleteDoc(doc(db, `projects/${projectId}/boq`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/boq/${id}`);
    }
  };

  const totalValue = items.reduce((acc, i) => acc + (i.total || i.quantity * i.rate), 0);

  return (
    <div className="bg-white border border-zinc-100 rounded-none">
      <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-architect-coal uppercase tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-olive-primary" strokeWidth={1.5} />
            Bill of Quantities
          </h3>
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">
            {items.length} line items · {currencySymbol} {totalValue.toLocaleString()} contract value
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="px-4 py-2 border border-zinc-100 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:border-olive-primary hover:text-olive-primary transition-all flex items-center gap-2">
            <Upload className="w-3 h-3" /> Import CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-architect-coal text-white text-[9px] font-black uppercase tracking-widest hover:bg-olive-primary transition-all flex items-center gap-2">
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-zinc-400">
          <p className="text-sm font-medium">No BOQ items yet. Add items or import a CSV to enable real valuations.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-50">
          {items.map(item => (
            <div key={item.id} className="p-6 flex items-center gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-architect-coal truncate">{item.description}</p>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                  {item.quantity.toLocaleString()} {item.unit || 'units'} @ {currencySymbol} {item.rate.toLocaleString()} = {currencySymbol} {(item.total || item.quantity * item.rate).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3 w-48">
                <input
                  type="range" min={0} max={100} value={item.progressPercent || 0}
                  onChange={(e) => handleProgressChange(item, Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-[10px] font-black text-olive-primary w-10 text-right">{item.progressPercent || 0}%</span>
              </div>
              <button onClick={() => handleDelete(item.id)} aria-label={`Remove ${item.description}`} className="p-2 text-zinc-300 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-architect-coal/40 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md p-8 relative z-10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-architect-coal">Add BOQ Item</h4>
                <button onClick={() => setShowAdd(false)} aria-label="Close"><X className="w-4 h-4 text-zinc-400" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-4">
                <input required placeholder="Description (e.g. Earthworks - bulk excavation)" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm outline-none focus:border-olive-primary" />
                <div className="grid grid-cols-3 gap-3">
                  <input placeholder="Unit (m³)" value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm outline-none focus:border-olive-primary" />
                  <input required type="number" step="any" placeholder="Quantity" value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    className="px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm outline-none focus:border-olive-primary" />
                  <input required type="number" step="any" placeholder="Rate" value={formData.rate}
                    onChange={e => setFormData({ ...formData, rate: e.target.value })}
                    className="px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm outline-none focus:border-olive-primary" />
                </div>
                <button type="submit" className="w-full py-4 bg-architect-coal text-white text-xs font-black uppercase tracking-widest hover:bg-olive-primary transition-all">
                  Add Item
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showImport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowImport(false)} className="absolute inset-0 bg-architect-coal/40 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-lg p-8 relative z-10 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-architect-coal">Import BOQ (CSV)</h4>
                <button onClick={() => setShowImport(false)} aria-label="Close"><X className="w-4 h-4 text-zinc-400" /></button>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium mb-4">
                One line per item: <code className="bg-zinc-50 px-1">description, unit, quantity, rate</code>. Paste directly from a spreadsheet export.
              </p>
              <textarea
                value={csvText} onChange={e => setCsvText(e.target.value)}
                rows={8}
                placeholder={'Earthworks - bulk excavation, m³, 1200, 185\nConcrete - 25MPa foundations, m³, 340, 2450'}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm outline-none focus:border-olive-primary font-mono"
              />
              <button onClick={handleImportCsv} disabled={!csvText.trim()} className="w-full mt-4 py-4 bg-architect-coal text-white text-xs font-black uppercase tracking-widest hover:bg-olive-primary transition-all disabled:opacity-50">
                Import Items
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
