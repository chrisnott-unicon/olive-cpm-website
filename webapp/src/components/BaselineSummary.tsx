import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  BrainCircuit, 
  AlertCircle,
  FileCheck,
  TrendingDown
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDocs,
  limit 
} from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface BaselineProgram {
  id: string;
  name: string;
  content: string;
  milestones: any[];
  uploadedBy: string;
  createdAt: any;
}

interface BaselineSummaryProps {
  projectId: string;
  user: any;
}

export default function BaselineSummary({ projectId, user }: BaselineSummaryProps) {
  const [programs, setPrograms] = useState<BaselineProgram[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, `projects/${projectId}/baseline_programs`), 
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaselineProgram)));
    });
    return unsubscribe;
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);
        const pdf = await pdfjs.getDocument(typedArray).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(" ") + "\n";
        }

        // Use AI to extract key milestones
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        
        const extractionPrompt = `Analyze the following construction program text extracted from a PDF. 
        Extract a comprehensive list of key tasks/milestones. 
        For each item, identify:
        1. "task" (title)
        2. "baselineFinish" (finish date)
        3. "duration" (days/weeks if mentioned)
        4. "dependencies" (predecessor tasks if identifiable)
        5. "weight" (relative importance 1-10)

        PROGRAM TEXT:
        ${fullText.substring(0, 8000)}
        
        Return ONLY a JSON array of objects.`;

        const result = await ai.models.generateContent({
           model: "gemini-3-flash-preview",
           contents: extractionPrompt,
           config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                   type: Type.OBJECT,
                   properties: {
                      task: { type: Type.STRING },
                      baselineFinish: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                      weight: { type: Type.NUMBER }
                   },
                   required: ["task", "baselineFinish"]
                }
              }
           }
        });

        const milestones = JSON.parse(result.text || "[]");

        await addDoc(collection(db, `projects/${projectId}/baseline_programs`), {
          name: file.name,
          content: fullText.substring(0, 10000), // Cap content to avoid FS limits
          milestones,
          uploadedBy: user.uid,
          createdAt: serverTimestamp()
        });
        
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("PDF Processing error", error);
      setIsProcessing(false);
      alert("Failed to process baseline program. Ensure it is a valid text-based PDF.");
    }
  };

  const analyzeProgramAlignment = async (program: BaselineProgram) => {
    setIsProcessing(true);
    try {
      // Fetch latest weather logs
      const weatherSnap = await getDocs(query(collection(db, `projects/${projectId}/weather_logs`), orderBy('timestamp', 'desc'), limit(30)));
      const weatherSummary = weatherSnap.docs.map(d => `${d.data().timestamp.toDate().toLocaleDateString()}: ${d.data().condition} (${d.data().temp}°C)`).join(', ');

      // Fetch latest site diaries
      const diarySnap = await getDocs(query(collection(db, `projects/${projectId}/site_diaries`), orderBy('createdAt', 'desc'), limit(15)));
      const diarySummary = diarySnap.docs.map(d => `${d.data().createdAt?.toDate().toLocaleDateString()}: ${d.data().note}`).join(' | ');

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `You are a professional construction planner and delay analyst. 
      Analyze the alignment between the Baseline Programme and actual Site Performance.
      
      BASELINE MILESTONES:
      ${JSON.stringify(program.milestones)}
      
      RECENT WEATHER DATA (Last 30 entries):
      ${weatherSummary}
      
      RECENT SITE DIARY LOGS:
      ${diarySummary}
      
      TASK: 
      1. Predict potential slippage for the upcoming milestones.
      2. Identify specific risks (e.g., weather delays impacting exterior work, labor shortages noted in diaries).
      3. Suggest contractual mitigation strategies (e.g., Clause 10.1 force majeure notice if applicable).
      
      FORMAT: Return a structured analysis with "Executive Summary", "Slippage Projections", and "Risk Mitigation". Use clear professional tone.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setActiveAnalysis(result.text || "Analysis pending.");
    } catch (e) {
      console.error(e);
      alert("AI analysis failed. Ensure site diaries and weather logs contain data.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-100 p-8 space-y-8 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-architect-coal uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-olive-primary" />
            Baseline Programme Verification
          </h3>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Contractual Programme Analysis & Verification</p>
        </div>
        
        <label className="cursor-pointer">
           <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
           <div className="px-6 py-2 border border-zinc-100 text-architect-coal text-[10px] font-black uppercase tracking-widest hover:border-olive-primary transition-all flex items-center gap-2">
             {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
             Upload Baseline (.PDF)
           </div>
        </label>
      </div>

      <AnimatePresence>
        {activeAnalysis && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 bg-architect-coal text-white rounded-none border border-architect-coal relative"
          >
            <div className="flex items-center gap-3 mb-6">
               <BrainCircuit className="w-5 h-5 text-olive-primary" />
               <span className="text-[10px] font-black uppercase tracking-widest">Baseline Slippage Projection</span>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-[11px] leading-relaxed opacity-80 mb-6">
               {activeAnalysis}
            </div>
            <div className="flex justify-end border-t border-white/10 pt-6">
               <button 
                onClick={() => setActiveAnalysis(null)}
                className="text-[10px] font-black uppercase tracking-widest text-olive-primary"
               >
                Close Analysis
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4 pr-2 max-h-[500px] overflow-y-auto scrollbar-thin">
        {programs.map((program) => (
          <div key={program.id} className="p-6 bg-zinc-50 border border-zinc-100 flex flex-col gap-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-white rounded-2xl border border-zinc-100 text-zinc-400">
                      <FileText className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-xs font-bold text-architect-coal uppercase">{program.name}</p>
                      <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">
                         {program.milestones?.length || 0} Milestones Identified • {new Date(program.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}
                      </p>
                   </div>
                </div>
                <button 
                  onClick={() => analyzeProgramAlignment(program)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-white border border-zinc-100 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-olive-primary hover:border-olive-primary transition-all flex items-center gap-2"
                >
                   <TrendingDown className="w-3.5 h-3.5" />
                   Predict Slippage
                </button>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {program.milestones?.map((m: any, i: number) => (
                  <div key={i} className="p-4 bg-white border border-zinc-100 group/m hover:border-olive-primary transition-all">
                     <div className="flex justify-between items-start mb-2">
                       <p className="text-[10px] font-black text-architect-coal uppercase tracking-widest leading-tight">{m.task}</p>
                       <span className="text-[9px] font-bold text-zinc-300 font-mono">#{i+1}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                           <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Baseline Finish</p>
                           <p className="text-[11px] font-bold text-architect-coal">{m.baselineFinish}</p>
                        </div>
                        {m.duration && (
                          <div className="space-y-0.5">
                             <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Duration</p>
                             <p className="text-[11px] font-bold text-olive-primary">{m.duration}</p>
                          </div>
                        )}
                     </div>
                     {m.dependencies && m.dependencies.length > 0 && (
                       <div className="mt-3 pt-3 border-t border-zinc-50">
                          <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-1">Predecessors</p>
                          <div className="flex flex-wrap gap-1">
                             {m.dependencies.map((dep: any, di: number) => (
                               <span key={di} className="text-[8px] bg-zinc-50 text-zinc-500 px-1.5 py-0.5 rounded-sm border border-zinc-100 italic">
                                 {dep}
                               </span>
                             ))}
                          </div>
                       </div>
                     )}
                  </div>
                ))}
              </div>
          </div>
        ))}

        {!isProcessing && programs.length === 0 && (
          <div className="py-20 text-center bg-zinc-50/10 border border-zinc-50 rounded-none">
             <div className="p-4 bg-white w-12 h-12 rounded-full border border-zinc-50 mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-6 h-6 text-zinc-100" />
             </div>
             <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">No Contractual Baseline Uploaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
