import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, AlertCircle } from 'lucide-react';

interface ProjectTask {
  id: string;
  title: string;
  startDate?: string;
  dueDate?: string;
  isMilestone: boolean;
  status: string;
  dependencyIds?: string[];
}

interface GanttChartProps {
  tasks: ProjectTask[];
}

export default function GanttChart({ tasks }: GanttChartProps) {
  // 1. Calculate the time range
  const { startDate, endDate, daysCount } = useMemo(() => {
    let min = new Date();
    let max = new Date();
    max.setDate(max.getDate() + 30); // Default 30 days window if no tasks

    if (tasks.length > 0) {
      const dates = tasks.flatMap(t => [
        t.startDate ? new Date(t.startDate) : null,
        t.dueDate ? new Date(t.dueDate) : null
      ]).filter(Boolean) as Date[];

      if (dates.length > 0) {
        min = new Date(Math.min(...dates.map(d => d.getTime())));
        max = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }

    // Buffer of 2 days
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 5);

    const diff = Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24));
    return { startDate: min, endDate: max, daysCount: diff };
  }, [tasks]);

  const pixelsPerDay = 40;
  const chartWidth = daysCount * pixelsPerDay;
  const rowHeight = 48;

  const getX = (dateStr?: string) => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const diff = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return diff * pixelsPerDay;
  };

  const getTimelineScale = () => {
    const ticks = [];
    const curr = new Date(startDate);
    while (curr <= endDate) {
      ticks.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return ticks;
  };

  const timelineTicks = getTimelineScale();

  return (
    <div className="bg-white border border-zinc-100 overflow-hidden flex flex-col h-full max-h-[600px]">
      <div className="flex bg-zinc-50 border-b border-zinc-100 shrink-0">
        <div className="w-64 p-4 border-r border-zinc-100 shrink-0">
          <span className="text-[10px] font-black text-architect-coal uppercase tracking-widest">Activity Registry</span>
        </div>
        <div className="flex-1 overflow-x-auto no-scrollbar">
           <div className="flex" style={{ width: chartWidth }}>
              {timelineTicks.map((date, i) => (
                <div 
                  key={i} 
                  className={`shrink-0 border-r border-zinc-100 py-3 text-center transition-colors ${
                    date.getDay() === 0 || date.getDay() === 6 ? 'bg-zinc-100/50' : ''
                  }`} 
                  style={{ width: pixelsPerDay }}
                >
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter">
                    {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Task Names Sidebar */}
        <div className="w-64 bg-white border-r border-zinc-100 overflow-y-auto no-scrollbar shrink-0">
          {tasks.map((task, i) => (
            <div 
              key={task.id} 
              className="px-4 border-b border-zinc-50 flex items-center justify-between group hover:bg-zinc-50 transition-colors"
              style={{ height: rowHeight }}
            >
              <div className="flex items-center gap-2 truncate">
                {task.isMilestone ? (
                  <CalendarDays className="w-3 h-3 text-amber-500 shrink-0" />
                ) : (
                   <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.status === 'Completed' ? 'bg-olive-primary' : 'bg-zinc-300'}`} />
                )}
                <span className={`text-[9px] font-bold uppercase truncate tracking-tight ${task.status === 'Completed' ? 'text-zinc-300 line-through' : 'text-architect-coal'}`}>
                  {task.title}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="flex-1 overflow-auto relative bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px)] bg-[length:40px_100%]">
          <svg 
            width={chartWidth} 
            height={tasks.length * rowHeight} 
            className="absolute top-0 left-0 pointer-events-none"
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#d4d4d8" />
              </marker>
            </defs>
            {tasks.map((task, i) => (
              task.dependencyIds?.map(depId => {
                const depIdx = tasks.findIndex(t => t.id === depId);
                if (depIdx === -1) return null;
                
                const startX = getX(tasks[depIdx].dueDate) || getX(tasks[depIdx].startDate);
                const startY = (depIdx * rowHeight) + (rowHeight / 2);
                const endX = getX(task.startDate);
                const endY = (i * rowHeight) + (rowHeight / 2);

                // Simple path for dependency line
                return (
                  <path 
                    key={`${task.id}-${depId}`}
                    d={`M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}`}
                    fill="none"
                    stroke="#d4d4d8"
                    strokeWidth="1.5"
                    markerEnd="url(#arrow)"
                  />
                );
              })
            ))}
          </svg>

          <div style={{ width: chartWidth, height: tasks.length * rowHeight }} className="relative">
            {tasks.map((task, i) => {
              const xStart = getX(task.startDate);
              const xEnd = getX(task.dueDate);
              const width = Math.max(xEnd - xStart, 10);
              const y = i * rowHeight;

              if (task.isMilestone) {
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute z-10 flex items-center justify-center"
                    style={{ left: xEnd - 8, top: y + (rowHeight / 2) - 8 }}
                  >
                    <div className="w-4 h-4 bg-amber-500 rotate-45 border border-white shadow-sm" />
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: xStart - 10 }}
                  animate={{ opacity: 1, x: xStart }}
                  className={`absolute h-6 rounded-sm shadow-sm flex items-center px-2 overflow-hidden transition-all border ${
                    task.status === 'Completed' 
                      ? 'bg-emerald-50 border-emerald-100' 
                      : 'bg-architect-coal border-architect-coal'
                  }`}
                  style={{ 
                    left: xStart, 
                    top: y + (rowHeight / 2) - 12, 
                    width 
                  }}
                >
                  <span className="text-[7px] font-black uppercase text-white truncate mix-blend-difference">
                    {task.title}
                  </span>
                </motion.div>
              );
            })}

            {/* Current Time Indicator */}
            <div 
              className="absolute top-0 bottom-0 w-px bg-olive-primary z-20"
              style={{ left: getX(new Date().toISOString().split('T')[0]) }}
            >
              <div className="bg-olive-primary text-white text-[6px] font-black px-1 absolute top-0 -translate-x-1/2">TODAY</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-architect-coal rounded-sm" />
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Active Task</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-olive-primary rounded-sm" />
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Completed</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rotate-45" />
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Milestone</span>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <AlertCircle className="w-3.5 h-3.5 text-zinc-300" />
             <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest italic">Live Critical Path Telemetry</span>
          </div>
      </div>
    </div>
  );
}
