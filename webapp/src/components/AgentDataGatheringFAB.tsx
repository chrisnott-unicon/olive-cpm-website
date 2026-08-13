import React, { useState } from 'react';
import { Bot, Camera, UploadCloud, Mic, FileText, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function AgentDataGatheringFAB() {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: string) => {
    // In a real app, this would open the device camera, file picker, or start recording
    toast.info(`Agent Data Gathering`, {
      description: `Opening ${action} interface...`
    });
    setIsOpen(false);
  };

  const tools = [
    { id: 'camera', icon: Camera, label: 'Capture', action: 'Camera' },
    { id: 'upload', icon: UploadCloud, label: 'Upload', action: 'File Upload' },
    { id: 'voice', icon: Mic, label: 'Voice Note', action: 'Microphone' },
    { id: 'doc', icon: FileText, label: 'Document', action: 'Scanner' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation (Visible only on mobile) */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 p-2 rounded-full shadow-2xl flex items-center justify-between gap-1 overflow-x-auto scrollbar-none relative">
          <div className="absolute inset-0 bg-gradient-to-r from-olive-primary/20 to-transparent pointer-events-none rounded-full" />
          
          <button 
            onClick={() => handleAction('Gemini Agent')}
            className="flex flex-col items-center justify-center p-3 rounded-full hover:bg-zinc-800 transition-colors shrink-0 text-olive-primary w-14 h-14 relative"
          >
            <div className="absolute inset-0 bg-olive-primary/10 rounded-full animate-pulse" />
            <Bot className="w-5 h-5 mb-1" strokeWidth={1.5} />
            <span className="text-[7px] font-black tracking-widest uppercase">Agent</span>
          </button>

          <div className="w-px h-8 bg-zinc-700 mx-1 shrink-0" />

          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleAction(tool.action)}
              className="flex-1 flex flex-col items-center justify-center p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <tool.icon className="w-4 h-4 mb-1" strokeWidth={1.5} />
              <span className="text-[7px] font-black tracking-wider uppercase">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Circular Expanding FAB (Visible only on md+) */}
      <div className="hidden md:block fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-16 right-0 flex flex-col gap-3 mb-4 items-end"
            >
              {tools.map((tool, idx) => (
                <motion.button
                  key={tool.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleAction(tool.action)}
                  className="flex items-center gap-3 group"
                >
                  <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-black uppercase tracking-widest text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-100">
                    {tool.label}
                  </span>
                  <div className="w-12 h-12 bg-white rounded-full shadow-lg border border-zinc-100 flex items-center justify-center text-zinc-500 hover:text-olive-primary hover:scale-110 transition-all">
                    <tool.icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all z-50 relative ${
            isOpen ? 'bg-zinc-800 rotate-45' : 'bg-olive-primary hover:bg-olive-primary/90 hover:scale-105'
          }`}
        >
          {isOpen ? (
            <Plus className="w-6 h-6" strokeWidth={1.5} /> // Using Plus rotated 45deg acts as X, or could just use X
          ) : (
            <div className="relative flex items-center justify-center w-full h-full">
              <Bot className="w-6 h-6 absolute" strokeWidth={1.5} />
            </div>
          )}
        </button>
      </div>
    </>
  );
}
