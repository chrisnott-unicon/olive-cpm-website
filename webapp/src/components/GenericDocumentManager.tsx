import React, { useState, useEffect } from 'react';
import { 
  File, 
  Upload, 
  Loader2, 
  Trash2, 
  ExternalLink,
  Plus,
  Search,
  FileCheck,
  Download
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  where,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectDocument {
  id: string;
  name: string;
  url: string;
  category: string;
  version: string;
  uploadedBy: string;
  createdAt: any;
}

interface GenericDocumentManagerProps {
  projectId: string;
  category: string;
  user: any;
}

export default function GenericDocumentManager({ projectId, category, user }: GenericDocumentManagerProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, `projects/${projectId}/documents`), 
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectDocument)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/documents`);
    });
  }, [projectId, category]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // In a real app we'd use Firebase Storage. Here we use base64 for demo purposes as storage isn't pre-configured
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        try {
          await addDoc(collection(db, `projects/${projectId}/documents`), {
            name: file.name,
            url: base64,
            category,
            version: '1.0',
            uploadedBy: user.uid,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `projects/${projectId}/documents`);
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("FileReader error", error);
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this contractual record permanently?')) {
      try {
        await deleteDoc(doc(db, `projects/${projectId}/documents`, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/documents/${id}`);
      }
    }
  };

  const filteredDocs = documents.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border border-zinc-100 p-8 space-y-8 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-architect-coal uppercase tracking-widest flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-olive-primary" />
            {category} Repository
          </h3>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Controlled {category} Distribution & Storage</p>
        </div>
        
        <label className="cursor-pointer">
           <input type="file" onChange={handleFileUpload} className="hidden" />
           <div className="px-6 py-2 border border-zinc-100 text-architect-coal text-[10px] font-black uppercase tracking-widest hover:border-olive-primary transition-all flex items-center gap-2">
             {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
             Upload Document
           </div>
        </label>
      </div>

      <div className="relative">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
         <input 
           placeholder="Search records..."
           className="w-full bg-zinc-50 border border-zinc-100 p-4 pl-12 text-xs font-bold uppercase tracking-widest"
           value={searchQuery}
           onChange={e => setSearchQuery(e.target.value)}
         />
      </div>

      <div className="space-y-2">
         {filteredDocs.map(doc => (
           <div key={doc.id} className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 group hover:border-olive-primary transition-all">
              <div className="flex items-center gap-4">
                 <div className="p-2 bg-white border border-zinc-100 text-zinc-400">
                    <File className="w-4 h-4" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest">{doc.name}</p>
                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-tight">
                       Rev {doc.version} • {new Date(doc.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}
                    </p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <a 
                   href={doc.url} 
                   download={doc.name}
                   className="p-2 text-zinc-300 hover:text-olive-primary transition-colors"
                 >
                    <Download className="w-3.5 h-3.5" />
                 </a>
                 <button 
                   onClick={() => handleDelete(doc.id)}
                   className="p-2 text-zinc-200 hover:text-red-500 transition-colors"
                 >
                    <Trash2 className="w-3.5 h-3.5" />
                 </button>
              </div>
           </div>
         ))}

         {filteredDocs.length === 0 && !isUploading && (
           <div className="py-20 text-center border-2 border-dashed border-zinc-100">
              <File className="w-8 h-8 text-zinc-100 mx-auto mb-4" />
              <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">No {category} Documents Registered</p>
           </div>
         )}
      </div>
    </div>
  );
}
