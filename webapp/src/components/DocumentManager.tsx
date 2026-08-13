import React, { useState, useEffect, useRef } from 'react';
import { collection, query, serverTimestamp, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion } from 'motion/react';
import { Box, Folder, FileBox, File, Image, UploadCloud, RefreshCw, ShieldAlert, Bot } from 'lucide-react';
import PDFAnnotator from './PDFAnnotator';
import IFCViewer from './IFCViewer';

interface DocumentManagerProps {
  user: any;
  userData?: any;
  projectTarget?: any;
  initialFileRef?: string;
  pinningContext?: { rfiId: string; drawingId: string } | null;
  onPinComplete?: () => void;
}

export default function DocumentManager({ user, userData, projectTarget, initialFileRef, pinningContext, onPinComplete }: DocumentManagerProps) {
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectTarget?.id) {
       // Shared view or no project selected
       setLoading(false);
       return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'projects', projectTarget.id, 'documents'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFiles(docs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `projects/${projectTarget.id}/documents`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectTarget?.id]);

  useEffect(() => {
    if (initialFileRef && files.length > 0 && !activeFile) {
       const file = files.find(f => f.id === initialFileRef);
       if (file) setActiveFile(file);
    }
  }, [initialFileRef, files, activeFile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectTarget?.id) return;

    // Use FileReader for Base64 since Storage isn't configured in this environment
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit for Base64 strings
    if (file.size > MAX_SIZE) {
      setError("File exceeds 10MB protocol limit for base64 storage. Please fragment or optimize the asset.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        // Store reference in Firestore
        await addDoc(collection(db, 'projects', projectTarget.id, 'documents'), {
          name: file.name,
          mimeType: file.type,
          data: base64data, // Consistent with PDFAnnotator's expectation of fileUrl
          size: file.size,
          category: file.type.includes('pdf') ? 'Drawing' : 'Other',
          version: '1',
          uploadedBy: user.uid,
          createdAt: serverTimestamp()
        });
        
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(`Storage protocol failure: ${err.message || 'Unknown network error'}`);
      setUploading(false);
    }
  };

  if (activeFile) {
    const isIFC = activeFile.name.toLowerCase().endsWith('.ifc');
    if (isIFC) {
      return (
        <IFCViewer 
          url={activeFile.data || activeFile.localMock} 
          onClose={() => {
            setActiveFile(null);
            if (onPinComplete) onPinComplete();
          }} 
        />
      );
    }

    return (
      <PDFAnnotator 
        fileUrl={activeFile.data || activeFile.localMock} 
        fileName={activeFile.name} 
        documentId={activeFile.id}
        revision={activeFile.version}
        projectTarget={projectTarget}
        pinningContext={pinningContext}
        onPinComplete={onPinComplete}
        onBack={() => {
          setActiveFile(null);
          if (onPinComplete) onPinComplete();
        }} 
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload}
        accept=".pdf,image/*,.ifc"
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-1 bg-olive-primary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Integrated Storage Node</span>
          </div>
          <h1 className="text-4xl font-black text-architect-coal tracking-tight">
            {projectTarget ? 'Documents' : 'Drawings & Files'}
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button 
              disabled={uploading || !projectTarget}
              onClick={() => alert('Simulating Google Drive synchronization module...')}
              className="px-4 py-2 bg-white text-zinc-600 border border-zinc-200 rounded-xl font-bold text-xs shadow-sm hover:border-olive-primary transition-all flex items-center gap-2 disabled:opacity-50"
            >
              Google Drive
            </button>
            <button 
              disabled={uploading || !projectTarget}
              onClick={() => alert('Simulating Dropbox folder synchronization...')}
              className="px-4 py-2 bg-white text-zinc-600 border border-zinc-200 rounded-xl font-bold text-xs shadow-sm hover:border-blue-500 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              Dropbox
            </button>
            <button 
              disabled={uploading || !projectTarget}
              onClick={() => alert('Simulating OneDrive repository connection...')}
              className="px-4 py-2 bg-white text-zinc-600 border border-zinc-200 rounded-xl font-bold text-xs shadow-sm hover:border-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              OneDrive
            </button>
          </div>
          <button 
            disabled={uploading || !projectTarget}
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-architect-coal text-white rounded-xl font-bold text-sm shadow-xl shadow-architect-coal/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
            {uploading ? 'Negotiating Link...' : 'Link Resource'}
          </button>
        </div>
      </div>

      {!projectTarget && (
        <div className="bg-zinc-50 border border-blue-200 rounded-2xl p-6 flex items-start gap-4">
          <Bot className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
          <p className="text-sm text-blue-800 font-medium tracking-tight">
            Select a project node from the portfolio to access its specific document repository. The system maintains isolated storage clusters for each project.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
           <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-1" />
           <div>
              <h3 className="font-bold text-red-800">Storage Protocol Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button onClick={() => setError(null)} className="text-[10px] font-black uppercase text-red-400 mt-2 hover:text-red-600">Dismiss Error</button>
           </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-8 relative z-10">
           <Folder className="w-6 h-6 text-olive-primary fill-olive-primary/20" />
           <h2 className="text-xl font-black text-architect-coal uppercase tracking-tight">Repository Records</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 relative z-10">
             <div className="w-10 h-10 border-4 border-zinc-200 border-t-architect-coal rounded-full animate-spin mb-6" />
             <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em] animate-pulse">Syncing Structural Data...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-zinc-100 rounded-3xl bg-zinc-50/30 group hover:bg-zinc-50/50 transition-colors">
              <FileBox className="w-16 h-16 text-zinc-100 mb-6 group-hover:scale-110 transition-transform" strokeWidth={1} />
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Repository Vacant</h3>
              <p className="text-[9px] text-zinc-300 font-bold uppercase tracking-tight mt-2">No documents linked to this project node yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
            {files.map((f, i) => {
              const isPdf = f.mimeType?.includes('pdf') || f.name.toLowerCase().endsWith('.pdf');
              const isImage = f.mimeType?.includes('image');
              const isIFC = f.name.toLowerCase().endsWith('.ifc');
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={f.id}
                  onClick={() => setActiveFile(f)}
                  className="bg-white border border-zinc-100 rounded-2xl p-5 cursor-pointer hover:border-architect-coal hover:shadow-xl hover:shadow-architect-coal/5 transition-all group relative"
                >
                  <div className="flex items-start justify-between mb-6">
                     <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-architect-coal group-hover:bg-architect-coal group-hover:text-white transition-all duration-300">
                       {isIFC ? <Box className="w-6 h-6" /> : isPdf ? <FileBox className="w-6 h-6" /> : isImage ? <Image className="w-6 h-6" /> : <File className="w-6 h-6" />}
                     </div>
                     <span className="bg-zinc-100 text-zinc-600 text-[10px] font-black px-2 py-0.5 rounded">
                       REV {f.version || '01'}
                     </span>
                  </div>
                  
                  <h3 className="font-black text-zinc-900 text-xs mb-1 truncate uppercase tracking-tight group-hover:text-architect-coal transition-colors">{f.name}</h3>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                    {isIFC ? 'BIM / 3D Model' : isPdf ? 'Structural PDF' : isImage ? 'Visual Media' : 'Contractual Doc'}
                  </p>

                  <div className="mt-6 pt-5 border-t border-zinc-50 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                           <Bot className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Synced</span>
                     </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-architect-coal p-10 border-l-4 border-olive-primary flex items-start gap-8 mt-12">
         <div className="w-12 h-12 bg-white/5 flex items-center justify-center shrink-0">
            <Bot className="text-olive-primary w-6 h-6" />
         </div>
         <div>
            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.4em] mb-3">System Persistence Note</h4>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest leading-relaxed max-w-3xl">
              File assets are now persisted securely via Base64 string encoding within the project's dedicated cloud database, supporting files up to 10MB. This ensures document integrity and professional-grade performance within the OLIVE framework without relying on external cloud buckets.
            </p>
         </div>
      </div>
    </div>
  );
}

