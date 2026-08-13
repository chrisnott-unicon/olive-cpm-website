import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Activity, MessageSquare, UploadCloud, AlertCircle, FileText, Bot, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityItem {
  id: string;
  type: 'update' | 'comment' | 'status' | 'document' | 'diary' | 'compliance';
  title: string;
  detail: string;
  user: string;
  createdAt: any;
}

export default function ProjectActivityFeed({ projectId, user }: { projectId: string; user: any }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!projectId) return;

    const q = query(
      collection(db, 'projects', projectId, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const acts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityItem[];
      setActivities(acts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching activities:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, 'projects', projectId, 'activities'), {
        type: 'comment',
        title: 'New Comment',
        detail: newComment.trim(),
        user: user?.fullName || user?.email || 'Unknown User',
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'document': return <UploadCloud className="w-4 h-4 text-emerald-500" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'status': return <Activity className="w-4 h-4 text-purple-500" />;
      case 'diary': return <FileText className="w-4 h-4 text-amber-500" />;
      case 'compliance': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Bot className="w-4 h-4 text-zinc-500" />;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-zinc-100 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm p-6 flex flex-col h-[600px] mt-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
        <div className="p-2 bg-olive-primary/10 rounded-lg">
          <Activity className="w-5 h-5 text-olive-primary" />
        </div>
        <div>
          <h3 className="text-sm font-black text-architect-coal uppercase tracking-widest">Project Activity Feed</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Chronological Site Updates & Events</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        <AnimatePresence>
          {activities.length === 0 ? (
            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
              className="text-xs text-zinc-400 text-center py-8 italic uppercase tracking-wider"
            >
              No recent activity recorded
            </motion.p>
          ) : (
            activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 p-4 rounded-2xl bg-zinc-50/50 border border-zinc-100/50 hover:bg-zinc-50 hover:border-zinc-200 transition-all"
              >
                <div className="mt-1 bg-white p-2 border border-zinc-100 rounded-xl shadow-sm h-min">
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-architect-coal uppercase tracking-widest">{activity.type}</span>
                    <span className="text-[9px] font-mono text-zinc-400 whitespace-nowrap ml-4">
                      {activity.createdAt?.toDate ? new Date(activity.createdAt.toDate()).toLocaleString('en-ZA', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      }) : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-700 leading-relaxed">{activity.detail}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">
                    &mdash; {activity.user}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <form onSubmit={handleAddComment} className="mt-4 pt-4 border-t border-zinc-100 flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a project comment or update..."
          className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-olive-primary/20 focus:border-olive-primary transition-all text-zinc-700 placeholder:text-zinc-400 placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest placeholder:font-black"
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="bg-architect-coal text-white p-3 rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed px-6"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
