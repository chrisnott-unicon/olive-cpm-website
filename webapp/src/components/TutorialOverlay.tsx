import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Check, ChevronRight } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STEPS = [
  {
    title: "Welcome to The Olive Framework",
    description: "Your digital control tower for rigorous construction administration. Let's cover the foundational protocols.",
    icon: <BookOpen className="w-8 h-8 text-olive-primary" />
  },
  {
    title: "Contractual Compliance",
    description: "Every action—RFI's, Site Instructions, Certifications—is logged with cryptographic timestamps to ensure unassailable audit trails.",
    icon: <Check className="w-8 h-8 text-olive-primary" />
  },
  {
    title: "Matrix & Roles",
    description: "Your visibility and actions are strictly constrained by your assigned role (e.g., Principal Agent, Contractor).",
    icon: <Check className="w-8 h-8 text-olive-primary" />
  }
];

export default function TutorialOverlay({ user }: { user: any }) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    // Check if user has completed tutorial
    const checkTutorial = async () => {
      const pDoc = await getDoc(doc(db, 'user_preferences', user.uid));
      if (!pDoc.exists() || !pDoc.data().tutorialCompleted) {
        setShowTutorial(true);
      }
    };
    checkTutorial();
  }, [user]);

  const completeTutorial = async () => {
    setShowTutorial(false);
    await setDoc(doc(db, 'user_preferences', user.uid), {
      tutorialCompleted: true
    }, { merge: true });
  };

  if (!showTutorial) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-architect-coal/80 backdrop-blur-md"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-lg bg-white rounded-none border border-zinc-200 overflow-hidden shadow-2xl"
        >
          <div className="flex">
            {/* Sidebar Indicator */}
            <div className="w-2 bg-olive-primary" />
            
            <div className="p-10 w-full flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
                {STEPS[step].icon}
              </div>
              
              <h2 className="text-2xl font-light text-architect-coal uppercase tracking-tight mb-4">
                {STEPS[step].title}
              </h2>
              
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest leading-loose max-w-sm mb-12">
                {STEPS[step].description}
              </p>
              
              <div className="flex items-center justify-between w-full mt-auto">
                <div className="flex gap-2">
                  {STEPS.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-olive-primary' : 'bg-zinc-200'}`} 
                    />
                  ))}
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={completeTutorial}
                    className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:text-zinc-600 transition-colors"
                  >
                    Skip Protocols
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (step < STEPS.length - 1) setStep(step + 1);
                      else completeTutorial();
                    }}
                    className="px-6 py-3 bg-olive-primary text-white text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-olive-dark transition-all"
                  >
                    {step < STEPS.length - 1 ? 'Next Module' : 'Acknowledge & Commence'}
                    {step < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
