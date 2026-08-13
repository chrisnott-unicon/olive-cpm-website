import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Search, 
  Tag, 
  Calendar, 
  Trash2, 
  Loader2, 
  X, 
  Maximize2,
  Filter,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { analyzeSitePhoto } from '../services/aiService';

interface ProjectPhoto {
  id: string;
  url: string;
  type?: 'image' | 'video';
  tags: string[];
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: any;
}

interface ProjectPhotosProps {
  projectTarget: any;
  user: any;
  userData: any;
}

export default function ProjectPhotos({ projectTarget, user, userData }: ProjectPhotosProps) {
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract all unique tags
  const allTags = Array.from(new Set(photos.flatMap(p => p.tags))).sort();

  useEffect(() => {
    if (!projectTarget?.id) return;

    const q = query(
      collection(db, `projects/${projectTarget.id}/photos`),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectPhoto));
      setPhotos(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectTarget.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('Synchronizing Visual Data...');
    
    try {
      // Convert to base64 for AI analysis
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        // 1. Get AI Tags
        setUploadStatus('Processing Metadata...');
        const tags = await analyzeSitePhoto(base64String);

        // 2. Upload to Firestore
        setUploadStatus('Finalizing Record Entry...');
        await addDoc(collection(db, `projects/${projectTarget.id}/photos`), {
          url: reader.result as string,
          tags,
          uploadedBy: user.uid,
          uploadedByName: userData?.fullName || user.email,
          createdAt: serverTimestamp()
        });
        
        setIsUploading(false);
        setUploadStatus('');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload failed:", error);
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const removePhoto = async (id: string) => {
    if (window.confirm("Delete this visual record?")) {
      try {
        await deleteDoc(doc(db, `projects/${projectTarget.id}/photos`, id));
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  const filteredPhotos = photos.filter(p => {
    const matchesSearch = p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         p.uploadedByName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !activeTag || p.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-olive-primary" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300">Visual Evidence Matrix</span>
          </div>
          <h1 className="text-4xl font-light text-olive-primary tracking-tight uppercase leading-none">Site Visual Archive</h1>
          <p className="text-zinc-500 mt-3 text-[10px] font-medium tracking-[0.2em] uppercase opacity-60">AI-tagged photographic documentation of project progression.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" strokeWidth={1} />
             <input 
                type="text"
                placeholder="Search Visual Tags..."
                className="w-full pl-12 pr-6 py-4 bg-white border border-zinc-100 rounded-none outline-none focus:border-olive-primary text-[10px] font-bold tracking-widest uppercase"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-8 py-4 bg-olive-primary text-olive-light rounded-none font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 hover:bg-olive-dark shrink-0"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" strokeWidth={1} />}
            {isUploading ? 'ARCHIVING...' : 'CAPTURE PROGRESS'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </div>

      {/* Tag Filter Bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest transition-all snap-start ${
              !activeTag ? 'bg-olive-primary text-white' : 'bg-white text-zinc-400 border border-zinc-100 hover:border-olive-primary'
            }`}
          >
            ALL ARCHIVES
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest transition-all snap-start whitespace-nowrap ${
                activeTag === tag ? 'bg-olive-primary text-white' : 'bg-white text-zinc-400 border border-zinc-100 hover:border-olive-primary'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Photo Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-olive-primary opacity-20" />
        </div>
      ) : filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
          {filteredPhotos.map((photo, i) => (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              key={photo.id}
              className="group relative aspect-square bg-zinc-100 overflow-hidden"
            >
              {photo.type === 'video' ? (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all duration-700">
                  <Video className="w-12 h-12 text-white/20 group-hover:text-white/40 transition-all" strokeWidth={1} />
                </div>
              ) : (
                <img 
                  src={photo.url} 
                  alt="Site progress" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
                />
              )}
              <div className="absolute inset-0 bg-architect-coal/0 group-hover:bg-architect-coal/60 transition-all duration-300 flex flex-col justify-end p-6">
                <div className="translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex flex-wrap gap-1 mb-4">
                    {photo.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/20 text-[7px] font-black text-white uppercase tracking-widest">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-white uppercase tracking-tight truncate max-w-[120px]">
                        {photo.uploadedByName}
                      </p>
                      <p className="text-[8px] text-white/60 uppercase tracking-widest">
                        {photo.createdAt?.toDate ? photo.createdAt.toDate().toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => setSelectedPhoto(photo)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white transition-all"
                       >
                         <Maximize2 className="w-3 h-3" strokeWidth={1.5} />
                       </button>
                       <button 
                        onClick={() => removePhoto(photo.id)}
                        className="p-2 bg-white/10 hover:bg-red-500/40 text-white transition-all"
                       >
                         <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 border border-dashed border-zinc-100 italic text-zinc-300">
           <ImageIcon className="w-12 h-12 mb-4 opacity-10" strokeWidth={1} />
           <p className="text-[10px] font-black uppercase tracking-widest">No visual records found in current matrix.</p>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {isUploading && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-architect-coal/20 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-12 shadow-2xl border border-zinc-100 flex flex-col items-center text-center max-w-sm rounded-[2rem]"
            >
              <div className="relative mb-8">
                <Loader2 className="w-12 h-12 text-olive-primary animate-spin" strokeWidth={1} />
                <div className="absolute inset-0 bg-olive-primary/10 rounded-full blur-xl animate-pulse" />
              </div>
              <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em] mb-4">Site Engine Active</h3>
              <p className="text-sm font-bold text-architect-coal uppercase tracking-tighter mb-4">
                {uploadStatus}
              </p>
              <div className="w-full h-1 bg-zinc-50 rounded-full overflow-hidden">
                 <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    className="h-full bg-olive-primary"
                 />
              </div>
            </motion.div>
          </div>
        )}

        {selectedPhoto && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 lg:p-12">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedPhoto(null)}
               className="absolute inset-0 bg-architect-coal/95 backdrop-blur-2xl"
             />
             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-5xl aspect-video bg-black shadow-2xl overflow-hidden"
             >
                {selectedPhoto.type === 'video' ? (
                  <video src={selectedPhoto.url} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={selectedPhoto.url} className="w-full h-full object-contain" alt="Enlarged progress" />
                )}
                <button 
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-8 right-8 text-white/40 hover:text-white transition-all"
                >
                  <X className="w-8 h-8" strokeWidth={1} />
                </button>
                <div className="absolute bottom-0 inset-x-0 p-12 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
                   <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-6">
                           <div className="w-12 h-px bg-olive-primary" />
                           <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Site Metadata Analysis</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {selectedPhoto.tags.map(tag => (
                            <span key={tag} className="px-5 py-2 bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-olive-primary transition-all">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="md:text-right md:border-l md:border-white/10 md:pl-8">
                         <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">RECORDED BY</p>
                         <p className="text-sm font-bold text-white uppercase tracking-tight mb-3">{selectedPhoto.uploadedByName}</p>
                         <div className="flex items-center md:justify-end gap-2 text-zinc-500">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                               {selectedPhoto.createdAt?.toDate ? selectedPhoto.createdAt.toDate().toLocaleString() : 'Just now'}
                            </span>
                         </div>
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
