import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function NotificationCenter({ user }: { user: any }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/notifications`),
      orderBy('createdAt', 'desc')
    );
    
    let isFirstLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setNotifications(notifs);
      const unread = notifs.filter(n => !n.read).length;
      setUnreadCount(unread);

      // Trigger toasts for urgent new notifications
      if (!isFirstLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.type === 'Urgent' || data.type === 'Invite') {
              toast(data.title, {
                description: data.message,
                action: data.actionUrl ? {
                  label: 'View',
                  onClick: () => window.location.href = data.actionUrl
                } : undefined
              });
            } else {
              toast(data.title, { description: data.message });
            }
          }
        });
      }
      isFirstLoad = false;
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, `users/${user.uid}/notifications`, id), { read: true });
  };

  const markAllAsRead = async () => {
    for (const n of notifications.filter(n => !n.read)) {
      await markAsRead(n.id);
    }
  };

  const clearNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteDoc(doc(db, `users/${user.uid}/notifications`, id));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-zinc-200 shadow-2xl z-50 flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <h3 className="font-medium text-xs uppercase tracking-widest text-zinc-900">Notification Centre</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] text-olive-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-sm">
                    No new notifications.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => !n.read && markAsRead(n.id)}
                        className={`p-4 border-b border-zinc-100 cursor-default hover:bg-zinc-50 transition-colors relative group ${!n.read ? 'bg-zinc-50' : 'bg-white opacity-80'}`}
                      >
                        {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-olive-primary" />}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-800 mb-1">{n.title}</h4>
                            <p className="text-xs text-zinc-600 mb-2 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-zinc-400 font-medium">
                              {formatDistanceToNow(n.createdAt?.toDate ? n.createdAt.toDate() : new Date(), { addSuffix: true })}
                            </span>
                          </div>
                          <button 
                            onClick={(e) => clearNotification(n.id, e)}
                            className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {n.actionUrl && (
                          <div className="mt-3 text-right">
                            <a 
                              href={n.actionUrl}
                              className="text-[10px] bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-3 py-1.5 font-medium uppercase tracking-wider inline-block transition-colors"
                            >
                              Take Action
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
