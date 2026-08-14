import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, X, FileText, MessageSquare, ClipboardCheck, ShieldCheck, Users, CheckSquare, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface SearchResult {
  id: string;
  type: string;
  label: string;
  sublabel?: string;
  tab: string;
  subView?: string;
  icon: any;
  typeLabel: string;
}

// Maps a `documents` record's category to the Documents hub sub-view that
// actually lists it (mirrors ProjectDocuments.tsx's own subView switch).
const DOCUMENT_CATEGORY_SUBVIEW: Record<string, string> = {
  Drawing: 'drawings',
  Other: 'drawings',
  Specification: 'specs',
  Agreement: 'agreements',
  Contract: 'contracts',
};

interface ProjectQuickSearchProps {
  projectId: string;
  onNavigate: (tab: string, subView?: string) => void;
  onClose: () => void;
}

export default function ProjectQuickSearch({ projectId, onNavigate, onClose }: ProjectQuickSearchProps) {
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState<SearchResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // One bounded read per collection when the search opens, then filter
        // in-memory as the user types — this is a per-project index, not a
        // full-text search service, so the caps below (matching the limits
        // already used by each collection's own list view) keep it cheap.
        const [documents, rfis, siList, compliance, stakeholders, tasks] = await Promise.all([
          getDocs(query(collection(db, `projects/${projectId}/documents`), limit(200))),
          getDocs(query(collection(db, `projects/${projectId}/rfis`), limit(200))),
          getDocs(query(collection(db, `projects/${projectId}/site_instructions`), limit(200))),
          getDocs(query(collection(db, `projects/${projectId}/compliance`), limit(300))),
          getDocs(query(collection(db, `projects/${projectId}/stakeholders`), limit(500))),
          getDocs(query(collection(db, `projects/${projectId}/tasks`), limit(200))),
        ]);

        const results: SearchResult[] = [];

        documents.docs.forEach(d => {
          const data = d.data() as any;
          results.push({
            id: d.id,
            type: 'document',
            label: data.name || 'Untitled document',
            sublabel: data.category || 'Document',
            tab: 'drawings',
            subView: DOCUMENT_CATEGORY_SUBVIEW[data.category] || 'drawings',
            icon: FileText,
            typeLabel: 'Document',
          });
        });

        rfis.docs.forEach(d => {
          const data = d.data() as any;
          results.push({
            id: d.id,
            type: 'rfi',
            label: data.title || data.rfiNumber || 'Untitled RFI',
            sublabel: data.rfiNumber,
            tab: 'drawings',
            subView: 'rfis',
            icon: MessageSquare,
            typeLabel: 'RFI',
          });
        });

        siList.docs.forEach(d => {
          const data = d.data() as any;
          results.push({
            id: d.id,
            type: 'si',
            label: data.title || 'Untitled instruction',
            sublabel: 'Site Instruction',
            tab: 'drawings',
            subView: 'si',
            icon: ClipboardCheck,
            typeLabel: 'Site Instruction',
          });
        });

        compliance.docs.forEach(d => {
          const data = d.data() as any;
          results.push({
            id: d.id,
            type: 'compliance',
            label: data.title || 'Untitled requirement',
            sublabel: data.category?.replace('_', ' '),
            tab: 'compliance',
            icon: ShieldCheck,
            typeLabel: 'Compliance',
          });
        });

        stakeholders.docs.forEach(d => {
          const data = d.data() as any;
          results.push({
            id: d.id,
            type: 'stakeholder',
            label: data.name || 'Unnamed stakeholder',
            sublabel: data.role,
            tab: 'admin',
            icon: Users,
            typeLabel: 'Stakeholder',
          });
        });

        tasks.docs.forEach(d => {
          const data = d.data() as any;
          results.push({
            id: d.id,
            type: 'task',
            label: data.title || 'Untitled task',
            sublabel: data.status,
            tab: 'planning',
            subView: 'tasks',
            icon: CheckSquare,
            typeLabel: 'Task',
          });
        });

        if (!cancelled) setPool(results);
      } catch (e) {
        console.error('Quick search failed to load project data', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter(r => r.label.toLowerCase().includes(q) || r.sublabel?.toLowerCase().includes(q))
      .slice(0, 50);
  }, [term, pool]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 md:pt-32 px-4">
      <div className="absolute inset-0 bg-architect-coal/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden"
      >
        <div className="flex items-center gap-3 p-5 border-b border-zinc-100">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            autoFocus
            value={term}
            onChange={e => setTerm(e.target.value)}
            placeholder="Search documents, RFIs, site instructions, compliance, stakeholders, tasks..."
            className="flex-1 outline-none text-sm font-medium text-zinc-900 placeholder:text-zinc-300 bg-transparent"
          />
          {loading && <Loader2 className="w-4 h-4 text-zinc-300 animate-spin shrink-0" />}
          <button onClick={onClose} aria-label="Close search" className="text-zinc-300 hover:text-architect-coal transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {term.trim().length === 0 && (
            <p className="p-6 text-center text-xs text-zinc-400 font-medium">
              Start typing to search across this project.
            </p>
          )}
          {term.trim().length > 0 && !loading && filtered.length === 0 && (
            <p className="p-6 text-center text-xs text-zinc-400 font-medium">No matches in this project.</p>
          )}
          {filtered.map(r => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => onNavigate(r.tab, r.subView)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
                <r.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-architect-coal truncate">{r.label}</p>
                {r.sublabel && <p className="text-[10px] text-zinc-400 font-medium truncate">{r.sublabel}</p>}
              </div>
              <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest shrink-0">{r.typeLabel}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
