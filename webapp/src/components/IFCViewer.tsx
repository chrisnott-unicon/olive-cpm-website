import React, { useEffect, useRef, useState } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';
import { Maximize, ZoomIn, ZoomOut, Rotate3D, Loader2 } from 'lucide-react';

interface IFCViewerProps {
  url: string;
  onClose?: () => void;
}

export default function IFCViewer({ url, onClose }: IFCViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<IfcViewerAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const initViewer = async () => {
      try {
        const ifcViewer = new IfcViewerAPI({ container: containerRef.current!, backgroundColor: new (window as any).THREE.Color(0xffffff) });
        
        // Set up the path to the wasm files. By default, it expects them in the root of the served URL.
        // We will configure it to use a CDN to avoid needing local static files
        ifcViewer.IFC.setWasmPath('https://unpkg.com/web-ifc@0.0.39/');
        
        await ifcViewer.IFC.loadIfcUrl(url);
        
        // Add shadowing and edges
        ifcViewer.shadowDropper.renderShadow(ifcViewer.context.getScene().children[0].uuid);
        
        setViewer(ifcViewer);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load IFC model:", err);
        setError("Failed to load 3D model. The file might be corrupted or in an unsupported format.");
        setLoading(false);
      }
    };

    initViewer();

    return () => {
      if (viewer) {
        viewer.dispose();
      }
    };
  }, [url]);

  return (
    <div className="relative w-full h-[600px] bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden flex flex-col">
      <div className="p-3 bg-white border-b border-zinc-100 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Rotate3D className="w-5 h-5 text-olive-primary" />
          <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest">BIM / 3D Model Viewer</h3>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="px-4 py-1.5 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200">
              Close
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-olive-primary animate-spin mb-4" />
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loading IFC Model...</p>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white">
            <p className="text-sm font-bold text-red-500 max-w-sm text-center">{error}</p>
          </div>
        )}

        <div ref={containerRef} className="absolute inset-0 outline-none" />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-white/90 backdrop-blur-md rounded-2xl border border-zinc-200 shadow-xl z-10">
        <button onClick={() => viewer?.context.ifcCamera.cameraControls.zoomTo(0.5)} className="p-2 text-zinc-600 hover:text-architect-coal hover:bg-zinc-100 rounded-xl transition-colors">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={() => viewer?.context.ifcCamera.cameraControls.zoomTo(-0.5)} className="p-2 text-zinc-600 hover:text-architect-coal hover:bg-zinc-100 rounded-xl transition-colors">
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
