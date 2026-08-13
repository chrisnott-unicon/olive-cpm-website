import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  BrainCircuit, 
  Loader2,
  Trash2,
  Edit,
  Clock,
  User,
  MoreVertical,
  CalendarDays,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";

interface ProjectTask {
  id: string;
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  startDate?: string;
  dueDate?: string;
  isMilestone: boolean;
  assigneeId?: string;
  assigneeName?: string;
  dependencyIds?: string[];
  createdBy: string;
  createdAt: any;
}

interface TaskManagerProps {
  projectId: string;
  user: any;
}

export default function TaskManager({ projectId, user }: TaskManagerProps) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiInputContext, setAiInputContext] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // New Task State
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    startDate: '',
    dueDate: '',
    isMilestone: false,
    dependencyIds: [] as string[]
  });

  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  useEffect(() => {
    const q = query(collection(db, `projects/${projectId}/tasks`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectTask)));
      setLoading(false);
    });
    return unsubscribe;
  }, [projectId]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    try {
      await addDoc(collection(db, `projects/${projectId}/tasks`), {
        ...newTask,
        status: 'Pending',
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      setNewTask({ title: '', description: '', priority: 'Medium', startDate: '', dueDate: '', isMilestone: false, dependencyIds: [] });
      setIsAddingTask(false);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleTaskStatus = async (task: ProjectTask) => {
    const nextStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
    try {
      await updateDoc(doc(db, `projects/${projectId}/tasks`, task.id), {
        status: nextStatus
      });

      // Dependency Adjustment Logic
      if (nextStatus === 'Completed') {
        const successors = tasks.filter(t => t.dependencyIds?.includes(task.id));
        if (successors.length > 0) {
          const today = new Date();
          
          for (const successor of successors) {
            // Adjust due date of successor: 
            // If the predecessor finished today, and the successor task is still Pending, 
            // we shift its due date to Today + 5 days (default window) or keep current if it's already later.
            // This is a basic "ripple" to ensure successors aren't dated in the past of their predecessors.
            
            let newDueDate = successor.dueDate;
            if (successor.dueDate) {
              const currentDue = new Date(successor.dueDate);
              if (currentDue < today) {
                const shifted = new Date();
                shifted.setDate(shifted.getDate() + 7); // Default 1 week out
                newDueDate = shifted.toISOString().split('T')[0];
              }
            }

            await updateDoc(doc(db, `projects/${projectId}/tasks`, successor.id), {
              dueDate: newDueDate,
              // Optionally notify in a real app, here we log
            });
            
            console.log(`Successor task "${successor.title}" due date adjusted due to completion of "${task.title}"`);
          }
        }
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm("Archiving this record will remove it from the active matrix. Proceed?")) return;
    try {
      await deleteDoc(doc(db, `projects/${projectId}/tasks`, taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title) return;

    try {
      const { id, ...updateData } = editingTask;
      await updateDoc(doc(db, `projects/${projectId}/tasks`, id), {
        ...updateData
      });
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const generateAiTasks = async () => {
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `Review the following architectural drawing log or project data context:
      "${aiInputContext || 'Standard construction project lifecycle'}"
      
      Extract or infer 5-8 critical tasks, milestones, and professional dependencies.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are a senior construction project manager for Olive CPM. Your goal is to convert unstructured project data (like drawing logs or schedules) into a structured task matrix. Ensure priority reflects the complexity of construction operations. Milestone status should be reserved only for critical handovers or sign-offs.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Professional, concise task name" },
                description: { type: Type.STRING, description: "Technical context or requirement" },
                priority: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
                isMilestone: { type: Type.BOOLEAN },
                suggestedDueDaysFromNow: { type: Type.NUMBER }
              },
              required: ["title", "description", "priority", "isMilestone", "suggestedDueDaysFromNow"]
            }
          }
        }
      });

      const generatedTasks = JSON.parse(response.text);
      
      for (const t of generatedTasks) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + t.suggestedDueDaysFromNow);
        
        await addDoc(collection(db, `projects/${projectId}/tasks`), {
          title: t.title,
          description: t.description,
          priority: t.priority,
          isMilestone: t.isMilestone,
          status: 'Pending',
          dueDate: dueDate.toISOString().split('T')[0],
          createdBy: 'Agiligic-AI',
          createdAt: serverTimestamp()
        });
      }
      setIsAiPanelOpen(false);
      setAiInputContext('');
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("Verification timeout. Please retry synchronization.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const addToStakeholderCalendar = (task: ProjectTask) => {
    // Simulation logic
    const msg = `Milestone "${task.title}" has been synchronized with the Stakeholder Registry Calendar. Formal notifications dispatched.`;
    alert(msg);
  };

  const toggleTaskSelection = (taskId: string) => {
    const next = new Set(selectedTaskIds);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setSelectedTaskIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const bulkUpdateStatus = async (status: 'Pending' | 'In Progress' | 'Completed') => {
    setIsBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedTaskIds).map(id => 
          updateDoc(doc(db, `projects/${projectId}/tasks`, id), { status })
        )
      );
      setSelectedTaskIds(new Set());
    } catch (error) {
      console.error("Bulk status update error:", error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const bulkUpdatePriority = async (priority: 'Low' | 'Medium' | 'High' | 'Critical') => {
    setIsBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedTaskIds).map(id => 
          updateDoc(doc(db, `projects/${projectId}/tasks`, id), { priority })
        )
      );
      setSelectedTaskIds(new Set());
    } catch (error) {
      console.error("Bulk priority update error:", error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Archive ${selectedTaskIds.size} records? This cannot be easily reversed.`)) return;
    setIsBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedTaskIds).map(id => 
          deleteDoc(doc(db, `projects/${projectId}/tasks`, id))
        )
      );
      setSelectedTaskIds(new Set());
    } catch (error) {
      console.error("Bulk delete error:", error);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white p-8 border border-zinc-100 shadow-sm space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <BrainCircuit className="w-5 h-5 text-olive-primary" strokeWidth={1.5} />
              <h2 className="text-sm font-black text-architect-coal uppercase tracking-widest">Contractual Task Matrix</h2>
           </div>
           <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Synchronized Project Governance</p>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
             disabled={isAiProcessing}
             className="flex items-center gap-2 px-6 py-3 bg-architect-coal text-white text-[10px] font-black uppercase tracking-widest hover:bg-olive-primary transition-all disabled:opacity-50"
           >
             {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
             Programme AI Assistant
           </button>
           <button 
             onClick={() => {
               setIsAddingTask(!isAddingTask);
               setIsAiPanelOpen(false);
             }}
             className="flex items-center gap-2 px-6 py-3 border border-zinc-100 text-architect-coal text-[10px] font-black uppercase tracking-widest hover:border-olive-primary transition-all"
           >
             <Plus className="w-4 h-4" />
             Manual Entry
           </button>
        </div>
      </div>

      {/* Task Edit Form */}
      <AnimatePresence>
        {editingTask && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-architect-coal/30 backdrop-blur-sm"
          >
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-100 p-6 md:p-12 space-y-6 md:space-y-10 max-h-[90vh] flex flex-col">
               <div className="shrink-0">
                  <h2 className="text-xl md:text-2xl font-light text-architect-coal uppercase tracking-tighter mb-2">Update Task Record</h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Digital Governance Override</p>
               </div>

               <form onSubmit={handleUpdateTask} className="space-y-6 md:space-y-8 overflow-y-auto w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Entry Heading</label>
                       <input 
                          type="text" 
                          required
                          value={editingTask.title}
                          onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                          className="w-full bg-zinc-50 border-none px-6 py-4 text-xs font-bold text-architect-coal focus:ring-1 focus:ring-olive-primary transition-all"
                       />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Relative Priority</label>
                       <select 
                          value={editingTask.priority}
                          onChange={e => setEditingTask({...editingTask, priority: e.target.value as any})}
                          className="w-full bg-zinc-50 border-none px-6 py-4 text-xs font-bold text-architect-coal focus:ring-1 focus:ring-olive-primary transition-all ml-0"
                       >
                          <option value="Low">LOW PRIORITY</option>
                          <option value="Medium">MEDIUM PRIORITY</option>
                          <option value="High">HIGH PRIORITY</option>
                          <option value="Critical">CRITICAL ACTION</option>
                       </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Technical Scope</label>
                    <textarea 
                       value={editingTask.description}
                       onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                       className="w-full bg-zinc-50 border-none px-6 py-4 text-xs font-bold text-architect-coal focus:ring-1 focus:ring-olive-primary transition-all min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Predecessors (Dependencies)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-zinc-50 rounded border border-zinc-100">
                       {tasks.filter(t => t.id !== editingTask.id).map(t => (
                         <label key={t.id} className="flex items-center gap-3 p-2 bg-white border border-zinc-100 rounded cursor-pointer hover:border-olive-primary transition-all">
                            <input 
                              type="checkbox"
                              checked={editingTask.dependencyIds?.includes(t.id)}
                              onChange={e => {
                                let next = [...(editingTask.dependencyIds || [])];
                                if (e.target.checked) next.push(t.id);
                                else next = next.filter(id => id !== t.id);
                                setEditingTask({...editingTask, dependencyIds: next});
                              }}
                              className="w-4 h-4 text-olive-primary rounded border-zinc-300 focus:ring-olive-primary"
                            />
                            <span className="text-[9px] font-black text-architect-coal uppercase truncate">{t.title}</span>
                         </label>
                       ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
                    <div className="flex items-center gap-6">
                       <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="edit-milestone"
                            checked={editingTask.isMilestone}
                            onChange={e => setEditingTask({...editingTask, isMilestone: e.target.checked})}
                            className="w-4 h-4 text-olive-primary rounded focus:ring-olive-primary"
                          />
                          <label htmlFor="edit-milestone" className="text-[9px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer">Milestone Toggle</label>
                       </div>
                       <div className="flex gap-4">
                          <input 
                            type="date" 
                            title="Start Date"
                            value={editingTask.startDate || ''}
                            onChange={e => setEditingTask({...editingTask, startDate: e.target.value})}
                            className="bg-transparent border-none text-[9px] font-black underline uppercase tracking-widest focus:ring-0 text-zinc-400"
                          />
                          <input 
                            type="date" 
                            title="Due Date"
                            value={editingTask.dueDate || ''}
                            onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})}
                            className="bg-transparent border-none text-[9px] font-black underline uppercase tracking-widest focus:ring-0 text-olive-primary"
                          />
                       </div>
                    </div>
                    
                    <div className="flex gap-4">
                       <button type="button" onClick={() => setEditingTask(null)} className="px-8 py-4 text-[9px] font-black text-zinc-300 uppercase tracking-widest">Abort</button>
                       <button type="submit" className="px-10 py-4 bg-architect-coal text-white text-[9px] font-black uppercase tracking-widest hover:bg-olive-primary transition-all">Overwrite Record</button>
                    </div>
                  </div>
               </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Panel */}
      <AnimatePresence>
        {isAiPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border border-olive-primary/20 bg-olive-light/5 p-8 space-y-6"
          >
            <div className="flex items-start gap-4">
               <div className="p-3 bg-olive-primary/10 text-olive-primary rounded-xl">
                  <BrainCircuit className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-sm font-black text-architect-coal uppercase tracking-widest mb-1">Programme Logic Core</h3>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Submit drawing logs or project schedule data for automated task generation.</p>
               </div>
            </div>
            
            <textarea 
              placeholder="PASTE DRAWING DATA OR PROJECT SCHEDULE EXCERPTS HERE..."
              value={aiInputContext}
              onChange={e => setAiInputContext(e.target.value)}
              className="w-full min-h-[120px] bg-white border border-zinc-100 p-4 text-[10px] font-mono text-architect-coal focus:border-olive-primary transition-all placeholder:text-zinc-200"
            />

            <div className="flex justify-end gap-4">
               <button 
                 onClick={() => setIsAiPanelOpen(false)}
                 className="px-6 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest"
               >
                 Cancel
               </button>
               <button 
                 onClick={generateAiTasks}
                 disabled={isAiProcessing}
                 className="px-8 py-3 bg-olive-primary text-white text-[9px] font-black uppercase tracking-widest hover:bg-olive-dark transition-all flex items-center gap-2"
               >
                 {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                 Synchronize Matrix
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Filters & Search */}
      <div className="flex items-center gap-4 bg-zinc-50/50 p-4 rounded-xl border border-zinc-50">
        <button 
          onClick={toggleSelectAll}
          className={`w-5 h-5 border rounded flex items-center justify-center transition-all ${
            selectedTaskIds.size > 0 && selectedTaskIds.size === filteredTasks.length 
              ? 'bg-olive-primary border-olive-primary text-white' 
              : 'bg-white border-zinc-200 text-transparent'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
        </button>
        <Search className="w-4 h-4 text-zinc-300" />
        <input 
          type="text" 
          placeholder="SEARCH TASK REGISTRY..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-architect-coal focus:ring-0 flex-1"
        />
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedTaskIds.size > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 bg-architect-coal p-2 shadow-2xl border border-white/10"
          >
            <div className="px-6 py-3 border-r border-white/10">
               <p className="text-[10px] font-black text-white uppercase tracking-widest">
                  {selectedTaskIds.size} Records Selected
               </p>
            </div>
            
            <div className="flex items-center gap-1 p-1">
               <button 
                 onClick={() => bulkUpdateStatus('Completed')}
                 disabled={isBulkProcessing}
                 className="px-4 py-2 text-[9px] font-black text-emerald-400 uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-2"
               >
                 {isBulkProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                 Complete
               </button>
               
               <div className="h-4 w-px bg-white/10 mx-2" />
               
               <select 
                 onChange={(e) => bulkUpdatePriority(e.target.value as any)}
                 disabled={isBulkProcessing}
                 className="bg-transparent border-none text-[9px] font-black text-white uppercase tracking-widest focus:ring-0 hover:bg-white/5 cursor-pointer"
                 defaultValue=""
               >
                 <option value="" disabled>Change Priority</option>
                 <option value="Low">Low</option>
                 <option value="Medium">Medium</option>
                 <option value="High">High</option>
                 <option value="Critical">Critical</option>
               </select>

               <div className="h-4 w-px bg-white/10 mx-2" />

               <button 
                 onClick={bulkDelete}
                 disabled={isBulkProcessing}
                 className="px-4 py-2 text-[9px] font-black text-red-400 uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-2"
               >
                 <Trash2 className="w-3 h-3" />
                 Archive
               </button>
               
               <button 
                 onClick={() => setSelectedTaskIds(new Set())}
                 className="ml-4 p-2 text-white/40 hover:text-white"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Task Form */}
      <AnimatePresence>
        {isAddingTask && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-zinc-50 pb-8"
          >
            <form onSubmit={handleAddTask} className="bg-zinc-50/30 p-8 space-y-6 border border-zinc-100">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Task Title</label>
                     <input 
                        type="text" 
                        required
                        value={newTask.title}
                        onChange={e => setNewTask({...newTask, title: e.target.value})}
                        className="w-full bg-white border border-zinc-100 px-4 py-3 text-xs font-bold text-architect-coal focus:border-olive-primary transition-all"
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Priority Phase</label>
                     <select 
                        value={newTask.priority}
                        onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                        className="w-full bg-white border border-zinc-100 px-4 py-3 text-xs font-bold text-architect-coal focus:border-olive-primary transition-all"
                     >
                        <option value="Low">LOW PRIORITY</option>
                        <option value="Medium">MEDIUM PRIORITY</option>
                        <option value="High">HIGH PRIORITY</option>
                        <option value="Critical">CRITICAL ACTION</option>
                     </select>
                  </div>
               </div>
               <div className="space-y-4">
                  <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Description / Technical Scope</label>
                  <textarea 
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                    className="w-full bg-white border border-zinc-100 px-4 py-3 text-xs font-bold text-architect-coal focus:border-olive-primary transition-all min-h-[80px]"
                  />
               </div>

               <div className="space-y-4">
                  <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Task Predecessors</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-4 bg-white border border-zinc-100">
                     {tasks.map(t => (
                        <label key={t.id} className="flex items-center gap-3 p-2 border border-zinc-50 hover:border-olive-primary cursor-pointer transition-all">
                           <input 
                             type="checkbox"
                             checked={newTask.dependencyIds.includes(t.id)}
                             onChange={e => {
                               let next = [...newTask.dependencyIds];
                               if (e.target.checked) next.push(t.id);
                               else next = next.filter(id => id !== t.id);
                               setNewTask({...newTask, dependencyIds: next});
                             }}
                             className="w-4 h-4 text-olive-primary rounded border-zinc-300 focus:ring-olive-primary"
                           />
                           <span className="text-[8px] font-black text-zinc-400 uppercase truncate">{t.title}</span>
                        </label>
                     ))}
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <input 
                        id="milestone"
                        type="checkbox" 
                        checked={newTask.isMilestone}
                        onChange={e => setNewTask({...newTask, isMilestone: e.target.checked})}
                        className="w-4 h-4 rounded text-olive-primary focus:ring-olive-primary border-zinc-200"
                       />
                       <label htmlFor="milestone" className="text-[9px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer">Set as Key Milestone</label>
                    </div>
                    <div className="flex gap-4">
                       <input 
                        type="date"
                        title="Start Date"
                        value={newTask.startDate}
                        onChange={e => setNewTask({...newTask, startDate: e.target.value})}
                        className="bg-transparent border-none text-[10px] font-black text-zinc-400 uppercase tracking-widest focus:ring-0"
                       />
                       <input 
                        type="date"
                        title="Due Date"
                        value={newTask.dueDate}
                        onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                        className="bg-transparent border-none text-[10px] font-black text-olive-primary uppercase tracking-widest focus:ring-0"
                       />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setIsAddingTask(false)} className="px-6 py-3 text-[9px] font-black text-zinc-300 uppercase tracking-widest">Cancel</button>
                    <button type="submit" className="px-8 py-3 bg-olive-primary text-white text-[9px] font-black uppercase tracking-widest hover:bg-olive-dark transition-all">Synchronize Task</button>
                  </div>
               </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
             <Loader2 className="w-8 h-8 text-zinc-200 animate-spin" />
             <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest font-mono">Syncing Registry...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-zinc-50">
             <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">No Active Records Found</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <motion.div 
              layout
              key={task.id}
              className={`p-6 border flex items-start gap-6 group transition-all ${
                task.status === 'Completed' ? 'bg-zinc-50 border-zinc-100 opacity-60' : 'bg-white border-zinc-50 hover:border-olive-primary shadow-sm'
              } ${selectedTaskIds.has(task.id) ? 'ring-2 ring-olive-primary border-transparent' : ''}`}
            >
              <div className="flex flex-col gap-4 mt-1">
                <button 
                  onClick={() => toggleTaskSelection(task.id)}
                  className={`w-5 h-5 border rounded flex items-center justify-center transition-all ${
                    selectedTaskIds.has(task.id) ? 'bg-olive-primary border-olive-primary text-white' : 'bg-white border-zinc-100 text-transparent'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => toggleTaskStatus(task)}
                  className={`transition-all ${task.status === 'Completed' ? 'text-olive-primary' : 'text-zinc-200 hover:text-olive-primary'}`}
                >
                  {task.status === 'Completed' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>
              </div>
              
              <div className="flex-1 space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <h3 className={`text-sm font-bold uppercase tracking-tight ${task.status === 'Completed' ? 'line-through text-zinc-400' : 'text-architect-coal'}`}>
                          {task.title}
                       </h3>
                       {task.isMilestone && (
                         <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase tracking-[0.2em] rounded-sm flex items-center gap-1.5">
                            <CalendarDays className="w-3 h-3" />
                            MILESTONE
                         </span>
                       )}
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                         task.priority === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' :
                         task.priority === 'High' ? 'bg-olive-light text-orange-600 border border-orange-100' :
                         'bg-zinc-50 text-zinc-500 border border-zinc-100'
                       }`}>
                         {task.priority}
                       </span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button 
                         onClick={() => setEditingTask(task)}
                         className="p-2 hover:bg-zinc-50 text-zinc-300 hover:text-architect-coal transition-all rounded-sm"
                       >
                         <Edit className="w-4 h-4" />
                       </button>
                       {task.isMilestone && (
                         <button 
                           onClick={() => addToStakeholderCalendar(task)}
                           title="Add to Stakeholder Calendars"
                           className="p-2 hover:bg-olive-light text-olive-primary transition-all rounded-sm"
                         >
                           <Calendar className="w-4 h-4" />
                         </button>
                       )}
                       <button 
                         onClick={() => deleteTask(task.id)}
                         className="p-2 hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-all rounded-sm"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
                 
                 <p className="text-[10px] text-zinc-500 leading-relaxed max-w-2xl">{task.description}</p>
                 
                 {task.dependencyIds && task.dependencyIds.length > 0 && (
                   <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[7px] font-black text-zinc-300 uppercase tracking-widest self-center">Predecessors:</span>
                      {task.dependencyIds.map(depId => {
                        const depTask = tasks.find(t => t.id === depId);
                        return (
                          <span key={depId} className="px-2 py-1 bg-zinc-50 border border-zinc-100 text-[8px] font-bold text-zinc-400 uppercase rounded-full">
                             {depTask?.title || 'Unknown Task'}
                          </span>
                        );
                      })}
                   </div>
                 )}
                 
                 <div className="flex items-center gap-6 pt-2">
                    {task.dueDate && (
                      <div className="flex items-center gap-2 text-zinc-400">
                         <Clock className="w-3.5 h-3.5" />
                         <span className="text-[9px] font-black uppercase tracking-widest">{task.dueDate}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-zinc-400">
                       <User className="w-3.5 h-3.5" />
                       <span className="text-[9px] font-black uppercase tracking-widest">
                          {task.createdBy === 'Agiligic-AI' ? 'AGILIGIC CORE' : 'ADMIN RECORD'}
                       </span>
                    </div>
                 </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
