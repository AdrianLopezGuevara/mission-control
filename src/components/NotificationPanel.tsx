'use client';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface AppNotification {
  id: string;
  type: 'task' | 'calendar' | 'system' | 'mention';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  task: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  calendar: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  system: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  mention: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
};

interface Props {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNav?: (view: string) => void;
}

export default function NotificationPanel({ open, onClose, notifications, onMarkRead, onMarkAllRead, onNav }: Props) {
  const unread = notifications.filter(n => !n.read).length;

  if (!open) return null;

  function handleClick(n: AppNotification) {
    if (!n.read) onMarkRead(n.id);
    if (n.actionUrl && onNav) {
      const view = n.actionUrl.includes(':') ? n.actionUrl.split(':')[0] : n.actionUrl;
      onNav(view);
      onClose();
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-80 max-w-full bg-surface border-l border-border z-50 flex flex-col shadow-2xl shadow-black/40 modal-slide-up">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
          <Bell className="w-4 h-4 text-accent-hover" strokeWidth={1.8} />
          <h2 className="text-sm font-semibold flex-1">Notifications</h2>
          {unread > 0 && (
            <span className="text-[0.6rem] px-1.5 py-0.5 bg-red-500 text-white rounded-full font-bold min-w-[18px] text-center">{unread}</span>
          )}
          <button
            onClick={onMarkAllRead}
            title="Mark all read"
            className="p-1.5 text-text-muted hover:text-text rounded transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
              <Bell className="w-8 h-8" strokeWidth={1} />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border cursor-pointer transition-all hover:bg-surface2 ${
                    !n.read ? 'bg-accent-glow' : ''
                  }`}
                >
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${!n.read ? 'bg-red-400' : 'bg-border'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 justify-between">
                      <span className="text-xs font-medium">{n.title}</span>
                      <span className={`text-[0.55rem] px-1.5 py-0.5 rounded border capitalize flex-shrink-0 ${TYPE_COLORS[n.type] || TYPE_COLORS.system}`}>
                        {n.type}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{n.message}</p>
                    <span className="text-[0.6rem] text-text-muted">{timeAgo(n.createdAt)}</span>
                  </div>
                  {!n.read && (
                    <button
                      onClick={e => { e.stopPropagation(); onMarkRead(n.id); }}
                      className="flex-shrink-0 p-1 text-text-muted hover:text-emerald-400 rounded transition-colors mt-0.5"
                      title="Mark as read"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
