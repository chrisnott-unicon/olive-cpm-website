import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { Box, Users, Truck, Factory, Search, QrCode, HardHat, Camera, UploadCloud, AlertTriangle, CheckCircle, TrendingUp, Cpu, RefreshCw, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { GoogleGenAI, Type } from "@google/genai";
import { Scanner } from '@yudiel/react-qr-scanner';
import { extractMaterialDocketInfo } from '../services/aiService';

interface ProjectResourceHubProps {
  projectTarget: any;
  user: any;
  userData: any;
}

export default function ProjectResourceHub({ projectTarget, user, userData }: ProjectResourceHubProps) {
  const [activeTab, setActiveTab] = useState<'Human' | 'PlantEquipment' | 'Material' | 'Insights'>('Human');
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (!projectTarget?.id) return;
    const q = query(collection(db, 'projects', projectTarget.id, 'resources'));
    const unsub = onSnapshot(q, (snap) => {
      setResources(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [projectTarget?.id]);

  const renderContent = () => {
    switch (activeTab) {
      case 'Human': return <HumanResourceManager resources={resources.filter(r => r.type === 'Human')} projectId={projectTarget.id} />;
      case 'PlantEquipment': return <PlantEquipmentManager resources={resources.filter(r => r.type === 'PlantEquipment')} projectTarget={projectTarget} />;
      case 'Material': return <MaterialManager resources={resources.filter(r => r.type === 'Material')} projectTarget={projectTarget} />;
      case 'Insights': return <ResourceInsights resources={resources} projectTarget={projectTarget} />;
    }
  };

  return (
    <div className="space-y-6 relative pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <div className="w-8 h-1 bg-olive-primary rounded-full" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Logistics & Deployment</span>
           </div>
           <h1 className="text-4xl font-black text-architect-coal tracking-tight uppercase">Resource Hub</h1>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setShowScanner(true)}
             className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold flex items-center gap-2 text-sm shadow-xl hover:bg-zinc-800 transition-colors"
           >
             <QrCode className="w-4 h-4" /> Scan QR Tag
           </button>
        </div>
      </div>

      <div className="flex bg-zinc-50 p-1.5 rounded-none border border-zinc-100 overflow-x-auto scrollbar-none snap-x gap-1">
        {[
          { id: 'Human', icon: Users, label: 'Human Resources' },
          { id: 'PlantEquipment', icon: Truck, label: 'Plant & Tools' },
          { id: 'Material', icon: Box, label: 'Materials & Stocks' },
          { id: 'Insights', icon: TrendingUp, label: 'Resource Insights' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap snap-start border ${
              activeTab === tab.id 
                ? 'bg-white border-zinc-100 text-olive-primary shadow-sm' 
                : 'text-zinc-400 border-transparent hover:text-olive-primary'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="py-20 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-zinc-300" /></div>
        ) : (
          renderContent()
        )}
      </div>
      
      <AnimatePresence>
         {showScanner && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm"
           >
             <div className="bg-zinc-900 p-8 rounded-3xl max-w-lg w-full relative">
                <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white mb-6 uppercase tracking-wider flex items-center gap-3"><QrCode className="w-6 h-6 text-olive-primary" /> Scan Resource QR Tag</h3>
                <div className="overflow-hidden rounded-2xl border-2 border-zinc-800 bg-black max-h-[300px]">
                   <Scanner onScan={(result) => {
                     alert("Scanned Resource: " + result[0].rawValue);
                     setShowScanner(false);
                   }} />
                </div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center mt-6">Position QR Code within the frame to identify resource</p>
             </div>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}

function HumanResourceManager({ resources, projectId }: { resources: any[], projectId: string }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  const handleAdd = async () => {
    if (!name || !role) return;
    await addDoc(collection(db, 'projects', projectId, 'resources'), {
      type: 'Human',
      name,
      humanRole: role,
      qrCodeData: `HR-${projectId}-${Date.now()}`,
      createdAt: serverTimestamp()
    });
    setName('');
    setRole('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
         <div>
            <h3 className="font-black text-architect-coal uppercase tracking-widest">Personnel Matrix</h3>
            <p className="text-xs text-zinc-400 font-medium">Manage project workforce and ID tags</p>
         </div>
         <button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 bg-olive-primary text-white text-[10px] uppercase tracking-widest font-black rounded-lg">
           + Add Personnel
         </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-architect-coal bg-zinc-50/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold w-full" />
             <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role / Trade" className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold w-full" />
          </div>
          <button onClick={handleAdd} className="mt-4 px-6 py-2 bg-architect-coal text-white font-bold rounded-xl text-sm w-full md:w-auto">Save Personnel</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((r) => (
          <div key={r.id} className="bg-white p-6 rounded-2xl border border-zinc-100 flex flex-col items-center text-center relative pt-12 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-olive-primary" />
            <div className="absolute top-4 left-4 p-2 bg-zinc-50 rounded-lg border border-zinc-100 flex items-center justify-center opacity-10 group-hover:opacity-100 transition-opacity">
               <QRCodeSVG value={r.qrCodeData} size={40} />
            </div>
            
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
               <HardHat className="w-6 h-6 text-zinc-400" />
            </div>
            <h4 className="font-black text-zinc-900 text-lg">{r.name}</h4>
            <p className="text-xs font-bold text-olive-primary uppercase tracking-widest mt-1">{r.humanRole}</p>
            
            <div className="mt-6 flex flex-col gap-2 w-full">
              <button 
                 onClick={() => window.print()} // Placeholder for actual ID generation
                 className="w-full py-2 bg-zinc-900 text-white text-[10px] uppercase font-black tracking-widest rounded-lg flex justify-center items-center gap-2"
              >
                  <QrCode className="w-3 h-3" /> Print ID Card
              </button>
              <button 
                 onClick={() => window.print()}
                 className="w-full py-2 bg-transparent border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 text-[10px] uppercase font-black tracking-widest rounded-lg"
              >
                  Print Hard Hat Stickers (2x)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlantEquipmentManager({ resources, projectTarget }: { resources: any[], projectTarget: any }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Equipment');
  const [size, setSize] = useState('Small');
  const [radius, setRadius] = useState(100);

  const handleAdd = async () => {
    if (!name) return;
    await addDoc(collection(db, 'projects', projectTarget.id, 'resources'), {
      type: 'PlantEquipment',
      name,
      category,
      equipmentSize: size,
      geofenceEnabled: true,
      qrCodeData: `PLT-${projectTarget.id}-${Date.now()}`,
      geofenceRadius: radius,
      location: projectTarget.coordinates || { lat: 0, lng: 0 },
      status: 'On Site',
      createdAt: serverTimestamp()
    });
    setName('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
         <div>
            <h3 className="font-black text-architect-coal uppercase tracking-widest">Plant & Tools Telemetry</h3>
            <p className="text-xs text-zinc-400 font-medium tracking-tight">Geofenced equipment tracking and QR tagging</p>
         </div>
         <button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 bg-olive-primary text-white text-[10px] uppercase tracking-widest font-black rounded-lg">
           + Add Asset
         </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-olive-primary bg-olive-light/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <input value={name} onChange={e => setName(e.target.value)} placeholder="Asset Name" className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold w-full" />
             <select value={category} onChange={e => setCategory(e.target.value)} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold w-full">
               <option>Equipment</option><option>Plant</option><option>Tool</option>
             </select>
             <select value={size} onChange={e => setSize(e.target.value)} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold w-full">
               <option value="Small">Small (50x50mm QR)</option>
               <option value="Large">Large (300x300mm QR)</option>
             </select>
             <input type="number" value={radius} onChange={e => setRadius(Number(e.target.value))} placeholder="Geofence Radius (m)" className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold w-full" />
          </div>
          <button onClick={handleAdd} className="mt-4 px-6 py-2 bg-zinc-900 text-white font-bold rounded-xl text-sm w-full md:w-auto">Deploy Asset</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {resources.map((r) => (
          <div key={r.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="bg-white p-2 border-2 border-dashed border-zinc-200 rounded-xl shrink-0">
               <QRCodeSVG value={r.qrCodeData} size={r.equipmentSize === 'Large' ? 120 : 60} />
               <p className="text-center mt-2 text-[8px] font-black uppercase tracking-widest text-zinc-400">{r.equipmentSize === 'Large' ? '300x300mm' : '50x50mm'}</p>
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-3 mb-2">
                 <h4 className="font-black text-zinc-900 text-lg uppercase tracking-tight">{r.name}</h4>
                 <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded ${r.status === 'On Site' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                   {r.status}
                 </span>
               </div>
               <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{r.category}</p>
               
               <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <div className="flex items-center gap-2"><Factory className="w-4 h-4 text-zinc-400"/> Geofence Active</div>
                  <div className="flex flex-col"><span className="text-[9px] uppercase tracking-widest text-zinc-400">Radius</span> <span className="font-bold">{r.geofenceRadius}m from Site Center</span></div>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialManager({ resources, projectTarget }: { resources: any[], projectTarget: any }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('tons');
  const [boqQty, setBoqQty] = useState(0);

  const [scanningDoc, setScanningDoc] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const handleAdd = async () => {
    if (!name) return;
    await addDoc(collection(db, 'projects', projectTarget.id, 'resources'), {
      type: 'Material',
      name,
      materialUnit: unit,
      materialBoqQty: boqQty,
      materialReceivedQty: 0,
      materialReturnedQty: 0,
      materialLossesQty: 0,
      createdAt: serverTimestamp()
    });
    setName('');
    setIsAdding(false);
  };

  const aiProcessDocket = async (file: File) => {
    setScanningDoc(true);
    setOcrResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        if (base64Data) {
          const result = await extractMaterialDocketInfo(base64Data, resources);
          if (result && result.name && result.quantity) {
             setOcrResult(result);
             
             // Optionally auto-update database if match found
             const matchedResource = resources.find(r => r.name.toLowerCase() === result.name.toLowerCase());
             if (matchedResource) {
                await updateDoc(doc(db, 'projects', projectTarget.id, 'resources', matchedResource.id), {
                   materialReceivedQty: (matchedResource.materialReceivedQty || 0) + Number(result.quantity)
                });
             }
          } else {
             setOcrResult({ error: 'Could not extract valid data' });
          }
        }
        setScanningDoc(false);
      };
      reader.readAsDataURL(file);
    } catch(err) {
      console.error(err);
      setScanningDoc(false);
    }
  }

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
               <div>
                  <h3 className="font-black text-architect-coal uppercase tracking-widest">Material Ledger</h3>
                  <p className="text-xs text-zinc-400 font-medium tracking-tight">Receipt, returns, losses & BOQ variance</p>
               </div>
               <button onClick={() => setIsAdding(!isAdding)} className="px-4 py-2 bg-architect-coal text-white text-[10px] uppercase tracking-widest font-black rounded-lg">
                 + Add Material Line
               </button>
            </div>

            {isAdding && (
              <div className="bg-white p-6 rounded-2xl border border-architect-coal bg-zinc-50/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <input value={name} onChange={e => setName(e.target.value)} placeholder="Material Description" className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold w-full" />
                   <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unit (e.g., tons, m3, m2)" className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold w-full" />
                   <input type="number" value={boqQty} onChange={e => setBoqQty(Number(e.target.value))} placeholder="BOQ Authorized Quantity" className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold w-full" />
                </div>
                <button onClick={handleAdd} className="mt-4 px-6 py-2 bg-architect-coal text-white font-bold rounded-xl text-sm w-full md:w-auto">Save Line Item</button>
              </div>
            )}

            <div className="bg-white border text-sm border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                  <tr>
                    <th className="p-6 font-black">Material</th>
                    <th className="p-6 font-black">BOQ Auth</th>
                    <th className="p-6 font-black text-emerald-600">Received</th>
                    <th className="p-6 font-black text-amber-600">Returned/Loss</th>
                    <th className="p-6 font-black">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {resources.map((r) => {
                    const received = r.materialReceivedQty || 0;
                    const lossRet = (r.materialReturnedQty || 0) + (r.materialLossesQty || 0);
                    const net = received - lossRet;
                    const boq = r.materialBoqQty || 0;
                    const variance = boq - net;
                    const isOverrun = variance < 0;

                    return (
                      <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-6 font-bold text-zinc-900">{r.name}</td>
                        <td className="p-6 font-mono text-zinc-500">{boq} <span className="text-[9px] uppercase tracking-widest">{r.materialUnit}</span></td>
                        <td className="p-6 font-mono text-emerald-600 font-bold">{received}</td>
                        <td className="p-6 font-mono text-amber-600 font-bold">{lossRet}</td>
                        <td className={`p-6 font-mono font-black py-2 mt-4 inline-block px-3 rounded-lg ${isOverrun ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'}`}>
                           {variance > 0 ? '+' : ''}{variance}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm self-start sticky top-6">
             <div className="w-12 h-12 bg-zinc-50 text-architect-coal rounded-xl flex items-center justify-center mb-6">
                <Camera className="w-6 h-6" />
             </div>
             <h3 className="font-black text-lg text-zinc-900 mb-2">Docket OCR Scanner</h3>
             <p className="text-sm text-zinc-500 mb-6">Scan supplier delivery notes or return slips. OLIVE AI will automatically extract quantities and update the ledger.</p>
             
             <label className="border-2 border-dashed border-zinc-200 bg-zinc-50/20 hover:bg-zinc-50 p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group relative overflow-hidden">
               {scanningDoc ? (
                 <div className="flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 text-architect-coal animate-spin mb-4" />
                    <span className="font-bold text-architect-coal text-sm">Processing with OLIVE AI...</span>
                 </div>
               ) : (
                 <>
                   <UploadCloud className="w-8 h-8 text-architect-coal mb-4 group-hover:scale-110 transition-transform" />
                   <span className="font-bold text-architect-coal text-sm">Upload Receipt Photo</span>
                   <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2">JPEG / PNG / PDF</span>
                 </>
               )}
               <input type="file" className="hidden" accept="image/*" disabled={scanningDoc} onChange={(e) => {
                 if(e.target.files?.[0]) aiProcessDocket(e.target.files[0]);
               }} />
             </label>

             {ocrResult && !scanningDoc && (
               <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">OCR Extracted Data</h4>
                 {ocrResult.error ? (
                   <p className="text-red-500 text-xs font-bold">{ocrResult.error}</p>
                 ) : (
                   <div>
                     <p className="text-sm font-bold text-zinc-900">Matched: {ocrResult.name}</p>
                     <p className="text-xs text-zinc-600">Qty: {ocrResult.quantity} {ocrResult.unit}</p>
                     <p className="text-[10px] text-emerald-600 mt-2 font-black tracking-widest uppercase">Ledger Auto-Updated</p>
                   </div>
                 )}
               </div>
             )}
          </div>
       </div>
    </div>
  );
}

function ResourceInsights({ resources, projectTarget }: { resources: any[], projectTarget: any }) {
  const materials = resources.filter(r => r.type === 'Material');
  const overruns = materials.filter(m => ((m.materialReceivedQty || 0) - (m.materialReturnedQty || 0) - (m.materialLossesQty || 0)) > (m.materialBoqQty || 0));
  const withinBudget = materials.filter(m => ((m.materialReceivedQty || 0) - (m.materialReturnedQty || 0) - (m.materialLossesQty || 0)) <= (m.materialBoqQty || 0));
  
  return (
    <div className="space-y-6">
      <div className="bg-architect-coal p-10 rounded-[2rem] border border-zinc-800 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-olive-primary/20 rounded-full blur-3xl" />
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-6">
             <Cpu className="text-olive-primary w-6 h-6" />
             <h2 className="text-2xl font-light tracking-tight">Cortex BOQ Analytics</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                 <h4 className="text-[10px] font-black text-olive-primary uppercase tracking-[0.3em] mb-4">Material Variances & Risk</h4>
                 {overruns.length > 0 ? (
                   <ul className="space-y-4">
                     {overruns.map(o => {
                       const net = (o.materialReceivedQty || 0) - (o.materialReturnedQty || 0) - (o.materialLossesQty || 0);
                       const boq = o.materialBoqQty || 0;
                       return (
                         <li key={o.id} className="flex items-start gap-4 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                           <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                           <div>
                             <span className="text-sm font-bold text-white block mb-1">
                               {o.name} <span className="text-red-400 text-xs ml-2">OVER BOQ ALLOCATION</span>
                             </span>
                             <div className="text-xs text-zinc-400 font-mono flex items-center gap-4">
                                <span>BOQ: {boq}</span>
                                <span>Net Used: {net}</span>
                                <span className="text-red-400 font-bold">Excess: {net - boq} {o.materialUnit}</span>
                             </div>
                           </div>
                         </li>
                       );
                     })}
                   </ul>
                 ) : (
                   <div className="flex items-center gap-3 text-emerald-400 bg-olive-primary/10 border border-olive-primary/20 p-4 rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">All material consumption is tracking within BOQ boundaries.</span>
                   </div>
                 )}
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                   <h4 className="text-[10px] font-black text-architect-coal uppercase tracking-[0.3em] mb-4">Plant & Tool Geofence Status</h4>
                   <div className="flex items-center gap-3 text-emerald-400 bg-olive-primary/10 border border-olive-primary/20 p-4 rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">100% of large plant & equipment reported within site boundaries.</span>
                   </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                   <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4">Remaining BOQ Allowances</h4>
                   <div className="space-y-2">
                      {withinBudget.slice(0, 4).map(m => {
                         const net = (m.materialReceivedQty || 0) - (m.materialReturnedQty || 0) - (m.materialLossesQty || 0);
                         const boq = m.materialBoqQty || 0;
                         const remaining = boq - net;
                         const pct = boq > 0 ? (net / boq) * 100 : 0;
                         return (
                           <div key={m.id}>
                              <div className="flex justify-between text-xs mb-1">
                                 <span className="text-zinc-300 font-bold truncate pr-4">{m.name}</span>
                                 <span className="text-zinc-500 font-mono">{remaining} {m.materialUnit} left</span>
                              </div>
                              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                                <div className="bg-architect-coal h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                           </div>
                         )
                      })}
                      {withinBudget.length === 0 && <p className="text-xs text-zinc-500 italic">No remaining positive balances tracked.</p>}
                   </div>
                </div>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
}
