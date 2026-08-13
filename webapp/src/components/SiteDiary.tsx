import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, where, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cleanSiteNote, analyzeSitePhoto } from '../services/aiService';
import { 
  Building2,
  Mic, 
  MapPin, 
  Clock, 
  Send, 
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle2,
  Camera,
  Video,
  CloudSun,
  FileText,
  AlertCircle,
  ChevronRight,
  Eye,
  Check,
  X,
  FileSearch,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

interface DiaryEntry {
  id: string;
  note: string;
  status: 'Draft' | 'Pending_Approval' | 'Published';
  media?: any[];
  location?: any;
  weather?: any;
  userName?: string;
  userId?: string;
  createdAt?: any;
  submittedAt?: any;
  publishedAt?: any;
  approvedBy?: string;
  approvedByName?: string;
  relatedRfiId?: string | null;
  relatedRfiNumber?: string | null;
}

export default function SiteDiary({ user, userData, projectTarget }: { user: any, userData?: any, projectTarget?: any }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [rfis, setRfis] = useState<any[]>([]);
  const [selectedRfiId, setSelectedRfiId] = useState<string>('');
  const [note, setNote] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New Enhanced State
  const [media, setMedia] = useState<{ type: 'image' | 'video', url: string, name: string }[]>([]);
  const [location, setLocation] = useState<{ lat: number, lng: number, address?: string } | null>(null);
  const [weather, setWeather] = useState<{ temp: number, condition: string } | null>(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [activeEntry, setActiveEntry] = useState<DiaryEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = userData?.role === 'Super_Admin';

  useEffect(() => {
    if (projectTarget) {
      setSelectedProject(projectTarget.id);
      return;
    }
    const q = query(collection(db, 'projects'), where('status', 'in', ['Pre-construction', 'Construction']));
    getDocs(q).then((snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (userData?.role !== 'Super_Admin') {
        const allowed = userData?.allowedProjects || [];
        data = data.filter(p => allowed.includes(p.id));
      }
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0].id);
    });
  }, [projectTarget, userData]);

  useEffect(() => {
    if (!selectedProject) return;
    
    // Fetch related RFIs for the specific project
    const rfiQuery = query(collection(db, `projects/${selectedProject}/rfis`), orderBy('createdAt', 'desc'), limit(100));
    getDocs(rfiQuery).then((snapshot) => {
      const allRfis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Optionally filter by status e.g. Open/Published
      setRfis(allRfis);
    });
    
    // Check for today's draft or initialize one (Auto Rollover logic)
    const today = new Date().toISOString().split('T')[0];
    
    const q = query(
      collection(db, `projects/${selectedProject}/site_diaries`), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaryEntry));
      setEntries(allEntries);
      
      // Auto Rollover / Find current draft
      const currentDraft = allEntries.find(e => e.status === 'Draft' || e.status === 'Pending_Approval');
      if (currentDraft) {
        setActiveEntry(currentDraft);
        setNote(currentDraft.note || '');
        setMedia(currentDraft.media || []);
        setLocation(currentDraft.location || null);
        setWeather(currentDraft.weather || null);
        setSelectedRfiId(currentDraft.relatedRfiId || '');
      } else {
        setActiveEntry(null);
        setNote('');
        setMedia([]);
        setLocation(null);
        setWeather(null);
        setSelectedRfiId('');
        // Automatically fetch environment data for new entry
        fetchEnvironmentData();
      }
    });
    return unsubscribe;
  }, [selectedProject]);

  const fetchEnvironmentData = async () => {
    setFetchingData(true);
    try {
      // 1. Get Location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lng: longitude });

          // 2. Get Weather (Free Open-Meteo API)
          try {
            const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            const wData = await wRes.json();
            if (wData.current_weather) {
              setWeather({
                temp: wData.current_weather.temperature,
                condition: getWeatherCondition(wData.current_weather.weathercode)
              });
            }
          } catch (e) { console.error("Weather fetch failed", e); }
        });
      }
    } catch (err) { console.error("Environment fetch failed", err); }
    setFetchingData(false);
  };

  const getWeatherCondition = (code: number) => {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Cloudy';
    if (code <= 67) return 'Rainy';
    if (code <= 77) return 'Snow';
    if (code <= 82) return 'Showers';
    if (code <= 99) return 'Thunderstorm';
    return 'Clear';
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setMedia(prev => [...prev, {
          type,
          url: event.target?.result as string,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCleanNote = async () => {
    if (!note.trim()) return;
    setIsCleaning(true);
    const clean = await cleanSiteNote(note);
    setNote(clean);
    setIsCleaning(false);
  };

  const syncMediaToProjectPhotos = async (diaryMedia: any[]) => {
    if (!selectedProject || !diaryMedia.length) return;
    
    try {
      const photosCollection = collection(db, `projects/${selectedProject}/photos`);
      
      for (const item of diaryMedia) {
        let tags = ['Site Diary'];
        
        if (item.type === 'image') {
          try {
            const base64 = item.url.split(',')[1];
            if (base64) {
              const aiTags = await analyzeSitePhoto(base64);
              tags = [...tags, ...aiTags];
            }
          } catch (e) { console.error("AI Analysis failed for diary image", e); }
        } else if (item.type === 'video') {
          tags = [...tags, 'Video Capture'];
        }

        await addDoc(photosCollection, {
          url: item.url,
          type: item.type,
          tags,
          uploadedBy: user.uid,
          uploadedByName: userData?.fullName || user.email,
          createdAt: serverTimestamp(),
          source: 'Site Diary'
        });
      }
    } catch (err) {
      console.error("Imagery sync failed", err);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedProject || !note.trim()) return;
    setIsSubmitting(true);
    try {
      // Automatic AI Cleanup on save/submit
      const cleanedNote = await cleanSiteNote(note);
      setNote(cleanedNote);

      const selectedRfi = rfis.find(r => r.id === selectedRfiId);
      const data = {
        note: cleanedNote,
        media,
        location,
        weather,
        status: 'Draft' as const,
        updatedAt: serverTimestamp(),
        relatedRfiId: selectedRfiId || null,
        relatedRfiNumber: selectedRfi?.rfiNumber || null,
      };

      if (activeEntry) {
        await updateDoc(doc(db, `projects/${selectedProject}/site_diaries`, activeEntry.id), data);
      } else {
        await addDoc(collection(db, `projects/${selectedProject}/site_diaries`), {
          ...data,
          userId: user.uid,
          userName: user.displayName || user.email,
          createdAt: serverTimestamp(),
        });
      }
      // Only sync on final submission to avoid spamming the gallery with drafts
    } catch (err) { 
      handleFirestoreError(err, OperationType.WRITE, `projects/${selectedProject}/site_diaries`);
    }
    setIsSubmitting(false);
  };

  const handleSubmitForApproval = async () => {
    if (!selectedProject || !note.trim()) return;
    setIsSubmitting(true);
    try {
      // Final AI Refinement before submission
      const cleanedNote = await cleanSiteNote(note);
      setNote(cleanedNote);

      const selectedRfi = rfis.find(r => r.id === selectedRfiId);
      const data = {
        note: cleanedNote,
        media,
        location,
        weather,
        status: 'Pending_Approval' as const,
        submittedAt: serverTimestamp(),
        relatedRfiId: selectedRfiId || null,
        relatedRfiNumber: selectedRfi?.rfiNumber || null,
      };

      if (activeEntry) {
        await updateDoc(doc(db, `projects/${selectedProject}/site_diaries`, activeEntry.id), data);
      } else {
        await addDoc(collection(db, `projects/${selectedProject}/site_diaries`), {
          ...data,
          userId: user.uid,
          userName: user.displayName || user.email,
          createdAt: serverTimestamp(),
        });
      }
      
      // Sync media to project photos upon submission
      if (media.length > 0) {
        await syncMediaToProjectPhotos(media);
      }
      
    } catch (err) { 
      handleFirestoreError(err, OperationType.WRITE, `projects/${selectedProject}/site_diaries`);
    }
    setIsSubmitting(false);
  };

  const handleApprove = async (entry: any) => {
    if (!isSuperAdmin) return;
    try {
      const docRef = doc(db, `projects/${selectedProject}/site_diaries`, entry.id);
      await updateDoc(docRef, {
        status: 'Published',
        approvedBy: user.uid,
        approvedByName: user.displayName || user.email,
        publishedAt: serverTimestamp()
      });
      
      // Post-Approval: Generate PDF and Simulate Drive Upload
      generateAndUploadPDF(entry);
    } catch (err) { console.error("Approval failed", err); }
  };

  const generateAndUploadPDF = (entry: any) => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("Unicon Construction Site Diary", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Project ID: ${selectedProject}`, 20, 35);
    doc.text(`Status: Published`, 20, 42);
    doc.text(`Recorded By: ${entry.userName}`, 20, 49);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 56);
    
    doc.setFontSize(10);
    doc.text(`Location: ${entry.location?.lat}, ${entry.location?.lng}`, 20, 68);
    doc.text(`Weather: ${entry.weather?.temp}°C - ${entry.weather?.condition}`, 20, 75);
    
    doc.line(20, 80, 190, 80);
    
    doc.setFontSize(12);
    doc.text("Observation Summary:", 20, 90);
    
    const splitText = doc.splitTextToSize(entry.note, 170);
    doc.text(splitText, 20, 100);
    
    // In a real environment, we would convert to blob and upload to Drive API
    // const pdfBlob = doc.output('blob');
    console.log("PDF Created for entry:", entry.id);
    console.log("Uploading to Google Drive Folder for Project:", selectedProject);
    
    // Simulate folder creation and upload alert
    // alert(`Diary for ${new Date().toLocaleDateString()} has been archived to Project's Google Drive Folder.`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={(e) => handleMediaUpload(e, 'image')}
        multiple
      />
      <input 
        type="file" 
        accept="video/*" 
        capture="environment" 
        className="hidden" 
        ref={videoInputRef} 
        onChange={(e) => handleMediaUpload(e, 'video')}
      />

      {!projectTarget && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-olive-primary" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300">Clause 4.22 Daily Record</span>
            </div>
            <h1 className="text-4xl font-light text-olive-primary tracking-tight uppercase">Site Diary</h1>
            <p className="text-zinc-500 mt-3 text-[10px] font-medium tracking-[0.2em] uppercase opacity-60">Record of physical progress and site circumstances.</p>
          </div>
          <div className="w-full md:w-96 border-l border-zinc-100 pl-10">
            <label className="text-[8px] font-black text-zinc-300 uppercase tracking-[0.3em] mb-3 block">Project Selection</label>
            <div className="relative">
               <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-primary" strokeWidth={1} />
               <select 
                className="w-full pl-14 pr-6 py-5 bg-white border border-zinc-100 rounded-none outline-none focus:border-olive-primary text-[10px] font-black tracking-widest uppercase appearance-none transition-all"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="">Select Project...</option>
                {projects.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Entry Form */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm relative overflow-hidden">
            {/* Status Badge */}
            <div className="absolute top-6 right-8">
               <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                 activeEntry?.status === 'Pending_Approval' ? 'bg-amber-100 text-amber-700' : 
                 activeEntry?.status === 'Published' ? 'bg-emerald-100 text-emerald-700' : 
                 'bg-zinc-100 text-zinc-500'
               }`}>
                 {activeEntry?.status || 'Draft'}
               </span>
            </div>

            <div className="flex items-center gap-3 mb-6">
               <h3 className="text-sm font-black text-architect-coal uppercase tracking-widest">Daily Record of Operations</h3>
               {isCleaning && <Loader2 className="w-4 h-4 animate-spin text-olive-primary" />}
            </div>

            {/* Environment Bar & RFI Reference */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                 <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                   <MapPin className={`w-3.5 h-3.5 ${location ? 'text-olive-primary' : 'text-zinc-300'}`} />
                   {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Wait for Loc...'}
                 </div>
                 <div className="w-px h-4 bg-zinc-200" />
                 <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                   <CloudSun className={`w-3.5 h-3.5 ${weather ? 'text-amber-500' : 'text-zinc-300'}`} />
                   {weather ? `${weather.temp}°C ${weather.condition}` : 'Fetching WX...'}
                 </div>
                 <div className="ml-auto">
                   <button onClick={fetchEnvironmentData} className="text-architect-coal hover:text-olive-primary transition-colors">
                     <RefreshCw className={`w-3 h-3 ${fetchingData ? 'animate-spin' : ''}`} />
                   </button>
                 </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <FileSearch className="w-4 h-4 text-zinc-400 shrink-0" />
                <select 
                  className="w-full bg-transparent outline-none text-xs font-bold text-zinc-600 appearance-none disabled:opacity-75"
                  value={selectedRfiId}
                  onChange={(e) => setSelectedRfiId(e.target.value)}
                  disabled={activeEntry?.status === 'Published' || activeEntry?.status === 'Pending_Approval'}
                >
                  <option value="">Reference an active RFI (Optional)...</option>
                  {rfis.map(rfi => (
                    <option key={rfi.id} value={rfi.id}>{rfi.rfiNumber || 'RFI'}: {rfi.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea 
              disabled={activeEntry?.status === 'Published'}
              placeholder="Record daily progress, delays, instructions, and site conditions..."
              className="w-full h-64 p-6 bg-zinc-50 border border-zinc-100 rounded-3xl outline-none focus:bg-white focus:border-architect-coal transition-all resize-none text-sm font-medium leading-relaxed disabled:opacity-75"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {/* Media Strip */}
            {media.length > 0 && (
              <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {media.map((m, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-zinc-200 shrink-0 group">
                    {m.type === 'image' ? (
                      <img src={m.url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <button 
                      onClick={() => setMedia(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-8">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={activeEntry?.status === 'Published'}
                className="p-3 bg-zinc-50 text-zinc-500 rounded-xl hover:bg-zinc-100 transition-all border border-zinc-100 disabled:opacity-50"
                title="Add Photos"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button 
                onClick={() => videoInputRef.current?.click()}
                disabled={activeEntry?.status === 'Published'}
                className="p-3 bg-zinc-50 text-zinc-500 rounded-xl hover:bg-zinc-100 transition-all border border-zinc-100 disabled:opacity-50"
                title="Add Video"
              >
                <Video className="w-5 h-5" />
              </button>
              
              <div className="flex-1" />

              <button 
                onClick={handleCleanNote}
                disabled={isCleaning || !note || activeEntry?.status === 'Published'}
                className="px-6 py-4 bg-zinc-100 text-architect-coal font-black text-[10px] uppercase tracking-widest rounded-2xl shadow hover:shadow-lg transition-all flex items-center justify-center gap-2 border border-zinc-50 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-olive-primary" /> Format Text
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
               <button 
                onClick={handleSaveDraft}
                disabled={isSubmitting || !selectedProject || !note || activeEntry?.status === 'Published'}
                className="py-4 bg-zinc-800 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Save Draft
              </button>
              <button 
                onClick={handleSubmitForApproval}
                disabled={isSubmitting || !selectedProject || !note || activeEntry?.status === 'Published' || activeEntry?.status === 'Pending_Approval'}
                className="py-4 bg-architect-coal text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-architect-coal/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Submit for Approval
              </button>
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              Records are certified once verified by the Agent/Engineer. Use "Format Text" to ensure terminology aligns with Contractual requirements.
            </p>
          </div>
        </div>

        {/* Feed / Historical Stream */}
        <div className="space-y-8 h-[800px] overflow-y-auto pr-4 custom-scrollbar">
          {!selectedProject && (
             <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <MapPin className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-xs">Select a project to view stream</p>
             </div>
          )}
          
          <AnimatePresence mode="popLayout">
            {entries.filter(e => e.status !== 'Draft' || e.id === activeEntry?.id).map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white p-8 rounded-3xl border shadow-sm relative group transition-all ${
                  entry.status === 'Published' ? 'border-emerald-100' : 
                  entry.status === 'Pending_Approval' ? 'border-amber-100' : 'border-zinc-100'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs transition-colors ${
                       entry.status === 'Published' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-architect-coal'
                     }`}>
                       {entry.userName?.charAt(0)}
                     </div>
                     <div>
                       <div className="flex items-center gap-2">
                         <p className="text-sm font-black text-architect-coal uppercase tracking-tight">{entry.userName}</p>
                         <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                           entry.status === 'Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                         }`}>
                           {entry.status}
                         </span>
                       </div>
                       <p className="text-[10px] text-zinc-400 font-bold">{entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleString() : 'Just now'}</p>
                     </div>
                  </div>
                  
                  {isSuperAdmin && entry.status === 'Pending_Approval' && (
                    <div className="flex gap-2">
                       <button 
                        onClick={() => handleApprove(entry)}
                        className="w-8 h-8 rounded-lg bg-olive-primary text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg shadow-olive-primary/20"
                        title="Approve & Publish"
                      >
                         <Check className="w-4 h-4" />
                       </button>
                    </div>
                  )}
                  {entry.status === 'Published' && (
                    <button className="text-zinc-300 hover:text-architect-coal transition-colors">
                       <FileText className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                   <div className="flex flex-wrap gap-4">
                      {entry.weather && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 rounded-xl text-[10px] font-black text-zinc-500 uppercase tracking-widest border border-zinc-100">
                          <CloudSun className="w-3.5 h-3.5 text-amber-500" /> {entry.weather.temp}°C {entry.weather.condition}
                        </div>
                      )}
                      {entry.location && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 rounded-xl text-[10px] font-black text-zinc-500 uppercase tracking-widest border border-zinc-100">
                          <MapPin className="w-3.5 h-3.5 text-olive-primary" /> {entry.location.lat.toFixed(2)}, {entry.location.lng.toFixed(2)}
                        </div>
                      )}
                      {entry.relatedRfiNumber && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-olive-primary/10 rounded-xl text-[10px] font-black text-olive-primary uppercase tracking-widest border border-olive-primary/20">
                          <FileSearch className="w-3.5 h-3.5" /> Related: {entry.relatedRfiNumber}
                        </div>
                      )}
                   </div>
                   
                   <div className="pl-1 text-sm text-zinc-600 leading-relaxed font-medium">
                     {entry.note}
                   </div>
                </div>

                {/* Media Grid in Feed */}
                {entry.media && entry.media.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {entry.media.map((m: any, idx: number) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50">
                        {m.type === 'image' ? (
                          <img src={m.url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                             <Video className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {entry.status === 'Published' && (
                  <div className="mt-6 pt-6 border-t border-zinc-50 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-olive-primary rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Archived</span>
                     </div>
                     <span className="text-[10px] font-bold text-zinc-300">Verified by {entry.approvedByName || 'Principal Agent'}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Environment Refresh Helper Helper


