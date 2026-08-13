import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Text } from 'react-konva';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Target, Tags, PenTool, Hand, MessageSquare, Bot, FileText, ListFilter } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { collection, query, onSnapshot, doc, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PDFAnnotatorProps {
  fileUrl: string;
  fileName: string;
  documentId?: string;
  revision?: string;
  projectTarget?: any;
  pinningContext?: { rfiId: string; drawingId: string } | null;
  onPinComplete?: () => void;
  onBack: () => void;
}

type ToolMode = 'pan' | 'measure' | 'pin' | 'area';

export default function PDFAnnotator({ fileUrl, fileName, documentId, revision, projectTarget, pinningContext, onPinComplete, onBack }: PDFAnnotatorProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCanvas, setPageCanvas] = useState<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1);
  const [toolMode, setToolMode] = useState<ToolMode>('pan');
  const [pins, setPins] = useState<{x: number, y: number, text: string, rfiId?: string}[]>([]);
  const [measurements, setMeasurements] = useState<{x1: number, y1: number, x2: number, y2: number, distance: number}[]>([]);
  
  const [rfis, setRfis] = useState<any[]>([]);
  const [showRfiLinkModal, setShowRfiLinkModal] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!projectTarget?.id) return;
    
    // Fetch RFIs for this project to link pins
    const q = query(collection(db, 'projects', projectTarget.id, 'rfis'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setRfis(data);
      
      // Also sync current pins from RFIs that points to THIS drawing
      const relevantPins = data
        .filter((rfi: any) => rfi.drawingRef?.documentId === documentId)
        .map((rfi: any) => ({
          x: rfi.drawingRef.pinX,
          y: rfi.drawingRef.pinY,
          text: rfi.rfiNumber || rfi.title,
          rfiId: rfi.id
        }));
      setPins(relevantPins);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectTarget.id}/rfis`);
    });
    return unsub;
  }, [projectTarget?.id, documentId]);

  useEffect(() => {
    if (pinningContext && pinningContext.drawingId === documentId) {
      setToolMode('pin');
    }
  }, [pinningContext, documentId]);

  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        renderPage(doc, pageNum);
      } catch (err) {
        console.error('Error loading PDF:', err);
      }
    };
    loadPDF();
  }, [fileUrl]);

  const renderPage = async (doc: pdfjsLib.PDFDocumentProxy, num: number) => {
    const page = await doc.getPage(num);
    const viewport = page.getViewport({ scale: 2 }); // Render high res

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext: any = {
      canvasContext: ctx!,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    setPageCanvas(canvas);
  };

  const runGeminiTakeoff = async () => {
    if (!pageCanvas) return;
    setIsAnalyzing(true);
    try {
      const base64Data = pageCanvas.toDataURL('image/jpeg', 0.8).replace(/^data:image\/jpeg;base64,/, '');
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing Gemini API Key");
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [
          {
             role: 'user',
             parts: [
               { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
               { text: "Perform a material takeoff based on this architectural drawing. Estimate quantities for concrete, steel, drywall, or relevant materials you can identify. Respond with a concise text report." }
             ]
          }
        ]
      });

      const report = response.text;
      const subject = encodeURIComponent(`Material Takeoff Report - ${fileName}`);
      const body = encodeURIComponent(report || 'No report generated.');
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } catch (e) {
      console.error(e);
      alert("Failed to generate takeoff report.");
    }
    setIsAnalyzing(false);
  };
  
  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.2));

  const runGeminiAnalysis = async () => {
      if (!pageCanvas) return;
      setIsAnalyzing(true);
      try {
        const base64Data = pageCanvas.toDataURL('image/jpeg', 0.8).replace(/^data:image\/jpeg;base64,/, '');
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing Gemini API Key");
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [
          {
             role: 'user',
             parts: [
               { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
               { text: "Analyze this architectural drawing. Extract: 1. Sheet Title 2. Sheet Number 3. Revision number 4. Provide a very brief summary of what this drawing shows. Provide response in strict JSON format: { \"title\": \"...\", \"number\": \"...\", \"revision\": \"...\", \"summary\": \"...\" }" }
             ]
          }
        ]
      });

      const text = response.text;
      const jsonMatch = text.match(/```json\n([\s\S]*)\n```/) || text.match(/{[\s\S]*}/);
      if (jsonMatch) {
         setAiAnalysis(JSON.parse(jsonMatch[1] || jsonMatch[0]));
      }
    } catch (e) {
      console.error(e);
      setAiAnalysis({ error: "Failed to analyze drawing." });
    }
    setIsAnalyzing(false);
  };

  const [activeMeasureLine, setActiveMeasureLine] = useState<{x1: number, y1: number} | null>(null);

  const handleStageClick = (e: any) => {
    const stage = stageRef.current;
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const stagePos = transform.point(pos);

    if (toolMode === 'pin') {
      if (projectTarget && documentId) {
        setShowRfiLinkModal({ x: stagePos.x, y: stagePos.y });
      } else {
        const text = window.prompt('Enter pin note:');
        if (text) {
          setPins([...pins, { x: stagePos.x, y: stagePos.y, text }]);
        }
      }
      setToolMode('pan'); 
    } else if (toolMode === 'measure') {
       if (!activeMeasureLine) {
         setActiveMeasureLine({ x1: stagePos.x, y1: stagePos.y });
       } else {
         const dx = stagePos.x - activeMeasureLine.x1;
         const dy = stagePos.y - activeMeasureLine.y1;
         const dist = Math.sqrt(dx*dx + dy*dy); // Pixels, needs scaling factor in real app
         
         setMeasurements([...measurements, { 
           x1: activeMeasureLine.x1, 
           y1: activeMeasureLine.y1, 
           x2: stagePos.x, 
           y2: stagePos.y, 
           distance: Math.round(dist) 
         }]);
         setActiveMeasureLine(null);
         setToolMode('pan');
       }
    }
  };

  const handleLinkRfi = async (rfiId: string) => {
    if (!showRfiLinkModal || !projectTarget || !documentId) return;
    
    try {
      const rfiRef = doc(db, 'projects', projectTarget.id, 'rfis', rfiId);
      await updateDoc(rfiRef, {
        drawingRef: {
          documentId,
          revision: revision || '1',
          pinX: showRfiLinkModal.x,
          pinY: showRfiLinkModal.y
        },
        updatedAt: serverTimestamp()
      });
      setShowRfiLinkModal(null);
      if (onPinComplete) onPinComplete();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${projectTarget.id}/rfis/${rfiId}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 absolute inset-0 z-50">
      {/* RFI Link Modal Overlay */}
      <AnimatePresence>
        {showRfiLinkModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2 tracking-tight">
                  <MessageSquare className="w-5 h-5 text-olive-primary" />
                  Link Pin to RFI
                </h3>
                <button onClick={() => setShowRfiLinkModal(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-none">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Select an existing Request for Information to pin its location on this drawing revision.
                </p>
                <div className="space-y-2">
                  {rfis.filter(r => r.status !== 'Closed').map(rfi => (
                    <button
                      key={rfi.id}
                      onClick={() => handleLinkRfi(rfi.id)}
                      className="w-full text-left p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-olive-primary transition-all group"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-olive-primary uppercase tracking-widest">{rfi.rfiNumber || 'RFI-?'}</span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{rfi.status}</span>
                      </div>
                      <p className="text-sm font-bold text-white group-hover:text-olive-primary transition-colors">{rfi.title}</p>
                    </button>
                  ))}
                  {rfis.length === 0 && (
                    <p className="text-center py-8 text-xs text-zinc-600 font-bold italic">No active RFIs available for linking.</p>
                  )}
                </div>
              </div>
              <div className="p-6 bg-zinc-900/50 flex justify-end gap-3">
                <button 
                  onClick={() => setShowRfiLinkModal(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <div className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
         <div className="flex items-center gap-4">
           <button onClick={onBack} className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Document Annotator</span>
             <h2 className="text-sm font-bold text-white">{fileName}</h2>
           </div>
         </div>

         <div className="flex items-center gap-2">
            <button onClick={() => setToolMode('pan')} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${toolMode === 'pan' ? 'bg-architect-coal text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              <Hand className="w-5 h-5" />
            </button>
            <button onClick={() => setToolMode('pin')} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${toolMode === 'pin' ? 'bg-olive-primary text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              <MessageSquare className="w-5 h-5" />
            </button>
            <button onClick={() => setToolMode('measure')} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${toolMode === 'measure' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              <Target className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-2" />
            <button onClick={handleZoomOut} className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-colors">
              <ZoomOut className="w-5 h-5" />
            </button>
             <div className="text-xs font-black text-zinc-400 w-12 text-center w-8">
               {Math.round(scale * 100)}%
             </div>
            <button onClick={handleZoomIn} className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-colors">
              <ZoomIn className="w-5 h-5" />
            </button>
         </div>

         <div className="flex items-center gap-4">
           <button 
             onClick={runGeminiAnalysis}
             disabled={isAnalyzing || !pageCanvas}
             className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white font-bold text-xs flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
           >
             {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Bot className="w-4 h-4" />}
             AI Extract Metadata
           </button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
         <div className="flex-1 bg-zinc-900 border-r border-zinc-800 relative overflow-hidden" ref={containerRef}>
            {pageCanvas ? (
              <Stage 
                width={window.innerWidth - 320} // Adjust based on sidebar
                height={window.innerHeight - 64}
                scaleX={scale}
                scaleY={scale}
                draggable={toolMode === 'pan'}
                onClick={handleStageClick}
                ref={stageRef}
                style={{ cursor: toolMode === 'pan' ? 'grab' : 'crosshair' }}
              >
                <Layer>
                  <KonvaImage image={pageCanvas} />
                  
                  {measurements.map((m, i) => (
                    <React.Fragment key={i}>
                      <Circle x={m.x1} y={m.y1} radius={4 / scale} fill="#10b981" />
                      <Circle x={m.x2} y={m.y2} radius={4 / scale} fill="#10b981" />
                      {/* Line equivalent */}
                      <Rect 
                        x={m.x1} 
                        y={m.y1} 
                        width={Math.sqrt(Math.pow(m.x2 - m.x1, 2) + Math.pow(m.y2 - m.y1, 2))} 
                        height={2 / scale} 
                        fill="#10b981"
                        rotation={Math.atan2(m.y2 - m.y1, m.x2 - m.x1) * 180 / Math.PI}
                      />
                      <Text
                        x={(m.x1 + m.x2) / 2}
                        y={(m.y1 + m.y2) / 2 - 20 / scale}
                        text={`${m.distance}px`}
                        fill="#10b981"
                        fontSize={16 / scale}
                        fontStyle="bold"
                        padding={4}
                      />
                    </React.Fragment>
                  ))}

                  {pins.map((pin, i) => (
                    <React.Fragment key={`pin-${i}`}>
                      <Circle x={pin.x} y={pin.y} radius={8 / scale} fill="#f97316" shadowColor="black" shadowBlur={4} shadowOpacity={0.5} />
                      <Text
                         x={pin.x + 12 / scale}
                         y={pin.y - 12 / scale}
                         text={pin.text}
                         fill="white"
                         fontSize={14 / scale}
                         fontFamily="sans-serif"
                         padding={6}
                         cornerRadius={4}
                      />
                    </React.Fragment>
                  ))}
                  
                  {activeMeasureLine && (
                     <Circle x={activeMeasureLine.x1} y={activeMeasureLine.y1} radius={4 / scale} fill="#10b981" />
                  )}
                </Layer>
              </Stage>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <div className="w-12 h-12 border-4 border-zinc-200 border-t-architect-coal rounded-full animate-spin" />
              </div>
            )}
         </div>

         {/* Right Sidebar */}
         <div className="w-80 bg-zinc-950 p-6 overflow-y-auto shrink-0 flex flex-col gap-6">
            <h3 className="text-white font-bold tracking-tight text-lg mb-2 flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              AI Insights
            </h3>

            {aiAnalysis && !aiAnalysis.error ? (
              <div className="space-y-4">
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">Sheet Title</p>
                  <p className="text-sm font-bold text-white">{aiAnalysis.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">Number</p>
                    <p className="text-sm font-bold text-architect-coal">{aiAnalysis.number}</p>
                  </div>
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">Revision</p>
                    <p className="text-sm font-bold text-olive-primary">{aiAnalysis.revision}</p>
                  </div>
                </div>
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">Summary</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{aiAnalysis.summary}</p>
                </div>

                <div className="pt-4 border-t border-zinc-800 space-y-3">
                  <button className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 transition-colors border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" /> Save Metadata
                  </button>
                  <button 
                    onClick={runGeminiTakeoff}
                    disabled={isAnalyzing}
                    className="w-full py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors border border-indigo-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /> : <Target className="w-4 h-4" />}
                    AI Material Takeoff
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Tags className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-sm font-bold text-zinc-500">Run AI Analysis to extract title, revision, and summary automatically.</p>
              </div>
            )}
            
            <div className="pt-4 mt-auto">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Annotations</h3>
              <div className="space-y-2">
                {pins.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <MessageSquare className="w-4 h-4 text-olive-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-300">{p.text}</p>
                  </div>
                ))}
                {pins.length === 0 && <p className="text-xs text-zinc-600">No pins added yet.</p>}
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
